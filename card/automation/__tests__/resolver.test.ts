import { describe, expect, it } from "vitest";
import type { StandardCard } from "@/card/card-types";
import type { CardAutomationIR } from "../ir-types";
import { buildCardAutomationSnapshot } from "../snapshot";
import { resolveCardAutomation } from "../resolve";
import { projectCardAutomationContributions } from "../project-contributions";
import { projectCardAutomationRequirements } from "../project-requirements";
import { makeSheet } from "./helpers";

function nimbleIr(value = 1): CardAutomationIR {
  return {
    format: "daggerheart.card-automation.ir.v1",
    revision: `stable32:nimble-${value}`,
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
            value,
          },
        ],
      },
    ],
  };
}

function choiceIr(): CardAutomationIR {
  return {
    format: "daggerheart.card-automation.ir.v1",
    revision: "stable32:choice",
    abilities: [
      {
        id: "purposeful-design",
        label: "定制设计",
        lifetime: { kind: "permanentOnceClaimed" },
        choices: [
          {
            id: "boostedExperience",
            kind: "targetSelectMany",
            cardinality: { min: 1, max: 1, unique: true },
            domain: { kind: "modifierTargetGroup", group: "experiences" },
          },
        ],
        effects: [
          {
            id: "effect-1",
            kind: "emitEachSelectedTarget",
            choiceId: "boostedExperience",
            value: 1,
          },
        ],
      },
    ],
  };
}

function multiExperienceChoiceIr(): CardAutomationIR {
  return {
    format: "daggerheart.card-automation.ir.v1",
    revision: "stable32:multi-choice",
    abilities: [
      {
        id: "seasoned",
        label: "Seasoned",
        lifetime: { kind: "permanentOnceClaimed" },
        choices: [
          {
            id: "boostedExperiences",
            kind: "targetSelectMany",
            cardinality: { min: 1, max: 2, unique: true },
            domain: { kind: "modifierTargetGroup", group: "experiences" },
          },
        ],
        effects: [
          {
            id: "effect-1",
            kind: "emitEachSelectedTarget",
            choiceId: "boostedExperiences",
            value: 1,
          },
        ],
      },
    ],
  };
}

function mixedExperienceChoiceIr(): CardAutomationIR {
  return {
    format: "daggerheart.card-automation.ir.v1",
    revision: "stable32:mixed-experience-choice",
    abilities: [
      {
        id: "seasoned-plus",
        label: "Seasoned Plus",
        lifetime: { kind: "permanentOnceClaimed" },
        choices: [
          {
            id: "boostedExperience",
            kind: "targetSelectMany",
            cardinality: { min: 1, max: 1, unique: true },
            domain: { kind: "modifierTargetGroup", group: "experiences" },
          },
        ],
        effects: [
          {
            id: "fixed-evasion",
            kind: "emitModifier",
            target: "evasion",
            value: 1,
          },
          {
            id: "base-minor",
            kind: "emitBase",
            target: "minorThreshold",
            value: 2,
          },
          {
            id: "selected-experience",
            kind: "emitEachSelectedTarget",
            choiceId: "boostedExperience",
            value: 3,
          },
        ],
      },
    ],
  };
}

function attributeChoiceIr(): CardAutomationIR {
  return {
    format: "daggerheart.card-automation.ir.v1",
    revision: "stable32:attribute-choice",
    abilities: [
      {
        id: "attribute-training",
        label: "Attribute Training",
        lifetime: { kind: "permanentOnceClaimed" },
        choices: [
          {
            id: "trainedAttribute",
            kind: "targetSelectMany",
            cardinality: { min: 1, max: 1, unique: true },
            domain: { kind: "modifierTargetGroup", group: "attributes" },
          },
        ],
        effects: [
          {
            id: "effect-1",
            kind: "emitEachSelectedTarget",
            choiceId: "trainedAttribute",
            value: 1,
          },
        ],
      },
    ],
  };
}

describe("card automation resolver", () => {
  it("emits fixed modifier from loadout card with stable card contribution id", () => {
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
          automation: nimbleIr(),
        },
      ],
    });

    const resolved = resolveCardAutomation(buildCardAutomationSnapshot(sheet));

    expect(projectCardAutomationContributions(resolved)).toEqual([
      expect.objectContaining({
        id: "card:cardinst_1:nimble:effect-1",
        target: "evasion",
        value: 1,
      }),
    ]);
  });

  it("blocks target choice ability until required choice exists", () => {
    const sheet = makeSheet({
      inventory_cards: [
        {
          standarized: true,
          id: "clank",
          instanceId: "cardinst_2",
          name: "定制设计",
          type: "ancestry",
          class: "机械人",
          cardSelectDisplay: {},
          automation: choiceIr(),
        },
      ],
    });

    const resolved = resolveCardAutomation(buildCardAutomationSnapshot(sheet));

    expect(projectCardAutomationContributions(resolved)).toEqual([]);
    expect(projectCardAutomationRequirements(resolved)).toEqual([
      expect.objectContaining({
        cardInstanceId: "cardinst_2",
        abilityId: "purposeful-design",
        status: "missingChoice",
        availableActions: ["setChoiceValues"],
      }),
    ]);
  });

  it("reports invalid stored choice without emitting contribution", () => {
    const sheet = makeSheet({
      cards: [
        {
          standarized: true,
          id: "clank",
          instanceId: "cardinst_invalid_choice",
          name: "定制设计",
          type: "ancestry",
          class: "机械人",
          cardSelectDisplay: {},
          automation: choiceIr(),
          automationState: {
            version: 1,
            abilities: {
              "purposeful-design": {
                choiceValues: { boostedExperience: ["experienceValues.99"] },
              },
            },
          },
        },
      ],
    });

    const resolved = resolveCardAutomation(buildCardAutomationSnapshot(sheet));

    expect(projectCardAutomationContributions(resolved)).toEqual([]);
    expect(resolved.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "INVALID_CHOICE_VALUE",
        cardInstanceId: "cardinst_invalid_choice",
      }),
    );
  });

  it("reports missing instance id and does not emit contribution", () => {
    const sheet = makeSheet({
      cards: [
        {
          standarized: true,
          id: "simiah",
          name: "灵活",
          type: "ancestry",
          class: "猿族",
          cardSelectDisplay: {},
          automation: nimbleIr(),
        },
      ],
    });

    const resolved = resolveCardAutomation(buildCardAutomationSnapshot(sheet));

    expect(projectCardAutomationContributions(resolved)).toEqual([]);
    expect(resolved.diagnostics).toContainEqual(
      expect.objectContaining({ code: "MISSING_INSTANCE_ID" }),
    );
  });

  it("reports missing instance automation with state and does not emit contribution", () => {
    const sheet = makeSheet({
      cards: [
        {
          standarized: true,
          id: "simiah",
          instanceId: "cardinst_missing_automation",
          name: "灵活",
          type: "ancestry",
          class: "猿族",
          cardSelectDisplay: {},
          automationState: { version: 1, abilities: {} },
        },
      ],
    });

    const resolved = resolveCardAutomation(buildCardAutomationSnapshot(sheet));

    expect(projectCardAutomationContributions(resolved)).toEqual([]);
    expect(resolved.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "MISSING_INSTANCE_AUTOMATION",
        cardInstanceId: "cardinst_missing_automation",
      }),
    );
  });

  it("reports missing instance automation when current template has automation", () => {
    const templateCard: StandardCard = {
      standarized: true,
      id: "simiah",
      name: "灵活",
      type: "ancestry",
      class: "猿族",
      cardSelectDisplay: {},
      automation: nimbleIr(),
    };
    const sheet = makeSheet({
      cards: [
        {
          standarized: true,
          id: "simiah",
          instanceId: "cardinst_missing_current_template_automation",
          name: "灵活",
          type: "ancestry",
          class: "猿族",
          cardSelectDisplay: {},
        },
      ],
    });

    const resolved = resolveCardAutomation(
      buildCardAutomationSnapshot(sheet, {
        findTemplateById: () => templateCard,
      }),
    );

    expect(projectCardAutomationContributions(resolved)).toEqual([]);
    expect(resolved.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "MISSING_INSTANCE_AUTOMATION",
        cardInstanceId: "cardinst_missing_current_template_automation",
      }),
    );
  });

  it("reports orphan ability state", () => {
    const sheet = makeSheet({
      cards: [
        {
          standarized: true,
          id: "simiah",
          instanceId: "cardinst_orphan_state",
          name: "灵活",
          type: "ancestry",
          class: "猿族",
          cardSelectDisplay: {},
          automation: nimbleIr(),
          automationState: {
            version: 1,
            abilities: {
              missingAbility: { choiceValues: {} },
            },
          },
        },
      ],
    });

    const resolved = resolveCardAutomation(buildCardAutomationSnapshot(sheet));

    expect(resolved.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "ORPHAN_ABILITY_STATE",
        cardInstanceId: "cardinst_orphan_state",
        abilityId: "missingAbility",
      }),
    );
  });

  it("warns on template automation drift but contributes from instance IR", () => {
    const instanceIr = nimbleIr(1);
    const templateCard: StandardCard = {
      standarized: true,
      id: "simiah",
      name: "灵活",
      type: "ancestry",
      class: "猿族",
      cardSelectDisplay: {},
      automation: nimbleIr(99),
    };
    const sheet = makeSheet({
      cards: [
        {
          ...templateCard,
          instanceId: "cardinst_drift",
          automation: instanceIr,
          automationSource: {
            templateId: "simiah",
            templateAutomationRevision: "stable32:old",
          },
        },
      ],
    });

    const resolved = resolveCardAutomation(
      buildCardAutomationSnapshot(sheet, {
        findTemplateById: () => templateCard,
      }),
    );

    expect(projectCardAutomationContributions(resolved)).toEqual([
      expect.objectContaining({
        id: "card:cardinst_drift:nimble:effect-1",
        value: 1,
      }),
    ]);
    expect(resolved.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "TEMPLATE_AUTOMATION_DRIFT",
        cardInstanceId: "cardinst_drift",
      }),
    );
  });

  it("warns on template automation drift from instance IR even when source metadata matches template", () => {
    const instanceIr = nimbleIr(1);
    const templateCard: StandardCard = {
      standarized: true,
      id: "simiah",
      name: "灵活",
      type: "ancestry",
      class: "猿族",
      cardSelectDisplay: {},
      automation: nimbleIr(99),
    };
    const sheet = makeSheet({
      cards: [
        {
          ...templateCard,
          instanceId: "cardinst_instance_revision_drift",
          automation: instanceIr,
          automationSource: {
            templateId: "simiah",
            templateAutomationRevision: "stable32:nimble-99",
          },
        },
      ],
    });

    const resolved = resolveCardAutomation(
      buildCardAutomationSnapshot(sheet, {
        findTemplateById: () => templateCard,
      }),
    );

    expect(projectCardAutomationContributions(resolved)).toEqual([
      expect.objectContaining({
        id: "card:cardinst_instance_revision_drift:nimble:effect-1",
        value: 1,
      }),
    ]);
    expect(resolved.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "TEMPLATE_AUTOMATION_DRIFT",
        cardInstanceId: "cardinst_instance_revision_drift",
      }),
    );
  });

  it("warns on missing template but contributes from instance IR", () => {
    const sheet = makeSheet({
      cards: [
        {
          standarized: true,
          id: "simiah",
          instanceId: "cardinst_missing_template",
          name: "灵活",
          type: "ancestry",
          class: "猿族",
          cardSelectDisplay: {},
          automation: nimbleIr(1),
          automationSource: {
            templateId: "simiah",
            templateAutomationRevision: "stable32:nimble-1",
          },
        },
      ],
    });

    const resolved = resolveCardAutomation(
      buildCardAutomationSnapshot(sheet, {
        findTemplateById: () => undefined,
      }),
    );

    expect(projectCardAutomationContributions(resolved)).toEqual([
      expect.objectContaining({
        id: "card:cardinst_missing_template:nimble:effect-1",
        value: 1,
      }),
    ]);
    expect(resolved.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "TEMPLATE_AUTOMATION_MISSING",
        cardInstanceId: "cardinst_missing_template",
      }),
    );
  });

  it("emits unique stable contribution ids for each selected target", () => {
    const sheet = makeSheet({
      experience: ["Smith", "Scout", "", "", ""],
      experienceValues: ["0", "1", "", "", ""],
      cards: [
        {
          standarized: true,
          id: "seasoned-card",
          instanceId: "cardinst_multi_target",
          name: "Seasoned",
          type: "ancestry",
          class: "Test",
          cardSelectDisplay: {},
          automation: multiExperienceChoiceIr(),
          automationState: {
            version: 1,
            abilities: {
              seasoned: {
                choiceValues: {
                  boostedExperiences: [
                    "experienceValues.0",
                    "experienceValues.1",
                  ],
                },
              },
            },
          },
        },
      ],
    });

    const resolved = resolveCardAutomation(buildCardAutomationSnapshot(sheet));

    expect(projectCardAutomationContributions(resolved)).toEqual([
      expect.objectContaining({
        id: "card:cardinst_multi_target:seasoned:effect-1:experienceValues.0",
        target: "experienceValues.0",
        value: 1,
      }),
      expect.objectContaining({
        id: "card:cardinst_multi_target:seasoned:effect-1:experienceValues.1",
        target: "experienceValues.1",
        value: 1,
      }),
    ]);
  });

  it("keeps selected experience target contributions when the experience label is cleared", () => {
    const sheet = makeSheet({
      experience: ["", "", "", "", ""],
      experienceValues: ["0", "", "", "", ""],
      cards: [
        {
          standarized: true,
          id: "seasoned-card",
          instanceId: "cardinst_cleared_experience_label",
          name: "Seasoned",
          type: "ancestry",
          class: "Test",
          cardSelectDisplay: {},
          automation: mixedExperienceChoiceIr(),
          automationState: {
            version: 1,
            abilities: {
              "seasoned-plus": {
                choiceValues: {
                  boostedExperience: ["experienceValues.0"],
                },
              },
            },
          },
        },
      ],
    });

    const resolved = resolveCardAutomation(buildCardAutomationSnapshot(sheet));

    expect(projectCardAutomationContributions(resolved)).toEqual([
      expect.objectContaining({
        id: "card:cardinst_cleared_experience_label:seasoned-plus:fixed-evasion",
        target: "evasion",
        value: 1,
      }),
      expect.objectContaining({
        id: "card:cardinst_cleared_experience_label:seasoned-plus:base-minor",
        kind: "base",
        target: "minorThreshold",
        value: 2,
      }),
      expect.objectContaining({
        id: "card:cardinst_cleared_experience_label:seasoned-plus:selected-experience:experienceValues.0",
        target: "experienceValues.0",
        value: 3,
      }),
    ]);
    expect(resolved.diagnostics).not.toContainEqual(
      expect.objectContaining({ code: "INVALID_CHOICE_VALUE" }),
    );
  });

  it("keeps selected attribute contributions when the attribute value is unparseable", () => {
    const sheet = makeSheet({
      agility: { value: "agile", checked: false },
      cards: [
        {
          standarized: true,
          id: "attribute-card",
          instanceId: "cardinst_attribute_choice",
          name: "Attribute Card",
          type: "domain",
          class: "Test",
          cardSelectDisplay: {},
          automation: attributeChoiceIr(),
          automationState: {
            version: 1,
            abilities: {
              "attribute-training": {
                choiceValues: {
                  trainedAttribute: ["agility.value"],
                },
              },
            },
          },
        },
      ],
    });

    const resolved = resolveCardAutomation(buildCardAutomationSnapshot(sheet));

    expect(projectCardAutomationContributions(resolved)).toEqual([
      expect.objectContaining({
        id: "card:cardinst_attribute_choice:attribute-training:effect-1:agility.value",
        target: "agility.value",
        value: 1,
      }),
    ]);
  });

  it("does not guess invalid level values", () => {
    const sheet = makeSheet({
      level: "unknown",
      cards: [
        {
          standarized: true,
          id: "level-card",
          instanceId: "cardinst_bad_level",
          name: "Level Card",
          type: "ancestry",
          class: "Test",
          cardSelectDisplay: {},
          automation: {
            format: "daggerheart.card-automation.ir.v1",
            revision: "stable32:bad-level",
            abilities: [
              {
                id: "level-boost",
                label: "Level Boost",
                lifetime: { kind: "whileInLoadout" },
                effects: [
                  {
                    id: "effect-1",
                    kind: "emitModifier",
                    target: "evasion",
                    value: { kind: "level" },
                  },
                ],
              },
            ],
          },
        },
      ],
    });

    const resolved = resolveCardAutomation(buildCardAutomationSnapshot(sheet));

    expect(projectCardAutomationContributions(resolved)).toEqual([]);
    expect(resolved.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "VALUE_EVALUATION_FAILED",
        cardInstanceId: "cardinst_bad_level",
        abilityId: "level-boost",
        effectId: "effect-1",
      }),
    );
  });

  it("does not guess invalid proficiency values", () => {
    const sheet = makeSheet({
      proficiency: "unknown" as never,
      cards: [
        {
          standarized: true,
          id: "proficiency-card",
          instanceId: "cardinst_bad_proficiency",
          name: "Proficiency Card",
          type: "ancestry",
          class: "Test",
          cardSelectDisplay: {},
          automation: {
            format: "daggerheart.card-automation.ir.v1",
            revision: "stable32:bad-proficiency",
            abilities: [
              {
                id: "proficiency-boost",
                label: "Proficiency Boost",
                lifetime: { kind: "whileInLoadout" },
                effects: [
                  {
                    id: "effect-1",
                    kind: "emitModifier",
                    target: "evasion",
                    value: { kind: "proficiency" },
                  },
                ],
              },
            ],
          },
        },
      ],
    });

    const resolved = resolveCardAutomation(buildCardAutomationSnapshot(sheet));

    expect(projectCardAutomationContributions(resolved)).toEqual([]);
    expect(resolved.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "VALUE_EVALUATION_FAILED",
        cardInstanceId: "cardinst_bad_proficiency",
        abilityId: "proficiency-boost",
        effectId: "effect-1",
      }),
    );
  });

  it("reports malformed instance automation IR without throwing", () => {
    const sheet = makeSheet({
      cards: [
        {
          standarized: true,
          id: "malformed-card",
          instanceId: "cardinst_malformed_ir",
          name: "Malformed",
          type: "ancestry",
          class: "Test",
          cardSelectDisplay: {},
          automation: {
            format: "daggerheart.card-automation.ir.v1",
            revision: "stable32:malformed",
            abilities: [
              {
                id: "broken",
                label: "Broken",
                lifetime: { kind: "whileInLoadout" },
              },
            ],
          } as CardAutomationIR,
        },
      ],
    });

    const resolved = resolveCardAutomation(buildCardAutomationSnapshot(sheet));

    expect(projectCardAutomationContributions(resolved)).toEqual([]);
    expect(resolved.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "INVALID_INSTANCE_AUTOMATION_IR",
        cardInstanceId: "cardinst_malformed_ir",
      }),
    );
  });

  it("rejects persisted IR with non-unique choice cardinality", () => {
    const sheet = makeSheet({
      experience: ["Smith", "Scout", "", "", ""],
      experienceValues: ["0", "1", "", "", ""],
      cards: [
        {
          standarized: true,
          id: "non-unique-card",
          instanceId: "cardinst_non_unique_choice",
          name: "Non Unique",
          type: "ancestry",
          class: "Test",
          cardSelectDisplay: {},
          automation: {
            format: "daggerheart.card-automation.ir.v1",
            revision: "stable32:non-unique",
            abilities: [
              {
                id: "non-unique-targets",
                label: "Non Unique Targets",
                lifetime: { kind: "whileInLoadout" },
                choices: [
                  {
                    id: "boostedExperiences",
                    kind: "targetSelectMany",
                    cardinality: { min: 1, max: 2, unique: false },
                    domain: { kind: "modifierTargetGroup", group: "experiences" },
                  },
                ],
                effects: [
                  {
                    id: "effect-1",
                    kind: "emitEachSelectedTarget",
                    choiceId: "boostedExperiences",
                    value: 1,
                  },
                ],
              },
            ],
          },
          automationState: {
            version: 1,
            abilities: {
              "non-unique-targets": {
                choiceValues: {
                  boostedExperiences: [
                    "experienceValues.0",
                    "experienceValues.0",
                  ],
                },
              },
            },
          },
        },
      ],
    });

    const resolved = resolveCardAutomation(buildCardAutomationSnapshot(sheet));

    expect(projectCardAutomationContributions(resolved)).toEqual([]);
    expect(resolved.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "INVALID_INSTANCE_AUTOMATION_IR",
        cardInstanceId: "cardinst_non_unique_choice",
      }),
    );
  });
});
