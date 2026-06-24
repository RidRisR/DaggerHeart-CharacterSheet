import { describe, expect, it } from "vitest";
import type { StandardCard } from "@/card/card-types";
import builtinBase from "@/data/cards/builtin-base.json";
import { createEmptyEquipmentData } from "@/automation/equipment/defaults";
import type { EquipmentData } from "@/automation/equipment/types";
import type { CardAutomationDefinition } from "../definition-types";
import type {
  CardInstanceAutomationState,
  CardModifierContribution,
} from "../ir-types";
import { compileCardAutomationDefinition } from "../compile-definition";
import { buildCardAutomationSnapshot } from "../snapshot";
import { resolveCardAutomation } from "../resolve";
import { projectCardAutomationContributions } from "../project-contributions";
import { makeSheet } from "./helpers";

type CardGroup =
  | "profession"
  | "ancestry"
  | "subclass"
  | "domain"
  | "variant";

type RawFixtureCard = {
  id: string;
  名称?: string;
  name?: string;
  领域?: string;
  等级?: number | string;
  automation?: CardAutomationDefinition;
};

type ExpectedContribution = {
  id: string;
  kind: "base" | "modifier";
  target: string;
  value: number;
};

const cardPack = builtinBase as unknown as Record<string, RawFixtureCard[]>;

const voidCards: Record<string, RawFixtureCard & { type: CardGroup; className: string }> = {
  "VOID-1.5整合卡牌包-RidRisR-prof-格斗家": {
    id: "VOID-1.5整合卡牌包-RidRisR-prof-格斗家",
    name: "格斗家",
    type: "profession",
    className: "格斗家",
    automation: {
      format: "daggerheart.card-automation.definition.v1",
      mode: "lowLevel",
      body: {
        abilities: [
          {
            id: "barehanded-fighter",
            label: "格斗家",
            effects: [
              {
                kind: "emitWhen",
                id: "no-weapon-equipped",
                when: {
                  kind: "all",
                  conditions: [
                    { kind: "equipmentSlotEmpty", slot: "primaryWeapon" },
                    { kind: "equipmentSlotEmpty", slot: "secondaryWeapon" },
                  ],
                },
                effects: [
                  {
                    kind: "emitModifier",
                    id: "barehanded-fighter-evasion",
                    target: "evasion",
                    value: 1,
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  },
  "VOID-1.5整合卡牌包-RidRisR-ance-石肤": {
    id: "VOID-1.5整合卡牌包-RidRisR-ance-石肤",
    name: "石肤",
    type: "ancestry",
    className: "石肤",
    automation: {
      format: "daggerheart.card-automation.definition.v1",
      mode: "lowLevel",
      body: {
        abilities: [
          {
            id: "stone-skin",
            label: "石肤",
            effects: [
              { kind: "emitModifier", id: "stone-skin-armor", target: "armorMax", value: 1 },
              { kind: "emitModifier", id: "stone-skin-minor", target: "minorThreshold", value: 1 },
              { kind: "emitModifier", id: "stone-skin-major", target: "majorThreshold", value: 1 },
            ],
          },
        ],
      },
    },
  },
  "VOID-1.5整合卡牌包-RidRisR-subc-重拳主宰专精": {
    id: "VOID-1.5整合卡牌包-RidRisR-subc-重拳主宰专精",
    name: "重拳主宰专精",
    type: "subclass",
    className: "重拳主宰",
    automation: {
      format: "daggerheart.card-automation.definition.v1",
      mode: "lowLevel",
      body: {
        abilities: [
          {
            id: "iron-fist-specialization",
            label: "重拳主宰专精",
            effects: [
              {
                kind: "emitModifier",
                id: "iron-fist-specialization-major",
                target: "majorThreshold",
                value: 3,
              },
            ],
          },
        ],
      },
    },
  },
  "VOID-1.5整合卡牌包-RidRisR-vari-稳健": {
    id: "VOID-1.5整合卡牌包-RidRisR-vari-稳健",
    name: "稳健",
    type: "variant",
    className: "稳健",
    automation: {
      format: "daggerheart.card-automation.definition.v1",
      mode: "lowLevel",
      body: {
        abilities: [
          {
            id: "steady",
            label: "稳健",
            effects: [
              { kind: "emitModifier", id: "steady-evasion", target: "evasion", value: -1 },
            ],
          },
        ],
      },
    },
  },
  "VOID-1.5整合卡牌包-RidRisR-vari-坚定": {
    id: "VOID-1.5整合卡牌包-RidRisR-vari-坚定",
    name: "坚定",
    type: "variant",
    className: "坚定",
    automation: {
      format: "daggerheart.card-automation.definition.v1",
      mode: "lowLevel",
      body: {
        abilities: [
          {
            id: "steadfast",
            label: "坚定",
            effects: [
              { kind: "emitModifier", id: "steadfast-minor", target: "minorThreshold", value: 2 },
              { kind: "emitModifier", id: "steadfast-major", target: "majorThreshold", value: 2 },
            ],
          },
        ],
      },
    },
  },
};

function findBuiltinCard(group: CardGroup, id: string): RawFixtureCard {
  const card = cardPack[group]?.find((candidate) => candidate.id === id);
  if (!card) throw new Error(`Missing builtin fixture card ${group}/${id}`);
  return card;
}

function cardName(card: RawFixtureCard): string {
  return card.名称 ?? card.name ?? card.id;
}

function cardClass(group: CardGroup, card: RawFixtureCard): string {
  if (group === "domain") return card.领域 ?? "";
  return cardName(card);
}

function compileDefinition(card: RawFixtureCard) {
  if (!card.automation) {
    throw new Error(`Missing automation Definition for ${card.id}`);
  }
  const result = compileCardAutomationDefinition(card.automation);
  if (!result.ok) {
    throw new Error(
      `Invalid automation Definition for ${card.id}: ${result.diagnostics
        .map((diagnostic) => diagnostic.message)
        .join("; ")}`,
    );
  }
  return result.ir;
}

function builtinCard(
  group: CardGroup,
  id: string,
  options: {
    instanceId?: string;
    automationState?: CardInstanceAutomationState;
  } = {},
): StandardCard {
  const raw = findBuiltinCard(group, id);
  return {
    standarized: true,
    id: raw.id,
    instanceId: options.instanceId ?? `cardinst_${raw.id}`,
    name: cardName(raw),
    type: group,
    class: cardClass(group, raw),
    level: typeof raw.等级 === "number" ? raw.等级 : undefined,
    cardSelectDisplay: {},
    automation: compileDefinition(raw),
    automationState: options.automationState,
  };
}

function voidCard(
  id: keyof typeof voidCards,
  options: {
    instanceId?: string;
    automationState?: CardInstanceAutomationState;
  } = {},
): StandardCard {
  const raw = voidCards[id];
  return {
    standarized: true,
    id: raw.id,
    instanceId: options.instanceId ?? `cardinst_${raw.id}`,
    name: cardName(raw),
    type: raw.type,
    class: raw.className,
    cardSelectDisplay: {},
    automation: compileDefinition(raw),
    automationState: options.automationState,
  };
}

function fillerDomainCard(classification: string, index: number): StandardCard {
  return {
    standarized: true,
    id: `fixture-${classification}-${index}`,
    instanceId: `cardinst_fixture_${classification}_${index}`,
    name: `Fixture ${classification} ${index}`,
    type: "domain",
    class: classification,
    level: 1,
    cardSelectDisplay: {},
  };
}

function equipmentWith(options: {
  armor?: boolean;
  primaryWeapon?: boolean;
  secondaryWeapon?: boolean;
}): EquipmentData {
  const equipment = createEmptyEquipmentData();
  if (options.armor) equipment.armorSlot.name = "Fixture Armor";
  if (options.primaryWeapon) equipment.weaponSlots.primary.name = "Fixture Blade";
  if (options.secondaryWeapon) equipment.weaponSlots.secondary.name = "Fixture Dagger";
  return equipment;
}

function contributionSummary(
  contributions: CardModifierContribution[],
): ExpectedContribution[] {
  return contributions.map(({ id, kind, target, value }) => ({
    id,
    kind,
    target,
    value,
  }));
}

function contributionsFor(
  cards: StandardCard[],
  options: Parameters<typeof makeSheet>[0] = {},
): ExpectedContribution[] {
  const resolved = resolveCardAutomation(
    buildCardAutomationSnapshot(
      makeSheet({
        cards,
        ...options,
      }),
    ),
  );
  return contributionSummary(projectCardAutomationContributions(resolved));
}

function expectContributions(
  cards: StandardCard[],
  expected: ExpectedContribution[],
  options: Parameters<typeof makeSheet>[0] = {},
): void {
  expect(contributionsFor(cards, options)).toEqual(expected);
}

function expectNoContributions(
  cards: StandardCard[],
  options: Parameters<typeof makeSheet>[0] = {},
): void {
  expect(contributionsFor(cards, options)).toEqual([]);
}

describe("card automation fixture matrix", () => {
  it("Simiah-Nimble contributes evasion +1", () => {
    expectContributions([builtinCard("ancestry", "Simiah-Nimble")], [
      {
        id: "card:cardinst_Simiah-Nimble:nimble:nimble-evasion",
        kind: "modifier",
        target: "evasion",
        value: 1,
      },
    ]);
  });

  it("Giant-Endurance contributes hpMax +1", () => {
    expectContributions([builtinCard("ancestry", "Giant-Endurance")], [
      {
        id: "card:cardinst_Giant-Endurance:endurance:endurance-hp",
        kind: "modifier",
        target: "hpMax",
        value: 1,
      },
    ]);
  });

  it("Human-HighStamina contributes stressMax +1", () => {
    expectContributions([builtinCard("ancestry", "Human-HighStamina")], [
      {
        id: "card:cardinst_Human-HighStamina:high-stamina:high-stamina-stress",
        kind: "modifier",
        target: "stressMax",
        value: 1,
      },
    ]);
  });

  it("Clank-PurposefulDesign contributes selected experience +1", () => {
    expectContributions(
      [
        builtinCard("ancestry", "Clank-PurposefulDesign", {
          automationState: {
            version: 1,
            abilities: {
              "purposeful-design": {
                choiceValues: { boostedExperience: ["experienceValues.0"] },
              },
            },
          },
        }),
      ],
      [
        {
          id: "card:cardinst_Clank-PurposefulDesign:purposeful-design:purposeful-design-experience:experienceValues.0",
          kind: "modifier",
          target: "experienceValues.0",
          value: 1,
        },
      ],
    );
  });

  it("Galapa-Shell contributes thresholds equal to proficiency", () => {
    expectContributions(
      [builtinCard("ancestry", "Galapa-Shell")],
      [
        {
          id: "card:cardinst_Galapa-Shell:shell:shell-minor",
          kind: "modifier",
          target: "minorThreshold",
          value: 3,
        },
        {
          id: "card:cardinst_Galapa-Shell:shell:shell-major",
          kind: "modifier",
          target: "majorThreshold",
          value: 3,
        },
      ],
      { proficiency: 3 },
    );
  });

  it("Stalwart-Foundation contributes thresholds +1", () => {
    expectContributions([builtinCard("subclass", "Stalwart-Foundation")], [
      {
        id: "card:cardinst_Stalwart-Foundation:stalwart-foundation:stalwart-foundation-minor",
        kind: "modifier",
        target: "minorThreshold",
        value: 1,
      },
      {
        id: "card:cardinst_Stalwart-Foundation:stalwart-foundation:stalwart-foundation-major",
        kind: "modifier",
        target: "majorThreshold",
        value: 1,
      },
    ]);
  });

  it("Stalwart-Specialization contributes thresholds +2", () => {
    expectContributions([builtinCard("subclass", "Stalwart-Specialization")], [
      {
        id: "card:cardinst_Stalwart-Specialization:stalwart-specialization:stalwart-specialization-minor",
        kind: "modifier",
        target: "minorThreshold",
        value: 2,
      },
      {
        id: "card:cardinst_Stalwart-Specialization:stalwart-specialization:stalwart-specialization-major",
        kind: "modifier",
        target: "majorThreshold",
        value: 2,
      },
    ]);
  });

  it("Stalwart-Mastery contributes thresholds +3", () => {
    expectContributions([builtinCard("subclass", "Stalwart-Mastery")], [
      {
        id: "card:cardinst_Stalwart-Mastery:stalwart-mastery:stalwart-mastery-minor",
        kind: "modifier",
        target: "minorThreshold",
        value: 3,
      },
      {
        id: "card:cardinst_Stalwart-Mastery:stalwart-mastery:stalwart-mastery-major",
        kind: "modifier",
        target: "majorThreshold",
        value: 3,
      },
    ]);
  });

  it("Nightwalker-Mastery contributes evasion +1", () => {
    expectContributions([builtinCard("subclass", "Nightwalker-Mastery")], [
      {
        id: "card:cardinst_Nightwalker-Mastery:nightwalker-mastery:nightwalker-mastery-evasion",
        kind: "modifier",
        target: "evasion",
        value: 1,
      },
    ]);
  });

  it("School-of-War-Foundation contributes hpMax +1", () => {
    expectContributions([builtinCard("subclass", "School-of-War-Foundation")], [
      {
        id: "card:cardinst_School-of-War-Foundation:school-of-war-foundation:school-of-war-foundation-hp",
        kind: "modifier",
        target: "hpMax",
        value: 1,
      },
    ]);
  });

  it("Vengeance-Foundation contributes stressMax +1", () => {
    expectContributions([builtinCard("subclass", "Vengeance-Foundation")], [
      {
        id: "card:cardinst_Vengeance-Foundation:vengeance-foundation:vengeance-foundation-stress",
        kind: "modifier",
        target: "stressMax",
        value: 1,
      },
    ]);
  });

  it("Winged-Sentinel-Mastery contributes majorThreshold +4", () => {
    expectContributions([builtinCard("subclass", "Winged-Sentinel-Mastery")], [
      {
        id: "card:cardinst_Winged-Sentinel-Mastery:winged-sentinel-mastery:winged-sentinel-mastery-major",
        kind: "modifier",
        target: "majorThreshold",
        value: 4,
      },
    ]);
  });

  it("fortified-armor contributes thresholds +2 when armor is equipped", () => {
    expectContributions(
      [builtinCard("domain", "fortified-armor")],
      [
        {
          id: "card:cardinst_fortified-armor:fortified-armor:fortified-armor-minor",
          kind: "modifier",
          target: "minorThreshold",
          value: 2,
        },
        {
          id: "card:cardinst_fortified-armor:fortified-armor:fortified-armor-major",
          kind: "modifier",
          target: "majorThreshold",
          value: 2,
        },
      ],
      { equipment: equipmentWith({ armor: true }) },
    );
  });

  it("fortified-armor contributes nothing when no armor is equipped", () => {
    expectNoContributions([builtinCard("domain", "fortified-armor")]);
  });

  it("bare-bones contributes armor and threshold bases when armor is empty", () => {
    expectContributions(
      [builtinCard("domain", "bare-bones")],
      [
        {
          id: "card:cardinst_bare-bones:bare-bones:bare-bones-armor",
          kind: "base",
          target: "armorMax",
          value: 5,
        },
        {
          id: "card:cardinst_bare-bones:bare-bones:bare-bones-minor",
          kind: "base",
          target: "minorThreshold",
          value: 13,
        },
        {
          id: "card:cardinst_bare-bones:bare-bones:bare-bones-major",
          kind: "base",
          target: "majorThreshold",
          value: 31,
        },
      ],
      { level: "8" },
    );
  });

  it("bare-bones contributes nothing when armor is equipped", () => {
    expectNoContributions([builtinCard("domain", "bare-bones")], {
      equipment: equipmentWith({ armor: true }),
    });
  });

  it("vitality contributes two selected static options", () => {
    expectContributions(
      [
        builtinCard("domain", "vitality", {
          automationState: {
            version: 1,
            abilities: {
              vitality: {
                choiceValues: { benefits: ["hp-slot", "thresholds"] },
              },
            },
          },
        }),
      ],
      [
        {
          id: "card:cardinst_vitality:vitality:vitality-hp",
          kind: "modifier",
          target: "hpMax",
          value: 1,
        },
        {
          id: "card:cardinst_vitality:vitality:vitality-minor",
          kind: "modifier",
          target: "minorThreshold",
          value: 2,
        },
        {
          id: "card:cardinst_vitality:vitality:vitality-major",
          kind: "modifier",
          target: "majorThreshold",
          value: 2,
        },
      ],
    );
  });

  it("master-of-the-craft contributes two selected experiences +2", () => {
    expectContributions(
      [
        builtinCard("domain", "master-of-the-craft", {
          automationState: {
            version: 1,
            abilities: {
              "master-of-the-craft": {
                choiceValues: {
                  mode: ["two-experiences"],
                  twoExperiences: ["experienceValues.0", "experienceValues.1"],
                },
              },
            },
          },
        }),
      ],
      [
        {
          id: "card:cardinst_master-of-the-craft:master-of-the-craft:master-of-the-craft-two:experienceValues.0",
          kind: "modifier",
          target: "experienceValues.0",
          value: 2,
        },
        {
          id: "card:cardinst_master-of-the-craft:master-of-the-craft:master-of-the-craft-two:experienceValues.1",
          kind: "modifier",
          target: "experienceValues.1",
          value: 2,
        },
      ],
      { experience: ["Smith", "Scout", "", "", ""], experienceValues: ["0", "1", "", "", ""] },
    );
  });

  it("master-of-the-craft contributes one selected experience +3", () => {
    expectContributions(
      [
        builtinCard("domain", "master-of-the-craft", {
          automationState: {
            version: 1,
            abilities: {
              "master-of-the-craft": {
                choiceValues: {
                  mode: ["one-experience"],
                  oneExperience: ["experienceValues.0"],
                },
              },
            },
          },
        }),
      ],
      [
        {
          id: "card:cardinst_master-of-the-craft:master-of-the-craft:master-of-the-craft-one:experienceValues.0",
          kind: "modifier",
          target: "experienceValues.0",
          value: 3,
        },
      ],
    );
  });

  it("untouchable contributes evasion by ceil(agility / 2)", () => {
    expectContributions(
      [builtinCard("domain", "untouchable")],
      [
        {
          id: "card:cardinst_untouchable:untouchable:untouchable-evasion",
          kind: "modifier",
          target: "evasion",
          value: 2,
        },
      ],
      { agility: { checked: false, value: "3" } },
    );
  });

  it("armorer contributes armorMax +1 when armor is equipped", () => {
    expectContributions(
      [builtinCard("domain", "armorer")],
      [
        {
          id: "card:cardinst_armorer:armorer:armorer-armor",
          kind: "modifier",
          target: "armorMax",
          value: 1,
        },
      ],
      { equipment: equipmentWith({ armor: true }) },
    );
  });

  it("rise-up contributes majorThreshold equal to proficiency", () => {
    expectContributions(
      [builtinCard("domain", "rise-up")],
      [
        {
          id: "card:cardinst_rise-up:rise-up:rise-up-major",
          kind: "modifier",
          target: "majorThreshold",
          value: 4,
        },
      ],
      { proficiency: 4 },
    );
  });

  it("blade-touched contributes majorThreshold +4 with four matching domain cards", () => {
    expectContributions(
      [
        builtinCard("domain", "blade-touched"),
        ...[1, 2, 3].map((index) => fillerDomainCard("利刃", index)),
      ],
      [
        {
          id: "card:cardinst_blade-touched:blade-touched:blade-touched-major",
          kind: "modifier",
          target: "majorThreshold",
          value: 4,
        },
      ],
    );
  });

  it("bone-touched contributes agility +1 with four matching domain cards", () => {
    expectContributions(
      [
        builtinCard("domain", "bone-touched"),
        ...[1, 2, 3].map((index) => fillerDomainCard("骸骨", index)),
      ],
      [
        {
          id: "card:cardinst_bone-touched:bone-touched:bone-touched-agility",
          kind: "modifier",
          target: "agility.value",
          value: 1,
        },
      ],
    );
  });

  it("splendor-touched contributes majorThreshold +3 with four matching domain cards", () => {
    expectContributions(
      [
        builtinCard("domain", "splendor-touched"),
        ...[1, 2, 3].map((index) => fillerDomainCard("辉耀", index)),
      ],
      [
        {
          id: "card:cardinst_splendor-touched:splendor-touched:splendor-touched-major",
          kind: "modifier",
          target: "majorThreshold",
          value: 3,
        },
      ],
    );
  });

  it("valor-touched contributes armorMax +1 with four matching domain cards", () => {
    expectContributions(
      [
        builtinCard("domain", "valor-touched"),
        ...[1, 2, 3].map((index) => fillerDomainCard("勇气", index)),
      ],
      [
        {
          id: "card:cardinst_valor-touched:valor-touched:valor-touched-armor",
          kind: "modifier",
          target: "armorMax",
          value: 1,
        },
      ],
    );
  });

  it.each([
    ["blade-touched", "利刃"],
    ["bone-touched", "骸骨"],
    ["splendor-touched", "辉耀"],
    ["valor-touched", "勇气"],
  ] as const)("%s contributes nothing below four matching domain cards", (id, classification) => {
    expectNoContributions([
      builtinCard("domain", id),
      ...[1, 2].map((index) => fillerDomainCard(classification, index)),
    ]);
  });

  it.each([
    ["blade-touched", "奥术"],
    ["bone-touched", "奥术"],
    ["splendor-touched", "奥术"],
    ["valor-touched", "奥术"],
  ] as const)(
    "%s contributes nothing when four domain cards have the wrong classification",
    (id, wrongClassification) => {
      expectNoContributions([
        builtinCard("domain", id),
        ...[1, 2, 3].map((index) => fillerDomainCard(wrongClassification, index)),
      ]);
    },
  );

  it("格斗家 contributes evasion +1 when no weapon is equipped", () => {
    expectContributions(
      [voidCard("VOID-1.5整合卡牌包-RidRisR-prof-格斗家")],
      [
        {
          id: "card:cardinst_VOID-1.5整合卡牌包-RidRisR-prof-格斗家:barehanded-fighter:barehanded-fighter-evasion",
          kind: "modifier",
          target: "evasion",
          value: 1,
        },
      ],
    );
  });

  it.each([
    ["primary weapon", { primaryWeapon: true }],
    ["secondary weapon", { secondaryWeapon: true }],
  ] as const)("格斗家 contributes nothing with %s equipped", (_label, equipmentOptions) => {
    expectNoContributions([voidCard("VOID-1.5整合卡牌包-RidRisR-prof-格斗家")], {
      equipment: equipmentWith(equipmentOptions),
    });
  });

  it("石肤 contributes armor and thresholds +1", () => {
    expectContributions([voidCard("VOID-1.5整合卡牌包-RidRisR-ance-石肤")], [
      {
        id: "card:cardinst_VOID-1.5整合卡牌包-RidRisR-ance-石肤:stone-skin:stone-skin-armor",
        kind: "modifier",
        target: "armorMax",
        value: 1,
      },
      {
        id: "card:cardinst_VOID-1.5整合卡牌包-RidRisR-ance-石肤:stone-skin:stone-skin-minor",
        kind: "modifier",
        target: "minorThreshold",
        value: 1,
      },
      {
        id: "card:cardinst_VOID-1.5整合卡牌包-RidRisR-ance-石肤:stone-skin:stone-skin-major",
        kind: "modifier",
        target: "majorThreshold",
        value: 1,
      },
    ]);
  });

  it("重拳主宰专精 contributes majorThreshold +3", () => {
    expectContributions([voidCard("VOID-1.5整合卡牌包-RidRisR-subc-重拳主宰专精")], [
      {
        id: "card:cardinst_VOID-1.5整合卡牌包-RidRisR-subc-重拳主宰专精:iron-fist-specialization:iron-fist-specialization-major",
        kind: "modifier",
        target: "majorThreshold",
        value: 3,
      },
    ]);
  });

  it("稳健 contributes evasion -1", () => {
    expectContributions([voidCard("VOID-1.5整合卡牌包-RidRisR-vari-稳健")], [
      {
        id: "card:cardinst_VOID-1.5整合卡牌包-RidRisR-vari-稳健:steady:steady-evasion",
        kind: "modifier",
        target: "evasion",
        value: -1,
      },
    ]);
  });

  it("坚定 contributes thresholds +2", () => {
    expectContributions([voidCard("VOID-1.5整合卡牌包-RidRisR-vari-坚定")], [
      {
        id: "card:cardinst_VOID-1.5整合卡牌包-RidRisR-vari-坚定:steadfast:steadfast-minor",
        kind: "modifier",
        target: "minorThreshold",
        value: 2,
      },
      {
        id: "card:cardinst_VOID-1.5整合卡牌包-RidRisR-vari-坚定:steadfast:steadfast-major",
        kind: "modifier",
        target: "majorThreshold",
        value: 2,
      },
    ]);
  });
});
