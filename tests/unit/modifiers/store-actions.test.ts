import { describe, expect, it } from "vitest"
import { createEmptyCard } from "@/card/card-types"
import { defaultSheetData } from "@/lib/default-sheet-data"
import {
  getManualBaseId,
  getUnattributedDeltaId,
} from "@/lib/modifiers/special-contributions"
import {
  createManualFinalAdjustment,
  createUnattributedDifference,
  createUnknownMigrationDifference,
  getOtherAdjustmentId,
} from "@/lib/modifiers/other-adjustments"
import { getReferenceSummary } from "@/lib/modifiers/registry"
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

  it("sets fixed-target upgrade state and syncs auto-calculated evasion", () => {
    resetSheetStore({
      evasion: "12",
      userModifierContributions: [{
        id: "user:evasion-base",
        definition: { target: "evasion", kind: "base" },
        editable: { label: "手动基础闪避", value: 12 },
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
    })

    store().setUpgradeState("tier1-5-0", { checked: true, params: { target: "evasion" } })

    expect(sheet().upgradeStates?.["tier1-5-0"]).toEqual({
      checked: true,
      params: { target: "evasion" },
    })
    expect("automationSelections" in (sheet() as any)).toBe(false)
    expect("checkedUpgrades" in (sheet() as any)).toBe(false)
    expect(sheet().evasion).toBe("13")
  })

  it("enables target auto calculation by preserving current final with saved unattributed difference", () => {
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
    expect(sheet().otherAdjustments).toContainEqual(createUnattributedDifference("evasion", 3))
    expect(sheet().userModifierContributions?.some(
      contribution => contribution.id === getUnattributedDeltaId("evasion"),
    )).toBe(false)
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

  it("recalculates final when editable other adjustments change with auto calculation on", () => {
    resetSheetStore({
      evasion: "15",
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Base", value: 12 },
        },
      ],
      otherAdjustments: [
        createUnknownMigrationDifference("evasion", 1),
        createManualFinalAdjustment("evasion", 2),
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

    store().upsertOtherAdjustment(createUnknownMigrationDifference("evasion", 4))
    expect(sheet().otherAdjustments).toContainEqual(createUnknownMigrationDifference("evasion", 4))
    expect(sheet().evasion).toBe("18")

    store().removeOtherAdjustment(getOtherAdjustmentId("evasion", "manualFinalAdjustment"))
    expect(sheet().otherAdjustments).toEqual([createUnknownMigrationDifference("evasion", 4)])
    expect(sheet().evasion).toBe("16")
  })

  it("preserves final and changes derived unattributed difference when editable other adjustments change with auto calculation off", () => {
    resetSheetStore({
      evasion: "15",
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Base", value: 12 },
        },
      ],
      otherAdjustments: [
        createUnknownMigrationDifference("evasion", 1),
        createManualFinalAdjustment("evasion", 2),
      ],
      modifierState: {
        targetStates: {
          evasion: {
            activeBaseId: "user:evasion-base",
            autoCalculation: false,
          },
        },
        entryStates: {},
      },
    })

    store().upsertOtherAdjustment(createUnknownMigrationDifference("evasion", 4))
    expect(sheet().evasion).toBe("15")
    expect(getReferenceSummary(sheet(), "evasion").unattributedDelta).toBe(-3)

    store().removeOtherAdjustment(getOtherAdjustmentId("evasion", "manualFinalAdjustment"))
    expect(sheet().evasion).toBe("15")
    expect(sheet().otherAdjustments).toEqual([createUnknownMigrationDifference("evasion", 4)])
    expect(getReferenceSummary(sheet(), "evasion").unattributedDelta).toBe(-1)
  })

  it("removes saved unattributed difference without recalculating final when auto calculation is disabled", () => {
    resetSheetStore({
      evasion: "15",
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Base", value: 12 },
        },
      ],
      otherAdjustments: [
        createUnattributedDifference("evasion", 3),
      ],
      modifierState: {
        targetStates: {
          evasion: {
            activeBaseId: "user:evasion-base",
            autoCalculation: false,
          },
        },
        entryStates: {},
      },
    })

    store().removeOtherAdjustment(getOtherAdjustmentId("evasion", "unattributedDifference"))
    expect(sheet().otherAdjustments).toEqual([])
    expect(sheet().evasion).toBe("15")

    store().upsertOtherAdjustment(createUnattributedDifference("evasion", 3))
    store().setTargetAutoCalculation("evasion", true)
    store().removeOtherAdjustment(getOtherAdjustmentId("evasion", "unattributedDifference"))
    expect(sheet().otherAdjustments).toEqual([])
    expect(sheet().evasion).toBe("12")
  })

  it("applies auto calculation by default when modifier sources change", () => {
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
      autoCalculation: false,
    })
  })

  it("toggles target auto calculation off by deleting saved unattributed difference and preserving final", () => {
    resetSheetStore({
      evasion: "15",
      otherAdjustments: [
        createUnknownMigrationDifference("evasion", 1),
        createUnattributedDifference("evasion", 2),
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

    expect(sheet().evasion).toBe("15")
    expect(sheet().otherAdjustments).toEqual([
      createUnknownMigrationDifference("evasion", 1),
    ])
    expect(sheet().modifierState?.targetStates.evasion).toEqual({
      activeBaseId: "user:evasion-base",
      autoCalculation: false,
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
    expect(sheet().modifierState?.targetStates.evasion?.autoCalculation).toBe(false)
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
      autoCalculation: false,
    })
    expect(sheet().modifierState?.targetStates.evasion).not.toHaveProperty("syncMode")
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

    store().updateLevel("2")

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
          evasion: { autoCalculation: false },
        },
        entryStates: {},
      },
    })

    store().commitModifierTargetValue("evasion", "15")

    expect(sheet().evasion).toBe("15")
    expect(sheet().userModifierContributions).toEqual([])
  })

  it("commits numeric final target values as manual final adjustment when auto calculation has a base", () => {
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
    expect(sheet().otherAdjustments).toContainEqual(createManualFinalAdjustment("evasion", 3))
    expect(sheet().userModifierContributions?.some(
      contribution => contribution.id === getUnattributedDeltaId("evasion"),
    )).toBe(false)
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

  it("ignores non-numeric final input for numeric targets without creating modifier sources", () => {
    resetSheetStore({
      hpMax: 6,
      userModifierContributions: [
        {
          id: "user:hp-base",
          definition: { target: "hpMax", kind: "base" },
          editable: { label: "Base", value: 6 },
        },
      ],
      modifierState: {
        targetStates: {
          hpMax: {
            activeBaseId: "user:hp-base",
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
    })

    store().commitModifierTargetValue("hpMax", "abc")

    expect(sheet().hpMax).toBe(6)
    expect(sheet().userModifierContributions).toEqual([
      {
        id: "user:hp-base",
        definition: { target: "hpMax", kind: "base" },
        editable: { label: "Base", value: 6 },
      },
    ])
  })

  it("adds equipment modifier contributions and applies auto calculation", () => {
    const baseEquipment = defaultSheetData.equipment
    resetSheetStore({
      evasion: "10",
      equipment: {
        ...baseEquipment,
        weaponSlots: {
          ...baseEquipment.weaponSlots,
          primary: {
            ...baseEquipment.weaponSlots.primary,
            name: "Blade",
          },
        },
      },
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

    store().addEquipmentModifierContribution({ type: "weapon", slot: "primary" })
    const contribution = sheet().equipment.weaponSlots.primary.modifierContributions[0]

    expect(contribution).toMatchObject({
      definition: { target: "evasion", kind: "modifier" },
      editable: { label: "", value: 0 },
    })
    expect(contribution.id).toMatch(/^equipment:weapon:primary:/)
    expect(sheet().evasion).toBe("12")
  })

  it("updates only equipment contribution editable fields and recalculates", () => {
    const baseEquipment = defaultSheetData.equipment
    resetSheetStore({
      evasion: "10",
      equipment: {
        ...baseEquipment,
        weaponSlots: {
          ...baseEquipment.weaponSlots,
          primary: {
            ...baseEquipment.weaponSlots.primary,
            name: "Blade",
            modifierContributions: [
              {
                id: "equipment:weapon:primary:existing",
                definition: { target: "evasion", kind: "modifier" },
                editable: { label: "Old", value: 1 },
              },
            ],
          },
        },
      },
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

    store().updateEquipmentModifierContribution(
      { type: "weapon", slot: "primary" },
      "equipment:weapon:primary:existing",
      {
        id: "ignored",
        definition: { target: "armorMax", kind: "base" },
        editable: { label: "New", value: 3 },
      } as any,
    )

    expect(sheet().equipment.weaponSlots.primary.modifierContributions).toEqual([
      {
        id: "equipment:weapon:primary:existing",
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "New", value: 3 },
      },
    ])
    expect(sheet().evasion).toBe("15")
  })

  it("updates equipment contribution label without changing value", () => {
    const baseEquipment = defaultSheetData.equipment
    resetSheetStore({
      equipment: {
        ...baseEquipment,
        weaponSlots: {
          ...baseEquipment.weaponSlots,
          primary: {
            ...baseEquipment.weaponSlots.primary,
            modifierContributions: [
              {
                id: "equipment:weapon:primary:existing",
                definition: { target: "evasion", kind: "modifier" },
                editable: { label: "Old", value: 1 },
              },
            ],
          },
        },
      },
    })

    store().updateEquipmentModifierContribution(
      { type: "weapon", slot: "primary" },
      "equipment:weapon:primary:existing",
      { editable: { label: "New" } },
    )

    expect(sheet().equipment.weaponSlots.primary.modifierContributions[0].editable).toEqual({
      label: "New",
      value: 1,
    })
  })

  it("updates equipment contribution value without changing label", () => {
    const baseEquipment = defaultSheetData.equipment
    resetSheetStore({
      equipment: {
        ...baseEquipment,
        weaponSlots: {
          ...baseEquipment.weaponSlots,
          primary: {
            ...baseEquipment.weaponSlots.primary,
            modifierContributions: [
              {
                id: "equipment:weapon:primary:existing",
                definition: { target: "evasion", kind: "modifier" },
                editable: { label: "Old", value: 1 },
              },
            ],
          },
        },
      },
    })

    store().updateEquipmentModifierContribution(
      { type: "weapon", slot: "primary" },
      "equipment:weapon:primary:existing",
      { editable: { value: 4 } },
    )

    expect(sheet().equipment.weaponSlots.primary.modifierContributions[0].editable).toEqual({
      label: "Old",
      value: 4,
    })
  })

  it("changes equipment contribution target by replacing id, preserving editable fields, and clearing old entry state", () => {
    const baseEquipment = defaultSheetData.equipment
    resetSheetStore({
      evasion: "13",
      armorMax: 0,
      equipment: {
        ...baseEquipment,
        armorSlot: {
          ...baseEquipment.armorSlot,
          name: "Armor",
          baseArmorMax: 3,
          modifierContributions: [
            {
              id: "equipment:armor:current:old",
              definition: { target: "evasion", kind: "modifier" },
              editable: { label: "Guard", value: 2 },
            },
          ],
        },
      },
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Evasion Base", value: 11 },
        },
      ],
      modifierState: {
        targetStates: {
          evasion: {
            activeBaseId: "user:evasion-base",
            autoCalculation: true,
          },
          armorMax: {
            activeBaseId: "equipment:armor:current:armorMax",
            autoCalculation: true,
          },
        },
        entryStates: {
          "equipment:armor:current:old": { enabled: false },
        },
      },
    })

    store().changeEquipmentModifierContributionTarget(
      { type: "armor" },
      "equipment:armor:current:old",
      "armorMax",
    )
    const contribution = sheet().equipment.armorSlot.modifierContributions[0]

    expect(contribution).toMatchObject({
      definition: { target: "armorMax", kind: "modifier" },
      editable: { label: "Guard", value: 2 },
    })
    expect(contribution.id).toMatch(/^equipment:armor:current:/)
    expect(contribution.id).not.toBe("equipment:armor:current:old")
    expect(sheet().modifierState?.entryStates["equipment:armor:current:old"]).toBeUndefined()
    expect(sheet().evasion).toBe("11")
    expect(sheet().armorMax).toBe(5)
  })

  it("ignores invalid equipment contribution targets", () => {
    const baseEquipment = defaultSheetData.equipment
    resetSheetStore({
      equipment: {
        ...baseEquipment,
        armorSlot: {
          ...baseEquipment.armorSlot,
          modifierContributions: [
            {
              id: "equipment:armor:current:old",
              definition: { target: "evasion", kind: "modifier" },
              editable: { label: "Guard", value: 2 },
            },
          ],
        },
      },
    })

    store().changeEquipmentModifierContributionTarget(
      { type: "armor" },
      "equipment:armor:current:old",
      "experienceValues.0" as any,
    )

    expect(sheet().equipment.armorSlot.modifierContributions[0]).toEqual({
      id: "equipment:armor:current:old",
      definition: { target: "evasion", kind: "modifier" },
      editable: { label: "Guard", value: 2 },
    })
  })

  it("does not change target or clear entry state when entry id belongs to another slot", () => {
    const baseEquipment = defaultSheetData.equipment
    resetSheetStore({
      equipment: {
        ...baseEquipment,
        weaponSlots: {
          ...baseEquipment.weaponSlots,
          primary: {
            ...baseEquipment.weaponSlots.primary,
            modifierContributions: [
              {
                id: "equipment:weapon:primary:existing",
                definition: { target: "evasion", kind: "modifier" },
                editable: { label: "Primary", value: 1 },
              },
            ],
          },
          secondary: {
            ...baseEquipment.weaponSlots.secondary,
            modifierContributions: [
              {
                id: "equipment:weapon:secondary:existing",
                definition: { target: "evasion", kind: "modifier" },
                editable: { label: "Secondary", value: 2 },
              },
            ],
          },
        },
      },
      modifierState: {
        targetStates: {},
        entryStates: {
          "equipment:weapon:secondary:existing": { enabled: false },
        },
      },
    })

    store().changeEquipmentModifierContributionTarget(
      { type: "weapon", slot: "primary" },
      "equipment:weapon:secondary:existing",
      "armorMax",
    )

    expect(sheet().equipment.weaponSlots.primary.modifierContributions).toEqual([
      {
        id: "equipment:weapon:primary:existing",
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "Primary", value: 1 },
      },
    ])
    expect(sheet().equipment.weaponSlots.secondary.modifierContributions).toEqual([
      {
        id: "equipment:weapon:secondary:existing",
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "Secondary", value: 2 },
      },
    ])
    expect(sheet().modifierState?.entryStates["equipment:weapon:secondary:existing"]).toEqual({ enabled: false })
  })

  it("removes equipment contributions, clears entry state, and recalculates", () => {
    const baseEquipment = defaultSheetData.equipment
    resetSheetStore({
      evasion: "14",
      equipment: {
        ...baseEquipment,
        weaponSlots: {
          ...baseEquipment.weaponSlots,
          secondary: {
            ...baseEquipment.weaponSlots.secondary,
            name: "Dagger",
            modifierContributions: [
              {
                id: "equipment:weapon:secondary:existing",
                definition: { target: "evasion", kind: "modifier" },
                editable: { label: "Quick", value: 2 },
              },
            ],
          },
        },
      },
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
        entryStates: {
          "equipment:weapon:secondary:existing": { enabled: false },
        },
      },
    })

    store().removeEquipmentModifierContribution(
      { type: "weapon", slot: "secondary" },
      "equipment:weapon:secondary:existing",
    )

    expect(sheet().equipment.weaponSlots.secondary.modifierContributions).toEqual([])
    expect(sheet().modifierState?.entryStates["equipment:weapon:secondary:existing"]).toBeUndefined()
    expect(sheet().evasion).toBe("12")
  })

  it("does not remove contributions or clear entry state when entry id does not exist in the slot", () => {
    const baseEquipment = defaultSheetData.equipment
    resetSheetStore({
      equipment: {
        ...baseEquipment,
        armorSlot: {
          ...baseEquipment.armorSlot,
          modifierContributions: [
            {
              id: "equipment:armor:current:existing",
              definition: { target: "evasion", kind: "modifier" },
              editable: { label: "Armor", value: 1 },
            },
          ],
        },
      },
      modifierState: {
        targetStates: {},
        entryStates: {
          "equipment:weapon:primary:missing": { enabled: false },
        },
      },
    })

    store().removeEquipmentModifierContribution(
      { type: "armor" },
      "equipment:weapon:primary:missing",
    )

    expect(sheet().equipment.armorSlot.modifierContributions).toEqual([
      {
        id: "equipment:armor:current:existing",
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "Armor", value: 1 },
      },
    ])
    expect(sheet().modifierState?.entryStates["equipment:weapon:primary:missing"]).toEqual({ enabled: false })
  })

  it("keeps inventory weapon contribution ids inactive until swapped into an active slot", () => {
    const baseEquipment = defaultSheetData.equipment
    resetSheetStore({
      evasion: "10",
      equipment: {
        ...baseEquipment,
        weaponSlots: {
          ...baseEquipment.weaponSlots,
          inventory: [
            {
              ...baseEquipment.weaponSlots.inventory[0],
              name: "Stored Blade",
            },
            baseEquipment.weaponSlots.inventory[1],
          ],
        },
      },
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

    store().addEquipmentModifierContribution({ type: "inventoryWeapon", index: 0 })
    const contributionId = sheet().equipment.weaponSlots.inventory[0].modifierContributions[0].id
    store().updateEquipmentModifierContribution(
      { type: "inventoryWeapon", index: 0 },
      contributionId,
      { editable: { label: "Stored", value: 2 } },
    )

    expect(sheet().evasion).toBe("12")

    store().swapInventoryWeaponToActiveSlot(0, "primary")

    expect(sheet().equipment.weaponSlots.primary.modifierContributions[0].id).toBe(contributionId)
    expect(sheet().evasion).toBe("14")
  })
})
