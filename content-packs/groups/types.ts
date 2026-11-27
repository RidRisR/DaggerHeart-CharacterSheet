export type ContentPackMemberKind = "card" | "equipment"

export interface ContentPackGroupMemberRef {
  kind: ContentPackMemberKind
  packId: string
}

export interface ContentPackGroupRecord {
  groupId: string
  name: string
  sourceFileName: string
  importedAt: string
  members: ContentPackGroupMemberRef[]
}

export interface ContentPackGroupStorageIndex {
  format: "daggerheart.content-pack-groups.v1"
  groups: Record<string, ContentPackGroupRecord>
  updatedAt: string
}

export type ContentPackGroupStatus = "enabled" | "partial" | "disabled"

export type ContentPackGroupStorageIssueCode =
  | "GROUP_NOT_FOUND"
  | "GROUP_ID_CONFLICT"
  | "GROUP_ID_GENERATION_FAILED"
  | "GROUP_NAME_INVALID"
  | "GROUP_MEMBERS_EMPTY"
  | "GROUP_INDEX_READ_FAILED"
  | "GROUP_INDEX_PARSE_FAILED"
  | "GROUP_INDEX_FORMAT_INVALID"
  | "GROUP_STORAGE_WRITE_FAILED"
  | "GROUP_STORAGE_QUOTA_EXCEEDED"

export interface ContentPackGroupError {
  code: ContentPackGroupStorageIssueCode | "GROUP_MEMBER_ACTION_FAILED"
  message: string
  member?: ContentPackGroupMemberRef
  value?: unknown
}

export type ContentPackGroupRepositoryResult<T = ContentPackGroupRecord[]> =
  | { ok: true; data: T }
  | { ok: false; error: ContentPackGroupError }

export interface ContentPackGroupMutationResult {
  ok: boolean
  group?: ContentPackGroupRecord
  groups: ContentPackGroupRecord[]
  errors: ContentPackGroupError[]
}

export interface ContentPackGroupBatchActionResult {
  ok: boolean
  groupId: string
  groups: ContentPackGroupRecord[]
  succeededMembers: ContentPackGroupMemberRef[]
  failedMembers: Array<{
    member: ContentPackGroupMemberRef
    message: string
  }>
  errors: ContentPackGroupError[]
}
