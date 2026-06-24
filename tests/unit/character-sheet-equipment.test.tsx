import { act, render, screen, waitFor, within } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import CharacterSheet from "@/components/character-sheet"
import CharacterSheetPageTwo from "@/components/character-sheet-page-two"
import { resetSheetStore, sheet, store } from "./automation/test-helpers"
import { useCardStore, CardType } from "@/card/stores/unified-card-store"
import { createEmptyCard } from "@/card/card-types"
import type { CardAutomationIR, CardInstanceAutomationState } from "@/card/automation/ir-types"
import type { SheetData } from "@/lib/sheet-data"
import { useTextModeStore } from "@/lib/text-mode-store"

const humanHighStaminaAutomation: CardAutomationIR = {
  format: "daggerheart.card-automation.ir.v1",
  revision: "stable32:human-high-stamina-test",
  abilities: [
    {
      id: "high-stamina",
      label: "精力充沛",
      lifetime: { kind: "whileInLoadout" },
      effects: [
        { kind: "emitModifier", id: "high-stamina-stress", target: "stressMax", value: 1 },
      ],
    },
  ],
}

const simiahNimbleAutomation: CardAutomationIR = {
  format: "daggerheart.card-automation.ir.v1",
  revision: "stable32:simiah-nimble-fresh-test",
  abilities: [
    {
      id: "nimble",
      label: "灵活",
      lifetime: { kind: "whileInLoadout" },
      effects: [
        { kind: "emitModifier", id: "nimble-evasion", target: "evasion", value: 1 },
      ],
    },
  ],
}

const oldSimiahNimbleAutomation: CardAutomationIR = {
  ...simiahNimbleAutomation,
  revision: "stable32:simiah-nimble-old-test",
}

function setRuntimeAncestryCard(card: ReturnType<typeof createEmptyCard>) {
  useCardStore.setState({
    initialized: true,
    loading: false,
    cards: new Map([[card.id, card]]),
    cardsByType: new Map([[CardType.Ancestry, [card.id]]]),
  })
}

describe("CharacterSheet equipment fields", () => {
  it("places equipment provider anchors in section headers", () => {
    resetSheetStore()

    render(<CharacterSheet />)

    const primaryHeader = screen.getByText("主武器").closest("h4")
    const secondaryHeader = screen.getByText("副武器").closest("h4")
    const armorHeader = screen.getByText("护甲").closest("h4")
    const inventoryWeaponsHeader = screen.getByText("备用武器").closest("h3")

    expect(primaryHeader).toBeTruthy()
    expect(secondaryHeader).toBeTruthy()
    expect(armorHeader).toBeTruthy()
    expect(inventoryWeaponsHeader).toBeTruthy()
    expect(within(primaryHeader!).getByRole("button", { name: "查看主武器来源" })).toBeTruthy()
    expect(within(secondaryHeader!).getByRole("button", { name: "查看副武器来源" })).toBeTruthy()
    expect(within(armorHeader!).getByRole("button", { name: "查看护甲来源" })).toBeTruthy()
    expect(within(inventoryWeaponsHeader!).getByRole("button", { name: "查看备用武器 1来源" })).toBeTruthy()
  })

  it("stores the final armor max input as a number", async () => {
    const user = userEvent.setup()
    resetSheetStore({ armorMax: 3 })

    const { container } = render(<CharacterSheet />)
    const input = container.querySelector<HTMLInputElement>('input[name="armorMax"]')
    expect(input).toBeTruthy()

    await user.clear(input!)
    await user.type(input!, "5")
    await user.tab()

    expect(sheet().armorMax).toBe(5)
  })

  it("keeps evasion edits as local draft until final target commit", async () => {
    const user = userEvent.setup()
    resetSheetStore({
      evasion: "12",
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Base", value: 12 },
        },
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

    const { container } = render(<CharacterSheet />)
    const input = container.querySelector<HTMLInputElement>('input[name="evasion"]')
    expect(input).toBeTruthy()

    await user.clear(input!)
    await user.type(input!, "15")

    expect(input).toHaveValue("15")
    expect(sheet().evasion).toBe("12")

    await user.tab()

    expect(sheet().evasion).toBe("15")
  })

  it("rejects non-numeric armor max input without overwriting the previous value", async () => {
    const user = userEvent.setup()
    resetSheetStore({ armorMax: 3 })

    const { container } = render(<CharacterSheet />)
    const input = container.querySelector<HTMLInputElement>('input[name="armorMax"]')
    expect(input).toBeTruthy()

    await user.clear(input!)
    await user.type(input!, "abc")
    await user.tab()

    expect(sheet().armorMax).toBe(3)
  })

  it("rejects armor max input with a numeric prefix without keeping the prefix", async () => {
    const user = userEvent.setup()
    resetSheetStore({ armorMax: 3 })

    const { container } = render(<CharacterSheet />)
    const input = container.querySelector<HTMLInputElement>('input[name="armorMax"]')
    expect(input).toBeTruthy()

    await user.clear(input!)
    await user.type(input!, "4x")
    await user.tab()

    expect(sheet().armorMax).toBe(3)
  })

  it("instantiates selected ancestry cards through semantic character choice actions", async () => {
    const user = userEvent.setup()
    const humanCard = {
      ...createEmptyCard("ancestry"),
      id: "Human-HighStamina",
      name: "精力充沛",
      type: CardType.Ancestry,
      class: "人类",
      level: 1,
      automation: humanHighStaminaAutomation,
    }

    useCardStore.setState({
      initialized: true,
      loading: false,
      cards: new Map([[humanCard.id, humanCard]]),
      cardsByType: new Map([[CardType.Ancestry, [humanCard.id]]]),
    })
    useTextModeStore.getState().setTextMode(true)
    resetSheetStore({
      level: "1",
      stressMax: 6,
    })
    const selectCharacterChoiceCard = store().selectCharacterChoiceCard
    const selectSpy = vi
      .spyOn(store(), "selectCharacterChoiceCard")
      .mockImplementation((...args) => selectCharacterChoiceCard(...args))

    render(<CharacterSheet />)

    await user.click(screen.getAllByRole("button", { name: "选择种族" })[0])
    await user.click(await screen.findByText(humanCard.name))

    await waitFor(() => {
      expect(selectSpy).toHaveBeenCalledWith(
        "ancestry1",
        { id: humanCard.id, name: humanCard.name },
        expect.objectContaining({ id: humanCard.id }),
      )
      expect(sheet().cards[2]).toEqual(expect.objectContaining({
        id: humanCard.id,
        instanceId: expect.stringMatching(/^cardinst_/),
        automation: humanHighStaminaAutomation,
        automationState: { version: 1, abilities: {} },
      }))
      expect(sheet().ancestry1).toBe(humanCard.id)
      expect(sheet().ancestry1Ref).toEqual({ id: humanCard.id, name: humanCard.name })
      expect(sheet().stressMax).toBe(7)
    })
  })

  it("audits stale selected ancestry cards on load without opening the dialog or mutating sheet data", async () => {
    const oldState: CardInstanceAutomationState = {
      version: 1,
      abilities: { old: { choiceValues: { stale: ["value"] } } },
    }
    const staleAncestryCard = {
      ...createEmptyCard("ancestry"),
      id: "Simiah-Nimble",
      name: "灵活",
      type: CardType.Ancestry,
      class: "猿族",
      level: 1,
      description: "旧版灵活卡牌说明",
      instanceId: "cardinst_old",
      automation: oldSimiahNimbleAutomation,
      automationState: oldState,
      automationSource: {
        templateId: "Simiah-Nimble",
        templateAutomationRevision: oldSimiahNimbleAutomation.revision,
      },
    }
    const freshTemplate = {
      ...createEmptyCard("ancestry"),
      id: "Simiah-Nimble",
      name: "灵活",
      type: CardType.Ancestry,
      class: "猿族",
      level: 1,
      automation: simiahNimbleAutomation,
    }

    setRuntimeAncestryCard(freshTemplate)
    resetSheetStore({
      evasion: "10",
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Base", value: 10 },
        },
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
      ancestry1: "Simiah-Nimble",
      ancestry1Ref: { id: "Simiah-Nimble", name: "灵活" },
      cards: [undefined, undefined, staleAncestryCard] as never,
    })

    render(<CharacterSheet />)

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "更新卡牌" })).not.toBeInTheDocument()
    })
    expect(sheet().cards[2]).toBe(staleAncestryCard)
    expect(sheet().cards[2]?.automationState).toBe(oldState)
    expect(sheet().evasion).toBe("10")
  })

  it("waits for runtime cards to initialize before running the load-time audit without opening the dialog", async () => {
    const initializeSystem = vi.fn(async () => ({ initialized: false }))
    const oldState: CardInstanceAutomationState = {
      version: 1,
      abilities: { old: { choiceValues: { stale: ["value"] } } },
    }
    const staleAncestryCard = {
      ...createEmptyCard("ancestry"),
      id: "Simiah-Nimble",
      name: "灵活",
      type: CardType.Ancestry,
      class: "猿族",
      level: 1,
      instanceId: "cardinst_old",
      automation: oldSimiahNimbleAutomation,
      automationState: oldState,
    }
    const freshTemplate = {
      ...createEmptyCard("ancestry"),
      id: "Simiah-Nimble",
      name: "灵活",
      type: CardType.Ancestry,
      class: "猿族",
      level: 1,
      automation: simiahNimbleAutomation,
    }

    useCardStore.setState({
      initialized: false,
      loading: false,
      cards: new Map(),
      cardsByType: new Map(),
      initializeSystem,
    })
    resetSheetStore({
      evasion: "10",
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Base", value: 10 },
        },
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
      ancestry1: "Simiah-Nimble",
      ancestry1Ref: { id: "Simiah-Nimble", name: "灵活" },
      cards: [undefined, undefined, staleAncestryCard] as never,
    })
    const auditSpy = vi.spyOn(store(), "auditCardInstancesOnLoad")

    render(<CharacterSheet />)

    await waitFor(() => {
      expect(initializeSystem).toHaveBeenCalled()
    })
    expect(screen.queryByText("更新卡牌")).not.toBeInTheDocument()

    act(() => {
      useCardStore.setState({
        initialized: true,
        loading: false,
        cards: new Map([[freshTemplate.id, freshTemplate]]),
        cardsByType: new Map([[CardType.Ancestry, [freshTemplate.id]]]),
      })
    })

    await waitFor(() => {
      expect(auditSpy).toHaveBeenCalled()
    })
    expect(screen.queryByRole("dialog", { name: "更新卡牌" })).not.toBeInTheDocument()
    expect(sheet().cards[2]).toBe(staleAncestryCard)
    expect(sheet().evasion).toBe("10")
  })

  it("reruns the load-time audit after replacing sheet data in the same mounted sheet without opening the dialog", async () => {
    const firstOldState: CardInstanceAutomationState = {
      version: 1,
      abilities: { first: { choiceValues: { stale: ["first"] } } },
    }
    const secondOldState: CardInstanceAutomationState = {
      version: 1,
      abilities: { second: { choiceValues: { stale: ["second"] } } },
    }
    const firstStaleAncestryCard = {
      ...createEmptyCard("ancestry"),
      id: "Simiah-Nimble",
      name: "灵活",
      type: CardType.Ancestry,
      class: "猿族",
      level: 1,
      instanceId: "cardinst_old_first",
      automation: oldSimiahNimbleAutomation,
      automationState: firstOldState,
    }
    const secondStaleAncestryCard = {
      ...createEmptyCard("ancestry"),
      id: "Simiah-Nimble",
      name: "灵活",
      type: CardType.Ancestry,
      class: "猿族",
      level: 1,
      instanceId: "cardinst_old_second",
      automation: oldSimiahNimbleAutomation,
      automationState: secondOldState,
    }
    const freshTemplate = {
      ...createEmptyCard("ancestry"),
      id: "Simiah-Nimble",
      name: "灵活",
      type: CardType.Ancestry,
      class: "猿族",
      level: 1,
      automation: simiahNimbleAutomation,
    }
    const evasionSourceState: Pick<SheetData, "evasion" | "userModifierContributions" | "modifierState"> = {
      evasion: "10",
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Base", value: 10 },
        },
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
    }

    setRuntimeAncestryCard(freshTemplate)
    resetSheetStore({
      ...evasionSourceState,
      ancestry1: "Simiah-Nimble",
      ancestry1Ref: { id: "Simiah-Nimble", name: "灵活" },
      cards: [createEmptyCard(), createEmptyCard(), firstStaleAncestryCard] as never,
    })
    const auditSpy = vi.spyOn(store(), "auditCardInstancesOnLoad")

    render(<CharacterSheet />)

    await waitFor(() => {
      expect(auditSpy).toHaveBeenCalledTimes(1)
    })
    expect(screen.queryByRole("dialog", { name: "更新卡牌" })).not.toBeInTheDocument()

    act(() => {
      store().replaceSheetData({
        ...sheet(),
        ...evasionSourceState,
        name: "Second Sheet",
        cards: [createEmptyCard(), createEmptyCard(), secondStaleAncestryCard] as never,
      })
    })

    await waitFor(() => {
      expect(auditSpy).toHaveBeenCalledTimes(2)
    })
    expect(screen.queryByRole("dialog", { name: "更新卡牌" })).not.toBeInTheDocument()
    expect(sheet().cards[2]).toBe(secondStaleAncestryCard)
  })

  it("dismisses the manually opened audit dialog without repairing stale selected ancestry cards", async () => {
    const user = userEvent.setup()
    const oldState: CardInstanceAutomationState = {
      version: 1,
      abilities: { old: { choiceValues: { stale: ["value"] } } },
    }
    const staleAncestryCard = {
      ...createEmptyCard("ancestry"),
      id: "Simiah-Nimble",
      name: "灵活",
      type: CardType.Ancestry,
      class: "猿族",
      level: 1,
      instanceId: "cardinst_old",
      automation: oldSimiahNimbleAutomation,
      automationState: oldState,
    }
    const freshTemplate = {
      ...createEmptyCard("ancestry"),
      id: "Simiah-Nimble",
      name: "灵活",
      type: CardType.Ancestry,
      class: "猿族",
      level: 1,
      automation: simiahNimbleAutomation,
    }

    setRuntimeAncestryCard(freshTemplate)
    resetSheetStore({
      evasion: "10",
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Base", value: 10 },
        },
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
      ancestry1: "Simiah-Nimble",
      ancestry1Ref: { id: "Simiah-Nimble", name: "灵活" },
      cards: [undefined, undefined, staleAncestryCard] as never,
    })

    render(<CharacterSheetPageTwo />)

    await user.click(await screen.findByRole("button", { name: "更新卡牌，有可更新项目" }))
    await user.click(await screen.findByRole("button", { name: "暂不更新" }))

    await waitFor(() => {
      expect(screen.queryByText("更新卡牌")).not.toBeInTheDocument()
    })
    expect(sheet().cards[2]).toBe(staleAncestryCard)
    expect(sheet().cards[2]?.automationState).toBe(oldState)
    expect(sheet().evasion).toBe("10")
  })

  it("overwrites selected stale ancestry cards after manual audit confirmation", async () => {
    const user = userEvent.setup()
    const oldState: CardInstanceAutomationState = {
      version: 1,
      abilities: { old: { choiceValues: { stale: ["value"] } } },
    }
    const staleAncestryCard = {
      ...createEmptyCard("ancestry"),
      id: "Simiah-Nimble",
      name: "灵活",
      type: CardType.Ancestry,
      class: "猿族",
      level: 1,
      instanceId: "cardinst_old",
      automation: oldSimiahNimbleAutomation,
      automationState: oldState,
    }
    const freshTemplate = {
      ...createEmptyCard("ancestry"),
      id: "Simiah-Nimble",
      name: "灵活",
      type: CardType.Ancestry,
      class: "猿族",
      level: 1,
      automation: simiahNimbleAutomation,
    }

    setRuntimeAncestryCard(freshTemplate)
    resetSheetStore({
      evasion: "10",
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Base", value: 10 },
        },
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
      ancestry1: "Simiah-Nimble",
      ancestry1Ref: { id: "Simiah-Nimble", name: "灵活" },
      cards: [undefined, undefined, staleAncestryCard] as never,
    })

    render(<CharacterSheetPageTwo />)

    await user.click(await screen.findByRole("button", { name: "更新卡牌，有可更新项目" }))
    await user.click(await screen.findByRole("button", { name: "更新选中卡牌" }))

    await waitFor(() => {
      expect(screen.queryByText("更新卡牌")).not.toBeInTheDocument()
      expect(sheet().cards[2]).toEqual(expect.objectContaining({
        id: "Simiah-Nimble",
        instanceId: expect.stringMatching(/^cardinst_/),
        automation: simiahNimbleAutomation,
        automationState: { version: 1, abilities: {} },
      }))
      expect(sheet().evasion).toBe("11")
    })
  })

  it("shows a pending audit marker beside the page two card deck title and refreshes when opened", async () => {
    const user = userEvent.setup()
    const oldState: CardInstanceAutomationState = {
      version: 1,
      abilities: { old: { choiceValues: { stale: ["value"] } } },
    }
    const staleAncestryCard = {
      ...createEmptyCard("ancestry"),
      id: "Simiah-Nimble",
      name: "灵活",
      type: CardType.Ancestry,
      class: "猿族",
      level: 1,
      instanceId: "cardinst_old",
      automation: oldSimiahNimbleAutomation,
      automationState: oldState,
    }
    const freshTemplate = {
      ...createEmptyCard("ancestry"),
      id: "Simiah-Nimble",
      name: "灵活",
      type: CardType.Ancestry,
      class: "猿族",
      level: 1,
      automation: simiahNimbleAutomation,
    }

    setRuntimeAncestryCard(freshTemplate)
    resetSheetStore({
      evasion: "10",
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Base", value: 10 },
        },
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
      ancestry1: "Simiah-Nimble",
      ancestry1Ref: { id: "Simiah-Nimble", name: "灵活" },
      cards: [createEmptyCard(), createEmptyCard(), staleAncestryCard] as never,
    })

    render(<CharacterSheetPageTwo />)

    const auditButton = await screen.findByRole("button", { name: "更新卡牌，有可更新项目" })
    await user.click(auditButton)

    expect(await screen.findByRole("dialog", { name: "更新卡牌" })).toBeInTheDocument()
    expect(screen.getByText("发现 1 张卡牌和当前卡包中的同名卡牌不同。你可以用卡包数据更新选中的卡牌。")).toBeInTheDocument()
    expect(screen.getByText("自动化脚本不同。更新会清空这张卡已填写的自动化设置。")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "查看卡牌：灵活" }))
    expect(await screen.findByRole("dialog", { name: "查看卡牌：灵活" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "关闭预览" }))

    await user.click(await screen.findByRole("button", { name: "更新选中卡牌" }))

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "更新卡牌" })).not.toBeInTheDocument()
      expect(sheet().cards[2]).toEqual(expect.objectContaining({
        id: "Simiah-Nimble",
        instanceId: expect.stringMatching(/^cardinst_/),
        automation: simiahNimbleAutomation,
        automationState: { version: 1, abilities: {} },
      }))
      expect(sheet().evasion).toBe("11")
    })
  })
})
