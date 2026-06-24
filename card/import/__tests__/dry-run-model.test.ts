import { describe, expect, it } from "vitest"
import type { CardAutomationDefinition } from "@/card/automation/definition-types"
import { buildCardPackDryRunValidationModel } from "@/card/import/dry-run-model"
import type { CardPackV1 } from "@/card/import/types"

const automationDefinition: CardAutomationDefinition = {
  format: "daggerheart.card-automation.definition.v1",
  mode: "lowLevel",
  body: {
    abilities: [
      {
        id: "simiah-nimble",
        label: "灵活",
        effects: [{ kind: "emitModifier", target: "evasion", value: 1 }],
      },
    ],
  },
}

describe("card pack dry-run validation model", () => {
  it("strips raw automation definitions before compiler staging", () => {
    const pack: CardPackV1 = {
      format: "daggerheart.card-pack.v1",
      ancestries: [
        {
          id: "simiah-nimble",
          name: "灵活",
          ancestry: "猿族",
          summary: "",
          effect: "闪避永久 +1",
          category: 1,
          automation: automationDefinition,
        },
      ],
    }

    const model = buildCardPackDryRunValidationModel(pack, [])

    expect(model.cards[0]).toMatchObject({
      group: "ancestries",
      id: "simiah-nimble",
    })
    expect(model.cards[0]).not.toHaveProperty("automation")
    expect(pack.ancestries?.[0].automation).toBe(automationDefinition)
  })
})
