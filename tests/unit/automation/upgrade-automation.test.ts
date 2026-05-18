import { describe, expect, it } from "vitest"
import { computeUpgradeAutomation } from "@/lib/automation/upgrade-actions"
import { defaultSheetData } from "@/lib/default-sheet-data"
import type { UpgradeAutomationMetadata } from "@/lib/modifiers/types"

function run(
  label: string,
  overrides = {},
  currentlyChecked = false,
  automation: UpgradeAutomationMetadata = { kind: "none" },
) {
  return computeUpgradeAutomation({
    sheetData: { ...defaultSheetData, ...overrides },
    option: { label, automation },
    currentlyChecked,
  })
}

function expectUpgradeStateOnly(
  result: ReturnType<typeof run>,
  checked: boolean,
  target: string,
) {
  expect(result).toMatchObject({
    kind: "setSheetData",
    upgradeState: checked
      ? { checked: true, params: { target } }
      : { checked: false },
  })
  expect(result.kind === "setSheetData" ? result.updates : undefined).toEqual({})
}

describe("升级选项自动化基线", () => {
  it("生命槽升级只返回 upgrade state，不直接改 hpMax", () => {
    expectUpgradeStateOnly(run("永久增加一个生命槽。", { hpMax: 6 }, false, { kind: "fixedTarget", target: "hpMax" }), true, "hpMax")
  })

  it("生命槽取消只返回未选中 upgrade state，不直接改 hpMax", () => {
    expectUpgradeStateOnly(run("永久增加一个生命槽。", { hpMax: 1 }, true, { kind: "fixedTarget", target: "hpMax" }), false, "hpMax")
  })

  it("生命槽缺失时勾选仍只返回 upgrade state", () => {
    expectUpgradeStateOnly(run("永久增加一个生命槽。", { hpMax: undefined }, false, { kind: "fixedTarget", target: "hpMax" }), true, "hpMax")
  })

  it("生命槽缺失时取消仍只返回未选中 upgrade state", () => {
    expectUpgradeStateOnly(run("永久增加一个生命槽。", { hpMax: undefined }, true, { kind: "fixedTarget", target: "hpMax" }), false, "hpMax")
  })

  it("压力槽升级只返回 upgrade state，不直接改 stressMax", () => {
    expectUpgradeStateOnly(run("永久增加一个压力槽。", { stressMax: 6 }, false, { kind: "fixedTarget", target: "stressMax" }), true, "stressMax")
  })

  it("压力槽勾选到上限时仍只返回 upgrade state", () => {
    expectUpgradeStateOnly(run("永久增加一个压力槽。", { stressMax: 18 }, false, { kind: "fixedTarget", target: "stressMax" }), true, "stressMax")
  })

  it("压力槽取消只返回未选中 upgrade state，不直接改 stressMax", () => {
    expectUpgradeStateOnly(run("永久增加一个压力槽。", { stressMax: 7 }, true, { kind: "fixedTarget", target: "stressMax" }), false, "stressMax")
  })

  it("压力槽缺失时勾选仍只返回 upgrade state", () => {
    expectUpgradeStateOnly(run("永久增加一个压力槽。", { stressMax: undefined }, false, { kind: "fixedTarget", target: "stressMax" }), true, "stressMax")
  })

  it("压力槽缺失时取消仍只返回未选中 upgrade state", () => {
    expectUpgradeStateOnly(run("永久增加一个压力槽。", { stressMax: undefined }, true, { kind: "fixedTarget", target: "stressMax" }), false, "stressMax")
  })

  it("熟练度升级只返回 upgrade state，不直接改熟练度", () => {
    expectUpgradeStateOnly(run("(同时标记两格) 获得熟练度+1。", {
      proficiency: [true, false, false, false, false, false],
    }, false, { kind: "fixedTarget", target: "proficiency" }), true, "proficiency")
  })

  it("熟练度取消只返回未选中 upgrade state，不直接改熟练度", () => {
    expectUpgradeStateOnly(run("(同时标记两格) 获得熟练度+1。", {
      proficiency: [true, true, false, false, false, false],
    }, true, { kind: "fixedTarget", target: "proficiency" }), false, "proficiency")
  })

  it("生命槽升级返回 upgrade state 信息", () => {
    expectUpgradeStateOnly(run("永久增加一个生命槽。", { hpMax: 6 }, false, { kind: "fixedTarget", target: "hpMax" }), true, "hpMax")
  })

  it("取消生命槽升级返回未选中 upgrade state 信息", () => {
    expectUpgradeStateOnly(run("永久增加一个生命槽。", { hpMax: 7 }, true, { kind: "fixedTarget", target: "hpMax" }), false, "hpMax")
  })

  it("已勾选属性升级选项会返回未选中 upgrade state 信息", () => {
    expect(run("两项未升级的角色属性+1，然后将该属性标记为已升级。", {}, true, { kind: "attributeSelection", count: 2 })).toEqual({
      kind: "setSheetData",
      updates: {},
      warnings: [],
      upgradeState: { checked: false },
    })
  })

  it("已勾选经历升级选项会返回未选中 upgrade state 信息", () => {
    expect(run("选择两项经历获得额外+1。", {}, true, { kind: "experienceSelection", count: 2 })).toEqual({
      kind: "setSheetData",
      updates: {},
      warnings: [],
      upgradeState: { checked: false },
    })
  })

  it("已勾选闪避升级选项只返回未选中 upgrade state，不直接改 evasion", () => {
    expectUpgradeStateOnly(run("获得闪避值+1。", { evasion: "20" }, true, { kind: "fixedTarget", target: "evasion" }), false, "evasion")
  })

  it("已勾选闪避升级选项的提示不会显示 undefined", () => {
    const result = run("获得闪避值+1。", { evasion: "20" }, true, { kind: "fixedTarget", target: "evasion" })

    expect(result).toMatchObject({
      kind: "setSheetData",
      upgradeState: { checked: false },
    })
    expect(result.kind === "setSheetData" ? result.updates : undefined).toEqual({})
    expect(result.kind === "setSheetData" ? result.message : "").not.toContain("undefined")
  })

  it("uses automation metadata even when the label has no old Chinese keywords", () => {
    expectUpgradeStateOnly(
      run("Rename-safe option text", {}, false, { kind: "fixedTarget", target: "evasion" }),
      true,
      "evasion",
    )
  })
})
