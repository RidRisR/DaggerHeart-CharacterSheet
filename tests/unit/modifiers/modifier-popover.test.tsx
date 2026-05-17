import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import type { StandardCard } from "@/card/card-types"
import CharacterSheet from "@/components/character-sheet"
import { AttributesSection } from "@/components/character-sheet-sections/attributes-section"
import { ModifierFieldAnchor } from "@/components/modifiers/modifier-field-anchor"
import { defaultSheetData } from "@/lib/default-sheet-data"
import {
  getUnattributedDeltaId,
  UNATTRIBUTED_DELTA_LABEL,
} from "@/lib/modifiers/special-contributions"
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

function professionCard(evasion: number): StandardCard {
  return {
    id: "profession-ranger",
    name: "游侠",
    type: "profession",
    class: "游侠",
    professionSpecial: {
      起始闪避: evasion,
      起始生命: 6,
      起始物品: "",
      希望特性: "",
    },
  } as StandardCard
}

function expectUnattributedDelta(value: string) {
  expect(screen.getByText("未归因差额")).toBeInTheDocument()
  expect(screen.getByText(value)).toBeInTheDocument()
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
        targetStates: { evasion: { activeBaseId: "user:evasion-base", autoCalculation: false } },
        entryStates: {},
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)

    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

    expect(screen.getByRole("textbox", { name: "编辑手动基础闪避名称" })).toHaveValue("手动基础闪避")
    expect(screen.getByRole("textbox", { name: "编辑临时加值名称" })).toHaveValue("临时加值")
    expectUnattributedDelta("+2")
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
        targetStates: { evasion: { activeBaseId: "user:evasion-base-12", autoCalculation: false } },
        entryStates: {},
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)
    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))
    await userEvent.click(screen.getByRole("radio", { name: /基础 14/ }))

    expect(screen.getByRole("radio", { name: /基础 14/ })).toBeChecked()
    expect(sheet().modifierState?.targetStates.evasion?.activeBaseId).toBe("user:evasion-base-14")
    expectUnattributedDelta("+1")
  })

  it("adds a manual base without changing the final value", async () => {
    resetSheetStore({
      evasion: "15",
      modifierState: {
        targetStates: {
          evasion: { autoCalculation: false },
        },
        entryStates: {},
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)
    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))
    expect(screen.queryByLabelText("基值名称")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "+ 自定义基值" }))

    expect(screen.getByRole("textbox", { name: "编辑未命名基值名称" })).toHaveValue("")
    expect(screen.getByRole("textbox", { name: "编辑未命名基值名称" })).toHaveAttribute("placeholder", "未命名基值")
    expect(screen.getByRole("textbox", { name: "编辑未命名基值数值" })).toHaveValue("0")
    expect(screen.getByText("总值")).toBeInTheDocument()
    expectUnattributedDelta("+15")
    expect(sheet().userModifierContributions).toEqual([
      expect.objectContaining({
        definition: { target: "evasion", kind: "base" },
        editable: { label: "", value: 0 },
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
        targetStates: { evasion: { activeBaseId: "user:evasion-base", autoCalculation: false } },
        entryStates: {},
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)
    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))
    expect(screen.queryByLabelText("修正值名称")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "+ 自定义修正值" }))

    expect(screen.getByRole("textbox", { name: "编辑未命名修正值名称" })).toHaveValue("")
    expect(screen.getByRole("textbox", { name: "编辑未命名修正值名称" })).toHaveAttribute("placeholder", "未命名修正值")
    expect(screen.getByRole("textbox", { name: "编辑未命名修正值数值" })).toHaveValue("+0")
    expectUnattributedDelta("+3")
    expect(sheet().userModifierContributions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "", value: 0 },
      }),
    ]))

    await userEvent.click(screen.getByRole("button", { name: "删除未命名修正值" }))
    expect(screen.queryByRole("textbox", { name: "编辑未命名修正值名称" })).not.toBeInTheDocument()
    expect(sheet().userModifierContributions?.some(contribution => contribution.editable.label === "未命名修正值")).toBe(false)
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
        targetStates: { evasion: { activeBaseId: "user:evasion-base-active", autoCalculation: false } },
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
        targetStates: { evasion: { activeBaseId: "user:evasion-base", autoCalculation: false } },
        entryStates: {},
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)
    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))
    await userEvent.click(screen.getByRole("button", { name: "+ 自定义修正值" }))
    const labelInput = screen.getByRole("textbox", { name: "编辑未命名修正值名称" })
    const valueInput = screen.getByRole("textbox", { name: "编辑未命名修正值数值" })
    await userEvent.clear(labelInput)
    await userEvent.type(labelInput, "表达式加值")
    await userEvent.clear(valueInput)
    await userEvent.type(valueInput, "12+1")
    await userEvent.tab()

    expect(screen.getByRole("textbox", { name: "编辑表达式加值名称" })).toHaveValue("表达式加值")
    expect(screen.getByRole("textbox", { name: "编辑表达式加值数值" })).toHaveValue("+13")
    expectUnattributedDelta("+5")
  })

  it("shows unknown base when no base exists", async () => {
    resetSheetStore({ evasion: "13" })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)

    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

    expect(screen.getByText("未知基础值")).toBeInTheDocument()
    expect(screen.queryByText(/未归因差额/)).not.toBeInTheDocument()
  })

  it("keeps legacy disabled modifiers visible without checkbox or disabled styling", async () => {
    resetSheetStore({
      evasion: "15",
      userModifierContributions: [
        userContribution("user:evasion-base", "evasion", "base", "手动基础闪避", 12),
        userContribution("user:evasion-enabled", "evasion", "modifier", "启用加值", 1),
        userContribution("user:evasion-disabled", "evasion", "modifier", "停用加值", 2),
      ],
      modifierState: {
        targetStates: { evasion: { activeBaseId: "user:evasion-base", autoCalculation: false } },
        entryStates: { "user:evasion-disabled": { enabled: false } },
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)

    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

    expect(screen.getByDisplayValue("启用加值")).toBeInTheDocument()
    expect(screen.getByDisplayValue("停用加值")).toBeInTheDocument()
    expect(screen.queryByRole("checkbox", { name: /停用加值|启用加值/ })).not.toBeInTheDocument()
    expect(screen.getByDisplayValue("停用加值")).not.toHaveClass("line-through")
    expect(screen.getByText("15")).toBeInTheDocument()
    expect(screen.queryByText(/未归因差额/)).not.toBeInTheDocument()
  })

  it("edits a manual entry value on blur", async () => {
    resetSheetStore({
      evasion: "15",
      userModifierContributions: [
        userContribution("user:evasion-base", "evasion", "base", "手动基础闪避", 12),
      ],
      modifierState: {
        targetStates: { evasion: { activeBaseId: "user:evasion-base", autoCalculation: false } },
        entryStates: {},
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)
    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

    const valueInput = screen.getByRole("textbox", { name: "编辑手动基础闪避数值" })
    await userEvent.clear(valueInput)
    await userEvent.type(valueInput, "5")
    await userEvent.tab()

    expect(sheet().userModifierContributions).toEqual([
      expect.objectContaining({
        id: "user:evasion-base",
        editable: { label: "手动基础闪避", value: 5 },
      }),
    ])
    expectUnattributedDelta("+10")
  })

  it("edits a manual entry label on blur", async () => {
    resetSheetStore({
      evasion: "15",
      userModifierContributions: [
        userContribution("user:evasion-base", "evasion", "base", "手动基础闪避", 12),
      ],
      modifierState: {
        targetStates: { evasion: { activeBaseId: "user:evasion-base", autoCalculation: false } },
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

  it("uses explicit auto calculation actions without legacy sync controls", async () => {
    resetSheetStore({
      evasion: "15",
      userModifierContributions: [
        userContribution("user:evasion-base", "evasion", "base", "Base", 12),
      ],
      modifierState: {
        targetStates: { evasion: { activeBaseId: "user:evasion-base", autoCalculation: false } },
        entryStates: {},
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)
    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

    expect(screen.queryByRole("button", { name: "同步" })).not.toBeInTheDocument()
    expect(screen.queryByText("持续同步")).not.toBeInTheDocument()
    expect(screen.getByText(/来源（暂停同步）/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "开启自动计算" }))

    expect(sheet().modifierState?.targetStates.evasion?.autoCalculation).toBe(true)
    expect(sheet().evasion).toBe("15")
    expect(sheet().userModifierContributions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: getUnattributedDeltaId("evasion"),
        editable: { label: UNATTRIBUTED_DELTA_LABEL, value: 3 },
      }),
    ]))
    expect(screen.getByRole("button", { name: "关闭自动计算" })).toBeInTheDocument()
    expect(screen.getByText(/来源（同步中）/)).toBeInTheDocument()
    expect(screen.queryByText("未归因差额 +3")).not.toBeInTheDocument()
  })

  it("shows provider-owned system sources as read-only with a source hint", async () => {
    resetSheetStore({
      evasion: "12",
      cards: [professionCard(12), ...defaultSheetData.cards.slice(1)],
      modifierState: {
        targetStates: { evasion: { activeBaseId: "profession:current:evasion" } },
        entryStates: {},
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)
    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

    expect(screen.getByText("游侠：起始闪避")).toBeInTheDocument()
    expect(screen.getByText("职业")).toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: "编辑游侠：起始闪避名称" })).not.toBeInTheDocument()
    expect(screen.queryByRole("spinbutton", { name: "编辑游侠：起始闪避数值" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "删除游侠：起始闪避" })).not.toBeInTheDocument()
  })

  it("shows upgrade provider as a source badge without repeating the upgrade prefix in the label", async () => {
    resetSheetStore({
      evasion: "13",
      automationSelections: {
        "upgrade:tier1-5-0": {
          selected: true,
          params: { target: "evasion" },
        },
      },
      modifierState: {
        targetStates: { evasion: { autoCalculation: false } },
        entryStates: {},
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)
    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

    expect(screen.getByText("升级")).toBeInTheDocument()
    expect(screen.getByText("闪避 +1")).toBeInTheDocument()
    expect(screen.queryByText("升级：闪避 +1")).not.toBeInTheDocument()
  })

  it("distinguishes weapon and armor equipment source badges", async () => {
    const equipment = structuredClone(defaultSheetData.equipment)
    equipment.weaponSlots.primary = {
      name: "短剑",
      trait: "",
      damage: "",
      feature: "",
      modifierContributions: [
        userContribution("weapon:evasion", "evasion", "modifier", "闪避", -1),
      ],
    }
    equipment.armorSlot = {
      name: "皮甲",
      baseArmorMax: null,
      baseThresholds: { minor: null, major: null },
      feature: "",
      modifierContributions: [
        userContribution("armor:evasion", "evasion", "modifier", "闪避", 1),
      ],
    }

    resetSheetStore({
      evasion: "12",
      equipment,
      modifierState: {
        targetStates: { evasion: { autoCalculation: false } },
        entryStates: {},
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)
    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

    expect(screen.getByText("武器")).toBeInTheDocument()
    expect(screen.getByText("护甲")).toBeInTheDocument()
    expect(screen.getByText("短剑：闪避")).toBeInTheDocument()
    expect(screen.getByText("皮甲：闪避")).toBeInTheDocument()
  })

  it("treats target-owned special delta as fixed-label editable value and deletes it with special semantics", async () => {
    resetSheetStore({
      evasion: "15",
      userModifierContributions: [
        userContribution("user:evasion-base", "evasion", "base", "基础", 12),
        userContribution(getUnattributedDeltaId("evasion"), "evasion", "modifier", UNATTRIBUTED_DELTA_LABEL, 3),
      ],
      modifierState: {
        targetStates: {
          evasion: {
            activeBaseId: "user:evasion-base",
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)
    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

    expect(screen.getByText(UNATTRIBUTED_DELTA_LABEL)).toBeInTheDocument()
    expect(screen.getByText("同步")).toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: `编辑${UNATTRIBUTED_DELTA_LABEL}名称` })).not.toBeInTheDocument()

    const valueInput = screen.getByRole("textbox", { name: `编辑${UNATTRIBUTED_DELTA_LABEL}数值` })
    expect(valueInput).toHaveValue("+3")

    await userEvent.click(screen.getByRole("button", { name: `删除${UNATTRIBUTED_DELTA_LABEL}` }))
    expect(sheet().userModifierContributions?.some(
      contribution => contribution.id === getUnattributedDeltaId("evasion"),
    )).toBe(false)
    expect(sheet().evasion).toBe("12")
    expect(screen.queryByText("未归因差额 +3")).not.toBeInTheDocument()
  })

  it("keeps a user-created modifier with the same delta label editable as a normal user source", async () => {
    resetSheetStore({
      evasion: "15",
      userModifierContributions: [
        userContribution("user:evasion-base", "evasion", "base", "基础", 12),
        userContribution("user:evasion-custom-delta", "evasion", "modifier", UNATTRIBUTED_DELTA_LABEL, 3),
      ],
      modifierState: {
        targetStates: { evasion: { activeBaseId: "user:evasion-base" } },
        entryStates: {},
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)
    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

    const labelInput = screen.getByRole("textbox", { name: `编辑${UNATTRIBUTED_DELTA_LABEL}名称` })
    await userEvent.clear(labelInput)
    await userEvent.type(labelInput, "自定义差额")
    await userEvent.tab()

    expect(sheet().userModifierContributions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "user:evasion-custom-delta",
        editable: { label: "自定义差额", value: 3 },
      }),
    ]))
  })
})
