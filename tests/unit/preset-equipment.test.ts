import { describe, expect, it } from "vitest"

import { createEmptyCard } from "@/card/card-types"
import { defaultSheetData } from "@/lib/default-sheet-data"
import {
  aggregatePresetEquipmentEffects,
  calculateArmorValueBreakdown,
  calculateEvasionBreakdown,
  convertDisplayedAttributeToStoredBase,
  formatPresetWeaponDamage,
  formatPresetWeaponFeature,
  formatPresetWeaponTrait,
  getDisplayedAttributeValue,
  inferArmorSelection,
  inferWeaponSelection,
  resolvePresetWeapon,
} from "@/lib/preset-equipment"
import { migrateSheetData } from "@/lib/sheet-data-migration"

function createProfessionCard(evasion: number) {
  const card = createEmptyCard("profession")
  card.professionSpecial = {
    起始生命: 6,
    起始闪避: evasion,
    起始物品: "",
    希望特性: "",
  }

  return card
}

describe("preset equipment groundwork", () => {
  it("aggregates passive modifiers from preset armor and weapons", () => {
    const result = aggregatePresetEquipmentEffects({
      ...defaultSheetData,
      armorSelection: { mode: "preset", id: "全板甲" },
      primaryWeaponSelection: { mode: "preset", id: "巨剑" },
      secondaryWeaponSelection: { mode: "preset", id: "塔盾" },
      armorName: "全板甲",
      primaryWeaponName: "巨剑",
      secondaryWeaponName: "塔盾",
    })

    expect(result.evasion).toBe(-4)
    expect(result.armorValue).toBe(2)
    expect(result.attributes.agility).toBe(-1)
    expect(result.sources.map((source) => source.label)).toEqual(["全板甲", "巨剑", "塔盾"])
  })

  it("handles global attribute penalties from preset armor", () => {
    const result = aggregatePresetEquipmentEffects({
      ...defaultSheetData,
      armorSelection: { mode: "preset", id: "救世主链甲" },
      primaryWeaponSelection: { mode: "none" },
      secondaryWeaponSelection: { mode: "none" },
      armorName: "救世主链甲",
    })

    expect(result.evasion).toBe(-1)
    expect(result.attributes.agility).toBe(-1)
    expect(result.attributes.strength).toBe(-1)
    expect(result.attributes.finesse).toBe(-1)
    expect(result.attributes.instinct).toBe(-1)
    expect(result.attributes.presence).toBe(-1)
    expect(result.attributes.knowledge).toBe(-1)
  })

  it("infers preset armor selection from legacy display fields", () => {
    const selection = inferArmorSelection({
      armorName: "全板甲",
      armorBaseScore: "4",
      armorThreshold: "8/17",
      armorSelection: undefined,
    })

    expect(selection).toEqual({ mode: "preset", id: "全板甲" })
  })

  it("infers preset weapon selection from legacy display fields", () => {
    const weapon = resolvePresetWeapon("巨剑", "primary")
    if (!weapon) {
      throw new Error("Expected 巨剑 to exist in preset weapon data")
    }

    const selection = inferWeaponSelection({
      primaryWeaponName: "巨剑",
      primaryWeaponTrait: formatPresetWeaponTrait(weapon),
      primaryWeaponDamage: formatPresetWeaponDamage(weapon),
      primaryWeaponFeature: formatPresetWeaponFeature(weapon),
      primaryWeaponSelection: undefined,
      secondaryWeaponName: "",
      secondaryWeaponTrait: "",
      secondaryWeaponDamage: "",
      secondaryWeaponFeature: "",
      secondaryWeaponSelection: undefined,
    }, "primary")

    expect(selection).toEqual({ mode: "preset", id: "巨剑" })
  })

  it("treats unmatched legacy display fields as custom selections", () => {
    const selection = inferWeaponSelection({
      primaryWeaponName: "巨剑",
      primaryWeaponTrait: "自定义/双手/近战",
      primaryWeaponDamage: "力量: d12",
      primaryWeaponFeature: "自定义效果",
      primaryWeaponSelection: undefined,
      secondaryWeaponName: "",
      secondaryWeaponTrait: "",
      secondaryWeaponDamage: "",
      secondaryWeaponFeature: "",
      secondaryWeaponSelection: undefined,
    }, "primary")

    expect(selection).toEqual({ mode: "custom", id: "巨剑" })
  })

  it("migrates legacy final stats into base values and manual modifiers", () => {
    const giantSword = resolvePresetWeapon("巨剑", "primary")
    const towerShield = resolvePresetWeapon("塔盾", "secondary")

    if (!giantSword || !towerShield) {
      throw new Error("Expected preset weapons to exist")
    }

    const migrated = migrateSheetData({
      cards: [createProfessionCard(12), createEmptyCard(), createEmptyCard(), createEmptyCard(), createEmptyCard()],
      armorName: "全板甲",
      armorBaseScore: "4",
      armorThreshold: "8/17",
      primaryWeaponName: "巨剑",
      primaryWeaponTrait: formatPresetWeaponTrait(giantSword),
      primaryWeaponDamage: formatPresetWeaponDamage(giantSword),
      primaryWeaponFeature: formatPresetWeaponFeature(giantSword),
      secondaryWeaponName: "塔盾",
      secondaryWeaponTrait: formatPresetWeaponTrait(towerShield),
      secondaryWeaponDamage: formatPresetWeaponDamage(towerShield),
      secondaryWeaponFeature: formatPresetWeaponFeature(towerShield),
      evasion: "8",
      armorValue: "6",
      agility: { checked: false, value: "-1", spellcasting: false },
    })

    expect(migrated.armorSelection).toEqual({ mode: "preset", id: "全板甲" })
    expect(migrated.primaryWeaponSelection).toEqual({ mode: "preset", id: "巨剑" })
    expect(migrated.secondaryWeaponSelection).toEqual({ mode: "preset", id: "塔盾" })
    expect(migrated.evasionManualModifier).toBe("0")
    expect(migrated.armorValueManualModifier).toBe("0")
    expect(migrated.agility?.value).toBe("0")
    expect(migrated.presetEquipmentCalcVersion).toBe(1)
  })

  it("calculates displayed values from base values and manual modifiers", () => {
    const data = {
      ...defaultSheetData,
      cards: [createProfessionCard(12), createEmptyCard(), createEmptyCard(), createEmptyCard(), createEmptyCard()],
      armorSelection: { mode: "preset" as const, id: "全板甲" },
      secondaryWeaponSelection: { mode: "preset" as const, id: "塔盾" },
      armorName: "全板甲",
      armorBaseScore: "4",
      armorThreshold: "8/17",
      secondaryWeaponName: "塔盾",
      agility: { checked: false, value: "2", spellcasting: false },
      evasionManualModifier: "2",
      armorValueManualModifier: "1",
    }

    expect(getDisplayedAttributeValue(data, "agility", data.agility.value)).toBe("1")
    expect(convertDisplayedAttributeToStoredBase(data, "agility", "1")).toBe("2")
    expect(calculateEvasionBreakdown(data).display).toBe("11")
    expect(calculateArmorValueBreakdown(data).display).toBe("7")
  })

  it("round-trips blank base attributes through equipment modifiers", () => {
    const data = {
      ...defaultSheetData,
      armorSelection: { mode: "preset" as const, id: "全板甲" },
      armorName: "全板甲",
      armorBaseScore: "4",
      armorThreshold: "8/17",
      agility: { checked: false, value: "", spellcasting: false },
    }

    expect(getDisplayedAttributeValue(data, "agility", data.agility.value)).toBe("-1")
    expect(convertDisplayedAttributeToStoredBase(data, "agility", "-1")).toBe("0")
    expect(convertDisplayedAttributeToStoredBase(data, "agility", "0")).toBe("1")
  })
})
