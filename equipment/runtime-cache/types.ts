import type {
  EquipmentBurden,
  EquipmentDamageType,
  EquipmentRange,
  EquipmentTier,
  EquipmentTrait,
  NormalizedEquipmentArmorTemplate,
  NormalizedEquipmentModifierContributionTemplate,
  NormalizedEquipmentWeaponTemplate,
} from "@/equipment/import/types"
import type { EquipmentPackStorageSnapshot, EquipmentPackStoredSource } from "@/equipment/packs/storage-types"

export type BuiltinEquipmentSourceId = "builtin"
export type RuntimeEquipmentSourceId = BuiltinEquipmentSourceId | string

export type RuntimeEquipmentTemplate =
  | ({ kind: "weapon" } & NormalizedEquipmentWeaponTemplate)
  | ({ kind: "armor" } & NormalizedEquipmentArmorTemplate)

export type CanonicalBuiltinWeaponTemplate = Omit<NormalizedEquipmentWeaponTemplate, "modifierContributions"> & {
  modifierContributions?: NormalizedEquipmentModifierContributionTemplate[]
}

export type CanonicalBuiltinArmorTemplate = Omit<NormalizedEquipmentArmorTemplate, "modifierContributions"> & {
  modifierContributions?: NormalizedEquipmentModifierContributionTemplate[]
}

export interface EquipmentRuntimeCacheBuildInput {
  builtinTemplates: RuntimeEquipmentTemplate[]
  storageSnapshot: EquipmentPackStorageSnapshot
}

export type EquipmentRuntimeCacheBuildErrorCode =
  | "RUNTIME_CACHE_BUILD_FAILED"
  | "RUNTIME_CACHE_DUPLICATE_TEMPLATE_ID"
  | "RUNTIME_CACHE_RESERVED_PACK_ID"

export interface EquipmentRuntimeCacheBuildDiagnostic {
  severity: "error"
  code: EquipmentRuntimeCacheBuildErrorCode
  path: string
  message: string
  value?: unknown
  relatedPaths?: string[]
}

export type EquipmentRuntimeCacheBuildResult =
  | { ok: true; view: StableEquipmentRuntimeCacheView }
  | { ok: false; diagnostic: EquipmentRuntimeCacheBuildDiagnostic }

export interface StableEquipmentRuntimeCacheView {
  templatesById: Map<string, RuntimeEquipmentTemplate>
  packsById: Map<string, RuntimePackRecord>
  relationIndexes: EquipmentRuntimeRelationIndexes
  queryIndexes: EquipmentRuntimeQueryIndexes
}

export interface EquipmentRuntimeRelationIndexes {
  templateToPackId: Map<string, RuntimeEquipmentSourceId>
  packToTemplateIds: Map<RuntimeEquipmentSourceId, string[]>
}

export interface EquipmentRuntimeQueryIndexes {
  selectableTemplateIds: string[]
  weaponTemplateIds: string[]
  armorTemplateIds: string[]
  templateIdsByTier: Map<EquipmentTier, string[]>
  templateIdsByTrait: Map<EquipmentTrait, string[]>
  templateIdsByWeaponType: Map<"primary" | "secondary", string[]>
  templateIdsByDamageType: Map<EquipmentDamageType, string[]>
  templateIdsByRange: Map<EquipmentRange, string[]>
  templateIdsByBurden: Map<EquipmentBurden, string[]>
  templateIdsBySource: Map<RuntimeEquipmentSourceId, string[]>
}

export interface RuntimePackSummary {
  packId: string
  name: string
  author: string
  version?: string
  importedAt: string
  disabled: boolean
  weaponCount: number
  armorCount: number
  isSystemPack?: boolean
}

export interface RuntimePackRecord extends RuntimePackSummary {
  description?: string
  source?: EquipmentPackStoredSource
}

export interface RuntimePackDetail {
  pack: RuntimePackRecord
  templates: RuntimeEquipmentTemplate[]
}

export interface EquipmentRuntimeQueryCriteria {
  searchText?: string
  kind?: "weapon" | "armor"
  tiers?: readonly EquipmentTier[]
  traits?: readonly EquipmentTrait[]
  weaponTypes?: ReadonlyArray<"primary" | "secondary">
  damageTypes?: readonly EquipmentDamageType[]
  ranges?: readonly EquipmentRange[]
  burdens?: readonly EquipmentBurden[]
  sourceIds?: readonly RuntimeEquipmentSourceId[]
}

export interface EquipmentRuntimeReader {
  querySelectableTemplates(criteria?: EquipmentRuntimeQueryCriteria): RuntimeEquipmentTemplate[]
  getSelectableTemplateById(templateId: string): RuntimeEquipmentTemplate | undefined
}

export interface EquipmentPackManagementReader {
  listPacks(): RuntimePackSummary[]
  getPackDetail(packId: string): RuntimePackDetail | undefined
}

export interface EquipmentRuntimeCacheReaders {
  runtime: EquipmentRuntimeReader
  management: EquipmentPackManagementReader
}

export interface EquipmentRuntimeCacheService {
  rebuild(input: EquipmentRuntimeCacheBuildInput): EquipmentRuntimeCacheBuildResult
  getCurrentView(): StableEquipmentRuntimeCacheView
  getRuntimeReader(): EquipmentRuntimeReader
  getManagementReader(): EquipmentPackManagementReader
}
