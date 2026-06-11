import { describe, expect, it } from "vitest"
import type { NormalizedEquipmentPackData } from "@/equipment/import/types"
import {
  createBrowserLocalStorageAdapter,
  createInMemoryEquipmentPackStorageAdapter,
  getPackStorageKey,
  LOCAL_STORAGE_KEYS,
} from "../local-storage-adapter"
import { createLocalStorageEquipmentPackRepository } from "../local-storage-repository"
import type { EquipmentPackFinalCommitPlan, EquipmentPackStorageIndex } from "../storage-types"

const FIXED_NOW = new Date("2026-06-04T10:20:30.000Z")
const FIXED_PACK_ID = "pack_1780568430000_abc123"

function makeNormalizedPack(overrides: Partial<NormalizedEquipmentPackData> = {}): NormalizedEquipmentPackData {
  return {
    metadata: {
      format: "daggerheart.equipment-pack.v1",
      name: "Shadow Equipment",
      version: "1.0.0",
      author: "Tester",
      description: "A test equipment pack.",
    },
    weapons: [
      {
        id: "weapon:shadow",
        name: "Shadow Blade",
        tier: "T1",
        weaponType: "primary",
        trait: "finesse",
        damageType: "physical",
        range: "melee",
        burden: "oneHanded",
        damage: "d8",
        featureName: "Shadow",
        description: "A blade made from shadow.",
        modifierContributions: [],
      },
    ],
    armor: [
      {
        id: "armor:shadow",
        name: "Shadow Armor",
        tier: "T1",
        baseArmorMax: 4,
        baseThresholds: { minor: 7, major: 15 },
        featureName: "Shade",
        description: "Armor made from shadow.",
        modifierContributions: [],
      },
    ],
    ...overrides,
  }
}

function makeCommitPlan(overrides: Partial<EquipmentPackFinalCommitPlan> = {}): EquipmentPackFinalCommitPlan {
  return {
    packId: FIXED_PACK_ID,
    packData: makeNormalizedPack(),
    templateIds: ["weapon:shadow", "armor:shadow"],
    source: { originKind: "file", fileName: "shadow.json", sizeBytes: 1234 },
    importedAt: FIXED_NOW.toISOString(),
    disabled: false,
    ...overrides,
  }
}

function makeIndexWithEntry(packId: string, disabled = false): EquipmentPackStorageIndex {
  return {
    format: "daggerheart.equipment-pack-index.v1",
    packs: {
      [packId]: {
        importedAt: FIXED_NOW.toISOString(),
        disabled,
        source: { originKind: "file", fileName: `${packId}.json` },
      },
    },
    updatedAt: FIXED_NOW.toISOString(),
  }
}

function makeStoredPack(pack: NormalizedEquipmentPackData = makeNormalizedPack()) {
  return {
    format: "daggerheart.equipment-pack-data.v1",
    pack,
  }
}

function createFailingSetItemAdapter(input: {
  failOnKey: string
  failOnWriteNumber: number
}): ReturnType<typeof createInMemoryEquipmentPackStorageAdapter> {
  const adapter = createInMemoryEquipmentPackStorageAdapter()
  const baseSetItem = adapter.setItem
  let matchingWriteCount = 0
  adapter.setItem = (key, value) => {
    if (key === input.failOnKey) {
      matchingWriteCount += 1
      if (matchingWriteCount === input.failOnWriteNumber) {
        throw new Error(`failed write ${key}`)
      }
    }
    baseSetItem(key, value)
  }
  return adapter
}

function createFailingGetItemAdapter(
  initial: Record<string, string>,
  input: { failOnKey: string; failOnReadNumber: number },
): ReturnType<typeof createInMemoryEquipmentPackStorageAdapter> {
  const adapter = createInMemoryEquipmentPackStorageAdapter(initial)
  const baseGetItem = adapter.getItem
  let matchingReadCount = 0
  adapter.getItem = (key) => {
    if (key === input.failOnKey) {
      matchingReadCount += 1
      if (matchingReadCount === input.failOnReadNumber) {
        throw new Error(`failed read ${key}`)
      }
    }
    return baseGetItem(key)
  }
  return adapter
}

function createFailingRemoveItemAdapter(
  initial: Record<string, string>,
  input: { failOnKey: string },
): ReturnType<typeof createInMemoryEquipmentPackStorageAdapter> {
  const adapter = createInMemoryEquipmentPackStorageAdapter(initial)
  const baseRemoveItem = adapter.removeItem
  adapter.removeItem = (key) => {
    if (key === input.failOnKey) {
      throw new Error(`failed remove ${key}`)
    }
    baseRemoveItem(key)
  }
  return adapter
}

function createFailingIndexWriteAndRollbackAdapter(
  input: { packKey: string },
): ReturnType<typeof createInMemoryEquipmentPackStorageAdapter> {
  const adapter = createFailingSetItemAdapter({
    failOnKey: LOCAL_STORAGE_KEYS.INDEX,
    failOnWriteNumber: 2,
  })
  const baseRemoveItem = adapter.removeItem
  adapter.removeItem = (key) => {
    if (key === input.packKey) {
      throw new Error(`failed rollback ${key}`)
    }
    baseRemoveItem(key)
  }
  return adapter
}

describe("local storage equipment pack repository", () => {
  it("loadSnapshot creates an empty index when storage is empty", async () => {
    const adapter = createInMemoryEquipmentPackStorageAdapter()
    const repository = createLocalStorageEquipmentPackRepository(adapter, { now: () => FIXED_NOW })

    const snapshot = await repository.loadSnapshot()

    expect(snapshot.packCount).toBe(0)
    expect(snapshot.packs.size).toBe(0)
    expect(JSON.parse(adapter.getItem(LOCAL_STORAGE_KEYS.INDEX) ?? "")).toMatchObject({
      format: "daggerheart.equipment-pack-index.v1",
      packs: {},
    })
  })

  it("commitImport writes pack data before index and returns post transaction snapshot", async () => {
    const adapter = createInMemoryEquipmentPackStorageAdapter()
    const repository = createLocalStorageEquipmentPackRepository(adapter, { now: () => FIXED_NOW })
    const plan = makeCommitPlan()

    const result = await repository.commitImport(plan)

    expect(result.ok).toBe(true)
    expect(result.ok && result.snapshot.packs.has(plan.packId)).toBe(true)
    expect(adapter.writeLog.map((entry) => entry.key)).toEqual([
      LOCAL_STORAGE_KEYS.INDEX,
      getPackStorageKey(plan.packId),
      LOCAL_STORAGE_KEYS.INDEX,
    ])
  })

  it("commitImport rolls back newly written pack data when index write fails", async () => {
    const adapter = createFailingSetItemAdapter({
      failOnKey: LOCAL_STORAGE_KEYS.INDEX,
      failOnWriteNumber: 2,
    })
    const repository = createLocalStorageEquipmentPackRepository(adapter, { now: () => FIXED_NOW })
    const plan = makeCommitPlan()

    const result = await repository.commitImport(plan)

    expect(result.ok).toBe(false)
    expect(!result.ok && result.error.code).toBe("STORAGE_WRITE_FAILED")
    expect(adapter.getItem(getPackStorageKey(plan.packId))).toBeNull()
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "STORAGE_WRITE_FAILED" })]),
    )
  })

  it("commitImport reports rollback failure when index write and pack cleanup both fail", async () => {
    const plan = makeCommitPlan()
    const adapter = createFailingIndexWriteAndRollbackAdapter({
      packKey: getPackStorageKey(plan.packId),
    })
    const repository = createLocalStorageEquipmentPackRepository(adapter, { now: () => FIXED_NOW })

    const result = await repository.commitImport(plan)

    expect(result.ok).toBe(false)
    expect(!result.ok && result.error.code).toBe("STORAGE_WRITE_FAILED")
    expect(adapter.getItem(getPackStorageKey(plan.packId))).not.toBeNull()
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "STORAGE_WRITE_FAILED", packId: plan.packId }),
        expect.objectContaining({ code: "ROLLBACK_FAILED", packId: plan.packId }),
      ]),
    )
  })

  it("commitImport rejects duplicate pack ids without overwriting existing data", async () => {
    const adapter = createInMemoryEquipmentPackStorageAdapter()
    const repository = createLocalStorageEquipmentPackRepository(adapter, { now: () => FIXED_NOW })
    const originalPlan = makeCommitPlan()
    const duplicatePlan = makeCommitPlan({
      packData: makeNormalizedPack({
        metadata: {
          format: "daggerheart.equipment-pack.v1",
          name: "Overwriting Equipment",
          version: "1.0.0",
          author: "Tester",
          description: "This pack should not be written.",
        },
      }),
    })
    await repository.commitImport(originalPlan)

    const result = await repository.commitImport(duplicatePlan)

    expect(result.ok).toBe(false)
    expect(!result.ok && result.error.code).toBe("PACK_ID_CONFLICT")
    const stored = JSON.parse(adapter.getItem(getPackStorageKey(originalPlan.packId)) ?? "{}")
    expect(stored.pack.metadata.name).toBe("Shadow Equipment")
  })

  it("commitImport rejects template id conflicts before writing pack data", async () => {
    const adapter = createInMemoryEquipmentPackStorageAdapter()
    const repository = createLocalStorageEquipmentPackRepository(adapter, { now: () => FIXED_NOW })
    await repository.commitImport(makeCommitPlan({ packId: "pack_existing" }))
    const writesBeforeConflict = adapter.writeLog.length

    const result = await repository.commitImport(makeCommitPlan({ packId: "pack_new" }))

    expect(result.ok).toBe(false)
    expect(!result.ok && result.error.code).toBe("TEMPLATE_ID_CONFLICT")
    expect(adapter.getItem(getPackStorageKey("pack_new"))).toBeNull()
    expect(adapter.writeLog).toHaveLength(writesBeforeConflict)
  })

  it("commitImport rejects duplicate template ids inside the commit plan before writing pack data", async () => {
    const adapter = createInMemoryEquipmentPackStorageAdapter()
    const repository = createLocalStorageEquipmentPackRepository(adapter, { now: () => FIXED_NOW })

    const result = await repository.commitImport(
      makeCommitPlan({
        packData: makeNormalizedPack({
          armor: [
            {
              id: "weapon:shadow",
              name: "Duplicate Armor",
              tier: "T1",
              baseArmorMax: 4,
              baseThresholds: { minor: 7, major: 15 },
              featureName: "Duplicate",
              description: "Conflicts with weapon id.",
              modifierContributions: [],
            },
          ],
        }),
        templateIds: ["weapon:shadow", "weapon:shadow"],
      }),
    )

    expect(result.ok).toBe(false)
    expect(!result.ok && result.error.code).toBe("TEMPLATE_ID_CONFLICT")
    expect(adapter.getItem(getPackStorageKey(FIXED_PACK_ID))).toBeNull()
  })

  it("commitImport does not write when index state cannot be read", async () => {
    const packId = FIXED_PACK_ID
    const adapter = createFailingGetItemAdapter(
      {
        [LOCAL_STORAGE_KEYS.INDEX]: JSON.stringify(makeIndexWithEntry(packId)),
        [getPackStorageKey(packId)]: JSON.stringify(makeStoredPack()),
      },
      { failOnKey: LOCAL_STORAGE_KEYS.INDEX, failOnReadNumber: 1 },
    )
    const repository = createLocalStorageEquipmentPackRepository(adapter, { now: () => FIXED_NOW })

    const result = await repository.commitImport(makeCommitPlan({ packId: "pack_new" }))

    expect(result.ok).toBe(false)
    expect(!result.ok && result.error.code).toBe("INDEX_READ_FAILED")
    expect(adapter.writeLog).toEqual([])
    expect(adapter.removeLog).toEqual([])
  })

  it("commitImport rejects same pack id when existing pack data cannot be read", async () => {
    const packId = FIXED_PACK_ID
    const packKey = getPackStorageKey(packId)
    const adapter = createFailingGetItemAdapter(
      {
        [LOCAL_STORAGE_KEYS.INDEX]: JSON.stringify(makeIndexWithEntry(packId)),
        [packKey]: JSON.stringify(makeStoredPack()),
      },
      { failOnKey: packKey, failOnReadNumber: 1 },
    )
    const repository = createLocalStorageEquipmentPackRepository(adapter, { now: () => FIXED_NOW })

    const result = await repository.commitImport(makeCommitPlan({ packId }))

    expect(result.ok).toBe(false)
    expect(!result.ok && result.error.code).toBe("PACK_ID_CONFLICT")
    expect(adapter.getItem(packKey)).not.toBeNull()
    expect(adapter.removeLog).toEqual([])
  })

  it("removePack removes index entry first and returns snapshot without the pack", async () => {
    const adapter = createInMemoryEquipmentPackStorageAdapter()
    const repository = createLocalStorageEquipmentPackRepository(adapter, { now: () => FIXED_NOW })
    const plan = makeCommitPlan()
    await repository.commitImport(plan)

    const result = await repository.removePack(plan.packId)

    expect(result.ok).toBe(true)
    expect(result.ok && result.snapshot.packs.has(plan.packId)).toBe(false)
    expect(adapter.removeLog.at(-1)).toBe(getPackStorageKey(plan.packId))
  })

  it("removePack reports cleanup pending when pack data removal fails after index update", async () => {
    const packId = FIXED_PACK_ID
    const adapter = createFailingRemoveItemAdapter(
      {
        [LOCAL_STORAGE_KEYS.INDEX]: JSON.stringify(makeIndexWithEntry(packId)),
        [getPackStorageKey(packId)]: JSON.stringify(makeStoredPack()),
      },
      { failOnKey: getPackStorageKey(packId) },
    )
    const repository = createLocalStorageEquipmentPackRepository(adapter, { now: () => FIXED_NOW })

    const result = await repository.removePack(packId)

    expect(result.ok).toBe(true)
    expect(result.ok && result.snapshot.packs.has(packId)).toBe(false)
    expect(JSON.parse(adapter.getItem(LOCAL_STORAGE_KEYS.INDEX) ?? "{}").packs).toEqual({})
    expect(adapter.getItem(getPackStorageKey(packId))).not.toBeNull()
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "ORPHAN_PACK_DATA_CLEANUP_PENDING", packId }),
      ]),
    )
  })

  it("setPackDisabled updates index only and keeps full pack data readable", async () => {
    const adapter = createInMemoryEquipmentPackStorageAdapter()
    const repository = createLocalStorageEquipmentPackRepository(adapter, { now: () => FIXED_NOW })
    const plan = makeCommitPlan()
    await repository.commitImport(plan)
    const writesBeforeToggle = adapter.writeLog.length

    const result = await repository.setPackDisabled(plan.packId, true)

    expect(result.ok).toBe(true)
    expect(adapter.writeLog.slice(writesBeforeToggle).map((entry) => entry.key)).toEqual([
      LOCAL_STORAGE_KEYS.INDEX,
    ])
    const entry = result.ok ? result.snapshot.packs.get(plan.packId) : undefined
    expect(entry?.disabled).toBe(true)
    expect(entry?.pack.metadata.name).toBe(plan.packData.metadata.name)
  })

  it("removes orphan pack data during loadSnapshot", async () => {
    const adapter = createInMemoryEquipmentPackStorageAdapter({
      [LOCAL_STORAGE_KEYS.INDEX]: JSON.stringify({
        format: "daggerheart.equipment-pack-index.v1",
        packs: {},
        updatedAt: FIXED_NOW.toISOString(),
      }),
      [getPackStorageKey("pack_orphan")]: JSON.stringify(makeStoredPack()),
    })
    const repository = createLocalStorageEquipmentPackRepository(adapter, { now: () => FIXED_NOW })

    const snapshot = await repository.loadSnapshot()

    expect(snapshot.packCount).toBe(0)
    expect(adapter.getItem(getPackStorageKey("pack_orphan"))).toBeNull()
    expect(snapshot.integrity.issues).toContainEqual(
      expect.objectContaining({ code: "ORPHAN_PACK_DATA", packId: "pack_orphan" }),
    )
  })

  it("drops missing pack data entries from index during loadSnapshot", async () => {
    const adapter = createInMemoryEquipmentPackStorageAdapter({
      [LOCAL_STORAGE_KEYS.INDEX]: JSON.stringify(makeIndexWithEntry("pack_missing")),
    })
    const repository = createLocalStorageEquipmentPackRepository(adapter, { now: () => FIXED_NOW })

    const snapshot = await repository.loadSnapshot()

    expect(snapshot.packCount).toBe(0)
    expect(JSON.parse(adapter.getItem(LOCAL_STORAGE_KEYS.INDEX) ?? "{}").packs).toEqual({})
    expect(snapshot.integrity.issues).toContainEqual(
      expect.objectContaining({ code: "MISSING_PACK_DATA", packId: "pack_missing" }),
    )
  })

  it("drops corrupted pack data entries from index during loadSnapshot", async () => {
    const adapter = createInMemoryEquipmentPackStorageAdapter({
      [LOCAL_STORAGE_KEYS.INDEX]: JSON.stringify(makeIndexWithEntry("pack_corrupt")),
      [getPackStorageKey("pack_corrupt")]: "{",
    })
    const repository = createLocalStorageEquipmentPackRepository(adapter, { now: () => FIXED_NOW })

    const snapshot = await repository.loadSnapshot()

    expect(snapshot.packCount).toBe(0)
    expect(adapter.getItem(getPackStorageKey("pack_corrupt"))).toBeNull()
    expect(snapshot.integrity.issues).toContainEqual(
      expect.objectContaining({ code: "PACK_DATA_PARSE_FAILED", packId: "pack_corrupt" }),
    )
  })

  it("drops malformed pack data entries with valid storage envelope during loadSnapshot", async () => {
    const adapter = createInMemoryEquipmentPackStorageAdapter({
      [LOCAL_STORAGE_KEYS.INDEX]: JSON.stringify(makeIndexWithEntry("pack_malformed")),
      [getPackStorageKey("pack_malformed")]: JSON.stringify({
        format: "daggerheart.equipment-pack-data.v1",
        pack: {},
      }),
    })
    const repository = createLocalStorageEquipmentPackRepository(adapter, { now: () => FIXED_NOW })

    const snapshot = await repository.loadSnapshot()

    expect(snapshot.packCount).toBe(0)
    expect(adapter.getItem(getPackStorageKey("pack_malformed"))).toBeNull()
    expect(JSON.parse(adapter.getItem(LOCAL_STORAGE_KEYS.INDEX) ?? "{}").packs).toEqual({})
    expect(snapshot.integrity.issues).toContainEqual(
      expect.objectContaining({ code: "PACK_DATA_FORMAT_INVALID", packId: "pack_malformed" }),
    )
  })

  it("drops stored pack data when a template is missing normalized runtime fields", async () => {
    const malformedPack = makeNormalizedPack({
      weapons: [{ id: "weapon:malformed" } as NormalizedEquipmentPackData["weapons"][number]],
    })
    const adapter = createInMemoryEquipmentPackStorageAdapter({
      [LOCAL_STORAGE_KEYS.INDEX]: JSON.stringify(makeIndexWithEntry("pack_malformed_template")),
      [getPackStorageKey("pack_malformed_template")]: JSON.stringify(makeStoredPack(malformedPack)),
    })
    const repository = createLocalStorageEquipmentPackRepository(adapter, { now: () => FIXED_NOW })

    const snapshot = await repository.loadSnapshot()

    expect(snapshot.packCount).toBe(0)
    expect(adapter.getItem(getPackStorageKey("pack_malformed_template"))).toBeNull()
    expect(snapshot.integrity.issues).toContainEqual(
      expect.objectContaining({ code: "PACK_DATA_FORMAT_INVALID", packId: "pack_malformed_template" }),
    )
  })

  it("reports template id conflicts between stored packs without deleting them", async () => {
    const index: EquipmentPackStorageIndex = {
      format: "daggerheart.equipment-pack-index.v1",
      packs: {
        pack_a: makeIndexWithEntry("pack_a").packs.pack_a,
        pack_b: makeIndexWithEntry("pack_b").packs.pack_b,
      },
      updatedAt: FIXED_NOW.toISOString(),
    }
    const adapter = createInMemoryEquipmentPackStorageAdapter({
      [LOCAL_STORAGE_KEYS.INDEX]: JSON.stringify(index),
      [getPackStorageKey("pack_a")]: JSON.stringify(makeStoredPack()),
      [getPackStorageKey("pack_b")]: JSON.stringify(makeStoredPack()),
    })
    const repository = createLocalStorageEquipmentPackRepository(adapter, { now: () => FIXED_NOW })

    const snapshot = await repository.loadSnapshot()

    expect(snapshot.packCount).toBe(2)
    expect(adapter.getItem(getPackStorageKey("pack_a"))).not.toBeNull()
    expect(adapter.getItem(getPackStorageKey("pack_b"))).not.toBeNull()
    expect(snapshot.integrity.issues).toContainEqual(
      expect.objectContaining({
        code: "TEMPLATE_ID_CONFLICT",
        packId: "pack_b",
        value: expect.objectContaining({
          templateId: "weapon:shadow",
          conflictingPackId: "pack_a",
        }),
      }),
    )
  })

  it("corrupted index resets to empty index and deletes equipment pack data", async () => {
    const adapter = createInMemoryEquipmentPackStorageAdapter({
      [LOCAL_STORAGE_KEYS.INDEX]: "{",
      [getPackStorageKey("pack_any")]: JSON.stringify(makeStoredPack()),
    })
    const repository = createLocalStorageEquipmentPackRepository(adapter, { now: () => FIXED_NOW })

    const snapshot = await repository.loadSnapshot()

    expect(snapshot.packCount).toBe(0)
    expect(adapter.getItem(getPackStorageKey("pack_any"))).toBeNull()
    expect(JSON.parse(adapter.getItem(LOCAL_STORAGE_KEYS.INDEX) ?? "{}")).toMatchObject({
      format: "daggerheart.equipment-pack-index.v1",
      packs: {},
    })
    expect(snapshot.integrity.issues).toContainEqual(expect.objectContaining({ code: "INDEX_PARSE_FAILED" }))
  })

  it("does not reset index or delete pack data on index read failure", async () => {
    const packId = FIXED_PACK_ID
    const adapter = createFailingGetItemAdapter(
      {
        [LOCAL_STORAGE_KEYS.INDEX]: JSON.stringify(makeIndexWithEntry(packId)),
        [getPackStorageKey(packId)]: JSON.stringify(makeStoredPack()),
      },
      { failOnKey: LOCAL_STORAGE_KEYS.INDEX, failOnReadNumber: 1 },
    )
    const repository = createLocalStorageEquipmentPackRepository(adapter, { now: () => FIXED_NOW })

    const snapshot = await repository.loadSnapshot()

    expect(snapshot.packCount).toBe(0)
    expect(snapshot.integrity.issues).toContainEqual(expect.objectContaining({ code: "INDEX_READ_FAILED" }))
    expect(JSON.parse(adapter.getItem(LOCAL_STORAGE_KEYS.INDEX) ?? "{}").packs).toHaveProperty(packId)
    expect(adapter.getItem(getPackStorageKey(packId))).not.toBeNull()
    expect(adapter.removeLog).toEqual([])
  })

  it("does not remove index entry or pack data on pack data read failure", async () => {
    const packId = FIXED_PACK_ID
    const packKey = getPackStorageKey(packId)
    const adapter = createFailingGetItemAdapter(
      {
        [LOCAL_STORAGE_KEYS.INDEX]: JSON.stringify(makeIndexWithEntry(packId)),
        [packKey]: JSON.stringify(makeStoredPack()),
      },
      { failOnKey: packKey, failOnReadNumber: 1 },
    )
    const repository = createLocalStorageEquipmentPackRepository(adapter, { now: () => FIXED_NOW })

    const snapshot = await repository.loadSnapshot()

    expect(snapshot.packCount).toBe(0)
    expect(snapshot.integrity.issues).toContainEqual(
      expect.objectContaining({ code: "PACK_DATA_READ_FAILED", packId }),
    )
    expect(JSON.parse(adapter.getItem(LOCAL_STORAGE_KEYS.INDEX) ?? "{}").packs).toHaveProperty(packId)
    expect(adapter.getItem(packKey)).not.toBeNull()
    expect(adapter.removeLog).toEqual([])
  })

  it("returns PACK_NOT_FOUND when removing or disabling an unknown pack", async () => {
    const adapter = createInMemoryEquipmentPackStorageAdapter()
    const repository = createLocalStorageEquipmentPackRepository(adapter, { now: () => FIXED_NOW })

    const removeResult = await repository.removePack("pack_missing")
    const disableResult = await repository.setPackDisabled("pack_missing", true)

    expect(removeResult.ok).toBe(false)
    expect(!removeResult.ok && removeResult.error.code).toBe("PACK_NOT_FOUND")
    expect(disableResult.ok).toBe(false)
    expect(!disableResult.ok && disableResult.error.code).toBe("PACK_NOT_FOUND")
  })

  it("ensureIntegrity returns the recovery report", async () => {
    const adapter = createInMemoryEquipmentPackStorageAdapter({
      [LOCAL_STORAGE_KEYS.INDEX]: JSON.stringify(makeIndexWithEntry("pack_missing")),
    })
    const repository = createLocalStorageEquipmentPackRepository(adapter, { now: () => FIXED_NOW })

    const report = await repository.ensureIntegrity()

    expect(report.repaired).toBe(true)
    expect(report.removedIndexEntries).toEqual(["pack_missing"])
  })
})

describe("createBrowserLocalStorageAdapter compatibility", () => {
  it("uses the minimal Storage API surface", () => {
    const values = new Map<string, string>()
    const storage: Storage = {
      get length() {
        return values.size
      },
      clear: () => values.clear(),
      getItem: (key) => values.get(key) ?? null,
      key: (index) => Array.from(values.keys())[index] ?? null,
      removeItem: (key) => values.delete(key),
      setItem: (key, value) => values.set(key, value),
    }
    const adapter = createBrowserLocalStorageAdapter(storage)

    adapter.setItem("a", "1")
    adapter.setItem("b", "2")

    expect(adapter.keys()).toEqual(["a", "b"])
    expect(adapter.getItem("a")).toBe("1")
  })
})
