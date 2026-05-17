import { describe, expect, it } from "vitest"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { reconcileModifierState } from "@/lib/modifiers/reconcile"
import type { SheetData } from "@/lib/sheet-data"

describe("modifier state reconciliation", () => {
  it("removes entry state for ids not in active registry", () => {
    const sheetData = {
      ...defaultSheetData,
      modifierState: {
        targetStates: {},
        entryStates: {
          "missing:entry": { enabled: false },
          "level:current:minorThreshold": { enabled: false },
        },
      },
      level: "1",
    } satisfies SheetData

    const reconciled = reconcileModifierState(sheetData)

    expect(reconciled.modifierState?.entryStates).toEqual({
      "level:current:minorThreshold": { enabled: false },
    })
  })

  it("removes active base ids that do not resolve to current base entries", () => {
    const sheetData = {
      ...defaultSheetData,
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: "missing:base" },
          proficiency: { activeBaseId: "level:base:proficiency" },
        },
        entryStates: {},
      },
      level: "1",
    } satisfies SheetData

    const reconciled = reconcileModifierState(sheetData)

    expect(reconciled.modifierState?.targetStates).toEqual({
      proficiency: { activeBaseId: "level:base:proficiency" },
    })
  })

  it("preserves auto calculation when active base is still valid", () => {
    const sheetData = {
      ...defaultSheetData,
      userModifierContributions: [{
        id: "user:evasion-base",
        definition: { target: "evasion", kind: "base" },
        editable: { label: "Base", value: 12 },
      }],
      modifierState: {
        targetStates: {
          evasion: {
            activeBaseId: "user:evasion-base",
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
    } as any

    const reconciled = reconcileModifierState(sheetData)

    expect(reconciled.modifierState?.targetStates.evasion).toEqual({
      activeBaseId: "user:evasion-base",
      autoCalculation: true,
    })
  })

  it("normalizes legacy continuous sync mode to auto calculation", () => {
    const sheetData = {
      ...defaultSheetData,
      userModifierContributions: [{
        id: "user:evasion-base",
        definition: { target: "evasion", kind: "base" },
        editable: { label: "Base", value: 12 },
      }],
      modifierState: {
        targetStates: {
          evasion: {
            activeBaseId: "user:evasion-base",
            syncMode: "continuous",
          },
        },
        entryStates: {},
      },
    } as any

    const reconciled = reconcileModifierState(sheetData)

    expect(reconciled.modifierState?.targetStates.evasion).toEqual({
      activeBaseId: "user:evasion-base",
      autoCalculation: true,
    })
  })

  it("keeps auto calculation when active base becomes orphaned", () => {
    const sheetData = {
      ...defaultSheetData,
      modifierState: {
        targetStates: {
          evasion: {
            activeBaseId: "missing:base",
            syncMode: "continuous",
          },
        },
        entryStates: {},
      },
    } as any

    const reconciled = reconcileModifierState(sheetData)

    expect(reconciled.modifierState?.targetStates.evasion).toEqual({
      autoCalculation: true,
    })
  })
})
