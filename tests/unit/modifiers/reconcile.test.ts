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
})
