import { describe, expect, it } from "vitest"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { computeUpgradeAutomation } from "@/lib/automation/upgrade-actions"

function run(label: string, overrides = {}, currentlyChecked = false) {
  return computeUpgradeAutomation({
    sheetData: { ...defaultSheetData, ...overrides },
    option: { label },
    currentlyChecked,
  })
}

describe("升级选项自动化基线", () => {
  it("生命槽勾选会增加 hpMax", () => {
    expect(run("永久增加一个生命槽。", { hpMax: 6 })).toMatchObject({
      kind: "setSheetData",
      updates: { hpMax: 7 },
    })
  })

  it("生命槽取消会减少 hpMax 但不低于1", () => {
    expect(run("永久增加一个生命槽。", { hpMax: 1 }, true)).toMatchObject({
      kind: "setSheetData",
      updates: { hpMax: 1 },
    })
  })

  it("压力槽勾选会增加 stressMax", () => {
    expect(run("永久增加一个压力槽。", { stressMax: 6 })).toMatchObject({
      kind: "setSheetData",
      updates: { stressMax: 7 },
      warnings: [],
    })
  })

  it("压力槽勾选不会超过18，因为组件现有 checkbox 自动化使用18上限", () => {
    expect(run("永久增加一个压力槽。", { stressMax: 18 })).toMatchObject({
      kind: "setSheetData",
      updates: { stressMax: 18 },
    })
  })

  it("熟练度勾选会点亮下一个熟练度标记", () => {
    expect(run("(同时标记两格) 获得熟练度+1。", {
      proficiency: [true, false, false, false, false, false],
    })).toMatchObject({
      kind: "setSheetData",
      updates: { proficiency: [true, true, false, false, false, false] },
    })
  })

  it("熟练度取消会熄灭最后一个熟练度标记", () => {
    expect(run("(同时标记两格) 获得熟练度+1。", {
      proficiency: [true, true, false, false, false, false],
    }, true)).toMatchObject({
      kind: "setSheetData",
      updates: { proficiency: [true, false, false, false, false, false] },
    })
  })

  it("生命槽升级返回 automation selection 信息", () => {
    expect(run("永久增加一个生命槽。", { hpMax: 6 })).toMatchObject({
      kind: "setSheetData",
      updates: { hpMax: 7 },
      selection: {
        selected: true,
        params: { target: "hpMax" },
      },
    })
  })

  it("取消生命槽升级返回未选中 selection 信息", () => {
    expect(run("永久增加一个生命槽。", { hpMax: 7 }, true)).toMatchObject({
      kind: "setSheetData",
      updates: { hpMax: 6 },
      selection: {
        selected: false,
        params: { target: "hpMax" },
      },
    })
  })

  it("已勾选属性升级选项会请求属性回滚", () => {
    expect(run("两项未升级的角色属性+1，然后将该属性标记为已升级。", {}, true)).toEqual({
      kind: "rollback",
      rollbackKind: "attribute",
    })
  })

  it("已勾选经历升级选项会请求经历回滚", () => {
    expect(run("选择两项经历获得额外+1。", {}, true)).toEqual({
      kind: "rollback",
      rollbackKind: "experience",
    })
  })

  it("已勾选闪避升级选项会请求闪避回滚", () => {
    expect(run("获得闪避值+1。", {}, true)).toEqual({
      kind: "rollback",
      rollbackKind: "evasion",
    })
  })
})
