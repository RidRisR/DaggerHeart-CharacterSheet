import { describe, expect, it } from "vitest"
import { resetSheetStore, sheet, store } from "../automation/test-helpers"

describe("modifier store actions", () => {
  it("sets active base for a target", () => {
    resetSheetStore()

    store().setActiveModifierBase("evasion", "user:evasion-base")

    expect(sheet().modifierState?.targetStates.evasion?.activeBaseId).toBe("user:evasion-base")
  })

  it("toggles modifier entry enabled state", () => {
    resetSheetStore()

    store().setModifierEntryEnabled("upgrade:evasion", false)
    expect(sheet().modifierState?.entryStates["upgrade:evasion"]).toEqual({ enabled: false })

    store().setModifierEntryEnabled("upgrade:evasion", true)
    expect(sheet().modifierState?.entryStates["upgrade:evasion"]).toBeUndefined()
  })

  it("adds user modifier contributions", () => {
    resetSheetStore()

    store().upsertUserModifierContribution({
      id: "user:evasion-mod",
      definition: {
        target: "evasion",
        kind: "modifier",
      },
      editable: {
        label: "临时加值",
        value: 2,
      },
    })

    expect(sheet().userModifierContributions).toEqual([
      {
        id: "user:evasion-mod",
        definition: {
          target: "evasion",
          kind: "modifier",
        },
        editable: {
          label: "临时加值",
          value: 2,
        },
      },
    ])
  })

  it("records and clears automation selections", () => {
    resetSheetStore()

    store().setAutomationSelection("upgrade:tier1-5-0", true, { target: "evasion" })
    expect(sheet().automationSelections?.["upgrade:tier1-5-0"]).toEqual({
      selected: true,
      params: { target: "evasion" },
    })

    store().setAutomationSelection("upgrade:tier1-5-0", false)
    expect(sheet().automationSelections?.["upgrade:tier1-5-0"]).toEqual({
      selected: false,
    })
  })
})
