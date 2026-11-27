import type { CardPackApplicationDiagnostic, CardPackApplicationImportResult } from "@/card/packs/application-service"
import type { ContentPackGroupError, ContentPackGroupMemberRef, ContentPackGroupRecord } from "@/content-packs/groups/types"
import type { EquipmentPackApplicationDiagnostic, EquipmentPackApplicationImportResult } from "@/equipment/packs/application-service"

export type ArchiveInspectErrorCode =
  | "INVALID_ARCHIVE"
  | "EMPTY_ARCHIVE"
  | "UNSAFE_ARCHIVE_PATH"
  | "ARCHIVE_LIMIT_EXCEEDED"

export type ArchiveEntryErrorCode =
  | "INVALID_JSON"
  | "UNKNOWN_CONTENT_PACK"
  | "INVALID_DHCB"
  | "NESTED_ARCHIVE_UNSUPPORTED"
  | "UNSAFE_ARCHIVE_PATH"
  | "ARCHIVE_LIMIT_EXCEEDED"

export type ArchivePackEntry =
  | {
      kind: "cardJson"
      archivePath: string
      text: string
      parsed: Record<string, unknown>
      sizeBytes: number
    }
  | {
      kind: "cardDhcb"
      archivePath: string
      bytes: ArrayBuffer
      sizeBytes: number
    }
  | {
      kind: "equipmentJson"
      archivePath: string
      text: string
      sizeBytes: number
    }
  | {
      kind: "unknown"
      archivePath: string
      errorCode: ArchiveEntryErrorCode
      message: string
    }

export type ArchiveInspectResult =
  | {
      kind: "legacyCardDhcb"
    }
  | {
      kind: "archive"
      entries: ArchivePackEntry[]
      ignoredFiles: string[]
    }
  | {
      kind: "invalid"
      code: ArchiveInspectErrorCode
      message: string
      value?: unknown
    }

export type ArchiveEntryImportResult =
  | {
      archivePath: string
      kind: "card"
      success: boolean
      packId?: string
      cardCount: number
      parsedInput?: Record<string, unknown>
      diagnostics: CardPackApplicationDiagnostic[]
    }
  | {
      archivePath: string
      kind: "equipment"
      success: boolean
      packId?: string
      weaponCount: number
      armorCount: number
      diagnostics: EquipmentPackApplicationDiagnostic[]
    }
  | {
      archivePath: string
      kind: "unknown"
      success: false
      diagnostics: Array<{
        severity: "error"
        code: ArchiveEntryErrorCode | ArchiveInspectErrorCode | "ARCHIVE_COMMIT_ABORTED"
        path: string
        message: string
        value?: unknown
      }>
    }

export interface ArchiveRollbackFailure {
  member: ContentPackGroupMemberRef
  archivePath?: string
  message: string
}

export type ArchiveImportOutcome =
  | {
      kind: "legacyCardDhcb"
    }
  | {
      kind: "archive"
      archiveName: string
      success: boolean
      blockedByPreflight: boolean
      group?: ContentPackGroupRecord
      entryResults: ArchiveEntryImportResult[]
      ignoredFiles: string[]
      archiveError?: {
        code:
          | ArchiveInspectErrorCode
          | ContentPackGroupError["code"]
          | "ARCHIVE_COMMIT_FAILED"
          | "ARCHIVE_ROLLBACK_INCOMPLETE"
        message: string
        value?: unknown
      }
      rollbackFailures?: ArchiveRollbackFailure[]
      rollbackErrors?: string[]
    }

export type CardCommitResult = CardPackApplicationImportResult
export type EquipmentCommitResult = EquipmentPackApplicationImportResult
