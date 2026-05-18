import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AttributeUpgradeEditor } from "@/components/upgrade-popover/attribute-upgrade-editor"
import { ExperienceValuesEditor } from "@/components/upgrade-popover/experience-values-editor"
import { resetSheetStore, sheet } from "./test-helpers"

describe("升级编辑器组件烟雾测试", () => {
  beforeEach(() => resetSheetStore())

  it("ExperienceValuesEditor 确认后记录两项经历升级并勾选对应升级项", async () => {
    const user = userEvent.setup()
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

    await user.click(screen.getByText("军人"))
    await user.click(screen.getByText("铁匠"))
    await user.click(screen.getByRole("button", { name: /应用升级/ }))

    expect(sheet().experienceValues?.[0]).toBe("1")
    expect(sheet().experienceValues?.[1]).toBe("2")
    expect(sheet().upgradeStates?.["tier1-3-0"]).toEqual({
      checked: true,
      params: { experienceIndexes: [0, 1] },
    })
    expect("automationSelections" in (sheet() as any)).toBe(false)
    expect(sheet().checkedUpgrades).toBeUndefined()
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

  it("AttributeUpgradeEditor 将已记录在 upgradeStates 的属性视为不可再升级", () => {
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

    expect(screen.getByText("需要至少2个未升级属性")).toBeTruthy()
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
    })
    expect("automationSelections" in (sheet() as any)).toBe(false)
    expect(sheet().checkedUpgrades).toBeUndefined()
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
