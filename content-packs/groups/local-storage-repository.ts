import {
  CONTENT_PACK_GROUP_STORAGE_KEY,
  type ContentPackGroupStorageAdapter,
} from "./local-storage-adapter"
import type { ContentPackGroupRepository } from "./repository"
import type {
  ContentPackGroupError,
  ContentPackGroupMemberRef,
  ContentPackGroupRecord,
  ContentPackGroupRepositoryResult,
  ContentPackGroupStorageIndex,
} from "./types"

const GROUP_INDEX_FORMAT = "daggerheart.content-pack-groups.v1" as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isQuotaError(error: unknown): boolean {
  return error instanceof Error && (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
}

function isValidMemberRef(value: unknown): value is ContentPackGroupMemberRef {
  return (
    isRecord(value) &&
    (value.kind === "card" || value.kind === "equipment") &&
    typeof value.packId === "string" &&
    value.packId.trim().length > 0
  )
}

function cloneMember(member: ContentPackGroupMemberRef): ContentPackGroupMemberRef {
  return { kind: member.kind, packId: member.packId }
}

function cloneGroup(group: ContentPackGroupRecord): ContentPackGroupRecord {
  return {
    groupId: group.groupId,
    name: group.name,
    sourceFileName: group.sourceFileName,
    importedAt: group.importedAt,
    members: group.members.map(cloneMember),
  }
}

function sortGroupsNewestFirst(groups: ContentPackGroupRecord[]): ContentPackGroupRecord[] {
  return [...groups].sort((left, right) => {
    const timeDiff = right.importedAt.localeCompare(left.importedAt)
    if (timeDiff !== 0) return timeDiff
    return left.groupId.localeCompare(right.groupId)
  })
}

function parseGroupRecord(key: string, value: unknown): ContentPackGroupRecord | null {
  if (!isRecord(value)) return null
  if (typeof value.groupId !== "string" || value.groupId !== key || value.groupId.trim().length === 0) return null
  if (typeof value.name !== "string" || value.name.trim().length === 0) return null
  if (typeof value.sourceFileName !== "string") return null
  if (typeof value.importedAt !== "string") return null
  if (!Array.isArray(value.members)) return null

  const seen = new Set<string>()
  const members: ContentPackGroupMemberRef[] = []
  for (const item of value.members) {
    if (!isValidMemberRef(item)) return null
    const memberKey = `${item.kind}:${item.packId}`
    if (seen.has(memberKey)) continue
    seen.add(memberKey)
    members.push({ kind: item.kind, packId: item.packId })
  }

  return {
    groupId: value.groupId,
    name: value.name.trim(),
    sourceFileName: value.sourceFileName,
    importedAt: value.importedAt,
    members,
  }
}

function memberKey(member: ContentPackGroupMemberRef): string {
  return `${member.kind}:${member.packId}`
}

export function createLocalStorageContentPackGroupRepository(
  storage: ContentPackGroupStorageAdapter,
  options: { now?: () => Date } = {},
): ContentPackGroupRepository {
  const now = options.now ?? (() => new Date())

  function readIndex(): ContentPackGroupRepositoryResult<Record<string, ContentPackGroupRecord>> {
    let raw: string | null
    try {
      raw = storage.getItem(CONTENT_PACK_GROUP_STORAGE_KEY)
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "GROUP_INDEX_READ_FAILED",
          message: "Unable to read content pack group index.",
          value: error,
        },
      }
    }

    if (raw === null) {
      return { ok: true, data: {} }
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "GROUP_INDEX_PARSE_FAILED",
          message: "Content pack group index contains invalid JSON.",
          value: error,
        },
      }
    }

    if (!isRecord(parsed) || parsed.format !== GROUP_INDEX_FORMAT || !isRecord(parsed.groups)) {
      return {
        ok: false,
        error: {
          code: "GROUP_INDEX_FORMAT_INVALID",
          message: "Content pack group index format is invalid.",
          value: parsed,
        },
      }
    }

    const groups: Record<string, ContentPackGroupRecord> = {}
    for (const [key, entry] of Object.entries(parsed.groups)) {
      const record = parseGroupRecord(key, entry)
      if (!record) {
        return {
          ok: false,
          error: {
            code: "GROUP_INDEX_FORMAT_INVALID",
            message: `Content pack group entry "${key}" is invalid.`,
            value: entry,
          },
        }
      }
      groups[key] = record
    }

    return { ok: true, data: groups }
  }

  function writeIndex(
    groups: Record<string, ContentPackGroupRecord>,
  ): ContentPackGroupRepositoryResult<ContentPackGroupRecord[]> {
    const payload: ContentPackGroupStorageIndex = {
      format: GROUP_INDEX_FORMAT,
      groups,
      updatedAt: now().toISOString(),
    }

    try {
      storage.setItem(CONTENT_PACK_GROUP_STORAGE_KEY, JSON.stringify(payload))
    } catch (error) {
      const storageError: ContentPackGroupError = isQuotaError(error)
        ? {
            code: "GROUP_STORAGE_QUOTA_EXCEEDED",
            message: "Browser storage quota exceeded while saving content pack groups.",
            value: error,
          }
        : {
            code: "GROUP_STORAGE_WRITE_FAILED",
            message: "Unable to write content pack group index.",
            value: error,
          }
      return { ok: false, error: storageError }
    }

    return {
      ok: true,
      data: sortGroupsNewestFirst(Object.values(groups).map(cloneGroup)),
    }
  }

  function loadAll(): ContentPackGroupRepositoryResult<ContentPackGroupRecord[]> {
    const read = readIndex()
    if (!read.ok) return read

    return {
      ok: true,
      data: sortGroupsNewestFirst(Object.values(read.data).map(cloneGroup)),
    }
  }

  function saveGroup(group: ContentPackGroupRecord): ContentPackGroupRepositoryResult<ContentPackGroupRecord[]> {
    const read = readIndex()
    if (!read.ok) return read

    const normalizedName = group.name.trim()
    if (normalizedName.length === 0) {
      return {
        ok: false,
        error: {
          code: "GROUP_NAME_INVALID",
          message: "Group name cannot be empty.",
        },
      }
    }

    const dedupedMembers: ContentPackGroupMemberRef[] = []
    const seen = new Set<string>()
    for (const member of group.members) {
      const key = memberKey(member)
      if (seen.has(key)) continue
      seen.add(key)
      dedupedMembers.push(cloneMember(member))
    }

    if (dedupedMembers.length === 0) {
      return {
        ok: false,
        error: {
          code: "GROUP_MEMBERS_EMPTY",
          message: "Import group must contain at least one pack.",
        },
      }
    }

    if (group.groupId in read.data) {
      return {
        ok: false,
        error: {
          code: "GROUP_ID_CONFLICT",
          message: `Import group "${group.groupId}" already exists.`,
          value: group.groupId,
        },
      }
    }

    const nextGroups: Record<string, ContentPackGroupRecord> = {
      ...read.data,
      [group.groupId]: {
        groupId: group.groupId,
        name: normalizedName,
        sourceFileName: group.sourceFileName,
        importedAt: group.importedAt,
        members: dedupedMembers,
      },
    }

    return writeIndex(nextGroups)
  }

  function renameGroup(groupId: string, name: string): ContentPackGroupRepositoryResult<ContentPackGroupRecord[]> {
    const read = readIndex()
    if (!read.ok) return read

    const existing = read.data[groupId]
    if (!existing) {
      return {
        ok: false,
        error: {
          code: "GROUP_NOT_FOUND",
          message: `Import group "${groupId}" not found.`,
          value: groupId,
        },
      }
    }

    const normalizedName = name.trim()
    if (normalizedName.length === 0) {
      return {
        ok: false,
        error: {
          code: "GROUP_NAME_INVALID",
          message: "Group name cannot be empty.",
        },
      }
    }

    const nextGroups: Record<string, ContentPackGroupRecord> = {
      ...read.data,
      [groupId]: {
        ...existing,
        name: normalizedName,
      },
    }

    return writeIndex(nextGroups)
  }

  function deleteGroup(groupId: string): ContentPackGroupRepositoryResult<ContentPackGroupRecord[]> {
    const read = readIndex()
    if (!read.ok) return read

    if (!(groupId in read.data)) {
      return {
        ok: false,
        error: {
          code: "GROUP_NOT_FOUND",
          message: `Import group "${groupId}" not found.`,
          value: groupId,
        },
      }
    }

    const nextGroups = { ...read.data }
    delete nextGroups[groupId]
    return writeIndex(nextGroups)
  }

  function removeMember(member: ContentPackGroupMemberRef): ContentPackGroupRepositoryResult<ContentPackGroupRecord[]> {
    const read = readIndex()
    if (!read.ok) return read

    const targetKey = memberKey(member)
    let changed = false
    const nextGroups: Record<string, ContentPackGroupRecord> = {}

    for (const [groupId, group] of Object.entries(read.data)) {
      const remaining = group.members.filter((item) => memberKey(item) !== targetKey)
      if (remaining.length !== group.members.length) {
        changed = true
      }
      if (remaining.length > 0) {
        nextGroups[groupId] = {
          ...group,
          members: remaining,
        }
      }
    }

    if (!changed) {
      return {
        ok: true,
        data: sortGroupsNewestFirst(Object.values(read.data).map(cloneGroup)),
      }
    }

    return writeIndex(nextGroups)
  }

  function reconcileInstalledPacks(input: {
    installedCardPackIds: ReadonlySet<string>
    installedEquipmentPackIds: ReadonlySet<string>
  }): ContentPackGroupRepositoryResult<ContentPackGroupRecord[]> {
    const read = readIndex()
    if (!read.ok) return read

    let changed = false
    const nextGroups: Record<string, ContentPackGroupRecord> = {}

    for (const [groupId, group] of Object.entries(read.data)) {
      const remaining = group.members.filter((member) =>
        member.kind === "card"
          ? input.installedCardPackIds.has(member.packId)
          : input.installedEquipmentPackIds.has(member.packId),
      )
      if (remaining.length !== group.members.length) {
        changed = true
      }
      if (remaining.length > 0) {
        nextGroups[groupId] = {
          ...group,
          members: remaining,
        }
      } else if (group.members.length === 0) {
        changed = true
      }
    }

    if (!changed) {
      return {
        ok: true,
        data: sortGroupsNewestFirst(Object.values(read.data).map(cloneGroup)),
      }
    }

    return writeIndex(nextGroups)
  }

  function clearAll(): ContentPackGroupRepositoryResult<ContentPackGroupRecord[]> {
    try {
      storage.removeItem(CONTENT_PACK_GROUP_STORAGE_KEY)
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "GROUP_STORAGE_WRITE_FAILED",
          message: "Unable to clear content pack group index.",
          value: error,
        },
      }
    }

    return { ok: true, data: [] }
  }

  return {
    loadAll,
    saveGroup,
    renameGroup,
    deleteGroup,
    removeMember,
    reconcileInstalledPacks,
    clearAll,
  }
}
