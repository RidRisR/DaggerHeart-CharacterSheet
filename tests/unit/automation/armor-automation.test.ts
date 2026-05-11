import { beforeEach, describe, expect, it } from "vitest"
import { armorItems } from "@/data/list/armor"
import { createEmptyArmorSlot, createEmptyEquipmentData } from "@/lib/equipment/defaults"
import type { EquipmentData } from "@/lib/equipment/types"
import { resetSheetStore, sheet, store } from "./test-helpers"

describe("护甲自动化基线", () => {
  beforeEach(() => resetSheetStore())

  it("selects built-in armor by stable template id without syncing manual final targets", () => {
    const armor = armorItems.find((item) => item.id === "builtin.armor.chainmail")
    expect(armor).toBeTruthy()
    resetSheetStore({
      level: "3",
      armorMax: 1,
      minorThreshold: "manual-minor",
      majorThreshold: "manual-major",
    })

    store().selectArmor(armor!.id)

    const data = store().sheetData
    expect(data.equipment.armorSlot).toMatchObject({
      name: armor!.name,
      baseArmorMax: armor!.baseArmorMax,
      baseThresholds: armor!.baseThresholds,
    })
    expect(data.armorMax).toBe(1)
    expect(data.minorThreshold).toBe("manual-minor")
    expect(data.majorThreshold).toBe("manual-major")
    expect(data.equipment.armorSlot.feature).toContain(armor!.featureName)
  })

  it("keeps custom Chinese armor payload compatible without syncing manual final targets", () => {
    resetSheetStore({
      level: "4",
      armorMax: 2,
      minorThreshold: "manual-minor",
      majorThreshold: "manual-major",
    })
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
    expect(sheet().armorMax).toBe(2)
    expect(sheet().minorThreshold).toBe("manual-minor")
    expect(sheet().majorThreshold).toBe("manual-major")
    expect(sheet().equipment.armorSlot.feature).toContain("自定义")
  })

  it("选择 none 只清空护甲来源，不直接覆盖手动最终值", () => {
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
    expect(sheet().armorMax).toBe(4)
    expect(sheet().minorThreshold).toBe("9")
    expect(sheet().majorThreshold).toBe("18")
  })

  it("手动修改护甲基础值只更新护甲来源，不直接同步 armorMax", () => {
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
    expect(sheet().armorMax).toBe(3)
  })

  it("手动修改护甲阈值只更新护甲来源，不直接重算手动伤害阈值", () => {
    resetSheetStore({
      level: "5",
      minorThreshold: "manual-minor",
      majorThreshold: "manual-major",
    })

    store().updateArmorBaseThresholds("9/20")

    expect(sheet().equipment.armorSlot.baseThresholds).toEqual({ minor: 9, major: 20 })
    expect(sheet().minorThreshold).toBe("manual-minor")
    expect(sheet().majorThreshold).toBe("manual-major")
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
