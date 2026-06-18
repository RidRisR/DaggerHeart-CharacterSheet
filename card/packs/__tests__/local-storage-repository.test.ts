import { describe, expect, it } from "vitest"
import type { CardPackDryRunCard, CardPackDryRunValidationModel } from "@/card/import/types"
import { createInMemoryCardPackImageBackend, type CardPackImageBackend } from "../image-backend"
import {
  CARD_PACK_STORAGE_KEYS,
  createInMemoryCardPackStorageAdapter,
  getCardPackStorageKey,
} from "../local-storage-adapter"
import { createLocalStorageCardPackRepository } from "../local-storage-repository"
import type { CardImportFinalCommitPlan } from "../storage-types"

const FIXED_NOW = new Date("2026-06-16T10:20:30.000Z")

function makeClassCard(overrides: Partial<Extract<CardPackDryRunCard, { group: "classes" }>> = {}) {
  return {
    group: "classes",
    id: "warrior",
    name: "Warrior",
    summary: "Stalwart fighter",
    domain1: "Blade",
    domain2: "Bone",
    startingHitPoints: 6,
    startingEvasion: 10,
    startingItems: "Sword and shield",
    hopeFeature: "Stand firm",
    classFeature: "Strike true",
    ...overrides,
  } satisfies Extract<CardPackDryRunCard, { group: "classes" }>
}

function makeModel(overrides: Partial<CardPackDryRunValidationModel> = {}): CardPackDryRunValidationModel {
  return {
    metadata: {
      format: "daggerheart.card-pack.v1",
      name: "Shadow Cards",
      version: "1.0.0",
      author: "Tester",
      description: "Cards from the shadows",
    },
    definitions: {
      classes: ["Warrior"],
      ancestries: [],
      communities: [],
      domains: ["Blade", "Bone"],
      variants: [],
      variantTypes: {},
    },
    declaredDefinitions: ["classes", "domains"],
    cards: [makeClassCard()],
    imageAssets: [],
    ...overrides,
  }
}

function makeFinalPlan(overrides: Partial<CardImportFinalCommitPlan> = {}): CardImportFinalCommitPlan {
  const templateIds = overrides.templateIds ?? ["warrior"]

  return {
    packId: "batch_1",
    packData: makeModel({
      cards: templateIds.map((id) => makeClassCard({ id, name: id })),
    }),
    templateIds,
    source: {
      originKind: "file",
      fileName: "shadow.json",
      label: "Shadow Cards",
      sizeBytes: 1234,
    },
    importedAt: FIXED_NOW.toISOString(),
    disabled: false,
    assets: {
      cardImages: [
        {
          templateId: "warrior",
          path: "images/warrior.png",
          mimeType: "image/png",
          sizeBytes: 1,
          readBlob: async () => new Blob(["x"], { type: "image/png" }),
        },
      ],
    },
    ...overrides,
  }
}

function makeLegacyBatchStorage(packId: string) {
  return {
    metadata: {
      id: packId,
      name: "Shadow Cards",
      fileName: "shadow.json",
      importTime: FIXED_NOW.toISOString(),
      version: "1.0.0",
      author: "Tester",
    },
    cards: [
      {
        standarized: true,
        id: "warrior",
        name: "Warrior",
        type: "profession",
        description: "Strike true",
        batchId: packId,
        source: "custom",
      },
    ],
    customFieldDefinitions: {
      professions: ["Warrior"],
      ancestries: [],
      communities: [],
      domains: ["Blade", "Bone"],
      variants: [],
    },
    variantTypes: {},
  }
}

function makeIndexWithEntry(
  packId: string,
  options: { templateIds?: string[]; disabled?: boolean } = {},
) {
  return {
    batches: {
      [packId]: {
        id: packId,
        name: "Shadow Cards",
        fileName: "shadow.json",
        importTime: FIXED_NOW.toISOString(),
        version: "1.0.0",
        author: "Tester",
        cardCount: options.templateIds?.length ?? 1,
        cardTypes: ["profession"],
        size: 1234,
        isSystemBatch: false,
        disabled: options.disabled ?? false,
      },
    },
    totalCards: options.templateIds?.length ?? 1,
    totalBatches: 1,
    lastUpdate: FIXED_NOW.toISOString(),
  }
}

function createFailingIndexWriteAdapter(input: { failContentDeletesFor?: Set<string> } = {}) {
  const adapter = createInMemoryCardPackStorageAdapter({}, input)
  const baseSetItem = adapter.setItem
  let indexWrites = 0
  adapter.setItem = (key, value) => {
    if (key === CARD_PACK_STORAGE_KEYS.INDEX) {
      indexWrites += 1
      if (indexWrites === 1) {
        throw new Error("index write failed")
      }
    }

    baseSetItem(key, value)
  }
  return adapter
}

function withImageOperations(images: CardPackImageBackend, operations: string[]): CardPackImageBackend {
  return {
    ...images,
    async writePackImages(packId, assets) {
      operations.push(`images:${packId}`)
      return images.writePackImages(packId, assets)
    },
  }
}

describe("local storage card pack repository", () => {
  it("commitImport writes content, images, then index", async () => {
    const operations: string[] = []
    const storage = createInMemoryCardPackStorageAdapter({}, { operations })
    const images = withImageOperations(createInMemoryCardPackImageBackend(), operations)
    const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })

    const result = await repository.commitImport(makeFinalPlan())

    expect(result.ok).toBe(true)
    expect(operations).toEqual(["content:batch_1", "images:batch_1", "index"])
    expect(await images.listPackImages("batch_1")).toHaveLength(1)
  })

  it("returns failure without artifacts when content write fails", async () => {
    const storage = createInMemoryCardPackStorageAdapter({}, { failContentWritesFor: new Set(["batch_1"]) })
    const images = createInMemoryCardPackImageBackend()
    const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })

    const result = await repository.commitImport(makeFinalPlan())

    expect(result.ok).toBe(false)
    expect(!result.ok && result.error.code).toBe("CONTENT_WRITE_FAILED")
    expect(storage.getItem(getCardPackStorageKey("batch_1"))).toBeNull()
    expect(await images.listPackImages("batch_1")).toEqual([])
  })

  it("rolls back content when image write fails", async () => {
    const storage = createInMemoryCardPackStorageAdapter()
    const images = createInMemoryCardPackImageBackend({ failWritesForTemplateIds: new Set(["warrior"]) })
    const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })

    const result = await repository.commitImport(makeFinalPlan())

    expect(result.ok).toBe(false)
    expect(!result.ok && result.error.code).toBe("IMAGE_WRITE_FAILED")
    expect(storage.getItem(getCardPackStorageKey("batch_1"))).toBeNull()
    expect(await images.listPackImages("batch_1")).toEqual([])
  })

  it("rolls back content and written images when index write fails", async () => {
    const storage = createFailingIndexWriteAdapter()
    const images = createInMemoryCardPackImageBackend()
    const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })

    const result = await repository.commitImport(makeFinalPlan())

    expect(result.ok).toBe(false)
    expect(storage.getItem(getCardPackStorageKey("batch_1"))).toBeNull()
    expect(await images.listPackImages("batch_1")).toEqual([])
  })

  it("reports rollback failure when failed index write leaves content or images behind", async () => {
    const storage = createFailingIndexWriteAdapter({ failContentDeletesFor: new Set(["batch_1"]) })
    const images = createInMemoryCardPackImageBackend()
    const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })

    const result = await repository.commitImport(makeFinalPlan())

    expect(result.ok).toBe(false)
    expect(!result.ok && result.error.code).toBe("ROLLBACK_FAILED")
  })

  it("rejects duplicate pack id before writing content", async () => {
    const storage = createInMemoryCardPackStorageAdapter()
    const images = createInMemoryCardPackImageBackend()
    const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })
    await repository.commitImport(makeFinalPlan({ packId: "batch_1", templateIds: ["warrior"] }))

    const result = await repository.commitImport(makeFinalPlan({ packId: "batch_1", templateIds: ["rogue"] }))

    expect(result.ok).toBe(false)
    expect(!result.ok && result.error.code).toBe("PACK_ID_CONFLICT")
  })

  it("rejects duplicate template ids before writing content", async () => {
    const storage = createInMemoryCardPackStorageAdapter()
    const images = createInMemoryCardPackImageBackend()
    const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })
    await repository.commitImport(makeFinalPlan({ packId: "batch_existing", templateIds: ["warrior"] }))

    const result = await repository.commitImport(makeFinalPlan({ packId: "batch_new", templateIds: ["warrior"] }))

    expect(result.ok).toBe(false)
    expect(!result.ok && result.error.code).toBe("TEMPLATE_ID_CONFLICT")
    expect(storage.getItem(getCardPackStorageKey("batch_new"))).toBeNull()
  })

  it("rejects duplicate template ids inside the incoming plan", async () => {
    const storage = createInMemoryCardPackStorageAdapter()
    const images = createInMemoryCardPackImageBackend()
    const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })

    const result = await repository.commitImport(makeFinalPlan({ templateIds: ["warrior", "warrior"] }))

    expect(result.ok).toBe(false)
    expect(!result.ok && result.error.code).toBe("TEMPLATE_ID_CONFLICT")
    expect(storage.getItem(getCardPackStorageKey("batch_1"))).toBeNull()
  })

  it("returns a post-index snapshot when removePack cleanup fails", async () => {
    const storage = createInMemoryCardPackStorageAdapter()
    const images = createInMemoryCardPackImageBackend({ failDeletesForPackIds: new Set(["batch_1"]) })
    const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })
    await repository.commitImport(makeFinalPlan({ packId: "batch_1" }))

    const result = await repository.removePack("batch_1")

    expect(result.ok).toBe(false)
    expect(!result.ok && result.error.code).toBe("IMAGE_DELETE_FAILED")
    expect(result.snapshot.packs.has("batch_1")).toBe(false)
    expect(storage.getItem(CARD_PACK_STORAGE_KEYS.INDEX)).not.toContain("batch_1")
  })

  it("ensureIntegrity removes content and images for broken index entries", async () => {
    const storage = createInMemoryCardPackStorageAdapter({
      [CARD_PACK_STORAGE_KEYS.INDEX]: JSON.stringify(makeIndexWithEntry("batch_missing")),
    })
    const images = createInMemoryCardPackImageBackend()
    await images.writePackImages("batch_missing", [
      { templateId: "warrior", path: "images/warrior.png", readBlob: async () => new Blob(["x"]) },
    ])
    const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })

    const report = await repository.ensureIntegrity()

    expect(report.repaired).toBe(true)
    expect(await images.listPackImages("batch_missing")).toEqual([])
  })

  it("ensureIntegrity removes orphan content and orphan pack images", async () => {
    const storage = createInMemoryCardPackStorageAdapter({
      [getCardPackStorageKey("batch_orphan")]: JSON.stringify(makeLegacyBatchStorage("batch_orphan")),
    })
    const images = createInMemoryCardPackImageBackend()
    await images.writePackImages("batch_orphan", [
      { templateId: "warrior", path: "images/warrior.png", readBlob: async () => new Blob(["x"]) },
    ])
    const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })

    const report = await repository.ensureIntegrity()

    expect(report.repaired).toBe(true)
    expect(storage.getItem(getCardPackStorageKey("batch_orphan"))).toBeNull()
    expect(await images.listPackImages("batch_orphan")).toEqual([])
  })

  it("retries interrupted legacy image migration when old and new image records both exist", async () => {
    const storage = createInMemoryCardPackStorageAdapter({
      [CARD_PACK_STORAGE_KEYS.INDEX]: JSON.stringify(makeIndexWithEntry("batch_1", { templateIds: ["warrior"] })),
      [getCardPackStorageKey("batch_1")]: JSON.stringify(makeLegacyBatchStorage("batch_1")),
    })
    const images = createInMemoryCardPackImageBackend()
    await images.putLegacyGlobalImage("warrior", new Blob(["legacy"]))
    const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })

    const report = await repository.ensureIntegrity()

    expect(report.repaired).toBe(true)
    expect(await images.getImage("warrior", "batch_1")).not.toBeNull()
    expect(await images.getImage("warrior")).toBeNull()
  })
})
