import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AttributeUpgradeEditor } from "@/components/upgrade-popover/attribute-upgrade-editor"
import { EvasionEditor } from "@/components/upgrade-popover/evasion-editor"
import { ExperienceValuesEditor } from "@/components/upgrade-popover/experience-values-editor"
import { resetSheetStore, sheet } from "./test-helpers"

describe("升级编辑器组件烟雾测试", () => {
  beforeEach(() => resetSheetStore())

  it("EvasionEditor 确认后记录升级选择并勾选对应升级项", async () => {
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

    expect(sheet().evasion).toBe("12")
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
    expect(sheet().automationSelections?.["upgrade:tier1-3-0"]).toEqual({
      selected: true,
      params: { experienceIndexes: [0, 1] },
    })
    expect(toggleUpgradeCheckbox).toHaveBeenCalledWith("tier1-3-0", 3, true)
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

  it("AttributeUpgradeEditor 将已记录在 automationSelections 的属性视为不可再升级", () => {
    const toggleUpgradeCheckbox = vi.fn()
    resetSheetStore({
      agility: { checked: false, value: "1", spellcasting: false },
      strength: { checked: false, value: "1", spellcasting: false },
      finesse: { checked: true, value: "1", spellcasting: false },
      instinct: { checked: true, value: "1", spellcasting: false },
      presence: { checked: true, value: "1", spellcasting: false },
      knowledge: { checked: true, value: "1", spellcasting: false },
      automationSelections: {
        "upgrade:tier1-0-0": {
          selected: true,
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
