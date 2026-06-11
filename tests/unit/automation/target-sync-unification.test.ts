import { beforeEach, describe, expect, it } from "vitest"
import { createEmptyCard, type StandardCard } from "@/card/card-types"
import { armorItems } from "@/data/list/armor"
import { allWeapons } from "@/data/list/all-weapons"
import { createEmptyArmorSlot, createEmptyEquipmentData } from "@/automation/equipment/defaults"
import type { RuntimeEquipmentTemplate } from "@/equipment/runtime-cache/types"
import { resetSheetStore, sheet, store } from "./test-helpers"

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

function professionCard(id: string, evasion: number, hp: number): StandardCard {
  return {
    ...createEmptyCard("profession"),
    id,
    name: "游侠",
    type: "profession",
    professionSpecial: {
      "起始闪避": evasion,
      "起始生命": hp,
      "起始物品": "",
      "希望特性": "",
    },
  } as StandardCard
}

describe("target sync automation unification", () => {
  beforeEach(() => resetSheetStore())

  it("does not sync weapon contribution into evasion while target is manual", () => {
    const giantSword = allWeapons.find(item => item.id === "builtin.weapon.primary.004")
    expect(giantSword).toBeTruthy()

    resetSheetStore({
      evasion: "12",
      userModifierContributions: [{
        id: "user:evasion-base",
        definition: { target: "evasion", kind: "base" },
        editable: { label: "手动基础闪避", value: 12 },
      }],
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: "user:evasion-base", autoCalculation: false },
        },
        entryStates: {},
      },
    })

    store().selectWeapon({ slotType: "primary" }, { type: "template", template: { kind: "weapon", ...giantSword! } })

    expect(sheet().equipment.weaponSlots.primary.name).toBe("巨剑")
    expect(sheet().evasion).toBe("12")
  })

  it("syncs weapon contribution into evasion while target uses auto calculation", () => {
    const giantSword = allWeapons.find(item => item.id === "builtin.weapon.primary.004")
    expect(giantSword).toBeTruthy()

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

    store().selectWeapon({ slotType: "primary" }, { type: "template", template: { kind: "weapon", ...giantSword! } })

    expect(sheet().equipment.weaponSlots.primary.name).toBe("巨剑")
    expect(sheet().evasion).toBe("11")
  })

  it("records upgrade source selection without syncing evasion while target is manual", () => {
    resetSheetStore({
      evasion: "12",
      userModifierContributions: [{
        id: "user:evasion-base",
        definition: { target: "evasion", kind: "base" },
        editable: { label: "手动基础闪避", value: 12 },
      }],
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: "user:evasion-base", autoCalculation: false },
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
    expect(sheet().evasion).toBe("12")
  })

  it("syncs upgrade source selection into evasion while target uses auto calculation", () => {
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
    expect(sheet().evasion).toBe("13")
  })

  it("does not sync armor source into final armor targets while targets are manual", () => {
    const armor = armorItems.find(item => item.id === "builtin.armor.chainmail")
    expect(armor).toBeTruthy()

    resetSheetStore({
      level: "3",
      armorMax: 1,
      minorThreshold: "1",
      majorThreshold: "2",
      modifierState: {
        targetStates: {
          armorMax: { autoCalculation: false },
          minorThreshold: { autoCalculation: false },
          majorThreshold: { autoCalculation: false },
        },
        entryStates: {},
      },
    })

    store().selectArmorSlot({ type: "template", template: runtimeArmorTemplate(armor!) })

    expect(sheet().equipment.armorSlot.name).toBe(armor!.name)
    expect(sheet().armorMax).toBe(1)
    expect(sheet().minorThreshold).toBe("1")
    expect(sheet().majorThreshold).toBe("2")
  })

  it("syncs armor source into final armor targets while targets use auto calculation", () => {
    const armor = armorItems.find(item => item.id === "builtin.armor.chainmail")
    expect(armor).toBeTruthy()

    resetSheetStore({
      level: "3",
      armorMax: 1,
      minorThreshold: "1",
      majorThreshold: "2",
      modifierState: {
        targetStates: {
          armorMax: {
            activeBaseId: "equipment:armor:current:armorMax",
            autoCalculation: true,
          },
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

    store().selectArmorSlot({ type: "template", template: runtimeArmorTemplate(armor!) })

    expect(sheet().armorMax).toBe(armor!.baseArmorMax)
    expect(sheet().minorThreshold).toBe(String(armor!.baseThresholds.minor + 3))
    expect(sheet().majorThreshold).toBe(String(armor!.baseThresholds.major + 3))
  })

  it("does not sync profession source into final targets while targets are manual", () => {
    resetSheetStore({
      level: "1",
      evasion: "9",
      hpMax: 6,
      modifierState: {
        targetStates: {
          evasion: { autoCalculation: false },
          hpMax: { autoCalculation: false },
        },
        entryStates: {},
      },
    })

    store().handleProfessionChange(
      { id: "profession-ranger", name: "游侠" },
      professionCard("profession-ranger", 12, 7),
    )

    expect(sheet().evasion).toBe("9")
    expect(sheet().hpMax).toBe(6)
  })

  it("syncs profession source into final targets while targets use auto calculation", () => {
    resetSheetStore({
      level: "1",
      evasion: "9",
      hpMax: 6,
      modifierState: {
        targetStates: {
          evasion: {
            activeBaseId: "profession:current:evasion",
            autoCalculation: true,
          },
          hpMax: {
            activeBaseId: "profession:current:hpMax",
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
    })

    store().handleProfessionChange(
      { id: "profession-ranger", name: "游侠" },
      professionCard("profession-ranger", 12, 7),
    )

    expect(sheet().evasion).toBe("12")
    expect(sheet().hpMax).toBe(7)
  })

  it("clears auto calculation profession targets when profession source is cleared", () => {
    resetSheetStore({
      level: "1",
      evasion: "12",
      hpMax: 7,
      cards: [
        professionCard("profession-ranger", 12, 7),
        ...Array.from({ length: 19 }, () => createEmptyCard()),
      ],
      modifierState: {
        targetStates: {
          evasion: {
            activeBaseId: "profession:current:evasion",
            autoCalculation: true,
          },
          hpMax: {
            activeBaseId: "profession:current:hpMax",
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
    })

    store().handleProfessionChange(undefined, undefined)

    expect(sheet().evasion).toBe("")
    expect(sheet().hpMax).toBe("")
  })

  it("does not sync level source into proficiency or thresholds while targets are manual", () => {
    resetSheetStore({
      level: "1",
      proficiency: [false, false, false, false, false, false],
      minorThreshold: "manual-minor",
      majorThreshold: "manual-major",
      equipment: {
        ...createEmptyEquipmentData(),
        armorSlot: {
          ...createEmptyArmorSlot(),
          baseThresholds: { minor: 3, major: 6 },
        },
      },
      modifierState: {
        targetStates: {
          proficiency: { autoCalculation: false },
          minorThreshold: { autoCalculation: false },
          majorThreshold: { autoCalculation: false },
        },
        entryStates: {},
      },
    })

    store().updateLevel("5")

    expect(sheet().level).toBe("5")
    expect(sheet().proficiency).toEqual([false, false, false, false, false, false])
    expect(sheet().minorThreshold).toBe("manual-minor")
    expect(sheet().majorThreshold).toBe("manual-major")
  })

  it("syncs level source into proficiency and thresholds while targets use auto calculation", () => {
    resetSheetStore({
      level: "1",
      proficiency: [false, false, false, false, false, false],
      minorThreshold: "",
      majorThreshold: "",
      equipment: {
        ...createEmptyEquipmentData(),
        armorSlot: {
          ...createEmptyArmorSlot(),
          baseThresholds: { minor: 3, major: 6 },
        },
      },
      modifierState: {
        targetStates: {
          proficiency: {
            activeBaseId: "level:base:proficiency",
            autoCalculation: true,
          },
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

    store().updateLevel("5")

    expect(sheet().proficiency).toEqual([true, true, true, false, false, false])
    expect(sheet().minorThreshold).toBe("8")
    expect(sheet().majorThreshold).toBe("11")
  })

  it("generic setSheetData remains unsynced", () => {
    resetSheetStore({
      evasion: "10",
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

    store().setSheetData({ evasion: "15" })

    expect(sheet().evasion).toBe("15")
  })
})
