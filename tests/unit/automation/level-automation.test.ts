import { beforeEach, describe, expect, it } from "vitest"
import { createEmptyArmorSlot, createEmptyEquipmentData } from "@/lib/equipment/defaults"
import { countChecked, resetSheetStore, sheet, store } from "./test-helpers"

describe("等级自动化基线", () => {
  beforeEach(() => {
    resetSheetStore({
      level: "",
      proficiency: [false, false, false, false, false, false],
    })
  })

  it("跨越 2/5/8 级阈值时累计增加熟练度", () => {
    resetSheetStore({
      level: "1",
      proficiency: [false, false, false, false, false, false],
    })

    store().updateLevel("8")

    expect(countChecked(sheet().proficiency)).toBe(3)
    expect(sheet().proficiency).toEqual([true, true, true, false, false, false])
  })

  it("熟练度提升不会超过6点上限", () => {
    resetSheetStore({
      level: "1",
      proficiency: [true, true, true, true, true, false],
    })

    store().updateLevel("8")

    expect(countChecked(sheet().proficiency)).toBe(6)
    expect(sheet().proficiency).toEqual([true, true, true, true, true, true])
  })

  it("降级不会降低熟练度", () => {
    resetSheetStore({
      level: "5",
      proficiency: [true, true, false, false, false, false],
    })

    store().updateLevel("3")

    expect(countChecked(sheet().proficiency)).toBe(2)
    expect(sheet().proficiency).toEqual([true, true, false, false, false, false])
  })

  it("熟练度提升时重置六属性升级标记", () => {
    resetSheetStore({
      level: "1",
      agility: { value: "2", checked: true, spellcasting: false },
      strength: { value: "1", checked: true, spellcasting: false },
      finesse: { value: "0", checked: true, spellcasting: false },
      instinct: { value: "0", checked: true, spellcasting: false },
      presence: { value: "0", checked: true, spellcasting: false },
      knowledge: { value: "0", checked: true, spellcasting: false },
    })

    store().updateLevel("5")

    expect(sheet().agility?.checked).toBe(false)
    expect(sheet().strength?.checked).toBe(false)
    expect(sheet().finesse?.checked).toBe(false)
    expect(sheet().instinct?.checked).toBe(false)
    expect(sheet().presence?.checked).toBe(false)
    expect(sheet().knowledge?.checked).toBe(false)
  })

  it("等级变化时按护甲阈值重算伤害阈值", () => {
    resetSheetStore({
      level: "1",
      equipment: {
        ...createEmptyEquipmentData(),
        armorSlot: {
          ...createEmptyArmorSlot(),
          baseThresholds: { minor: 3, major: 6 },
        },
      },
      minorThreshold: "",
      majorThreshold: "",
    })

    store().updateLevel("5")

    expect(sheet().minorThreshold).toBe("8")
    expect(sheet().majorThreshold).toBe("11")
  })

  it("等级改为空字符串时保留已有伤害阈值不重算", () => {
    resetSheetStore({
      level: "5",
      equipment: {
        ...createEmptyEquipmentData(),
        armorSlot: {
          ...createEmptyArmorSlot(),
          baseThresholds: { minor: 3, major: 6 },
        },
      },
      minorThreshold: "8",
      majorThreshold: "11",
      proficiency: [true, true, false, false, false, false],
    })

    store().updateLevel("")

    expect(sheet().level).toBe("")
    expect(sheet().minorThreshold).toBe("8")
    expect(sheet().majorThreshold).toBe("11")
    expect(sheet().proficiency).toEqual([true, true, false, false, false, false])
  })
})
