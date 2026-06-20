import { MAX_EQUIPMENT_PACK_FILE_SIZE_BYTES } from "./constants"
import { countDiagnostics, makeErrorDiagnostic } from "./diagnostics"
import { normalizeEquipmentPack } from "./normalize"
import { preprocessAuthoringInput } from "./preprocess"
import { validateEquipmentPackStructure } from "./schema-validator"
import { checkEquipmentPackConflicts, validateEquipmentPackSemantics } from "./semantic-validation"
import type {
  EquipmentPackCommitDraft,
  EquipmentPackImportDependencies,
  EquipmentPackImportDiagnostic,
  EquipmentPackImportMode,
  EquipmentPackImportOptions,
  EquipmentPackImportPipelineStage,
  EquipmentPackImportResult,
  EquipmentPackImportSource,
  EquipmentPackRawPayload,
  NormalizedEquipmentPackData,
} from "./types"

function resultFromDiagnostics(params: {
  stage: EquipmentPackImportPipelineStage
  success: boolean
  mode: EquipmentPackImportMode
  diagnostics: EquipmentPackImportDiagnostic[]
  pack?: NormalizedEquipmentPackData
  draft?: EquipmentPackCommitDraft
}): EquipmentPackImportResult {
  const counts = countDiagnostics(params.diagnostics)

  return {
    success: params.success,
    stage: params.stage,
    mode: params.mode,
    draft: params.draft,
    summary: {
      packId: undefined,
      name: params.pack?.metadata.name,
      version: params.pack?.metadata.version,
      author: params.pack?.metadata.author,
      weaponCount: params.pack?.weapons.length ?? 0,
      armorCount: params.pack?.armor.length ?? 0,
      ...counts,
    },
    diagnostics: params.diagnostics,
  }
}

function hasErrors(diagnostics: EquipmentPackImportDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error")
}

function getEffectivePayloadSizeBytes(payload: EquipmentPackRawPayload): number | undefined {
  if (payload.kind !== "jsonText") {
    return payload.sizeBytes
  }

  const actualSizeBytes = new TextEncoder().encode(payload.text).byteLength
  return Math.max(payload.sizeBytes ?? actualSizeBytes, actualSizeBytes)
}

function checkSize(
  source: EquipmentPackImportSource,
  payload: EquipmentPackRawPayload,
): EquipmentPackImportDiagnostic | null {
  if (source.origin.kind === "builtin") {
    return null
  }

  const sizeBytes = getEffectivePayloadSizeBytes(payload)

  if (sizeBytes !== undefined && sizeBytes > MAX_EQUIPMENT_PACK_FILE_SIZE_BYTES) {
    return makeErrorDiagnostic("FILE_TOO_LARGE", "", "Equipment pack source is too large.", {
      value: { sizeBytes, maxSizeBytes: MAX_EQUIPMENT_PACK_FILE_SIZE_BYTES },
    })
  }

  return null
}

function buildCommitDraft(
  pack: NormalizedEquipmentPackData,
  source: EquipmentPackImportSource,
  payload: EquipmentPackRawPayload,
): EquipmentPackCommitDraft {
  return {
    packData: pack,
    templateIds: [
      ...pack.weapons.map((template) => template.id),
      ...pack.armor.map((template) => template.id),
    ],
    source: {
      originKind: source.origin.kind,
      label: source.origin.label,
      fileName: source.origin.fileName,
      sizeBytes: getEffectivePayloadSizeBytes(payload),
    },
  }
}

export async function importEquipmentPackFromSource(
  source: EquipmentPackImportSource,
  options: EquipmentPackImportOptions,
  dependencies: EquipmentPackImportDependencies,
): Promise<EquipmentPackImportResult> {
  const mode = options.mode ?? "commit"
  const conflictContext = dependencies.conflictContext

  if (mode !== "dryRun" && !conflictContext) {
    throw new Error("Equipment commit import requires conflict context.")
  }

  let payload: EquipmentPackRawPayload

  try {
    payload = await source.read()
  } catch {
    return resultFromDiagnostics({
      stage: "sourceRead",
      success: false,
      mode,
      diagnostics: [makeErrorDiagnostic("SOURCE_READ_FAILED", "", "Unable to read equipment pack source.")],
    })
  }

  const sizeDiagnostic = checkSize(source, payload)
  if (sizeDiagnostic) {
    return resultFromDiagnostics({
      stage: "sourceRead",
      success: false,
      mode,
      diagnostics: [sizeDiagnostic],
    })
  }

  let parsed: unknown
  if (payload.kind === "jsonText") {
    try {
      parsed = JSON.parse(payload.text)
    } catch {
      return resultFromDiagnostics({
        stage: "jsonParse",
        success: false,
        mode,
        diagnostics: [makeErrorDiagnostic("INVALID_JSON", "", "Invalid JSON.")],
      })
    }
  } else {
    parsed = payload.value
  }

  const preprocessed = preprocessAuthoringInput(parsed)
  if (hasErrors(preprocessed.diagnostics)) {
    return resultFromDiagnostics({
      stage: "authoringPreprocess",
      success: false,
      mode,
      diagnostics: preprocessed.diagnostics,
    })
  }

  const structural = validateEquipmentPackStructure(preprocessed.value)
  if (!structural.success) {
    return resultFromDiagnostics({
      stage: "structuralValidation",
      success: false,
      mode,
      diagnostics: [...preprocessed.diagnostics, ...structural.diagnostics],
    })
  }

  const normalized = normalizeEquipmentPack(structural.value)
  const semanticDiagnostics = validateEquipmentPackSemantics(normalized.pack)
  const diagnosticsAfterSemantic = [
    ...preprocessed.diagnostics,
    ...normalized.diagnostics,
    ...semanticDiagnostics,
  ]
  if (hasErrors(semanticDiagnostics)) {
    return resultFromDiagnostics({
      stage: "semanticValidation",
      success: false,
      mode,
      pack: normalized.pack,
      diagnostics: diagnosticsAfterSemantic,
    })
  }

  const draft = buildCommitDraft(normalized.pack, source, payload)

  if (mode === "dryRun") {
    return resultFromDiagnostics({
      stage: "stageImportData",
      success: true,
      mode,
      pack: normalized.pack,
      draft,
      diagnostics: diagnosticsAfterSemantic,
    })
  }

  if (!conflictContext) {
    throw new Error("Equipment commit import requires conflict context.")
  }

  const conflictDiagnostics = checkEquipmentPackConflicts(normalized.pack, conflictContext)
  const diagnostics = [...diagnosticsAfterSemantic, ...conflictDiagnostics]
  if (hasErrors(conflictDiagnostics)) {
    return resultFromDiagnostics({
      stage: "conflictCheck",
      success: false,
      mode,
      pack: normalized.pack,
      diagnostics,
    })
  }

  return resultFromDiagnostics({
    stage: "stageImportData",
    success: true,
    mode,
    pack: normalized.pack,
    draft,
    diagnostics,
  })
}
