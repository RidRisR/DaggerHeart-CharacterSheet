import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ExtendedStandardCard } from "@/card/card-types"
import { createImageServiceActions } from "@/card/stores/image-service/actions"
import { BUILTIN_BATCH_ID, CardSource, CardType, type BatchInfo, type UnifiedCardState } from "@/card/stores/store-types"
import { createStoreActions } from "@/card/stores/store-actions"
import { setCardSourceDisabled, SYSTEM_BUILTIN_CARDS_SOURCE_ID } from "@/lib/app-preferences"
import type { CardPackStorageSnapshot } from "../storage-types"
import { createZustandCardRuntimeRefreshAdapter } from "../runtime-refresh-adapter"

const images = new Map<string, { key: string; packId?: string; templateId?: string; blob: Blob; mimeType: string; size: number; createdAt: number }>()
const objectUrls = new Map<string, Blob>()
let objectUrlIndex = 0

vi.mock("@/card/stores/image-service/database", () => ({
  db: {
    images: {
      get: vi.fn(async (key: string) => images.get(key) ?? null),
    },
  },
  isIndexedDBAvailable: () => true,
}))

vi.mock("@/card/stores/unified-card-store", () => ({
  useUnifiedCardStore: {
    getState: vi.fn(),
  },
}))

function makeSnapshot(): CardPackStorageSnapshot {
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
      removedOrphanImagePackIds: [],
    },
  }
}

function baseImageServiceState() {
  return {
    initialized: true,
    cache: new Map<string, string>(),
    cacheOrder: [],
    loadingImages: new Set<string>(),
    failedImages: new Set<string>(),
    maxCacheSize: 100,
  }
}

function createImageActionsForTest() {
  let state: Pick<UnifiedCardState, "imageService"> = {
    imageService: baseImageServiceState(),
  }
  const set = (partial: any) => {
    const next = typeof partial === "function" ? partial(state) : partial
    state = { ...state, ...next }
  }
  const get = () => state
  const actions = createImageServiceActions(set, get)

  return {
    ...actions,
    get imageService() {
      return state.imageService
    },
    async putTestImage(input: { key: string; packId?: string; templateId?: string; text: string }) {
      const blob = new Blob([input.text], { type: "text/plain" })
      images.set(input.key, {
        key: input.key,
        packId: input.packId,
        templateId: input.templateId,
        blob,
        mimeType: blob.type,
        size: blob.size,
        createdAt: Date.now(),
      })
    },
  }
}

function makeCard(id: string, batchId?: string, source: CardSource = CardSource.CUSTOM): ExtendedStandardCard {
  return {
    id,
    name: id,
    type: CardType.Profession,
    class: "Warrior",
    level: 1,
    description: "test",
    source,
    batchId,
  } as ExtendedStandardCard
}

function makeBatch(id: string, overrides: Partial<BatchInfo> = {}): BatchInfo {
  return {
    id,
    name: id,
    fileName: `${id}.json`,
    importTime: "2026-06-16T00:00:00.000Z",
    cardCount: 1,
    cardTypes: [CardType.Profession],
    size: 100,
    cardIds: ["warrior"],
    ...overrides,
  }
}

function createStoreWithStaleCustomCard(staleCardId: string) {
  const builtinCard = makeCard("builtin-card", BUILTIN_BATCH_ID, CardSource.BUILTIN)
  const staleCard = makeCard(staleCardId, "removed-batch")
  const loadedCard = makeCard("warrior", "batch_1")
  let state: UnifiedCardState & Partial<ReturnType<typeof createStoreActions>>

  const set = (partial: any) => {
    const next = typeof partial === "function" ? partial(state) : partial
    state = { ...state, ...next }
  }
  const get = () => state as UnifiedCardState & ReturnType<typeof createStoreActions>

  state = {
    cards: new Map([
      [builtinCard.id, builtinCard],
      [staleCard.id, staleCard],
    ]),
    batches: new Map([
      [BUILTIN_BATCH_ID, makeBatch(BUILTIN_BATCH_ID, { isSystemBatch: true, cardIds: [builtinCard.id] })],
      ["removed-batch", makeBatch("removed-batch", { cardIds: [staleCard.id], imageCardIds: [staleCard.id], imageCount: 1 })],
    ]),
    cardsByType: new Map([[CardType.Profession, [builtinCard.id, staleCard.id]]]),
    index: {
      batches: {
        "batch_1": makeBatch("batch_1", { cardIds: [loadedCard.id] }),
        "removed-batch": makeBatch("removed-batch", { cardIds: [staleCard.id] }),
      },
      totalCards: 2,
      totalBatches: 2,
      lastUpdate: "2026-06-16T00:00:00.000Z",
    },
    aggregatedCustomFields: { stale: ["field"] },
    aggregatedVariantTypes: { stale: { description: "stale" } },
    subclassCardIndex: { stale: { stale: [staleCard.id] } },
    levelCardIndex: { stale: { "1": [staleCard.id] } },
    batchKeywordIndex: { "removed-batch": { profession: ["Warrior"] } },
    batchLevelIndex: { "removed-batch": { profession: ["1"] } },
    cacheValid: true,
    initialized: true,
    loading: false,
    error: null,
    config: { maxBatches: 50, maxStorageSize: 5 * 1024 * 1024, autoCleanup: true, compressionEnabled: false },
    stats: null,
    imageService: baseImageServiceState(),
  }

  Object.assign(state, createStoreActions(set, get))
  state._loadCustomCardsFromStorage = vi.fn(() => {
    set({
      cards: new Map([...state.cards, [loadedCard.id, loadedCard]]),
      batches: new Map([...state.batches, ["batch_1", makeBatch("batch_1", { cardIds: [loadedCard.id] })]]),
      index: {
        batches: {
          "batch_1": makeBatch("batch_1", { cardIds: [loadedCard.id] }),
        },
        totalCards: 1,
        totalBatches: 1,
        lastUpdate: "2026-06-16T00:00:00.000Z",
      },
      cacheValid: false,
    })
  })

  return {
    reloadCustomRuntimeFromStorage: () => get().reloadCustomRuntimeFromStorage(),
    get cards() {
      return Array.from(state.cards.values())
    },
    get batches() {
      return state.batches
    },
    get aggregatedCustomFields() {
      return state.aggregatedCustomFields
    },
    get cardsByType() {
      return state.cardsByType
    },
    get subclassCardIndex() {
      return state.subclassCardIndex
    },
    get levelCardIndex() {
      return state.levelCardIndex
    },
    get batchKeywordIndex() {
      return state.batchKeywordIndex
    },
    get batchLevelIndex() {
      return state.batchLevelIndex
    },
    get stats() {
      return state.stats
    },
  }
}

function createStoreWithBuiltinAndBrowserStorage(input: { builtinDisabledInMemory: boolean }) {
  const builtinCard = makeCard("builtin-card", BUILTIN_BATCH_ID, CardSource.BUILTIN)
  let state: UnifiedCardState & Partial<ReturnType<typeof createStoreActions>>

  const set = (partial: any) => {
    const next = typeof partial === "function" ? partial(state) : partial
    state = { ...state, ...next }
  }
  const get = () => state as UnifiedCardState & ReturnType<typeof createStoreActions>

  state = {
    cards: new Map([[builtinCard.id, builtinCard]]),
    batches: new Map([
      [
        BUILTIN_BATCH_ID,
        makeBatch(BUILTIN_BATCH_ID, {
          isSystemBatch: true,
          disabled: input.builtinDisabledInMemory,
          cardIds: [builtinCard.id],
        }),
      ],
    ]),
    cardsByType: new Map([[CardType.Profession, [builtinCard.id]]]),
    index: {
      batches: {
        [BUILTIN_BATCH_ID]: makeBatch(BUILTIN_BATCH_ID, {
          isSystemBatch: true,
          disabled: input.builtinDisabledInMemory,
          cardIds: [builtinCard.id],
        }),
      },
      totalCards: 1,
      totalBatches: 1,
      lastUpdate: "2026-06-19T00:00:00.000Z",
    },
    aggregatedCustomFields: null,
    aggregatedVariantTypes: null,
    subclassCardIndex: null,
    levelCardIndex: null,
    batchKeywordIndex: null,
    batchLevelIndex: null,
    cacheValid: false,
    initialized: true,
    loading: false,
    error: null,
    config: { maxBatches: 50, maxStorageSize: 5 * 1024 * 1024, autoCleanup: true, compressionEnabled: false },
    stats: null,
    imageService: baseImageServiceState(),
  }

  Object.assign(state, createStoreActions(set, get))

  return {
    reloadCustomRuntimeFromStorage: () => get().reloadCustomRuntimeFromStorage(),
    _syncToLocalStorage: () => get()._syncToLocalStorage(),
    loadAllCards: () => get().loadAllCards(),
    getCardById: (id: string) => get().getCardById(id),
    rebuildSubclassIndex: () => get()._rebuildSubclassIndex(),
    get batch() {
      return state.batches.get(BUILTIN_BATCH_ID)
    },
    get batches() {
      return state.batches
    },
    get indexBatch() {
      return state.index.batches[BUILTIN_BATCH_ID]
    },
    get subclassCardIndex() {
      return state.subclassCardIndex
    },
  }
}

async function readObjectUrlText(url: string | null) {
  expect(url).toEqual(expect.any(String))
  const blob = objectUrls.get(url as string)
  expect(blob).toBeDefined()
  return blob?.text()
}

describe("card runtime refresh adapter", () => {
  beforeEach(() => {
    localStorage.clear()
    images.clear()
    objectUrls.clear()
    objectUrlIndex = 0
    vi.restoreAllMocks()
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
      const url = `blob:test/${++objectUrlIndex}`
      objectUrls.set(url, blob as Blob)
      return url
    })
    vi.spyOn(URL, "revokeObjectURL").mockImplementation((url) => {
      objectUrls.delete(url)
    })
  })

  it("calls store reload and rebuild helpers in order", async () => {
    const calls: string[] = []
    const adapter = createZustandCardRuntimeRefreshAdapter({
      reloadCustomRuntimeFromStorage: async () => {
        calls.push("reloadFullRuntime")
      },
    })

    const result = await adapter.refresh(makeSnapshot())

    expect(result.ok).toBe(true)
    expect(calls).toEqual(["reloadFullRuntime"])
  })

  it("returns a structured failure when reload fails", async () => {
    const adapter = createZustandCardRuntimeRefreshAdapter({
      reloadCustomRuntimeFromStorage: async () => {
        throw new Error("reload failed")
      },
    })

    const result = await adapter.refresh(makeSnapshot())

    expect(result).toMatchObject({
      ok: false,
      diagnostic: { code: "RUNTIME_REFRESH_FAILED" },
    })
  })

  it("clears stale custom runtime state before reloading from storage", async () => {
    const store = createStoreWithStaleCustomCard("removed-card")
    localStorage.setItem(
      "daggerheart_custom_cards_index",
      JSON.stringify({
        batches: {
          batch_1: makeBatch("batch_1", { cardIds: ["warrior"] }),
        },
        totalCards: 1,
        totalBatches: 1,
        lastUpdate: "2026-06-16T00:00:00.000Z",
      }),
    )
    localStorage.setItem(
      "daggerheart_custom_cards_batch_batch_1",
      JSON.stringify({
        metadata: {
          id: "batch_1",
          name: "batch_1",
          fileName: "batch_1.json",
          importTime: "2026-06-16T00:00:00.000Z",
        },
        cards: [makeCard("warrior", "batch_1")],
      }),
    )

    await store.reloadCustomRuntimeFromStorage()

    expect(store.cards.some((card) => card.id === "removed-card")).toBe(false)
    expect(store.batches.has(BUILTIN_BATCH_ID)).toBe(true)
    expect(store.aggregatedCustomFields).toEqual(expect.any(Object))
    expect(store.cardsByType).toEqual(expect.any(Map))
    expect(store.subclassCardIndex).toEqual(expect.any(Object))
    expect(store.levelCardIndex).toEqual(expect.any(Object))
    expect(store.batchKeywordIndex).toEqual(expect.any(Object))
    expect(store.batchLevelIndex).toEqual(expect.any(Object))
    expect(store.stats).toEqual(expect.any(Object))
  })

  it("keeps previous runtime when full runtime refresh fails", async () => {
    const store = createStoreWithStaleCustomCard("stale-card")
    const before = store.cards.map((card) => card.id)
    localStorage.setItem("daggerheart_custom_cards_index", "{")

    await expect(store.reloadCustomRuntimeFromStorage()).rejects.toThrow()

    expect(store.cards.map((card) => card.id)).toEqual(before)
    expect(store.cards.map((card) => card.id)).toContain("builtin-card")
    expect(store.cards.map((card) => card.id)).toContain("stale-card")
  })

  it("keeps an enabled in-memory built-in batch when custom storage is empty", async () => {
    const store = createStoreWithBuiltinAndBrowserStorage({ builtinDisabledInMemory: false })

    await store.reloadCustomRuntimeFromStorage()

    expect(store.batches.get(BUILTIN_BATCH_ID)?.disabled).toBe(false)
    expect(Array.from(store.batches.keys())).toContain(BUILTIN_BATCH_ID)
  })

  it("syncs builtin disabled state from app preferences during runtime refresh", async () => {
    setCardSourceDisabled(SYSTEM_BUILTIN_CARDS_SOURCE_ID, true)

    const store = createStoreWithBuiltinAndBrowserStorage({ builtinDisabledInMemory: false })

    await store.reloadCustomRuntimeFromStorage()
    store.rebuildSubclassIndex()

    expect(store.batch?.disabled).toBe(true)
    expect(store.indexBatch).toBeUndefined()
    expect(store.loadAllCards()).toEqual([])
    expect(store.getCardById("Bard")).toBeNull()
    expect(store.subclassCardIndex).toEqual({})
  })

  it("syncs builtin enabled state from app preferences during runtime refresh", async () => {
    setCardSourceDisabled(SYSTEM_BUILTIN_CARDS_SOURCE_ID, false)

    const store = createStoreWithBuiltinAndBrowserStorage({ builtinDisabledInMemory: true })

    await store.reloadCustomRuntimeFromStorage()
    store.rebuildSubclassIndex()

    expect(store.batch?.disabled).toBe(false)
    expect(store.indexBatch).toBeUndefined()
    expect(store.loadAllCards().map((card) => card.id)).toContain("Bard")
    expect(store.getCardById("Bard")?.id).toBe("Bard")
  })

  it("syncs only custom card storage and never writes the built-in batch payload", () => {
    const store = createStoreWithBuiltinAndBrowserStorage({ builtinDisabledInMemory: false })

    ;(store as any)._syncToLocalStorage()

    expect(localStorage.getItem(`daggerheart_custom_cards_batch_${BUILTIN_BATCH_ID}`)).toBeNull()
    const index = JSON.parse(localStorage.getItem("daggerheart_custom_cards_index") ?? "{}")
    expect(index.batches).not.toHaveProperty(BUILTIN_BATCH_ID)
  })

  it("loads pack scoped image before legacy global fallback", async () => {
    const imageActions = createImageActionsForTest()
    await imageActions.putTestImage({ key: "batch_1/warrior", packId: "batch_1", templateId: "warrior", text: "pack" })
    await imageActions.putTestImage({ key: "warrior", templateId: "warrior", text: "legacy" })

    const url = await imageActions.getImageUrl("warrior", "batch_1")

    expect(await readObjectUrlText(url)).toBe("pack")
  })

  it("uses separate image cache keys for same template in different packs", async () => {
    const imageActions = createImageActionsForTest()
    await imageActions.putTestImage({ key: "batch_1/warrior", packId: "batch_1", templateId: "warrior", text: "one" })
    await imageActions.putTestImage({ key: "batch_2/warrior", packId: "batch_2", templateId: "warrior", text: "two" })

    const first = await imageActions.getImageUrl("warrior", "batch_1")
    const second = await imageActions.getImageUrl("warrior", "batch_2")

    expect(first).not.toBe(second)
    expect(imageActions.imageService.cache.has("batch_1/warrior")).toBe(true)
    expect(imageActions.imageService.cache.has("batch_2/warrior")).toBe(true)
  })

  it("passes batch id through rendered card image lookup", async () => {
    const store = createImageActionsForTest()
    await store.putTestImage({ key: "batch_1/warrior", packId: "batch_1", templateId: "warrior", text: "pack" })
    const { useUnifiedCardStore } = await import("@/card/stores/unified-card-store")
    vi.mocked(useUnifiedCardStore.getState).mockReturnValue(store as any)
    const { getCardImageUrlAsync } = await import("@/lib/utils")

    const url = await getCardImageUrlAsync({
      id: "warrior",
      name: "Warrior",
      type: "profession",
      batchId: "batch_1",
      hasLocalImage: true,
    } as ExtendedStandardCard)

    expect(await readObjectUrlText(url)).toBe("pack")
  })
})
