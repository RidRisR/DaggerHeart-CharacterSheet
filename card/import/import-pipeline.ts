import JSZip from "jszip"
import { prepareCardPackContentForRuntime } from "@/card/runtime/prepare-card-pack-content"
import { countCardImportDiagnostics, makeCardImportError } from "./diagnostics"
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

function importStageForPreparedFailure(
  prepared: Extract<ReturnType<typeof prepareCardPackContentForRuntime>, { success: false }>,
): CardImportPipelineStage {
  if (prepared.stage === "formatRouting") {
    return prepared.importStage ?? "externalFormatAdapter"
  }

  return prepared.stage
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
      imageAssets = payload.imageAssets ?? []
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

  const prepared = prepareCardPackContentForRuntime({ payload: value, source, imageAssets })
  if (!prepared.success) {
    return resultFromDiagnostics({
      stage: importStageForPreparedFailure(prepared),
      success: false,
      mode,
      diagnostics: prepared.diagnostics,
      pack: prepared.pack,
      model: prepared.model,
    })
  }

  const model = prepared.model
  const diagnostics = prepared.diagnostics
  const pack = prepared.pack
  const conflictDiagnostics = checkCardPackConflicts(model, dependencies)
  const diagnosticsAfterConflicts = [...diagnostics, ...conflictDiagnostics]
  if (hasErrors(conflictDiagnostics)) {
    return resultFromDiagnostics({
      stage: "conflictCheck",
      success: false,
      mode,
      diagnostics: diagnosticsAfterConflicts,
      pack,
      model,
    })
  }

  const draft = buildCommitDraft(model, source, payload)

  return resultFromDiagnostics({
    stage: "stageImportData",
    success: true,
    mode,
    diagnostics: diagnosticsAfterConflicts,
    pack,
    model,
    draft,
  })
}
