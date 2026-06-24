import { applyAutoCalculationForTargets } from "@/automation/core/target-sync"
import type { StandardCard } from "@/card/card-types"
import type { CardAutomationIR, CardInstanceAutomationState } from "@/card/automation/ir-types"
import { makeSheet } from "@/card/automation/__tests__/helpers"
import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  deleteCardInstance,
  moveCardInstance,
  replaceCardInstance,
  selectCardIntoSlot,
  setCardAbilityChoiceValues,
  setProtectedLoadoutCardInstance,
} from "../card-actions"

vi.mock("@/automation/core/target-sync", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/automation/core/target-sync")>()
  return {
    ...actual,
    applyAutoCalculationForTargets: vi.fn((sheetData) =>
      actual.applyAutoCalculationForTargets(sheetData),
    ),
  }
})

const syncSpy = vi.mocked(applyAutoCalculationForTargets)

const fixedNow = new Date("2026-06-22T00:00:00.000Z")

const evasionBaseAutomation: CardAutomationIR = {
  format: "daggerheart.card-automation.ir.v1",
  revision: "stable32:evasion-base",
  abilities: [
    {
      id: "base-evasion",
      label: "Base Evasion",
      lifetime: { kind: "whileInLoadout" },
      effects: [{ id: "base", kind: "emitBase", target: "evasion", value: 11 }],
    },
  ],
}

const choiceAutomation: CardAutomationIR = {
  format: "daggerheart.card-automation.ir.v1",
  revision: "stable32:choice",
  abilities: [
    {
      id: "choose-benefit",
      label: "Choose Benefit",
      lifetime: { kind: "whileInLoadout" },
      choices: [
        {
          id: "benefit",
          kind: "selectMany",
          cardinality: { min: 1, max: 2, unique: true },
          domain: {
            kind: "staticOptions",
            options: [
              { id: "hp", label: "HP" },
              { id: "stress", label: "Stress" },
            ],
          },
        },
      ],
      effects: [],
    },
  ],
}

const branchedChoiceAutomation: CardAutomationIR = {
  format: "daggerheart.card-automation.ir.v1",
  revision: "stable32:branch-choice",
  abilities: [
    {
      id: "branch",
      label: "Branch",
      lifetime: { kind: "whileInLoadout" },
      choices: [
        {
          id: "mode",
          kind: "selectOne",
          cardinality: { min: 1, max: 1, unique: true },
          domain: {
            kind: "staticOptions",
            options: [
              { id: "attribute", label: "Attribute" },
              { id: "experience", label: "Experience" },
            ],
          },
        },
        {
          id: "experience",
          kind: "targetSelectMany",
          requiredWhen: {
            kind: "choiceEquals",
            choiceId: "mode",
            valueId: "experience",
          },
          cardinality: { min: 1, max: 1, unique: true },
          domain: { kind: "modifierTargetGroup", group: "experiences" },
        },
      ],
      effects: [],
    },
  ],
}

function makeCard(overrides: Partial<StandardCard> = {}): StandardCard {
  return {
    standarized: true,
    id: "template-card",
    name: "Template Card",
    type: "domain",
    class: "Blade",
    cardSelectDisplay: {},
    ...overrides,
  }
}

function createInstanceId(id: string) {
  return () => id
}

describe("card automation actions", () => {
  beforeEach(() => {
    syncSpy.mockClear()
  })

  it("selectCardIntoSlot creates a card instance from a template and syncs once", () => {
    const template = makeCard({ automation: evasionBaseAutomation })
    const sheet = makeSheet({ cards: [] })

    const result = selectCardIntoSlot(sheet, "loadout", 5, template, {
      now: fixedNow,
      createInstanceId: createInstanceId("cardinst_selected"),
    })

    expect(result.kind).toBe("success")
    expect(syncSpy).toHaveBeenCalledTimes(1)
    expect(result.sheetData.cards[5]).toEqual(
      expect.objectContaining({
        id: "template-card",
        instanceId: "cardinst_selected",
        automation: evasionBaseAutomation,
        automationSource: {
          templateId: "template-card",
          templateAutomationRevision: "stable32:evasion-base",
          copiedAt: fixedNow.toISOString(),
        },
        automationState: { version: 1, abilities: {} },
      }),
    )
    expect(result.sheetData.evasion).toBe("11")
  })

  it("selectCardIntoSlot returns setup effect for a new instance with missing choices", () => {
    const template = makeCard({ automation: choiceAutomation })
    const sheet = makeSheet({ cards: [] })

    const result = selectCardIntoSlot(sheet, "loadout", 5, template, {
      now: fixedNow,
      createInstanceId: createInstanceId("cardinst_prompt"),
    })

    expect(result.kind).toBe("success")
    if (result.kind !== "success") throw new Error("expected success")
    expect(result.cardInstanceId).toBe("cardinst_prompt")
    expect(result.effects).toEqual([
      { kind: "cardAutomationSetupAvailable", cardInstanceId: "cardinst_prompt" },
    ])
  })

  it("selectCardIntoSlot omits setup effect when the new instance has no missing choices", () => {
    const template = makeCard({ automation: evasionBaseAutomation })
    const sheet = makeSheet({ cards: [] })

    const result = selectCardIntoSlot(sheet, "loadout", 5, template, {
      now: fixedNow,
      createInstanceId: createInstanceId("cardinst_ready"),
    })

    expect(result.kind).toBe("success")
    if (result.kind !== "success") throw new Error("expected success")
    expect(result.cardInstanceId).toBe("cardinst_ready")
    expect(result.effects).toEqual([])
  })

  it("selectCardIntoSlot deep-clones template automation for the instance", () => {
    const templateAutomation: CardAutomationIR = {
      format: "daggerheart.card-automation.ir.v1",
      revision: "stable32:mutable-template",
      abilities: [
        {
          id: "base-evasion",
          label: "Base Evasion",
          lifetime: { kind: "whileInLoadout" },
          effects: [{ id: "base", kind: "emitBase", target: "evasion", value: 11 }],
        },
      ],
    }
    const template = makeCard({ automation: templateAutomation })
    const sheet = makeSheet({ cards: [] })

    const result = selectCardIntoSlot(sheet, "loadout", 5, template, {
      now: fixedNow,
      createInstanceId: createInstanceId("cardinst_cloned"),
    })

    expect(result.kind).toBe("success")
    const instanceAutomation = result.sheetData.cards[5].automation
    expect(instanceAutomation).not.toBe(templateAutomation)

    const templateEffect = templateAutomation.abilities[0].effects[0]
    if (templateEffect.kind === "emitBase") {
      templateEffect.value = 99
    }

    const instanceEffect = instanceAutomation?.abilities[0].effects[0]
    expect(instanceEffect).toEqual(
      expect.objectContaining({ kind: "emitBase", value: 11 }),
    )
  })

  it("moveCardInstance preserves instance automation fields", () => {
    const automationState: CardInstanceAutomationState = {
      version: 1,
      abilities: { "base-evasion": { choiceValues: { mode: ["kept"] } } },
    }
    const instance = makeCard({
      instanceId: "cardinst_move",
      automation: evasionBaseAutomation,
      automationSource: {
        templateId: "template-card",
        templateAutomationRevision: "stable32:evasion-base",
        copiedAt: fixedNow.toISOString(),
      },
      automationState,
    })
    const sheet = makeSheet({
      cards: [undefined, undefined, undefined, undefined, undefined, instance] as unknown as StandardCard[],
    })

    const result = moveCardInstance(sheet, "loadout", 5, "vault")

    expect(result.kind).toBe("success")
    expect(syncSpy).toHaveBeenCalledTimes(1)
    expect(result.sheetData.inventory_cards?.[0]).toEqual(instance)
  })

  it("replaceCardInstance creates a new instance and discards old automation state", () => {
    const previousAutomationState: CardInstanceAutomationState = {
      version: 1,
      abilities: { old: { choiceValues: { stale: ["value"] } } },
    }
    const oldInstance = makeCard({
      id: "old-template",
      instanceId: "cardinst_old",
      automation: evasionBaseAutomation,
      automationState: previousAutomationState,
    })
    const template = makeCard({ id: "new-template", automation: choiceAutomation })
    const sheet = makeSheet({
      cards: [undefined, undefined, undefined, undefined, undefined, oldInstance] as unknown as StandardCard[],
    })

    const result = replaceCardInstance(sheet, "loadout", 5, template, {
      now: fixedNow,
      createInstanceId: createInstanceId("cardinst_new"),
    })

    expect(result.kind).toBe("success")
    expect(syncSpy).toHaveBeenCalledTimes(1)
    expect(result.sheetData.cards[5]).toEqual(
      expect.objectContaining({
        id: "new-template",
        instanceId: "cardinst_new",
        automation: choiceAutomation,
        automationState: { version: 1, abilities: {} },
      }),
    )
  })

  it("deleteCardInstance removes the instance and its contribution disappears after sync", () => {
    const instance = makeCard({
      instanceId: "cardinst_delete",
      automation: evasionBaseAutomation,
      automationState: { version: 1, abilities: {} },
    })
    const sheet = makeSheet({
      evasion: "11",
      cards: [undefined, undefined, undefined, undefined, undefined, instance] as unknown as StandardCard[],
    })

    const result = deleteCardInstance(sheet, "loadout", 5)

    expect(result.kind).toBe("success")
    expect(syncSpy).toHaveBeenCalledTimes(1)
    expect(result.sheetData.cards[5].name).toBe("")
    expect(result.sheetData.evasion).toBe("")
  })

  it("setProtectedLoadoutCardInstance returns setup effect for character choice cards", () => {
    const template = makeCard({ automation: choiceAutomation })
    const sheet = makeSheet({ cards: [] })

    const result = setProtectedLoadoutCardInstance(sheet, 0, template, {
      now: fixedNow,
      createInstanceId: createInstanceId("cardinst_character_choice"),
    })

    expect(result.kind).toBe("success")
    if (result.kind !== "success") throw new Error("expected success")
    expect(result.cardInstanceId).toBe("cardinst_character_choice")
    expect(result.effects).toEqual([
      {
        kind: "cardAutomationSetupAvailable",
        cardInstanceId: "cardinst_character_choice",
      },
    ])
  })

  it("deleteCardInstance does not return setup prompt effects", () => {
    const instance = makeCard({
      instanceId: "cardinst_delete_choice",
      automation: choiceAutomation,
      automationState: { version: 1, abilities: {} },
    })
    const sheet = makeSheet({
      cards: [undefined, undefined, undefined, undefined, undefined, instance] as unknown as StandardCard[],
    })

    const result = deleteCardInstance(sheet, "loadout", 5)

    expect(result.kind).toBe("success")
    if (result.kind !== "success") throw new Error("expected success")
    expect(result.effects).toEqual([])
  })

  it("setCardAbilityChoiceValues replaces the whole ability choiceValues when valid", () => {
    const instance = makeCard({
      instanceId: "cardinst_choice",
      automation: choiceAutomation,
      automationState: {
        version: 1,
        abilities: { "choose-benefit": { choiceValues: { benefit: ["hp"] } } },
      },
    })
    const sheet = makeSheet({ cards: [instance] })

    const result = setCardAbilityChoiceValues(
      sheet,
      "cardinst_choice",
      "choose-benefit",
      { benefit: ["stress"] },
    )

    expect(result.kind).toBe("success")
    expect(syncSpy).toHaveBeenCalledTimes(1)
    expect(result.sheetData.cards[0].automationState).toEqual({
      version: 1,
      abilities: { "choose-benefit": { choiceValues: { benefit: ["stress"] } } },
    })
  })

  it("setCardAbilityChoiceValues stores a clone of caller-provided choiceValues", () => {
    const instance = makeCard({
      instanceId: "cardinst_choice_clone",
      automation: choiceAutomation,
      automationState: {
        version: 1,
        abilities: { "choose-benefit": { choiceValues: { benefit: ["hp"] } } },
      },
    })
    const sheet = makeSheet({ cards: [instance] })
    const choiceValues = { benefit: ["stress"] }

    const result = setCardAbilityChoiceValues(
      sheet,
      "cardinst_choice_clone",
      "choose-benefit",
      choiceValues,
    )

    expect(result.kind).toBe("success")
    choiceValues.benefit.push("hp")
    expect(result.sheetData.cards[0].automationState).toEqual({
      version: 1,
      abilities: { "choose-benefit": { choiceValues: { benefit: ["stress"] } } },
    })
  })

  it("setCardAbilityChoiceValues keeps old state unchanged when invalid", () => {
    const previousAutomationState: CardInstanceAutomationState = {
      version: 1,
      abilities: { "choose-benefit": { choiceValues: { benefit: ["hp"] } } },
    }
    const instance = makeCard({
      instanceId: "cardinst_choice_invalid",
      automation: choiceAutomation,
      automationState: previousAutomationState,
    })
    const sheet = makeSheet({ cards: [instance] })

    const result = setCardAbilityChoiceValues(
      sheet,
      "cardinst_choice_invalid",
      "choose-benefit",
      { benefit: ["unknown"] },
    )

    expect(result.kind).toBe("failure")
    expect(syncSpy).not.toHaveBeenCalled()
    expect(result.sheetData.cards[0].automationState).toEqual(previousAutomationState)
  })

  it("setCardAbilityChoiceValues rejects choices that are not required in the selected branch", () => {
    const previousAutomationState: CardInstanceAutomationState = {
      version: 1,
      abilities: { branch: { choiceValues: { mode: ["experience"] } } },
    }
    const instance = makeCard({
      instanceId: "cardinst_branch",
      automation: branchedChoiceAutomation,
      automationState: previousAutomationState,
    })
    const sheet = makeSheet({
      experience: ["Scout", "", "", "", ""],
      cards: [instance],
    })

    const result = setCardAbilityChoiceValues(
      sheet,
      "cardinst_branch",
      "branch",
      {
        mode: ["attribute"],
        experience: ["experienceValues.0"],
      },
    )

    expect(result.kind).toBe("failure")
    expect(syncSpy).not.toHaveBeenCalled()
    expect(result.sheetData.cards[0].automationState).toEqual(previousAutomationState)
  })

  it("deleteCardInstance rejects protected loadout slots", () => {
    const sheet = makeSheet({ cards: [makeCard({ instanceId: "cardinst_protected" })] })

    const result = deleteCardInstance(sheet, "loadout", 0)

    expect(result.kind).toBe("failure")
    expect(syncSpy).not.toHaveBeenCalled()
    expect(result.sheetData).toBe(sheet)
  })

  it("moveCardInstance rejects moving protected loadout slots to vault", () => {
    const sheet = makeSheet({ cards: [makeCard({ instanceId: "cardinst_protected" })] })

    const result = moveCardInstance(sheet, "loadout", 0, "vault")

    expect(result.kind).toBe("failure")
    expect(syncSpy).not.toHaveBeenCalled()
    expect(result.sheetData).toBe(sheet)
  })
})
