import { describe, expect, it } from "vitest"
import { createEmptyCard } from "@/card/card-types"
import { armorItems } from "@/data/list/armor"
import { defaultSheetData } from "@/lib/default-sheet-data"
import {
  createUnattributedDeltaContribution,
  createManualBaseContribution,
  getManualBaseId,
  getUnattributedDeltaId,
} from "@/automation/core/special-contributions"
import {
  createManualFinalAdjustment,
  createUnattributedDifference,
  createUnknownMigrationDifference,
  getOtherAdjustmentId,
} from "@/automation/core/other-adjustments"
import type { ModifierTargetId } from "@/automation/core/types"
import type { CustomArmorDraft, CustomWeaponDraft } from "@/automation/equipment/template-to-slot"
import type { RuntimeEquipmentTemplate } from "@/equipment/runtime-cache/types"
import { getReferenceSummary } from "@/automation/core/registry"
import { resetSheetStore, sheet, store } from "../automation/test-helpers"

function runtimeArmorTemplate(armor: (typeof armorItems)[number]): RuntimeEquipmentTemplate & { kind: "armor" } {
  return {
    kind: "armor",
    ...armor,
    modifierContributions: (armor.modifierContributions ?? []).flatMap((contribution) =>
      contribution.definition.kind === "modifier"
        ? [{
            ...contribution,
            definition: { ...contribution.definition, kind: "modifier" as const },
          }]
        : [],
    ),
  }
}

describe("modifier store actions", () => {
  it("sets active base for a target", () => {
    resetSheetStore({
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Base", value: 12 },
        },
      ],
    })

    store().setActiveModifierBase("evasion", "user:evasion-base")

    expect(sheet().modifierState?.targetStates.evasion?.activeBaseId).toBe("user:evasion-base")
  })

  it("removes stale unattributed delta when selecting a different active base", () => {
    const baseA = {
      id: "user:evasion-base-a",
      definition: { target: "evasion" as const, kind: "base" as const },
      editable: { label: "Base A", value: 12 },
    }
    const baseB = {
      id: "user:evasion-base-b",
      definition: { target: "evasion" as const, kind: "base" as const },
      editable: { label: "Base B", value: 14 },
    }
    resetSheetStore({
      evasion: "15",
      userModifierContributions: [
        baseA,
        createUnattributedDeltaContribution("evasion", 3),
        baseB,
      ],
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: baseA.id, autoCalculation: true },
        },
        entryStates: {},
      },
    })

    store().setActiveModifierBase("evasion", baseB.id)

    expect(sheet().evasion).toBe("14")
    expect(sheet().modifierState?.targetStates.evasion?.activeBaseId).toBe(baseB.id)
    expect(sheet().userModifierContributions?.some(
      contribution => contribution.id === getUnattributedDeltaId("evasion"),
    )).toBe(false)
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
    })
    expect(sheet().otherAdjustments).toContainEqual(createUnattributedDifference("evasion", 3))
    expect(sheet().userModifierContributions?.some(
      contribution => contribution.id === getUnattributedDeltaId("evasion"),
    )).toBe(false)
  })

  it("enables target auto calculation without creating a manual base when no reference total exists", () => {
    resetSheetStore({
      evasion: "12",
      userModifierContributions: [],
      modifierState: {
        targetStates: {
          evasion: { autoCalculation: false },
        },
        entryStates: {},
      },
    })

    store().setTargetAutoCalculation("evasion", true)

    expect(sheet().evasion).toBe("")
    expect(sheet().userModifierContributions).toEqual([])
    expect(sheet().otherAdjustments ?? []).toEqual([])
    expect(sheet().modifierState?.targetStates.evasion).toBeUndefined()
  })

  it("enables target auto calculation without adjustments when no-base final is unparseable", () => {
    resetSheetStore({
      evasion: "12+敏捷",
      userModifierContributions: [],
      modifierState: {
        targetStates: {
          evasion: { autoCalculation: false },
        },
        entryStates: {},
      },
    })

    store().setTargetAutoCalculation("evasion", true)

    expect(sheet().evasion).toBe("12+敏捷")
    expect(sheet().userModifierContributions).toEqual([])
    expect(sheet().otherAdjustments ?? []).toEqual([])
    expect(sheet().modifierState?.targetStates.evasion).toBeUndefined()
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

  it("tracks default auto armor base so clearing it clears the final", () => {
    resetSheetStore()

    store().updateArmorBaseMax("5")

    expect(sheet().armorMax).toBe(5)
    expect(sheet().modifierState?.targetStates.armorMax?.activeBaseId).toBe(
      "equipment:armor:current:armorMax",
    )

    store().updateArmorBaseMax("")

    expect(sheet().equipment.armorSlot.baseArmorMax).toBe(null)
    expect(sheet().armorMax).toBe("")
  })

  it("recalculates from the system armor base after deleting a manual base", () => {
    const armor = armorItems.find((item) => item.id === "builtin.armor.chainmail")
    expect(armor).toBeTruthy()

    resetSheetStore({
      armorMax: "",
      userModifierContributions: [],
      modifierState: { targetStates: {}, entryStates: {} },
    })

    store().commitModifierTargetValue("armorMax", "2")
    expect(sheet().armorMax).toBe(2)
    expect(sheet().userModifierContributions).toContainEqual(
      createManualBaseContribution("armorMax", 2),
    )

    store().selectArmorSlot({
      type: "template",
      template: runtimeArmorTemplate(armor!),
    })
    expect(sheet().armorMax).toBe(2)

    store().removeSpecialBaseContribution("armorMax", getManualBaseId("armorMax"))

    expect(sheet().armorMax).toBe(armor!.baseArmorMax)
    expect(sheet().modifierState?.targetStates.armorMax?.activeBaseId).toBe(
      "equipment:armor:current:armorMax",
    )
    expect(sheet().otherAdjustments ?? []).not.toContainEqual(
      createManualFinalAdjustment("armorMax", 2 - armor!.baseArmorMax),
    )
  })

  it("updates one armor threshold side without changing the other side", () => {
    resetSheetStore({
      level: "1",
      minorThreshold: "8",
      majorThreshold: "16",
      equipment: {
        ...defaultSheetData.equipment,
        armorSlot: {
          ...defaultSheetData.equipment.armorSlot,
          baseThresholds: { minor: 7, major: 15 },
        },
      },
      modifierState: {
        targetStates: {
          minorThreshold: {
            activeBaseId: "equipment:armor:current:minorThreshold",
            autoCalculation: true,
          },
          majorThreshold: {
            activeBaseId: "equipment:armor:current:majorThreshold",
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
    })

    store().updateArmorBaseThresholdSide("minor", "10+3")

    expect(sheet().equipment.armorSlot.baseThresholds).toEqual({ minor: 13, major: 15 })
    expect(sheet().minorThreshold).toBe("14")
    expect(sheet().majorThreshold).toBe("16")
  })

  it("clears only the edited armor threshold side when side input is invalid", () => {
    resetSheetStore({
      level: "1",
      minorThreshold: "8",
      majorThreshold: "16",
      equipment: {
        ...defaultSheetData.equipment,
        armorSlot: {
          ...defaultSheetData.equipment.armorSlot,
          baseThresholds: { minor: 7, major: 15 },
        },
      },
      modifierState: {
        targetStates: {
          minorThreshold: {
            activeBaseId: "equipment:armor:current:minorThreshold",
            autoCalculation: true,
          },
          majorThreshold: {
            activeBaseId: "equipment:armor:current:majorThreshold",
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
    })

    store().updateArmorBaseThresholdSide("minor", "bad")

    expect(sheet().equipment.armorSlot.baseThresholds).toEqual({ minor: null, major: 15 })
    expect(sheet().minorThreshold).toBe("")
    expect(sheet().majorThreshold).toBe("16")
  })

  it("updates both armor threshold sides when side input contains a slash", () => {
    resetSheetStore({
      level: "1",
      minorThreshold: "8",
      majorThreshold: "16",
      equipment: {
        ...defaultSheetData.equipment,
        armorSlot: {
          ...defaultSheetData.equipment.armorSlot,
          baseThresholds: { minor: 7, major: 15 },
        },
      },
      modifierState: {
        targetStates: {
          minorThreshold: {
            activeBaseId: "equipment:armor:current:minorThreshold",
            autoCalculation: true,
          },
          majorThreshold: {
            activeBaseId: "equipment:armor:current:majorThreshold",
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
    })

    store().updateArmorBaseThresholdSide("major", "9/21")

    expect(sheet().equipment.armorSlot.baseThresholds).toEqual({ minor: 9, major: 21 })
    expect(sheet().minorThreshold).toBe("10")
    expect(sheet().majorThreshold).toBe("22")
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
    expect(sheet().modifierState?.targetStates.evasion?.activeBaseId).toBe("profession:current:evasion")
    expect(sheet().modifierState?.targetStates.evasion?.autoCalculation).toBeUndefined()
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

  it.each<[ModifierTargetId, Partial<ReturnType<typeof sheet>>]>([
    ["evasion", { evasion: "10" }],
    ["armorMax", { armorMax: 10 }],
    ["agility.value", { agility: { checked: false, value: "10", spellcasting: false } }],
    ["minorThreshold", { minorThreshold: "10" }],
    ["majorThreshold", { majorThreshold: "10" }],
    ["experienceValues.0", { experienceValues: ["10", "", "", "", ""] }],
  ])("commits arithmetic expression final target values for %s", (target, expected) => {
    resetSheetStore({
      userModifierContributions: [],
      modifierState: {
        targetStates: {
          [target]: { autoCalculation: false },
        },
        entryStates: {},
      },
    })

    store().commitModifierTargetValue(target, "6+4")

    expect(sheet()).toMatchObject(expected)
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
    })
  })

  it("syncs calculated final after numeric final creates a manual base", () => {
    resetSheetStore({
      evasion: "",
      userModifierContributions: [
        {
          id: "user:evasion-mod",
          definition: { target: "evasion", kind: "modifier" },
          editable: { label: "Penalty", value: -2 },
        },
      ],
      modifierState: { targetStates: {}, entryStates: {} },
    })

    store().commitModifierTargetValue("evasion", "5")

    expect(sheet().evasion).toBe("3")
    expect(sheet().userModifierContributions).toContainEqual(createManualBaseContribution("evasion", 5))
  })

  it("preserves saved other adjustments after numeric final creates a manual base", () => {
    resetSheetStore({
      evasion: "15",
      userModifierContributions: [],
      otherAdjustments: [
        createManualFinalAdjustment("evasion", 3),
        createUnknownMigrationDifference("evasion", 1),
      ],
      modifierState: {
        targetStates: {
          evasion: { autoCalculation: true },
        },
        entryStates: {},
      },
    })

    store().commitModifierTargetValue("evasion", "12")

    expect(sheet().evasion).toBe("16")
    expect(sheet().userModifierContributions).toContainEqual(createManualBaseContribution("evasion", 12))
    expect(sheet().otherAdjustments).toEqual([
      createManualFinalAdjustment("evasion", 3),
      createUnknownMigrationDifference("evasion", 1),
    ])
  })

  it("clears final after removing the last special base while enabled", () => {
    const manualBase = createManualBaseContribution("evasion", 12)
    resetSheetStore({
      evasion: "12",
      userModifierContributions: [manualBase],
      modifierState: {
        targetStates: { evasion: { activeBaseId: manualBase.id } },
        entryStates: {},
      },
    })

    store().removeSpecialBaseContribution("evasion", manualBase.id)

    expect(sheet().evasion).toBe("")
    expect(sheet().modifierState?.targetStates.evasion).toBeUndefined()
  })

  it("syncs current-schema replacement before committing it", () => {
    resetSheetStore()

    store().replaceSheetData({
      ...defaultSheetData,
      evasion: "",
      userModifierContributions: [createManualBaseContribution("evasion", 12)],
      modifierState: { targetStates: {}, entryStates: {} },
    })

    expect(sheet().evasion).toBe("12")
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
    expect(sheet().modifierState?.targetStates.evasion).toBeUndefined()
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

describe("structured runtime equipment selection", () => {
  it("selects one-off custom equipment drafts and applies modifier contributions", () => {
    const customTowerShield: CustomWeaponDraft = {
      name: "自定义塔盾",
      tier: "T1",
      weaponType: "secondary",
      trait: "strength",
      damageType: "physical",
      range: "melee",
      burden: "offHand",
      damage: "d6",
      featureName: "壁垒",
      description: "+2 护甲值，-1 闪避值",
      modifierContributions: [
        {
          id: "armor",
          definition: { kind: "modifier", target: "armorMax" },
          editable: { label: "护甲值", value: 2 },
        },
        {
          id: "evasion",
          definition: { kind: "modifier", target: "evasion" },
          editable: { label: "闪避值", value: -1 },
        },
      ],
    }
    const customArmor: CustomArmorDraft = {
      name: "自定义链甲",
      tier: "T1",
      baseArmorMax: 4,
      baseThresholds: { minor: 7, major: 14 },
      featureName: "稳固",
      description: "闪避值+1。",
      modifierContributions: [{
        id: "evasion",
        definition: { kind: "modifier", target: "evasion" },
        editable: { label: "稳固", value: 1 },
      }],
    }

    resetSheetStore({
      evasion: "12",
      armorMax: "6",
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Base", value: 12 },
        },
        {
          id: "user:armor-max-base",
          definition: { target: "armorMax", kind: "base" },
          editable: { label: "Armor Base", value: 6 },
        },
      ],
      modifierState: {
        targetStates: {
          evasion: {
            activeBaseId: "user:evasion-base",
            autoCalculation: true,
          },
          armorMax: {
            activeBaseId: "user:armor-max-base",
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
    })

    store().selectWeapon({ slotType: "primary" }, { type: "custom", draft: customTowerShield })

    expect(sheet().equipment.weaponSlots.primary).toMatchObject({
      name: "自定义塔盾",
      trait: "物理/副手/近战",
      damage: "力量: d6",
      feature: "壁垒: +2 护甲值，-1 闪避值",
    })
    expect(sheet().evasion).toBe("11")
    expect(sheet().armorMax).toBe(8)

    store().selectArmorSlot({ type: "custom", draft: customArmor })

    expect(sheet().equipment.armorSlot).toMatchObject({
      name: "自定义链甲",
      baseArmorMax: 4,
      baseThresholds: { minor: 7, major: 14 },
      feature: "稳固: 闪避值+1。",
    })
    expect(sheet().evasion).toBe("12")
  })

  it("selects a runtime weapon template without string lookup and applies modifier contributions", () => {
    const template: RuntimeEquipmentTemplate & { kind: "weapon" } = {
      kind: "weapon",
      id: "pack.weapon.runtime-blade",
      name: "运行时长剑",
      tier: "T1",
      weaponType: "primary",
      trait: "strength",
      damageType: "physical",
      range: "melee",
      burden: "oneHanded",
      damage: "d8",
      featureName: "可靠",
      description: "来自装备包。",
      modifierContributions: [{
        id: "bonus",
        definition: { kind: "modifier", target: "evasion" },
        editable: { label: "闪避", value: 1 },
      }],
    }

    resetSheetStore({
      evasion: "12",
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
    })

    store().selectWeapon({ slotType: "primary" }, { type: "template", template })

    const slot = sheet().equipment.weaponSlots.primary
    expect(slot.name).toBe("运行时长剑")
    expect(slot.trait).toBe("物理/单手/近战")
    expect(slot.damage).toBe("力量: d8")
    expect(slot.feature).toBe("可靠: 来自装备包。")
    expect(slot.modifierContributions).toHaveLength(1)
    expect(slot.modifierContributions[0]?.id).toContain("bonus")
    expect(sheet().evasion).toBe("13")
  })

  it("clears a weapon slot with structured none selection", () => {
    resetSheetStore({
      equipment: {
        ...defaultSheetData.equipment,
        weaponSlots: {
          ...defaultSheetData.equipment.weaponSlots,
          primary: {
            name: "已有武器",
            trait: "physical/oneHanded/melee",
            damage: "strength: d8",
            feature: "可靠",
            modifierContributions: [{
              id: "equipment:weapon:primary:evasion",
              definition: { kind: "modifier", target: "evasion" },
              editable: { label: "闪避", value: 1 },
            }],
          },
        },
      },
    })

    store().selectWeapon({ slotType: "primary" }, { type: "none" })

    expect(sheet().equipment.weaponSlots.primary).toEqual(defaultSheetData.equipment.weaponSlots.primary)
  })

  it("selects a runtime armor template and clears armor with none", () => {
    const template: RuntimeEquipmentTemplate & { kind: "armor" } = {
      kind: "armor",
      id: "pack.armor.runtime-mail",
      name: "运行时链甲",
      tier: "T1",
      baseThresholds: { minor: 6, major: 12 },
      baseArmorMax: 4,
      featureName: "坚固",
      description: "来自装备包。",
      modifierContributions: [{
        id: "evasion",
        definition: { kind: "modifier", target: "evasion" },
        editable: { label: "坚固", value: -1 },
      }],
    }

    resetSheetStore({
      evasion: "12",
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
    })

    store().selectArmorSlot({ type: "template", template })
    expect(sheet().equipment.armorSlot.name).toBe("运行时链甲")
    expect(sheet().equipment.armorSlot.modifierContributions).toHaveLength(1)
    expect(sheet().evasion).toBe("11")

    store().selectArmorSlot({ type: "none" })
    expect(sheet().equipment.armorSlot.name).toBe("")
    expect(sheet().equipment.armorSlot.modifierContributions).toEqual([])
    expect(sheet().evasion).toBe("12")
  })

})
