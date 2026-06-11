import { describe, expect, it } from "vitest"
import { armorItems } from "@/data/list/armor"
import { allWeapons } from "@/data/list/all-weapons"
import {
  createArmorSlotFromCustomDraft,
  createArmorSlotFromBuiltinTemplate,
  createArmorSlotFromRuntimeTemplate,
  createWeaponSlotFromBuiltinTemplate,
  createWeaponSlotFromCustomDraft,
  createWeaponSlotFromRuntimeTemplate,
  type CustomArmorDraft,
  type CustomWeaponDraft,
} from "@/automation/equipment/template-to-slot"
import type { RuntimeEquipmentTemplate } from "@/equipment/runtime-cache/types"

describe("equipment template ids", () => {
  it("weapon templates expose unique stable builtin ids", () => {
    const weaponIds = allWeapons.map((weapon) => weapon.id)
    const legacyKeys = ["名称", "等级", "属性", "伤害类型", "范围", "伤害", "负荷", "特性名称", "描述"]

    expect(new Set(weaponIds).size).toBe(weaponIds.length)

    for (const weapon of allWeapons) {
      expect(weapon.id).toMatch(/^builtin\.weapon\.(primary|secondary)\./)
      expect(weapon.id).not.toBe(weapon.name)
      for (const key of legacyKeys) {
        expect(key in weapon).toBe(false)
      }
      expect(weapon.modifierContributions).toEqual(expect.any(Array))
    }
  })

  it("armor templates use English structured fields and stable ids", () => {
    const armor = armorItems[0]
    const armorIds = armorItems.map((item) => item.id)

    expect(new Set(armorIds).size).toBe(armorIds.length)

    for (const item of armorItems) {
      expect(item.id).toMatch(/^builtin\.armor\./)
    }

    expect(armor.id).toMatch(/^builtin\.armor\./)
    expect(armor.name).toBeTruthy()
    expect(armor.baseArmorMax).toEqual(expect.any(Number))
    expect(armor.baseThresholds).toEqual({
      minor: expect.any(Number),
      major: expect.any(Number),
    })
    expect("名称" in armor).toBe(false)
    expect("护甲值" in armor).toBe(false)
    expect("伤害阈值" in armor).toBe(false)
  })
})

describe("template to slot conversion", () => {
  it("creates weapon slots from canonical weapon templates", () => {
    const template = allWeapons.find((weapon) => weapon.id === "builtin.weapon.secondary.tower-shield")
    expect(template).toBeTruthy()

    const slot = createWeaponSlotFromBuiltinTemplate(template!, () => "generated-id")

    expect(slot.name).toBe(template!.name)
    expect(slot.trait).toBe("物理/副手/近战")
    expect(slot.damage).toBe("力量: d6")
    expect(slot.feature).toContain(template!.featureName)
    expect(slot.modifierContributions.every((entry) => entry.id.startsWith("generated-id"))).toBe(true)
  })

  it("uses the template contribution ids to create unique runtime contribution ids", () => {
    const template = allWeapons.find((weapon) => weapon.id === "builtin.weapon.secondary.tower-shield")
    expect(template?.modifierContributions).toHaveLength(2)

    const receivedTemplateIds: string[] = []
    const slot = createWeaponSlotFromBuiltinTemplate(template!, (templateId) => {
      receivedTemplateIds.push(templateId)
      return `runtime-${templateId}-${receivedTemplateIds.length}`
    })
    const runtimeIds = slot.modifierContributions.map((entry) => entry.id)

    expect(receivedTemplateIds).toEqual(["armor-max", "evasion"])
    expect(new Set(runtimeIds).size).toBe(runtimeIds.length)
    expect(runtimeIds.every((id) => id.startsWith("runtime-"))).toBe(true)
  })

  it("creates contribution-backed slots for every tower shield template", () => {
    const towerShields = allWeapons.filter((weapon) => weapon.name.includes("塔盾"))

    expect(towerShields.map((weapon) => weapon.name)).toEqual([
      "塔盾",
      "改良塔盾",
      "高级塔盾",
      "传奇塔盾",
    ])

    for (const template of towerShields) {
      const armorMaxValue = template.description?.match(/(?:\+(\d+)\s*护甲值|护甲值\+(\d+))/)
      expect(armorMaxValue).toBeTruthy()

      const expectedArmorMax = Number(armorMaxValue![1] ?? armorMaxValue![2])
      const templateArmorContribution = template.modifierContributions?.find(
        (entry) => entry.definition.target === "armorMax",
      )
      const templateEvasionContribution = template.modifierContributions?.find(
        (entry) => entry.definition.target === "evasion",
      )

      expect(templateArmorContribution?.editable.value).toBe(expectedArmorMax)
      expect(templateEvasionContribution?.editable.value).toBe(-1)

      const slot = createWeaponSlotFromBuiltinTemplate(template, (templateId) => `generated-${templateId}`)
      const slotArmorContribution = slot.modifierContributions.find(
        (entry) => entry.definition.target === "armorMax",
      )
      const slotEvasionContribution = slot.modifierContributions.find(
        (entry) => entry.definition.target === "evasion",
      )

      expect(slotArmorContribution?.editable.value).toBe(expectedArmorMax)
      expect(slotEvasionContribution?.editable.value).toBe(-1)
    }
  })

  it("captures obvious static weapon modifiers from template descriptions", () => {
    const expectedByText = [
      { text: "闪避值-1", target: "evasion", value: -1 },
      { text: "灵巧-1", target: "finesse.value", value: -1 },
      { text: "敏捷-1", target: "agility.value", value: -1 },
      { text: "严重伤害阈值+3", target: "majorThreshold", value: 3 },
    ] as const

    for (const template of allWeapons) {
      const compactDescription = (template.description ?? "").replace(/\s/g, "")
      const expectedContributions: { text: string; target: string; value: number }[] = [
        ...expectedByText,
      ]

      const armorMaxValue =
        compactDescription.match(/\+(\d+)护甲值/)?.[1] ??
        compactDescription.match(/护甲值\+(\d+)/)?.[1]

      if (armorMaxValue) {
        expectedContributions.push({
          text: `armorMax:${armorMaxValue}`,
          target: "armorMax",
          value: Number(armorMaxValue),
        })
      }

      for (const expected of expectedContributions) {
        if (!compactDescription.includes(expected.text) && !expected.text.startsWith("armorMax:")) {
          continue
        }

        const contribution = template.modifierContributions?.find(
          (entry) => entry.definition.target === expected.target,
        )

        expect(
          contribution,
          `${template.name} should expose ${expected.target} ${expected.value} from "${template.description}"`,
        ).toBeTruthy()
        expect(contribution?.editable.value).toBe(expected.value)
      }
    }
  })

  it("creates armor slots from structured armor templates", () => {
    const template = armorItems.find((armor) => armor.id === "builtin.armor.full-plate")
    expect(template).toBeTruthy()

    const slot = createArmorSlotFromBuiltinTemplate(template!, () => "armor-contribution")

    expect(slot.name).toBe(template!.name)
    expect(slot.baseArmorMax).toBe(template!.baseArmorMax)
    expect(slot.baseThresholds).toEqual(template!.baseThresholds)
    expect(slot.feature).toContain(template!.featureName)
  })

})

describe("runtime equipment template slot instantiation", () => {
  it("creates a weapon slot from a one-off custom weapon draft", () => {
    const draft: CustomWeaponDraft = {
      name: "自定义塔盾",
      tier: "T1",
      weaponType: "secondary",
      trait: "strength",
      damageType: "physical",
      range: "melee",
      burden: "offHand",
      damage: "d6",
      featureName: "壁垒",
      description: "+2 护甲值，-1 闪避值",
      modifierContributions: [
        {
          id: "armor",
          definition: { kind: "modifier", target: "armorMax" },
          editable: { label: "护甲值", value: 2 },
        },
        {
          id: "evasion",
          definition: { kind: "modifier", target: "evasion" },
          editable: { label: "闪避值", value: -1 },
        },
      ],
    }

    const slot = createWeaponSlotFromCustomDraft(draft, (id) => `custom:${id}`)

    expect(slot).toMatchObject({
      name: "自定义塔盾",
      trait: "物理/副手/近战",
      damage: "力量: d6",
      feature: "壁垒: +2 护甲值，-1 闪避值",
    })
    expect(slot.modifierContributions.map((contribution) => contribution.id)).toEqual([
      "custom:armor",
      "custom:evasion",
    ])
  })

  it("creates an armor slot from a one-off custom armor draft", () => {
    const draft: CustomArmorDraft = {
      name: "自定义链甲",
      tier: "T1",
      baseArmorMax: 4,
      baseThresholds: { minor: 7, major: 14 },
      featureName: "稳固",
      description: "护甲值+1。",
      modifierContributions: [{
        id: "armor",
        definition: { kind: "modifier", target: "armorMax" },
        editable: { label: "护甲值", value: 1 },
      }],
    }

    const slot = createArmorSlotFromCustomDraft(draft, (id) => `custom:${id}`)

    expect(slot).toMatchObject({
      name: "自定义链甲",
      baseArmorMax: 4,
      baseThresholds: { minor: 7, major: 14 },
      feature: "稳固: 护甲值+1。",
    })
    expect(slot.modifierContributions.map((contribution) => contribution.id)).toEqual([
      "custom:armor",
    ])
  })

  it("creates a weapon slot from a runtime weapon template", () => {
    const template: RuntimeEquipmentTemplate = {
      kind: "weapon",
      id: "pack.weapon.test-spear",
      name: "测试矛",
      tier: "T1",
      weaponType: "primary",
      trait: "agility",
      damageType: "physical",
      range: "close",
      burden: "oneHanded",
      damage: "d8",
      featureName: "穿刺",
      description: "攻击邻近目标时稳定。",
      modifierContributions: [{
        id: "feature",
        definition: { kind: "modifier", target: "evasion" },
        editable: { label: "闪避", value: 1 },
      }],
    }

    const slot = createWeaponSlotFromRuntimeTemplate(template, (id) => `instance:${id}`)

    expect(slot).toEqual({
      name: "测试矛",
      trait: "物理/单手/近距离",
      damage: "敏捷: d8",
      feature: "穿刺: 攻击邻近目标时稳定。",
      modifierContributions: [{
        id: "instance:feature",
        definition: { kind: "modifier", target: "evasion" },
        editable: { label: "闪避", value: 1 },
      }],
    })
  })

  it("creates an armor slot from a runtime armor template", () => {
    const template: RuntimeEquipmentTemplate = {
      kind: "armor",
      id: "pack.armor.test-mail",
      name: "测试链甲",
      tier: "T1",
      baseThresholds: { minor: 5, major: 10 },
      baseArmorMax: 4,
      featureName: "结实",
      description: "适合正面作战。",
      modifierContributions: [{
        id: "minor-threshold",
        definition: { kind: "modifier", target: "minorThreshold" },
        editable: { label: "轻微阈值", value: 2 },
      }],
    }

    const slot = createArmorSlotFromRuntimeTemplate(template, (id) => `instance:${id}`)

    expect(slot).toEqual({
      name: "测试链甲",
      baseArmorMax: 4,
      baseThresholds: { minor: 5, major: 10 },
      feature: "结实: 适合正面作战。",
      modifierContributions: [{
        id: "instance:minor-threshold",
        definition: { kind: "modifier", target: "minorThreshold" },
        editable: { label: "轻微阈值", value: 2 },
      }],
    })
    expect(slot.modifierContributions[0]).not.toBe(template.modifierContributions[0])
    expect(slot.modifierContributions[0]?.definition).not.toBe(template.modifierContributions[0]?.definition)
    expect(slot.modifierContributions[0]?.editable).not.toBe(template.modifierContributions[0]?.editable)
  })
})
