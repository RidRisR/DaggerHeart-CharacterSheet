import { beforeEach, describe, expect, it } from "vitest"
import { createEmptyCard, type StandardCard } from "@/card/card-types"
import { armorItems } from "@/data/list/armor"
import { primaryWeapons } from "@/data/list/primary-weapon"
import { createEmptyArmorSlot, createEmptyEquipmentData } from "@/lib/equipment/defaults"
import { resetSheetStore, sheet, store } from "./test-helpers"

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
    const giantSword = primaryWeapons.find(item => item.id === "builtin.weapon.primary.004")
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
          evasion: { activeBaseId: "user:evasion-base" },
        },
        entryStates: {},
      },
    })

    store().selectWeaponSlot({ slotType: "primary" }, giantSword!.id)

    expect(sheet().equipment.weaponSlots.primary.name).toBe("巨剑")
    expect(sheet().evasion).toBe("12")
  })

  it("syncs weapon contribution into evasion while target is continuous", () => {
    const giantSword = primaryWeapons.find(item => item.id === "builtin.weapon.primary.004")
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
            syncMode: "continuous",
          },
        },
        entryStates: {},
      },
    })

    store().selectWeaponSlot({ slotType: "primary" }, giantSword!.id)

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
          evasion: { activeBaseId: "user:evasion-base" },
        },
        entryStates: {},
      },
    })

    store().setAutomationSelection("upgrade:tier1-5-0", true, { target: "evasion" })

    expect(sheet().automationSelections?.["upgrade:tier1-5-0"]).toEqual({
      selected: true,
      params: { target: "evasion" },
    })
    expect(sheet().evasion).toBe("12")
  })

  it("syncs upgrade source selection into evasion while target is continuous", () => {
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
            syncMode: "continuous",
          },
        },
        entryStates: {},
      },
    })

    store().setAutomationSelection("upgrade:tier1-5-0", true, { target: "evasion" })

    expect(sheet().automationSelections?.["upgrade:tier1-5-0"]).toEqual({
      selected: true,
      params: { target: "evasion" },
    })
    expect(sheet().evasion).toBe("13")
  })

  it("does not sync armor source into final armor targets while targets are manual", () => {
    const armor = armorItems.find(item => item.id === "builtin.armor.chainmail")
    expect(armor).toBeTruthy()

    resetSheetStore({
      level: "3",
      armorMax: 1,
      minorThreshold: "old-minor",
      majorThreshold: "old-major",
    })

    store().selectArmor(armor!.id)

    expect(sheet().equipment.armorSlot.name).toBe(armor!.name)
    expect(sheet().armorMax).toBe(1)
    expect(sheet().minorThreshold).toBe("old-minor")
    expect(sheet().majorThreshold).toBe("old-major")
  })

  it("syncs armor source into final armor targets while targets are continuous", () => {
    const armor = armorItems.find(item => item.id === "builtin.armor.chainmail")
    expect(armor).toBeTruthy()

    resetSheetStore({
      level: "3",
      armorMax: 1,
      minorThreshold: "old-minor",
      majorThreshold: "old-major",
      modifierState: {
        targetStates: {
          armorMax: {
            activeBaseId: "equipment:armor:current:armorMax",
            syncMode: "continuous",
          },
          minorThreshold: {
            activeBaseId: "equipment:armor:current:minorThreshold",
            syncMode: "continuous",
          },
          majorThreshold: {
            activeBaseId: "equipment:armor:current:majorThreshold",
            syncMode: "continuous",
          },
        },
        entryStates: {},
      },
    })

    store().selectArmor(armor!.id)

    expect(sheet().armorMax).toBe(armor!.baseArmorMax)
    expect(sheet().minorThreshold).toBe(String(armor!.baseThresholds.minor + 3))
    expect(sheet().majorThreshold).toBe(String(armor!.baseThresholds.major + 3))
  })

  it("does not sync profession source into final targets while targets are manual", () => {
    resetSheetStore({
      level: "1",
      evasion: "9",
      hpMax: 6,
    })

    store().updateCard(0, professionCard("profession-ranger", 12, 7), false)
    store().handleProfessionChange(
      { id: "profession-ranger", name: "游侠" },
      professionCard("profession-ranger", 12, 7),
    )

    expect(sheet().evasion).toBe("9")
    expect(sheet().hpMax).toBe(6)
  })

  it("syncs profession source into final targets while targets are continuous", () => {
    resetSheetStore({
      level: "1",
      evasion: "9",
      hpMax: 6,
      modifierState: {
        targetStates: {
          evasion: {
            activeBaseId: "profession:current:evasion",
            syncMode: "continuous",
          },
          hpMax: {
            activeBaseId: "profession:current:hpMax",
            syncMode: "continuous",
          },
        },
        entryStates: {},
      },
    })

    store().updateCard(0, professionCard("profession-ranger", 12, 7), false)
    store().handleProfessionChange(
      { id: "profession-ranger", name: "游侠" },
      professionCard("profession-ranger", 12, 7),
    )

    expect(sheet().evasion).toBe("12")
    expect(sheet().hpMax).toBe(7)
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
    })

    store().updateLevel("5", "1")

    expect(sheet().level).toBe("5")
    expect(sheet().proficiency).toEqual([false, false, false, false, false, false])
    expect(sheet().minorThreshold).toBe("manual-minor")
    expect(sheet().majorThreshold).toBe("manual-major")
  })

  it("syncs level source into proficiency and thresholds while targets are continuous", () => {
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
            syncMode: "continuous",
          },
          minorThreshold: {
            activeBaseId: "equipment:armor:current:minorThreshold",
            syncMode: "continuous",
          },
          majorThreshold: {
            activeBaseId: "equipment:armor:current:majorThreshold",
            syncMode: "continuous",
          },
        },
        entryStates: {},
      },
    })

    store().updateLevel("5", "1")

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
            syncMode: "continuous",
          },
        },
        entryStates: {},
      },
    })

    store().setSheetData({ evasion: "15" })

    expect(sheet().evasion).toBe("15")
  })
})
