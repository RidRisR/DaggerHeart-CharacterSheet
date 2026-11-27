import JSZip from "jszip"
import { describe, expect, it, vi } from "vitest"
import type { CardPackConflictContext } from "@/card/import/types"
import type { EquipmentPackConflictContext } from "@/equipment/import/types"
import { createContentPackGroupApplicationService } from "@/content-packs/groups/application-service"
import { createInMemoryContentPackGroupStorageAdapter } from "@/content-packs/groups/local-storage-adapter"
import { createLocalStorageContentPackGroupRepository } from "@/content-packs/groups/local-storage-repository"
import {
  importContentPackArchive,
  type ImportContentPackArchiveDependencies,
} from "../archive-import-service"

async function buildZipBuffer(files: Record<string, string | Uint8Array | ArrayBuffer>): Promise<ArrayBuffer> {
  const zip = new JSZip()
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content)
  }
  return zip.generateAsync({ type: "arraybuffer" })
}

function makeCardPackV1(id: string, name: string) {
  return {
    format: "daggerheart.card-pack.v1",
    name,
    version: "1.0.0",
    author: "Tester",
    domains: [
      {
        id,
        name: `卡牌-${id}`,
        domain: "测试领域",
        description: "卡牌描述",
        level: 1,
        trait: "法术",
        recallCost: 1,
      },
    ],
  }
}

function makeEquipmentPackV1(id: string, name: string) {
  return {
    format: "daggerheart.equipment-pack.v1",
    name,
    version: "1.0.0",
    author: "Tester",
    equipment: {
      weapons: [
        {
          id,
          name: `武器-${id}`,
          tier: "T1",
          weaponType: "primary",
          trait: "agility",
          damageType: "physical",
          range: "melee",
          burden: "oneHanded",
          damage: "d8",
          description: "一把测试武器",
        },
      ],
      armor: [],
    },
  }
}

function makeBaseDependencies(
  overrides: Partial<ImportContentPackArchiveDependencies> = {},
): {
  deps: ImportContentPackArchiveDependencies
  cardConflictContext: CardPackConflictContext
  equipmentConflictContext: EquipmentPackConflictContext
  commitCardPack: ReturnType<typeof vi.fn>
  commitEquipmentPack: ReturnType<typeof vi.fn>
  removeCardPack: ReturnType<typeof vi.fn>
  removeEquipmentPack: ReturnType<typeof vi.fn>
} {
  let cardSeq = 0
  let equipSeq = 0

  const cardConflictContext: CardPackConflictContext = {
    builtinTemplateIds: new Set(["builtin-card-1"]),
    importedTemplateIds: new Set(),
    importedTemplateSources: new Map(),
    customPackCount: 0,
    maxCustomPackCount: 50,
  }

  const equipmentConflictContext: EquipmentPackConflictContext = {
    builtinTemplateIds: new Set(["builtin-weapon-1"]),
    importedTemplateIds: new Set(),
    importedTemplateSources: new Map(),
    customPackCount: 0,
    maxCustomPackCount: 50,
  }

  const storage = createInMemoryContentPackGroupStorageAdapter()
  const groupService = createContentPackGroupApplicationService({
    repository: createLocalStorageContentPackGroupRepository(storage),
    lifecycle: {
      setCardPackDisabled: vi.fn(async () => ({ ok: true })),
      removeCardPack: vi.fn(async () => ({ ok: true })),
      setEquipmentPackDisabled: vi.fn(async () => ({ ok: true })),
      removeEquipmentPack: vi.fn(async () => ({ ok: true })),
    },
  })

  const commitCardPack = vi.fn(async () => {
    cardSeq += 1
    return {
      success: true,
      mode: "commit" as const,
      stage: "runtimeRefresh" as const,
      diagnostics: [],
      summary: {
        packId: `batch_${cardSeq}`,
        cardCount: 1,
        imageCount: 0,
        warningCount: 0,
        errorCount: 0,
      },
      storageCommitted: true,
    }
  })

  const commitEquipmentPack = vi.fn(async () => {
    equipSeq += 1
    return {
      success: true,
      mode: "commit" as const,
      stage: "runtimeCacheBuild" as const,
      diagnostics: [],
      summary: {
        packId: `equip_${equipSeq}`,
        weaponCount: 1,
        armorCount: 0,
        warningCount: 0,
        errorCount: 0,
      },
      storageCommitted: true,
    }
  })

  const removeCardPack = vi.fn(async () => ({ ok: true }))
  const removeEquipmentPack = vi.fn(async () => ({ ok: true }))

  const deps: ImportContentPackArchiveDependencies = {
    getCardConflictContext: async () => cardConflictContext,
    getEquipmentConflictContext: async () => equipmentConflictContext,
    commitCardPack,
    commitEquipmentPack,
    removeCardPack,
    removeEquipmentPack,
    createGroup: (input) => groupService.createGroup(input),
    ...overrides,
  }

  return {
    deps,
    cardConflictContext,
    equipmentConflictContext,
    commitCardPack,
    commitEquipmentPack,
    removeCardPack,
    removeEquipmentPack,
  }
}

describe("importContentPackArchive", () => {
  it("delegates single-card legacy zip back to legacyCardDhcb", async () => {
    const bytes = await buildZipBuffer({
      "cards.json": JSON.stringify(makeCardPackV1("card-1", "旧版单卡包")),
    })
    const { deps, commitCardPack } = makeBaseDependencies()

    const outcome = await importContentPackArchive({ fileName: "single.zip", bytes }, deps)
    expect(outcome).toEqual({ kind: "legacyCardDhcb" })
    expect(commitCardPack).not.toHaveBeenCalled()
  })

  it("commits all valid packs in a mixed archive and creates one import group", async () => {
    const dhcbBytes = await buildZipBuffer({
      "cards.json": JSON.stringify(makeCardPackV1("dhcb-card-1", "带图卡包")),
    })
    const bytes = await buildZipBuffer({
      "cards/pack-1.json": JSON.stringify(makeCardPackV1("json-card-1", "卡牌包一")),
      "cards/pack-2.dhcb": dhcbBytes,
      "equipment/weapons.json": JSON.stringify(makeEquipmentPackV1("weapon-1", "装备包一")),
      "README.txt": "ignored note",
    })
    const { deps, commitCardPack, commitEquipmentPack } = makeBaseDependencies()

    const outcome = await importContentPackArchive({ fileName: "神州战役整合包.zip", bytes }, deps)
    expect(outcome.kind).toBe("archive")
    if (outcome.kind === "archive") {
      expect(outcome.success).toBe(true)
      expect(outcome.blockedByPreflight).toBe(false)
      expect(outcome.group?.name).toBe("神州战役整合包")
      expect(outcome.group?.members).toEqual([
        { kind: "card", packId: "batch_1" },
        { kind: "card", packId: "batch_2" },
        { kind: "equipment", packId: "equip_1" },
      ])
      expect(outcome.ignoredFiles).toEqual(["README.txt"])
    }
    expect(commitCardPack).toHaveBeenCalledTimes(2)
    expect(commitEquipmentPack).toHaveBeenCalledTimes(1)
  })

  it("blocks entire archive during preflight with zero writes when any entry is invalid", async () => {
    const bytes = await buildZipBuffer({
      "good-equip.json": JSON.stringify(makeEquipmentPackV1("weapon-1", "合法装备包")),
      "bad.json": "{not valid json",
    })
    const { deps, commitCardPack, commitEquipmentPack } = makeBaseDependencies()

    const outcome = await importContentPackArchive({ fileName: "broken.zip", bytes }, deps)
    expect(outcome.kind).toBe("archive")
    if (outcome.kind === "archive") {
      expect(outcome.success).toBe(false)
      expect(outcome.blockedByPreflight).toBe(true)
      expect(outcome.group).toBeUndefined()
      expect(outcome.entryResults.some((entry) => entry.archivePath === "bad.json" && !entry.success)).toBe(true)
    }
    expect(commitCardPack).not.toHaveBeenCalled()
    expect(commitEquipmentPack).not.toHaveBeenCalled()
  })

  it("detects intra-archive duplicate template IDs across separate files during preflight", async () => {
    const bytes = await buildZipBuffer({
      "pack-a.json": JSON.stringify(makeCardPackV1("shared-card-id", "卡包A")),
      "pack-b.json": JSON.stringify(makeCardPackV1("shared-card-id", "卡包B")),
    })
    const { deps, commitCardPack } = makeBaseDependencies()

    const outcome = await importContentPackArchive({ fileName: "conflict.zip", bytes }, deps)
    expect(outcome.kind).toBe("archive")
    if (outcome.kind === "archive") {
      expect(outcome.success).toBe(false)
      expect(outcome.blockedByPreflight).toBe(true)
      const second = outcome.entryResults.find((entry) => entry.archivePath === "pack-b.json")
      expect(second?.success).toBe(false)
      expect(second?.diagnostics.some((diagnostic) => diagnostic.code === "TEMPLATE_ID_CONFLICT")).toBe(true)
    }
    expect(commitCardPack).not.toHaveBeenCalled()
  })

  it("detects cumulative custom pack limit overflow during preflight", async () => {
    const bytes = await buildZipBuffer({
      "equip-1.json": JSON.stringify(makeEquipmentPackV1("weapon-1", "装备一")),
      "equip-2.json": JSON.stringify(makeEquipmentPackV1("weapon-2", "装备二")),
    })
    const { deps, equipmentConflictContext, commitEquipmentPack } = makeBaseDependencies()
    equipmentConflictContext.customPackCount = 49
    equipmentConflictContext.maxCustomPackCount = 50

    const outcome = await importContentPackArchive({ fileName: "over-limit.zip", bytes }, deps)
    expect(outcome.kind).toBe("archive")
    if (outcome.kind === "archive") {
      expect(outcome.success).toBe(false)
      expect(outcome.blockedByPreflight).toBe(true)
      const second = outcome.entryResults.find((entry) => entry.archivePath === "equip-2.json")
      expect(second?.diagnostics.some((diagnostic) => diagnostic.code === "PACK_LIMIT_EXCEEDED")).toBe(true)
    }
    expect(commitEquipmentPack).not.toHaveBeenCalled()
  })

  it("rolls back already-committed packs if a later commit fails", async () => {
    const bytes = await buildZipBuffer({
      "a-card.json": JSON.stringify(makeCardPackV1("card-1", "卡包一")),
      "b-equip.json": JSON.stringify(makeEquipmentPackV1("weapon-1", "装备一")),
    })
    const { deps, removeCardPack } = makeBaseDependencies({
      commitEquipmentPack: vi.fn(async () => ({
        success: false,
        mode: "commit" as const,
        stage: "storageTransaction" as const,
        diagnostics: [
          {
            severity: "error" as const,
            code: "STORAGE_QUOTA_EXCEEDED" as const,
            path: "",
            message: "Storage quota exceeded",
          },
        ],
        summary: {
          weaponCount: 0,
          armorCount: 0,
          warningCount: 0,
          errorCount: 1,
        },
        storageCommitted: false,
      })),
    })

    const outcome = await importContentPackArchive({ fileName: "quota.zip", bytes }, deps)
    expect(outcome.kind).toBe("archive")
    if (outcome.kind === "archive") {
      expect(outcome.success).toBe(false)
      expect(outcome.blockedByPreflight).toBe(false)
      expect(outcome.group).toBeUndefined()
      expect(outcome.entryResults.every((entry) => !entry.success)).toBe(true)
      expect(outcome.archiveError?.code).toBe("ARCHIVE_COMMIT_FAILED")
      expect(outcome.archiveError?.message).toContain("已自动回滚")
    }
    expect(removeCardPack).toHaveBeenCalledWith("batch_1")
  })

  it("rolls back current pack as well when commit returns success: false with storageCommitted: true", async () => {
    const bytes = await buildZipBuffer({
      "a-card.json": JSON.stringify(makeCardPackV1("card-1", "卡包一")),
      "b-equip.json": JSON.stringify(makeEquipmentPackV1("weapon-1", "装备一")),
    })
    const { deps, removeCardPack, removeEquipmentPack } = makeBaseDependencies({
      commitEquipmentPack: vi.fn(async () => ({
        success: false,
        mode: "commit" as const,
        stage: "runtimeCacheBuild" as const,
        diagnostics: [
          {
            severity: "error" as const,
            code: "RUNTIME_CACHE_BUILD_FAILED" as const,
            path: "",
            message: "Runtime cache rebuild failed",
          },
        ],
        summary: {
          packId: "equip_partial",
          weaponCount: 1,
          armorCount: 0,
          warningCount: 0,
          errorCount: 1,
        },
        storageCommitted: true,
      })),
    })

    const outcome = await importContentPackArchive({ fileName: "runtime-fail.zip", bytes }, deps)
    expect(outcome.kind).toBe("archive")
    if (outcome.kind === "archive") {
      expect(outcome.success).toBe(false)
      expect(outcome.group).toBeUndefined()
    }
    expect(removeEquipmentPack).toHaveBeenCalledWith("equip_partial")
    expect(removeCardPack).toHaveBeenCalledWith("batch_1")
  })

  it("catches rejected commit promises, rolls back previous packs, and reports incomplete rollback honestly", async () => {
    const bytes = await buildZipBuffer({
      "a-card.json": JSON.stringify(makeCardPackV1("card-1", "卡包一")),
      "b-equip.json": JSON.stringify(makeEquipmentPackV1("weapon-1", "装备一")),
    })
    const failingRemoveCardPack = vi.fn(async () => ({ ok: false, message: "无法删除 batch_1" }))
    const { deps } = makeBaseDependencies({
      commitEquipmentPack: vi.fn(async () => {
        throw new Error("IndexedDB exploded")
      }),
      removeCardPack: failingRemoveCardPack,
    })

    const outcome = await importContentPackArchive({ fileName: "throw.zip", bytes }, deps)
    expect(outcome.kind).toBe("archive")
    if (outcome.kind === "archive") {
      expect(outcome.success).toBe(false)
      expect(outcome.archiveError?.code).toBe("ARCHIVE_ROLLBACK_INCOMPLETE")
      expect(outcome.archiveError?.message).not.toContain("已自动回滚")
      expect(outcome.rollbackFailures).toHaveLength(1)
      expect(outcome.rollbackFailures?.[0].member).toEqual({ kind: "card", packId: "batch_1" })
    }
    expect(failingRemoveCardPack).toHaveBeenCalledWith("batch_1")
  })

  it("loads conflict context lazily per present pack kind and preserves container origin for equipment commit", async () => {
    const bytes = await buildZipBuffer({
      "only-equip.json": JSON.stringify(makeEquipmentPackV1("weapon-1", "纯装备整合包")),
    })
    const getCardConflictContext = vi.fn(async () => {
      throw new Error("should not be called for equipment-only archive")
    })
    const { deps, commitEquipmentPack } = makeBaseDependencies({
      getCardConflictContext,
    })

    const outcome = await importContentPackArchive({ fileName: "equip-only.zip", bytes }, deps)
    expect(outcome.kind).toBe("archive")
    if (outcome.kind === "archive") {
      expect(outcome.success).toBe(true)
    }
    expect(getCardConflictContext).not.toHaveBeenCalled()
    expect(commitEquipmentPack).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: expect.objectContaining({ kind: "container", fileName: "only-equip.json" }),
      }),
    )
  })
})
