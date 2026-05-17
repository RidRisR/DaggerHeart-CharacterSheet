import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import CharacterSheet from "@/components/character-sheet"
import { AttributesSection } from "@/components/character-sheet-sections/attributes-section"
import { ModifierFieldAnchor } from "@/components/modifiers/modifier-field-anchor"
import type { ModifierEntryKind, ModifierTargetId, UserModifierContribution } from "@/lib/modifiers/types"
import { resetSheetStore, sheet } from "../automation/test-helpers"

function userContribution(
  id: string,
  target: ModifierTargetId,
  kind: ModifierEntryKind,
  label: string,
  value: number,
): UserModifierContribution {
  return {
    id,
    definition: { target, kind },
    editable: { label, value },
  }
}

describe("ModifierFieldAnchor", () => {
  it("renders source anchors on real attribute fields", () => {
    resetSheetStore()

    render(<AttributesSection />)

    expect(screen.getByRole("button", { name: "查看敏捷来源" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "查看力量来源" })).toBeInTheDocument()
  })

  it("renders a source anchor on the real proficiency field", () => {
    resetSheetStore()

    render(<CharacterSheet />)

    expect(screen.getByRole("button", { name: "查看熟练度来源" })).toBeInTheDocument()
  })

  it("hides the source anchor wrapper in print layouts", () => {
    resetSheetStore()

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)

    expect(screen.getByRole("button", { name: "查看闪避来源" }).parentElement).toHaveClass("print:hidden")
  })

  it("uses opacity for source anchor hover feedback without changing color or background", () => {
    resetSheetStore()

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)

    const button = screen.getByRole("button", { name: "查看闪避来源" })
    expect(button).not.toHaveClass("hover:bg-gray-100")
    expect(button).not.toHaveClass("hover:text-gray-900")
    expect(button).toHaveClass("hover:opacity-100")
  })

  it("inherits the surrounding text color so it works on dark and light backgrounds", () => {
    resetSheetStore()

    render(
      <div className="text-white">
        <ModifierFieldAnchor target="evasion" label="闪避" />
      </div>,
    )

    const button = screen.getByRole("button", { name: "查看闪避来源" })
    expect(button).toHaveClass("text-current")
    expect(button).toHaveClass("opacity-70")
    expect(button).not.toHaveClass("text-gray-500")
  })

  it("supports a compact inline size for small labels", () => {
    resetSheetStore()

    render(<ModifierFieldAnchor target="hpMax" label="生命上限" size="compact" />)

    const button = screen.getByRole("button", { name: "查看生命上限来源" })
    expect(button).toHaveClass("h-3.5")
    expect(button).toHaveClass("w-3.5")
  })

  it("shows base, modifier, and unattributed delta", async () => {
    resetSheetStore({
      evasion: "15",
      userModifierContributions: [
        userContribution("user:evasion-base", "evasion", "base", "手动基础闪避", 12),
        userContribution("user:evasion-mod", "evasion", "modifier", "临时加值", 1),
      ],
      modifierState: {
        targetStates: { evasion: { activeBaseId: "user:evasion-base" } },
        entryStates: {},
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)

    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

    expect(screen.getByRole("textbox", { name: "编辑手动基础闪避名称" })).toHaveValue("手动基础闪避")
    expect(screen.getByRole("textbox", { name: "编辑临时加值名称" })).toHaveValue("临时加值")
    expect(screen.getByText("未归因差额 +2")).toBeInTheDocument()
  })

  it("renders the popover outside the clipped anchor container", async () => {
    resetSheetStore({ evasion: "13" })

    render(
      <div data-testid="clip" className="overflow-hidden">
        <ModifierFieldAnchor target="evasion" label="闪避" />
      </div>,
    )

    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

    const popover = screen.getByRole("dialog", { name: "闪避来源" })
    expect(popover).toBeInTheDocument()
    expect(screen.getByTestId("clip")).not.toContainElement(popover)
  })

  it("closes the popover when clicking outside", async () => {
    resetSheetStore({ evasion: "13" })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)

    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))
    expect(screen.getByRole("dialog", { name: "闪避来源" })).toBeInTheDocument()

    await userEvent.click(document.body)
    expect(screen.queryByRole("dialog", { name: "闪避来源" })).not.toBeInTheDocument()
  })

  it("closes the popover when pressing Escape", async () => {
    resetSheetStore({ evasion: "13" })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)

    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))
    await userEvent.keyboard("{Escape}")
    expect(screen.queryByRole("dialog", { name: "闪避来源" })).not.toBeInTheDocument()
  })

  it("lets the user select the active base", async () => {
    resetSheetStore({
      evasion: "15",
      userModifierContributions: [
        userContribution("user:evasion-base-12", "evasion", "base", "基础 12", 12),
        userContribution("user:evasion-base-14", "evasion", "base", "基础 14", 14),
      ],
      modifierState: {
        targetStates: { evasion: { activeBaseId: "user:evasion-base-12" } },
        entryStates: {},
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)
    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))
    await userEvent.click(screen.getByRole("radio", { name: /基础 14/ }))

    expect(screen.getByRole("radio", { name: /基础 14/ })).toBeChecked()
    expect(sheet().modifierState?.targetStates.evasion?.activeBaseId).toBe("user:evasion-base-14")
    expect(screen.getByText("未归因差额 +1")).toBeInTheDocument()
  })

  it("adds a manual base without changing the final value", async () => {
    resetSheetStore({ evasion: "15" })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)
    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))
    expect(screen.queryByLabelText("基值名称")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "+ 自定义基值" }))
    await userEvent.type(screen.getByLabelText("基值名称"), "手动基础")
    await userEvent.type(screen.getByLabelText("基值数值"), "12")
    await userEvent.click(screen.getByRole("button", { name: "确认添加基值" }))

    expect(screen.getByRole("textbox", { name: "编辑手动基础名称" })).toHaveValue("手动基础")
    expect(screen.getByText("参考合计")).toBeInTheDocument()
    expect(screen.getByText("未归因差额 +3")).toBeInTheDocument()
    expect(sheet().userModifierContributions).toEqual([
      expect.objectContaining({
        definition: { target: "evasion", kind: "base" },
        editable: { label: "手动基础", value: 12 },
      }),
    ])
    expect(sheet().evasion).toBe("15")
  })

  it("adds and deletes a manual modifier", async () => {
    resetSheetStore({
      evasion: "15",
      userModifierContributions: [
        userContribution("user:evasion-base", "evasion", "base", "基础", 12),
      ],
      modifierState: {
        targetStates: { evasion: { activeBaseId: "user:evasion-base" } },
        entryStates: {},
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)
    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))
    expect(screen.queryByLabelText("加值名称")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "+ 自定义加值" }))
    await userEvent.type(screen.getByLabelText("加值名称"), "临时加值")
    await userEvent.type(screen.getByLabelText("加值数值"), "2")
    await userEvent.click(screen.getByRole("button", { name: "确认添加加值" }))

    expect(screen.getByRole("textbox", { name: "编辑临时加值名称" })).toHaveValue("临时加值")
    expect(screen.getByText("未归因差额 +1")).toBeInTheDocument()
    expect(sheet().userModifierContributions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "临时加值", value: 2 },
      }),
    ]))

    await userEvent.click(screen.getByRole("button", { name: "删除临时加值" }))
    expect(screen.queryByRole("textbox", { name: "编辑临时加值名称" })).not.toBeInTheDocument()
    expect(sheet().userModifierContributions?.some(contribution => contribution.editable.label === "临时加值")).toBe(false)
    expect(sheet().evasion).toBe("15")
  })

  it("clears the active base when deleting the active user base", async () => {
    resetSheetStore({
      evasion: "15",
      userModifierContributions: [
        userContribution("user:evasion-base-active", "evasion", "base", "当前基础", 12),
        userContribution("user:evasion-base-other", "evasion", "base", "备用基础", 14),
      ],
      modifierState: {
        targetStates: { evasion: { activeBaseId: "user:evasion-base-active" } },
        entryStates: {},
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)
    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))
    await userEvent.click(screen.getByRole("button", { name: "删除当前基础" }))

    expect(sheet().modifierState?.targetStates.evasion?.activeBaseId).toBeUndefined()
    expect(sheet().userModifierContributions?.some(
      contribution => contribution.id === "user:evasion-base-active",
    )).toBe(false)
  })

  it("adds a manual modifier from a numeric expression", async () => {
    resetSheetStore({
      evasion: "30",
      userModifierContributions: [
        userContribution("user:evasion-base", "evasion", "base", "基础", 12),
      ],
      modifierState: {
        targetStates: { evasion: { activeBaseId: "user:evasion-base" } },
        entryStates: {},
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)
    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))
    await userEvent.click(screen.getByRole("button", { name: "+ 自定义加值" }))
    await userEvent.type(screen.getByLabelText("加值名称"), "表达式加值")
    await userEvent.type(screen.getByLabelText("加值数值"), "12+1")
    await userEvent.click(screen.getByRole("button", { name: "确认添加加值" }))

    expect(screen.getByRole("textbox", { name: "编辑表达式加值名称" })).toHaveValue("表达式加值")
    expect(screen.getByRole("spinbutton", { name: "编辑表达式加值数值" })).toHaveValue(13)
    expect(screen.getByText("未归因差额 +5")).toBeInTheDocument()
  })

  it("rejects non-numeric manual source values", async () => {
    resetSheetStore({ evasion: "15" })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)
    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))
    await userEvent.click(screen.getByRole("button", { name: "+ 自定义加值" }))
    await userEvent.type(screen.getByLabelText("加值数值"), "abc")
    await userEvent.click(screen.getByRole("button", { name: "确认添加加值" }))

    expect(screen.getByText("请输入数字")).toBeInTheDocument()
    expect(sheet().userModifierContributions ?? []).toEqual([])
  })

  it("shows unknown base when no base exists", async () => {
    resetSheetStore({ evasion: "13" })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)

    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

    expect(screen.getByText("未知基础值")).toBeInTheDocument()
    expect(screen.queryByText(/未归因差额/)).not.toBeInTheDocument()
  })

  it("keeps disabled modifiers visible but removes them from active addends", async () => {
    resetSheetStore({
      evasion: "15",
      userModifierContributions: [
        userContribution("user:evasion-base", "evasion", "base", "手动基础闪避", 12),
        userContribution("user:evasion-enabled", "evasion", "modifier", "启用加值", 1),
        userContribution("user:evasion-disabled", "evasion", "modifier", "停用加值", 2),
      ],
      modifierState: {
        targetStates: { evasion: { activeBaseId: "user:evasion-base" } },
        entryStates: { "user:evasion-disabled": { enabled: false } },
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)

    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

    expect(screen.getByDisplayValue("启用加值")).toBeInTheDocument()
    expect(screen.getByDisplayValue("停用加值")).toBeInTheDocument()
    expect(screen.getByText("13")).toBeInTheDocument()
    expect(screen.getByText("未归因差额 +2")).toBeInTheDocument()
  })

  it("edits a manual entry value on blur", async () => {
    resetSheetStore({
      evasion: "15",
      userModifierContributions: [
        userContribution("user:evasion-base", "evasion", "base", "手动基础闪避", 12),
      ],
      modifierState: {
        targetStates: { evasion: { activeBaseId: "user:evasion-base" } },
        entryStates: {},
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)
    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

    const valueInput = screen.getByRole("spinbutton", { name: "编辑手动基础闪避数值" })
    await userEvent.clear(valueInput)
    await userEvent.type(valueInput, "5")
    await userEvent.tab()

    expect(sheet().userModifierContributions).toEqual([
      expect.objectContaining({
        id: "user:evasion-base",
        editable: { label: "手动基础闪避", value: 5 },
      }),
    ])
    expect(screen.getByText("未归因差额 +10")).toBeInTheDocument()
  })

  it("edits a manual entry label on blur", async () => {
    resetSheetStore({
      evasion: "15",
      userModifierContributions: [
        userContribution("user:evasion-base", "evasion", "base", "手动基础闪避", 12),
      ],
      modifierState: {
        targetStates: { evasion: { activeBaseId: "user:evasion-base" } },
        entryStates: {},
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)
    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

    const labelInput = screen.getByRole("textbox", { name: "编辑手动基础闪避名称" })
    await userEvent.clear(labelInput)
    await userEvent.type(labelInput, "重命名基础")
    await userEvent.tab()

    expect(sheet().userModifierContributions).toEqual([
      expect.objectContaining({
        id: "user:evasion-base",
        editable: { label: "重命名基础", value: 12 },
      }),
    ])
    expect(screen.getByRole("textbox", { name: "编辑重命名基础名称" })).toBeInTheDocument()
  })

  it("toggles auto calculation from the popover", async () => {
    resetSheetStore({
      evasion: "10",
      userModifierContributions: [
        userContribution("user:evasion-base", "evasion", "base", "Base", 12),
      ],
      modifierState: {
        targetStates: { evasion: { activeBaseId: "user:evasion-base" } },
        entryStates: {},
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)
    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))
    await userEvent.click(screen.getByRole("checkbox", { name: "自动计算" }))

    expect(sheet().modifierState?.targetStates.evasion?.autoCalculation).toBe(true)
    expect(sheet().evasion).toBe("10")
  })
})
