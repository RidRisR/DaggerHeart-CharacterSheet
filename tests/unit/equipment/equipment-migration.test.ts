import { describe, expect, it } from "vitest"
import { migrateSheetData } from "@/lib/sheet-data-migration"

function v1EquipmentInput(overrides: Record<string, unknown>) {
  return {
    schemaVersion: 1,
    name: "V1 Equipment",
    level: "1",
    hope: 0,
    hopeMax: 6,
    cards: [],
    inventory_cards: [],
    ...overrides,
  } as any
}

describe("equipment data migration", () => {
  it("migrates legacy weapon and armor fields into equipment", () => {
    const migrated = migrateSheetData(v1EquipmentInput({
      primaryWeaponName: "阔剑",
      primaryWeaponTrait: "物理/单手/近战",
      primaryWeaponDamage: "敏捷: d8",
      primaryWeaponFeature: "可靠: 你的攻击掷骰+1。",
      secondaryWeaponName: "塔盾",
      secondaryWeaponTrait: "物理/副手/近战",
      secondaryWeaponDamage: "力量: d6",
      secondaryWeaponFeature: "壁垒: +2 护甲值，-1 闪避值",
      inventoryWeapon1Name: "短剑",
      inventoryWeapon1Trait: "物理/副手/近战",
      inventoryWeapon1Damage: "敏捷: d8",
      inventoryWeapon1Feature: "双持: 近战时主武器伤害+2",
      inventoryWeapon1Primary: true,
      inventoryWeapon2Name: "手弩",
      inventoryWeapon2Trait: "物理/副手/远距离",
      inventoryWeapon2Damage: "灵巧: d6+1",
      inventoryWeapon2Feature: "",
      inventoryWeapon2Secondary: true,
      armorName: "链甲",
      armorBaseScore: "4",
      armorThreshold: "7/15",
      armorFeature: "重型: 闪避值-1",
      armorValue: "4",
    }))

    expect(migrated.equipment.weaponSlots.primary).toMatchObject({
      name: "阔剑",
      trait: "物理/单手/近战",
      damage: "敏捷: d8",
      feature: "可靠: 你的攻击掷骰+1。",
      modifierContributions: [],
    })
    expect(migrated.equipment.weaponSlots.secondary).toMatchObject({
      name: "塔盾",
      trait: "物理/副手/近战",
      damage: "力量: d6",
      feature: "壁垒: +2 护甲值，-1 闪避值",
    })
    expect(migrated.equipment.weaponSlots.secondary.modifierContributions).toEqual([
      {
        id: expect.stringMatching(/^equipment:armor-max:/),
        definition: { target: "armorMax", kind: "modifier" },
        editable: { label: "壁垒", value: 2 },
      },
      {
        id: expect.stringMatching(/^equipment:evasion:/),
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "壁垒", value: -1 },
      },
    ])
    expect(migrated.equipment.weaponSlots.inventory[0]).toMatchObject({
      name: "短剑",
      trait: "物理/副手/近战",
      damage: "敏捷: d8",
      feature: "双持: 近战时主武器伤害+2",
      modifierContributions: [],
    })
    expect(migrated.equipment.weaponSlots.inventory[1]).toMatchObject({
      name: "手弩",
      trait: "物理/副手/远距离",
      damage: "灵巧: d6+1",
      feature: "",
      modifierContributions: [],
    })
    expect(migrated.equipment.armorSlot).toMatchObject({
      name: "链甲",
      baseArmorMax: 4,
      baseThresholds: { minor: 7, major: 15 },
      feature: "重型: 闪避值-1",
    })
    expect(migrated.equipment.armorSlot.modifierContributions).toEqual([
      {
        id: expect.stringMatching(/^equipment:evasion:/),
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "重型", value: -1 },
      },
    ])

    const runtime = migrated as any
    expect("primaryWeaponName" in runtime).toBe(false)
    expect("secondaryWeaponName" in runtime).toBe(false)
    expect("inventoryWeapon1Primary" in runtime).toBe(false)
    expect("inventoryWeapon2Secondary" in runtime).toBe(false)
    expect("armorName" in runtime).toBe(false)
    expect("armorValue" in runtime).toBe(false)
  })

  it("parses legacy armor thresholds side by side and normalizes invalid rule fields", () => {
    const migrated = migrateSheetData(v1EquipmentInput({
      armorName: "奇怪护甲",
      armorBaseScore: "heavy",
      armorThreshold: "7/bad",
    }))

    expect(migrated.equipment.armorSlot).toMatchObject({
      name: "奇怪护甲",
      baseArmorMax: null,
      baseThresholds: { minor: 7, major: null },
    })
  })

  it("normalizes fully unparseable legacy armor thresholds to null", () => {
    const migrated = migrateSheetData(v1EquipmentInput({
      armorName: "损坏护甲",
      armorThreshold: "bad/worse",
    }))

    expect(migrated.equipment.armorSlot).toMatchObject({
      name: "损坏护甲",
      baseThresholds: { minor: null, major: null },
    })
  })

  it("preserves existing equipment over legacy fields", () => {
    const migrated = migrateSheetData(v1EquipmentInput({
      equipment: {
        weaponSlots: {
          primary: { name: "Existing", trait: "", damage: "", feature: "", modifierContributions: [] },
          secondary: { name: "", trait: "", damage: "", feature: "", modifierContributions: [] },
          inventory: [
            { name: "", trait: "", damage: "", feature: "", modifierContributions: [] },
            { name: "", trait: "", damage: "", feature: "", modifierContributions: [] },
          ],
        },
        armorSlot: {
          name: "Existing Armor",
          baseArmorMax: 9,
          baseThresholds: { minor: 1, major: 2 },
          feature: "",
          modifierContributions: [],
        },
      },
      primaryWeaponName: "Legacy",
      armorName: "Legacy Armor",
    }))

    expect(migrated.equipment.weaponSlots.primary.name).toBe("Existing")
    expect(migrated.equipment.armorSlot.name).toBe("Existing Armor")
    expect("primaryWeaponName" in (migrated as any)).toBe(false)
    expect("armorName" in (migrated as any)).toBe(false)
  })

  it("normalizes malformed equipment and fills missing slots from legacy fields", () => {
    const migrated = migrateSheetData(v1EquipmentInput({
      equipment: {
        weaponSlots: {
          primary: { name: "Existing Primary" },
          inventory: [
            { name: "Existing Inventory", damage: "d6" },
          ],
        },
      },
      primaryWeaponName: "Legacy Primary",
      primaryWeaponTrait: "Legacy Primary Trait",
      secondaryWeaponName: "Legacy Secondary",
      secondaryWeaponDamage: "d8",
      inventoryWeapon1Name: "Legacy Inventory 1",
      inventoryWeapon2Name: "Legacy Inventory 2",
      inventoryWeapon2Feature: "Legacy Inventory Feature",
      armorName: "Legacy Armor",
      armorBaseScore: "5",
      armorThreshold: "8/17",
      armorFeature: "Legacy Armor Feature",
    }))

    expect(migrated.equipment.weaponSlots.primary).toEqual({
      name: "Existing Primary",
      trait: "Legacy Primary Trait",
      damage: "",
      feature: "",
      modifierContributions: [],
    })
    expect(migrated.equipment.weaponSlots.secondary).toEqual({
      name: "Legacy Secondary",
      trait: "",
      damage: "d8",
      feature: "",
      modifierContributions: [],
    })
    expect(migrated.equipment.weaponSlots.inventory).toHaveLength(2)
    expect(migrated.equipment.weaponSlots.inventory[0]).toEqual({
      name: "Existing Inventory",
      trait: "",
      damage: "d6",
      feature: "",
      modifierContributions: [],
    })
    expect(migrated.equipment.weaponSlots.inventory[1]).toEqual({
      name: "Legacy Inventory 2",
      trait: "",
      damage: "",
      feature: "Legacy Inventory Feature",
      modifierContributions: [],
    })
    expect(migrated.equipment.armorSlot).toEqual({
      name: "Legacy Armor",
      baseArmorMax: 5,
      baseThresholds: { minor: 8, major: 17 },
      feature: "Legacy Armor Feature",
      modifierContributions: [],
    })
    expect("inventoryWeapon2Name" in (migrated as any)).toBe(false)
    expect("armorBaseScore" in (migrated as any)).toBe(false)
  })

  it("normalizes empty equipment objects against equipment defaults", () => {
    const migrated = migrateSheetData({ schemaVersion: 2, equipment: {} } as any)

    expect(migrated.equipment.weaponSlots.primary).toEqual({
      name: "",
      trait: "",
      damage: "",
      feature: "",
      modifierContributions: [],
    })
    expect(migrated.equipment.weaponSlots.secondary).toEqual({
      name: "",
      trait: "",
      damage: "",
      feature: "",
      modifierContributions: [],
    })
    expect(migrated.equipment.weaponSlots.inventory).toHaveLength(2)
    expect(migrated.equipment.armorSlot).toEqual({
      name: "",
      baseArmorMax: null,
      baseThresholds: { minor: null, major: null },
      feature: "",
      modifierContributions: [],
    })
  })

  it("keeps only valid equipment modifier contributions for current-schema equipment slots", () => {
    const migrated = migrateSheetData({
      schemaVersion: 2,
      equipment: {
        weaponSlots: {
          primary: {
            name: "塔盾",
            trait: "",
            damage: "",
            feature: "",
            modifierContributions: [
              {
                id: "valid-evasion",
                definition: { target: "evasion", kind: "modifier" },
                editable: { label: "灵巧格挡", value: 1 },
              },
              {
                id: "experience-target",
                definition: { target: "experienceValues.0", kind: "modifier" },
                editable: { label: "经历", value: 1 },
              },
              {
                id: "base-kind",
                definition: { target: "armorMax", kind: "base" },
                editable: { label: "基础", value: 2 },
              },
              {
                id: "bad-value",
                definition: { target: "armorMax", kind: "modifier" },
                editable: { label: "坏值", value: "2" },
              },
              {
                id: "valid-evasion",
                definition: { target: "armorMax", kind: "modifier" },
                editable: { label: "重复", value: 2 },
              },
            ],
          },
          secondary: { name: "", trait: "", damage: "", feature: "", modifierContributions: [] },
          inventory: [
            { name: "", trait: "", damage: "", feature: "", modifierContributions: [] },
            { name: "", trait: "", damage: "", feature: "", modifierContributions: [] },
          ],
        },
        armorSlot: {
          name: "链甲",
          baseArmorMax: null,
          baseThresholds: { minor: null, major: null },
          feature: "",
          modifierContributions: [
            {
              id: "valid-armor",
              definition: { target: "armorMax", kind: "modifier" },
              editable: { label: "稳固", value: 1 },
            },
            {
              id: "armor-experience",
              definition: { target: "experienceValues.1", kind: "modifier" },
              editable: { label: "经历", value: 1 },
            },
          ],
        },
      },
    } as any)

    expect(migrated.equipment.weaponSlots.primary.modifierContributions).toEqual([
      {
        id: "valid-evasion",
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "灵巧格挡", value: 1 },
      },
    ])
    expect(migrated.equipment.armorSlot.modifierContributions).toEqual([
      {
        id: "valid-armor",
        definition: { target: "armorMax", kind: "modifier" },
        editable: { label: "稳固", value: 1 },
      },
    ])
  })

  it("backfills v1 equipment contributions from exact name and feature matches", () => {
    const migrated = migrateSheetData(v1EquipmentInput({
      primaryWeaponName: "巨剑",
      primaryWeaponTrait: "物理/双手/近战",
      primaryWeaponDamage: "力量: d10+3",
      primaryWeaponFeature: "巨型: 闪避值-1，额外掷一个伤害骰并去掉其中最小的一个。",
      secondaryWeaponName: "塔盾",
      secondaryWeaponTrait: "物理/副手/近战",
      secondaryWeaponDamage: "力量: d6",
      secondaryWeaponFeature: "壁垒: +2 护甲值，-1 闪避值",
      inventoryWeapon1Name: "短剑",
      inventoryWeapon1Trait: "物理/副手/近战",
      inventoryWeapon1Damage: "敏捷: d8",
      inventoryWeapon1Feature: "双持: 近战时主武器伤害+2",
      armorName: "链甲",
      armorBaseScore: "4",
      armorThreshold: "7/15",
      armorFeature: "重型: 闪避值-1",
    }))

    expect(migrated.equipment.weaponSlots.primary.modifierContributions).toEqual([
      {
        id: expect.stringMatching(/^equipment:evasion:/),
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "巨型", value: -1 },
      },
    ])
    expect(migrated.equipment.weaponSlots.secondary.modifierContributions).toEqual([
      {
        id: expect.stringMatching(/^equipment:armor-max:/),
        definition: { target: "armorMax", kind: "modifier" },
        editable: { label: "壁垒", value: 2 },
      },
      {
        id: expect.stringMatching(/^equipment:evasion:/),
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "壁垒", value: -1 },
      },
    ])
    expect(migrated.equipment.weaponSlots.inventory[0].modifierContributions).toEqual([])
    expect(migrated.equipment.armorSlot.modifierContributions).toEqual([
      {
        id: expect.stringMatching(/^equipment:evasion:/),
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "重型", value: -1 },
      },
    ])
  })

  it("does not backfill v2 equipment contributions during current-schema normalization", () => {
    const migrated = migrateSheetData({
      schemaVersion: 2,
      equipment: {
        weaponSlots: {
          primary: {
            name: "巨剑",
            trait: "物理/双手/近战",
            damage: "力量: d10+3",
            feature: "巨型: 闪避值-1，额外掷一个伤害骰并去掉其中最小的一个。",
            modifierContributions: [],
          },
          secondary: { name: "", trait: "", damage: "", feature: "", modifierContributions: [] },
          inventory: [
            { name: "", trait: "", damage: "", feature: "", modifierContributions: [] },
            { name: "", trait: "", damage: "", feature: "", modifierContributions: [] },
          ],
        },
        armorSlot: {
          name: "链甲",
          baseArmorMax: 4,
          baseThresholds: { minor: 7, major: 15 },
          feature: "重型: 闪避值-1",
          modifierContributions: [],
        },
      },
    } as any)

    expect(migrated.equipment.weaponSlots.primary.modifierContributions).toEqual([])
    expect(migrated.equipment.armorSlot.modifierContributions).toEqual([])
  })

  it("does not backfill when the feature text does not exactly match", () => {
    const migrated = migrateSheetData(v1EquipmentInput({
      primaryWeaponName: "巨剑",
      primaryWeaponFeature: "巨型: 用户改过的文本",
      armorName: "链甲",
      armorBaseScore: "4",
      armorThreshold: "7/15",
      armorFeature: "重型",
    }))

    expect(migrated.equipment.weaponSlots.primary.modifierContributions).toEqual([])
    expect(migrated.equipment.armorSlot.modifierContributions).toEqual([])
  })

  it("keeps existing valid v1 equipment contributions instead of overwriting from templates", () => {
    const migrated = migrateSheetData(v1EquipmentInput({
      equipment: {
        weaponSlots: {
          primary: {
            name: "巨剑",
            trait: "物理/双手/近战",
            damage: "力量: d10+3",
            feature: "巨型: 闪避值-1，额外掷一个伤害骰并去掉其中最小的一个。",
            modifierContributions: [
              {
                id: "existing-evasion",
                definition: { target: "evasion", kind: "modifier" },
                editable: { label: "已有", value: -2 },
              },
            ],
          },
          secondary: { name: "", trait: "", damage: "", feature: "", modifierContributions: [] },
          inventory: [
            { name: "", trait: "", damage: "", feature: "", modifierContributions: [] },
            { name: "", trait: "", damage: "", feature: "", modifierContributions: [] },
          ],
        },
        armorSlot: {
          name: "",
          baseArmorMax: null,
          baseThresholds: { minor: null, major: null },
          feature: "",
          modifierContributions: [],
        },
      },
    }))

    expect(migrated.equipment.weaponSlots.primary.modifierContributions).toEqual([
      {
        id: "existing-evasion",
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "已有", value: -2 },
      },
    ])
  })

  it("preserves legacy final values after backfilled equipment sources are added", () => {
    const migrated = migrateSheetData(v1EquipmentInput({
      evasion: "12",
      cards: [{
        id: "profession.guardian",
        name: "守护者",
        type: "profession",
        professionSpecial: {
          "起始闪避": 10,
          "起始生命": 7,
        },
      }],
      primaryWeaponName: "巨剑",
      primaryWeaponTrait: "物理/双手/近战",
      primaryWeaponDamage: "力量: d10+3",
      primaryWeaponFeature: "巨型: 闪避值-1，额外掷一个伤害骰并去掉其中最小的一个。",
    }))

    expect(migrated.evasion).toBe("12")
    expect(migrated.equipment.weaponSlots.primary.modifierContributions).toEqual([
      {
        id: expect.stringMatching(/^equipment:evasion:/),
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "巨型", value: -1 },
      },
    ])
    expect(migrated.otherAdjustments).toContainEqual(
      expect.objectContaining({
        target: "evasion",
        kind: "unknownMigrationDifference",
        value: 3,
      }),
    )
  })

  it("keeps unmatched legacy flat equipment migration modifier contributions empty", () => {
    const migrated = migrateSheetData(v1EquipmentInput({
      primaryWeaponName: "阔剑",
      armorName: "链甲",
    }))

    expect(migrated.equipment.weaponSlots.primary.modifierContributions).toEqual([])
    expect(migrated.equipment.weaponSlots.secondary.modifierContributions).toEqual([])
    expect(migrated.equipment.weaponSlots.inventory[0].modifierContributions).toEqual([])
    expect(migrated.equipment.weaponSlots.inventory[1].modifierContributions).toEqual([])
    expect(migrated.equipment.armorSlot.modifierContributions).toEqual([])
  })
})
