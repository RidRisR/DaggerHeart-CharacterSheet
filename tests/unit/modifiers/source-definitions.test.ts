import { describe, expect, it } from "vitest"
import type { StandardCard } from "@/card/card-types"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { collectModifierEntries } from "@/lib/modifiers/registry"
import { collectSystemModifierEntries } from "@/lib/modifiers/source-definitions"
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
      id: "profession:profession-warrior:evasion",
      definition: { target: "evasion", kind: "base" },
      presentation: { label: "战士：起始闪避", value: 12 },
      source: { type: "profession", id: "profession:profession-warrior" },
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
      id: "profession:profession-bard:evasion",
      definition: { target: "evasion", kind: "base" },
      presentation: { label: "吟游诗人：起始闪避", value: 10 },
      source: { type: "profession", id: "profession:profession-bard" },
    }))
    expect(entries).toContainEqual(expect.objectContaining({
      id: "profession:profession-bard:hpMax",
      definition: { target: "hpMax", kind: "base" },
      presentation: { label: "吟游诗人：起始生命上限", value: 5 },
      source: { type: "profession", id: "profession:profession-bard" },
    }))
  })

  it("derives armor base and threshold entries from current armor fields", () => {
    const sheetData = {
      ...defaultSheetData,
      armorName: "锁子甲",
      armorBaseScore: "4",
      armorThreshold: "9/20",
    }

    const entries = collectSystemModifierEntries(sheetData)

    expect(entries).toContainEqual(expect.objectContaining({
      id: "armor:current:armorValue",
      definition: { target: "armorValue", kind: "base" },
      presentation: { label: "锁子甲：基础护甲值", value: 4 },
      source: { type: "armor", id: "armor:current" },
    }))
    expect(entries).toContainEqual(expect.objectContaining({
      id: "armor:current:minorThreshold",
      definition: { target: "minorThreshold", kind: "base" },
      presentation: { label: "锁子甲：基础重伤阈值", value: 9 },
      source: { type: "armor", id: "armor:current" },
    }))
    expect(entries).toContainEqual(expect.objectContaining({
      id: "armor:current:majorThreshold",
      definition: { target: "majorThreshold", kind: "base" },
      presentation: { label: "锁子甲：基础严重阈值", value: 20 },
      source: { type: "armor", id: "armor:current" },
    }))
  })

  it("derives level threshold modifiers from current level", () => {
    const sheetData = {
      ...defaultSheetData,
      level: "5",
      armorName: "锁子甲",
      armorThreshold: "3/6",
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

  it("derives selected upgrade modifier entries from automation selections", () => {
    const sheetData = {
      ...defaultSheetData,
      automationSelections: {
        "upgrade:tier1-5-0": {
          selected: true,
          params: { target: "evasion" },
        },
        "upgrade:tier1-0-0": {
          selected: true,
          params: { attributes: ["agility", "strength"] },
        },
        "upgrade:tier2-6": {
          selected: true,
          params: { target: "proficiency" },
        },
      },
    }

    const entries = collectSystemModifierEntries(sheetData)

    expect(entries).toContainEqual(expect.objectContaining({
      id: "upgrade:tier1-5-0:evasion",
      definition: { target: "evasion", kind: "modifier" },
      presentation: { label: "升级：闪避 +1", value: 1 },
      source: { type: "upgrade", id: "upgrade:tier1-5-0" },
    }))
    expect(entries).toContainEqual(expect.objectContaining({
      id: "upgrade:tier1-0-0:agility.value",
      definition: { target: "agility.value", kind: "modifier" },
      presentation: { label: "升级：敏捷 +1", value: 1 },
      source: { type: "upgrade", id: "upgrade:tier1-0-0" },
    }))
    expect(entries).toContainEqual(expect.objectContaining({
      id: "upgrade:tier2-6:proficiency",
      definition: { target: "proficiency", kind: "modifier" },
      presentation: { label: "升级：熟练度 +1", value: 1 },
      source: { type: "upgrade", id: "upgrade:tier2-6" },
    }))
  })

  it("ignores malformed persisted automation selection values", () => {
    const sheetData = {
      ...defaultSheetData,
      automationSelections: {
        "upgrade:null": null,
        "upgrade:array": [],
        "upgrade:string": "selected",
        "upgrade:number": 1,
        "upgrade:valid": {
          selected: true,
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

  it("ignores invalid experience index automation params", () => {
    const sheetData = {
      ...defaultSheetData,
      automationSelections: {
        "upgrade:experience": {
          selected: true,
          params: { experienceIndexes: [0, Number.NaN, Infinity, -1, 1.5, "2"] },
        },
      },
    }

    const entries = collectSystemModifierEntries(sheetData)
      .filter(entry => entry.source.id === "upgrade:experience")

    expect(entries).toEqual([expect.objectContaining({
      id: "upgrade:experience:experienceValues.0",
      definition: { target: "experienceValues.0", kind: "modifier" },
      presentation: { label: "升级：经历 1 +1", value: 1 },
      source: { type: "upgrade", id: "upgrade:experience" },
    })])
  })

  it("does not emit profession entries from the default empty profession card", () => {
    const entries = collectSystemModifierEntries(defaultSheetData)

    expect(entries.filter(entry => entry.source.type === "profession")).toEqual([])
  })

  it("filters collected entries by target while keeping matching user entries", () => {
    const sheetData = {
      ...defaultSheetData,
      modifierState: {
        byTarget: {
          evasion: {
            userEntries: [{
              id: "user:evasion",
              sourceId: "user:evasion",
              target: "evasion",
              kind: "modifier",
              label: "手动闪避调整",
              value: 2,
              sourceType: "user",
              priority: 10,
            }],
          },
          armorValue: {
            userEntries: [{
              id: "user:armor",
              sourceId: "user:armor",
              target: "armorValue",
              kind: "modifier",
              label: "手动护甲调整",
              value: 1,
              sourceType: "user",
              priority: 10,
            }],
          },
        },
      },
    } satisfies SheetData

    const entries = collectModifierEntries(sheetData, "evasion")

    expect(entries).toContainEqual(expect.objectContaining({ id: "user:evasion" }))
    expect(entries).not.toContainEqual(expect.objectContaining({ id: "user:armor" }))
  })

  it("combines user entries with structured system entries", () => {
    const sheetData = {
      ...defaultSheetData,
      evasion: "15",
      modifierState: {
        byTarget: {
          evasion: {
            activeBaseId: "user:evasion-base",
            userEntries: [{
              id: "user:evasion-base",
              sourceId: "user:evasion-base",
              target: "evasion",
              kind: "base",
              label: "手动基础闪避",
              value: 14,
              sourceType: "user",
              priority: 10,
            }],
          },
        },
      },
      automationSelections: {
        "upgrade:tier1-5-0": {
          selected: true,
          params: { target: "evasion" },
        },
      },
    }

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
