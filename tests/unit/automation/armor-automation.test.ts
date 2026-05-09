import { beforeEach, describe, expect, it } from "vitest"
import { armorItems } from "@/data/list/armor"
import { createEmptyArmorSlot, createEmptyEquipmentData } from "@/lib/equipment/defaults"
import type { EquipmentData } from "@/lib/equipment/types"
import { resetSheetStore, sheet, store } from "./test-helpers"

describe("护甲自动化基线", () => {
  beforeEach(() => resetSheetStore())

  it("selects built-in armor by stable template id and syncs final targets", () => {
    const armor = armorItems.find((item) => item.id === "builtin.armor.chainmail")
    expect(armor).toBeTruthy()
    resetSheetStore({ level: "3" })

    store().selectArmor(armor!.id)

    const data = store().sheetData
    expect(data.equipment.armorSlot).toMatchObject({
      name: armor!.name,
      baseArmorMax: armor!.baseArmorMax,
      baseThresholds: armor!.baseThresholds,
    })
    expect(data.armorMax).toBe(armor!.baseArmorMax)
    expect(data.minorThreshold).toBe(String(armor!.baseThresholds.minor + 3))
    expect(data.majorThreshold).toBe(String(armor!.baseThresholds.major + 3))
    expect(data.equipment.armorSlot.feature).toContain(armor!.featureName)
  })

  it("keeps custom Chinese armor payload compatible", () => {
    resetSheetStore({ level: "4" })
    const customArmor = JSON.stringify({
      名称: "自定义护甲",
      护甲值: 4,
      伤害阈值: "8/18",
      特性名称: "自定义",
      描述: "测试",
    })

    store().selectArmor(customArmor)

    expect(sheet().equipment.armorSlot).toMatchObject({
      name: "自定义护甲",
      baseArmorMax: 4,
      baseThresholds: { minor: 8, major: 18 },
    })
    expect(sheet().armorMax).toBe(4)
    expect(sheet().minorThreshold).toBe("12")
    expect(sheet().majorThreshold).toBe("22")
    expect(sheet().equipment.armorSlot.feature).toContain("自定义")
  })

  it("选择 none 会清空护甲相关字段", () => {
    resetSheetStore({
      equipment: {
        ...createEmptyEquipmentData(),
        armorSlot: {
          ...createEmptyArmorSlot(),
          name: "旧护甲",
          baseArmorMax: 4,
          baseThresholds: { minor: 8, major: 17 },
          feature: "旧特性",
        },
      },
      armorMax: 4,
      minorThreshold: "9",
      majorThreshold: "18",
    })

    store().selectArmor("none")

    expect(sheet().equipment.armorSlot).toEqual(createEmptyArmorSlot())
    expect(sheet().armorMax).toBe(0)
    expect(sheet().minorThreshold).toBe("")
    expect(sheet().majorThreshold).toBe("")
  })

  it("手动修改护甲基础值会同步 armorMax", () => {
    resetSheetStore({
      equipment: {
        ...createEmptyEquipmentData(),
        armorSlot: {
          ...createEmptyArmorSlot(),
          baseArmorMax: 3,
        },
      },
      armorMax: 3,
    })

    store().updateArmorBaseMax("6")

    expect(sheet().equipment.armorSlot.baseArmorMax).toBe(6)
    expect(sheet().armorMax).toBe(6)
  })

  it("手动修改护甲阈值会按当前等级重算伤害阈值", () => {
    resetSheetStore({ level: "5" })

    store().updateArmorBaseThresholds("9/20")

    expect(sheet().equipment.armorSlot.baseThresholds).toEqual({ minor: 9, major: 20 })
    expect(sheet().minorThreshold).toBe("14")
    expect(sheet().majorThreshold).toBe("25")
  })

  it("护甲操作不会覆盖装备中的武器槽", () => {
    const armor = armorItems.find((item) => item.id === "builtin.armor.chainmail")
    expect(armor).toBeTruthy()

    const weaponSlots: EquipmentData["weaponSlots"] = {
      primary: {
        name: "主手测试剑",
        trait: "物理/单手/近战",
        damage: "力量: d8",
        feature: "主手特性",
        modifierContributions: [
          {
            id: "primary-test-evasion",
            definition: { target: "evasion", kind: "modifier" },
            editable: { label: "主手防御", value: 1 },
          },
        ],
      },
      secondary: {
        name: "副手测试盾",
        trait: "物理/单手/近战",
        damage: "力量: d6",
        feature: "副手特性",
        modifierContributions: [
          {
            id: "secondary-test-armor",
            definition: { target: "armorMax", kind: "modifier" },
            editable: { label: "副手护甲", value: 2 },
          },
        ],
      },
      inventory: [
        {
          name: "备用测试弓",
          trait: "物理/双手/远距",
          damage: "灵巧: d8",
          feature: "备用一特性",
          modifierContributions: [],
        },
        {
          name: "备用测试匕首",
          trait: "物理/单手/近战",
          damage: "敏捷: d6",
          feature: "备用二特性",
          modifierContributions: [
            {
              id: "inventory-test-finesse",
              definition: { target: "finesse.value", kind: "modifier" },
              editable: { label: "备用灵巧", value: 1 },
            },
          ],
        },
      ],
    }
    const expectedWeaponSlots = structuredClone(weaponSlots)

    resetSheetStore({
      level: "5",
      equipment: {
        ...createEmptyEquipmentData(),
        weaponSlots,
      },
    })

    store().selectArmor(armor!.id)
    expect(sheet().equipment.weaponSlots).toEqual(expectedWeaponSlots)

    store().updateArmorBaseMax("6")
    expect(sheet().equipment.weaponSlots).toEqual(expectedWeaponSlots)

    store().updateArmorBaseThresholds("9/20")
    expect(sheet().equipment.weaponSlots).toEqual(expectedWeaponSlots)
  })

  it("armorMax 改变时 setSheetData 会清空护甲槽", () => {
    resetSheetStore({
      armorMax: 3,
      armorBoxes: [true, true, false, false, false, false, false, false, false, false, false, false],
    })

    store().setSheetData({ armorMax: 4 })

    expect(sheet().armorBoxes).toEqual(Array(12).fill(false))
  })
})
