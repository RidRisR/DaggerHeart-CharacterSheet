import { describe, expect, it, vi } from "vitest"
import {
  createArmorSlotFromRuntimeTemplate,
  createWeaponSlotFromRuntimeTemplate,
} from "@/automation/equipment/template-to-slot"
import armorTierOneTwo from "@/equipment/import/samples/srd-armor-tier-1-2.json"
import type {
  EquipmentPackImportSource,
  NormalizedEquipmentPackData,
} from "@/equipment/import/types"
import { createEquipmentRuntimeCacheService } from "@/equipment/runtime-cache/runtime-cache-service"
import type {
  EquipmentRuntimeCacheBuildInput,
  EquipmentRuntimeCacheBuildResult,
  EquipmentRuntimeCacheService,
  RuntimeEquipmentTemplate,
  StableEquipmentRuntimeCacheView,
} from "@/equipment/runtime-cache/types"
import { createEquipmentPackApplicationService, type EquipmentSourcePreferences } from "../application-service"
import {
  createInMemoryEquipmentPackStorageAdapter,
  getPackStorageKey,
} from "../local-storage-adapter"
import { createLocalStorageEquipmentPackRepository } from "../local-storage-repository"
import type { EquipmentPackRepository } from "../repository"
import type {
  EquipmentPackFinalCommitPlan,
  EquipmentPackSnapshotEntry,
  EquipmentPackStorageSnapshot,
  EquipmentPackStorageTransactionResult,
} from "../storage-types"

const FIXED_NOW = new Date("2026-06-04T10:20:30.000Z")
const GENERATED_PACK_ID = "pack_1780568430000_4fzyo8"

function makeNormalizedPack(
  overrides: Partial<NormalizedEquipmentPackData> & { weaponIds?: string[]; armorIds?: string[] } = {},
): NormalizedEquipmentPackData {
  const { weaponIds = ["weapon:shadow"], armorIds = [], ...packOverrides } = overrides

  return {
    metadata: {
      format: "daggerheart.equipment-pack.v1",
      name: "Shadow Equipment",
      version: "1.0.0",
      author: "Tester",
      description: "A test equipment pack.",
    },
    weapons: weaponIds.map((id) => ({
      id,
      name: `Weapon ${id}`,
      tier: "T1" as const,
      weaponType: "primary" as const,
      trait: "finesse" as const,
      damageType: "physical" as const,
      range: "melee" as const,
      burden: "oneHanded" as const,
      damage: "d8",
      featureName: "Shadow",
      description: "A shadow weapon.",
      modifierContributions: [],
    })),
    armor: armorIds.map((id) => ({
      id,
      name: `Armor ${id}`,
      tier: "T1" as const,
      baseArmorMax: 4,
      baseThresholds: { minor: 7, major: 15 },
      featureName: "Shade",
      description: "Shadow armor.",
      modifierContributions: [],
    })),
    ...packOverrides,
  }
}

function makeSnapshotEntry(
  overrides: Partial<EquipmentPackSnapshotEntry> & { weaponIds?: string[]; armorIds?: string[] } = {},
): EquipmentPackSnapshotEntry {
  const { weaponIds, armorIds, ...entryOverrides } = overrides

  return {
    packId: "pack_existing",
    importedAt: "2026-06-04T09:00:00.000Z",
    disabled: false,
    source: { originKind: "file", fileName: "existing.json" },
    pack: makeNormalizedPack({ weaponIds, armorIds }),
    ...entryOverrides,
  }
}

function makeStorageSnapshot(entries: EquipmentPackSnapshotEntry[]): EquipmentPackStorageSnapshot {
  return {
    packs: new Map(entries.map((entry) => [entry.packId, entry])),
    packCount: entries.length,
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

function makeRuntimeWeapon(
  overrides: Partial<Extract<RuntimeEquipmentTemplate, { kind: "weapon" }>> = {},
): RuntimeEquipmentTemplate {
  return {
    kind: "weapon",
    id: "weapon:builtin",
    name: "Builtin Weapon",
    tier: "T1",
    weaponType: "primary",
    trait: "agility",
    damageType: "physical",
    range: "melee",
    burden: "oneHanded",
    damage: "d8",
    featureName: "Reliable",
    description: "A built-in weapon.",
    modifierContributions: [],
    ...overrides,
  }
}

function validSource(input: { weaponId?: string; armorId?: string } = {}): EquipmentPackImportSource {
  const weaponId = input.weaponId ?? "weapon:shadow"
  const armorId = input.armorId
  const value = {
    format: "daggerheart.equipment-pack.v1",
    name: "Shadow Equipment",
    version: "1.0.0",
    author: "Tester",
    description: "A test equipment pack.",
    equipment: {
      weapons: [
        {
          id: weaponId,
          name: "Shadow Blade",
          tier: "T1",
          weaponType: "primary",
          trait: "finesse",
          damageType: "physical",
          range: "melee",
          burden: "oneHanded",
          damage: "d8",
          featureName: "Shadow",
          description: "A shadow weapon.",
        },
      ],
      ...(armorId
        ? {
            armor: [
              {
                id: armorId,
                name: "Shadow Armor",
                tier: "T1",
                baseArmorMax: 4,
                baseThresholds: { minor: 7, major: 15 },
                featureName: "Shade",
                description: "Shadow armor.",
              },
            ],
          }
        : {}),
    },
  }

  return {
    origin: { kind: "object", label: "test object" },
    async read() {
      return { kind: "parsedObject", value }
    },
  }
}

function createParsedObjectSource(label: string, value: unknown): EquipmentPackImportSource {
  return {
    origin: { kind: "object", label },
    async read() {
      return { kind: "parsedObject", value }
    },
  }
}

function validContributedPackSource(): EquipmentPackImportSource {
  return createParsedObjectSource("contributed equipment pack", {
    format: "daggerheart.equipment-pack.v1",
    name: "Contributed Equipment",
    version: "1.0.0",
    author: "Tester",
    description: "A pack with modifier-backed templates.",
    equipment: {
      weapons: [
        {
          id: "weapon:contributed-sword",
          name: "Contributed Sword",
          tier: "T1",
          weaponType: "primary",
          trait: "finesse",
          damageType: "physical",
          range: "melee",
          burden: "oneHanded",
          damage: "d8+1",
          featureName: "Guarded",
          description: "A test weapon with an evasion modifier.",
          modifierContributions: [
            {
              id: "evasion",
              definition: { target: "evasion", kind: "modifier" },
              editable: { label: "Guarded", value: 1 },
            },
          ],
        },
      ],
      armor: [
        {
          id: "armor:contributed-mail",
          name: "Contributed Mail",
          tier: "T1",
          baseArmorMax: 4,
          baseThresholds: { minor: 7, major: 15 },
          featureName: "Steady",
          description: "A test armor with an armor modifier.",
          modifierContributions: [
            {
              id: "armor-max",
              definition: { target: "armorMax", kind: "modifier" },
              editable: { label: "Steady", value: 1 },
            },
          ],
        },
      ],
    },
  })
}

function makeEmptyView(): StableEquipmentRuntimeCacheView {
  return {
    templatesById: new Map(),
    packsById: new Map(),
    relationIndexes: {
      templateToPackId: new Map(),
      packToTemplateIds: new Map(),
    },
    queryIndexes: {
      selectableTemplateIds: [],
      weaponTemplateIds: [],
      armorTemplateIds: [],
      templateIdsByTier: new Map(),
      templateIdsByTrait: new Map(),
      templateIdsByWeaponType: new Map(),
      templateIdsByDamageType: new Map(),
      templateIdsByRange: new Map(),
      templateIdsByBurden: new Map(),
      templateIdsBySource: new Map(),
    },
  }
}

function makeRuntimeCacheServiceFake(input: {
  result?: EquipmentRuntimeCacheBuildResult
} = {}): EquipmentRuntimeCacheService {
  const view = makeEmptyView()
  const successResult: EquipmentRuntimeCacheBuildResult = { ok: true, view }
  return {
    rebuild: vi.fn((_: EquipmentRuntimeCacheBuildInput): EquipmentRuntimeCacheBuildResult => input.result ?? successResult),
    getCurrentView: vi.fn(() => view),
    getRuntimeReader: vi.fn(() => ({
      querySelectableTemplates: vi.fn(() => []),
      getSelectableTemplateById: vi.fn(() => undefined),
    })),
    getManagementReader: vi.fn(() => ({
      listPacks: vi.fn(() => []),
      getPackDetail: vi.fn(() => undefined),
    })),
  }
}

function makeRepositoryFake(input: {
  snapshot?: EquipmentPackStorageSnapshot
  commitResult?: EquipmentPackStorageTransactionResult
  removeResult?: EquipmentPackStorageTransactionResult
  toggleResult?: EquipmentPackStorageTransactionResult
} = {}): EquipmentPackRepository & {
  snapshot: EquipmentPackStorageSnapshot
  postTransactionSnapshot: EquipmentPackStorageSnapshot
} {
  const snapshot = input.snapshot ?? makeStorageSnapshot([])
  const postTransactionSnapshot = makeStorageSnapshot([makeSnapshotEntry({ packId: GENERATED_PACK_ID })])

  return {
    snapshot,
    postTransactionSnapshot,
    loadSnapshot: vi.fn(async () => snapshot),
    ensureIntegrity: vi.fn(async () => snapshot.integrity),
    commitImport: vi.fn(async (plan: EquipmentPackFinalCommitPlan): Promise<EquipmentPackStorageTransactionResult> => {
      if (input.commitResult) return input.commitResult

      const committedEntry = makeSnapshotEntry({
        packId: plan.packId,
        importedAt: plan.importedAt,
        disabled: plan.disabled,
        source: plan.source,
        pack: plan.packData,
      })
      const committedSnapshot = makeStorageSnapshot([...snapshot.packs.values(), committedEntry])
      return { ok: true, snapshot: committedSnapshot, issues: [] } satisfies EquipmentPackStorageTransactionResult
    }),
    removePack: vi.fn(
      async (): Promise<EquipmentPackStorageTransactionResult> =>
        input.removeResult ?? { ok: true, snapshot: postTransactionSnapshot, issues: [] },
    ),
    setPackDisabled: vi.fn(
      async (): Promise<EquipmentPackStorageTransactionResult> =>
        input.toggleResult ?? { ok: true, snapshot: postTransactionSnapshot, issues: [] },
    ),
  }
}

function createTestService(input: {
  snapshot?: EquipmentPackStorageSnapshot
  builtinTemplates?: RuntimeEquipmentTemplate[]
  disabledSourceIds?: string[]
  sourcePreferenceWriteResult?: boolean | Promise<boolean>
  maxCustomPackCount?: number
  random?: () => number
  repository?: ReturnType<typeof makeRepositoryFake>
  runtimeCacheService?: EquipmentRuntimeCacheService
  commitResult?: EquipmentPackStorageTransactionResult
  removeResult?: EquipmentPackStorageTransactionResult
  toggleResult?: EquipmentPackStorageTransactionResult
  runtimeCacheBuildResult?: EquipmentRuntimeCacheBuildResult
} = {}) {
  const disabledSourceIds = new Set(input.disabledSourceIds ?? [])
  const sourcePreferences: EquipmentSourcePreferences = {
    getDisabledSourceIds: vi.fn(() => Array.from(disabledSourceIds)),
    setSourceDisabled: vi.fn((sourceId, disabled) => {
      if (input.sourcePreferenceWriteResult !== undefined) return input.sourcePreferenceWriteResult
      if (disabled) {
        disabledSourceIds.add(sourceId)
      } else {
        disabledSourceIds.delete(sourceId)
      }
    }),
  }
  const repository =
    input.repository ??
    makeRepositoryFake({
      snapshot: input.snapshot,
      commitResult: input.commitResult,
      removeResult: input.removeResult,
      toggleResult: input.toggleResult,
    })
  const runtimeCacheService =
    input.runtimeCacheService ?? makeRuntimeCacheServiceFake({ result: input.runtimeCacheBuildResult })
  const builtinTemplates = input.builtinTemplates ?? [makeRuntimeWeapon()]
  const service = createEquipmentPackApplicationService({
    repository,
    runtimeCacheService,
    builtinTemplates,
    sourcePreferences,
    maxCustomPackCount: input.maxCustomPackCount,
    now: () => FIXED_NOW,
    random: input.random ?? (() => 0.123456),
  })

  return { service, repository, runtimeCacheService, builtinTemplates, sourcePreferences }
}

function createTestEquipmentPackApplicationService(input: {
  adapter?: ReturnType<typeof createInMemoryEquipmentPackStorageAdapter>
  builtinTemplates?: RuntimeEquipmentTemplate[]
  random?: () => number
} = {}) {
  const adapter = input.adapter ?? createInMemoryEquipmentPackStorageAdapter()
  const repository = createLocalStorageEquipmentPackRepository(adapter, { now: () => FIXED_NOW })
  const runtimeCacheService = createEquipmentRuntimeCacheService()
  const builtinTemplates = input.builtinTemplates ?? []
  const service = createEquipmentPackApplicationService({
    repository,
    runtimeCacheService,
    builtinTemplates,
    sourcePreferences: {
      getDisabledSourceIds: () => [],
      setSourceDisabled: () => undefined,
    },
    now: () => FIXED_NOW,
    random: input.random ?? (() => 0.123456),
  })

  return {
    adapter,
    repository,
    runtimeCacheService,
    builtinTemplates,
    initialize: service.initialize,
    importFromSource: service.importFromSource,
    removePack: service.removePack,
    setPackDisabled: service.setPackDisabled,
    get runtimeReader() {
      return runtimeCacheService.getRuntimeReader()
    },
    get managementReader() {
      return runtimeCacheService.getManagementReader()
    },
  }
}

async function importValidPack(app: ReturnType<typeof createTestEquipmentPackApplicationService>) {
  return app.importFromSource(validContributedPackSource(), { mode: "commit" })
}

describe("equipment pack application service", () => {
  it("initialize loads recovered snapshot and rebuilds runtime cache", async () => {
    const repository = makeRepositoryFake({ snapshot: makeStorageSnapshot([]) })
    const runtimeCacheService = makeRuntimeCacheServiceFake()
    const builtinTemplates = [makeRuntimeWeapon()]
    const service = createEquipmentPackApplicationService({
      repository,
      runtimeCacheService,
      builtinTemplates,
      now: () => FIXED_NOW,
      random: () => 0.123456,
    })

    const result = await service.initialize()

    expect(result).toMatchObject({ success: true, stage: "runtimeCacheBuild", storageCommitted: false })
    expect(result.snapshot).toBe(repository.snapshot)
    expect(repository.loadSnapshot).toHaveBeenCalledTimes(1)
    expect(runtimeCacheService.rebuild).toHaveBeenCalledWith({
      builtinTemplates,
      storageSnapshot: repository.snapshot,
      disabledSourceIds: [],
    })
  })

  it("initialize exposes runtime cache build failure diagnostics", async () => {
    const { service } = createTestService({
      runtimeCacheBuildResult: {
        ok: false,
        diagnostic: {
          severity: "error",
          code: "RUNTIME_CACHE_DUPLICATE_TEMPLATE_ID",
          path: "/builtinTemplates/1",
          message: "Runtime cache duplicate template id.",
          value: "weapon:dupe",
        },
      },
    })

    const result = await service.initialize()

    expect(result).toMatchObject({
      success: false,
      stage: "runtimeCacheBuild",
      storageCommitted: false,
      snapshot: expect.any(Object),
      diagnostics: [expect.objectContaining({ code: "RUNTIME_CACHE_DUPLICATE_TEMPLATE_ID" })],
    })
  })

  it("loadSnapshot proxies repository loadSnapshot", async () => {
    const { service, repository } = createTestService()

    const snapshot = await service.loadSnapshot()

    expect(snapshot).toBe(repository.snapshot)
    expect(repository.loadSnapshot).toHaveBeenCalledTimes(1)
  })

  it("buildConflictContext derives built-in and imported template ids from a snapshot", () => {
    const snapshot = makeStorageSnapshot([
      makeSnapshotEntry({ packId: "pack_a", weaponIds: ["weapon:existing"], armorIds: ["armor:existing"] }),
    ])
    const { service } = createTestService({
      snapshot,
      builtinTemplates: [makeRuntimeWeapon({ id: "weapon:builtin" })],
      maxCustomPackCount: 3,
    })

    const context = service.buildConflictContext(snapshot)

    expect(context.builtinTemplateIds).toEqual(new Set(["weapon:builtin"]))
    expect(context.importedTemplateIds).toEqual(new Set(["weapon:existing", "armor:existing"]))
    expect(context.importedTemplateSources?.get("weapon:existing")).toEqual({ packId: "pack_a" })
    expect(context.customPackCount).toBe(1)
    expect(context.maxCustomPackCount).toBe(3)
  })

  it("commit dry run stops at stageImportData and does not write repository", async () => {
    const { service, repository, runtimeCacheService } = createTestService()

    const result = await service.importFromSource(validSource(), { mode: "dryRun" })

    expect(result).toMatchObject({ success: true, stage: "stageImportData", mode: "dryRun" })
    expect(result.summary.packId).toBeUndefined()
    expect(repository.commitImport).not.toHaveBeenCalled()
    expect(runtimeCacheService.rebuild).not.toHaveBeenCalled()
  })

  it("commit import builds conflict context from repository snapshot", async () => {
    const { service, repository } = createTestService({
      snapshot: makeStorageSnapshot([
        makeSnapshotEntry({ packId: "pack_existing", weaponIds: ["weapon:existing"] }),
      ]),
    })

    const result = await service.importFromSource(validSource({ weaponId: "weapon:existing" }), { mode: "commit" })

    expect(result).toMatchObject({ success: false, stage: "conflictCheck" })
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "ID_CONFLICT", path: "/equipment/weapons/0/id" }))
    expect(repository.commitImport).not.toHaveBeenCalled()
  })

  it("commit import succeeds only after storage transaction and runtime cache build", async () => {
    const { service, repository, runtimeCacheService } = createTestService()

    const result = await service.importFromSource(validSource(), { mode: "commit" })

    expect(repository.commitImport).toHaveBeenCalledTimes(1)
    expect(repository.commitImport).toHaveBeenCalledWith(
      expect.objectContaining({
        packId: GENERATED_PACK_ID,
        templateIds: ["weapon:shadow"],
        importedAt: FIXED_NOW.toISOString(),
        disabled: false,
      }),
    )
    expect(runtimeCacheService.rebuild).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      success: true,
      stage: "runtimeCacheBuild",
      storageCommitted: true,
      summary: {
        packId: GENERATED_PACK_ID,
        name: "Shadow Equipment",
        version: "1.0.0",
        author: "Tester",
        weaponCount: 1,
        armorCount: 0,
        warningCount: 0,
        errorCount: 0,
      },
    })
  })

  it("commit import preserves disabled built-in source during runtime cache rebuild", async () => {
    const { service, runtimeCacheService } = createTestService({ disabledSourceIds: ["builtin"] })

    await service.importFromSource(validSource(), { mode: "commit" })

    expect(runtimeCacheService.rebuild).toHaveBeenCalledWith(
      expect.objectContaining({ disabledSourceIds: ["builtin"] }),
    )
  })

  it("repository commit failure returns storageTransaction failure and does not rebuild cache", async () => {
    const { service, runtimeCacheService } = createTestService({
      commitResult: {
        ok: false,
        error: { code: "STORAGE_WRITE_FAILED", message: "Unable to write equipment pack." },
        issues: [],
      },
    })

    const result = await service.importFromSource(validSource(), { mode: "commit" })

    expect(result).toMatchObject({ success: false, stage: "storageTransaction", storageCommitted: false })
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "STORAGE_WRITE_FAILED", path: "" }))
    expect(runtimeCacheService.rebuild).not.toHaveBeenCalled()
  })

  it("storage success plus cache build failure returns runtimeCacheBuild failure with storageCommitted true", async () => {
    const { service, repository } = createTestService({
      runtimeCacheBuildResult: {
        ok: false,
        diagnostic: {
          severity: "error",
          code: "RUNTIME_CACHE_BUILD_FAILED",
          path: "",
          message: "Runtime cache build failed.",
        },
      },
    })

    const result = await service.importFromSource(validSource(), { mode: "commit" })

    expect(result).toMatchObject({ success: false, stage: "runtimeCacheBuild", storageCommitted: true })
    expect(repository.commitImport).toHaveBeenCalledTimes(1)
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "RUNTIME_CACHE_BUILD_FAILED", path: "" }))
  })

  it("pack id generation failure returns PACK_ID_GENERATION_FAILED before repository commit", async () => {
    const { service, repository } = createTestService({
      snapshot: makeStorageSnapshot([
        makeSnapshotEntry({ packId: GENERATED_PACK_ID, weaponIds: ["weapon:already-imported"] }),
      ]),
      random: () => 0.123456,
    })

    const result = await service.importFromSource(validSource(), { mode: "commit" })

    expect(result).toMatchObject({ success: false, stage: "buildCommitPlan", storageCommitted: false })
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "PACK_ID_GENERATION_FAILED", path: "" }))
    expect(repository.commitImport).not.toHaveBeenCalled()
  })

  it("remove pack rebuilds cache from post transaction snapshot", async () => {
    const builtinTemplates = [makeRuntimeWeapon()]
    const { service, repository, runtimeCacheService } = createTestService({ builtinTemplates })

    const result = await service.removePack(GENERATED_PACK_ID)

    expect(result).toMatchObject({ success: true, stage: "runtimeCacheBuild", storageCommitted: true })
    expect(runtimeCacheService.rebuild).toHaveBeenCalledWith({
      builtinTemplates,
      storageSnapshot: repository.postTransactionSnapshot,
      disabledSourceIds: [],
    })
  })

  it("remove pack preserves disabled built-in source during runtime cache rebuild", async () => {
    const { service, runtimeCacheService } = createTestService({ disabledSourceIds: ["builtin"] })

    await service.removePack(GENERATED_PACK_ID)

    expect(runtimeCacheService.rebuild).toHaveBeenCalledWith(
      expect.objectContaining({ disabledSourceIds: ["builtin"] }),
    )
  })

  it("remove pack treats successful repository issues as non-blocking and still rebuilds cache", async () => {
    const postTransactionSnapshot = makeStorageSnapshot([])
    const { service, runtimeCacheService } = createTestService({
      removeResult: {
        ok: true,
        snapshot: postTransactionSnapshot,
        issues: [
          {
            code: "ORPHAN_PACK_DATA_CLEANUP_PENDING",
            packId: GENERATED_PACK_ID,
            message: "Cleanup is still pending.",
          },
        ],
      },
    })

    const result = await service.removePack(GENERATED_PACK_ID)

    expect(result).toMatchObject({ success: true, stage: "runtimeCacheBuild", storageCommitted: true })
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ severity: "warning", code: "ORPHAN_PACK_DATA_CLEANUP_PENDING" }),
    ])
    expect(runtimeCacheService.rebuild).toHaveBeenCalledWith(
      expect.objectContaining({ storageSnapshot: postTransactionSnapshot }),
    )
  })

  it("commit import returns runtimeCacheBuild failure when post transaction snapshot has blocking integrity issues", async () => {
    const postTransactionSnapshot = makeStorageSnapshot([])
    const { service, runtimeCacheService } = createTestService({
      commitResult: {
        ok: true,
        snapshot: postTransactionSnapshot,
        issues: [
          {
            code: "INDEX_READ_FAILED",
            storageKey: "dh_equipment_index",
            message: "Unable to read post-commit index.",
          },
        ],
      },
    })

    const result = await service.importFromSource(validSource(), { mode: "commit" })

    expect(result).toMatchObject({ success: false, stage: "runtimeCacheBuild", storageCommitted: true })
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ severity: "error", code: "INDEX_READ_FAILED" }),
    ])
    expect(runtimeCacheService.rebuild).not.toHaveBeenCalled()
  })

  it("remove pack storage failure does not rebuild cache", async () => {
    const { service, runtimeCacheService } = createTestService({
      removeResult: {
        ok: false,
        error: { code: "PACK_NOT_FOUND", message: "Equipment pack not found." },
        issues: [],
      },
    })

    const result = await service.removePack("pack_missing")

    expect(result).toMatchObject({ success: false, stage: "storageTransaction", storageCommitted: false })
    expect(runtimeCacheService.rebuild).not.toHaveBeenCalled()
  })

  it("toggle disabled rebuilds cache from post transaction snapshot", async () => {
    const builtinTemplates = [makeRuntimeWeapon()]
    const { service, repository, runtimeCacheService } = createTestService({ builtinTemplates })

    const result = await service.setPackDisabled(GENERATED_PACK_ID, true)

    expect(result).toMatchObject({ success: true, stage: "runtimeCacheBuild", storageCommitted: true })
    expect(repository.setPackDisabled).toHaveBeenCalledWith(GENERATED_PACK_ID, true)
    expect(runtimeCacheService.rebuild).toHaveBeenCalledWith({
      builtinTemplates,
      storageSnapshot: repository.postTransactionSnapshot,
      disabledSourceIds: [],
    })
  })

  it("toggle builtin source uses source preferences instead of repository transaction", async () => {
    const builtinTemplates = [makeRuntimeWeapon()]
    const { service, repository, runtimeCacheService, sourcePreferences } = createTestService({ builtinTemplates })

    const result = await service.setPackDisabled("builtin", true)

    expect(result).toMatchObject({ success: true, stage: "runtimeCacheBuild", storageCommitted: true })
    expect(sourcePreferences.setSourceDisabled).toHaveBeenCalledWith("builtin", true)
    expect(repository.setPackDisabled).not.toHaveBeenCalled()
    expect(repository.loadSnapshot).toHaveBeenCalled()
    expect(runtimeCacheService.rebuild).toHaveBeenCalledWith({
      builtinTemplates,
      storageSnapshot: repository.snapshot,
      disabledSourceIds: ["builtin"],
    })
  })

  it("toggle builtin source write failure does not rebuild cache", async () => {
    const { service, repository, runtimeCacheService } = createTestService({ sourcePreferenceWriteResult: false })

    const result = await service.setPackDisabled("builtin", true)

    expect(result).toMatchObject({
      success: false,
      stage: "storageTransaction",
      storageCommitted: false,
      diagnostics: [expect.objectContaining({ severity: "error", code: "SOURCE_PREFERENCES_WRITE_FAILED" })],
    })
    expect(repository.setPackDisabled).not.toHaveBeenCalled()
    expect(repository.loadSnapshot).not.toHaveBeenCalled()
    expect(runtimeCacheService.rebuild).not.toHaveBeenCalled()
  })

  it("toggle builtin source fails without explicit source preferences", async () => {
    const repository = makeRepositoryFake({ snapshot: makeStorageSnapshot([]) })
    const runtimeCacheService = makeRuntimeCacheServiceFake()
    const service = createEquipmentPackApplicationService({
      repository,
      runtimeCacheService,
      builtinTemplates: [makeRuntimeWeapon()],
      now: () => FIXED_NOW,
      random: () => 0.123456,
    })

    const result = await service.setPackDisabled("builtin", true)

    expect(result).toMatchObject({
      success: false,
      stage: "storageTransaction",
      storageCommitted: false,
      diagnostics: [expect.objectContaining({ severity: "error", code: "SOURCE_PREFERENCES_WRITE_FAILED" })],
    })
    expect(repository.loadSnapshot).not.toHaveBeenCalled()
    expect(runtimeCacheService.rebuild).not.toHaveBeenCalled()
  })

  it("toggle disabled storage failure does not rebuild cache", async () => {
    const { service, runtimeCacheService } = createTestService({
      toggleResult: {
        ok: false,
        error: { code: "PACK_NOT_FOUND", message: "Equipment pack not found." },
        issues: [],
      },
    })

    const result = await service.setPackDisabled("pack_missing", true)

    expect(result).toMatchObject({ success: false, stage: "storageTransaction", storageCommitted: false })
    expect(runtimeCacheService.rebuild).not.toHaveBeenCalled()
  })

  it("commits SRD armor sample and exposes it through runtime reader", async () => {
    const app = createTestEquipmentPackApplicationService()

    const result = await app.importFromSource(
      createParsedObjectSource("SRD armor sample", armorTierOneTwo),
      { mode: "commit" },
    )

    expect(result).toMatchObject({
      success: true,
      stage: "runtimeCacheBuild",
      storageCommitted: true,
    })
    expect(result.summary.packId).toBeTruthy()
    const packId = result.summary.packId!
    expect(
      app.runtimeReader.querySelectableTemplates({ kind: "armor", sourceIds: [packId] }),
    ).toHaveLength(14)
  })

  it("initialize rebuilds runtime reader from persisted storage", async () => {
    const firstApp = createTestEquipmentPackApplicationService()
    const imported = await importValidPack(firstApp)
    const packId = imported.summary.packId!
    await firstApp.setPackDisabled(packId, true)

    const coldStartApp = createTestEquipmentPackApplicationService({ adapter: firstApp.adapter })
    const initialized = await coldStartApp.initialize()

    expect(initialized).toMatchObject({ success: true, stage: "runtimeCacheBuild", storageCommitted: false })
    expect(initialized.snapshot.packs.get(packId)?.disabled).toBe(true)
    expect(coldStartApp.runtimeReader.querySelectableTemplates({ sourceIds: [packId] })).toEqual([])
    expect(coldStartApp.managementReader.getPackDetail(packId)).toMatchObject({
      pack: { packId, disabled: true },
      templates: expect.arrayContaining([
        expect.objectContaining({ id: "weapon:contributed-sword" }),
        expect.objectContaining({ id: "armor:contributed-mail" }),
      ]),
    })
  })

  it("remove refreshes runtime cache when pack data cleanup is pending", async () => {
    const app = createTestEquipmentPackApplicationService()
    const result = await importValidPack(app)
    const packId = result.summary.packId!
    const packKey = getPackStorageKey(packId)
    const baseRemoveItem = app.adapter.removeItem
    app.adapter.removeItem = (key) => {
      if (key === packKey) {
        throw new Error(`failed remove ${key}`)
      }
      baseRemoveItem(key)
    }

    const removed = await app.removePack(packId)

    expect(removed).toMatchObject({ success: true, stage: "runtimeCacheBuild", storageCommitted: true })
    expect(removed.diagnostics).toEqual([
      expect.objectContaining({ severity: "warning", code: "ORPHAN_PACK_DATA_CLEANUP_PENDING" }),
    ])
    expect(app.runtimeReader.querySelectableTemplates({ sourceIds: [packId] })).toEqual([])
    expect(app.managementReader.getPackDetail(packId)).toBeUndefined()
    expect(app.adapter.getItem(packKey)).not.toBeNull()
  })

  it("disable hides future runtime selection but keeps management detail", async () => {
    const app = createTestEquipmentPackApplicationService()
    const result = await importValidPack(app)
    const packId = result.summary.packId!
    const templateIdsBeforeDisable = app.runtimeReader
      .querySelectableTemplates({ sourceIds: [packId] })
      .map((template) => template.id)

    const disabled = await app.setPackDisabled(packId, true)

    expect(disabled).toMatchObject({ success: true, stage: "runtimeCacheBuild", storageCommitted: true })
    expect(app.runtimeReader.querySelectableTemplates({ sourceIds: [packId] })).toEqual([])
    for (const templateId of templateIdsBeforeDisable) {
      expect(app.runtimeReader.getSelectableTemplateById(templateId)).toBeUndefined()
    }
    expect(app.managementReader.getPackDetail(packId)).toMatchObject({
      pack: { packId, disabled: true },
      templates: expect.arrayContaining([
        expect.objectContaining({ id: "weapon:contributed-sword" }),
        expect.objectContaining({ id: "armor:contributed-mail" }),
      ]),
    })
  })

  it("remove hides management and runtime data but does not affect an already instantiated weapon slot", async () => {
    const app = createTestEquipmentPackApplicationService()
    const result = await importValidPack(app)
    const packId = result.summary.packId!
    const template = app.runtimeReader
      .querySelectableTemplates({ kind: "weapon", sourceIds: [packId] })
      .find((template) => template.kind === "weapon")

    expect(template).toBeTruthy()
    expect(template?.modifierContributions).toHaveLength(1)

    const instantiated = createWeaponSlotFromRuntimeTemplate(template!, (id) => `instance:${id}`)
    const contributionBeforeRemove = structuredClone(instantiated.modifierContributions[0])

    const removed = await app.removePack(packId)

    expect(removed).toMatchObject({ success: true, stage: "runtimeCacheBuild", storageCommitted: true })
    expect(app.runtimeReader.querySelectableTemplates({ sourceIds: [packId] })).toEqual([])
    expect(app.managementReader.getPackDetail(packId)).toBeUndefined()
    expect(instantiated.name).toBe(template!.name)
    expect(instantiated.trait).toBe("物理/单手/近战")
    expect(instantiated.damage).toContain(template!.damage)
    expect(instantiated.feature).toContain(template!.featureName ?? "")
    expect(instantiated.modifierContributions[0]).toEqual(contributionBeforeRemove)
    expect(instantiated.modifierContributions).not.toBe(template!.modifierContributions)
    expect(instantiated.modifierContributions[0]).not.toBe(template!.modifierContributions[0])
    expect(instantiated.modifierContributions[0].definition).not.toBe(template!.modifierContributions[0].definition)
    expect(instantiated.modifierContributions[0].editable).not.toBe(template!.modifierContributions[0].editable)
  })

  it("remove does not affect an already instantiated armor slot", async () => {
    const app = createTestEquipmentPackApplicationService()
    const result = await importValidPack(app)
    const packId = result.summary.packId!
    const template = app.runtimeReader
      .querySelectableTemplates({ kind: "armor", sourceIds: [packId] })
      .find((template) => template.kind === "armor")

    expect(template).toBeTruthy()
    expect(template?.modifierContributions).toHaveLength(1)

    const instantiated = createArmorSlotFromRuntimeTemplate(template!, (id) => `instance:${id}`)
    const contributionBeforeRemove = structuredClone(instantiated.modifierContributions[0])

    const removed = await app.removePack(packId)

    expect(removed).toMatchObject({ success: true, stage: "runtimeCacheBuild", storageCommitted: true })
    expect(app.runtimeReader.querySelectableTemplates({ sourceIds: [packId] })).toEqual([])
    expect(app.managementReader.getPackDetail(packId)).toBeUndefined()
    expect(instantiated.name).toBe(template!.name)
    expect(instantiated.baseArmorMax).toBe(template!.baseArmorMax)
    expect(instantiated.baseThresholds).toEqual(template!.baseThresholds)
    expect(instantiated.baseThresholds).not.toBe(template!.baseThresholds)
    expect(instantiated.modifierContributions[0]).toEqual(contributionBeforeRemove)
    expect(instantiated.modifierContributions).not.toBe(template!.modifierContributions)
    expect(instantiated.modifierContributions[0]).not.toBe(template!.modifierContributions[0])
    expect(instantiated.modifierContributions[0].definition).not.toBe(template!.modifierContributions[0].definition)
    expect(instantiated.modifierContributions[0].editable).not.toBe(template!.modifierContributions[0].editable)
  })
})
