import { beforeEach, describe, expect, it } from "vitest"
import { CardSource } from "../../card-types"
import { STORAGE_KEYS } from "../store-types"
import { useUnifiedCardStore } from "../unified-card-store"

describe("card batch read model", () => {
  beforeEach(() => {
    localStorage.clear()
    useUnifiedCardStore.setState({
      batches: new Map(),
      cards: new Map(),
      aggregatedCustomFields: null,
      aggregatedVariantTypes: null,
      cacheValid: false,
      initialized: true,
    })
  })

  it("returns persisted batch author and version from getAllBatches", () => {
    useUnifiedCardStore.setState({
      batches: new Map([
        [
          "batch-1",
          {
            id: "batch-1",
            name: "测试卡牌包",
            fileName: "cards.json",
            importTime: "2026-06-06T00:00:00.000Z",
            author: "真实作者",
            version: "2.1.0",
            cardCount: 0,
            cardTypes: [],
            size: 0,
            isSystemBatch: false,
            disabled: false,
            cardIds: [],
          },
        ],
      ]),
    })

    expect(useUnifiedCardStore.getState().getAllBatches()[0]).toMatchObject({
      author: "真实作者",
      version: "2.1.0",
    })
  })

  it("counts only custom cards in custom card stats", () => {
    useUnifiedCardStore.setState({
      stats: null,
      cards: new Map([
        ["builtin-card", { id: "builtin-card", type: "profession", source: CardSource.BUILTIN } as any],
        ["custom-card", { id: "custom-card", type: "profession", source: CardSource.CUSTOM, batchId: "batch-1" } as any],
      ]),
    })

    expect(useUnifiedCardStore.getState().getStats()).toMatchObject({
      totalCards: 1,
      cardsByType: { profession: 1 },
      cardsByBatch: { "batch-1": 1 },
    })
  })

  it("exposes legacy stored custom fields and variant types through runtime aggregation", () => {
    const batchId = "legacy-pack"
    localStorage.setItem(
      STORAGE_KEYS.INDEX,
      JSON.stringify({
        batches: {
          [batchId]: {
            id: batchId,
            name: "Legacy Pack",
            fileName: "legacy.json",
            importTime: "2026-06-18T00:00:00.000Z",
            cardCount: 1,
            cardTypes: ["variant"],
            size: 100,
            isSystemBatch: false,
            disabled: false,
          },
        },
        totalCards: 1,
        totalBatches: 1,
        lastUpdate: "2026-06-18T00:00:00.000Z",
      }),
    )
    localStorage.setItem(
      `${STORAGE_KEYS.BATCH_PREFIX}${batchId}`,
      JSON.stringify({
        metadata: {
          id: batchId,
          name: "Legacy Pack",
          fileName: "legacy.json",
          importTime: "2026-06-18T00:00:00.000Z",
        },
        cards: [
          {
            standarized: true,
            id: "legacy-meal",
            name: "Legacy Meal",
            type: "variant",
            description: "",
            batchId,
            source: "custom",
            variantSpecial: {
              realType: "补给",
              subCategory: "餐食",
            },
          },
        ],
        customFieldDefinitions: {
          variants: ["补给"],
          domains: ["利刃"],
        },
        variantTypes: {
          补给: {
            description: "旧包中的补给类变体。",
            subclasses: ["餐食"],
            levelRange: [1, 3],
          },
        },
      }),
    )

    const store = useUnifiedCardStore.getState()
    store._loadCustomCardsFromStorage()

    expect(store.getAggregatedCustomFields()).toMatchObject({
      variants: ["补给"],
      domains: ["利刃"],
    })
    expect(store.getAggregatedVariantTypes()).toEqual({
      补给: {
        description: "旧包中的补给类变体。",
        subclasses: ["餐食"],
        levelRange: [1, 3],
      },
    })
  })
})
