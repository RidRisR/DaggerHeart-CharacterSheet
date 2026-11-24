import { beforeEach, describe, expect, it } from "vitest"
import { CARD_BUILTIN_SOURCE_ID, HOPE_FEAR_SOURCE_ID } from "../../runtime/source-types"
import hopeFear from "@/data/cards/builtin-hope-fear.json"
import { removeCustomCardBatch, toggleBatchDisabled } from "../../index-unified"
import { toCardRuntimeSourceListItem } from "../../runtime/card-pack-view-model"
import { CardSource } from "../../card-types"
import { getVariantTypeNames } from "../../card-predefined-field"
import { getVariantLevelOptions } from "../../card-ui-config"
import { setBuiltinCardRuntimeSourceDisabled } from "../../runtime/source-disabled-state"
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

  it("exposes built-in beastforms and selection options across reload disable and enable", async () => {
    const store = useUnifiedCardStore.getState()
    setBuiltinCardRuntimeSourceDisabled(HOPE_FEAR_SOURCE_ID, true)
    for (const disabled of [false, true, false]) {
      expect(setBuiltinCardRuntimeSourceDisabled(CARD_BUILTIN_SOURCE_ID, disabled).ok).toBe(true)
      await store.reloadCustomRuntimeFromStorage()

      const beastforms = store.loadAllCards().filter((card) => card.variantSpecial?.realType === "野兽形态")
      expect(beastforms).toHaveLength(disabled ? 0 : 24)
      expect(getVariantTypeNames()).toEqual(disabled ? [] : ["野兽形态"])
      expect(getVariantLevelOptions("野兽形态").map((option) => option.value)).toEqual(
        disabled ? [] : ["1", "2", "3", "4"],
      )
      expect(store.getAggregatedCustomFields().professions ?? []).toEqual(
        disabled ? [] : expect.arrayContaining(["德鲁伊"]),
      )
    }
  })

  it("manages both built-in packs independently across refresh and custom storage sync", async () => {
    const store = useUnifiedCardStore.getState()
    await store.reloadCustomRuntimeFromStorage()
    const expansion = useUnifiedCardStore.getState().batches.get(HOPE_FEAR_SOURCE_ID)!
    expect(toCardRuntimeSourceListItem(expansion)).toMatchObject({ canDisable: true, canRemove: false, canViewCards: true })
    expect(await removeCustomCardBatch(expansion.id)).toBe(false)
    expect(store.removeBatch(expansion.id)).toBe(false)
    const expansionCard = hopeFear.classes[0].id

    await toggleBatchDisabled(expansion.id)
    await store.reloadCustomRuntimeFromStorage()
    expect(store.getCardById("Bard")).toBeTruthy()
    expect(store.getCardById(expansionCard)).toBeNull()
    expect(store.getAggregatedCustomFields().professions).not.toContain("刺客")
    await toggleBatchDisabled(CARD_BUILTIN_SOURCE_ID)
    await toggleBatchDisabled(expansion.id)
    expect(store.getCardById("Bard")).toBeNull()
    expect(store.getCardById(expansionCard)?.batchId).toBe(expansion.id)
    expect(store.getAggregatedCustomFields().professions).toContain("刺客")

    store._syncToLocalStorage()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.INDEX)!).batches).toEqual({})
    expect(localStorage.getItem(STORAGE_KEYS.BATCH_PREFIX + expansion.id)).toBeNull()
    expect(store.validateIntegrity().isValid).toBe(true)
  })

  it.each(["020d974b-6d59-54a2-8462-54ebb825501b", "希望与恐惧扩展-未知作者-prof-刺客", hopeFear.classes[0].id])("keeps imported expansion card %s until its custom pack is cleared", async (id) => {
    const batchId = "old-import"
    const metadata = { id: batchId, name: "Old import", fileName: "old.json", importTime: "2026-01-01" }
    const entry = { ...metadata, size: 0, cardCount: 1, cardTypes: ["profession"], disabled: true }
    const card = { id, name: "Edited Assassin", type: "profession", source: CardSource.CUSTOM, batchId, hasLocalImage: true }
    localStorage.setItem(STORAGE_KEYS.INDEX, JSON.stringify({ batches: { [batchId]: entry }, totalCards: 1, totalBatches: 1 }))
    localStorage.setItem(STORAGE_KEYS.BATCH_PREFIX + batchId, JSON.stringify({ metadata, cards: [card] }))

    const store = useUnifiedCardStore.getState()
    await store.reloadCustomRuntimeFromStorage()
    expect(store.getCardById(id)).toBeNull()
    expect(store.getCardById(hopeFear.classes[0].id)).toBeNull()
    expect(useUnifiedCardStore.getState().batches.get(HOPE_FEAR_SOURCE_ID)?.cardCount).toBe(72)
    await store.toggleBatchDisabled(batchId)
    expect(store.getCardById(id)).toMatchObject(card)
    expect(store.getCardById(hopeFear.classes[0].id)).toMatchObject(card)

    await store.clearAllCustomCards()
    expect(store.getCardById(id)).toMatchObject({ id: hopeFear.classes[0].id, batchId: HOPE_FEAR_SOURCE_ID, name: "刺客", hasLocalImage: false })
    expect(useUnifiedCardStore.getState().batches.get(HOPE_FEAR_SOURCE_ID)?.cardCount).toBe(73)
    expect(store.getCardById("Bard")).toBeTruthy()
    await toggleBatchDisabled(HOPE_FEAR_SOURCE_ID)
    expect(store.getCardById(id)).toBeNull()
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
    setBuiltinCardRuntimeSourceDisabled(HOPE_FEAR_SOURCE_ID, true)
    setBuiltinCardRuntimeSourceDisabled(CARD_BUILTIN_SOURCE_ID, true)
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
