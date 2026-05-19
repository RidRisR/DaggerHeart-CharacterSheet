import { describe, expect, it } from "vitest"

import { defaultSheetData } from "@/lib/default-sheet-data"
import {
  deleteSpecialBase,
  disableAutoCalculationForTarget,
  enableAutoCalculationForTarget,
  reconcileFinalInput,
} from "@/lib/modifiers/final-input-reconciliation"
import {
  createManualFinalAdjustment,
  createUnattributedDifference,
  createUnknownMigrationDifference,
  getOtherAdjustmentId,
} from "@/lib/modifiers/other-adjustments"
import {
  createUnattributedDeltaContribution,
  createManualBaseContribution,
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

  it("creates a manual base from arithmetic expression final input", () => {
    const reconciled = reconcileFinalInput(sheet(), "evasion", "6+4")

    expect(reconciled.evasion).toBe("10")
    expect(reconciled.userModifierContributions).toEqual([
      createManualBaseContribution("evasion", 10),
    ])
    expect(reconciled.modifierState?.targetStates.evasion).toEqual({
      activeBaseId: getManualBaseId("evasion"),
      autoCalculation: true,
    })
  })

  it("clears same-target saved other adjustments when numeric final creates a manual base without an existing base", () => {
    const otherTargetAdjustment = createUnknownMigrationDifference("armorMax", 2)
    const reconciled = reconcileFinalInput(sheet({
      otherAdjustments: [
        createUnknownMigrationDifference("evasion", 1),
        createManualFinalAdjustment("evasion", 3),
        createUnattributedDifference("evasion", 4),
        otherTargetAdjustment,
      ],
    }), "evasion", "12")

    expect(reconciled.evasion).toBe("12")
    expect(reconciled.userModifierContributions).toEqual([
      createManualBaseContribution("evasion", 12),
    ])
    expect(reconciled.otherAdjustments).toEqual([otherTargetAdjustment])
    expect(reconciled.modifierState?.targetStates.evasion).toEqual({
      activeBaseId: getManualBaseId("evasion"),
      autoCalculation: true,
    })
  })

  it("creates a manual final adjustment when final input differs from an existing base", () => {
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
    expect(reconciled.otherAdjustments).toContainEqual(createManualFinalAdjustment("evasion", 3))
    expect(reconciled.userModifierContributions?.some(
      contribution => contribution.id === getUnattributedDeltaId("evasion"),
    )).toBe(false)
    expect(reconciled.modifierState?.targetStates.evasion).toEqual({
      activeBaseId: getManualBaseId("evasion"),
      autoCalculation: true,
    })
  })

  it("deletes an old unattributed delta when the new final matches the reference total without it", () => {
    const reconciled = reconcileFinalInput(sheet({
      userModifierContributions: [
        createManualBaseContribution("evasion", 12),
      ],
      otherAdjustments: [createManualFinalAdjustment("evasion", 3)],
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
    expect(reconciled.otherAdjustments).toEqual([])
  })

  it("subtracts non-manual other adjustments when creating a manual final adjustment", () => {
    const reconciled = reconcileFinalInput(sheet({
      userModifierContributions: [createManualBaseContribution("evasion", 12)],
      otherAdjustments: [createUnknownMigrationDifference("evasion", 1)],
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: getManualBaseId("evasion"), autoCalculation: true },
        },
        entryStates: {},
      },
    }), "evasion", "15")

    expect(reconciled.otherAdjustments).toEqual([
      createUnknownMigrationDifference("evasion", 1),
      createManualFinalAdjustment("evasion", 2),
    ])
  })

  it("updates an existing manual final adjustment without double-counting it", () => {
    const reconciled = reconcileFinalInput(sheet({
      userModifierContributions: [createManualBaseContribution("evasion", 12)],
      otherAdjustments: [
        createUnknownMigrationDifference("evasion", 1),
        createManualFinalAdjustment("evasion", 2),
      ],
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: getManualBaseId("evasion"), autoCalculation: true },
        },
        entryStates: {},
      },
    }), "evasion", "16")

    expect(reconciled.otherAdjustments).toEqual([
      createUnknownMigrationDifference("evasion", 1),
      createManualFinalAdjustment("evasion", 3),
    ])
  })

  it("removes the manual final adjustment when final matches reference plus non-manual other", () => {
    const reconciled = reconcileFinalInput(sheet({
      userModifierContributions: [createManualBaseContribution("evasion", 12)],
      otherAdjustments: [
        createUnknownMigrationDifference("evasion", 1),
        createManualFinalAdjustment("evasion", 2),
      ],
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: getManualBaseId("evasion"), autoCalculation: true },
        },
        entryStates: {},
      },
    }), "evasion", "13")

    expect(reconciled.otherAdjustments).toEqual([
      createUnknownMigrationDifference("evasion", 1),
    ])
  })

  it("returns the same object for non-numeric input", () => {
    const original = sheet({
      evasion: "12",
      userModifierContributions: [createManualBaseContribution("evasion", 12)],
    })

    expect(reconcileFinalInput(original, "evasion", "12+敏捷")).toBe(original)
  })

  it("enables auto calculation by materializing nonzero unattributed difference after saved other", () => {
    const reconciled = enableAutoCalculationForTarget(sheet({
      evasion: "15",
      userModifierContributions: [createManualBaseContribution("evasion", 12)],
      otherAdjustments: [createUnknownMigrationDifference("evasion", 1)],
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
    expect(reconciled.otherAdjustments).toEqual([
      createUnknownMigrationDifference("evasion", 1),
      createUnattributedDifference("evasion", 2),
    ])
  })

  it("enables auto calculation by removing zero unattributed difference", () => {
    const reconciled = enableAutoCalculationForTarget(sheet({
      evasion: "13",
      userModifierContributions: [createManualBaseContribution("evasion", 12)],
      otherAdjustments: [
        createUnknownMigrationDifference("evasion", 1),
        createUnattributedDifference("evasion", 5),
      ],
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: getManualBaseId("evasion") },
        },
        entryStates: {},
      },
    }), "evasion")

    expect(reconciled.evasion).toBe("13")
    expect(reconciled.otherAdjustments).toEqual([
      createUnknownMigrationDifference("evasion", 1),
    ])
  })

  it("enables auto calculation without creating source state when no reference total exists", () => {
    const reconciled = enableAutoCalculationForTarget(sheet({
      evasion: "12",
      modifierState: {
        targetStates: {
          evasion: { autoCalculation: false },
        },
        entryStates: {},
      },
    }), "evasion")

    expect(reconciled.evasion).toBe("12")
    expect(reconciled.userModifierContributions).toEqual([])
    expect(reconciled.otherAdjustments ?? []).toEqual([])
    expect(reconciled.modifierState?.targetStates.evasion).toEqual({
      autoCalculation: true,
    })
  })

  it("disables auto calculation by deleting saved unattributed difference and preserving final", () => {
    const reconciled = disableAutoCalculationForTarget(sheet({
      evasion: "15",
      userModifierContributions: [createManualBaseContribution("evasion", 12)],
      otherAdjustments: [
        createUnknownMigrationDifference("evasion", 1),
        createUnattributedDifference("evasion", 2),
      ],
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: getManualBaseId("evasion"), autoCalculation: true },
        },
        entryStates: {},
      },
    }), "evasion")

    expect(reconciled.evasion).toBe("15")
    expect(reconciled.otherAdjustments).toEqual([
      createUnknownMigrationDifference("evasion", 1),
    ])
    expect(reconciled.modifierState?.targetStates.evasion).toEqual({
      activeBaseId: getManualBaseId("evasion"),
      autoCalculation: false,
    })
  })

  it("falls forward after deleting an active special base and preserves final with manual final adjustment", () => {
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
    expect(reconciled.userModifierContributions?.some(
      contribution => contribution.id === getUnattributedDeltaId("evasion"),
    )).toBe(false)
    expect(reconciled.otherAdjustments).toContainEqual(createManualFinalAdjustment("evasion", 1))
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
    expect(reconciled.userModifierContributions?.some(
      contribution => contribution.id === getUnattributedDeltaId("evasion"),
    )).toBe(false)
    expect(reconciled.otherAdjustments).toContainEqual(createManualFinalAdjustment("evasion", 1))
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
    expect(reconciled.otherAdjustments?.some(
      adjustment => adjustment.id === getOtherAdjustmentId("evasion", "manualFinalAdjustment"),
    )).toBe(false)
    expect(reconciled.modifierState?.targetStates.evasion).toEqual({
      autoCalculation: true,
    })
  })

  it("clears same-target saved other adjustments when deleting the last base", () => {
    const manualBase = createManualBaseContribution("evasion", 12)
    const unattributedDelta = createUnattributedDeltaContribution("evasion", 3)
    const otherTargetAdjustment = createUnknownMigrationDifference("armorMax", 2)
    const reconciled = deleteSpecialBase(sheet({
      evasion: "15",
      userModifierContributions: [manualBase, unattributedDelta],
      otherAdjustments: [
        createUnknownMigrationDifference("evasion", 1),
        createManualFinalAdjustment("evasion", 3),
        createUnattributedDifference("evasion", 4),
        otherTargetAdjustment,
      ],
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: manualBase.id, autoCalculation: true },
        },
        entryStates: {},
      },
    }), "evasion", manualBase.id)

    expect(reconciled.evasion).toBe("15")
    expect(reconciled.userModifierContributions).not.toContainEqual(manualBase)
    expect(reconciled.userModifierContributions?.some(entry => entry.id === getUnattributedDeltaId("evasion"))).toBe(false)
    expect(reconciled.otherAdjustments).toEqual([otherTargetAdjustment])
    expect(reconciled.modifierState?.targetStates.evasion).toEqual({
      autoCalculation: true,
    })
  })
})
