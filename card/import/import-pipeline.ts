import JSZip from "jszip"
import { countCardImportDiagnostics, makeCardImportError } from "./diagnostics"
import { buildCardPackDryRunValidationModel } from "./dry-run-model"
import { validateLegacyExternalContract } from "./external-contract-guard"
import { adaptLegacyCardPack } from "./legacy-adapter"
import { validateCardPackV1Structure } from "./schema-validator"
import { validateCardPackSemantics } from "./semantic-validation"
import type {
  CardImportDiagnostic,
  CardImportImageAsset,
  CardImportMode,
  CardImportPipelineStage,
  CardImportSource,
  CardPackCommitDraft,
  CardPackImportDependencies,
  CardPackImportOptions,
  CardPackImportResult,
  CardPackRawPayload,
  CardPackV1,
} from "./types"

const imageMimeTypes: Record<string, string> = {
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp",
}

function hasErrors(diagnostics: CardImportDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error")
}

function resultFromDiagnostics(params: {
  stage: CardImportPipelineStage
  success: boolean
  mode: CardImportMode
  diagnostics: CardImportDiagnostic[]
  pack?: CardPackV1
  model?: CardPackImportResult["model"]
  draft?: CardPackCommitDraft
}): CardPackImportResult {
  const counts = countCardImportDiagnostics(params.diagnostics)

  return {
    success: params.success,
    stage: params.stage,
    mode: params.mode,
    model: params.model,
    draft: params.draft,
    summary: {
      name: params.pack?.name ?? params.model?.metadata.name,
      version: params.pack?.version ?? params.model?.metadata.version,
      author: params.pack?.author ?? params.model?.metadata.author,
      cardCount: params.model?.cards.length ?? 0,
      imageCount: params.draft?.assets.cardImages.length ?? params.model?.imageAssets.length ?? 0,
      ...counts,
    },
    diagnostics: params.diagnostics,
  }
}

function mimeTypeForPath(path: string): string | undefined {
  const extension = path.split(".").pop()?.toLowerCase()
  return extension ? imageMimeTypes[extension] : undefined
}

function getEffectivePayloadSizeBytes(payload: CardPackRawPayload): number | undefined {
  if (payload.kind === "jsonText") {
    const actual = new TextEncoder().encode(payload.text).byteLength
    return Math.max(payload.sizeBytes ?? actual, actual)
  }

  return payload.sizeBytes
}

function buildCommitDraft(
  model: NonNullable<CardPackImportResult["model"]>,
  source: CardImportSource,
  payload: CardPackRawPayload,
): CardPackCommitDraft {
  return {
    packData: model,
    templateIds: model.cards.map((card) => card.id),
    source: {
      originKind: source.origin.kind,
      label: source.origin.label,
      fileName: source.origin.fileName,
      sizeBytes: getEffectivePayloadSizeBytes(payload),
    },
    assets: {
      cardImages: model.imageAssets,
    },
  }
}

function cardTemplateRefs(model: NonNullable<CardPackImportResult["model"]>): Array<{ id: string; path: string }> {
  const countsByGroup: Record<string, number> = {}

  return model.cards.map((card) => {
    const index = countsByGroup[card.group] ?? 0
    countsByGroup[card.group] = index + 1
    return { id: card.id, path: `/${card.group}/${index}/id` }
  })
}

function checkCardPackConflicts(
  model: NonNullable<CardPackImportResult["model"]>,
  dependencies: CardPackImportDependencies,
): CardImportDiagnostic[] {
  const context = dependencies.conflictContext
  if (!context) return []

  const diagnostics: CardImportDiagnostic[] = []

  if (
    context.customPackCount !== undefined &&
    context.maxCustomPackCount !== undefined &&
    context.customPackCount >= context.maxCustomPackCount
  ) {
    diagnostics.push({
      severity: "error",
      code: "PACK_LIMIT_EXCEEDED",
      path: "",
      message: "Custom card pack limit exceeded.",
      value: {
        customPackCount: context.customPackCount,
        maxCustomPackCount: context.maxCustomPackCount,
      },
    })
  }

  for (const template of cardTemplateRefs(model)) {
    if (context.builtinTemplateIds.has(template.id)) {
      diagnostics.push({
        severity: "error",
        code: "TEMPLATE_ID_CONFLICT",
        path: template.path,
        message: "Template id conflicts with built-in card content.",
        value: { id: template.id, conflictSource: "builtin" },
      })
      continue
    }

    if (context.importedTemplateIds.has(template.id)) {
      diagnostics.push({
        severity: "error",
        code: "TEMPLATE_ID_CONFLICT",
        path: template.path,
        message: "Template id conflicts with imported card content.",
        value: {
          id: template.id,
          conflictSource: "custom",
          ...context.importedTemplateSources.get(template.id),
        },
      })
    }
  }

  return diagnostics
}

async function readDhcb(bytes: ArrayBuffer): Promise<
  | { success: true; text: string; imageAssets: CardImportImageAsset[] }
  | { success: false; diagnostics: CardImportDiagnostic[] }
> {
  try {
    const zip = await JSZip.loadAsync(bytes)
    const cardsFile = zip.file("cards.json")

    if (!cardsFile) {
      return {
        success: false,
        diagnostics: [makeCardImportError("MISSING_CARDS_JSON", "/cards.json", "cards.json is missing.")],
      }
    }

    const imageAssets = Object.entries(zip.files)
      .filter(([path, file]) => path.startsWith("images/") && !file.dir)
      .map(([path, file]) => {
        const fileName = path.slice("images/".length)
        const templateId = fileName.replace(/\.(webp|png|jpg|jpeg|gif|svg)$/i, "")

        return {
          templateId,
          path,
          mimeType: mimeTypeForPath(path),
          readBlob: () => file.async("blob"),
        }
      })

    return { success: true, text: await cardsFile.async("text"), imageAssets }
  } catch {
    return { success: false, diagnostics: [makeCardImportError("INVALID_DHCB", "", "Invalid card bundle.")] }
  }
}

function invalidJsonResult(mode: CardImportMode): CardPackImportResult {
  return resultFromDiagnostics({
    stage: "jsonParse",
    success: false,
    mode,
    diagnostics: [makeCardImportError("INVALID_JSON", "", "Invalid JSON.")],
  })
}

function parseJsonText(text: string): { success: true; value: unknown } | { success: false } {
  try {
    return { success: true, value: JSON.parse(text) }
  } catch {
    return { success: false }
  }
}

function routeExternalFormat(
  value: unknown,
):
  | { success: true; value: CardPackV1; diagnostics: CardImportDiagnostic[] }
  | { success: false; stage: CardImportPipelineStage; diagnostics: CardImportDiagnostic[] } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {
      success: false,
      stage: "externalContractGuard",
      diagnostics: [makeCardImportError("INVALID_TYPE", "", "Card pack payload must be an object.", { value })],
    }
  }

  const record = value as Record<string, unknown>

  if (record.format === undefined) {
    const guarded = validateLegacyExternalContract(record)
    if (!guarded.success) {
      return { success: false, stage: "externalContractGuard", diagnostics: guarded.diagnostics }
    }

    const adapted = adaptLegacyCardPack(guarded.value)
    return { success: true, value: adapted.value, diagnostics: adapted.diagnostics }
  }

  if (record.format === "daggerheart.card-pack.v1") {
    return { success: true, value: record as unknown as CardPackV1, diagnostics: [] }
  }

  return {
    success: false,
    stage: "externalFormatAdapter",
    diagnostics: [
      makeCardImportError("UNSUPPORTED_FORMAT", "/format", "Unsupported card pack format.", { value: record.format }),
    ],
  }
}

export async function importCardPackFromSource(
  source: CardImportSource,
  options: CardPackImportOptions = {},
  dependencies: CardPackImportDependencies = {},
): Promise<CardPackImportResult> {
  const mode = options.mode ?? "dryRun"
  let value: unknown
  let imageAssets: CardImportImageAsset[] = []
  let payload: CardPackRawPayload

  try {
    payload = await source.read()

    if (payload.kind === "parsedObject") {
      value = payload.value
    } else if (payload.kind === "jsonText") {
      const parsed = parseJsonText(payload.text)
      if (!parsed.success) return invalidJsonResult(mode)
      value = parsed.value
    } else {
      const dhcb = await readDhcb(payload.bytes)
      if (!dhcb.success) {
        return resultFromDiagnostics({ stage: "sourceRead", success: false, mode, diagnostics: dhcb.diagnostics })
      }

      const parsed = parseJsonText(dhcb.text)
      if (!parsed.success) return invalidJsonResult(mode)
      value = parsed.value
      imageAssets = dhcb.imageAssets
    }
  } catch {
    return resultFromDiagnostics({
      stage: "sourceRead",
      success: false,
      mode,
      diagnostics: [makeCardImportError("SOURCE_READ_FAILED", "", "Unable to read card pack source.")],
    })
  }

  const routed = routeExternalFormat(value)
  if (!routed.success) {
    return resultFromDiagnostics({
      stage: routed.stage,
      success: false,
      mode,
      diagnostics: routed.diagnostics,
    })
  }

  const structural = validateCardPackV1Structure(routed.value)
  if (!structural.success) {
    return resultFromDiagnostics({
      stage: "structuralValidation",
      success: false,
      mode,
      diagnostics: [...routed.diagnostics, ...structural.diagnostics],
      pack: routed.value,
    })
  }

  const model = buildCardPackDryRunValidationModel(structural.value, imageAssets)
  const semanticDiagnostics = validateCardPackSemantics(model)
  const diagnostics = [...routed.diagnostics, ...semanticDiagnostics]

  if (hasErrors(semanticDiagnostics)) {
    return resultFromDiagnostics({
      stage: "semanticValidation",
      success: false,
      mode,
      diagnostics,
      pack: structural.value,
      model,
    })
  }

  const conflictDiagnostics = checkCardPackConflicts(model, dependencies)
  const diagnosticsAfterConflicts = [...diagnostics, ...conflictDiagnostics]
  if (hasErrors(conflictDiagnostics)) {
    return resultFromDiagnostics({
      stage: "conflictCheck",
      success: false,
      mode,
      diagnostics: diagnosticsAfterConflicts,
      pack: structural.value,
      model,
    })
  }

  const draft = buildCommitDraft(model, source, payload)

  return resultFromDiagnostics({
    stage: "stageImportData",
    success: true,
    mode,
    diagnostics: diagnosticsAfterConflicts,
    pack: structural.value,
    model,
    draft,
  })
}
