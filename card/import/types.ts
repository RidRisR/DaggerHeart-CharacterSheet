import type { CardAutomationDefinition } from "@/card/automation/definition-types"
import type { CardAutomationIR } from "@/card/automation/ir-types"

export type CardImportOriginKind = "file" | "object" | "builtin" | "container"
export type CardImportMode = "dryRun" | "commit"
export type PackSourceKind = "localStorage" | "file" | "json" | "editor"

export type CardImportPipelineStage =
  | "sourceRead"
  | "jsonParse"
  | "externalContractGuard"
  | "externalFormatAdapter"
  | "structuralValidation"
  | "dryRunValidationModel"
  | "semanticValidation"
  | "conflictCheck"
  | "stageImportData"
  | "buildCommitPlan"
  | "storageTransaction"
  | "runtimeRefresh"

export type CardImportErrorCode =
  | "SOURCE_READ_FAILED"
  | "INVALID_JSON"
  | "INVALID_DHCB"
  | "MISSING_CARDS_JSON"
  | "UNSUPPORTED_FORMAT"
  | "INVALID_FORMAT"
  | "MISSING_FIELD"
  | "UNKNOWN_FIELD"
  | "INVALID_TYPE"
  | "INVALID_VALUE"
  | "DUPLICATE_ID"
  | "UNKNOWN_REFERENCE"
  | "ORPHAN_IMAGE"
  | "UNSUPPORTED_AUTOMATION_FORMAT"
  | "INVALID_AUTOMATION_DEFINITION"
  | "INVALID_AUTOMATION_IR"
  | "AUTOMATION_LIMIT_EXCEEDED"

export type CardImportCommitErrorCode =
  | "TEMPLATE_ID_CONFLICT"
  | "PACK_LIMIT_EXCEEDED"

export type CardImportWarningCode =
  | "LEGACY_FORMAT_ASSUMED"
  | "LEGACY_UNKNOWN_FIELD_DROPPED"
  | "DEFINITIONS_DERIVED"
  | "EXPLICIT_DEFINITION_UNUSED"
  | "VARIANT_TYPES_DERIVED"

export type CardImportDiagnostic =
  | {
      severity: "error"
      code: CardImportErrorCode | CardImportCommitErrorCode
      path: string
      message: string
      value?: unknown
      relatedPaths?: string[]
    }
  | {
      severity: "warning"
      code: CardImportWarningCode
      path: string
      message: string
      value?: unknown
      relatedPaths?: string[]
    }

export type CardImportErrorDiagnostic = Extract<CardImportDiagnostic, { severity: "error" }>
export type CardImportWarningDiagnostic = Extract<CardImportDiagnostic, { severity: "warning" }>

export type CardPackRawPayload =
  | { kind: "jsonText"; text: string; sizeBytes?: number }
  | { kind: "parsedObject"; value: unknown; sizeBytes?: number; imageAssets?: CardImportImageAsset[] }
  | { kind: "dhcbBytes"; bytes: ArrayBuffer; sizeBytes?: number }

export interface PackSourceDescriptor {
  kind: PackSourceKind
  label?: string
  fileName?: string
  storageKey?: string
  editorId?: string
  sizeBytes?: number
  mimeType?: string
}

export interface CardImportSource {
  origin: {
    kind: CardImportOriginKind
    label?: string
    fileName?: string
  }
  read(): Promise<CardPackRawPayload>
}

export interface CardPackImportOptions {
  mode?: CardImportMode
}

export interface CardPackConflictContext {
  builtinTemplateIds: Set<string>
  importedTemplateIds: Set<string>
  importedTemplateSources: Map<string, { packId?: string }>
  customPackCount?: number
  maxCustomPackCount?: number
}

export interface CardPackImportDependencies {
  conflictContext?: CardPackConflictContext
}

export interface ImportDryRunReport<TNormalizedPack = CardPackDryRunValidationModel> {
  ok: boolean
  errors: CardImportErrorDiagnostic[]
  warnings: CardImportWarningDiagnostic[]
  normalizedPack?: TNormalizedPack
}

export interface PackAdapter<TInput = unknown, TNormalizedPack = CardPackV1> {
  fromFormat: string
  toFormat: string
  adapt(
    value: TInput,
    source: PackSourceDescriptor,
  ): ImportDryRunReport<TNormalizedPack> | Promise<ImportDryRunReport<TNormalizedPack>>
}

export interface PackValidator<TPack = CardPackV1, TNormalizedPack = CardPackDryRunValidationModel> {
  validate(
    pack: TPack,
    source: PackSourceDescriptor,
  ): ImportDryRunReport<TNormalizedPack> | Promise<ImportDryRunReport<TNormalizedPack>>
}

export interface CardPackV1Definitions {
  classes?: string[]
  ancestries?: string[]
  communities?: string[]
  domains?: string[]
  variants?: string[]
  variantTypes?: Record<string, { description?: string; subclasses?: string[]; levelRange?: [number, number] }>
}

export type CardPackV1DefinitionKey = keyof CardPackV1Definitions

export interface CardPackV1 {
  format: "daggerheart.card-pack.v1"
  name?: string
  version?: string
  author?: string
  description?: string
  definitions?: CardPackV1Definitions
  classes?: CardClassV1[]
  ancestries?: CardAncestryV1[]
  communities?: CardCommunityV1[]
  subclasses?: CardSubclassV1[]
  domains?: CardDomainV1[]
  variants?: CardVariantV1[]
}

export interface CardBaseV1 {
  id: string
  name: string
  imageUrl?: string
  hasLocalImage?: boolean
  automation?: CardAutomationDefinition
}

export interface CardClassV1 extends CardBaseV1 {
  summary: string
  domain1: string
  domain2: string
  startingHitPoints: number
  startingEvasion: number
  startingItems: string
  hopeFeature: string
  classFeature: string
}

export interface CardAncestryV1 extends CardBaseV1 {
  ancestry: string
  summary: string
  effect: string
  category: number
}

export interface CardCommunityV1 extends CardBaseV1 {
  feature: string
  summary: string
  description: string
}

export interface CardSubclassV1 extends CardBaseV1 {
  description: string
  class: string
  subclass: string
  level: string
  spellcastTrait: string
}

export interface CardDomainV1 extends CardBaseV1 {
  domain: string
  description: string
  level: number
  trait: string
  recallCost: number
}

export interface CardVariantV1 extends CardBaseV1 {
  type: string
  subCategory?: string
  level?: number
  effect: string
  summaryItems?: {
    item1?: string
    item2?: string
    item3?: string
    item4?: string
  }
}

export type CardPackCompiledAutomation = {
  automation?: CardAutomationIR
}

export type CardPackDryRunCard =
  | (Omit<CardClassV1, "automation"> & { group: "classes" } & CardPackCompiledAutomation)
  | (Omit<CardAncestryV1, "automation"> & { group: "ancestries" } & CardPackCompiledAutomation)
  | (Omit<CardCommunityV1, "automation"> & { group: "communities" } & CardPackCompiledAutomation)
  | (Omit<CardSubclassV1, "automation"> & { group: "subclasses" } & CardPackCompiledAutomation)
  | (Omit<CardDomainV1, "automation"> & { group: "domains" } & CardPackCompiledAutomation)
  | (Omit<CardVariantV1, "automation"> & { group: "variants" } & CardPackCompiledAutomation)

export interface CardImportImageAsset {
  templateId: string
  cardId?: string
  path: string
  sizeBytes?: number
  mimeType?: string
  readBlob?: () => Promise<Blob>
}

export function getImageAssetTemplateId(asset: CardImportImageAsset): string {
  return asset.templateId
}

export interface CardPackDryRunValidationModel {
  metadata: {
    format: "daggerheart.card-pack.v1"
    name?: string
    version?: string
    author?: string
    description?: string
  }
  definitions: Required<Pick<CardPackV1Definitions, "classes" | "ancestries" | "communities" | "domains" | "variants">> & {
    variantTypes: NonNullable<CardPackV1Definitions["variantTypes"]>
  }
  declaredDefinitions: CardPackV1DefinitionKey[]
  cards: CardPackDryRunCard[]
  imageAssets: CardImportImageAsset[]
}

export interface CardPackCommitDraft {
  packData: CardPackDryRunValidationModel
  templateIds: string[]
  source: {
    originKind: CardImportOriginKind
    label?: string
    fileName?: string
    sizeBytes?: number
  }
  assets: {
    cardImages: CardImportImageAsset[]
  }
}

export interface CardPackImportResult {
  success: boolean
  stage: CardImportPipelineStage
  mode: CardImportMode
  model?: CardPackDryRunValidationModel
  draft?: CardPackCommitDraft
  summary: {
    name?: string
    version?: string
    author?: string
    cardCount: number
    imageCount: number
    warningCount: number
    errorCount: number
  }
  diagnostics: CardImportDiagnostic[]
}
