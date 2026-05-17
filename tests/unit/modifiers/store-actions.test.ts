import { describe, expect, it } from "vitest"
import { createEmptyCard } from "@/card/card-types"
import { defaultSheetData } from "@/lib/default-sheet-data"
import {
  getManualBaseId,
  getUnattributedDeltaId,
} from "@/lib/modifiers/special-contributions"
import { resetSheetStore, sheet, store } from "../automation/test-helpers"

describe("modifier store actions", () => {
  it("sets active base for a target", () => {
    resetSheetStore()

    store().setActiveModifierBase("evasion", "user:evasion-base")

    expect(sheet().modifierState?.targetStates.evasion?.activeBaseId).toBe("user:evasion-base")
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

  it("enables target auto calculation by preserving current final with unattributed delta", () => {
    resetSheetStore({
      evasion: "15",
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

    store().setTargetAutoCalculation("evasion", true)

    expect(sheet().evasion).toBe("15")
    expect(sheet().modifierState?.targetStates.evasion).toEqual({
      activeBaseId: "user:evasion-base",
      autoCalculation: true,
    })
    expect(sheet().userModifierContributions).toContainEqual({
      id: getUnattributedDeltaId("evasion"),
      definition: { target: "evasion", kind: "modifier" },
      editable: { label: "未归因差额", value: 3 },
    })
  })

  it("applies auto calculation when modifier sources change", () => {
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
            autoCalculation: true,
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

  it("toggles target auto calculation off cleanly", () => {
    resetSheetStore({
      modifierState: {
        targetStates: {
          evasion: {
            activeBaseId: "user:evasion-base",
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
    })

    store().setTargetAutoCalculation("evasion", false)

    expect(sheet().modifierState?.targetStates.evasion).toEqual({
      activeBaseId: "user:evasion-base",
    })
  })

  it("does not overwrite final from source changes after disabling auto calculation", () => {
    resetSheetStore({
      evasion: "14",
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
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
    })

    store().setTargetAutoCalculation("evasion", false)
    store().upsertUserModifierContribution({
      id: "user:evasion-mod",
      definition: { target: "evasion", kind: "modifier" },
      editable: { label: "Mod", value: 4 },
    })

    expect(sheet().evasion).toBe("14")
    expect(sheet().modifierState?.targetStates.evasion?.autoCalculation).toBeUndefined()
  })

  it("drops legacy sync mode when toggling target auto calculation off", () => {
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
    } as any)

    store().setTargetAutoCalculation("evasion", false)

    expect(sheet().modifierState?.targetStates.evasion).toEqual({
      activeBaseId: "user:evasion-base",
    })
    expect(sheet().modifierState?.targetStates.evasion).not.toHaveProperty("syncMode")
    expect(sheet().modifierState?.targetStates.evasion).not.toHaveProperty("autoCalculation")
  })

  it("applies auto calculation after level changes update system entries", () => {
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
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
    })

    store().updateLevel("2", "1")

    expect(sheet().minorThreshold).toBe("9")
  })

  it("applies auto calculation after armor base max changes", () => {
    resetSheetStore({
      armorMax: 0,
      modifierState: {
        targetStates: {
          armorMax: {
            activeBaseId: "equipment:armor:current:armorMax",
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
    })

    store().updateArmorBaseMax("5")

    expect(sheet().armorMax).toBe(5)
  })

  it("applies auto calculation after profession card source changes", () => {
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
            activeBaseId: "profession:current:evasion",
            autoCalculation: true,
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
    expect(sheet().modifierState?.targetStates.evasion?.autoCalculation).toBe(true)
  })

  it("commits final target values directly when auto calculation is off", () => {
    resetSheetStore({
      evasion: "10",
      userModifierContributions: [],
      modifierState: {
        targetStates: {
          evasion: {},
        },
        entryStates: {},
      },
    })

    store().commitModifierTargetValue("evasion", "15")

    expect(sheet().evasion).toBe("15")
    expect(sheet().userModifierContributions).toEqual([])
  })

  it("commits numeric final target values as unattributed delta when auto calculation has a base", () => {
    resetSheetStore({
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
          evasion: {
            activeBaseId: "user:evasion-base",
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
    })

    store().commitModifierTargetValue("evasion", "15")

    expect(sheet().evasion).toBe("15")
    expect(sheet().userModifierContributions).toContainEqual({
      id: getUnattributedDeltaId("evasion"),
      definition: { target: "evasion", kind: "modifier" },
      editable: { label: "未归因差额", value: 3 },
    })
  })

  it("commits numeric final target values as manual base when auto calculation has no base", () => {
    resetSheetStore({
      evasion: "",
      userModifierContributions: [],
      modifierState: {
        targetStates: {
          evasion: { autoCalculation: true },
        },
        entryStates: {},
      },
    })

    store().commitModifierTargetValue("evasion", "12")

    expect(sheet().evasion).toBe("12")
    expect(sheet().userModifierContributions).toContainEqual({
      id: getManualBaseId("evasion"),
      definition: { target: "evasion", kind: "base" },
      editable: { label: "手动基础值", value: 12 },
    })
    expect(sheet().modifierState?.targetStates.evasion).toEqual({
      activeBaseId: getManualBaseId("evasion"),
      autoCalculation: true,
    })
  })

  it("commits non-numeric final target text without creating modifier sources", () => {
    resetSheetStore({
      evasion: "12",
      userModifierContributions: [],
      modifierState: {
        targetStates: {
          evasion: { autoCalculation: true },
        },
        entryStates: {},
      },
    })

    store().commitModifierTargetValue("evasion", "12+敏捷")

    expect(sheet().evasion).toBe("12+敏捷")
    expect(sheet().userModifierContributions).toEqual([])
    expect(sheet().modifierState?.targetStates.evasion).toEqual({ autoCalculation: true })
  })
})
