import { describe, expect, it } from "vitest"

import { defaultSheetData } from "@/lib/default-sheet-data"
import {
  deleteSpecialBase,
  enableAutoCalculationForTarget,
  reconcileFinalInput,
} from "@/lib/modifiers/final-input-reconciliation"
import {
  createManualBaseContribution,
  createUnattributedDeltaContribution,
  getManualBaseId,
  getUnattributedDeltaId,
} from "@/lib/modifiers/special-contributions"
import type { SheetData } from "@/lib/sheet-data"

function sheet(overrides: Partial<SheetData> = {}): SheetData {
  return {
    ...defaultSheetData,
    evasion: "",
    userModifierContributions: [],
    modifierState: {
      targetStates: {},
      entryStates: {},
    },
    ...overrides,
  }
}

describe("final input reconciliation", () => {
  it("creates a manual base and enables auto calculation when no base exists", () => {
    const reconciled = reconcileFinalInput(sheet(), "evasion", "12")

    expect(reconciled.evasion).toBe("12")
    expect(reconciled.userModifierContributions).toEqual([
      createManualBaseContribution("evasion", 12),
    ])
    expect(reconciled.modifierState?.targetStates.evasion).toEqual({
      activeBaseId: getManualBaseId("evasion"),
      autoCalculation: true,
    })
  })

  it("creates an unattributed delta when final input differs from an existing base", () => {
    const reconciled = reconcileFinalInput(sheet({
      userModifierContributions: [createManualBaseContribution("evasion", 12)],
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: getManualBaseId("evasion"), autoCalculation: true },
        },
        entryStates: {},
      },
    }), "evasion", "15")

    expect(reconciled.evasion).toBe("15")
    expect(reconciled.userModifierContributions).toContainEqual(
      createUnattributedDeltaContribution("evasion", 3),
    )
    expect(reconciled.modifierState?.targetStates.evasion).toEqual({
      activeBaseId: getManualBaseId("evasion"),
      autoCalculation: true,
    })
  })

  it("deletes an old unattributed delta when the new final matches the reference total without it", () => {
    const reconciled = reconcileFinalInput(sheet({
      userModifierContributions: [
        createManualBaseContribution("evasion", 12),
        createUnattributedDeltaContribution("evasion", 3),
      ],
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: getManualBaseId("evasion"), autoCalculation: true },
        },
        entryStates: {},
      },
    }), "evasion", "12")

    expect(reconciled.evasion).toBe("12")
    expect(reconciled.userModifierContributions).toEqual([
      createManualBaseContribution("evasion", 12),
    ])
  })

  it("returns the same object for non-numeric input", () => {
    const original = sheet({
      evasion: "12",
      userModifierContributions: [createManualBaseContribution("evasion", 12)],
    })

    expect(reconcileFinalInput(original, "evasion", "12+敏捷")).toBe(original)
  })

  it("enables auto calculation by preserving numeric final value through an unattributed delta", () => {
    const reconciled = enableAutoCalculationForTarget(sheet({
      evasion: "15",
      userModifierContributions: [createManualBaseContribution("evasion", 12)],
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: getManualBaseId("evasion") },
        },
        entryStates: {},
      },
    }), "evasion")

    expect(reconciled.evasion).toBe("15")
    expect(reconciled.modifierState?.targetStates.evasion).toEqual({
      activeBaseId: getManualBaseId("evasion"),
      autoCalculation: true,
    })
    expect(reconciled.userModifierContributions).toContainEqual(
      createUnattributedDeltaContribution("evasion", 3),
    )
  })

  it("falls forward after deleting an active special base and preserves final with delta", () => {
    const manualBase = createManualBaseContribution("evasion", 12)
    const otherBase = {
      ...createManualBaseContribution("evasion", 14),
      id: "user:evasion:other-base",
      editable: {
        label: "另一基础值",
        value: 14,
      },
    }
    const reconciled = deleteSpecialBase(sheet({
      evasion: "15",
      userModifierContributions: [manualBase, otherBase],
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: manualBase.id, autoCalculation: true },
        },
        entryStates: {},
      },
    }), "evasion", manualBase.id)

    expect(reconciled.evasion).toBe("15")
    expect(reconciled.userModifierContributions).not.toContainEqual(manualBase)
    expect(reconciled.userModifierContributions).toContainEqual(otherBase)
    expect(reconciled.userModifierContributions).toContainEqual(
      createUnattributedDeltaContribution("evasion", 1),
    )
    expect(reconciled.modifierState?.targetStates.evasion).toEqual({
      activeBaseId: otherBase.id,
      autoCalculation: true,
    })
  })

  it("keeps the active base when deleting an inactive special base", () => {
    const earlierBase = {
      ...createManualBaseContribution("evasion", 10),
      id: "user:evasion-aaa-base",
      editable: {
        label: "排序靠前基础值",
        value: 10,
      },
    }
    const activeBase = {
      ...createManualBaseContribution("evasion", 14),
      id: "user:evasion-existing-base",
      editable: {
        label: "现有基础值",
        value: 14,
      },
    }
    const inactiveManualBase = createManualBaseContribution("evasion", 12)

    const reconciled = deleteSpecialBase(sheet({
      evasion: "15",
      userModifierContributions: [inactiveManualBase, earlierBase, activeBase],
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: activeBase.id, autoCalculation: true },
        },
        entryStates: {},
      },
    }), "evasion", inactiveManualBase.id)

    expect(reconciled.evasion).toBe("15")
    expect(reconciled.userModifierContributions).not.toContainEqual(inactiveManualBase)
    expect(reconciled.userModifierContributions).toContainEqual(earlierBase)
    expect(reconciled.userModifierContributions).toContainEqual(activeBase)
    expect(reconciled.userModifierContributions).toContainEqual(
      createUnattributedDeltaContribution("evasion", 1),
    )
    expect(reconciled.modifierState?.targetStates.evasion).toEqual({
      activeBaseId: activeBase.id,
      autoCalculation: true,
    })
  })

  it("clears active base without creating a replacement when the last base is deleted", () => {
    const manualBase = createManualBaseContribution("evasion", 12)
    const reconciled = deleteSpecialBase(sheet({
      evasion: "15",
      userModifierContributions: [manualBase],
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: manualBase.id, autoCalculation: true },
        },
        entryStates: {},
      },
    }), "evasion", manualBase.id)

    expect(reconciled.userModifierContributions).not.toContainEqual(manualBase)
    expect(reconciled.userModifierContributions?.some(entry => entry.id === getUnattributedDeltaId("evasion"))).toBe(false)
    expect(reconciled.modifierState?.targetStates.evasion).toEqual({
      autoCalculation: true,
    })
  })
})
