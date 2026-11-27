import { describe, expect, it, vi } from "vitest"
import { createContentPackGroupApplicationService } from "../application-service"
import { createInMemoryContentPackGroupStorageAdapter } from "../local-storage-adapter"
import { createLocalStorageContentPackGroupRepository } from "../local-storage-repository"

describe("createContentPackGroupApplicationService", () => {
  it("creates a group deriving default name from zip filename", () => {
    const storage = createInMemoryContentPackGroupStorageAdapter()
    const service = createContentPackGroupApplicationService({
      repository: createLocalStorageContentPackGroupRepository(storage),
      lifecycle: {
        setCardPackDisabled: vi.fn(async () => ({ ok: true })),
        removeCardPack: vi.fn(async () => ({ ok: true })),
        setEquipmentPackDisabled: vi.fn(async () => ({ ok: true })),
        removeEquipmentPack: vi.fn(async () => ({ ok: true })),
      },
      now: () => new Date("2026-11-28T00:00:00.000Z"),
      random: () => 0.123456,
    })

    const created = service.createGroup({
      sourceFileName: "神州战役整合包.ZIP",
      members: [
        { kind: "card", packId: "batch_1" },
        { kind: "equipment", packId: "equip_1" },
      ],
    })

    expect(created.ok).toBe(true)
    expect(created.group?.name).toBe("神州战役整合包")
    expect(created.group?.groupId).toMatch(/^group_/)
    expect(created.groups).toHaveLength(1)
  })

  it("toggles all members to explicit target disabled state and skips already-matching members", async () => {
    const setCardPackDisabled = vi.fn(async () => ({ ok: true }))
    const setEquipmentPackDisabled = vi.fn(async () => ({ ok: true }))
    const storage = createInMemoryContentPackGroupStorageAdapter()
    const service = createContentPackGroupApplicationService({
      repository: createLocalStorageContentPackGroupRepository(storage),
      lifecycle: {
        setCardPackDisabled,
        removeCardPack: vi.fn(async () => ({ ok: true })),
        setEquipmentPackDisabled,
        removeEquipmentPack: vi.fn(async () => ({ ok: true })),
      },
    })

    const created = service.createGroup({
      sourceFileName: "campaign.zip",
      members: [
        { kind: "card", packId: "batch_1" },
        { kind: "equipment", packId: "equip_1" },
      ],
    })
    const groupId = created.group!.groupId

    const result = await service.setGroupDisabled(groupId, true, {
      isMemberDisabled: (member) => member.kind === "card",
    })

    expect(result.ok).toBe(true)
    expect(setCardPackDisabled).not.toHaveBeenCalled()
    expect(setEquipmentPackDisabled).toHaveBeenCalledWith("equip_1", true)
    expect(result.succeededMembers).toHaveLength(2)
  })

  it("removes all members and deletes the group when all removals succeed", async () => {
    const removeCardPack = vi.fn(async () => ({ ok: true }))
    const removeEquipmentPack = vi.fn(async () => ({ ok: true }))
    const storage = createInMemoryContentPackGroupStorageAdapter()
    const service = createContentPackGroupApplicationService({
      repository: createLocalStorageContentPackGroupRepository(storage),
      lifecycle: {
        setCardPackDisabled: vi.fn(async () => ({ ok: true })),
        removeCardPack,
        setEquipmentPackDisabled: vi.fn(async () => ({ ok: true })),
        removeEquipmentPack,
      },
    })

    const created = service.createGroup({
      sourceFileName: "campaign.zip",
      members: [
        { kind: "card", packId: "batch_1" },
        { kind: "equipment", packId: "equip_1" },
      ],
    })

    const removed = await service.removeGroup(created.group!.groupId)
    expect(removed.ok).toBe(true)
    expect(removeCardPack).toHaveBeenCalledWith("batch_1")
    expect(removeEquipmentPack).toHaveBeenCalledWith("equip_1")
    expect(removed.groups).toEqual([])
  })

  it("retains only failed members when removeGroup encounters a partial failure", async () => {
    const removeCardPack = vi.fn(async () => ({ ok: true }))
    const removeEquipmentPack = vi.fn(async () => ({ ok: false, message: "装备包删除失败" }))
    const storage = createInMemoryContentPackGroupStorageAdapter()
    const service = createContentPackGroupApplicationService({
      repository: createLocalStorageContentPackGroupRepository(storage),
      lifecycle: {
        setCardPackDisabled: vi.fn(async () => ({ ok: true })),
        removeCardPack,
        setEquipmentPackDisabled: vi.fn(async () => ({ ok: true })),
        removeEquipmentPack,
      },
    })

    const created = service.createGroup({
      sourceFileName: "campaign.zip",
      members: [
        { kind: "card", packId: "batch_1" },
        { kind: "equipment", packId: "equip_1" },
      ],
    })

    const removed = await service.removeGroup(created.group!.groupId)
    expect(removed.ok).toBe(false)
    expect(removed.failedMembers).toEqual([
      { member: { kind: "equipment", packId: "equip_1" }, message: "装备包删除失败" },
    ])
    expect(removed.groups).toHaveLength(1)
    expect(removed.groups[0].members).toEqual([{ kind: "equipment", packId: "equip_1" }])
  })
})
