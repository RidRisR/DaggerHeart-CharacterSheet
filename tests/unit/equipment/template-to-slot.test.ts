import { describe, expect, it } from "vitest"
import { armorItems } from "@/data/list/armor"
import { allWeapons } from "@/data/list/all-weapons"
import {
  createArmorSlotFromCustomPayload,
  createArmorSlotFromTemplate,
  createWeaponSlotFromTemplate,
} from "@/lib/equipment/template-to-slot"

describe("equipment template ids", () => {
  it("weapon templates expose unique stable builtin ids", () => {
    const weaponIds = allWeapons.map((weapon) => weapon.id)

    expect(new Set(weaponIds).size).toBe(weaponIds.length)

    for (const weapon of allWeapons) {
      expect(weapon.id).toMatch(/^builtin\.weapon\.(primary|secondary)\./)
      expect(weapon.id).not.toBe(weapon.名称)
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
  it("creates weapon slots from Chinese-field weapon templates", () => {
    const template = allWeapons.find((weapon) => weapon.id === "builtin.weapon.secondary.tower-shield")
    expect(template).toBeTruthy()

    const slot = createWeaponSlotFromTemplate(template!, () => "generated-id")

    expect(slot.name).toBe(template!.名称)
    expect(slot.trait).toContain(template!.伤害类型)
    expect(slot.damage).toContain(template!.伤害)
    expect(slot.feature).toContain(template!.特性名称)
    expect(slot.modifierContributions.every((entry) => entry.id.startsWith("generated-id"))).toBe(true)
  })

  it("uses the template contribution ids to create unique runtime contribution ids", () => {
    const template = allWeapons.find((weapon) => weapon.id === "builtin.weapon.secondary.tower-shield")
    expect(template?.modifierContributions).toHaveLength(2)

    const receivedTemplateIds: string[] = []
    const slot = createWeaponSlotFromTemplate(template!, (templateId) => {
      receivedTemplateIds.push(templateId)
      return `runtime-${templateId}-${receivedTemplateIds.length}`
    })
    const runtimeIds = slot.modifierContributions.map((entry) => entry.id)

    expect(receivedTemplateIds).toEqual(["armor-max", "evasion"])
    expect(new Set(runtimeIds).size).toBe(runtimeIds.length)
    expect(runtimeIds.every((id) => id.startsWith("runtime-"))).toBe(true)
  })

  it("creates contribution-backed slots for every tower shield template", () => {
    const towerShields = allWeapons.filter((weapon) => weapon.名称.includes("塔盾"))

    expect(towerShields.map((weapon) => weapon.名称)).toEqual([
      "塔盾",
      "改良塔盾",
      "高级塔盾",
      "传奇塔盾",
    ])

    for (const template of towerShields) {
      const armorMaxValue = template.描述.match(/(?:\+(\d+)\s*护甲值|护甲值\+(\d+))/)
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

      const slot = createWeaponSlotFromTemplate(template, (templateId) => `generated-${templateId}`)
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
      const compactDescription = template.描述.replace(/\s/g, "")
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
          `${template.名称} should expose ${expected.target} ${expected.value} from "${template.描述}"`,
        ).toBeTruthy()
        expect(contribution?.editable.value).toBe(expected.value)
      }
    }
  })

  it("creates armor slots from structured armor templates", () => {
    const template = armorItems.find((armor) => armor.id === "builtin.armor.full-plate")
    expect(template).toBeTruthy()

    const slot = createArmorSlotFromTemplate(template!, () => "armor-contribution")

    expect(slot.name).toBe(template!.name)
    expect(slot.baseArmorMax).toBe(template!.baseArmorMax)
    expect(slot.baseThresholds).toEqual(template!.baseThresholds)
    expect(slot.feature).toContain(template!.featureName)
  })

  it("keeps custom Chinese armor payload compatible", () => {
    const slot = createArmorSlotFromCustomPayload({
      名称: "自定义护甲",
      护甲值: "4",
      伤害阈值: "9/21",
      特性名称: "自定义",
      描述: "测试描述",
    })

    expect(slot).toMatchObject({
      name: "自定义护甲",
      baseArmorMax: 4,
      baseThresholds: { minor: 9, major: 21 },
      feature: "自定义: 测试描述",
      modifierContributions: [],
    })
  })

  it.each([
    ["9/", { minor: 9, major: null }],
    ["/21", { minor: null, major: 21 }],
    ["9/abc", { minor: 9, major: null }],
    ["abc/21", { minor: null, major: 21 }],
    ["9", { minor: 9, major: null }],
    ["abc", { minor: null, major: null }],
  ])("parses half-structured armor threshold payload %s", (threshold, expected) => {
    const slot = createArmorSlotFromCustomPayload({
      名称: "自定义护甲",
      护甲值: "4",
      伤害阈值: threshold,
    })

    expect(slot.baseThresholds).toEqual(expected)
  })

  it("parses structured armor threshold payload sides independently", () => {
    const slot = createArmorSlotFromCustomPayload({
      名称: "自定义护甲",
      护甲值: "4",
      伤害阈值: { minor: "10+3", major: "bad" },
    })

    expect(slot.baseThresholds).toEqual({ minor: 13, major: null })
  })

  it("keeps half-structured custom modal armor threshold objects", () => {
    const slot = createArmorSlotFromCustomPayload({
      名称: "自定义护甲",
      护甲值: "5+1",
      伤害阈值: { minor: "8", major: "" },
    })

    expect(slot.baseArmorMax).toBe(6)
    expect(slot.baseThresholds).toEqual({ minor: 8, major: null })
  })
})
