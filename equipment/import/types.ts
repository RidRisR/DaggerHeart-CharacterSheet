import type { EquipmentModifierTargetId } from "@/automation/equipment/types"

export type EquipmentPackImportOriginKind = "file" | "object" | "builtin" | "container"
export type EquipmentPackImportMode = "commit" | "dryRun"

export type EquipmentPackImportPipelineStage =
  | "sourceRead"
  | "jsonParse"
  | "authoringPreprocess"
  | "structuralValidation"
  | "canonicalNormalize"
  | "semanticValidation"
  | "conflictCheck"
  | "stageImportData"
  | "buildCommitPlan"
  | "storageTransaction"
  | "runtimeCacheBuild"

export type EquipmentPackImportErrorCode =
  | "SOURCE_READ_FAILED"
  | "INVALID_JSON"
  | "INVALID_FORMAT"
  | "MISSING_FIELD"
  | "UNKNOWN_FIELD"
  | "INVALID_TYPE"
  | "INVALID_ENUM"
  | "DUPLICATE_ID"
  | "ID_CONFLICT"
  | "INVALID_CONTRIBUTION_TARGET"
  | "EMPTY_EQUIPMENT"
  | "INVALID_THRESHOLD_ORDER"
  | "FILE_TOO_LARGE"
  | "PACK_LIMIT_EXCEEDED"
  | "TEMPLATE_LIMIT_EXCEEDED"
  | "FIELD_TOO_LONG"
  | "PACK_ID_GENERATION_FAILED"
  | "STORAGE_QUOTA_EXCEEDED"
  | "STORAGE_SERIALIZE_FAILED"
  | "STORAGE_WRITE_FAILED"
  | "RUNTIME_CACHE_BUILD_FAILED"
  | "RUNTIME_CACHE_DUPLICATE_TEMPLATE_ID"

export type EquipmentPackImportWarningCode =
  | "MISSING_TEMPLATE_DESCRIPTION"
  | "DESCRIPTION_LONG"

export type EquipmentPackImportDiagnostic =
  | {
      severity: "error"
      code: EquipmentPackImportErrorCode
      path: string
      message: string
      value?: unknown
      relatedPaths?: string[]
    }
  | {
      severity: "warning"
      code: EquipmentPackImportWarningCode
      path: string
      message: string
      value?: unknown
      relatedPaths?: string[]
    }

export type EquipmentPackRawPayload =
  | { kind: "jsonText"; text: string; sizeBytes?: number }
  | { kind: "parsedObject"; value: unknown; sizeBytes?: number }

export interface EquipmentPackImportSource {
  origin: {
    kind: EquipmentPackImportOriginKind
    label?: string
    fileName?: string
  }
  read(): Promise<EquipmentPackRawPayload>
}

export interface EquipmentPackImportOptions {
  mode?: EquipmentPackImportMode
}

export type EquipmentTier = "T1" | "T2" | "T3" | "T4"
export type EquipmentTrait = "agility" | "strength" | "finesse" | "instinct" | "presence" | "knowledge"
export type EquipmentDamageType = "physical" | "magic"
export type EquipmentRange = "melee" | "veryClose" | "close" | "far" | "veryFar"
export type EquipmentBurden = "oneHanded" | "twoHanded" | "offHand"

export interface NormalizedEquipmentPackData {
  metadata: {
    format: "daggerheart.equipment-pack.v1"
    name: string
    version: string
    author: string
    description: string
  }
  weapons: NormalizedEquipmentWeaponTemplate[]
  armor: NormalizedEquipmentArmorTemplate[]
}

export interface NormalizedEquipmentWeaponTemplate {
  id: string
  name: string
  tier: EquipmentTier
  weaponType: "primary" | "secondary"
  trait: EquipmentTrait
  damageType: EquipmentDamageType
  range: EquipmentRange
  burden: EquipmentBurden
  damage: string
  featureName?: string
  description?: string
  modifierContributions: NormalizedEquipmentModifierContributionTemplate[]
}

export interface NormalizedEquipmentArmorTemplate {
  id: string
  name: string
  tier: EquipmentTier
  baseArmorMax: number
  baseThresholds: { minor: number; major: number }
  featureName?: string
  description?: string
  modifierContributions: NormalizedEquipmentModifierContributionTemplate[]
}

export interface NormalizedEquipmentModifierContributionTemplate {
  id: string
  definition: {
    target: EquipmentModifierTargetId
    kind: "modifier"
  }
  editable: {
    label: string
    value: number
  }
}

export interface EquipmentPackConflictContext {
  builtinTemplateIds: ReadonlySet<string>
  importedTemplateIds: ReadonlySet<string>
  importedTemplateSources?: ReadonlyMap<string, { packId?: string }>
  customPackCount: number
  maxCustomPackCount: number
}

export interface EquipmentPackCommitDraft {
  packData: NormalizedEquipmentPackData
  templateIds: string[]
  source: {
    originKind: EquipmentPackImportOriginKind
    label?: string
    fileName?: string
    sizeBytes?: number
  }
}

export interface EquipmentPackImportDependencies {
  conflictContext?: EquipmentPackConflictContext
}

export interface EquipmentPackImportResult {
  success: boolean
  stage: EquipmentPackImportPipelineStage
  mode: EquipmentPackImportMode
  storageCommitted?: boolean
  draft?: EquipmentPackCommitDraft
  summary: {
    packId?: string
    name?: string
    version?: string
    author?: string
    weaponCount: number
    armorCount: number
    warningCount: number
    errorCount: number
  }
  diagnostics: EquipmentPackImportDiagnostic[]
}
