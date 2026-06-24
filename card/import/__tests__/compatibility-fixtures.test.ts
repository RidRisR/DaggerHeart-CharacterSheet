import builtinBase from "@/data/cards/builtin-base.json"
import continuousChoiceSample from "@/public/自定义卡包指南和示例/card-automation-continuous-choice-test-pack.json"
import publicSample from "@/public/自定义卡包指南和示例/神州战役卡牌包.json"
import automationMultiStepSample from "./fixtures/card-automation-multi-step-test-pack.json"
import { describe, expect, it } from "vitest"
import { projectCardAutomationSetupRequirements } from "@/card/automation/setup-projection"
import { makeSheet } from "@/card/automation/__tests__/helpers"
import type { StandardCard } from "@/card/card-types"
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

  it("accepts public automation multi-step test pack through v1 adapter", async () => {
    const result = await importCardPackFromSource(
      createCardObjectSource(automationMultiStepSample, "automation multi-step sample"),
      { mode: "dryRun" },
    )

    expect(result.success).toBe(true)
    expect(result.stage).toBe("stageImportData")
    expect(result.summary.cardCount).toBe(1)
    expect(result.model?.cards[0].automation?.abilities).toHaveLength(2)
    expect(result.model?.cards[0].automation?.abilities[0].choices).toHaveLength(3)

    const card = result.model?.cards[0]
    expect(card?.automation).toBeDefined()
    const sheet = makeSheet({
      cards: [
        {
          standarized: true,
          id: card?.id ?? "automation-multi-step-test-card",
          instanceId: "cardinst_automation_multi_step_test",
          name: card?.name ?? "自动化多步骤测试卡",
          type: "domain",
          class: "测试",
          cardSelectDisplay: {},
          automation: card?.automation,
          automationState: { version: 1, abilities: {} },
        } satisfies StandardCard,
      ],
    })
    const requirements = projectCardAutomationSetupRequirements(sheet, {
      cardInstanceId: "cardinst_automation_multi_step_test",
    })
    expect(requirements.map((requirement) => requirement.abilityId)).toEqual([
      "test-branching-bonus",
      "test-training-focus",
    ])
  })

  it("accepts public automation continuous choice test pack through v1 adapter", async () => {
    const result = await importCardPackFromSource(
      createCardObjectSource(continuousChoiceSample, "automation continuous choice sample"),
      { mode: "dryRun" },
    )

    expect(result.success).toBe(true)
    expect(result.stage).toBe("stageImportData")
    expect(result.summary.cardCount).toBe(1)
    expect(result.model?.cards[0].automation?.abilities).toHaveLength(3)

    const card = result.model?.cards[0]
    expect(card?.automation).toBeDefined()
    const sheet = makeSheet({
      cards: [
        {
          standarized: true,
          id: card?.id ?? "automation-continuous-choice-test-card",
          instanceId: "cardinst_automation_continuous_choice_test",
          name: card?.name ?? "自动化连续选择测试卡",
          type: "domain",
          class: "测试",
          cardSelectDisplay: {},
          automation: card?.automation,
          automationState: { version: 1, abilities: {} },
        } satisfies StandardCard,
      ],
    })
    const requirements = projectCardAutomationSetupRequirements(sheet, {
      cardInstanceId: "cardinst_automation_continuous_choice_test",
    })
    expect(requirements.map((requirement) => requirement.abilityId)).toEqual([
      "continuous-single-mode",
      "continuous-static-many",
      "continuous-branch-targets",
    ])
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
