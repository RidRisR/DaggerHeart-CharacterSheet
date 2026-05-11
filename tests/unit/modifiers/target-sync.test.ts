import { describe, expect, it } from "vitest"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { applyContinuousTargetSync, getTargetSyncFallbackValue, syncTargetOnce } from "@/lib/modifiers/target-sync"
import type { SheetData } from "@/lib/sheet-data"

function sheet(overrides: Partial<SheetData> = {}): SheetData {
  return {
    ...defaultSheetData,
    ...overrides,
  }
}

describe("target sync helper", () => {
  it("syncs a target once from its reference total", () => {
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
        targetStates: { evasion: { activeBaseId: "user:evasion-base" } },
        entryStates: {},
      },
    })

    const result = syncTargetOnce(data, "evasion")

    expect(result.applied).toBe(true)
    expect(result.sheetData.evasion).toBe("13")
  })

  it("does not sync once when target has no active base", () => {
    const data = sheet({
      evasion: "10",
      userModifierContributions: [
        {
          id: "user:evasion-mod",
          definition: { target: "evasion", kind: "modifier" },
          editable: { label: "Mod", value: 1 },
        },
      ],
      modifierState: { targetStates: {}, entryStates: {} },
    })

    const result = syncTargetOnce(data, "evasion")

    expect(result.applied).toBe(false)
    expect(result.sheetData).toBe(data)
  })

  it("applies continuous sync for all continuous targets", () => {
    const data = sheet({
      evasion: "10",
      hpMax: 6,
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Base", value: 12 },
        },
        {
          id: "user:hp-base",
          definition: { target: "hpMax", kind: "base" },
          editable: { label: "HP", value: 7 },
        },
      ],
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: "user:evasion-base", syncMode: "continuous" },
          hpMax: { activeBaseId: "user:hp-base", syncMode: "manual" },
        },
        entryStates: {},
      },
    })

    const result = applyContinuousTargetSync(data)

    expect(result.evasion).toBe("12")
    expect(result.hpMax).toBe(6)
  })

  it("uses fallback when continuous target has no base", () => {
    const data = sheet({
      evasion: "10",
      hpMax: 9,
      stressMax: 8,
      armorMax: 3,
      modifierState: {
        targetStates: {
          evasion: { syncMode: "continuous" },
          hpMax: { syncMode: "continuous" },
          stressMax: { syncMode: "continuous" },
          armorMax: { syncMode: "continuous" },
        },
        entryStates: {},
      },
    })

    const result = applyContinuousTargetSync(data)

    expect(result.evasion).toBe("")
    expect(result.hpMax).toBe(6)
    expect(result.stressMax).toBe(6)
    expect(result.armorMax).toBe("")
  })

  it("returns the same object when no synced value changes", () => {
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
        targetStates: { evasion: { activeBaseId: "user:evasion-base", syncMode: "continuous" } },
        entryStates: {},
      },
    })

    expect(applyContinuousTargetSync(data)).toBe(data)
  })

  it("defines fallback values for known target families", () => {
    expect(getTargetSyncFallbackValue("agility.value")).toBe("")
    expect(getTargetSyncFallbackValue("experienceValues.0")).toBe("")
    expect(getTargetSyncFallbackValue("minorThreshold")).toBe("")
    expect(getTargetSyncFallbackValue("hpMax")).toBe(6)
    expect(getTargetSyncFallbackValue("stressMax")).toBe(6)
    expect(getTargetSyncFallbackValue("armorMax")).toBe("")
    expect(getTargetSyncFallbackValue("proficiency")).toBeUndefined()
  })
})
