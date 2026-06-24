import "@testing-library/jest-dom/vitest"

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { CardAutomationIR } from "@/card/automation/ir-types"
import { makeSheet } from "@/card/automation/__tests__/helpers"
import type { StandardCard } from "@/card/card-types"
import type { SheetData } from "@/lib/sheet-data"
import { CardAutomationSetupDialog } from "../card-automation-setup-dialog"

const automation: CardAutomationIR = {
  format: "daggerheart.card-automation.ir.v1",
  revision: "stable32:dialog",
  abilities: [
    {
      id: "choose-mode",
      label: "Choose Mode",
      lifetime: { kind: "whileInLoadout" },
      choices: [
        {
          id: "mode",
          label: "Mode",
          kind: "selectOne",
          cardinality: { min: 1, max: 1, unique: true },
          domain: {
            kind: "staticOptions",
            options: [
              { id: "a", label: "A" },
              { id: "b", label: "B" },
            ],
          },
        },
      ],
      effects: [],
    },
    {
      id: "choose-many",
      label: "Choose Many",
      lifetime: { kind: "whileInLoadout" },
      choices: [
        {
          id: "targets",
          label: "Targets",
          kind: "targetSelectMany",
          cardinality: { min: 1, max: 2, unique: true },
          domain: { kind: "modifierTargetGroup", group: "attributes" },
        },
      ],
      effects: [],
    },
  ],
}

const noOptionAutomation: CardAutomationIR = {
  format: "daggerheart.card-automation.ir.v1",
  revision: "stable32:no-option",
  abilities: [
    {
      id: "choose-experience",
      label: "Choose Experience",
      lifetime: { kind: "whileInLoadout" },
      choices: [
        {
          id: "experience",
          label: "Experience",
          kind: "targetSelectMany",
          cardinality: { min: 1, max: 1, unique: true },
          domain: { kind: "modifierTargetGroup", group: "experiences" },
        },
      ],
      effects: [],
    },
  ],
}

const branchNoExperienceAutomation: CardAutomationIR = {
  format: "daggerheart.card-automation.ir.v1",
  revision: "stable32:branch-no-experience",
  abilities: [
    {
      id: "choose-target-mode",
      label: "Choose Target Mode",
      lifetime: { kind: "whileInLoadout" },
      choices: [
        {
          id: "target-mode",
          label: "Target Mode",
          kind: "selectOne",
          cardinality: { min: 1, max: 1, unique: true },
          domain: {
            kind: "staticOptions",
            options: [
              { id: "attributes", label: "选择属性目标" },
              { id: "experiences", label: "选择经历目标" },
            ],
          },
        },
        {
          id: "attribute-target",
          label: "Attribute Target",
          kind: "targetSelectMany",
          requiredWhen: {
            kind: "choiceEquals",
            choiceId: "target-mode",
            valueId: "attributes",
          },
          cardinality: { min: 1, max: 1, unique: true },
          domain: { kind: "modifierTargetGroup", group: "attributes" },
        },
        {
          id: "experience-target",
          label: "Experience Target",
          kind: "targetSelectMany",
          requiredWhen: {
            kind: "choiceEquals",
            choiceId: "target-mode",
            valueId: "experiences",
          },
          cardinality: { min: 1, max: 1, unique: true },
          domain: { kind: "modifierTargetGroup", group: "experiences" },
        },
      ],
      effects: [],
    },
  ],
}

function makeCard(
  automationIr: CardAutomationIR = automation,
  instanceId = "cardinst_dialog",
): StandardCard {
  return {
    standarized: true,
    id: "dialog-card",
    instanceId,
    name: "Dialog Card",
    type: "domain",
    class: "Blade",
    cardSelectDisplay: {},
    automation: automationIr,
    automationState: { version: 1, abilities: {} },
  }
}

function sheet(overrides: Partial<SheetData> = {}): SheetData {
  return makeSheet({ cards: [makeCard()], ...overrides })
}

describe("CardAutomationSetupDialog", () => {
  it("auto-advances selectOne to save confirmation and saves one ability", () => {
    const onSaveAbility = vi.fn(() => ({ kind: "success" as const }))
    render(
      <CardAutomationSetupDialog
        open
        sheetData={sheet()}
        cardInstanceId="cardinst_dialog"
        onOpenChange={vi.fn()}
        onSaveAbility={onSaveAbility}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "A" }))

    expect(screen.getByText("尚未保存。保存后写入角色表；要修改请先返回上一个问题。")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "保存并继续" }))

    expect(onSaveAbility).toHaveBeenCalledWith({
      cardInstanceId: "cardinst_dialog",
      abilityId: "choose-mode",
      choiceValues: { mode: ["a"] },
    })
    expect(screen.getByRole("checkbox", { name: "敏捷" })).toBeInTheDocument()
  })

  it("continues directly to the next ability after a non-final save without allowing return", () => {
    render(
      <CardAutomationSetupDialog
        open
        sheetData={sheet()}
        cardInstanceId="cardinst_dialog"
        onOpenChange={vi.fn()}
        onSaveAbility={vi.fn(() => ({ kind: "success" as const }))}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "A" }))
    fireEvent.click(screen.getByRole("button", { name: "保存并继续" }))

    expect(
      screen.queryByRole("button", { name: "上一步" }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText("当前能力已保存。继续后会开始下一个能力；上一项不能从这里撤销。"),
    ).not.toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: "敏捷" })).toBeInTheDocument()
  })

  it("requires explicit finish for selectMany before save confirmation", () => {
    const startingSheet = sheet()
    startingSheet.cards[0].automationState = {
      version: 1,
      abilities: { "choose-mode": { choiceValues: { mode: ["a"] } } },
    }

    render(
      <CardAutomationSetupDialog
        open
        sheetData={startingSheet}
        cardInstanceId="cardinst_dialog"
        onOpenChange={vi.fn()}
        onSaveAbility={vi.fn(() => ({ kind: "success" as const }))}
      />,
    )

    fireEvent.click(screen.getByRole("checkbox", { name: "敏捷" }))

    expect(
      screen.queryByRole("button", { name: "保存并退出" }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "完成当前选择" }))
    expect(
      screen.getByRole("button", { name: "保存并退出" }),
    ).toBeEnabled()
  })

  it("does not treat selectMany toggles as back-navigation history", () => {
    const startingSheet = sheet()
    startingSheet.cards[0].automationState = {
      version: 1,
      abilities: { "choose-mode": { choiceValues: { mode: ["a"] } } },
    }

    render(
      <CardAutomationSetupDialog
        open
        sheetData={startingSheet}
        cardInstanceId="cardinst_dialog"
        onOpenChange={vi.fn()}
        onSaveAbility={vi.fn(() => ({ kind: "success" as const }))}
      />,
    )

    fireEvent.click(screen.getByRole("checkbox", { name: "敏捷" }))

    expect(
      screen.queryByRole("button", { name: "上一步" }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: "敏捷" })).toBeChecked()

    fireEvent.click(screen.getByRole("checkbox", { name: "敏捷" }))

    expect(screen.getByRole("checkbox", { name: "敏捷" })).not.toBeChecked()
    expect(
      screen.queryByRole("button", { name: "上一步" }),
    ).not.toBeInTheDocument()
  })

  it("requires explicit finish for selectMany even when the selection reaches max count", () => {
    const startingSheet = sheet()
    startingSheet.cards[0].automationState = {
      version: 1,
      abilities: { "choose-mode": { choiceValues: { mode: ["a"] } } },
    }

    render(
      <CardAutomationSetupDialog
        open
        sheetData={startingSheet}
        cardInstanceId="cardinst_dialog"
        onOpenChange={vi.fn()}
        onSaveAbility={vi.fn(() => ({ kind: "success" as const }))}
      />,
    )

    fireEvent.click(screen.getByRole("checkbox", { name: "敏捷" }))
    fireEvent.click(screen.getByRole("checkbox", { name: "力量" }))

    expect(screen.getByRole("checkbox", { name: "敏捷" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "力量" })).toBeChecked()
    expect(screen.getByRole("button", { name: "完成当前选择" })).toBeEnabled()
    expect(
      screen.queryByRole("button", { name: "保存并退出" }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "完成当前选择" }))

    expect(screen.getByRole("button", { name: "保存并退出" })).toBeEnabled()
  })

  it("closes after saving the final missing ability", () => {
    const startingSheet = sheet()
    startingSheet.cards[0].automationState = {
      version: 1,
      abilities: { "choose-mode": { choiceValues: { mode: ["a"] } } },
    }
    const onOpenChange = vi.fn()

    render(
      <CardAutomationSetupDialog
        open
        sheetData={startingSheet}
        cardInstanceId="cardinst_dialog"
        onOpenChange={onOpenChange}
        onSaveAbility={vi.fn(() => ({ kind: "success" as const }))}
      />,
    )

    fireEvent.click(screen.getByRole("checkbox", { name: "敏捷" }))
    fireEvent.click(screen.getByRole("button", { name: "完成当前选择" }))
    fireEvent.click(screen.getByRole("button", { name: "保存并退出" }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(screen.queryByText("当前能力已保存。继续后会开始下一个能力；上一项不能从这里撤销。")).not.toBeInTheDocument()
  })

  it("allows returning before save and discards the current draft on close", () => {
    const onOpenChange = vi.fn()
    const onSaveAbility = vi.fn(() => ({ kind: "success" as const }))
    render(
      <CardAutomationSetupDialog
        open
        sheetData={sheet()}
        cardInstanceId="cardinst_dialog"
        onOpenChange={onOpenChange}
        onSaveAbility={onSaveAbility}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "A" }))
    fireEvent.click(screen.getByRole("button", { name: "上一步" }))
    fireEvent.click(screen.getByRole("button", { name: "B" }))
    fireEvent.click(screen.getByRole("button", { name: "Close" }))

    expect(onSaveAbility).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("resets draft and history when reopened or pointed at a different card", () => {
    const { rerender } = render(
      <CardAutomationSetupDialog
        open
        sheetData={sheet()}
        cardInstanceId="cardinst_dialog"
        onOpenChange={vi.fn()}
        onSaveAbility={vi.fn(() => ({ kind: "success" as const }))}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "A" }))
    expect(screen.getByText("尚未保存。保存后写入角色表；要修改请先返回上一个问题。")).toBeInTheDocument()

    rerender(
      <CardAutomationSetupDialog
        open={false}
        sheetData={sheet()}
        cardInstanceId="cardinst_dialog"
        onOpenChange={vi.fn()}
        onSaveAbility={vi.fn(() => ({ kind: "success" as const }))}
      />,
    )
    rerender(
      <CardAutomationSetupDialog
        open
        sheetData={sheet()}
        cardInstanceId="cardinst_dialog"
        onOpenChange={vi.fn()}
        onSaveAbility={vi.fn(() => ({ kind: "success" as const }))}
      />,
    )

    expect(screen.getByRole("button", { name: "A" })).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "上一步" }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "A" }))

    rerender(
      <CardAutomationSetupDialog
        open
        sheetData={sheet({
          cards: [makeCard(automation), makeCard(automation, "cardinst_other")],
        })}
        cardInstanceId="cardinst_other"
        onOpenChange={vi.fn()}
        onSaveAbility={vi.fn(() => ({ kind: "success" as const }))}
      />,
    )

    expect(screen.getByRole("button", { name: "A" })).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "上一步" }),
    ).not.toBeInTheDocument()
  })

  it("keeps the dialog open on save failure", () => {
    render(
      <CardAutomationSetupDialog
        open
        sheetData={sheet()}
        cardInstanceId="cardinst_dialog"
        onOpenChange={vi.fn()}
        onSaveAbility={vi.fn(() => ({
          kind: "failure" as const,
          message: "failed",
        }))}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "A" }))
    fireEvent.click(screen.getByRole("button", { name: "保存并继续" }))

    expect(screen.getByText("保存失败，请重试。")).toBeInTheDocument()
    expect(screen.getByRole("dialog", { name: "Dialog Card" })).toBeInTheDocument()
  })

  it("shows a blocked state when the current choice has no options", () => {
    const onOpenChange = vi.fn()

    render(
      <CardAutomationSetupDialog
        open
        sheetData={sheet({
          cards: [makeCard(noOptionAutomation)],
          experience: ["", "", "", "", ""],
        })}
        cardInstanceId="cardinst_dialog"
        onOpenChange={onOpenChange}
        onSaveAbility={vi.fn(() => ({ kind: "success" as const }))}
      />,
    )

    expect(screen.queryByText("当前没有可用选项。你可以先关闭，之后角色表状态变化后再回来处理。")).not.toBeInTheDocument()
    expect(screen.getByText("缺少可选择的经历。请先在角色表的经历栏填写经历名称。")).toBeInTheDocument()
    expect(screen.getByText("之后可以在卡组界面尝试重新配置自动化。")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "保存并退出" }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "好的" }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("allows going back when a branch choice leads to an empty experience target list", () => {
    render(
      <CardAutomationSetupDialog
        open
        sheetData={sheet({
          cards: [makeCard(branchNoExperienceAutomation)],
          experience: ["", "", "", "", ""],
        })}
        cardInstanceId="cardinst_dialog"
        onOpenChange={vi.fn()}
        onSaveAbility={vi.fn(() => ({ kind: "success" as const }))}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "选择经历目标" }))

    expect(screen.getByText("缺少可选择的经历。请先在角色表的经历栏填写经历名称。")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "上一步" }))

    expect(screen.getByRole("button", { name: "选择属性目标" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "选择经历目标" })).toBeInTheDocument()
  })
})
