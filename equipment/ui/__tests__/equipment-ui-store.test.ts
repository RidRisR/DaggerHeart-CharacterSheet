import { describe, expect, it, vi } from "vitest"
import { createEquipmentUiStore } from "../equipment-ui-store"
import { toDiagnosticView } from "../types"
import type { EquipmentPackApplicationService } from "@/equipment/packs/application-service"
import type { EquipmentPackStorageSnapshot } from "@/equipment/packs/storage-types"
import type {
  EquipmentRuntimeCacheService,
  RuntimeEquipmentTemplate,
  RuntimePackDetail,
  RuntimePackRecord,
  StableEquipmentRuntimeCacheView,
} from "@/equipment/runtime-cache/types"

function emptySnapshot(): EquipmentPackStorageSnapshot {
  return {
    packs: new Map(),
    packCount: 0,
    integrity: {
      ok: true,
      repaired: false,
      issues: [],
      removedIndexEntries: [],
      removedOrphanPackKeys: [],
      removedCorruptedPackKeys: [],
    },
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, resolve, reject }
}

const builtinWeapon: RuntimeEquipmentTemplate = {
  kind: "weapon",
  id: "builtin.weapon.test",
  name: "测试长剑",
  tier: "T1",
  weaponType: "primary",
  trait: "strength",
  damageType: "physical",
  range: "melee",
  burden: "oneHanded",
  damage: "d8",
  featureName: "可靠",
  description: "稳定可靠。",
  modifierContributions: [],
}

const customArmor: RuntimeEquipmentTemplate = {
  kind: "armor",
  id: "pack.armor.test",
  name: "测试链甲",
  tier: "T1",
  baseArmorMax: 4,
  baseThresholds: { minor: 5, major: 10 },
  featureName: "结实",
  description: "稳定可靠。",
  modifierContributions: [],
}

const customPack: RuntimePackRecord = {
  packId: "dh_equipment_pack_test",
  name: "测试装备包",
  author: "Tester",
  version: "1.0.0",
  importedAt: "2026-06-06T00:00:00.000Z",
  disabled: false,
  weaponCount: 0,
  armorCount: 1,
  source: { originKind: "file", fileName: "equipment.json", label: "equipment.json" },
}

const builtinPack: RuntimePackRecord = {
  packId: "builtin",
  name: "系统内置装备",
  author: "DaggerHeart",
  importedAt: "系统内置",
  disabled: false,
  weaponCount: 1,
  armorCount: 0,
  source: { originKind: "builtin", label: "系统内置" },
  isSystemPack: true,
}

function minimalView(): StableEquipmentRuntimeCacheView {
  return {
    templatesById: new Map([
      [builtinWeapon.id, builtinWeapon],
      [customArmor.id, customArmor],
    ]),
    packsById: new Map([[customPack.packId, customPack]]),
    relationIndexes: {
      templateToPackId: new Map([
        [builtinWeapon.id, "builtin"],
        [customArmor.id, customPack.packId],
      ]),
      packToTemplateIds: new Map([
        ["builtin", [builtinWeapon.id]],
        [customPack.packId, [customArmor.id]],
      ]),
    },
    queryIndexes: {
      selectableTemplateIds: [builtinWeapon.id, customArmor.id],
      weaponTemplateIds: [builtinWeapon.id],
      armorTemplateIds: [customArmor.id],
      templateIdsByTier: new Map([["T1", [builtinWeapon.id, customArmor.id]]]),
      templateIdsByTrait: new Map([["strength", [builtinWeapon.id]]]),
      templateIdsByWeaponType: new Map([["primary", [builtinWeapon.id]]]),
      templateIdsByDamageType: new Map([["physical", [builtinWeapon.id]]]),
      templateIdsByRange: new Map([["melee", [builtinWeapon.id]]]),
      templateIdsByBurden: new Map([["oneHanded", [builtinWeapon.id]]]),
      templateIdsBySource: new Map([
        ["builtin", [builtinWeapon.id]],
        [customPack.packId, [customArmor.id]],
      ]),
    },
  }
}

function snapshotWithReadablePack(): EquipmentPackStorageSnapshot {
  return {
    ...emptySnapshot(),
    packCount: 1,
    packs: new Map([
      [
        customPack.packId,
        {
          packId: customPack.packId,
          importedAt: customPack.importedAt,
          disabled: false,
          source: { originKind: "file", fileName: "broken.json" },
          pack: {
            metadata: {
              format: "daggerheart.equipment-pack.v1",
              name: "损坏但可读的装备包",
              version: "1.0.0",
              author: "Tester",
              description: "",
            },
            weapons: [],
            armor: [
              {
                id: "pack.armor.snapshot",
                name: "快照护甲",
                tier: "T1",
                baseArmorMax: 3,
                baseThresholds: { minor: 4, major: 9 },
                featureName: "备用",
                description: "从快照读取。",
                modifierContributions: [],
              },
            ],
          },
        },
      ],
    ]),
  }
}

function createHarness() {
  const runtimeReader = {
    querySelectableTemplates: vi.fn(() => [builtinWeapon]),
    getSelectableTemplateById: vi.fn((id: string) => (id === builtinWeapon.id ? builtinWeapon : undefined)),
  }
  const detail: RuntimePackDetail = { pack: customPack, templates: [customArmor] }
  const managementReader = {
    listPacks: vi.fn(() => [customPack]),
    getPackDetail: vi.fn((packId: string) => (packId === customPack.packId ? detail : undefined)),
  }
  const runtimeCacheService = {
    rebuild: vi.fn(),
    getCurrentView: vi.fn(() => minimalView()),
    getRuntimeReader: vi.fn(() => runtimeReader),
    getManagementReader: vi.fn(() => managementReader),
  } as unknown as EquipmentRuntimeCacheService
  const applicationService = {
    initialize: vi.fn(async () => ({
      success: true,
      stage: "runtimeCacheBuild" as const,
      storageCommitted: false,
      snapshot: emptySnapshot(),
      diagnostics: [],
    })),
    loadSnapshot: vi.fn(async () => emptySnapshot()),
    buildConflictContext: vi.fn(),
    importFromSource: vi.fn(),
    removePack: vi.fn(),
    setPackDisabled: vi.fn(),
  } as unknown as EquipmentPackApplicationService

  const store = createEquipmentUiStore({ applicationService, runtimeCacheService })

  return { store, applicationService, runtimeReader, managementReader }
}

describe("equipment UI store", () => {
  it("localizes runtime and storage diagnostic view messages", () => {
    expect(
      toDiagnosticView({
        severity: "error",
        code: "RUNTIME_CACHE_BUILD_FAILED",
        path: "",
        message: "Runtime cache build failed.",
      }),
    ).toMatchObject({
      code: "RUNTIME_CACHE_BUILD_FAILED",
      message: "装备数据刷新失败。请检查装备 ID 是否冲突，修复后重新导入",
    })

    expect(
      toDiagnosticView({
        severity: "error",
        code: "STORAGE_WRITE_FAILED",
        path: "",
        message: "Storage write failed.",
      }),
    ).toMatchObject({
      code: "STORAGE_WRITE_FAILED",
      message: "装备包写入存储失败。请确认浏览器存储可用后重试",
    })
  })

  it("initializes lazily and does not initialize twice", async () => {
    const { store, applicationService } = createHarness()

    await store.getState().ensureInitialized()
    await store.getState().ensureInitialized()

    expect(applicationService.initialize).toHaveBeenCalledTimes(1)
    expect(store.getState().initialized).toBe(true)
    expect(store.getState().initializing).toBe(false)
  })

  it("queries selectable runtime templates with source metadata after initialization", async () => {
    const { store, runtimeReader } = createHarness()

    await store.getState().ensureInitialized()
    const result = store.getState().querySelectableTemplates({ kind: "weapon", searchText: "长剑" })

    expect(runtimeReader.querySelectableTemplates).toHaveBeenCalledWith({ kind: "weapon", searchText: "长剑" })
    expect(result).toEqual([{ ...builtinWeapon, sourceId: "builtin", sourceLabel: "内置" }])
  })

  it("returns management read models with source metadata without exposing runtime detail objects", async () => {
    const { store, managementReader } = createHarness()

    await store.getState().ensureInitialized()

    expect(store.getState().getPackSummaries()).toEqual([
      {
        packId: customPack.packId,
        name: "测试装备包",
        author: "Tester",
        contentVersion: "1.0.0",
        importedAt: customPack.importedAt,
        disabled: false,
        sourceLabel: "equipment.json",
        weaponCount: 0,
        armorCount: 1,
        categoryBadges: ["护甲"],
      },
    ])
    expect(store.getState().getPackDetail(customPack.packId)).toEqual({
      pack: {
        packId: customPack.packId,
        name: "测试装备包",
        author: "Tester",
        contentVersion: "1.0.0",
        importedAt: customPack.importedAt,
        disabled: false,
        sourceLabel: "equipment.json",
        weaponCount: 0,
        armorCount: 1,
        categoryBadges: ["护甲"],
      },
      weapons: [],
      armor: [{ ...customArmor, sourceId: customPack.packId, sourceLabel: "测试装备包" }],
    })
    expect(store.getState().getPackDetail(customPack.packId)).not.toBe(
      managementReader.getPackDetail(customPack.packId),
    )
  })

  it("preserves builtin system pack metadata in management read models", async () => {
    const { store, managementReader } = createHarness()
    vi.mocked(managementReader.listPacks).mockReturnValueOnce([builtinPack])
    vi.mocked(managementReader.getPackDetail).mockImplementation((packId: string) =>
      packId === "builtin" ? { pack: builtinPack, templates: [builtinWeapon] } : undefined,
    )

    await store.getState().ensureInitialized()

    expect(store.getState().getPackSummaries()).toEqual([
      {
        packId: "builtin",
        name: "系统内置装备",
        author: "DaggerHeart",
        importedAt: "系统内置",
        disabled: false,
        sourceLabel: "系统内置",
        weaponCount: 1,
        armorCount: 0,
        categoryBadges: ["主武器"],
        isSystemPack: true,
      },
    ])
    expect(store.getState().getPackDetail("builtin")?.pack).toMatchObject({
      packId: "builtin",
      isSystemPack: true,
    })
  })

  it("keeps management pack summaries readable when runtime cache initialization fails", async () => {
    const { store, applicationService } = createHarness()
    vi.mocked(applicationService.initialize).mockResolvedValueOnce({
      success: false,
      stage: "runtimeCacheBuild",
      storageCommitted: false,
      snapshot: snapshotWithReadablePack(),
      diagnostics: [
        {
          severity: "error",
          code: "RUNTIME_CACHE_BUILD_FAILED",
          path: "",
          message: "runtime failed",
        },
      ],
    })

    await store.getState().ensureInitialized()

    expect(store.getState().initializationError?.code).toBe("RUNTIME_CACHE_BUILD_FAILED")
    expect(store.getState().lastDiagnostics[0]).toMatchObject({
      code: "RUNTIME_CACHE_BUILD_FAILED",
      message: "装备数据刷新失败。请检查装备 ID 是否冲突，修复后重新导入",
    })
    expect(store.getState().getPackSummaries()[0]?.name).toBe("损坏但可读的装备包")
    expect(store.getState().getPackDetail(customPack.packId)?.armor[0]).toEqual({
      kind: "armor",
      id: "pack.armor.snapshot",
      name: "快照护甲",
      tier: "T1",
      baseArmorMax: 3,
      baseThresholds: { minor: 4, major: 9 },
      featureName: "备用",
      description: "从快照读取。",
      modifierContributions: [],
      sourceId: customPack.packId,
      sourceLabel: "损坏但可读的装备包",
    })
    expect(store.getState().querySelectableTemplates({ kind: "weapon" })).toEqual([])
  })

  it("imports files through an EquipmentPackImportSource with origin and read contract", async () => {
    const { store, applicationService } = createHarness()
    const importResult = {
      success: true,
      mode: "commit" as const,
      stage: "runtimeCacheBuild" as const,
      storageCommitted: true,
      diagnostics: [],
      summary: {
        packName: "测试装备包",
        packId: customPack.packId,
        warningCount: 0,
        errorCount: 0,
        weaponCount: 0,
        armorCount: 1,
      },
    }
    vi.mocked(applicationService.importFromSource).mockResolvedValueOnce(importResult)

    const file = new File(['{"metadata":{}}'], "equipment.json", { type: "application/json" })
    await store.getState().importPackFromFile(file)

    const [source, options] = vi.mocked(applicationService.importFromSource).mock.calls[0]
    await expect(source.read()).resolves.toEqual({
      kind: "jsonText",
      text: '{"metadata":{}}',
      sizeBytes: file.size,
    })
    expect(source.origin).toEqual({ kind: "file", fileName: "equipment.json", label: "equipment.json" })
    expect(options).toEqual({ mode: "commit" })
  })

  it("waits for in-flight initialization before importing a pack", async () => {
    const { store, applicationService } = createHarness()
    const initialize = createDeferred<Awaited<ReturnType<EquipmentPackApplicationService["initialize"]>>>()
    const importResult = {
      success: true,
      mode: "commit" as const,
      stage: "runtimeCacheBuild" as const,
      storageCommitted: true,
      diagnostics: [],
      summary: {
        packName: "导入装备包",
        packId: customPack.packId,
        warningCount: 0,
        errorCount: 0,
        weaponCount: 0,
        armorCount: 1,
      },
    }
    vi.mocked(applicationService.initialize).mockReturnValueOnce(initialize.promise)
    vi.mocked(applicationService.importFromSource).mockResolvedValueOnce(importResult)

    const initializePromise = store.getState().ensureInitialized()
    const importPromise = store.getState().importPackFromFile(
      new File(['{"metadata":{}}'], "equipment.json", { type: "application/json" }),
    )
    await Promise.resolve()

    expect(applicationService.importFromSource).not.toHaveBeenCalled()

    initialize.resolve({
      success: true,
      stage: "runtimeCacheBuild",
      storageCommitted: false,
      snapshot: emptySnapshot(),
      diagnostics: [],
    })
    await initializePromise
    await importPromise

    expect(applicationService.importFromSource).toHaveBeenCalledTimes(1)
    expect(store.getState().lastResult).toBe(importResult)
    expect(store.getState().initialized).toBe(true)
    expect(store.getState().storageSnapshot?.packCount).toBe(0)
  })

  it("queues initialization behind an in-flight import so stale initialization cannot overwrite mutation state", async () => {
    const { store, applicationService } = createHarness()
    const calls: string[] = []
    const importDeferred = createDeferred<Awaited<ReturnType<EquipmentPackApplicationService["importFromSource"]>>>()
    const importResult = {
      success: true,
      mode: "commit" as const,
      stage: "runtimeCacheBuild" as const,
      storageCommitted: true,
      diagnostics: [],
      summary: {
        packName: "先导入装备包",
        packId: customPack.packId,
        warningCount: 0,
        errorCount: 0,
        weaponCount: 0,
        armorCount: 1,
      },
    }
    vi.mocked(applicationService.importFromSource).mockImplementationOnce(() => {
      calls.push("import:start")
      return importDeferred.promise
    })
    vi.mocked(applicationService.initialize).mockImplementationOnce(async () => {
      calls.push("initialize:start")
      return {
        success: true,
        stage: "runtimeCacheBuild",
        storageCommitted: false,
        snapshot: emptySnapshot(),
        diagnostics: [],
      }
    })

    const importPromise = store.getState().importPackFromFile(
      new File(['{"metadata":{}}'], "equipment.json", { type: "application/json" }),
    )
    await Promise.resolve()

    const initializePromise = store.getState().ensureInitialized()
    await Promise.resolve()

    expect(calls).toEqual(["import:start"])

    importDeferred.resolve(importResult)
    await importPromise
    await initializePromise

    expect(calls).toEqual(["import:start"])
    expect(applicationService.initialize).not.toHaveBeenCalled()
    expect(store.getState().lastResult).toBe(importResult)
    expect(store.getState().initialized).toBe(true)
  })

  it("serializes concurrent lifecycle mutations", async () => {
    const { store, applicationService } = createHarness()
    const calls: string[] = []
    const importDeferred = createDeferred<Awaited<ReturnType<EquipmentPackApplicationService["importFromSource"]>>>()
    const removeResult = {
      success: true,
      stage: "runtimeCacheBuild" as const,
      storageCommitted: true,
      diagnostics: [],
    }
    const importResult = {
      success: true,
      mode: "commit" as const,
      stage: "runtimeCacheBuild" as const,
      storageCommitted: true,
      diagnostics: [],
      summary: {
        packName: "并发导入装备包",
        packId: customPack.packId,
        warningCount: 0,
        errorCount: 0,
        weaponCount: 0,
        armorCount: 1,
      },
    }
    vi.mocked(applicationService.importFromSource).mockImplementationOnce(() => {
      calls.push("import:start")
      return importDeferred.promise
    })
    vi.mocked(applicationService.removePack).mockImplementationOnce(async () => {
      calls.push("remove:start")
      return removeResult
    })

    const importPromise = store.getState().importPackFromFile(
      new File(['{"metadata":{}}'], "equipment.json", { type: "application/json" }),
    )
    const removePromise = store.getState().removePack(customPack.packId)
    await Promise.resolve()

    expect(calls).toEqual(["import:start"])

    importDeferred.resolve(importResult)
    await importPromise
    await removePromise

    expect(calls).toEqual(["import:start", "remove:start"])
    expect(store.getState().lastResult).toBe(removeResult)
  })

  it("keeps initialized runtime cache state when an import fails after initialization", async () => {
    const { store, applicationService } = createHarness()
    const importResult = {
      success: false,
      mode: "commit" as const,
      stage: "jsonParse" as const,
      storageCommitted: false,
      diagnostics: [
        {
          severity: "error" as const,
          code: "INVALID_JSON" as const,
          path: "",
          message: "Invalid JSON.",
        },
      ],
      summary: {
        packName: "",
        warningCount: 0,
        errorCount: 1,
        weaponCount: 0,
        armorCount: 0,
      },
    }

    await store.getState().ensureInitialized()
    vi.mocked(applicationService.importFromSource).mockResolvedValueOnce(importResult)

    await store.getState().importPackFromFile(
      new File(["not json"], "broken.json", { type: "application/json" }),
    )

    expect(store.getState().initialized).toBe(true)
    expect(store.getState().initializationError).toBeNull()
    expect(store.getState().lastResult).toBe(importResult)
    expect(store.getState().lastDiagnostics[0]).toMatchObject({
      code: "INVALID_JSON",
      message: "文件不是有效的 JSON。请修复 JSON 语法，然后重新导入",
    })
  })

  it("keeps initialized runtime cache state when disabling a pack fails after initialization", async () => {
    const { store, applicationService } = createHarness()
    const disableResult = {
      success: false,
      stage: "storageTransaction" as const,
      storageCommitted: false,
      diagnostics: [
        {
          severity: "error" as const,
          code: "PACK_NOT_FOUND" as const,
          path: "" as const,
          message: "Pack not found.",
        },
      ],
    }

    await store.getState().ensureInitialized()
    vi.mocked(applicationService.setPackDisabled).mockResolvedValueOnce(disableResult)

    await store.getState().setPackDisabled(customPack.packId, true)

    expect(store.getState().initialized).toBe(true)
    expect(store.getState().initializationError).toBeNull()
    expect(store.getState().lastResult).toBe(disableResult)
    expect(store.getState().lastDiagnostics[0]).toMatchObject({
      code: "PACK_NOT_FOUND",
      message: "找不到指定的装备包。请刷新装备包列表后重试",
    })
  })

  it("creates the browser singleton with an in-memory adapter when window is unavailable", async () => {
    vi.resetModules()
    vi.stubGlobal("window", undefined)

    try {
      const { getEquipmentUiStore } = await import("../equipment-ui-store")

      const store = getEquipmentUiStore()

      expect(store.getState().initialized).toBe(false)
      expect(store.getState().getPackSummaries()).toEqual([])
    } finally {
      vi.unstubAllGlobals()
      vi.resetModules()
    }
  })
})
