import { beforeEach, describe, expect, it, vi } from "vitest"
import { showFadeNotification } from "@/components/ui/fade-notification"
import { createEmptyArmorSlot, createEmptyEquipmentData } from "@/automation/equipment/defaults"
import { countChecked, resetSheetStore, sheet, store } from "./test-helpers"

vi.mock("@/components/ui/fade-notification", () => ({
  showFadeNotification: vi.fn(),
}))

describe("等级自动化基线", () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

    store().updateLevel("8")

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

    store().updateLevel("8")

    expect(sheet().level).toBe("8")
    expect(countChecked(sheet().proficiency)).toBe(5)
    expect(sheet().proficiency).toEqual([true, true, true, true, true, false])
  })

  it("降级不会直接改手动模式的熟练度", () => {
    resetSheetStore({
      level: "5",
      proficiency: [true, true, false, false, false, false],
    })

    store().updateLevel("3")

    expect(sheet().level).toBe("3")
    expect(countChecked(sheet().proficiency)).toBe(2)
    expect(sheet().proficiency).toEqual([true, true, false, false, false, false])
  })

  it("从 1 级进入 5 级时重置六属性升级标记", () => {
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

  it("从 1 级进入 5 级时提示属性升级标记已清除并提升熟练度", () => {
    resetSheetStore({
      level: "1",
    })

    store().updateLevel("5")

    expect(showFadeNotification).toHaveBeenCalledWith({
      message: "等级提升至5级，已清除属性升级标记，并提升了熟练度",
      type: "success",
    })
  })

  it("从 1 级进入 2 级时提示提升熟练度", () => {
    resetSheetStore({
      level: "1",
    })

    store().updateLevel("2")

    expect(showFadeNotification).toHaveBeenCalledWith({
      message: "等级提升至2级，已提升了熟练度",
      type: "success",
    })
  })

  it("从 1 级进入 8 级时按 2 级、5 级、8 级顺序提示等级回调结果", () => {
    resetSheetStore({
      level: "1",
    })

    store().updateLevel("8")

    expect(showFadeNotification).toHaveBeenNthCalledWith(1, {
      message: "等级提升至2级，已提升了熟练度",
      type: "success",
    })
    expect(showFadeNotification).toHaveBeenNthCalledWith(2, {
      message: "等级提升至5级，已清除属性升级标记，并提升了熟练度",
      type: "success",
    })
    expect(showFadeNotification).toHaveBeenNthCalledWith(3, {
      message: "等级提升至8级，已清除属性升级标记，并提升了熟练度",
      type: "success",
    })
  })

  it("从 8 级降到 4 级时不重置六属性升级标记", () => {
    resetSheetStore({
      level: "8",
      agility: { value: "2", checked: true, spellcasting: false },
      strength: { value: "1", checked: true, spellcasting: false },
      finesse: { value: "0", checked: true, spellcasting: false },
      instinct: { value: "0", checked: true, spellcasting: false },
      presence: { value: "0", checked: true, spellcasting: false },
      knowledge: { value: "0", checked: true, spellcasting: false },
    })

    store().updateLevel("4")

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

    store().updateLevel("5")

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
