import { beforeEach, describe, expect, it } from "vitest"
import { armorItems } from "@/data/list/armor"
import { resetSheetStore, sheet, store } from "./test-helpers"

describe("护甲自动化基线", () => {
  beforeEach(() => resetSheetStore())

  it("选择预设护甲会写入护甲字段、护甲值、护甲上限和等级修正后的伤害阈值", () => {
    const armor = armorItems[0]
    resetSheetStore({ level: "3" })

    store().selectArmor(armor.名称)

    const [minor, major] = armor.伤害阈值.split("/").map((v) => parseInt(v, 10))
    expect(sheet().armorName).toBe(armor.名称)
    expect(sheet().armorBaseScore).toBe(String(armor.护甲值))
    expect(sheet().armorThreshold).toBe(armor.伤害阈值)
    expect(sheet().armorValue).toBe(String(armor.护甲值))
    expect(sheet().armorMax).toBe(armor.护甲值)
    expect(sheet().minorThreshold).toBe(String(minor + 3))
    expect(sheet().majorThreshold).toBe(String(major + 3))
    expect(sheet().armorFeature).toContain(armor.特性名称)
  })

  it("选择自定义护甲 JSON 会写入对应字段并计算伤害阈值", () => {
    resetSheetStore({ level: "4" })
    const customArmor = JSON.stringify({
      名称: "测试护甲",
      护甲值: 5,
      伤害阈值: "7/15",
      特性名称: "测试特性",
      描述: "测试描述",
    })

    store().selectArmor(customArmor)

    expect(sheet().armorName).toBe("测试护甲")
    expect(sheet().armorBaseScore).toBe("5")
    expect(sheet().armorThreshold).toBe("7/15")
    expect(sheet().armorValue).toBe("5")
    expect(sheet().armorMax).toBe(5)
    expect(sheet().minorThreshold).toBe("11")
    expect(sheet().majorThreshold).toBe("19")
    expect(sheet().armorFeature).toContain("测试特性")
  })

  it("选择 none 会清空护甲相关字段", () => {
    resetSheetStore({
      armorName: "旧护甲",
      armorBaseScore: "4",
      armorThreshold: "8/17",
      armorFeature: "旧特性",
      armorValue: "4",
      armorMax: 4,
      minorThreshold: "9",
      majorThreshold: "18",
    })

    store().selectArmor("none")

    expect(sheet().armorName).toBe("")
    expect(sheet().armorBaseScore).toBe("")
    expect(sheet().armorThreshold).toBe("")
    expect(sheet().armorFeature).toBe("")
    expect(sheet().armorValue).toBe("")
    expect(sheet().armorMax).toBe(0)
    expect(sheet().minorThreshold).toBe("")
    expect(sheet().majorThreshold).toBe("")
  })

  it("手动修改护甲基础值会同步 armorValue 和 armorMax", () => {
    resetSheetStore({ armorBaseScore: "3", armorValue: "3", armorMax: 3 })

    store().updateArmorBaseScore("6")

    expect(sheet().armorBaseScore).toBe("6")
    expect(sheet().armorValue).toBe("6")
    expect(sheet().armorMax).toBe(6)
  })

  it("手动修改护甲阈值会按当前等级重算伤害阈值", () => {
    resetSheetStore({ level: "5" })

    store().updateArmorThresholdWithDamage("9/20")

    expect(sheet().armorThreshold).toBe("9/20")
    expect(sheet().minorThreshold).toBe("14")
    expect(sheet().majorThreshold).toBe("25")
  })

  it("armorValue 改变时 setSheetData 会清空护甲槽", () => {
    resetSheetStore({
      armorValue: "3",
      armorBoxes: [true, true, false, false, false, false, false, false, false, false, false, false],
    })

    store().setSheetData({ armorValue: "4" })

    expect(sheet().armorBoxes).toEqual(Array(12).fill(false))
  })
})
