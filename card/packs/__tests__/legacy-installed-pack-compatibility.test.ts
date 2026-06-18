import { describe, expect, it } from "vitest"
import { createInMemoryCardPackImageBackend } from "../image-backend"
import {
  CARD_PACK_STORAGE_KEYS,
  createInMemoryCardPackStorageAdapter,
  getCardPackStorageKey,
} from "../local-storage-adapter"
import { createLocalStorageCardPackRepository } from "../local-storage-repository"

const FIXED_NOW = new Date("2026-06-18T00:00:00.000Z")

function blob(text: string, type = "image/png") {
  return new Blob([text], { type })
}

function legacyIndex(packIds: string[]) {
  return {
    batches: Object.fromEntries(
      packIds.map((packId) => [
        packId,
        {
          id: packId,
          name: packId,
          fileName: `${packId}.json`,
          importTime: FIXED_NOW.toISOString(),
          cardCount: 1,
          cardTypes: ["profession"],
          size: 100,
          isSystemBatch: false,
          disabled: false,
        },
      ]),
    ),
    totalCards: packIds.length,
    totalBatches: packIds.length,
    lastUpdate: FIXED_NOW.toISOString(),
  }
}

function legacyBatch(packId: string, cardId = "warrior") {
  return {
    metadata: {
      id: packId,
      name: packId,
      fileName: `${packId}.json`,
      importTime: FIXED_NOW.toISOString(),
    },
    cards: [{ id: cardId, name: cardId, batchId: packId, source: "custom" }],
    customFieldDefinitions: { professions: ["Warrior"] },
    variantTypes: { Food: { subclasses: ["Meal"], levelRange: [1, 3] } },
  }
}

function storageWithPacks(packs: Record<string, ReturnType<typeof legacyBatch>>) {
  return createInMemoryCardPackStorageAdapter({
    [CARD_PACK_STORAGE_KEYS.INDEX]: JSON.stringify(legacyIndex(Object.keys(packs))),
    ...Object.fromEntries(
      Object.entries(packs).map(([packId, data]) => [getCardPackStorageKey(packId), JSON.stringify(data)]),
    ),
  })
}

describe("installed legacy card pack compatibility", () => {
  it("loads old legacy batch content and keeps definitions visible", async () => {
    const storage = storageWithPacks({ pack_a: legacyBatch("pack_a") })
    const images = createInMemoryCardPackImageBackend()
    const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })

    const snapshot = await repository.loadSnapshot()

    expect(snapshot.packs.get("pack_a")).toMatchObject({
      packId: "pack_a",
      templateIds: ["warrior"],
    })
    expect(snapshot.integrity.ok).toBe(true)
    const stored = JSON.parse(storage.getItem(getCardPackStorageKey("pack_a")) ?? "null")
    expect(stored.cards).toEqual([{ id: "warrior", name: "warrior", batchId: "pack_a", source: "custom" }])
    expect(stored.customFieldDefinitions).toEqual({ professions: ["Warrior"] })
    expect(stored.variantTypes).toEqual({ Food: { subclasses: ["Meal"], levelRange: [1, 3] } })
  })

  it("can disable, enable, and remove an old legacy pack", async () => {
    const storage = storageWithPacks({ pack_a: legacyBatch("pack_a") })
    const images = createInMemoryCardPackImageBackend()
    const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })

    await expect(repository.setPackDisabled("pack_a", true)).resolves.toMatchObject({ ok: true })
    expect((await repository.loadSnapshot()).packs.get("pack_a")?.disabled).toBe(true)
    await expect(repository.setPackDisabled("pack_a", false)).resolves.toMatchObject({ ok: true })
    expect((await repository.loadSnapshot()).packs.get("pack_a")?.disabled).toBe(false)
    await expect(repository.removePack("pack_a")).resolves.toMatchObject({ ok: true })
    expect((await repository.loadSnapshot()).packs.has("pack_a")).toBe(false)
  })

  it("migrates a legacy global image when exactly one installed pack owns the template id", async () => {
    const storage = storageWithPacks({ pack_a: legacyBatch("pack_a", "warrior") })
    const images = createInMemoryCardPackImageBackend()
    await images.putLegacyGlobalImage("warrior", blob("legacy"))
    const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })

    const snapshot = await repository.loadSnapshot()

    expect(snapshot.integrity.repaired).toBe(true)
    expect(await images.getImage("warrior", "pack_a")).not.toBeNull()
    expect(await images.getImage("warrior")).toBeNull()
  })

  it("keeps ambiguous legacy global images as fallback and reports migration issue", async () => {
    const storage = storageWithPacks({
      pack_a: legacyBatch("pack_a", "warrior"),
      pack_b: legacyBatch("pack_b", "warrior"),
    })
    const images = createInMemoryCardPackImageBackend()
    await images.putLegacyGlobalImage("warrior", blob("legacy"))
    const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })

    const snapshot = await repository.loadSnapshot()

    expect(snapshot.integrity.issues).toContainEqual(expect.objectContaining({ code: "TEMPLATE_ID_CONFLICT" }))
    expect(snapshot.integrity.issues).toContainEqual(expect.objectContaining({ code: "IMAGE_MIGRATION_AMBIGUOUS" }))
    expect(await images.listPackImages("pack_a")).toEqual([])
    expect(await images.listPackImages("pack_b")).toEqual([])
    expect(await images.getImage("warrior")).not.toBeNull()
  })

  it("prefers pack-scoped image over legacy global image", async () => {
    const storage = storageWithPacks({ pack_a: legacyBatch("pack_a", "warrior") })
    const images = createInMemoryCardPackImageBackend()
    await images.putLegacyGlobalImage("warrior", blob("legacy"))
    await images.writePackImages("pack_a", [
      { templateId: "warrior", path: "images/warrior.png", readBlob: async () => blob("scoped") },
    ])

    const image = await images.getImage("warrior", "pack_a")

    expect(await image?.blob.text()).toBe("scoped")
  })
})
