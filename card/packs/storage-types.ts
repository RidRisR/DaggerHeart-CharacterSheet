import type {
  CardImportImageAsset,
  CardImportOriginKind,
  CardPackDryRunValidationModel,
} from "@/card/import/types"

export interface CardImportStoredSource {
  originKind: CardImportOriginKind
  label?: string
  fileName?: string
  sizeBytes?: number
}

export interface CardImportFinalCommitPlan {
  packId: string
  packData: CardPackDryRunValidationModel
  templateIds: string[]
  source?: CardImportStoredSource
  importedAt: string
  disabled: false
  assets: {
    cardImages: CardImportImageAsset[]
  }
}

export interface CardPackSnapshotEntry {
  packId: string
  importedAt: string
  disabled: boolean
  source?: CardImportStoredSource
  templateIds: string[]
  imageTemplateIds: string[]
}

export interface CardPackIntegrityReport {
  ok: boolean
  repaired: boolean
  issues: CardPackIntegrityIssue[]
  removedIndexEntries: string[]
  removedOrphanPackKeys: string[]
  removedCorruptedPackKeys: string[]
  removedOrphanImagePackIds: string[]
}

export interface CardPackStorageSnapshot {
  packs: Map<string, CardPackSnapshotEntry>
  packCount: number
  integrity: CardPackIntegrityReport
}

export type CardPackStorageIssueCode =
  | "PACK_NOT_FOUND"
  | "PACK_ID_CONFLICT"
  | "INDEX_READ_FAILED"
  | "INDEX_PARSE_FAILED"
  | "INDEX_FORMAT_INVALID"
  | "INDEX_WRITE_FAILED"
  | "PACK_DATA_READ_FAILED"
  | "PACK_DATA_PARSE_FAILED"
  | "PACK_DATA_FORMAT_INVALID"
  | "PACK_ID_GENERATION_FAILED"
  | "CONTENT_WRITE_FAILED"
  | "STORAGE_SERIALIZE_FAILED"
  | "STORAGE_QUOTA_EXCEEDED"
  | "STORAGE_WRITE_FAILED"
  | "ROLLBACK_FAILED"
  | "ORPHAN_PACK_DATA"
  | "MISSING_PACK_DATA"
  | "TEMPLATE_ID_CONFLICT"
  | "IMAGE_DB_UNAVAILABLE"
  | "IMAGE_WRITE_FAILED"
  | "IMAGE_DELETE_FAILED"
  | "IMAGE_MIGRATION_FAILED"
  | "IMAGE_MIGRATION_AMBIGUOUS"
  | "ORPHAN_PACK_IMAGE"
  | "ORPHAN_LEGACY_IMAGE"

export interface CardPackIntegrityIssue {
  code: CardPackStorageIssueCode
  packId?: string
  templateId?: string
  storageKey?: string
  message: string
  value?: unknown
}

export interface CardPackStorageTransactionError {
  code: CardPackStorageIssueCode
  message: string
  value?: unknown
}

export type CardPackStorageTransactionResult =
  | { ok: true; snapshot: CardPackStorageSnapshot; issues: CardPackIntegrityIssue[] }
  | {
      ok: false
      error: CardPackStorageTransactionError
      snapshot?: CardPackStorageSnapshot
      issues: CardPackIntegrityIssue[]
    }

export interface CardPackStoredImage {
  key: string
  packId?: string
  templateId?: string
  blob: Blob
  mimeType: string
  size: number
  createdAt: number
}

export interface CardPackStoredImageSummary {
  key: string
  packId?: string
  templateId?: string
  size: number
  mimeType: string
}

export interface CardImageOwnershipIndex {
  ownersByTemplateId: Map<string, string[]>
}

export interface CardPackImageWriteResult {
  ok: boolean
  writtenTemplateIds: string[]
  issues: CardPackIntegrityIssue[]
}

export interface CardPackImageDeleteResult {
  ok: boolean
  deletedKeys: string[]
  issues: CardPackIntegrityIssue[]
}

export interface CardPackImageMigrationResult {
  ok: boolean
  migratedTemplateIds: string[]
  issues: CardPackIntegrityIssue[]
}
