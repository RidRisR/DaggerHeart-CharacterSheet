import { beforeEach, describe, expect, it } from "vitest"
import { CardSource } from "../../card-types"
import { useUnifiedCardStore } from "../unified-card-store"

describe("card batch read model", () => {
  beforeEach(() => {
    useUnifiedCardStore.setState({
      batches: new Map(),
      cards: new Map(),
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
})
