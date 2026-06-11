import type { EquipmentPackImportOriginKind, NormalizedEquipmentPackData } from "@/equipment/import/types"

export interface EquipmentPackStorageIndex {
  format: "daggerheart.equipment-pack-index.v1"
  packs: Record<string, EquipmentPackIndexEntry>
  updatedAt: string
}

export interface EquipmentPackIndexEntry {
  importedAt: string
  disabled: boolean
  source?: EquipmentPackStoredSource
}

export interface EquipmentPackStoredSource {
  originKind: EquipmentPackImportOriginKind
  label?: string
  fileName?: string
  sizeBytes?: number
}

export interface EquipmentPackStoredData {
  format: "daggerheart.equipment-pack-data.v1"
  pack: NormalizedEquipmentPackData
}

export interface EquipmentPackFinalCommitPlan {
  packId: string
  packData: NormalizedEquipmentPackData
  templateIds: string[]
  source?: EquipmentPackStoredSource
  importedAt: string
  disabled: false
}

export interface EquipmentPackSnapshotEntry {
  packId: string
  importedAt: string
  disabled: boolean
  source?: EquipmentPackStoredSource
  pack: NormalizedEquipmentPackData
}

export interface EquipmentPackStorageSnapshot {
  packs: Map<string, EquipmentPackSnapshotEntry>
  packCount: number
  integrity: EquipmentPackIntegrityReport
}

export interface EquipmentPackIntegrityIssue {
  code: EquipmentPackStorageIssueCode
  packId?: string
  storageKey?: string
  message: string
  value?: unknown
}

export interface EquipmentPackIntegrityReport {
  ok: boolean
  repaired: boolean
  issues: EquipmentPackIntegrityIssue[]
  removedIndexEntries: string[]
  removedOrphanPackKeys: string[]
  removedCorruptedPackKeys: string[]
}

export type EquipmentPackStorageTransactionResult =
  | { ok: true; snapshot: EquipmentPackStorageSnapshot; issues: EquipmentPackIntegrityIssue[] }
  | {
      ok: false
      error: EquipmentPackStorageTransactionError
      snapshot?: EquipmentPackStorageSnapshot
      issues: EquipmentPackIntegrityIssue[]
    }

export interface EquipmentPackStorageTransactionError {
  code: EquipmentPackStorageIssueCode
  message: string
  value?: unknown
}

export type EquipmentPackStorageIssueCode =
  | "PACK_NOT_FOUND"
  | "PACK_ID_CONFLICT"
  | "INDEX_READ_FAILED"
  | "INDEX_PARSE_FAILED"
  | "INDEX_FORMAT_INVALID"
  | "PACK_DATA_READ_FAILED"
  | "PACK_DATA_PARSE_FAILED"
  | "PACK_DATA_FORMAT_INVALID"
  | "PACK_ID_GENERATION_FAILED"
  | "STORAGE_SERIALIZE_FAILED"
  | "STORAGE_QUOTA_EXCEEDED"
  | "STORAGE_WRITE_FAILED"
  | "ROLLBACK_FAILED"
  | "ORPHAN_PACK_DATA"
  | "MISSING_PACK_DATA"
  | "TEMPLATE_ID_CONFLICT"
  | "ORPHAN_PACK_DATA_CLEANUP_PENDING"
