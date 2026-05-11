import { describe, expect, it } from "vitest"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { computeUpgradeAutomation, createUpgradeRevertEffects } from "@/lib/automation/upgrade-actions"
import { revertEffects } from "@/lib/modifiers/effect-executor"

function run(label: string, overrides = {}, currentlyChecked = false) {
  return computeUpgradeAutomation({
    sheetData: { ...defaultSheetData, ...overrides },
    option: { label },
    currentlyChecked,
  })
}

function expectSelectionOnly(
  result: ReturnType<typeof run>,
  selected: boolean,
  target: string,
) {
  expect(result).toMatchObject({
    kind: "setSheetData",
    selection: {
      selected,
      params: { target },
    },
  })
  expect(result.kind === "setSheetData" ? result.updates : undefined).toEqual({})
}

describe("升级选项自动化基线", () => {
  it("生命槽升级只返回 selection，不直接改 hpMax", () => {
    expectSelectionOnly(run("永久增加一个生命槽。", { hpMax: 6 }), true, "hpMax")
  })

  it("生命槽取消只返回未选中 selection，不直接改 hpMax", () => {
    expectSelectionOnly(run("永久增加一个生命槽。", { hpMax: 1 }, true), false, "hpMax")
  })

  it("生命槽缺失时勾选仍只返回 selection", () => {
    expectSelectionOnly(run("永久增加一个生命槽。", { hpMax: undefined }), true, "hpMax")
  })

  it("生命槽缺失时取消仍只返回未选中 selection", () => {
    expectSelectionOnly(run("永久增加一个生命槽。", { hpMax: undefined }, true), false, "hpMax")
  })

  it("压力槽升级只返回 selection，不直接改 stressMax", () => {
    expectSelectionOnly(run("永久增加一个压力槽。", { stressMax: 6 }), true, "stressMax")
  })

  it("压力槽勾选到上限时仍只返回 selection", () => {
    expectSelectionOnly(run("永久增加一个压力槽。", { stressMax: 18 }), true, "stressMax")
  })

  it("压力槽取消只返回未选中 selection，不直接改 stressMax", () => {
    expectSelectionOnly(run("永久增加一个压力槽。", { stressMax: 7 }, true), false, "stressMax")
  })

  it("压力槽缺失时勾选仍只返回 selection", () => {
    expectSelectionOnly(run("永久增加一个压力槽。", { stressMax: undefined }), true, "stressMax")
  })

  it("压力槽缺失时取消仍只返回未选中 selection", () => {
    expectSelectionOnly(run("永久增加一个压力槽。", { stressMax: undefined }, true), false, "stressMax")
  })

  it("熟练度升级只返回 selection，不直接改熟练度", () => {
    expectSelectionOnly(run("(同时标记两格) 获得熟练度+1。", {
      proficiency: [true, false, false, false, false, false],
    }), true, "proficiency")
  })

  it("熟练度取消只返回未选中 selection，不直接改熟练度", () => {
    expectSelectionOnly(run("(同时标记两格) 获得熟练度+1。", {
      proficiency: [true, true, false, false, false, false],
    }, true), false, "proficiency")
  })

  it("生命槽升级返回 automation selection 信息", () => {
    expectSelectionOnly(run("永久增加一个生命槽。", { hpMax: 6 }), true, "hpMax")
  })

  it("取消生命槽升级返回未选中 selection 信息", () => {
    expectSelectionOnly(run("永久增加一个生命槽。", { hpMax: 7 }, true), false, "hpMax")
  })

  it("已勾选属性升级选项会返回未选中 selection 信息", () => {
    expect(run("两项未升级的角色属性+1，然后将该属性标记为已升级。", {}, true)).toEqual({
      kind: "setSheetData",
      updates: {},
      warnings: [],
      selection: { selected: false },
    })
  })

  it("已勾选经历升级选项会返回未选中 selection 信息", () => {
    expect(run("选择两项经历获得额外+1。", {}, true)).toEqual({
      kind: "setSheetData",
      updates: {},
      warnings: [],
      selection: { selected: false },
    })
  })

  it("已勾选闪避升级选项只返回未选中 selection，不直接改 evasion", () => {
    expectSelectionOnly(run("获得闪避值+1。", { evasion: "20" }, true), false, "evasion")
  })

  it("已勾选闪避升级选项的提示不会显示 undefined", () => {
    const result = run("获得闪避值+1。", { evasion: "20" }, true)

    expect(result).toMatchObject({
      kind: "setSheetData",
      selection: {
        selected: false,
        params: { target: "evasion" },
      },
    })
    expect(result.kind === "setSheetData" ? result.updates : undefined).toEqual({})
    expect(result.kind === "setSheetData" ? result.message : "").not.toContain("undefined")
  })

  it("升级回退效果只接受已知属性和非负整数经历索引", () => {
    expect(createUpgradeRevertEffects({
      attributes: ["agility", "bogus", "strength.value", "presence"],
      experienceIndexes: [0, -1, 1.5, 2, "3"],
    })).toEqual([
      { operation: "add", target: "agility.value", value: 1 },
      { operation: "add", target: "presence.value", value: 1 },
      { operation: "add", target: "experienceValues.0", value: 1 },
      { operation: "add", target: "experienceValues.2", value: 1 },
    ])
  })

  it("升级回退效果基于记录的来源参数从当前最终值执行 -1", () => {
    const effects = createUpgradeRevertEffects({
      attributes: ["agility"],
      experienceIndexes: [1],
    })

    const result = revertEffects({
      ...defaultSheetData,
      agility: { value: "8", checked: true, spellcasting: false },
      experienceValues: ["", "5", "", "", ""],
    }, effects)

    expect(result.updates).toMatchObject({
      agility: { value: "7", checked: true, spellcasting: false },
      experienceValues: ["", "4", "", "", ""],
    })
  })
})
