import { describe, expect, it } from "vitest"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { collectModifierEntries, getReferenceSummary } from "@/lib/modifiers/registry"

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
        } as any,
        ...defaultSheetData.cards.slice(1),
      ],
    }

    const entries = collectModifierEntries(sheetData, "evasion")

    expect(entries).toContainEqual(expect.objectContaining({
      id: "profession:profession-warrior:evasion",
      target: "evasion",
      kind: "base",
      label: "战士：起始闪避",
      value: 12,
      sourceType: "profession",
    }))
  })

  it("derives armor base and threshold entries from current armor fields", () => {
    const sheetData = {
      ...defaultSheetData,
      armorName: "锁子甲",
      armorBaseScore: "4",
      armorThreshold: "9/20",
    }

    const entries = collectModifierEntries(sheetData)

    expect(entries).toContainEqual(expect.objectContaining({
      id: "armor:current:armorValue",
      target: "armorValue",
      kind: "base",
      label: "锁子甲：基础护甲值",
      value: 4,
      sourceType: "armor",
    }))
    expect(entries).toContainEqual(expect.objectContaining({
      id: "armor:current:minorThreshold",
      target: "minorThreshold",
      kind: "base",
      label: "锁子甲：基础轻伤阈值",
      value: 9,
      sourceType: "armor",
    }))
    expect(entries).toContainEqual(expect.objectContaining({
      id: "armor:current:majorThreshold",
      target: "majorThreshold",
      kind: "base",
      label: "锁子甲：基础重伤阈值",
      value: 20,
      sourceType: "armor",
    }))
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
      },
    }

    const entries = collectModifierEntries(sheetData)

    expect(entries).toContainEqual(expect.objectContaining({
      id: "upgrade:tier1-5-0:evasion",
      target: "evasion",
      kind: "modifier",
      value: 1,
      label: "升级：闪避 +1",
    }))
    expect(entries).toContainEqual(expect.objectContaining({
      id: "upgrade:tier1-0-0:agility.value",
      target: "agility.value",
      kind: "modifier",
      value: 1,
      label: "升级：敏捷 +1",
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
    } as any

    expect(() => collectModifierEntries(sheetData)).not.toThrow()

    const entries = collectModifierEntries(sheetData, "evasion")
    expect(entries).toContainEqual(expect.objectContaining({
      id: "upgrade:valid:evasion",
      target: "evasion",
      kind: "modifier",
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

    const entries = collectModifierEntries(sheetData)
      .filter(entry => entry.sourceId === "upgrade:experience")

    expect(entries).toEqual([expect.objectContaining({
      id: "upgrade:experience:experienceValues.0",
      target: "experienceValues.0",
      kind: "modifier",
      label: "升级：经历 1 +1",
    })])
  })

  it("does not emit profession entries from the default empty profession card", () => {
    const entries = collectModifierEntries(defaultSheetData)

    expect(entries.filter(entry => entry.sourceType === "profession")).toEqual([])
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
    } as any

    const entries = collectModifierEntries(sheetData, "evasion")

    expect(entries).toContainEqual(expect.objectContaining({ id: "user:evasion" }))
    expect(entries).not.toContainEqual(expect.objectContaining({ id: "user:armor" }))
  })

  it("combines user entries with system entries in reference summary", () => {
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

    const summary = getReferenceSummary(sheetData, "evasion")

    expect(summary.activeBase?.id).toBe("user:evasion-base")
    expect(summary.referenceTotal).toBe(15)
    expect(summary.unattributedDelta).toBe(0)
  })
})
