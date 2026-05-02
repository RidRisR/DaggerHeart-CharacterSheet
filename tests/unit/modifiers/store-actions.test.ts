import { describe, expect, it } from "vitest"
import { resetSheetStore, sheet, store } from "../automation/test-helpers"

describe("modifier store actions", () => {
  it("sets active base for a target", () => {
    resetSheetStore()

    store().setActiveModifierBase("evasion", "user:evasion-base")

    expect(sheet().modifierState?.byTarget.evasion?.activeBaseId).toBe("user:evasion-base")
  })

  it("toggles disabled modifier entry ids", () => {
    resetSheetStore()

    store().setModifierEntryDisabled("evasion", "upgrade:evasion", true)
    expect(sheet().modifierState?.byTarget.evasion?.disabledEntryIds).toEqual(["upgrade:evasion"])

    store().setModifierEntryDisabled("evasion", "upgrade:evasion", false)
    expect(sheet().modifierState?.byTarget.evasion?.disabledEntryIds).toEqual([])
  })

  it("adds user modifier entries", () => {
    resetSheetStore()

    store().upsertUserModifierEntry({
      id: "user:evasion-mod",
      sourceId: "user:evasion-mod",
      target: "evasion",
      kind: "modifier",
      label: "临时加值",
      value: 2,
      sourceType: "user",
      priority: 10,
    })

    expect(sheet().modifierState?.byTarget.evasion?.userEntries).toEqual([
      expect.objectContaining({ id: "user:evasion-mod", value: 2 }),
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
