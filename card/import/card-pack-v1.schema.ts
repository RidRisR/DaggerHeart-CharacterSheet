const stringField = { type: "string", minLength: 1 }
const optionalStringField = { type: "string" }
const imageFields = {
  imageUrl: optionalStringField,
  hasLocalImage: { type: "boolean" },
}

const baseCard = {
  type: "object",
  additionalProperties: false,
  required: ["id", "name"],
  properties: {
    id: stringField,
    name: stringField,
    ...imageFields,
  },
}

export const cardPackV1Schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: ["format"],
  properties: {
    format: { const: "daggerheart.card-pack.v1" },
    name: optionalStringField,
    version: optionalStringField,
    author: optionalStringField,
    description: optionalStringField,
    definitions: {
      type: "object",
      additionalProperties: false,
      properties: {
        classes: { type: "array", items: stringField },
        ancestries: { type: "array", items: stringField },
        communities: { type: "array", items: stringField },
        domains: { type: "array", items: stringField },
        variants: { type: "array", items: stringField },
        variantTypes: {
          type: "object",
          additionalProperties: {
            type: "object",
            additionalProperties: false,
            properties: {
              description: optionalStringField,
              subclasses: { type: "array", items: stringField },
              levelRange: {
                type: "array",
                minItems: 2,
                maxItems: 2,
                items: { type: "number" },
              },
            },
          },
        },
      },
    },
    classes: {
      type: "array",
      items: {
        ...baseCard,
        required: [
          "id",
          "name",
          "summary",
          "domain1",
          "domain2",
          "startingHitPoints",
          "startingEvasion",
          "startingItems",
          "hopeFeature",
          "classFeature",
        ],
        properties: {
          ...baseCard.properties,
          summary: optionalStringField,
          domain1: stringField,
          domain2: stringField,
          startingHitPoints: { type: "number", minimum: 1 },
          startingEvasion: { type: "number", minimum: 0 },
          startingItems: optionalStringField,
          hopeFeature: optionalStringField,
          classFeature: optionalStringField,
        },
      },
    },
    ancestries: {
      type: "array",
      items: {
        ...baseCard,
        required: ["id", "name", "ancestry", "summary", "effect", "category"],
        properties: {
          ...baseCard.properties,
          ancestry: stringField,
          summary: optionalStringField,
          effect: optionalStringField,
          category: { type: "number" },
        },
      },
    },
    communities: {
      type: "array",
      items: {
        ...baseCard,
        required: ["id", "name", "feature", "summary", "description"],
        properties: {
          ...baseCard.properties,
          feature: optionalStringField,
          summary: optionalStringField,
          description: optionalStringField,
        },
      },
    },
    subclasses: {
      type: "array",
      items: {
        ...baseCard,
        required: ["id", "name", "description", "class", "subclass", "level", "spellcastTrait"],
        properties: {
          ...baseCard.properties,
          description: optionalStringField,
          class: stringField,
          subclass: stringField,
          level: stringField,
          spellcastTrait: stringField,
        },
      },
    },
    domains: {
      type: "array",
      items: {
        ...baseCard,
        required: ["id", "name", "domain", "description", "level", "trait", "recallCost"],
        properties: {
          ...baseCard.properties,
          domain: stringField,
          description: optionalStringField,
          level: { type: "number", minimum: 1, maximum: 10 },
          trait: stringField,
          recallCost: { type: "number", minimum: 0 },
        },
      },
    },
    variants: {
      type: "array",
      items: {
        ...baseCard,
        required: ["id", "name", "type", "effect"],
        properties: {
          ...baseCard.properties,
          type: stringField,
          subCategory: optionalStringField,
          level: { type: "number", minimum: 0 },
          effect: optionalStringField,
          summaryItems: {
            type: "object",
            additionalProperties: false,
            properties: {
              item1: optionalStringField,
              item2: optionalStringField,
              item3: optionalStringField,
              item4: optionalStringField,
            },
          },
        },
      },
    },
  },
} as const
