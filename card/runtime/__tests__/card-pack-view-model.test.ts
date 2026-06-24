import { describe, expect, it } from "vitest"
import { CardType, type BatchInfo } from "@/card/stores/store-types"
import { CARD_BUILTIN_SOURCE_ID } from "../source-types"
import { toCardRuntimeSourceListItem } from "../card-pack-view-model"

function batch(overrides: Partial<BatchInfo> = {}): BatchInfo {
  return {
    id: "pack_custom",
    name: "Custom Pack",
    fileName: "custom.json",
    importTime: "2026-06-23T00:00:00.000Z",
    author: "Tester",
    version: "1.0.0",
    cardCount: 2,
    cardTypes: [CardType.Profession],
    size: 100,
    disabled: false,
    cardIds: ["a", "b"],
    ...overrides,
  }
}

describe("toCardRuntimeSourceListItem", () => {
  it("projects built-in source capabilities without exposing storage flags", () => {
    expect(
      toCardRuntimeSourceListItem(
        batch({
          id: CARD_BUILTIN_SOURCE_ID,
          name: "系统内置卡牌",
          fileName: "builtin-base.json",
          importTime: "builtin",
          author: undefined,
          version: undefined,
          isSystemBatch: true,
          disabled: false,
        }),
      ),
    ).toEqual({
      sourceId: CARD_BUILTIN_SOURCE_ID,
      name: "系统内置卡牌",
      author: "",
      version: "",
      fileName: "builtin-base.json",
      importTime: "builtin",
      cardCount: 2,
      cardTypes: [CardType.Profession],
      disabled: false,
      sourceLabel: "系统内置",
      canDisable: true,
      canRemove: false,
      canViewCards: true,
    })
  })

  it("projects disabled custom source capabilities", () => {
    expect(toCardRuntimeSourceListItem(batch({ disabled: true }))).toMatchObject({
      sourceId: "pack_custom",
      sourceLabel: "导入文件：custom.json",
      disabled: true,
      canDisable: true,
      canRemove: true,
      canViewCards: false,
    })
  })
})
