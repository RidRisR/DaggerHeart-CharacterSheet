import { beforeEach, describe, expect, it } from "vitest"
import { computeUpgradeAutomation } from "@/lib/automation/upgrade-actions"
import { useSheetStore } from "@/lib/sheet-store"
import { resetSheetStore, sheet, store } from "./test-helpers"

const attributeState = {
  agility: { value: "1", checked: false, spellcasting: false },
  strength: { value: "0", checked: false, spellcasting: false },
  finesse: { value: "0", checked: false, spellcasting: false },
  instinct: { value: "0", checked: false, spellcasting: false },
  presence: { value: "0", checked: false, spellcasting: false },
  knowledge: { value: "0", checked: false, spellcasting: false },
}

describe("升级回滚快照基线", () => {
  beforeEach(() => resetSheetStore())

  it("属性升级快照存在且当前状态匹配 after 时可以回滚", () => {
    const before = attributeState
    const after = {
      ...before,
      agility: { value: "2", checked: true, spellcasting: false },
      strength: { value: "1", checked: true, spellcasting: false },
    }
    resetSheetStore(after)
    store().saveAttributeUpgradeRecord("tier1-0-0", before, after)

    const result = store().rollbackAttributeUpgrade("tier1-0-0")

    expect(result).toEqual({ success: true, reason: "success" })
    expect(sheet().agility).toEqual(before.agility)
    expect(sheet().strength).toEqual(before.strength)
  })

  it("属性当前状态与 after 不匹配时返回 conflict 并不回滚", () => {
    const before = attributeState
    const after = {
      ...before,
      agility: { value: "2", checked: true, spellcasting: false },
    }
    resetSheetStore({
      ...after,
      agility: { value: "3", checked: true, spellcasting: false },
    })
    store().saveAttributeUpgradeRecord("tier1-0-0", before, after)

    const result = store().rollbackAttributeUpgrade("tier1-0-0")

    expect(result).toEqual({ success: false, reason: "conflict" })
    expect(sheet().agility?.value).toBe("3")
  })

  it("经历快照匹配时可以恢复原经历加值", () => {
    resetSheetStore({ experienceValues: ["1", "2", "", "", ""] })
    store().createExperienceValuesSnapshot([0, 1], { 0: "2", 1: "3" })
    store().setSheetData({ experienceValues: ["2", "3", "", "", ""] })

    const result = store().restoreExperienceValuesSnapshot()

    expect(result).toEqual({ success: true, reason: "success" })
    expect(sheet().experienceValues).toEqual(["1", "2", "", "", ""])
  })

  it("经历快照不匹配时返回 conflict 并清除快照", () => {
    resetSheetStore({ experienceValues: ["1", "2", "", "", ""] })
    store().createExperienceValuesSnapshot([0], { 0: "2" })
    store().setSheetData({ experienceValues: ["4", "2", "", "", ""] })

    const result = store().restoreExperienceValuesSnapshot()

    expect(result).toEqual({ success: false, reason: "conflict" })
    expect(useSheetStore.getState().experienceValuesSnapshot).toBeUndefined()
  })

  it("闪避快照匹配时可以恢复原闪避", () => {
    resetSheetStore({ evasion: "12" })
    store().createEvasionSnapshot("13")
    store().setSheetData({ evasion: "13" })

    const result = store().restoreEvasionSnapshot()

    expect(result).toEqual({ success: true, reason: "success" })
    expect(sheet().evasion).toBe("12")
  })

  it("闪避快照不匹配时返回 conflict 并保留当前闪避", () => {
    resetSheetStore({ evasion: "12" })
    store().createEvasionSnapshot("13")
    store().setSheetData({ evasion: "14" })

    const result = store().restoreEvasionSnapshot()

    expect(result).toEqual({ success: false, reason: "conflict" })
    expect(sheet().evasion).toBe("14")
  })

  it("新升级选择模型取消闪避升级时按当前最终值执行 -1", () => {
    resetSheetStore({
      evasion: "20",
      automationSelections: {
        "upgrade:tier1-5-0": {
          selected: true,
          params: { target: "evasion" },
        },
      },
    })

    const result = computeUpgradeAutomation({
      sheetData: sheet(),
      option: { label: "获得闪避值+1。" },
      currentlyChecked: true,
    })

    expect(result).toMatchObject({
      kind: "setSheetData",
      updates: { evasion: "19" },
      selection: {
        selected: false,
        params: { target: "evasion" },
      },
    })
  })
})
