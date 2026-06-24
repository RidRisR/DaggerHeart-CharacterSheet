import { CARD_AUTOMATION_DEFINITION_FORMAT } from "./ir-types";

const stringSchema = { type: "string" } as const;
const numberSchema = { type: "number" } as const;
const booleanSchema = { type: "boolean" } as const;
const cardValueRef = { $ref: "#/$defs/cardValue" } as const;
const cardConditionRef = { $ref: "#/$defs/cardCondition" } as const;
const cardEffectRef = { $ref: "#/$defs/cardEffect" } as const;
const cardContributionEffectRef = {
  $ref: "#/$defs/cardContributionEffect",
} as const;
const cardOptionEffectRef = { $ref: "#/$defs/cardOptionEffect" } as const;

const contributionEffectVariants = [
  {
    type: "object",
    additionalProperties: false,
    required: ["kind", "target", "value"],
    properties: {
      kind: { const: "emitModifier" },
      id: stringSchema,
      target: stringSchema,
      value: cardValueRef,
      label: stringSchema,
    },
  },
  {
    type: "object",
    additionalProperties: false,
    required: ["kind", "target", "value"],
    properties: {
      kind: { const: "emitBase" },
      id: stringSchema,
      target: stringSchema,
      value: cardValueRef,
      label: stringSchema,
    },
  },
] as const;

export const cardValueSchema = {
  anyOf: [
    numberSchema,
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "target"],
      properties: { kind: { const: "readTarget" }, target: stringSchema },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind"],
      properties: { kind: { const: "level" } },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind"],
      properties: { kind: { const: "tier" } },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind"],
      properties: { kind: { const: "proficiency" } },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "attribute"],
      properties: {
        kind: { const: "attribute" },
        attribute: {
          enum: [
            "agility",
            "strength",
            "finesse",
            "instinct",
            "presence",
            "knowledge",
          ],
        },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "values"],
      properties: {
        kind: { enum: ["add", "multiply", "min", "max"] },
        values: { type: "array", items: cardValueRef },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "left", "right"],
      properties: {
        kind: { enum: ["subtract", "divide"] },
        left: cardValueRef,
        right: cardValueRef,
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "value"],
      properties: {
        kind: { enum: ["floor", "ceil", "round"] },
        value: cardValueRef,
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "values"],
      properties: {
        kind: { const: "valueByTier" },
        values: {
          type: "object",
          additionalProperties: false,
          properties: {
            "1": cardValueRef,
            "2": cardValueRef,
            "3": cardValueRef,
            "4": cardValueRef,
          },
        },
      },
    },
  ],
} as const;

export const cardConditionSchema = {
  anyOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "conditions"],
      properties: {
        kind: { enum: ["all", "any"] },
        conditions: { type: "array", items: cardConditionRef },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "condition"],
      properties: { kind: { const: "not" }, condition: cardConditionRef },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "zone", "match"],
      properties: {
        kind: { const: "cardCount" },
        zone: { enum: ["loadout", "vault", "any"] },
        match: {
          type: "object",
          additionalProperties: false,
          properties: {
            type: {
              enum: [
                "profession",
                "ancestry",
                "community",
                "subclass",
                "domain",
                "variant",
              ],
            },
            classification: stringSchema,
            level: numberSchema,
            variantType: stringSchema,
            variantSubCategory: stringSchema,
          },
        },
        atLeast: numberSchema,
        exactly: numberSchema,
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "slot"],
      properties: {
        kind: { enum: ["equipmentSlotEmpty", "equipmentSlotFilled"] },
        slot: { enum: ["armor", "primaryWeapon", "secondaryWeapon"] },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "choiceId", "valueId"],
      properties: {
        kind: { enum: ["choiceEquals", "choiceIncludes"] },
        choiceId: stringSchema,
        valueId: stringSchema,
      },
    },
  ],
} as const;

export const cardEffectSchema = {
  anyOf: [
    ...contributionEffectVariants,
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "when", "effects"],
      properties: {
        kind: { const: "emitWhen" },
        id: stringSchema,
        when: cardConditionRef,
        effects: { type: "array", items: cardEffectRef },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "choiceId"],
      properties: {
        kind: { const: "emitEachSelectedOptionEffect" },
        id: stringSchema,
        choiceId: stringSchema,
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "choiceId", "value"],
      properties: {
        kind: { const: "emitEachSelectedTarget" },
        id: stringSchema,
        choiceId: stringSchema,
        value: cardValueRef,
        label: stringSchema,
      },
    },
  ],
} as const;

const cardOptionEffectSchema = {
  anyOf: [
    ...contributionEffectVariants,
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "when", "effects"],
      properties: {
        kind: { const: "emitWhen" },
        id: stringSchema,
        when: cardConditionRef,
        effects: { type: "array", items: cardContributionEffectRef },
      },
    },
  ],
} as const;

export const cardChoiceSchema = {
  anyOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["id", "kind", "cardinality", "domain"],
      properties: {
        id: stringSchema,
        label: stringSchema,
        kind: { enum: ["selectOne", "selectMany"] },
        requiredWhen: cardConditionRef,
        cardinality: {
          type: "object",
          additionalProperties: false,
          required: ["min", "max", "unique"],
          properties: {
            min: numberSchema,
            max: numberSchema,
            unique: booleanSchema,
          },
        },
        domain: {
          type: "object",
          additionalProperties: false,
          required: ["kind", "options"],
          properties: {
            kind: { const: "staticOptions" },
            options: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "label"],
                properties: {
                  id: stringSchema,
                  label: stringSchema,
                  effects: { type: "array", items: cardOptionEffectRef },
                },
              },
            },
          },
        },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["id", "kind", "cardinality", "domain"],
      properties: {
        id: stringSchema,
        label: stringSchema,
        kind: { const: "targetSelectMany" },
        requiredWhen: cardConditionRef,
        cardinality: {
          type: "object",
          additionalProperties: false,
          required: ["min", "max", "unique"],
          properties: {
            min: numberSchema,
            max: numberSchema,
            unique: booleanSchema,
          },
        },
        domain: {
          type: "object",
          additionalProperties: false,
          required: ["kind", "group"],
          properties: {
            kind: { const: "modifierTargetGroup" },
            group: { enum: ["attributes", "experiences"] },
          },
        },
      },
    },
  ],
} as const;

export const cardAutomationLowLevelBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["abilities"],
  properties: {
    abilities: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "effects"],
        properties: {
          id: stringSchema,
          label: stringSchema,
          lifetime: {
            anyOf: [
              {
                type: "object",
                additionalProperties: false,
                required: ["kind"],
                properties: { kind: { const: "whileInLoadout" } },
              },
              {
                type: "object",
                additionalProperties: false,
                required: ["kind"],
                properties: { kind: { const: "permanentOnceClaimed" } },
              },
            ],
          },
          choices: { type: "array", items: { $ref: "#/$defs/cardChoice" } },
          when: cardConditionRef,
          effects: { type: "array", items: cardEffectRef },
        },
      },
    },
  },
} as const;

export const cardAutomationDefinitionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["format", "mode", "body"],
  properties: {
    format: { const: CARD_AUTOMATION_DEFINITION_FORMAT },
    mode: { const: "lowLevel" },
    body: cardAutomationLowLevelBodySchema,
  },
  $defs: {
    cardValue: cardValueSchema,
    cardCondition: cardConditionSchema,
    cardChoice: cardChoiceSchema,
    cardEffect: cardEffectSchema,
    cardContributionEffect: { anyOf: contributionEffectVariants },
    cardOptionEffect: cardOptionEffectSchema,
  },
} as const;
