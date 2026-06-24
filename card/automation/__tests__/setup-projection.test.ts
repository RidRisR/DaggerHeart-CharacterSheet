import { describe, expect, it } from "vitest";
import type { StandardCard } from "@/card/card-types";
import type { CardAutomationIR } from "../ir-types";
import { makeSheet } from "./helpers";
import {
  projectCardAutomationSetupDraft,
  projectCardAutomationSetupRequirements,
} from "../setup-projection";

function makeCard(overrides: Partial<StandardCard> = {}): StandardCard {
  return {
    standarized: true,
    id: "template-setup",
    instanceId: "cardinst_setup",
    name: "Setup Card",
    type: "domain",
    class: "Blade",
    cardSelectDisplay: {},
    ...overrides,
  };
}

const setupIr: CardAutomationIR = {
  format: "daggerheart.card-automation.ir.v1",
  revision: "stable32:setup",
  abilities: [
    {
      id: "choose-attribute",
      label: "Choose Attribute",
      lifetime: { kind: "whileInLoadout" },
      choices: [
        {
          id: "attribute",
          label: "Attribute",
          kind: "targetSelectMany",
          cardinality: { min: 1, max: 1, unique: true },
          domain: { kind: "modifierTargetGroup", group: "attributes" },
        },
      ],
      effects: [
        {
          id: "effect-1",
          kind: "emitEachSelectedTarget",
          choiceId: "attribute",
          value: 1,
        },
      ],
    },
    {
      id: "choose-experience",
      label: "Choose Experience",
      lifetime: { kind: "permanentOnceClaimed" },
      choices: [
        {
          id: "experience",
          label: "Experience",
          kind: "targetSelectMany",
          cardinality: { min: 1, max: 1, unique: true },
          domain: { kind: "modifierTargetGroup", group: "experiences" },
        },
      ],
      effects: [
        {
          id: "effect-2",
          kind: "emitEachSelectedTarget",
          choiceId: "experience",
          value: 2,
        },
      ],
    },
  ],
};

const branchedIr: CardAutomationIR = {
  format: "daggerheart.card-automation.ir.v1",
  revision: "stable32:branch",
  abilities: [
    {
      id: "branch",
      label: "Branch",
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
              { id: "attribute", label: "Attribute" },
              { id: "experience", label: "Experience" },
            ],
          },
        },
        {
          id: "experience",
          label: "Experience",
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
};

describe("card automation setup projection", () => {
  it("projects missing setup requirements in ability order with target labels", () => {
    const sheet = makeSheet({
      experience: ["Smith", "Scout", "", "", ""],
      cards: [makeCard({ automation: setupIr })],
    });

    const requirements = projectCardAutomationSetupRequirements(sheet, {
      cardInstanceId: "cardinst_setup",
    });

    expect(requirements.map((requirement) => requirement.abilityId)).toEqual([
      "choose-attribute",
      "choose-experience",
    ]);
    expect(requirements[0].choices[0].options).toEqual(
      expect.arrayContaining([
        { id: "agility.value", label: "敏捷" },
        { id: "strength.value", label: "力量" },
      ]),
    );
    expect(requirements[1].choices[0].options).toEqual([
      { id: "experienceValues.0", label: "经历 1：Smith" },
      { id: "experienceValues.1", label: "经历 2：Scout" },
    ]);
  });

  it("projects full setup requirement and choice read model fields", () => {
    const sheet = makeSheet({
      cards: [makeCard({ automation: setupIr })],
    });

    const requirements = projectCardAutomationSetupRequirements(sheet, {
      cardInstanceId: "cardinst_setup",
    });

    expect(requirements[0]).toEqual({
      cardInstanceId: "cardinst_setup",
      cardTemplateId: "template-setup",
      cardName: "Setup Card",
      zone: "loadout",
      abilityId: "choose-attribute",
      abilityLabel: "Choose Attribute",
      choices: [
        {
          choiceId: "attribute",
          label: "Attribute",
          kind: "targetSelectMany",
          cardinality: { min: 1, max: 1, unique: true },
          selectedIds: [],
          status: "missing",
          options: [
            { id: "agility.value", label: "敏捷" },
            { id: "strength.value", label: "力量" },
            { id: "finesse.value", label: "灵巧" },
            { id: "instinct.value", label: "本能" },
            { id: "presence.value", label: "风度" },
            { id: "knowledge.value", label: "知识" },
          ],
        },
      ],
    });
  });

  it("projects static options for missing setup choices", () => {
    const sheet = makeSheet({
      cards: [makeCard({ automation: branchedIr })],
    });

    const requirements = projectCardAutomationSetupRequirements(sheet, {
      cardInstanceId: "cardinst_setup",
    });

    expect(requirements).toHaveLength(1);
    expect(requirements[0].choices[0]).toMatchObject({
      choiceId: "mode",
      kind: "selectOne",
      status: "missing",
      options: [
        { id: "attribute", label: "Attribute" },
        { id: "experience", label: "Experience" },
      ],
    });
    expect(requirements[0].choices[1]).toMatchObject({
      choiceId: "experience",
      status: "notRequired",
      options: [{ id: "experienceValues.0", label: "经历 1：Smith" }],
    });
  });

  it("filters setup requirements to the requested card instance", () => {
    const sheet = makeSheet({
      cards: [
        makeCard({ automation: setupIr }),
        makeCard({
          id: "template-other",
          instanceId: "cardinst_other",
          name: "Other Setup Card",
          automation: setupIr,
        }),
      ],
    });

    const requirements = projectCardAutomationSetupRequirements(sheet, {
      cardInstanceId: "cardinst_other",
    });

    expect(requirements).toHaveLength(2);
    expect(
      requirements.every(
        (requirement) => requirement.cardInstanceId === "cardinst_other",
      ),
    ).toBe(true);
    expect(requirements.map((requirement) => requirement.cardName)).toEqual([
      "Other Setup Card",
      "Other Setup Card",
    ]);
  });

  it("keeps a missing requirement when a target choice has no options", () => {
    const sheet = makeSheet({
      experience: ["", "", "", "", ""],
      cards: [makeCard({ automation: setupIr })],
    });

    const requirements = projectCardAutomationSetupRequirements(sheet, {
      cardInstanceId: "cardinst_setup",
    });

    expect(
      requirements.find(
        (requirement) => requirement.abilityId === "choose-experience",
      )?.choices[0].options,
    ).toEqual([]);
  });

  it("projects draft state and identifies the active missing choice", () => {
    const sheet = makeSheet({
      experience: ["Smith", "", "", "", ""],
      cards: [makeCard({ automation: branchedIr })],
    });

    const initial = projectCardAutomationSetupDraft(sheet, {
      cardInstanceId: "cardinst_setup",
      abilityId: "branch",
      draftChoiceValues: {},
    });
    const withMode = projectCardAutomationSetupDraft(sheet, {
      cardInstanceId: "cardinst_setup",
      abilityId: "branch",
      draftChoiceValues: { mode: ["experience"] },
    });
    const complete = projectCardAutomationSetupDraft(sheet, {
      cardInstanceId: "cardinst_setup",
      abilityId: "branch",
      draftChoiceValues: {
        mode: ["experience"],
        experience: ["experienceValues.0"],
      },
    });

    expect(initial.activeChoice?.choiceId).toBe("mode");
    expect(initial.canSaveAbility).toBe(false);
    expect(withMode.activeChoice?.choiceId).toBe("experience");
    expect(withMode.canSaveAbility).toBe(false);
    expect(complete.activeChoice).toBeUndefined();
    expect(complete.canSaveAbility).toBe(true);
    expect(complete.savableChoiceValues).toEqual({
      mode: ["experience"],
      experience: ["experienceValues.0"],
    });
  });

  it("excludes draft choices that are not required in the current branch", () => {
    const sheet = makeSheet({
      experience: ["Smith", "", "", "", ""],
      cards: [makeCard({ automation: branchedIr })],
    });

    const projection = projectCardAutomationSetupDraft(sheet, {
      cardInstanceId: "cardinst_setup",
      abilityId: "branch",
      draftChoiceValues: {
        mode: ["attribute"],
        experience: ["experienceValues.0"],
      },
    });

    expect(projection.canSaveAbility).toBe(true);
    expect(projection.savableChoiceValues).toEqual({ mode: ["attribute"] });
    expect(projection.discardedChoiceIds).toEqual(["experience"]);
  });

  it("returns safe draft projections when the card or ability is missing", () => {
    const sheet = makeSheet({
      cards: [makeCard({ automation: branchedIr })],
    });

    expect(
      projectCardAutomationSetupDraft(sheet, {
        cardInstanceId: "cardinst_missing",
        abilityId: "branch",
        draftChoiceValues: { mode: ["experience"] },
      }),
    ).toEqual({
      canSaveAbility: false,
      savableChoiceValues: {},
      discardedChoiceIds: [],
      diagnostics: [],
    });
    expect(
      projectCardAutomationSetupDraft(sheet, {
        cardInstanceId: "cardinst_setup",
        abilityId: "missing-ability",
        draftChoiceValues: { mode: ["experience"] },
      }),
    ).toEqual({
      canSaveAbility: false,
      savableChoiceValues: {},
      discardedChoiceIds: [],
      diagnostics: [],
    });
  });

  it("projects invalid draft diagnostics and blocks saving", () => {
    const sheet = makeSheet({
      cards: [makeCard({ automation: branchedIr })],
    });

    const projection = projectCardAutomationSetupDraft(sheet, {
      cardInstanceId: "cardinst_setup",
      abilityId: "branch",
      draftChoiceValues: { mode: ["unknown-option"] },
    });

    expect(projection.activeChoice).toMatchObject({
      choiceId: "mode",
      status: "invalid",
      selectedIds: ["unknown-option"],
    });
    expect(projection.canSaveAbility).toBe(false);
    expect(projection.savableChoiceValues).toEqual({});
    expect(projection.diagnostics).toEqual([
      expect.objectContaining({
        code: "INVALID_CHOICE_VALUE",
        cardInstanceId: "cardinst_setup",
        abilityId: "branch",
        choiceId: "mode",
      }),
    ]);
  });

  it("ignores sparse empty card slots while projecting requirements", () => {
    const sheet = makeSheet({
      cards: [
        undefined,
        makeCard({ automation: setupIr }),
      ] as unknown as StandardCard[],
      inventory_cards: [undefined] as unknown as StandardCard[],
    });

    expect(() =>
      projectCardAutomationSetupRequirements(sheet, {
        cardInstanceId: "cardinst_setup",
      }),
    ).not.toThrow();
  });
});
