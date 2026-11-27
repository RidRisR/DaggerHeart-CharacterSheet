import type {
  EquipmentPackConflictContext,
  EquipmentPackImportSource,
} from "@/equipment/import/types"
import type {
  EquipmentRuntimeQueryCriteria,
  RuntimeEquipmentTemplate,
} from "@/equipment/runtime-cache/types"
import type {
  EquipmentPackApplicationDiagnostic,
  EquipmentPackApplicationImportResult,
  EquipmentPackLifecycleDiagnostic,
  EquipmentPackLifecycleResult,
} from "@/equipment/packs/application-service"
import type { EquipmentPackStorageSnapshot } from "@/equipment/packs/storage-types"
import {
  equipmentFieldLabelFromPath,
  formatLocalizedEquipmentDiagnosticMessage,
  localizeEquipmentDiagnostic,
} from "./diagnostic-copy"

export type EquipmentPackCategoryBadge = "主武器" | "副手" | "护甲"

export type RuntimeEquipmentTemplateWithSource = RuntimeEquipmentTemplate & {
  sourceId: string
  sourceLabel: string
}

export interface EquipmentPackListItem {
  packId: string
  name: string
  author: string
  contentVersion?: string
  importedAt: string
  disabled: boolean
  sourceLabel?: string
  weaponCount: number
  armorCount: number
  categoryBadges: EquipmentPackCategoryBadge[]
  canDisable: boolean
  canRemove: boolean
  isSystemPack?: boolean
}

export interface EquipmentPackDetailView {
  pack: EquipmentPackListItem
  weapons: RuntimeEquipmentTemplateWithSource[]
  armor: RuntimeEquipmentTemplateWithSource[]
}

export interface EquipmentUiDiagnosticView {
  severity: "error" | "warning"
  code: string
  path: string
  message: string
  value?: unknown
}

export interface EquipmentUiStoreState {
  initialized: boolean
  initializing: boolean
  storageSnapshot: EquipmentPackStorageSnapshot | null
  initializationError: EquipmentUiDiagnosticView | null
  lastResult: EquipmentPackApplicationImportResult | EquipmentPackLifecycleResult | null
  lastDiagnostics: EquipmentUiDiagnosticView[]
  ensureInitialized(): Promise<void>
  refreshFromStorage(): Promise<void>
  querySelectableTemplates(criteria?: EquipmentRuntimeQueryCriteria): RuntimeEquipmentTemplateWithSource[]
  getSelectableTemplateById(templateId: string): RuntimeEquipmentTemplateWithSource | undefined
  getPackSummaries(): EquipmentPackListItem[]
  getPackDetail(packId: string): EquipmentPackDetailView | undefined
  getImportConflictContext(): Promise<EquipmentPackConflictContext>
  importPackFromSource(source: EquipmentPackImportSource): Promise<EquipmentPackApplicationImportResult>
  importPackFromFile(file: File): Promise<EquipmentPackApplicationImportResult>
  removePack(packId: string): Promise<EquipmentPackLifecycleResult>
  setPackDisabled(packId: string, disabled: boolean): Promise<EquipmentPackLifecycleResult>
}

export type EquipmentUiStoreDiagnostic =
  | EquipmentPackApplicationDiagnostic
  | EquipmentPackLifecycleDiagnostic

export function toDiagnosticView(diagnostic: EquipmentUiStoreDiagnostic): EquipmentUiDiagnosticView {
  const copy = localizeEquipmentDiagnostic(diagnostic, "contentImport")
  const path = "path" in diagnostic ? formatEquipmentDiagnosticPath(diagnostic.path) : ""

  return {
    severity: diagnostic.severity,
    code: String(diagnostic.code),
    path,
    message: formatLocalizedEquipmentDiagnosticMessage(copy),
    value: diagnostic.value,
  }
}

function formatEquipmentDiagnosticPath(path: string) {
  const parts = path.split("/").filter(Boolean)
  if (parts[0] !== "equipment") return path

  const group = equipmentGroupLabel(parts[1])
  const index = Number(parts[2])
  if (!group || !Number.isInteger(index) || index < 0) return path

  const field = equipmentFieldLabelFromPath(path)
  return field ? `${group} / 第 ${index + 1} 件 / ${field}` : `${group} / 第 ${index + 1} 件`
}

function equipmentGroupLabel(group: string | undefined) {
  if (group === "weapons") return "武器"
  if (group === "armor") return "护甲"
  return undefined
}
