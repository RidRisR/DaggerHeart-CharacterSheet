import { beforeEach, describe, expect, it } from "vitest"
import { computeUpgradeAutomation } from "@/lib/automation/upgrade-actions"
import { resetSheetStore, sheet, store } from "./test-helpers"

describe("升级回滚快照基线", () => {
  beforeEach(() => resetSheetStore())

  it("不再暴露旧升级快照 store API", () => {
    const currentStore = store() as unknown as Record<string, unknown>

    expect(currentStore.attributeUpgradeHistory).toBeUndefined()
    expect(currentStore.saveAttributeUpgradeRecord).toBeUndefined()
    expect(currentStore.rollbackAttributeUpgrade).toBeUndefined()
    expect(currentStore.experienceValuesSnapshot).toBeUndefined()
    expect(currentStore.createExperienceValuesSnapshot).toBeUndefined()
    expect(currentStore.restoreExperienceValuesSnapshot).toBeUndefined()
    expect(currentStore.evasionSnapshot).toBeUndefined()
    expect(currentStore.createEvasionSnapshot).toBeUndefined()
    expect(currentStore.restoreEvasionSnapshot).toBeUndefined()
  })

  it("新升级选择模型取消闪避升级时只返回未选中 selection，不直接回滚最终值", () => {
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
      updates: {},
      selection: {
        selected: false,
        params: { target: "evasion" },
      },
    })
  })
})
