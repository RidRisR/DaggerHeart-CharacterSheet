import { describe, expect, it } from "vitest"
import type { StandardCard } from "@/card/card-types"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { collectModifierEntries } from "@/automation/core/registry"
import { collectSystemModifierEntries } from "@/automation/core/source-definitions"
import type { SheetData } from "@/lib/sheet-data"

describe("modifier source definitions", () => {
  it("derives profession base entries from selected profession card", () => {
    const sheetData = {
      ...defaultSheetData,
      cards: [
        {
          ...defaultSheetData.cards[0],
          id: "profession-warrior",
          type: "profession",
          name: "战士",
          professionSpecial: {
            起始闪避: 12,
            起始生命: 7,
          },
        } as StandardCard,
        ...defaultSheetData.cards.slice(1),
      ],
    }

    const entries = collectSystemModifierEntries(sheetData)

    expect(entries).toContainEqual(expect.objectContaining({
      id: "profession:current:evasion",
      definition: { target: "evasion", kind: "base" },
      presentation: { label: "战士：起始闪避", value: 12 },
      source: { type: "profession", id: "profession:current" },
    }))
  })

  it("finds profession card by type even when slot 0 is not the profession", () => {
    const sheetData = {
      ...defaultSheetData,
      cards: [
        { ...defaultSheetData.cards[0], type: "ancestry", id: "ancestry-elf" } as StandardCard,
        {
          ...defaultSheetData.cards[1],
          id: "profession-bard",
          type: "profession",
          name: "吟游诗人",
          professionSpecial: {
            起始闪避: 10,
            起始生命: 5,
          },
        } as StandardCard,
        ...defaultSheetData.cards.slice(2),
      ],
    }

    const entries = collectSystemModifierEntries(sheetData)

    expect(entries).toContainEqual(expect.objectContaining({
      id: "profession:current:evasion",
      definition: { target: "evasion", kind: "base" },
      presentation: { label: "吟游诗人：起始闪避", value: 10 },
      source: { type: "profession", id: "profession:current" },
    }))
    expect(entries).toContainEqual(expect.objectContaining({
      id: "profession:current:hpMax",
      definition: { target: "hpMax", kind: "base" },
      presentation: { label: "吟游诗人：起始生命上限", value: 5 },
      source: { type: "profession", id: "profession:current" },
    }))
  })

  it("derives armor base entries from equipment armor slot", () => {
    const sheetData = {
      ...defaultSheetData,
      equipment: {
        ...defaultSheetData.equipment,
        armorSlot: {
          name: "链甲",
          baseArmorMax: 4,
          baseThresholds: { minor: 7, major: 15 },
          feature: "重型",
          modifierContributions: [],
        },
      },
    }

    const entries = collectModifierEntries(sheetData)

    expect(entries).toContainEqual(expect.objectContaining({
      id: "equipment:armor:current:armorMax",
      definition: { target: "armorMax", kind: "base" },
      presentation: { label: "链甲：基础护甲值", value: 4 },
      source: { type: "equipment", id: "armor:current" },
    }))
    expect(entries).toContainEqual(expect.objectContaining({
      id: "equipment:armor:current:minorThreshold",
      definition: { target: "minorThreshold", kind: "base" },
      presentation: { label: "链甲：基础重伤阈值", value: 7 },
      source: { type: "equipment", id: "armor:current" },
    }))
    expect(entries).toContainEqual(expect.objectContaining({
      id: "equipment:armor:current:majorThreshold",
      definition: { target: "majorThreshold", kind: "base" },
      presentation: { label: "链甲：基础严重阈值", value: 15 },
      source: { type: "equipment", id: "armor:current" },
    }))
  })

  it("skips null armor base values from equipment armor slot", () => {
    const sheetData = {
      ...defaultSheetData,
      equipment: {
        ...defaultSheetData.equipment,
        armorSlot: {
          name: "无护甲",
          baseArmorMax: null,
          baseThresholds: { minor: null, major: null },
          feature: "",
          modifierContributions: [],
        },
      },
    }

    const entries = collectModifierEntries(sheetData)

    expect(entries.some(entry => entry.id === "equipment:armor:current:armorMax")).toBe(false)
    expect(entries.some(entry => entry.id === "equipment:armor:current:minorThreshold")).toBe(false)
    expect(entries.some(entry => entry.id === "equipment:armor:current:majorThreshold")).toBe(false)
  })

  it("collects active equipment contributions but not inventory weapon contributions", () => {
    const entries = collectModifierEntries({
      ...defaultSheetData,
      equipment: {
        ...defaultSheetData.equipment,
        weaponSlots: {
          primary: {
            name: "塔盾",
            trait: "",
            damage: "",
            feature: "",
            modifierContributions: [
              {
                id: "primary-armor",
                definition: { target: "armorMax", kind: "modifier" },
                editable: { label: "壁垒", value: 2 },
              },
              {
                id: "primary-experience",
                definition: { target: "experienceValues.0", kind: "modifier" },
                editable: { label: "不应生效", value: 99 },
              },
            ],
          },
          secondary: {
            name: "刺剑",
            trait: "",
            damage: "",
            feature: "",
            modifierContributions: [
              {
                id: "secondary-evasion",
                definition: { target: "evasion", kind: "modifier" },
                editable: { label: "灵巧格挡", value: 1 },
              },
              {
                id: "secondary-base",
                definition: { target: "armorMax", kind: "base" },
                editable: { label: "不应生效", value: 99 },
              },
            ],
          },
          inventory: [
            {
              name: "备用塔盾",
              trait: "",
              damage: "",
              feature: "",
              modifierContributions: [
                {
                  id: "inventory-armor",
                  definition: { target: "armorMax", kind: "modifier" },
                  editable: { label: "不应生效", value: 99 },
                },
              ],
            },
            defaultSheetData.equipment.weaponSlots.inventory[1],
          ],
        },
        armorSlot: {
          ...defaultSheetData.equipment.armorSlot,
          name: "链甲",
          modifierContributions: [
            {
              id: "armor-sturdy",
              definition: { target: "armorMax", kind: "modifier" },
              editable: { label: "稳固", value: 1 },
            },
            {
              id: "armor-experience",
              definition: { target: "experienceValues.1", kind: "modifier" },
              editable: { label: "不应生效", value: 99 },
            },
            {
              id: "armor-base",
              definition: { target: "evasion", kind: "base" },
              editable: { label: "不应生效", value: 99 },
            },
          ],
        },
      },
    })

    expect(entries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "primary-armor",
        presentation: { label: "塔盾：壁垒", value: 2 },
        source: { type: "equipment", id: "weapon:primary" },
      }),
      expect.objectContaining({
        id: "secondary-evasion",
        presentation: { label: "刺剑：灵巧格挡", value: 1 },
        source: { type: "equipment", id: "weapon:secondary" },
      }),
      expect.objectContaining({
        id: "armor-sturdy",
        presentation: { label: "链甲：稳固", value: 1 },
        source: { type: "equipment", id: "armor:current" },
      }),
    ]))
    expect(entries.some(entry => entry.id === "primary-experience")).toBe(false)
    expect(entries.some(entry => entry.id === "secondary-base")).toBe(false)
    expect(entries.some(entry => entry.id === "armor-experience")).toBe(false)
    expect(entries.some(entry => entry.id === "armor-base")).toBe(false)
    expect(entries.some(entry => entry.id === "inventory-armor")).toBe(false)
  })

  it("derives level threshold modifiers from current level", () => {
    const sheetData = {
      ...defaultSheetData,
      level: "5",
      equipment: {
        ...defaultSheetData.equipment,
        armorSlot: {
          ...defaultSheetData.equipment.armorSlot,
          name: "锁子甲",
          baseThresholds: { minor: 3, major: 6 },
        },
      },
      minorThreshold: "8",
      majorThreshold: "11",
    }

    const entries = collectSystemModifierEntries(sheetData)

    expect(entries).toContainEqual(expect.objectContaining({
      id: "level:current:minorThreshold",
      definition: { target: "minorThreshold", kind: "modifier" },
      presentation: { label: "等级 5：重伤阈值 +5", value: 5 },
      source: { type: "level", id: "level:current" },
    }))
    expect(entries).toContainEqual(expect.objectContaining({
      id: "level:current:majorThreshold",
      definition: { target: "majorThreshold", kind: "modifier" },
      presentation: { label: "等级 5：严重阈值 +5", value: 5 },
      source: { type: "level", id: "level:current" },
    }))

    const minorTotal = entries
      .filter(entry => entry.definition.target === "minorThreshold")
      .reduce((total, entry) => total + entry.presentation.value, 0)
    const majorTotal = entries
      .filter(entry => entry.definition.target === "majorThreshold")
      .reduce((total, entry) => total + entry.presentation.value, 0)

    expect(minorTotal).toBe(8)
    expect(majorTotal).toBe(11)
  })

  it("derives proficiency base and level threshold modifiers from current level", () => {
    const sheetData = {
      ...defaultSheetData,
      level: "5",
      proficiency: [true, true, true, false, false, false],
    }

    const entries = collectSystemModifierEntries(sheetData)

    expect(entries).toContainEqual(expect.objectContaining({
      id: "level:base:proficiency",
      definition: { target: "proficiency", kind: "base" },
      presentation: { label: "基础熟练度", value: 1 },
      source: { type: "level", id: "level:base" },
    }))
    expect(entries).toContainEqual(expect.objectContaining({
      id: "level:threshold-2:proficiency",
      definition: { target: "proficiency", kind: "modifier" },
      presentation: { label: "等级 2：熟练度 +1", value: 1 },
      source: { type: "level", id: "level:threshold-2" },
    }))
    expect(entries).toContainEqual(expect.objectContaining({
      id: "level:threshold-5:proficiency",
      definition: { target: "proficiency", kind: "modifier" },
      presentation: { label: "等级 5：熟练度 +1", value: 1 },
      source: { type: "level", id: "level:threshold-5" },
    }))

    const proficiencyTotal = entries
      .filter(entry => entry.definition.target === "proficiency")
      .reduce((total, entry) => total + entry.presentation.value, 0)
    expect(proficiencyTotal).toBe(3)
  })

  it("derives stress max base and upgrade modifiers from current level", () => {
    const sheetData = {
      ...defaultSheetData,
      level: "1",
      upgradeStates: {
        "tier1-2-0": { checked: true, params: { target: "stressMax" } },
      },
    } as SheetData

    const entries = collectSystemModifierEntries(sheetData)

    expect(entries).toContainEqual(expect.objectContaining({
      id: "level:base:stressMax",
      definition: { target: "stressMax", kind: "base" },
      presentation: { label: "基础压力上限", value: 6 },
      source: { type: "level", id: "level:base" },
    }))
    expect(entries).toContainEqual(expect.objectContaining({
      id: "upgrade:tier1-2-0:stressMax",
      definition: { target: "stressMax", kind: "modifier" },
      presentation: { label: "升级：压力上限 +1", value: 1 },
    }))

    const stressTotal = entries
      .filter(entry => entry.definition.target === "stressMax")
      .reduce((total, entry) => total + entry.presentation.value, 0)
    expect(stressTotal).toBe(7)
  })

  it("collects upgrade entries from unified upgrade states", () => {
    const sheetData = {
      ...defaultSheetData,
      upgradeStates: {
        "tier1-1-0": { checked: true, params: { target: "hpMax" } },
        "tier1-1-1": { checked: true, params: { target: "hpMax" } },
        "tier1-2-0": { checked: true, params: { target: "stressMax" } },
        "tier1-5-0": { checked: true, params: { target: "evasion" } },
        "tier2-1": { checked: true, params: { target: "proficiency" } },
        "tier1-0-2": { checked: true, params: { attributes: ["agility", "strength"] } },
        "tier1-3-0": { checked: true, params: { experienceIndexes: [0, 2] } },
        "tier1-0-1": { checked: true },
        "tier1-2-1": { checked: false, params: { target: "stressMax" } },
      },
      checkedUpgrades: undefined,
      automationSelections: undefined,
    } as unknown as SheetData

    const entries = collectSystemModifierEntries(sheetData)
    const upgradeEntries = (sourceId: string) => entries.filter(entry => entry.source.id === sourceId)

    expect(upgradeEntries("upgrade:tier1-1-0")).toEqual([
      expect.objectContaining({
        id: "upgrade:tier1-1-0:hpMax",
        definition: { target: "hpMax", kind: "modifier" },
        presentation: { label: "升级：生命上限 +1", value: 1 },
        source: { type: "upgrade", id: "upgrade:tier1-1-0" },
      }),
    ])
    expect(upgradeEntries("upgrade:tier1-1-1")).toEqual([
      expect.objectContaining({
        id: "upgrade:tier1-1-1:hpMax",
        definition: { target: "hpMax", kind: "modifier" },
      }),
    ])
    expect(upgradeEntries("upgrade:tier1-2-0")).toEqual([
      expect.objectContaining({
        id: "upgrade:tier1-2-0:stressMax",
        definition: { target: "stressMax", kind: "modifier" },
      }),
    ])
    expect(upgradeEntries("upgrade:tier1-5-0")).toEqual([
      expect.objectContaining({
        id: "upgrade:tier1-5-0:evasion",
        definition: { target: "evasion", kind: "modifier" },
      }),
    ])
    expect(upgradeEntries("upgrade:tier2-1")).toEqual([
      expect.objectContaining({
        id: "upgrade:tier2-1:proficiency",
        definition: { target: "proficiency", kind: "modifier" },
      }),
    ])
    expect(upgradeEntries("upgrade:tier1-0-2")).toEqual([
      expect.objectContaining({
        id: "upgrade:tier1-0-2:agility.value",
        definition: { target: "agility.value", kind: "modifier" },
      }),
      expect.objectContaining({
        id: "upgrade:tier1-0-2:strength.value",
        definition: { target: "strength.value", kind: "modifier" },
      }),
    ])
    expect(upgradeEntries("upgrade:tier1-3-0")).toEqual([
      expect.objectContaining({
        id: "upgrade:tier1-3-0:experienceValues.0",
        definition: { target: "experienceValues.0", kind: "modifier" },
      }),
      expect.objectContaining({
        id: "upgrade:tier1-3-0:experienceValues.2",
        definition: { target: "experienceValues.2", kind: "modifier" },
      }),
    ])

    expect(entries.some(entry => entry.source.id === "upgrade:tier1-0-1")).toBe(false)
    expect(entries.filter(entry => entry.id === "upgrade:tier2-1:proficiency")).toHaveLength(1)
    expect(entries.some(entry => entry.source.id === "upgrade:tier1-2-1")).toBe(false)
  })

  it("deduplicates malformed upgrade attribute and experience params before emitting entries", () => {
    const sheetData = {
      ...defaultSheetData,
      upgradeStates: {
        attributes: {
          checked: true,
          params: { attributes: ["agility", "strength", "agility", "knowledge", "strength"] },
        },
        experience: {
          checked: true,
          params: { experienceIndexes: [0, 2, 0, 4, 2] },
        },
      },
    } as unknown as SheetData

    const entries = collectSystemModifierEntries(sheetData)
    const attributeEntries = entries.filter(entry => entry.source.id === "upgrade:attributes")
    const experienceEntries = entries.filter(entry => entry.source.id === "upgrade:experience")

    expect(attributeEntries).toEqual([
      expect.objectContaining({
        id: "upgrade:attributes:agility.value",
        definition: { target: "agility.value", kind: "modifier" },
        presentation: { label: "升级：敏捷 +1", value: 1 },
        source: { type: "upgrade", id: "upgrade:attributes" },
      }),
      expect.objectContaining({
        id: "upgrade:attributes:strength.value",
        definition: { target: "strength.value", kind: "modifier" },
        presentation: { label: "升级：力量 +1", value: 1 },
        source: { type: "upgrade", id: "upgrade:attributes" },
      }),
      expect.objectContaining({
        id: "upgrade:attributes:knowledge.value",
        definition: { target: "knowledge.value", kind: "modifier" },
        presentation: { label: "升级：知识 +1", value: 1 },
        source: { type: "upgrade", id: "upgrade:attributes" },
      }),
    ])
    expect(experienceEntries).toEqual([
      expect.objectContaining({
        id: "upgrade:experience:experienceValues.0",
        definition: { target: "experienceValues.0", kind: "modifier" },
        presentation: { label: "升级：经历一 +1", value: 1 },
        source: { type: "upgrade", id: "upgrade:experience" },
      }),
      expect.objectContaining({
        id: "upgrade:experience:experienceValues.2",
        definition: { target: "experienceValues.2", kind: "modifier" },
        presentation: { label: "升级：经历三 +1", value: 1 },
        source: { type: "upgrade", id: "upgrade:experience" },
      }),
      expect.objectContaining({
        id: "upgrade:experience:experienceValues.4",
        definition: { target: "experienceValues.4", kind: "modifier" },
        presentation: { label: "升级：经历五 +1", value: 1 },
        source: { type: "upgrade", id: "upgrade:experience" },
      }),
    ])
    expect(new Set(attributeEntries.map(entry => entry.id)).size).toBe(attributeEntries.length)
    expect(new Set(experienceEntries.map(entry => entry.id)).size).toBe(experienceEntries.length)
  })

  it("ignores malformed persisted upgrade state values", () => {
    const sheetData = {
      ...defaultSheetData,
      upgradeStates: {
        null: null,
        array: [],
        string: "selected",
        number: 1,
        valid: {
          checked: true,
          params: { target: "evasion" },
        },
      },
    } as unknown as SheetData

    expect(() => collectSystemModifierEntries(sheetData)).not.toThrow()

    const entries = collectSystemModifierEntries(sheetData)
    expect(entries).toContainEqual(expect.objectContaining({
      id: "upgrade:valid:evasion",
      definition: { target: "evasion", kind: "modifier" },
      source: { type: "upgrade", id: "upgrade:valid" },
    }))
  })

  it("ignores invalid experience index upgrade state params", () => {
    const sheetData = {
      ...defaultSheetData,
      upgradeStates: {
        experience: {
          checked: true,
          params: { experienceIndexes: [0, Number.NaN, Infinity, -1, 1.5, "2"] },
        },
      },
    } as unknown as SheetData

    const entries = collectSystemModifierEntries(sheetData)
      .filter(entry => entry.source.id === "upgrade:experience")

    expect(entries).toEqual([expect.objectContaining({
      id: "upgrade:experience:experienceValues.0",
      definition: { target: "experienceValues.0", kind: "modifier" },
      presentation: { label: "升级：经历一 +1", value: 1 },
      source: { type: "upgrade", id: "upgrade:experience" },
    })])
  })

  it("does not read legacy automation selections for upgrade entries", () => {
    const sheetData = {
      ...defaultSheetData,
      upgradeStates: {},
      automationSelections: {
        "upgrade:tier1-5-0": {
          selected: true,
          params: { target: "evasion" },
        },
      },
    } as unknown as SheetData

    const entries = collectSystemModifierEntries(sheetData)

    expect(entries.some(entry => entry.id === "upgrade:tier1-5-0:evasion")).toBe(false)
  })

  it("does not emit profession entries from the default empty profession card", () => {
    const entries = collectSystemModifierEntries(defaultSheetData)

    expect(entries.filter(entry => entry.source.type === "profession")).toEqual([])
  })

  it("filters collected entries by target while keeping matching user entries", () => {
    const sheetData = {
      ...defaultSheetData,
      userModifierContributions: [{
        id: "user:evasion",
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "手动闪避调整", value: 2 },
      }, {
        id: "user:armor-value",
        definition: { target: "armorMax", kind: "modifier" },
        editable: { label: "手动护甲调整", value: 1 },
      }],
    } satisfies SheetData

    const entries = collectModifierEntries(sheetData, "evasion")

    expect(entries).toContainEqual(expect.objectContaining({ id: "user:evasion" }))
    expect(entries).not.toContainEqual(expect.objectContaining({ id: "user:armor-value" }))
  })

  it("combines user entries with structured system entries", () => {
    const sheetData = {
      ...defaultSheetData,
      evasion: "15",
      userModifierContributions: [{
        id: "user:evasion-base",
        definition: { target: "evasion", kind: "base" },
        editable: { label: "手动基础闪避", value: 14 },
      }],
      upgradeStates: {
        "tier1-5-0": {
          checked: true,
          params: { target: "evasion" },
        },
      },
    } satisfies SheetData

    const entries = collectModifierEntries(sheetData)

    expect(entries).toContainEqual(expect.objectContaining({ id: "user:evasion-base" }))
    expect(entries).toContainEqual(expect.objectContaining({
      id: "upgrade:tier1-5-0:evasion",
      definition: { target: "evasion", kind: "modifier" },
      presentation: { label: "升级：闪避 +1", value: 1 },
      source: { type: "upgrade", id: "upgrade:tier1-5-0" },
    }))
  })
})
