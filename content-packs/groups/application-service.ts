import { createContentPackGroupId, defaultGroupNameFromFileName } from "./group-id"
import type { ContentPackGroupRepository } from "./repository"
import type {
  ContentPackGroupBatchActionResult,
  ContentPackGroupError,
  ContentPackGroupMemberRef,
  ContentPackGroupMutationResult,
  ContentPackGroupRecord,
} from "./types"

export interface PackActionOutcome {
  ok: boolean
  message?: string
}

export interface ContentPackGroupLifecyclePorts {
  setCardPackDisabled(packId: string, disabled: boolean): Promise<PackActionOutcome>
  removeCardPack(packId: string): Promise<PackActionOutcome>
  setEquipmentPackDisabled(packId: string, disabled: boolean): Promise<PackActionOutcome>
  removeEquipmentPack(packId: string): Promise<PackActionOutcome>
}

export interface CreateGroupInput {
  name?: string
  sourceFileName: string
  members: ContentPackGroupMemberRef[]
  importedAt?: string
}

export interface ContentPackGroupApplicationService {
  listGroups(): ContentPackGroupMutationResult
  reconcile(input: {
    installedCardPackIds: ReadonlySet<string>
    installedEquipmentPackIds: ReadonlySet<string>
  }): ContentPackGroupMutationResult
  createGroup(input: CreateGroupInput): ContentPackGroupMutationResult
  renameGroup(groupId: string, name: string): ContentPackGroupMutationResult
  removeMember(member: ContentPackGroupMemberRef): ContentPackGroupMutationResult
  setGroupDisabled(
    groupId: string,
    disabled: boolean,
    options?: {
      isMemberDisabled?: (member: ContentPackGroupMemberRef) => boolean | undefined
    },
  ): Promise<ContentPackGroupBatchActionResult>
  removeGroup(groupId: string): Promise<ContentPackGroupBatchActionResult>
  clearAll(): ContentPackGroupMutationResult
}

export interface CreateContentPackGroupApplicationServiceInput {
  repository: ContentPackGroupRepository
  lifecycle: ContentPackGroupLifecyclePorts
  now?: () => Date
  random?: () => number
}

export function createContentPackGroupApplicationService(
  input: CreateContentPackGroupApplicationServiceInput,
): ContentPackGroupApplicationService {
  const now = input.now ?? (() => new Date())
  const random = input.random ?? Math.random

  function listGroups(): ContentPackGroupMutationResult {
    const loaded = input.repository.loadAll()
    if (!loaded.ok) {
      return { ok: false, groups: [], errors: [loaded.error] }
    }
    return { ok: true, groups: loaded.data, errors: [] }
  }

  function reconcile(reconcileInput: {
    installedCardPackIds: ReadonlySet<string>
    installedEquipmentPackIds: ReadonlySet<string>
  }): ContentPackGroupMutationResult {
    const result = input.repository.reconcileInstalledPacks(reconcileInput)
    if (!result.ok) {
      return { ok: false, groups: [], errors: [result.error] }
    }
    return { ok: true, groups: result.data, errors: [] }
  }

  function createGroup(createInput: CreateGroupInput): ContentPackGroupMutationResult {
    const loaded = input.repository.loadAll()
    if (!loaded.ok) {
      return { ok: false, groups: [], errors: [loaded.error] }
    }

    const existingIds = new Set(loaded.data.map((group) => group.groupId))
    const timestamp = now()
    const groupId = createContentPackGroupId({
      now: timestamp,
      random,
      exists: (candidate) => existingIds.has(candidate),
    })

    if (!groupId) {
      return {
        ok: false,
        groups: loaded.data,
        errors: [
          {
            code: "GROUP_ID_GENERATION_FAILED",
            message: "Unable to generate a unique import group id.",
          },
        ],
      }
    }

    const name = createInput.name?.trim() || defaultGroupNameFromFileName(createInput.sourceFileName)
    const record: ContentPackGroupRecord = {
      groupId,
      name,
      sourceFileName: createInput.sourceFileName,
      importedAt: createInput.importedAt ?? timestamp.toISOString(),
      members: createInput.members,
    }

    const saved = input.repository.saveGroup(record)
    if (!saved.ok) {
      return { ok: false, groups: loaded.data, errors: [saved.error] }
    }

    const created = saved.data.find((group) => group.groupId === groupId) ?? record
    return { ok: true, group: created, groups: saved.data, errors: [] }
  }

  function renameGroup(groupId: string, name: string): ContentPackGroupMutationResult {
    const renamed = input.repository.renameGroup(groupId, name)
    if (!renamed.ok) {
      const current = input.repository.loadAll()
      return {
        ok: false,
        groups: current.ok ? current.data : [],
        errors: [renamed.error],
      }
    }
    const group = renamed.data.find((item) => item.groupId === groupId)
    return { ok: true, group, groups: renamed.data, errors: [] }
  }

  function removeMember(member: ContentPackGroupMemberRef): ContentPackGroupMutationResult {
    const updated = input.repository.removeMember(member)
    if (!updated.ok) {
      const current = input.repository.loadAll()
      return {
        ok: false,
        groups: current.ok ? current.data : [],
        errors: [updated.error],
      }
    }
    return { ok: true, groups: updated.data, errors: [] }
  }

  async function setGroupDisabled(
    groupId: string,
    disabled: boolean,
    options?: {
      isMemberDisabled?: (member: ContentPackGroupMemberRef) => boolean | undefined
    },
  ): Promise<ContentPackGroupBatchActionResult> {
    const loaded = input.repository.loadAll()
    if (!loaded.ok) {
      return {
        ok: false,
        groupId,
        groups: [],
        succeededMembers: [],
        failedMembers: [],
        errors: [loaded.error],
      }
    }

    const group = loaded.data.find((item) => item.groupId === groupId)
    if (!group) {
      return {
        ok: false,
        groupId,
        groups: loaded.data,
        succeededMembers: [],
        failedMembers: [],
        errors: [
          {
            code: "GROUP_NOT_FOUND",
            message: `Import group "${groupId}" not found.`,
            value: groupId,
          },
        ],
      }
    }

    const succeededMembers: ContentPackGroupMemberRef[] = []
    const failedMembers: Array<{ member: ContentPackGroupMemberRef; message: string }> = []
    const errors: ContentPackGroupError[] = []

    for (const member of group.members) {
      if (options?.isMemberDisabled?.(member) === disabled) {
        succeededMembers.push(member)
        continue
      }

      try {
        const outcome =
          member.kind === "card"
            ? await input.lifecycle.setCardPackDisabled(member.packId, disabled)
            : await input.lifecycle.setEquipmentPackDisabled(member.packId, disabled)

        if (outcome.ok) {
          succeededMembers.push(member)
        } else {
          const message = outcome.message ?? "更新内容包状态失败"
          failedMembers.push({ member, message })
          errors.push({ code: "GROUP_MEMBER_ACTION_FAILED", message, member })
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "更新内容包状态时发生异常"
        failedMembers.push({ member, message })
        errors.push({ code: "GROUP_MEMBER_ACTION_FAILED", message, member, value: error })
      }
    }

    return {
      ok: failedMembers.length === 0,
      groupId,
      groups: loaded.data,
      succeededMembers,
      failedMembers,
      errors,
    }
  }

  async function removeGroup(groupId: string): Promise<ContentPackGroupBatchActionResult> {
    const loaded = input.repository.loadAll()
    if (!loaded.ok) {
      return {
        ok: false,
        groupId,
        groups: [],
        succeededMembers: [],
        failedMembers: [],
        errors: [loaded.error],
      }
    }

    const group = loaded.data.find((item) => item.groupId === groupId)
    if (!group) {
      return {
        ok: false,
        groupId,
        groups: loaded.data,
        succeededMembers: [],
        failedMembers: [],
        errors: [
          {
            code: "GROUP_NOT_FOUND",
            message: `Import group "${groupId}" not found.`,
            value: groupId,
          },
        ],
      }
    }

    const succeededMembers: ContentPackGroupMemberRef[] = []
    const failedMembers: Array<{ member: ContentPackGroupMemberRef; message: string }> = []
    const errors: ContentPackGroupError[] = []

    for (const member of group.members) {
      try {
        const outcome =
          member.kind === "card"
            ? await input.lifecycle.removeCardPack(member.packId)
            : await input.lifecycle.removeEquipmentPack(member.packId)

        if (outcome.ok) {
          succeededMembers.push(member)
        } else {
          const message = outcome.message ?? "删除内容包失败"
          failedMembers.push({ member, message })
          errors.push({ code: "GROUP_MEMBER_ACTION_FAILED", message, member })
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "删除内容包时发生异常"
        failedMembers.push({ member, message })
        errors.push({ code: "GROUP_MEMBER_ACTION_FAILED", message, member, value: error })
      }
    }

    let latestGroups = loaded.data
    if (failedMembers.length === 0) {
      const deleted = input.repository.deleteGroup(groupId)
      if (!deleted.ok) {
        errors.push(deleted.error)
      } else {
        latestGroups = deleted.data
      }
    } else {
      for (const removed of succeededMembers) {
        const updated = input.repository.removeMember(removed)
        if (!updated.ok) {
          errors.push(updated.error)
          break
        }
        latestGroups = updated.data
      }
    }

    return {
      ok: failedMembers.length === 0 && errors.length === 0,
      groupId,
      groups: latestGroups,
      succeededMembers,
      failedMembers,
      errors,
    }
  }

  function clearAll(): ContentPackGroupMutationResult {
    const cleared = input.repository.clearAll()
    if (!cleared.ok) {
      return { ok: false, groups: [], errors: [cleared.error] }
    }
    return { ok: true, groups: cleared.data, errors: [] }
  }

  return {
    listGroups,
    reconcile,
    createGroup,
    renameGroup,
    removeMember,
    setGroupDisabled,
    removeGroup,
    clearAll,
  }
}
