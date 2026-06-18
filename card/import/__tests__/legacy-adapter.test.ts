import { describe, expect, it } from "vitest"
import { adaptLegacyCardPack } from "@/card/import/legacy-adapter"

const legacyPack = {
  name: "旧卡包",
  version: "1.0.0",
  author: "作者",
  extraTopLevel: "drop top level",
  customFieldDefinitions: {
    professions: ["战士"],
    classes: ["守护者"],
    domains: ["利刃", "骸骨"],
    variants: ["食物"],
    variantTypes: {
      食物: {
        description: "可消耗的物品。",
        subclasses: ["饮料"],
        levelRange: [0, 10],
      },
    },
  },
  profession: [
    {
      id: "warrior",
      名称: "战士",
      简介: "战斗职业。",
      领域1: "利刃",
      领域2: "骸骨",
      起始生命: 6,
      起始闪避: 10,
      起始物品: "武器",
      希望特性: "希望特性",
      职业特性: "职业特性",
    },
  ],
  ancestry: [
    {
      id: "human-1",
      名称: "人类能力一",
      种族: "人类",
      简介: "人类简介",
      效果: "效果",
      类别: 1,
    },
  ],
  variant: [
    {
      id: "meal",
      名称: "餐点",
      类型: "食物",
      子类别: "餐食",
      等级: 1,
      效果: "吃掉。",
      简略信息: { item1: "食物" },
      extraLegacyField: "drop me",
    },
  ],
}

describe("legacy card adapter", () => {
  it("maps legacy Chinese fields to the English v1 shape", () => {
    const result = adaptLegacyCardPack(legacyPack)

    expect(result.value).toMatchObject({
      format: "daggerheart.card-pack.v1",
      name: "旧卡包",
      classes: [
        {
          id: "warrior",
          name: "战士",
          summary: "战斗职业。",
          domain1: "利刃",
          domain2: "骸骨",
          startingHitPoints: 6,
          startingEvasion: 10,
          startingItems: "武器",
          hopeFeature: "希望特性",
          classFeature: "职业特性",
        },
      ],
      ancestries: [{ id: "human-1", ancestry: "人类", category: 1 }],
      variants: [{ id: "meal", type: "食物", subCategory: "餐食", summaryItems: { item1: "食物" } }],
    })
  })

  it("derives definitions from cards and explicit legacy definitions", () => {
    const result = adaptLegacyCardPack(legacyPack)

    expect(result.value.definitions).toMatchObject({
      classes: ["战士", "守护者"],
      ancestries: ["人类"],
      domains: ["利刃", "骸骨"],
      variants: ["食物"],
      variantTypes: {
        食物: {
          description: "可消耗的物品。",
          subclasses: ["饮料", "餐食"],
          levelRange: [0, 10],
        },
      },
    })
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ severity: "warning", code: "LEGACY_FORMAT_ASSUMED" }),
    )
  })

  it("warns and drops unknown legacy card fields", () => {
    const result = adaptLegacyCardPack(legacyPack)

    expect(result.value.variants?.[0]).not.toHaveProperty("extraLegacyField")
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "LEGACY_UNKNOWN_FIELD_DROPPED",
        path: "/variant/0/extraLegacyField",
        value: "drop me",
      }),
    )
  })

  it("warns and drops unknown legacy top-level fields", () => {
    const result = adaptLegacyCardPack(legacyPack)

    expect(result.value).not.toHaveProperty("extraTopLevel")
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "LEGACY_UNKNOWN_FIELD_DROPPED",
        path: "/extraTopLevel",
        value: "drop top level",
      }),
    )
  })

  it("does not auto-create missing ancestry pair or subclass triple cards", () => {
    const result = adaptLegacyCardPack(legacyPack)

    expect(result.value.ancestries).toHaveLength(1)
    expect(result.value.subclasses ?? []).toHaveLength(0)
  })

  it("does not mutate legacy variant type definitions while deriving metadata", () => {
    const variantTypes = {
      食物: {
        description: "可消耗的物品。",
        subclasses: ["饮料"],
      },
    }
    const input = {
      ...legacyPack,
      customFieldDefinitions: {
        variants: ["食物"],
        variantTypes,
      },
    }

    const result = adaptLegacyCardPack(input)

    expect(result.value.definitions?.variantTypes?.食物).toMatchObject({
      description: "可消耗的物品。",
      subclasses: ["饮料", "餐食"],
      levelRange: [1, 1],
    })
    expect(variantTypes).toEqual({
      食物: {
        description: "可消耗的物品。",
        subclasses: ["饮料"],
      },
    })
  })
})
