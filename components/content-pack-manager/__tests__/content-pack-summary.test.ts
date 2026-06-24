import { describe, expect, it } from "vitest"
import { summarizeCardPacks } from "../content-pack-summary"
import type { CardPackListItem } from "../card-pack-tab"

function makeBatch(overrides: Partial<CardPackListItem>): CardPackListItem {
  return {
    sourceId: "batch",
    name: "测试卡牌包",
    author: "Tester",
    version: "1.0.0",
    fileName: "cards.json",
    importTime: "2026-06-16T00:00:00.000Z",
    cardCount: 0,
    cardTypes: [],
    disabled: false,
    sourceLabel: "本地导入",
    canDisable: true,
    canRemove: true,
    canViewCards: true,
    ...overrides,
  }
}

describe("content pack summary", () => {
  it("includes builtin and custom card batches in manager totals", () => {
    expect(
      summarizeCardPacks([
        makeBatch({
          sourceId: "SYSTEM_BUILTIN_CARDS",
          name: "系统内置卡牌包",
          cardCount: 321,
        }),
        makeBatch({ sourceId: "custom-1", cardCount: 7 }),
        makeBatch({ sourceId: "custom-2", cardCount: 5, disabled: true }),
      ]),
    ).toEqual({
      cardPackCount: 3,
      enabledCardPackCount: 2,
      installedCardCount: 333,
      enabledCardCount: 328,
    })
  })
})
