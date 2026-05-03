import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { AttributesSection } from "@/components/character-sheet-sections/attributes-section"
import { ModifierFieldAnchor } from "@/components/modifiers/modifier-field-anchor"
import { resetSheetStore, sheet } from "../automation/test-helpers"

describe("ModifierFieldAnchor", () => {
  it("renders source anchors on real attribute fields", () => {
    resetSheetStore()

    render(<AttributesSection />)

    expect(screen.getByRole("button", { name: "查看敏捷来源" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "查看力量来源" })).toBeInTheDocument()
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
      modifierState: {
        byTarget: {
          evasion: {
            activeBaseId: "user:evasion-base",
            userEntries: [{
              id: "user:evasion-base",
              sourceId: "user:evasion-base",
              target: "evasion",
              kind: "base",
              label: "手动基础闪避",
              value: 12,
              sourceType: "user",
              priority: 10,
            }, {
              id: "user:evasion-mod",
              sourceId: "user:evasion-mod",
              target: "evasion",
              kind: "modifier",
              label: "临时加值",
              value: 1,
              sourceType: "user",
              priority: 10,
            }],
          },
        },
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)

    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

    expect(screen.getByText("手动基础闪避")).toBeInTheDocument()
    expect(screen.getByText("临时加值")).toBeInTheDocument()
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
      modifierState: {
        byTarget: {
          evasion: {
            activeBaseId: "user:evasion-base-12",
            userEntries: [{
              id: "user:evasion-base-12",
              sourceId: "user:evasion-base-12",
              target: "evasion",
              kind: "base",
              label: "基础 12",
              value: 12,
              sourceType: "user",
              priority: 10,
            }, {
              id: "user:evasion-base-14",
              sourceId: "user:evasion-base-14",
              target: "evasion",
              kind: "base",
              label: "基础 14",
              value: 14,
              sourceType: "user",
              priority: 10,
            }],
          },
        },
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)
    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))
    await userEvent.click(screen.getByRole("radio", { name: /基础 14/ }))

    expect(screen.getByRole("radio", { name: /基础 14/ })).toBeChecked()
    expect(sheet().modifierState?.byTarget.evasion?.activeBaseId).toBe("user:evasion-base-14")
    expect(screen.getByText("未归因差额 +1")).toBeInTheDocument()
  })

  it("lets the user disable and re-enable a modifier", async () => {
    resetSheetStore({
      evasion: "15",
      modifierState: {
        byTarget: {
          evasion: {
            activeBaseId: "user:evasion-base",
            userEntries: [{
              id: "user:evasion-base",
              sourceId: "user:evasion-base",
              target: "evasion",
              kind: "base",
              label: "基础",
              value: 12,
              sourceType: "user",
              priority: 10,
            }, {
              id: "user:evasion-mod",
              sourceId: "user:evasion-mod",
              target: "evasion",
              kind: "modifier",
              label: "加值",
              value: 2,
              sourceType: "user",
              priority: 10,
            }],
          },
        },
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)
    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

    await userEvent.click(screen.getByRole("checkbox", { name: /加值/ }))
    expect(screen.getByRole("checkbox", { name: /加值/ })).not.toBeChecked()
    expect(sheet().modifierState?.byTarget.evasion?.disabledEntryIds).toContain("user:evasion-mod")
    expect(screen.getByText("未归因差额 +3")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("checkbox", { name: /加值/ }))
    expect(screen.getByRole("checkbox", { name: /加值/ })).toBeChecked()
    expect(sheet().modifierState?.byTarget.evasion?.disabledEntryIds ?? []).not.toContain("user:evasion-mod")
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

    expect(screen.getByText("手动基础")).toBeInTheDocument()
    expect(screen.getByText("参考合计")).toBeInTheDocument()
    expect(screen.getByText("未归因差额 +3")).toBeInTheDocument()
    expect(sheet().modifierState?.byTarget.evasion?.userEntries).toEqual([
      expect.objectContaining({ kind: "base", label: "手动基础", value: 12 }),
    ])
    expect(sheet().evasion).toBe("15")
  })

  it("adds and deletes a manual modifier", async () => {
    resetSheetStore({
      evasion: "15",
      modifierState: {
        byTarget: {
          evasion: {
            activeBaseId: "user:evasion-base",
            userEntries: [{
              id: "user:evasion-base",
              sourceId: "user:evasion-base",
              target: "evasion",
              kind: "base",
              label: "基础",
              value: 12,
              sourceType: "user",
              priority: 10,
            }],
          },
        },
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)
    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))
    expect(screen.queryByLabelText("加值名称")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "+ 自定义加值" }))
    await userEvent.type(screen.getByLabelText("加值名称"), "临时加值")
    await userEvent.type(screen.getByLabelText("加值数值"), "2")
    await userEvent.click(screen.getByRole("button", { name: "确认添加加值" }))

    expect(screen.getByText("临时加值")).toBeInTheDocument()
    expect(screen.getByText("未归因差额 +1")).toBeInTheDocument()
    expect(sheet().modifierState?.byTarget.evasion?.userEntries).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "modifier", label: "临时加值", value: 2 }),
    ]))

    await userEvent.click(screen.getByRole("button", { name: "删除临时加值" }))
    expect(screen.queryByText("临时加值")).not.toBeInTheDocument()
    expect(sheet().evasion).toBe("15")
  })

  it("adds a manual modifier from a numeric expression", async () => {
    resetSheetStore({
      evasion: "30",
      modifierState: {
        byTarget: {
          evasion: {
            activeBaseId: "user:evasion-base",
            userEntries: [{
              id: "user:evasion-base",
              sourceId: "user:evasion-base",
              target: "evasion",
              kind: "base",
              label: "基础",
              value: 12,
              sourceType: "user",
              priority: 10,
            }],
          },
        },
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)
    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))
    await userEvent.click(screen.getByRole("button", { name: "+ 自定义加值" }))
    await userEvent.type(screen.getByLabelText("加值名称"), "表达式加值")
    await userEvent.type(screen.getByLabelText("加值数值"), "12+1")
    await userEvent.click(screen.getByRole("button", { name: "确认添加加值" }))

    expect(screen.getByText("表达式加值")).toBeInTheDocument()
    expect(screen.getByText("+13")).toBeInTheDocument()
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
    expect(sheet().modifierState?.byTarget.evasion?.userEntries ?? []).toEqual([])
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
      modifierState: {
        byTarget: {
          evasion: {
            activeBaseId: "user:evasion-base",
            disabledEntryIds: ["user:evasion-disabled"],
            userEntries: [{
              id: "user:evasion-base",
              sourceId: "user:evasion-base",
              target: "evasion",
              kind: "base",
              label: "手动基础闪避",
              value: 12,
              sourceType: "user",
              priority: 10,
            }, {
              id: "user:evasion-enabled",
              sourceId: "user:evasion-enabled",
              target: "evasion",
              kind: "modifier",
              label: "启用加值",
              value: 1,
              sourceType: "user",
              priority: 10,
            }, {
              id: "user:evasion-disabled",
              sourceId: "user:evasion-disabled",
              target: "evasion",
              kind: "modifier",
              label: "停用加值",
              value: 2,
              sourceType: "user",
              priority: 10,
            }],
          },
        },
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)

    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

    expect(screen.getByRole("checkbox", { name: /启用加值/ })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: /停用加值/ })).not.toBeChecked()
    expect(screen.getByText("13")).toBeInTheDocument()
    expect(screen.getByText("未归因差额 +2")).toBeInTheDocument()
  })

  it("edits a manual entry value on blur", async () => {
    resetSheetStore({
      evasion: "15",
      modifierState: {
        byTarget: {
          evasion: {
            activeBaseId: "user:evasion-base",
            userEntries: [{
              id: "user:evasion-base",
              sourceId: "user:evasion-base",
              target: "evasion",
              kind: "base",
              label: "手动基础闪避",
              value: 12,
              sourceType: "user",
              priority: 10,
            }],
          },
        },
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)
    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

    const valueInput = screen.getByRole("spinbutton", { name: "编辑手动基础闪避数值" })
    await userEvent.clear(valueInput)
    await userEvent.type(valueInput, "5")
    await userEvent.tab()

    expect(sheet().modifierState?.byTarget.evasion?.userEntries).toEqual([
      expect.objectContaining({ id: "user:evasion-base", value: 5 }),
    ])
    expect(screen.getByText("未归因差额 +10")).toBeInTheDocument()
  })
})
