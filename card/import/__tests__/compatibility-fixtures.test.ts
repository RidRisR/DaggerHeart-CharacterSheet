import builtinBase from "@/data/cards/builtin-base.json"
import publicSample from "@/public/自定义卡包指南和示例/神州战役卡牌包.json"
import { describe, expect, it } from "vitest"
import { importCardPackFromSource } from "@/card/import/import-pipeline"
import { createCardObjectSource } from "@/card/import/source"

describe("card import compatibility fixtures", () => {
  it("accepts builtin base card pack through legacy adapter", async () => {
    const result = await importCardPackFromSource(createCardObjectSource(builtinBase, "builtin-base"), { mode: "dryRun" })

    expect(result.success).toBe(true)
    expect(result.stage).toBe("stageImportData")
    expect(result.summary.cardCount).toBeGreaterThan(0)
    expect(result.draft?.templateIds.length).toBe(result.summary.cardCount)
  })

  it("accepts published public sample through legacy adapter", async () => {
    const result = await importCardPackFromSource(createCardObjectSource(publicSample, "public sample"), {
      mode: "dryRun",
    })

    expect(result.success).toBe(true)
    expect(result.stage).toBe("stageImportData")
    expect(result.summary.cardCount).toBeGreaterThan(0)
    expect(result.draft?.templateIds.length).toBe(result.summary.cardCount)
  })

  it("accepts missing customFieldDefinitions when definitions can be derived from cards", async () => {
    const noDefinitions = {
      name: "无 definitions 卡包",
      profession: [
        {
          id: "warrior",
          名称: "战士",
          简介: "",
          领域1: "利刃",
          领域2: "骸骨",
          起始生命: 6,
          起始闪避: 10,
          起始物品: "",
          希望特性: "",
          职业特性: "",
        },
      ],
    }

    const result = await importCardPackFromSource(createCardObjectSource(noDefinitions), { mode: "dryRun" })

    expect(result.success).toBe(true)
    expect(result.stage).toBe("stageImportData")
    expect(result.model?.definitions.classes).toContain("战士")
    expect(result.model?.definitions.domains).toEqual(expect.arrayContaining(["利刃", "骸骨"]))
  })

  it("accepts mixed legacy definition fields without creating missing card groups", async () => {
    const mixedDefinitions = {
      name: "混合字段卡包",
      customFieldDefinitions: {
        professions: ["战士"],
        classes: ["守护者"],
        domains: ["利刃", "骸骨"],
        variants: ["食物"],
      },
      profession: [
        {
          id: "warrior",
          名称: "战士",
          简介: "",
          领域1: "利刃",
          领域2: "骸骨",
          起始生命: 6,
          起始闪避: 10,
          起始物品: "",
          希望特性: "",
          职业特性: "",
        },
      ],
      variant: [{ id: "meal", 名称: "餐食", 类型: "食物", 子类别: "餐点", 等级: 1, 效果: "" }],
    }

    const result = await importCardPackFromSource(createCardObjectSource(mixedDefinitions), { mode: "dryRun" })

    expect(result.success).toBe(true)
    expect(result.stage).toBe("stageImportData")
    expect(result.model?.definitions.classes).toEqual(expect.arrayContaining(["战士", "守护者"]))
    expect(result.model?.cards.map((card) => card.group)).toEqual(["classes", "variants"])
    expect(result.draft?.templateIds).toEqual(["warrior", "meal"])
  })

  it("accepts legacy payloads with variantTypes and hasLocalImage fields", async () => {
    const legacyWithVariantTypesAndImages = {
      name: "旧字段图片卡包",
      customFieldDefinitions: {
        professions: ["战士"],
        domains: ["利刃", "骸骨"],
        variants: ["食物"],
        variantTypes: {
          食物: {
            description: "可消耗物品",
            subclasses: ["餐食"],
            levelRange: [1, 3],
          },
        },
      },
      profession: [
        {
          id: "warrior",
          名称: "战士",
          简介: "",
          领域1: "利刃",
          领域2: "骸骨",
          起始生命: 6,
          起始闪避: 10,
          起始物品: "",
          希望特性: "",
          职业特性: "",
          hasLocalImage: true,
        },
      ],
      variant: [{ id: "meal", 名称: "餐食", 类型: "食物", 子类别: "餐食", 等级: 1, 效果: "" }],
    }

    const result = await importCardPackFromSource(createCardObjectSource(legacyWithVariantTypesAndImages), {
      mode: "dryRun",
    })

    expect(result.success).toBe(true)
    expect(result.stage).toBe("stageImportData")
    expect(result.model?.definitions.variantTypes.食物).toMatchObject({
      subclasses: ["餐食"],
      levelRange: [1, 3],
    })
    expect(result.model?.cards.find((card) => card.id === "warrior")).toMatchObject({ hasLocalImage: true })
    expect(result.draft?.templateIds).toEqual(["warrior", "meal"])
  })
})
