import { beforeEach, describe, expect, it } from "vitest"
import "@testing-library/jest-dom/vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import CharacterSheetPageTwo from "@/components/character-sheet-page-two"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { useSheetStore } from "@/lib/sheet-store"
import { createEstimatedBaseContribution } from "@/automation/core/special-contributions"
import type { ModifierContribution, ModifierTargetId } from "@/automation/core/types"

const ATTRIBUTE_TARGETS = [
  ["agility", "agility.value"],
  ["strength", "strength.value"],
  ["finesse", "finesse.value"],
  ["instinct", "instinct.value"],
  ["presence", "presence.value"],
  ["knowledge", "knowledge.value"],
] as const

function seedStore(overrides: Parameters<typeof useSheetStore.setState>[0] extends infer _ ? Partial<typeof defaultSheetData> : never) {
  const sheetData = {
    ...defaultSheetData,
    ...overrides,
  }
  delete (sheetData as any).checkedUpgrades
  delete (sheetData as any).automationSelections

  const contributions = [...(sheetData.userModifierContributions ?? [])]
  const hasBaseForTarget = (target: ModifierTargetId) =>
    contributions.some(contribution => contribution.definition.target === target && contribution.definition.kind === "base")
  const addEstimatedBase = (target: ModifierTargetId, value: unknown) => {
    if (value === "" || value === undefined || value === null) return
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue) || hasBaseForTarget(target)) return
    contributions.push(createEstimatedBaseContribution(target, numericValue) as ModifierContribution)
  }

  ATTRIBUTE_TARGETS.forEach(([attribute, target]) => {
    addEstimatedBase(target, sheetData[attribute]?.value)
  })
  sheetData.experienceValues?.forEach((value, index) => {
    addEstimatedBase(`experienceValues.${index}` as ModifierTargetId, value)
  })
  sheetData.userModifierContributions = contributions

  useSheetStore.setState({
    sheetData,
  })
}

function sheet() {
  return useSheetStore.getState().sheetData
}

describe("升级取消流程（page-two 集成）", () => {
  beforeEach(() => {
    useSheetStore.setState({ sheetData: { ...defaultSheetData } })
  })

  it("勾选闪避升级会直接记录升级选择，不打开确认气泡", async () => {
    const user = userEvent.setup()
    seedStore({
      evasion: "12",
    })

    const { getByTestId } = render(<CharacterSheetPageTwo />)
    await user.click(getByTestId("checkbox-tier1-5-0"))

    const after = sheet()
    expect(after.upgradeStates?.["tier1-5-0"]).toEqual({
      checked: true,
      params: { target: "evasion" },
    })
    expect("automationSelections" in (after as any)).toBe(false)
    expect("checkedUpgrades" in (after as any)).toBe(false)
    expect(screen.queryByText("闪避值 +1")).not.toBeInTheDocument()
  })

  it("标准模式应用属性升级时标记所选属性并记录标记归属", async () => {
    const user = userEvent.setup()
    seedStore({
      agility: { checked: false, value: "1", spellcasting: false },
      strength: { checked: false, value: "2", spellcasting: false },
    })

    const { getByTestId } = render(<CharacterSheetPageTwo />)
    await user.click(getByTestId("checkbox-tier1-0-0"))
    await user.click(await screen.findByTestId("attribute-upgrade-option-agility"))
    await user.click(screen.getByTestId("attribute-upgrade-option-strength"))
    await user.click(screen.getByRole("button", { name: /应用升级/ }))

    const after = sheet()
    expect(after.agility).toEqual({ checked: true, value: "2", spellcasting: false })
    expect(after.strength).toEqual({ checked: true, value: "3", spellcasting: false })
    expect(after.upgradeStates?.["tier1-0-0"]).toEqual({
      checked: true,
      params: { attributes: ["agility", "strength"] },
      attributeMarksApplied: true,
    })
  })

  it("自由模式允许选择已标记属性且不记录标记归属", async () => {
    const user = userEvent.setup()
    seedStore({
      agility: { checked: true, value: "1", spellcasting: false },
      strength: { checked: true, value: "2", spellcasting: false },
    })

    const { getByTestId } = render(<CharacterSheetPageTwo />)
    await user.click(getByTestId("checkbox-tier1-0-0"))
    await user.click(await screen.findByRole("button", { name: "自由" }))
    await user.click(screen.getByTestId("attribute-upgrade-option-agility"))
    await user.click(screen.getByTestId("attribute-upgrade-option-strength"))
    await user.click(screen.getByRole("button", { name: /应用升级/ }))

    const after = sheet()
    expect(after.agility).toEqual({ checked: true, value: "2", spellcasting: false })
    expect(after.strength).toEqual({ checked: true, value: "3", spellcasting: false })
    expect(after.upgradeStates?.["tier1-0-0"]).toEqual({
      checked: true,
      params: { attributes: ["agility", "strength"] },
    })
  })

  it("反选属性升级时点击外部会保留原有升级选择", async () => {
    const user = userEvent.setup()
    seedStore({
      agility: { checked: true, value: "1", spellcasting: false },
      strength: { checked: true, value: "2", spellcasting: false },
      upgradeStates: {
        "tier1-0-0": {
          checked: true,
          params: { attributes: ["agility", "strength"] },
        },
      },
    })

    const { getByTestId } = render(<CharacterSheetPageTwo />)
    await user.click(getByTestId("checkbox-tier1-0-0"))

    expect(screen.getByText("确定要取消升级吗？")).toBeInTheDocument()
    expect(screen.getByText("敏捷、力量")).toBeInTheDocument()
    expect(screen.getByText("属性升级标记将不会被修改")).toBeInTheDocument()

    await user.click(document.body)

    const after = sheet()
    expect(after.agility).toEqual({ checked: true, value: "1", spellcasting: false })
    expect(after.strength).toEqual({ checked: true, value: "2", spellcasting: false })
    expect(after.upgradeStates?.["tier1-0-0"]).toEqual({
      checked: true,
      params: { attributes: ["agility", "strength"] },
    })
    expect("automationSelections" in (after as any)).toBe(false)
    expect("checkedUpgrades" in (after as any)).toBe(false)
  })

  it("确认反选属性升级后才清除升级状态参数", async () => {
    const user = userEvent.setup()
    seedStore({
      agility: { checked: true, value: "1", spellcasting: false },
      strength: { checked: true, value: "2", spellcasting: false },
      upgradeStates: {
        "tier1-0-0": {
          checked: true,
          params: { attributes: ["agility", "strength"] },
        },
      },
    })

    const { getByTestId } = render(<CharacterSheetPageTwo />)
    await user.click(getByTestId("checkbox-tier1-0-0"))
    expect(screen.getByText("属性升级标记将不会被修改")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "确定取消" }))

    const after = sheet()
    expect(after.agility).toEqual({ checked: true, value: "1", spellcasting: false })
    expect(after.strength).toEqual({ checked: true, value: "2", spellcasting: false })
    expect(after.upgradeStates?.["tier1-0-0"]).toEqual({ checked: false })
    expect("automationSelections" in (after as any)).toBe(false)
    expect("checkedUpgrades" in (after as any)).toBe(false)
  })

  it("确认反选带标记归属的属性升级后会返还属性黑点", async () => {
    const user = userEvent.setup()
    seedStore({
      agility: { checked: true, value: "1", spellcasting: false },
      strength: { checked: true, value: "2", spellcasting: false },
      upgradeStates: {
        "tier1-0-0": {
          checked: true,
          params: { attributes: ["agility", "strength"] },
          attributeMarksApplied: true,
        },
      },
    })

    const { getByTestId } = render(<CharacterSheetPageTwo />)
    await user.click(getByTestId("checkbox-tier1-0-0"))
    expect(screen.getByText("将回退属性升级标记")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "确定取消" }))

    const after = sheet()
    expect(after.agility).toEqual({ checked: false, value: "1", spellcasting: false })
    expect(after.strength).toEqual({ checked: false, value: "2", spellcasting: false })
    expect(after.upgradeStates?.["tier1-0-0"]).toEqual({ checked: false })
    expect("automationSelections" in (after as any)).toBe(false)
    expect("checkedUpgrades" in (after as any)).toBe(false)
  })

  it("反选经历加值升级时点击外部会保留原有升级选择，并显示最新经历文本", async () => {
    const user = userEvent.setup()
    seedStore({
      experience: ["老兵", "铁匠大师", "", "", ""],
      experienceValues: ["2", "3", "", "", ""],
      upgradeStates: {
        "tier1-3-0": {
          checked: true,
          params: { experienceIndexes: [0, 1] },
        },
      },
    })

    const { getByTestId } = render(<CharacterSheetPageTwo />)
    await user.click(getByTestId("checkbox-tier1-3-0"))

    expect(screen.getByText("确定要取消升级吗？")).toBeInTheDocument()
    expect(screen.getByText("老兵")).toBeInTheDocument()
    expect(screen.getByText("铁匠大师")).toBeInTheDocument()

    await user.click(document.body)

    const after = sheet()
    expect(after.experienceValues).toEqual(["2", "3", "", "", ""])
    expect(after.upgradeStates?.["tier1-3-0"]).toEqual({
      checked: true,
      params: { experienceIndexes: [0, 1] },
    })
    expect("automationSelections" in (after as any)).toBe(false)
    expect("checkedUpgrades" in (after as any)).toBe(false)
  })

  it("确认反选经历加值升级后才清除升级状态参数，不直接回滚经历最终值", async () => {
    const user = userEvent.setup()
    seedStore({
      experience: ["军人", "铁匠", "", "", ""],
      experienceValues: ["2", "3", "", "", ""],
      upgradeStates: {
        "tier1-3-0": {
          checked: true,
          params: { experienceIndexes: [0, 1] },
        },
      },
    })

    const { getByTestId } = render(<CharacterSheetPageTwo />)
    await user.click(getByTestId("checkbox-tier1-3-0"))
    await user.click(screen.getByRole("button", { name: "确定取消" }))

    const after = sheet()
    expect(after.experienceValues).toEqual(["2", "3", "", "", ""])
    expect(after.upgradeStates?.["tier1-3-0"]).toEqual({ checked: false })
    expect("automationSelections" in (after as any)).toBe(false)
    expect("checkedUpgrades" in (after as any)).toBe(false)
  })

  it("参数化升级取消后重新点击会打开选择器且不复用旧 params", async () => {
    const user = userEvent.setup()
    seedStore({
      agility: { checked: true, value: "1", spellcasting: false },
      strength: { checked: true, value: "2", spellcasting: false },
      upgradeStates: {
        "tier1-0-0": {
          checked: true,
          params: { attributes: ["agility", "strength"] },
        },
      },
    })

    const { getByTestId } = render(<CharacterSheetPageTwo />)
    await user.click(getByTestId("checkbox-tier1-0-0"))
    await user.click(screen.getByRole("button", { name: "确定取消" }))
    await user.click(getByTestId("checkbox-tier1-0-0"))

    expect(screen.getByText("属性升级")).toBeInTheDocument()
    expect(screen.getByText("选择两项未升级的属性 (0/2)")).toBeInTheDocument()
    expect(sheet().upgradeStates?.["tier1-0-0"]).toEqual({ checked: false })
  })
})
