import { beforeEach, describe, expect, it, vi } from "vitest"
import { CardType } from "@/card/card-types"
import { createCardObjectSource } from "@/card/import/source"
import { createStoreActions } from "@/card/stores/store-actions"
import { BUILTIN_BATCH_ID, CardSource, type UnifiedCardState } from "@/card/stores/store-types"
import { createCardPackApplicationService } from "../application-service"
import { createInMemoryCardPackImageBackend } from "../image-backend"
import { createBrowserCardPackStorageAdapter } from "../local-storage-adapter"
import { createLocalStorageCardPackRepository } from "../local-storage-repository"
import { createZustandCardRuntimeRefreshAdapter } from "../runtime-refresh-adapter"

const fixedNow = new Date("2026-06-19T10:00:00.000Z")

function validPack(id = "warrior") {
  return {
    format: "daggerheart.card-pack.v1",
    name: "Runtime Pack",
    version: "1.0.0",
    author: "Tester",
    definitions: { classes: ["Warrior"], domains: ["Blade", "Bone"] },
    classes: [
      {
        id,
        name: "Warrior",
        summary: "A runtime test class.",
        domain1: "Blade",
        domain2: "Bone",
        startingHitPoints: 6,
        startingEvasion: 10,
        startingItems: "",
        hopeFeature: "",
        classFeature: "",
      },
    ],
  }
}

function createRuntimeHarness() {
  let state: UnifiedCardState & ReturnType<typeof createStoreActions>

  const set = (partial: any) => {
    const next = typeof partial === "function" ? partial(state) : partial
    state = { ...state, ...next }
  }
  const get = () => state
  const builtinCard = {
    id: "builtin-card",
    name: "Builtin Card",
    type: CardType.Profession,
    class: "Warrior",
    level: 1,
    description: "builtin",
    source: CardSource.BUILTIN,
    batchId: BUILTIN_BATCH_ID,
    cardSelectDisplay: {},
    standarized: true,
  }

  state = {
    cards: new Map([[builtinCard.id, builtinCard as any]]),
    batches: new Map([
      [
        BUILTIN_BATCH_ID,
        {
          id: BUILTIN_BATCH_ID,
          name: "System Builtin Cards",
          fileName: "builtin-base.json",
          importTime: fixedNow.toISOString(),
          cardCount: 1,
          cardTypes: [CardType.Profession],
          size: 100,
          isSystemBatch: true,
          disabled: false,
          cardIds: [builtinCard.id],
        },
      ],
    ]),
    cardsByType: new Map([[CardType.Profession, [builtinCard.id]]]),
    index: {
      batches: {
        [BUILTIN_BATCH_ID]: {
          id: BUILTIN_BATCH_ID,
          name: "System Builtin Cards",
          fileName: "builtin-base.json",
          importTime: fixedNow.toISOString(),
          version: "1.0.0",
          cardCount: 1,
          cardTypes: [CardType.Profession],
          size: 100,
          isSystemBatch: true,
          disabled: false,
        },
      },
      totalCards: 1,
      totalBatches: 1,
      lastUpdate: fixedNow.toISOString(),
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
    imageService: {
      initialized: true,
      cache: new Map(),
      cacheOrder: [],
      loadingImages: new Set(),
      failedImages: new Set(),
      maxCacheSize: 100,
    },
  } as UnifiedCardState & ReturnType<typeof createStoreActions>

  Object.assign(state, createStoreActions(set, get))

  return {
    store: state,
    visibleIds: () => state.loadAllCards().map((card) => card.id),
    batch: (packId: string) => state.getAllBatches().find((batch) => batch.id === packId),
    classOptions: () => {
      state._recomputeAggregations()
      return state.aggregatedCustomFields?.professions ?? []
    },
  }
}

describe("card pack service runtime lifecycle integration", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it("updates custom pack runtime read models across import disable enable and remove", async () => {
    const runtime = createRuntimeHarness()
    const storage = createBrowserCardPackStorageAdapter(localStorage)
    const repository = createLocalStorageCardPackRepository({
      storage,
      images: createInMemoryCardPackImageBackend(),
      now: () => fixedNow,
    })
    const service = createCardPackApplicationService({
      repository,
      runtimeRefresh: createZustandCardRuntimeRefreshAdapter(runtime.store),
      builtinTemplateIds: new Set(),
      createPackId: () => "pack_runtime",
      now: () => fixedNow,
      random: () => 0.123,
    })

    const imported = await service.importFromSource(createCardObjectSource(validPack(), "runtime.json"), {
      mode: "commit",
    })
    expect(imported.success).toBe(true)
    expect(runtime.visibleIds()).toEqual(["builtin-card", "warrior"])
    expect(runtime.batch(BUILTIN_BATCH_ID)).toMatchObject({ disabled: false, cardCount: 1 })
    expect(runtime.batch("pack_runtime")).toMatchObject({ disabled: false, cardCount: 1 })
    expect(runtime.classOptions()).toEqual(["Warrior"])

    const disabled = await service.setPackDisabled("pack_runtime", true)
    expect(disabled.success).toBe(true)
    expect(runtime.visibleIds()).toEqual(["builtin-card"])
    expect(runtime.batch(BUILTIN_BATCH_ID)).toMatchObject({ disabled: false, cardCount: 1 })
    expect(runtime.batch("pack_runtime")).toMatchObject({ disabled: true })
    expect(runtime.classOptions()).toEqual([])

    const enabled = await service.setPackDisabled("pack_runtime", false)
    expect(enabled.success).toBe(true)
    expect(runtime.visibleIds()).toEqual(["builtin-card", "warrior"])
    expect(runtime.batch(BUILTIN_BATCH_ID)).toMatchObject({ disabled: false, cardCount: 1 })
    expect(runtime.batch("pack_runtime")).toMatchObject({ disabled: false })
    expect(runtime.classOptions()).toEqual(["Warrior"])

    const removed = await service.removePack("pack_runtime")
    expect(removed.success).toBe(true)
    expect(runtime.visibleIds()).toEqual(["builtin-card"])
    expect(runtime.batch(BUILTIN_BATCH_ID)).toMatchObject({ disabled: false, cardCount: 1 })
    expect(runtime.batch("pack_runtime")).toBeUndefined()
    expect(runtime.classOptions()).toEqual([])
  })
})
