import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { EvasionEditor } from "@/components/upgrade-popover/evasion-editor"
import { ExperienceValuesEditor } from "@/components/upgrade-popover/experience-values-editor"
import { resetSheetStore, sheet } from "./test-helpers"

describe("升级编辑器组件烟雾测试", () => {
  beforeEach(() => resetSheetStore())

  it("EvasionEditor 确认后写入闪避并勾选对应升级项", async () => {
    const user = userEvent.setup()
    const toggleUpgradeCheckbox = vi.fn()
    resetSheetStore({ evasion: "12" })

    render(
      <EvasionEditor
        checkKey="tier1-5-0"
        optionIndex={5}
        toggleUpgradeCheckbox={toggleUpgradeCheckbox}
      />,
    )

    await user.click(screen.getByTitle("计算当前值 +1"))
    await user.click(screen.getByRole("button", { name: /确认/ }))

    expect(sheet().evasion).toBe("13")
    expect(sheet().automationSelections?.["upgrade:tier1-5-0"]).toEqual({
      selected: true,
      params: { target: "evasion" },
    })
    expect(toggleUpgradeCheckbox).toHaveBeenCalledWith("tier1-5-0", 5, true)
  })

  it("EvasionEditor 未修改数值确认后记录升级选择并保持闪避不变", async () => {
    const user = userEvent.setup()
    const toggleUpgradeCheckbox = vi.fn()
    resetSheetStore({ evasion: "12" })

    render(
      <EvasionEditor
        checkKey="tier1-5-0"
        optionIndex={5}
        toggleUpgradeCheckbox={toggleUpgradeCheckbox}
      />,
    )

    await user.click(screen.getByRole("button", { name: /确认/ }))

    expect(toggleUpgradeCheckbox).toHaveBeenCalledWith("tier1-5-0", 5, true)
    expect(sheet().automationSelections?.["upgrade:tier1-5-0"]).toEqual({
      selected: true,
      params: { target: "evasion" },
    })
    expect(sheet().evasion).toBe("12")
  })

  it("ExperienceValuesEditor 确认后写入两项经历加值并勾选对应升级项", async () => {
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
    const incrementButtons = screen.getAllByTitle("增加经历加值 (+1)")
    await user.click(incrementButtons[0])
    await user.click(incrementButtons[1])
    await user.click(screen.getByRole("button", { name: /应用升级/ }))

    expect(sheet().experienceValues?.[0]).toBe("2")
    expect(sheet().experienceValues?.[1]).toBe("3")
    expect(toggleUpgradeCheckbox).toHaveBeenCalledWith("tier1-3-0", 3, true)
  })
})
