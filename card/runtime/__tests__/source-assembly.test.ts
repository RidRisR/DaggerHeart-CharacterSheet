import { describe, expect, it } from "vitest"
import { CardSource, CardType, type ExtendedStandardCard } from "@/card/card-types"
import type { BatchInfo } from "@/card/stores/store-types"
import { CARD_BUILTIN_SOURCE_ID, type CardRuntimeSourceSnapshot } from "../source-types"
import { assembleCardRuntimeSources } from "../source-assembly"

function card(id: string, batchId: string, source: CardSource): ExtendedStandardCard {
  return { id, name: id, type: CardType.Domain, description: "", batchId, source } as ExtendedStandardCard
}

function batch(id: string, cardIds: string[]): BatchInfo {
  return {
    id,
    name: id,
    fileName: `${id}.json`,
    importTime: "2026-06-23T00:00:00.000Z",
    cardCount: cardIds.length,
    cardTypes: [CardType.Domain],
    size: 1,
    cardIds,
  }
}

describe("assembleCardRuntimeSources", () => {
  it("orders built-in before custom sources", () => {
    const custom: CardRuntimeSourceSnapshot = {
      sourceId: "custom-pack",
      kind: "custom",
      batch: batch("custom-pack", ["custom-card"]),
      cards: [card("custom-card", "custom-pack", CardSource.CUSTOM)],
    }
    const builtin: CardRuntimeSourceSnapshot = {
      sourceId: CARD_BUILTIN_SOURCE_ID,
      kind: "builtin",
      batch: batch(CARD_BUILTIN_SOURCE_ID, ["builtin-card"]),
      cards: [card("builtin-card", CARD_BUILTIN_SOURCE_ID, CardSource.BUILTIN)],
    }

    const assembled = assembleCardRuntimeSources([custom, builtin])

    expect(Array.from(assembled.batches.keys())).toEqual([CARD_BUILTIN_SOURCE_ID, "custom-pack"])
    expect(Array.from(assembled.cards.keys())).toEqual(["builtin-card", "custom-card"])
  })

  it("fails fast on duplicate card ids", () => {
    const first: CardRuntimeSourceSnapshot = {
      sourceId: "a",
      kind: "custom",
      batch: batch("a", ["duplicate"]),
      cards: [card("duplicate", "a", CardSource.CUSTOM)],
    }
    const second: CardRuntimeSourceSnapshot = {
      sourceId: "b",
      kind: "custom",
      batch: batch("b", ["duplicate"]),
      cards: [card("duplicate", "b", CardSource.CUSTOM)],
    }

    expect(() => assembleCardRuntimeSources([first, second])).toThrow(
      "Duplicate card id duplicate from source b batch b; already registered from source a batch a",
    )
  })
})
