import { describe, expect, it } from "vitest"
import { collectModifierEntries } from "@/automation/core/registry"
import { makeSheet } from "@/card/automation/__tests__/helpers"

describe("card modifier provider", () => {
  it("collects card-sourced modifier entries with card source type", () => {
    const sheet = makeSheet({
      cards: [
        {
          standarized: true,
          id: "simiah",
          instanceId: "cardinst_1",
          name: "灵活",
          type: "ancestry",
          class: "猿族",
          cardSelectDisplay: {},
          automation: {
            format: "daggerheart.card-automation.ir.v1",
            revision: "stable32:test",
            abilities: [
              {
                id: "nimble",
                label: "灵活",
                lifetime: { kind: "whileInLoadout" },
                effects: [
                  {
                    id: "effect-1",
                    kind: "emitModifier",
                    target: "evasion",
                    value: 1,
                    label: "闪避加值",
                  },
                ],
              },
            ],
          },
        },
      ],
    })

    expect(collectModifierEntries(sheet, "evasion")).toContainEqual(
      expect.objectContaining({
        id: "card:cardinst_1:nimble:effect-1",
        presentation: { label: "灵活", value: 1 },
        source: { type: "card", id: "card:cardinst_1:nimble" },
        priority: 160,
      }),
    )
  })

  it("labels card-sourced base entries with only the card name", () => {
    const sheet = makeSheet({
      cards: [
        {
          standarized: true,
          id: "guardian",
          instanceId: "cardinst_base",
          name: "守护者",
          type: "domain",
          class: "Valor",
          cardSelectDisplay: {},
          automation: {
            format: "daggerheart.card-automation.ir.v1",
            revision: "stable32:base-label",
            abilities: [
              {
                id: "guarded",
                label: "守护姿态",
                lifetime: { kind: "whileInLoadout" },
                effects: [
                  {
                    id: "base-1",
                    kind: "emitBase",
                    target: "evasion",
                    value: 12,
                    label: "基础闪避",
                  },
                ],
              },
            ],
          },
        },
      ],
    })

    expect(collectModifierEntries(sheet, "evasion")).toContainEqual(
      expect.objectContaining({
        id: "card:cardinst_base:guarded:base-1",
        presentation: { label: "守护者", value: 12 },
        source: { type: "card", id: "card:cardinst_base:guarded" },
        priority: 110,
      }),
    )
  })
})
