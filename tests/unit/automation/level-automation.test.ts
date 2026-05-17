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

  it("等级变化只更新等级来源，手动模式不直接改熟练度", () => {
    resetSheetStore({
      level: "1",
      proficiency: [false, false, false, false, false, false],
      modifierState: {
        targetStates: {
          proficiency: { autoCalculation: false },
        },
        entryStates: {},
      },
    })

    store().updateLevel("8", "1")

    expect(sheet().level).toBe("8")
    expect(countChecked(sheet().proficiency)).toBe(0)
    expect(sheet().proficiency).toEqual([false, false, false, false, false, false])
  })

  it("等级变化不会直接补满手动模式的熟练度", () => {
    resetSheetStore({
      level: "1",
      proficiency: [true, true, true, true, true, false],
      modifierState: {
        targetStates: {
          proficiency: { autoCalculation: false },
        },
        entryStates: {},
      },
    })

    store().updateLevel("8", "1")

    expect(sheet().level).toBe("8")
    expect(countChecked(sheet().proficiency)).toBe(5)
    expect(sheet().proficiency).toEqual([true, true, true, true, true, false])
  })

  it("降级不会直接改手动模式的熟练度", () => {
    resetSheetStore({
      level: "5",
      proficiency: [true, true, false, false, false, false],
    })

    store().updateLevel("3", "5")

    expect(sheet().level).toBe("3")
    expect(countChecked(sheet().proficiency)).toBe(2)
    expect(sheet().proficiency).toEqual([true, true, false, false, false, false])
  })

  it("等级变化不再直接重置六属性升级标记", () => {
    resetSheetStore({
      level: "1",
      agility: { value: "2", checked: true, spellcasting: false },
      strength: { value: "1", checked: true, spellcasting: false },
      finesse: { value: "0", checked: true, spellcasting: false },
      instinct: { value: "0", checked: true, spellcasting: false },
      presence: { value: "0", checked: true, spellcasting: false },
      knowledge: { value: "0", checked: true, spellcasting: false },
    })

    store().updateLevel("5", "1")

    expect(sheet().agility?.checked).toBe(true)
    expect(sheet().strength?.checked).toBe(true)
    expect(sheet().finesse?.checked).toBe(true)
    expect(sheet().instinct?.checked).toBe(true)
    expect(sheet().presence?.checked).toBe(true)
    expect(sheet().knowledge?.checked).toBe(true)
  })

  it("等级变化时不直接重算手动模式的伤害阈值", () => {
    resetSheetStore({
      level: "1",
      equipment: {
        ...createEmptyEquipmentData(),
        armorSlot: {
          ...createEmptyArmorSlot(),
          baseThresholds: { minor: 3, major: 6 },
        },
      },
      minorThreshold: "manual-minor",
      majorThreshold: "manual-major",
      modifierState: {
        targetStates: {
          minorThreshold: { autoCalculation: false },
          majorThreshold: { autoCalculation: false },
        },
        entryStates: {},
      },
    })

    store().updateLevel("5", "1")

    expect(sheet().level).toBe("5")
    expect(sheet().minorThreshold).toBe("manual-minor")
    expect(sheet().majorThreshold).toBe("manual-major")
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
      modifierState: {
        targetStates: {
          proficiency: { autoCalculation: false },
          minorThreshold: { autoCalculation: false },
          majorThreshold: { autoCalculation: false },
        },
        entryStates: {},
      },
    })

    store().updateLevel("")

    expect(sheet().level).toBe("")
    expect(sheet().minorThreshold).toBe("8")
    expect(sheet().majorThreshold).toBe("11")
    expect(sheet().proficiency).toEqual([true, true, false, false, false, false])
  })
})
