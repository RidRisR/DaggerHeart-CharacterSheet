import { describe, expect, it } from "vitest"
import { createEmptyCard } from "@/card/card-types"
import { defaultSheetData } from "@/lib/default-sheet-data"
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

  it("sets target sync mode while preserving active base", () => {
    resetSheetStore({
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: "user:evasion-base" },
        },
        entryStates: {},
      },
    })

    store().setTargetSyncMode("evasion", "continuous")

    expect(sheet().modifierState?.targetStates.evasion).toEqual({
      activeBaseId: "user:evasion-base",
      syncMode: "continuous",
    })
  })

  it("syncs a target once from the store", () => {
    resetSheetStore({
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

    store().syncModifierTargetOnce("evasion")

    expect(sheet().evasion).toBe("13")
  })

  it("applies continuous sync when modifier sources change", () => {
    resetSheetStore({
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
          evasion: {
            activeBaseId: "user:evasion-base",
            syncMode: "continuous",
          },
        },
        entryStates: {},
      },
    })

    store().upsertUserModifierContribution({
      id: "user:evasion-mod",
      definition: { target: "evasion", kind: "modifier" },
      editable: { label: "Mod", value: 2 },
    })

    expect(sheet().evasion).toBe("14")
  })

  it("keeps sync mode when clearing active base", () => {
    resetSheetStore({
      modifierState: {
        targetStates: {
          evasion: {
            activeBaseId: "user:evasion-base",
            syncMode: "continuous",
          },
        },
        entryStates: {},
      },
    })

    store().setActiveModifierBase("evasion", undefined)

    expect(sheet().modifierState?.targetStates.evasion).toEqual({
      syncMode: "continuous",
    })
  })

  it("applies continuous sync after level changes update system entries", () => {
    const baseEquipment = defaultSheetData.equipment
    resetSheetStore({
      level: "1",
      minorThreshold: "0",
      equipment: {
        ...baseEquipment,
        armorSlot: {
          ...baseEquipment.armorSlot,
          name: "Armor",
          baseArmorMax: 3,
          baseThresholds: { minor: 7, major: 15 },
        },
      },
      modifierState: {
        targetStates: {
          minorThreshold: {
            activeBaseId: "equipment:armor:current:minorThreshold",
            syncMode: "continuous",
          },
        },
        entryStates: {},
      },
    })

    store().updateLevel("2", "1")

    expect(sheet().minorThreshold).toBe("9")
  })

  it("applies continuous sync after armor base max changes", () => {
    resetSheetStore({
      armorMax: 0,
      modifierState: {
        targetStates: {
          armorMax: {
            activeBaseId: "equipment:armor:current:armorMax",
            syncMode: "continuous",
          },
        },
        entryStates: {},
      },
    })

    store().updateArmorBaseMax("5")

    expect(sheet().armorMax).toBe(5)
  })

  it("applies continuous sync after profession card source changes", () => {
    resetSheetStore({
      evasion: "0",
      cards: [
        {
          ...createEmptyCard("profession"),
          id: "profession:current",
          name: "Old",
          type: "profession",
          professionSpecial: {
            "起始生命": 6,
            "起始闪避": 10,
            "起始物品": "",
            "希望特性": "",
          },
        },
        ...defaultSheetData.cards.slice(1),
      ],
      modifierState: {
        targetStates: {
          evasion: {
            activeBaseId: "profession:profession:current:evasion",
            syncMode: "continuous",
          },
        },
        entryStates: {},
      },
    })

    store().updateCard(0, {
      ...createEmptyCard("profession"),
      id: "profession:current",
      name: "New",
      type: "profession",
      professionSpecial: {
        "起始生命": 6,
        "起始闪避": 12,
        "起始物品": "",
        "希望特性": "",
      },
    }, false)

    expect(sheet().evasion).toBe("12")
    expect(sheet().modifierState?.targetStates.evasion?.syncMode).toBe("continuous")
  })
})
