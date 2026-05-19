import { describe, expect, it } from "vitest"
import { defaultSheetData } from "@/lib/default-sheet-data"
import {
  applyLevelEntryAutomations,
  enteredLevelsBetween,
  normalizeLevelForEntryAutomation,
  runLevelEntryAutomations,
} from "@/lib/automation/level-entry-actions"
import { mergeUpgradeState, sanitizeUpgradeStates } from "@/lib/modifiers/upgrade-states"

describe("level entry automation", () => {
  it.each([
    ["", 1],
    ["abc", 1],
    ["0", 1],
    ["11", 1],
    ["1", 1],
    ["5", 5],
    ["10", 10],
  ])("normalizes %s to %s", (value, expected) => {
    expect(normalizeLevelForEntryAutomation(value)).toBe(expected)
  })

  it("returns every entered level on upward jumps", () => {
    expect(enteredLevelsBetween("1", "5")).toEqual([2, 3, 4, 5])
    expect(enteredLevelsBetween("4", "6")).toEqual([5, 6])
    expect(enteredLevelsBetween("1", "8")).toEqual([2, 3, 4, 5, 6, 7, 8])
  })

  it("does not return levels for same-level or downward changes", () => {
    expect(enteredLevelsBetween("5", "5")).toEqual([])
    expect(enteredLevelsBetween("8", "4")).toEqual([])
    expect(enteredLevelsBetween("5", "")).toEqual([])
  })

  it("clears attribute marks and attributeMarksApplied at level 5 and level 8", () => {
    const sheet = applyLevelEntryAutomations({
      ...defaultSheetData,
      level: "1",
      agility: { value: "1", checked: true, spellcasting: false },
      strength: { value: "1", checked: true, spellcasting: false },
      upgradeStates: {
        "tier1-0-0": {
          checked: true,
          params: { attributes: ["agility", "strength"] },
          attributeMarksApplied: true,
        },
        "tier1-5-0": {
          checked: true,
          params: { target: "evasion" },
        },
      },
    }, "8")

    expect(sheet.agility?.checked).toBe(false)
    expect(sheet.strength?.checked).toBe(false)
    expect(sheet.upgradeStates?.["tier1-0-0"]).toEqual({
      checked: true,
      params: { attributes: ["agility", "strength"] },
    })
    expect(sheet.upgradeStates?.["tier1-5-0"]).toEqual({
      checked: true,
      params: { target: "evasion" },
    })
  })

  it("runs matching per-level automations in entered level order", () => {
    const calls: string[] = []

    const sheet = runLevelEntryAutomations(
      { ...defaultSheetData, level: "1", name: "start" },
      enteredLevelsBetween("1", "8"),
      {
        5: [(currentSheet) => {
          calls.push(`5:${currentSheet.name}`)
          return { ...currentSheet, name: "after-5" }
        }],
        8: [(currentSheet) => {
          calls.push(`8:${currentSheet.name}`)
          return { ...currentSheet, name: "after-8" }
        }],
      },
    )

    expect(calls).toEqual(["5:start", "8:after-5"])
    expect(sheet.name).toBe("after-8")
  })
})

describe("attribute mark upgrade state metadata", () => {
  it("only preserves attributeMarksApplied for checked attribute upgrade states", () => {
    expect(
      sanitizeUpgradeStates({
        attributeUpgrade: {
          checked: true,
          params: { attributes: ["agility", "strength"] },
          attributeMarksApplied: true,
        },
        targetUpgrade: {
          checked: true,
          params: { target: "evasion" },
          attributeMarksApplied: true,
        },
        uncheckedAttributeUpgrade: {
          checked: false,
          params: { attributes: ["finesse", "instinct"] },
          attributeMarksApplied: true,
        },
      }),
    ).toEqual({
      attributeUpgrade: {
        checked: true,
        params: { attributes: ["agility", "strength"] },
        attributeMarksApplied: true,
      },
      targetUpgrade: {
        checked: true,
        params: { target: "evasion" },
      },
      uncheckedAttributeUpgrade: { checked: false },
    })
  })

  it("preserves attributeMarksApplied while merging checked attribute upgrade params", () => {
    expect(
      mergeUpgradeState(undefined, {
        checked: true,
        params: { attributes: ["agility", "strength"] },
        attributeMarksApplied: true,
      }),
    ).toEqual({
      checked: true,
      params: { attributes: ["agility", "strength"] },
      attributeMarksApplied: true,
    })

    expect(
      mergeUpgradeState(
        {
          checked: true,
          params: { attributes: ["agility", "strength"] },
          attributeMarksApplied: true,
        },
        { checked: true },
      ),
    ).toEqual({
      checked: true,
      params: { attributes: ["agility", "strength"] },
      attributeMarksApplied: true,
    })

    expect(
      mergeUpgradeState(
        {
          checked: true,
          params: { attributes: ["agility", "strength"] },
          attributeMarksApplied: true,
        },
        { checked: false },
      ),
    ).toEqual({ checked: false })
  })
})
