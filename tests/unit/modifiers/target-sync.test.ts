import { describe, expect, it } from "vitest"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { createUnknownMigrationDifference } from "@/lib/modifiers/other-adjustments"
import { applyAutoCalculationForTargets } from "@/lib/modifiers/target-sync"
import type { SheetData } from "@/lib/sheet-data"

function sheet(overrides: Partial<SheetData> = {}): SheetData {
  return {
    ...defaultSheetData,
    ...overrides,
  }
}

describe("target auto calculation helper", () => {
  it("starts hp and stress max as blank finals without hidden default bases", () => {
    expect(defaultSheetData.hpMax).toBe("")
    expect(defaultSheetData.stressMax).toBe("")
  })

  it("writes auto calculation target from its reference total", () => {
    const data = sheet({
      evasion: "10",
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Base", value: 12 },
        },
        {
          id: "user:evasion-mod",
          definition: { target: "evasion", kind: "modifier" },
          editable: { label: "Mod", value: 1 },
        },
      ],
      modifierState: {
        targetStates: { evasion: { activeBaseId: "user:evasion-base", autoCalculation: true } },
        entryStates: {},
      },
    })

    const result = applyAutoCalculationForTargets(data)

    expect(result.evasion).toBe("13")
  })

  it("writes auto calculation target from calculated final total including saved other", () => {
    const data = sheet({
      evasion: "10",
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Base", value: 12 },
        },
      ],
      otherAdjustments: [createUnknownMigrationDifference("evasion", 2)],
      modifierState: {
        targetStates: { evasion: { activeBaseId: "user:evasion-base", autoCalculation: true } },
        entryStates: {},
      },
    })

    const result = applyAutoCalculationForTargets(data)

    expect(result.evasion).toBe("14")
  })

  it("writes targets by default when auto calculation state is missing", () => {
    const data = sheet({
      evasion: "10",
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Base", value: 12 },
        },
      ],
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: "user:evasion-base" },
        },
        entryStates: {},
      },
    })

    const result = applyAutoCalculationForTargets(data)

    expect(result.evasion).toBe("12")
  })

  it("does not write explicitly disabled auto calculation targets", () => {
    const data = sheet({
      evasion: "10",
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Base", value: 12 },
        },
      ],
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: "user:evasion-base", autoCalculation: false },
          proficiency: { activeBaseId: "level:base:proficiency" },
        },
        entryStates: {},
      },
    })

    const result = applyAutoCalculationForTargets(data)

    expect(result).toBe(data)
    expect(result.evasion).toBe("10")
  })

  it("does not overwrite non-numeric current finals", () => {
    const data = sheet({
      evasion: "12+敏捷",
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Base", value: 12 },
        },
      ],
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: "user:evasion-base", autoCalculation: true },
          proficiency: { activeBaseId: "level:base:proficiency" },
        },
        entryStates: {},
      },
    })

    const result = applyAutoCalculationForTargets(data)

    expect(result).toBe(data)
    expect(result.evasion).toBe("12+敏捷")
  })

  it("records active base when the auto calculated final already matches", () => {
    const data = sheet({
      evasion: "12",
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Base", value: 12 },
        },
      ],
      modifierState: {
        targetStates: {
          proficiency: { activeBaseId: "level:base:proficiency" },
        },
        entryStates: {},
      },
    })

    const result = applyAutoCalculationForTargets(data)

    expect(result).not.toBe(data)
    expect(result.evasion).toBe("12")
    expect(result.modifierState?.targetStates.evasion?.activeBaseId).toBe("user:evasion-base")
  })

  it("fills blank current finals from reference totals", () => {
    const data = sheet({
      evasion: "",
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Base", value: 12 },
        },
      ],
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: "user:evasion-base", autoCalculation: true },
        },
        entryStates: {},
      },
    })

    const result = applyAutoCalculationForTargets(data)

    expect(result.evasion).toBe("12")
  })

  it("clears auto calculation finals when a target has no base", () => {
    const data = sheet({
      evasion: "10",
      hpMax: 9,
      stressMax: 8,
      armorMax: 3,
      minorThreshold: "12",
      majorThreshold: "24",
      modifierState: {
        targetStates: {
          evasion: { autoCalculation: true },
          hpMax: { autoCalculation: true },
          stressMax: { autoCalculation: true },
          armorMax: { autoCalculation: true },
          minorThreshold: { autoCalculation: true },
          majorThreshold: { autoCalculation: true },
        },
        entryStates: {},
      },
    })

    const result = applyAutoCalculationForTargets(data)

    expect(result).not.toBe(data)
    expect(result.evasion).toBe("")
    expect(result.hpMax).toBe("")
    expect(result.stressMax).toBe("")
    expect(result.armorMax).toBe("")
    expect(result.minorThreshold).toBe("")
    expect(result.majorThreshold).toBe("")
  })

  it("keeps manual finals when auto calculation is disabled and a target has no base", () => {
    const data = sheet({
      evasion: "10",
      hpMax: 9,
      stressMax: 8,
      armorMax: 3,
      modifierState: {
        targetStates: {
          evasion: { autoCalculation: false },
          hpMax: { autoCalculation: false },
          stressMax: { autoCalculation: false },
          armorMax: { autoCalculation: false },
          proficiency: { activeBaseId: "level:base:proficiency" },
        },
        entryStates: {},
      },
    })

    const result = applyAutoCalculationForTargets(data)

    expect(result).toBe(data)
    expect(result.evasion).toBe("10")
    expect(result.hpMax).toBe(9)
    expect(result.stressMax).toBe(8)
    expect(result.armorMax).toBe(3)
  })

  it("falls back to another base when the saved active base disappeared", () => {
    const data = sheet({
      evasion: "10",
      userModifierContributions: [
        {
          id: "user:evasion-fallback-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Fallback", value: 14 },
        },
      ],
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: "user:evasion-missing-base", autoCalculation: true },
        },
        entryStates: {},
      },
    })

    const result = applyAutoCalculationForTargets(data)

    expect(result.evasion).toBe("14")
  })

  it("returns the same object when no auto value changes", () => {
    const data = sheet({
      evasion: "12",
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Base", value: 12 },
        },
      ],
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: "user:evasion-base", autoCalculation: true },
          proficiency: { activeBaseId: "level:base:proficiency" },
        },
        entryStates: {},
      },
    })

    expect(applyAutoCalculationForTargets(data)).toBe(data)
  })

  it("clamps HP boxes when auto calculation lowers hpMax from source changes", () => {
    const data = sheet({
      hp: Array(18).fill(false).map((_, index) => index < 6),
      hpMax: 6,
      userModifierContributions: [
        {
          id: "user:hp-base",
          definition: { target: "hpMax", kind: "base" },
          editable: { label: "Base", value: 3 },
        },
      ],
      modifierState: {
        targetStates: {
          hpMax: { activeBaseId: "user:hp-base", autoCalculation: true },
        },
        entryStates: {},
      },
    })

    const result = applyAutoCalculationForTargets(data)

    expect(result.hpMax).toBe(3)
    expect(result.hp?.slice(0, 6)).toEqual([true, true, true, false, false, false])
  })

  it("clears sparse legacy HP boxes at indexes outside the synced hpMax", () => {
    const data = sheet({
      hp: [false, false, false, true],
      hpMax: 6,
      userModifierContributions: [
        {
          id: "user:hp-base",
          definition: { target: "hpMax", kind: "base" },
          editable: { label: "Base", value: 3 },
        },
      ],
      modifierState: {
        targetStates: {
          hpMax: { activeBaseId: "user:hp-base", autoCalculation: true },
        },
        entryStates: {},
      },
    })

    const result = applyAutoCalculationForTargets(data)

    expect(result.hpMax).toBe(3)
    expect(result.hp).toEqual([false, false, false, false])
  })
})
