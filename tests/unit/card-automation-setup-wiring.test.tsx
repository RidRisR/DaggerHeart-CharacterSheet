import { describe, expect, it } from "vitest"
import type { CardAutomationIR } from "@/card/automation/ir-types"
import { projectCardAutomationSetupRequirements } from "@/card/automation/setup-projection"
import type { StandardCard } from "@/card/card-types"
import { createEmptyCard } from "@/card/card-types"
import { resetSheetStore, sheet, store } from "./automation/test-helpers"

const setupChoiceAutomation: CardAutomationIR = {
  format: "daggerheart.card-automation.ir.v1",
  revision: "stable32:setup-wiring-test",
  abilities: [
    {
      id: "choose-setup",
      label: "Choose Setup",
      lifetime: { kind: "whileInLoadout" },
      choices: [
        {
          id: "mode",
          label: "Mode",
          kind: "selectOne",
          cardinality: { min: 1, max: 1, unique: true },
          domain: {
            kind: "staticOptions",
            options: [{ id: "a", label: "A" }],
          },
        },
      ],
      effects: [],
    },
  ],
}

function setupDomainCard(overrides: Partial<StandardCard> = {}): StandardCard {
  return {
    ...createEmptyCard("domain"),
    id: "domain:setup-wiring",
    name: "Setup Wiring",
    type: "domain",
    class: "Blade",
    automation: setupChoiceAutomation,
    ...overrides,
  }
}

function setupAncestryCard(overrides: Partial<StandardCard> = {}): StandardCard {
  return {
    ...createEmptyCard("ancestry"),
    id: "ancestry:setup-wiring",
    name: "Setup Ancestry",
    type: "ancestry",
    class: "Simiah",
    automation: setupChoiceAutomation,
    ...overrides,
  }
}

describe("card automation setup wiring", () => {
  it("ordinary selectCardForSlot creates a pending setup requirement discoverable by projection", () => {
    resetSheetStore()

    const result = store().selectCardForSlot({
      zone: "loadout",
      index: 5,
      template: setupDomainCard(),
    })

    expect(result.kind).toBe("success")
    if (result.kind !== "success") return
    expect(result.cardInstanceId).toBe(sheet().cards[5].instanceId)

    const requirements = projectCardAutomationSetupRequirements(sheet(), {
      cardInstanceId: result.cardInstanceId,
    })
    expect(requirements).toEqual([
      expect.objectContaining({
        cardInstanceId: result.cardInstanceId,
        cardTemplateId: "domain:setup-wiring",
        cardName: "Setup Wiring",
        zone: "loadout",
        abilityId: "choose-setup",
      }),
    ])
  })

  it("selectCharacterChoiceCard creates a protected slot setup requirement discoverable by projection", () => {
    resetSheetStore()

    const result = store().selectCharacterChoiceCard(
      "ancestry1",
      { id: "ancestry:setup-wiring", name: "Setup Ancestry" },
      setupAncestryCard(),
    )

    expect(result.kind).toBe("success")
    if (result.kind !== "success") return
    expect(result.cardInstanceId).toBe(sheet().cards[2].instanceId)

    const requirements = projectCardAutomationSetupRequirements(sheet(), {
      cardInstanceId: result.cardInstanceId,
    })
    expect(requirements).toEqual([
      expect.objectContaining({
        cardInstanceId: result.cardInstanceId,
        cardTemplateId: "ancestry:setup-wiring",
        cardName: "Setup Ancestry",
        zone: "loadout",
        abilityId: "choose-setup",
      }),
    ])
  })
})
