import { describe, expect, it } from "vitest"
import {
  CONTENT_PACK_GROUP_STORAGE_KEY,
  createInMemoryContentPackGroupStorageAdapter,
} from "../local-storage-adapter"
import { createLocalStorageContentPackGroupRepository } from "../local-storage-repository"
import type { ContentPackGroupRecord } from "../types"

function makeGroup(overrides: Partial<ContentPackGroupRecord> = {}): ContentPackGroupRecord {
  return {
    groupId: "group_1",
    name: "神州战役整合包",
    sourceFileName: "神州战役整合包.zip",
    importedAt: "2026-11-28T00:00:00.000Z",
    members: [
      { kind: "card", packId: "batch_1" },
      { kind: "equipment", packId: "equip_1" },
    ],
    ...overrides,
  }
}

describe("createLocalStorageContentPackGroupRepository", () => {
  it("loads empty array when storage has no group index", () => {
    const storage = createInMemoryContentPackGroupStorageAdapter()
    const repo = createLocalStorageContentPackGroupRepository(storage)

    const result = repo.loadAll()
    expect(result).toEqual({ ok: true, data: [] })
  })

  it("saves groups, deduplicates members, and returns groups sorted newest-first", () => {
    const storage = createInMemoryContentPackGroupStorageAdapter()
    const repo = createLocalStorageContentPackGroupRepository(storage)

    const first = repo.saveGroup(
      makeGroup({
        groupId: "group_old",
        importedAt: "2026-11-27T00:00:00.000Z",
        members: [
          { kind: "card", packId: "batch_1" },
          { kind: "card", packId: "batch_1" },
        ],
      }),
    )
    expect(first.ok).toBe(true)

    const second = repo.saveGroup(
      makeGroup({
        groupId: "group_new",
        name: "新整合包",
        importedAt: "2026-11-28T01:00:00.000Z",
      }),
    )
    expect(second.ok).toBe(true)
    if (second.ok) {
      expect(second.data.map((group) => group.groupId)).toEqual(["group_new", "group_old"])
      expect(second.data[1].members).toEqual([{ kind: "card", packId: "batch_1" }])
    }
  })

  it("fast-fails on corrupted JSON or unsupported index format", () => {
    const badJsonStorage = createInMemoryContentPackGroupStorageAdapter({
      [CONTENT_PACK_GROUP_STORAGE_KEY]: "{bad",
    })
    const badJsonRepo = createLocalStorageContentPackGroupRepository(badJsonStorage)
    expect(badJsonRepo.loadAll()).toMatchObject({
      ok: false,
      error: { code: "GROUP_INDEX_PARSE_FAILED" },
    })

    const badFormatStorage = createInMemoryContentPackGroupStorageAdapter({
      [CONTENT_PACK_GROUP_STORAGE_KEY]: JSON.stringify({ format: "unknown.v0", groups: {} }),
    })
    const badFormatRepo = createLocalStorageContentPackGroupRepository(badFormatStorage)
    expect(badFormatRepo.loadAll()).toMatchObject({
      ok: false,
      error: { code: "GROUP_INDEX_FORMAT_INVALID" },
    })
  })

  it("renames groups and rejects blank names", () => {
    const storage = createInMemoryContentPackGroupStorageAdapter()
    const repo = createLocalStorageContentPackGroupRepository(storage)
    repo.saveGroup(makeGroup())

    expect(repo.renameGroup("group_1", "   ")).toMatchObject({
      ok: false,
      error: { code: "GROUP_NAME_INVALID" },
    })

    const renamed = repo.renameGroup("group_1", "  战役第一季  ")
    expect(renamed.ok).toBe(true)
    if (renamed.ok) {
      expect(renamed.data[0].name).toBe("战役第一季")
    }
  })

  it("removes a member and automatically prunes the group once empty", () => {
    const storage = createInMemoryContentPackGroupStorageAdapter()
    const repo = createLocalStorageContentPackGroupRepository(storage)
    repo.saveGroup(makeGroup())

    const afterFirst = repo.removeMember({ kind: "card", packId: "batch_1" })
    expect(afterFirst.ok).toBe(true)
    if (afterFirst.ok) {
      expect(afterFirst.data).toHaveLength(1)
      expect(afterFirst.data[0].members).toEqual([{ kind: "equipment", packId: "equip_1" }])
    }

    const afterSecond = repo.removeMember({ kind: "equipment", packId: "equip_1" })
    expect(afterSecond.ok).toBe(true)
    if (afterSecond.ok) {
      expect(afterSecond.data).toEqual([])
    }
  })

  it("reconciles against installed packs and prunes stale references and empty groups", () => {
    const storage = createInMemoryContentPackGroupStorageAdapter()
    const repo = createLocalStorageContentPackGroupRepository(storage)
    repo.saveGroup(makeGroup({ groupId: "group_keep" }))
    repo.saveGroup(
      makeGroup({
        groupId: "group_gone",
        members: [{ kind: "card", packId: "batch_deleted" }],
      }),
    )

    const reconciled = repo.reconcileInstalledPacks({
      installedCardPackIds: new Set(["batch_1"]),
      installedEquipmentPackIds: new Set(),
    })

    expect(reconciled.ok).toBe(true)
    if (reconciled.ok) {
      expect(reconciled.data).toHaveLength(1)
      expect(reconciled.data[0].groupId).toBe("group_keep")
      expect(reconciled.data[0].members).toEqual([{ kind: "card", packId: "batch_1" }])
    }
  })

  it("reports quota exceeded errors explicitly", () => {
    const storage = createInMemoryContentPackGroupStorageAdapter({}, { failQuota: true })
    const repo = createLocalStorageContentPackGroupRepository(storage)

    expect(repo.saveGroup(makeGroup())).toMatchObject({
      ok: false,
      error: { code: "GROUP_STORAGE_QUOTA_EXCEEDED" },
    })
  })
})
