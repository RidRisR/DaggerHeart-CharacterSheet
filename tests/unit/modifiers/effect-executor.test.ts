import { describe, expect, it } from "vitest"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { applyEffects, revertEffects } from "@/lib/modifiers/effect-executor"
import type { ModifierTargetId } from "@/lib/modifiers/types"

describe("modifier effect executor", () => {
  it("applies and reverts add effects on string numeric targets", () => {
    const sheetData = { ...defaultSheetData, evasion: "12" }

    const applied = applyEffects(sheetData, [{ operation: "add", target: "evasion", value: 1 }])
    expect(applied.sheetData.evasion).toBe("13")
    expect(applied.updates).toEqual({ evasion: "13" })
    expect(applied.warnings).toEqual([])

    const reverted = revertEffects(applied.sheetData, [{ operation: "add", target: "evasion", value: 1 }])
    expect(reverted.sheetData.evasion).toBe("12")
    expect(reverted.updates).toEqual({ evasion: "12" })
  })

  it("skips add effects when target cannot be parsed as a pure number", () => {
    const sheetData = { ...defaultSheetData, evasion: "12+敏捷" }

    const result = applyEffects(sheetData, [{ operation: "add", target: "evasion", value: 1 }])

    expect(result.sheetData.evasion).toBe("12+敏捷")
    expect(result.updates).toEqual({})
    expect(result.warnings).toEqual([
      "evasion 当前值无法解析为数字，已跳过 +1",
    ])
  })

  it("adds string decimal targets without rounding", () => {
    const sheetData = { ...defaultSheetData, evasion: "1.2" }

    const result = applyEffects(sheetData, [{ operation: "add", target: "evasion", value: 1 }])

    expect(result.sheetData.evasion).toBe("2.2")
    expect(result.updates).toEqual({ evasion: "2.2" })
  })

  it("treats direct final value edits as the new current value for revert", () => {
    const sheetData = { ...defaultSheetData, evasion: "20" }

    const result = revertEffects(sheetData, [{ operation: "add", target: "evasion", value: 1 }])

    expect(result.sheetData.evasion).toBe("19")
    expect(result.updates).toEqual({ evasion: "19" })
  })

  it("adds to attribute values without replacing checked or spellcasting flags", () => {
    const sheetData = {
      ...defaultSheetData,
      agility: { checked: false, value: "2", spellcasting: true },
    }

    const result = applyEffects(sheetData, [{ operation: "add", target: "agility.value", value: 1 }])

    expect(result.sheetData.agility).toEqual({
      checked: false,
      value: "3",
      spellcasting: true,
    })
  })

  it("adds to experience values by index", () => {
    const sheetData = {
      ...defaultSheetData,
      experienceValues: ["1", "2", "", "", ""],
    }

    const result = applyEffects(sheetData, [{ operation: "add", target: "experienceValues.1", value: 1 }])

    expect(result.sheetData.experienceValues).toEqual(["1", "3", "", "", ""])
  })

  it("skips malformed experience targets without writing by partial index", () => {
    const sheetData = {
      ...defaultSheetData,
      experienceValues: ["1", "2", "", "", ""],
    }
    const malformedTarget = "experienceValues.1.foo" as ModifierTargetId

    const result = applyEffects(sheetData, [{ operation: "add", target: malformedTarget, value: 1 }])

    expect(result.sheetData.experienceValues).toEqual(["1", "2", "", "", ""])
    expect(result.updates).toEqual({})
    expect(result.warnings).toEqual([
      "experienceValues.1.foo 当前值无法解析为数字，已跳过 +1",
    ])
  })

  it("accumulates duplicate add effects on the same target", () => {
    const sheetData = { ...defaultSheetData, evasion: "12" }

    const result = applyEffects(sheetData, [
      { operation: "add", target: "evasion", value: 1 },
      { operation: "add", target: "evasion", value: 2 },
    ])

    expect(result.sheetData.evasion).toBe("15")
    expect(result.updates).toEqual({ evasion: "15" })
  })

  it("adds to hpMax and stressMax numeric targets", () => {
    const sheetData = { ...defaultSheetData, hpMax: 6, stressMax: 6 }

    const result = applyEffects(sheetData, [
      { operation: "add", target: "hpMax", value: 1 },
      { operation: "add", target: "stressMax", value: 1 },
    ])

    expect(result.sheetData.hpMax).toBe(7)
    expect(result.sheetData.stressMax).toBe(7)
  })

  it("adds and reverts proficiency count while preserving boolean array storage", () => {
    const sheetData = {
      ...defaultSheetData,
      proficiency: [true, false, false, false, false, false],
    }

    const applied = applyEffects(sheetData, [{ operation: "add", target: "proficiency", value: 1 }])
    expect(applied.sheetData.proficiency).toEqual([true, true, false, false, false, false])

    const reverted = revertEffects(applied.sheetData, [{ operation: "add", target: "proficiency", value: 1 }])
    expect(reverted.sheetData.proficiency).toEqual([true, false, false, false, false, false])
  })

  it("does not report proficiency updates when already saturated at bounds", () => {
    const maxed = {
      ...defaultSheetData,
      proficiency: [true, true, true, true, true, true],
    }
    const emptied = {
      ...defaultSheetData,
      proficiency: [false, false, false, false, false, false],
    }

    const maxResult = applyEffects(maxed, [{ operation: "add", target: "proficiency", value: 1 }])
    const minResult = revertEffects(emptied, [{ operation: "add", target: "proficiency", value: 1 }])

    expect(maxResult.sheetData.proficiency).toBe(maxed.proficiency)
    expect(maxResult.updates).toEqual({})
    expect(minResult.sheetData.proficiency).toBe(emptied.proficiency)
    expect(minResult.updates).toEqual({})
  })
})
