import { beforeEach, describe, expect, it, vi } from "vitest"
import "@testing-library/jest-dom/vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HeaderSection } from "@/components/character-sheet-sections/header-section"
import { AttributeUpgradeEditor } from "@/components/upgrade-popover/attribute-upgrade-editor"
import { ExperienceValuesEditor } from "@/components/upgrade-popover/experience-values-editor"
import { createEstimatedBaseContribution } from "@/lib/modifiers/special-contributions"
import { resetSheetStore, sheet } from "./test-helpers"

describe("升级编辑器组件烟雾测试", () => {
  beforeEach(() => resetSheetStore())

  it("HeaderSection 手动提交等级输入时运行 level-entry automation", async () => {
    const user = userEvent.setup()
    resetSheetStore({
      level: "1",
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

    const { container } = render(
      <HeaderSection
        onOpenProfessionModal={vi.fn()}
        onOpenAncestryModal={vi.fn()}
        onOpenCommunityModal={vi.fn()}
        onOpenSubclassModal={vi.fn()}
      />,
    )

    const levelInput = container.querySelector<HTMLInputElement>('input[name="level"]')
    expect(levelInput).not.toBeNull()

    await user.click(levelInput!)
    await user.clear(levelInput!)
    await user.type(levelInput!, "5")
    await user.tab()

    expect(sheet().level).toBe("5")
    expect(sheet().agility?.checked).toBe(false)
    expect(sheet().strength?.checked).toBe(false)
    expect(sheet().upgradeStates?.["tier1-0-0"]).toEqual({
      checked: true,
      params: { attributes: ["agility", "strength"] },
    })
  })

  it("HeaderSection 非等级文本字段仍在输入时写入 store", async () => {
    const user = userEvent.setup()
    resetSheetStore({ name: "" })

    const { container } = render(
      <HeaderSection
        onOpenProfessionModal={vi.fn()}
        onOpenAncestryModal={vi.fn()}
        onOpenCommunityModal={vi.fn()}
        onOpenSubclassModal={vi.fn()}
      />,
    )

    const nameInput = container.querySelector<HTMLInputElement>('input[name="name"]')
    expect(nameInput).not.toBeNull()

    await user.type(nameInput!, "阿岚")

    expect(sheet().name).toBe("阿岚")
  })

  it("ExperienceValuesEditor 确认后记录两项经历升级并勾选对应升级项", async () => {
    const user = userEvent.setup()
    const toggleUpgradeCheckbox = vi.fn()
    resetSheetStore({
      experience: ["军人", "铁匠", "", "", ""],
      experienceValues: ["1", "2", "", "", ""],
      userModifierContributions: [
        createEstimatedBaseContribution("experienceValues.0", 1),
        createEstimatedBaseContribution("experienceValues.1", 2),
      ],
    })

    render(
      <ExperienceValuesEditor
        checkKey="tier1-3-0"
        optionIndex={3}
        toggleUpgradeCheckbox={toggleUpgradeCheckbox}
      />,
    )

    await user.click(screen.getByText("军人"))
    await user.click(screen.getByText("铁匠"))
    await user.click(screen.getByRole("button", { name: /应用升级/ }))

    expect(sheet().experienceValues?.[0]).toBe("2")
    expect(sheet().experienceValues?.[1]).toBe("3")
    expect(sheet().upgradeStates?.["tier1-3-0"]).toEqual({
      checked: true,
      params: { experienceIndexes: [0, 1] },
    })
    expect("automationSelections" in (sheet() as any)).toBe(false)
    expect("checkedUpgrades" in (sheet() as any)).toBe(false)
    expect(toggleUpgradeCheckbox).not.toHaveBeenCalled()
  })

  it("ExperienceValuesEditor 只提供选择，不提供未持久化的数值编辑控件", () => {
    const toggleUpgradeCheckbox = vi.fn()
    resetSheetStore({
      experience: ["军人", "铁匠", "", "", ""],
      experienceValues: ["1", "2", "", "", ""],
    })

    render(
      <ExperienceValuesEditor
        checkKey="tier1-3-0"
        optionIndex={3}
        toggleUpgradeCheckbox={toggleUpgradeCheckbox}
      />,
    )

    expect(screen.queryByText("修改两项")).toBeNull()
    expect(screen.queryByRole("textbox")).toBeNull()
    expect(screen.queryByTitle("增加经历加值 (+1)")).toBeNull()
    expect(screen.queryByTitle("减少经历加值 (-1)")).toBeNull()
  })

  it("AttributeUpgradeEditor 标准模式只将 AttributeValue.checked 视为不可再升级", async () => {
    const user = userEvent.setup()
    const toggleUpgradeCheckbox = vi.fn()
    resetSheetStore({
      agility: { checked: false, value: "1", spellcasting: false },
      strength: { checked: false, value: "1", spellcasting: false },
      finesse: { checked: true, value: "1", spellcasting: false },
      instinct: { checked: true, value: "1", spellcasting: false },
      presence: { checked: true, value: "1", spellcasting: false },
      knowledge: { checked: true, value: "1", spellcasting: false },
      upgradeStates: {
        "tier1-0-0": {
          checked: true,
          params: { attributes: ["agility"] },
        },
      },
    })

    render(
      <AttributeUpgradeEditor
        checkKey="tier1-0-1"
        optionIndex={0}
        toggleUpgradeCheckbox={toggleUpgradeCheckbox}
      />,
    )

    await user.click(screen.getByTestId("attribute-upgrade-option-agility"))
    await user.click(screen.getByTestId("attribute-upgrade-option-strength"))

    expect(screen.queryByText("需要至少2个未升级属性")).toBeNull()
    expect(screen.getByRole("button", { name: /应用升级/ })).toBeEnabled()
  })

  it("AttributeUpgradeEditor 说明标准和自由模式如何处理属性升级标记", async () => {
    const user = userEvent.setup()
    const toggleUpgradeCheckbox = vi.fn()
    resetSheetStore()

    render(
      <AttributeUpgradeEditor
        checkKey="tier1-0-0"
        optionIndex={0}
        toggleUpgradeCheckbox={toggleUpgradeCheckbox}
      />,
    )

    expect(screen.getByText("将自动添加属性升级标记")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "自由" }))

    expect(screen.getByText("属性升级标记将不会被修改")).toBeInTheDocument()
  })

  it("AttributeUpgradeEditor 确认后写入 upgradeStates 参数", async () => {
    const user = userEvent.setup()
    const toggleUpgradeCheckbox = vi.fn()
    resetSheetStore()

    render(
      <AttributeUpgradeEditor
        checkKey="tier1-0-0"
        optionIndex={0}
        toggleUpgradeCheckbox={toggleUpgradeCheckbox}
      />,
    )

    await user.click(screen.getByText("敏捷"))
    await user.click(screen.getByText("力量"))
    await user.click(screen.getByRole("button", { name: /应用升级/ }))

    expect(sheet().upgradeStates?.["tier1-0-0"]).toEqual({
      checked: true,
      params: { attributes: ["agility", "strength"] },
      attributeMarksApplied: true,
    })
    expect(sheet().agility?.checked).toBe(true)
    expect(sheet().strength?.checked).toBe(true)
    expect("automationSelections" in (sheet() as any)).toBe(false)
    expect("checkedUpgrades" in (sheet() as any)).toBe(false)
    expect(toggleUpgradeCheckbox).not.toHaveBeenCalled()
  })

  it("AttributeUpgradeEditor 只提供选择，不提供未持久化的数值编辑控件", () => {
    const toggleUpgradeCheckbox = vi.fn()
    resetSheetStore()

    render(
      <AttributeUpgradeEditor
        checkKey="tier1-0-0"
        optionIndex={0}
        toggleUpgradeCheckbox={toggleUpgradeCheckbox}
      />,
    )

    expect(screen.queryByText("修改两项")).toBeNull()
    expect(screen.queryByRole("textbox")).toBeNull()
    expect(screen.queryByTitle("增加属性值 (+1)")).toBeNull()
    expect(screen.queryByTitle("减少属性值 (-1)")).toBeNull()
  })
})
