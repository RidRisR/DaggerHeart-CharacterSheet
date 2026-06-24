import type {
  CardAbilityIR,
  CardConditionIR,
  CardContributionEffectIR,
  CardEffectIR,
  CardChoiceOptionIR,
  CardOptionConditionalEffectIR,
  CardStaticChoiceIR,
  CardSelectedOptionEffectIR,
  CardSelectedTargetEffectIR,
  CardTargetChoiceIR,
  CARD_AUTOMATION_DEFINITION_FORMAT,
} from "./ir-types"

export interface CardAutomationDefinition {
  format: typeof CARD_AUTOMATION_DEFINITION_FORMAT
  mode: "lowLevel"
  body: CardAutomationLowLevelDefinition
}

export function defineCardAutomationDefinition(
  definition: CardAutomationDefinition,
): CardAutomationDefinition {
  return definition
}

export interface CardAutomationLowLevelDefinition {
  abilities: CardAutomationLowLevelAbilityDefinition[]
}

export type CardAutomationLowLevelAbilityDefinition =
  Omit<CardAbilityIR, "lifetime" | "choices" | "effects"> & {
    lifetime?: CardAbilityIR["lifetime"]
    choices?: CardAutomationLowLevelChoiceDefinition[]
    effects: CardAutomationLowLevelEffectDefinition[]
  }

export type CardAutomationLowLevelChoiceDefinition =
  | CardAutomationLowLevelStaticChoiceDefinition
  | CardAutomationLowLevelTargetChoiceDefinition

export type CardAutomationLowLevelStaticChoiceDefinition =
  Omit<CardStaticChoiceIR, "domain"> & {
    domain: {
      kind: "staticOptions"
      options: CardAutomationLowLevelChoiceOptionDefinition[]
    }
  }

export type CardAutomationLowLevelTargetChoiceDefinition =
  CardTargetChoiceIR

export type CardAutomationLowLevelChoiceOptionDefinition =
  Omit<CardChoiceOptionIR, "effects"> & {
    effects?: CardAutomationLowLevelOptionEffectDefinition[]
  }

export type CardAutomationLowLevelEffectDefinition =
  | CardAutomationLowLevelContributionEffectDefinition
  | CardAutomationLowLevelConditionalEffectDefinition
  | CardAutomationLowLevelSelectedOptionEffectDefinition
  | CardAutomationLowLevelSelectedTargetEffectDefinition

export type CardAutomationLowLevelOptionEffectDefinition =
  | CardAutomationLowLevelContributionEffectDefinition
  | CardAutomationLowLevelOptionConditionalEffectDefinition

export type CardAutomationLowLevelContributionEffectDefinition =
  Omit<CardContributionEffectIR, "id"> & { id?: string }

export type CardAutomationLowLevelConditionalEffectDefinition =
  Omit<Extract<CardEffectIR, { kind: "emitWhen" }>, "effects"> & {
    when: CardConditionIR
    effects: CardAutomationLowLevelEffectDefinition[]
  }

export type CardAutomationLowLevelOptionConditionalEffectDefinition =
  Omit<CardOptionConditionalEffectIR, "effects"> & {
    when: CardConditionIR
    effects: CardAutomationLowLevelContributionEffectDefinition[]
  }

export type CardAutomationLowLevelSelectedOptionEffectDefinition =
  CardSelectedOptionEffectIR

export type CardAutomationLowLevelSelectedTargetEffectDefinition =
  Omit<CardSelectedTargetEffectIR, "id"> & { id?: string }
