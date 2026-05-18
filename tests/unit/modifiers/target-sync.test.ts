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
        },
        entryStates: {},
      },
    })

    const result = applyAutoCalculationForTargets(data)

    expect(result).toBe(data)
    expect(result.evasion).toBe("12+敏捷")
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

  it("keeps existing values without fallback when auto target has no reference total", () => {
    const data = sheet({
      evasion: "10",
      hpMax: 9,
      stressMax: 8,
      armorMax: 3,
      modifierState: {
        targetStates: {
          evasion: { autoCalculation: true },
          hpMax: { autoCalculation: true },
          stressMax: { autoCalculation: true },
          armorMax: { autoCalculation: true },
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
        targetStates: { evasion: { activeBaseId: "user:evasion-base", autoCalculation: true } },
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
