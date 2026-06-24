import { describe, expect, it } from "vitest"
import { CardSource, CardType } from "@/card/card-types"
import type { BatchData, CustomCardIndex } from "@/card/stores/store-types"
import { CARD_BUILTIN_SOURCE_ID } from "../source-types"
import { loadCustomCardRuntimeSourcesFromSnapshot } from "../custom-source-adapter"

function indexWithCustomBatch(): CustomCardIndex {
  return {
    batches: {
      custom: {
        id: "custom",
        name: "custom",
        fileName: "custom.json",
        importTime: "2026-06-23T00:00:00.000Z",
        cardCount: 1,
        cardTypes: [CardType.Domain],
        size: 1,
        disabled: false,
      },
    },
    totalCards: 1,
    totalBatches: 1,
    lastUpdate: "2026-06-23T00:00:00.000Z",
  }
}

describe("loadCustomCardRuntimeSourcesFromSnapshot", () => {
  it("ignores legacy built-in batch entries", () => {
    const index: CustomCardIndex = {
      batches: {
        [CARD_BUILTIN_SOURCE_ID]: {
          id: CARD_BUILTIN_SOURCE_ID,
          name: "builtin",
          fileName: "builtin",
          importTime: "2026-06-23T00:00:00.000Z",
          cardCount: 1,
          cardTypes: [CardType.Domain],
          size: 1,
          isSystemBatch: true,
        },
        custom: {
          id: "custom",
          name: "custom",
          fileName: "custom.json",
          importTime: "2026-06-23T00:00:00.000Z",
          cardCount: 1,
          cardTypes: [CardType.Domain],
          size: 1,
          disabled: false,
        },
      },
      totalCards: 2,
      totalBatches: 2,
      lastUpdate: "2026-06-23T00:00:00.000Z",
    }
    const batches = new Map<string, BatchData>([
      [
        "custom",
        {
          metadata: { id: "custom", name: "custom", fileName: "custom.json", importTime: "2026-06-23T00:00:00.000Z" },
          cards: [{ id: "custom-card", name: "Custom", type: CardType.Domain, source: CardSource.CUSTOM, batchId: "custom" } as any],
        },
      ],
    ])

    expect(loadCustomCardRuntimeSourcesFromSnapshot({ index, batches }).map((source) => source.sourceId)).toEqual([
      "custom",
    ])
  })

  it("preserves stored card automation without compiling or repairing it", () => {
    const automation = {
      format: "daggerheart.card-automation.ir.v1",
      revision: "test",
      abilities: [],
    }
    const batches = new Map<string, BatchData>([
      [
        "custom",
        {
          metadata: { id: "custom", name: "custom", fileName: "custom.json", importTime: "2026-06-23T00:00:00.000Z" },
          cards: [
            {
              id: "custom-card",
              name: "Custom",
              type: CardType.Domain,
              source: CardSource.CUSTOM,
              batchId: "custom",
              automation,
            } as any,
          ],
        },
      ],
    ])

    const [source] = loadCustomCardRuntimeSourcesFromSnapshot({ index: indexWithCustomBatch(), batches })

    expect(source.cards[0].automation).toBe(automation)
  })
})
