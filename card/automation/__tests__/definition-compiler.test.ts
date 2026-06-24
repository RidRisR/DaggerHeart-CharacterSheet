import { describe, expect, it } from "vitest";
import { CARD_AUTOMATION_PHASE_1_LIMITS } from "../limits";
import {
  CARD_AUTOMATION_IR_FORMAT,
  CARD_AUTOMATION_DEFINITION_FORMAT,
} from "../ir-types";
import { defineCardAutomationDefinition } from "../definition-types";
import type { CardAutomationDefinition } from "../definition-types";
import { compileCardAutomationDefinition } from "../compile-definition";

describe("card automation type contracts", () => {
  it("exports stable phase 1 limits", () => {
    expect(CARD_AUTOMATION_PHASE_1_LIMITS).toEqual({
      maxAbilitiesPerCard: 8,
      maxChoicesPerAbility: 8,
      maxEffectsPerAbility: 32,
      maxNestedEffectDepth: 4,
      maxValueExpressionDepth: 6,
      maxConditionDepth: 6,
      maxExpandedContributionsPerAbility: 32,
    });
  });

  it("keeps definition and IR formats distinct", () => {
    expect(CARD_AUTOMATION_DEFINITION_FORMAT).toBe(
      "daggerheart.card-automation.definition.v1",
    );
    expect(CARD_AUTOMATION_IR_FORMAT).toBe("daggerheart.card-automation.ir.v1");
  });

  it("allows low-level definition wrapper without revision", () => {
    const definition: CardAutomationDefinition = {
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
    };

    expect(definition).not.toHaveProperty("revision");
    expect(definition.body).not.toHaveProperty("format");
  });

  it("allows low-level static choice option effects without ids", () => {
    const definition = defineCardAutomationDefinition({
      format: "daggerheart.card-automation.definition.v1",
      mode: "lowLevel",
      body: {
        abilities: [
          {
            id: "option-effect",
            label: "Option Effect",
            choices: [
              {
                id: "mode",
                kind: "selectOne",
                cardinality: { min: 1, max: 1, unique: true },
                domain: {
                  kind: "staticOptions",
                  options: [
                    {
                      id: "quick",
                      label: "Quick",
                      effects: [
                        { kind: "emitModifier", target: "evasion", value: 1 },
                      ],
                    },
                  ],
                },
              },
            ],
            effects: [],
          },
        ],
      },
    });

    const choice = definition.body.abilities[0].choices?.[0];
    expect(choice?.domain.kind).toBe("staticOptions");
    if (!choice || choice.domain.kind !== "staticOptions") return;

    const effect = choice.domain.options[0].effects?.[0];
    expect(effect).toMatchObject({
      kind: "emitModifier",
      target: "evasion",
      value: 1,
    });
    expect(effect && "id" in effect).toBe(false);
  });
});

describe("card automation compiler", () => {
  it("normalizes low-level definition into revisioned IR", () => {
    const result = compileCardAutomationDefinition({
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
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ir.format).toBe("daggerheart.card-automation.ir.v1");
    expect(result.ir.revision).toMatch(/^stable32:/);
    expect(result.ir.abilities[0].lifetime).toEqual({ kind: "whileInLoadout" });
    expect(result.ir.abilities[0].effects[0]).toMatchObject({
      id: "effect-1",
      kind: "emitModifier",
      target: "evasion",
      value: 1,
    });
  });

  it("rejects definition body carrying internal IR markers", () => {
    const result = compileCardAutomationDefinition({
      format: "daggerheart.card-automation.definition.v1",
      mode: "lowLevel",
      body: {
        format: "daggerheart.card-automation.ir.v1",
        abilities: [],
      } as never,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "INVALID_AUTOMATION_DEFINITION",
      }),
    );
  });

  it("rejects missing tier keys in normalized valueByTier", () => {
    const result = compileCardAutomationDefinition({
      format: "daggerheart.card-automation.definition.v1",
      mode: "lowLevel",
      body: {
        abilities: [
          {
            id: "bad-tier",
            label: "Bad Tier",
            effects: [
              {
                kind: "emitModifier",
                target: "minorThreshold",
                value: {
                  kind: "valueByTier",
                  values: { "1": 1, "2": 2, "3": 3 },
                },
              },
            ],
          },
        ],
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "INVALID_AUTOMATION_IR",
      }),
    );
  });

  it("rejects parallel active choice chains during IR validation", () => {
    const result = compileCardAutomationDefinition({
      format: "daggerheart.card-automation.definition.v1",
      mode: "lowLevel",
      body: {
        abilities: [
          {
            id: "bad-choices",
            label: "Bad Choices",
            choices: [
              {
                id: "mode",
                kind: "selectOne",
                cardinality: { min: 1, max: 1, unique: true },
                domain: {
                  kind: "staticOptions",
                  options: [{ id: "advanced", label: "Advanced" }],
                },
              },
              {
                id: "attribute",
                kind: "targetSelectMany",
                requiredWhen: {
                  kind: "choiceEquals",
                  choiceId: "mode",
                  valueId: "advanced",
                },
                cardinality: { min: 1, max: 1, unique: true },
                domain: { kind: "modifierTargetGroup", group: "attributes" },
              },
              {
                id: "experience",
                kind: "targetSelectMany",
                requiredWhen: {
                  kind: "choiceEquals",
                  choiceId: "mode",
                  valueId: "advanced",
                },
                cardinality: { min: 1, max: 1, unique: true },
                domain: { kind: "modifierTargetGroup", group: "experiences" },
              },
            ],
            effects: [],
          },
        ],
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "INVALID_AUTOMATION_IR",
      }),
    );
  });

  it("rejects raw and expanded contribution limits", () => {
    const tooManyRawEffects = compileCardAutomationDefinition({
      format: "daggerheart.card-automation.definition.v1",
      mode: "lowLevel",
      body: {
        abilities: [
          {
            id: "too-many-effects",
            label: "Too Many Effects",
            effects: Array.from({ length: 33 }, (_, index) => ({
              id: `raw-${index + 1}`,
              kind: "emitModifier",
              target: "evasion",
              value: 1,
            })),
          },
        ],
      },
    });

    expect(tooManyRawEffects.ok).toBe(false);
    if (!tooManyRawEffects.ok) {
      expect(tooManyRawEffects.diagnostics).toContainEqual(
        expect.objectContaining({
          severity: "error",
          code: "AUTOMATION_LIMIT_EXCEEDED",
        }),
      );
    }

    const tooManyExpandedOptionEffects = compileCardAutomationDefinition({
      format: "daggerheart.card-automation.definition.v1",
      mode: "lowLevel",
      body: {
        abilities: [
          {
            id: "too-many-expanded",
            label: "Too Many Expanded",
            choices: [
              {
                id: "mode",
                kind: "selectMany",
                cardinality: { min: 0, max: 33, unique: true },
                domain: {
                  kind: "staticOptions",
                  options: Array.from({ length: 33 }, (_, index) => ({
                    id: `option-${index + 1}`,
                    label: `Option ${index + 1}`,
                    effects: [
                      {
                        id: `option-effect-${index + 1}`,
                        kind: "emitModifier",
                        target: "evasion",
                        value: 1,
                      },
                    ],
                  })),
                },
              },
            ],
            effects: [
              { kind: "emitEachSelectedOptionEffect", choiceId: "mode" },
            ],
          },
        ],
      },
    });

    expect(tooManyExpandedOptionEffects.ok).toBe(false);
    if (!tooManyExpandedOptionEffects.ok) {
      expect(tooManyExpandedOptionEffects.diagnostics).toContainEqual(
        expect.objectContaining({
          severity: "error",
          code: "AUTOMATION_LIMIT_EXCEEDED",
        }),
      );
    }
  });

  it("rejects duplicate contribution effect ids after defaults are applied", () => {
    const explicitDuplicate = compileCardAutomationDefinition({
      format: "daggerheart.card-automation.definition.v1",
      mode: "lowLevel",
      body: {
        abilities: [
          {
            id: "duplicate-explicit",
            label: "Duplicate Explicit",
            choices: [
              {
                id: "mode",
                kind: "selectOne",
                cardinality: { min: 1, max: 1, unique: true },
                domain: {
                  kind: "staticOptions",
                  options: [
                    {
                      id: "quick",
                      label: "Quick",
                      effects: [
                        {
                          id: "shared",
                          kind: "emitModifier",
                          target: "evasion",
                          value: 1,
                        },
                      ],
                    },
                  ],
                },
              },
            ],
            effects: [
              {
                kind: "emitWhen",
                when: {
                  kind: "choiceEquals",
                  choiceId: "mode",
                  valueId: "quick",
                },
                effects: [
                  {
                    id: "shared",
                    kind: "emitBase",
                    target: "minorThreshold",
                    value: 1,
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    expect(explicitDuplicate.ok).toBe(false);
    if (!explicitDuplicate.ok) {
      expect(explicitDuplicate.diagnostics).toContainEqual(
        expect.objectContaining({
          severity: "error",
          code: "INVALID_AUTOMATION_IR",
        }),
      );
    }

    const generatedCollision = compileCardAutomationDefinition({
      format: "daggerheart.card-automation.definition.v1",
      mode: "lowLevel",
      body: {
        abilities: [
          {
            id: "duplicate-generated",
            label: "Duplicate Generated",
            effects: [
              { kind: "emitModifier", target: "evasion", value: 1 },
              {
                id: "effect-1",
                kind: "emitBase",
                target: "minorThreshold",
                value: 1,
              },
            ],
          },
        ],
      },
    });

    expect(generatedCollision.ok).toBe(false);
    if (!generatedCollision.ok) {
      expect(generatedCollision.diagnostics).toContainEqual(
        expect.objectContaining({
          severity: "error",
          code: "INVALID_AUTOMATION_IR",
        }),
      );
    }
  });

  it("rejects unsupported modifier targets", () => {
    const result = compileCardAutomationDefinition({
      format: "daggerheart.card-automation.definition.v1",
      mode: "lowLevel",
      body: {
        abilities: [
          {
            id: "bad-target",
            label: "Bad Target",
            effects: [
              {
                kind: "emitModifier",
                target: "notARealModifierTarget",
                value: 1,
              },
            ],
          },
        ],
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "INVALID_AUTOMATION_IR",
      }),
    );
  });

  it("rejects non-unique phase 1 choices for all choice kinds", () => {
    const selectOne = compileCardAutomationDefinition({
      format: "daggerheart.card-automation.definition.v1",
      mode: "lowLevel",
      body: {
        abilities: [
          {
            id: "non-unique-select-one",
            label: "Non Unique Select One",
            choices: [
              {
                id: "mode",
                kind: "selectOne",
                cardinality: { min: 1, max: 1, unique: false },
                domain: {
                  kind: "staticOptions",
                  options: [{ id: "quick", label: "Quick" }],
                },
              },
            ],
            effects: [],
          },
        ],
      },
    });

    expect(selectOne.ok).toBe(false);
    if (!selectOne.ok) {
      expect(selectOne.diagnostics).toContainEqual(
        expect.objectContaining({
          severity: "error",
          code: "INVALID_AUTOMATION_DEFINITION",
        }),
      );
    }

    const targetSelectMany = compileCardAutomationDefinition({
      format: "daggerheart.card-automation.definition.v1",
      mode: "lowLevel",
      body: {
        abilities: [
          {
            id: "non-unique-target-select",
            label: "Non Unique Target Select",
            choices: [
              {
                id: "attribute",
                kind: "targetSelectMany",
                cardinality: { min: 1, max: 1, unique: false },
                domain: { kind: "modifierTargetGroup", group: "attributes" },
              },
            ],
            effects: [],
          },
        ],
      },
    });

    expect(targetSelectMany.ok).toBe(false);
    if (!targetSelectMany.ok) {
      expect(targetSelectMany.diagnostics).toContainEqual(
        expect.objectContaining({
          severity: "error",
          code: "INVALID_AUTOMATION_DEFINITION",
        }),
      );
    }
  });

  it("rejects selectOne choices that are not exactly one selection", () => {
    const result = compileCardAutomationDefinition({
      format: "daggerheart.card-automation.definition.v1",
      mode: "lowLevel",
      body: {
        abilities: [
          {
            id: "wide-select-one",
            label: "Wide Select One",
            choices: [
              {
                id: "mode",
                kind: "selectOne",
                cardinality: { min: 1, max: 2, unique: true },
                domain: {
                  kind: "staticOptions",
                  options: [
                    { id: "quick", label: "Quick" },
                    { id: "steady", label: "Steady" },
                  ],
                },
              },
            ],
            effects: [],
          },
        ],
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "INVALID_AUTOMATION_IR",
      }),
    );
  });
});
