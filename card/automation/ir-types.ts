import type { ModifierTargetId } from "@/automation/core/types"
import type { CardAutomationRuntimeDiagnostic } from "./runtime-diagnostics"

export const CARD_AUTOMATION_IR_FORMAT = "daggerheart.card-automation.ir.v1" as const
export const CARD_AUTOMATION_DEFINITION_FORMAT = "daggerheart.card-automation.definition.v1" as const

export type CardZone = "loadout" | "vault"
export type CardTier = "1" | "2" | "3" | "4"
export type CardAttributeKey = "agility" | "strength" | "finesse" | "instinct" | "presence" | "knowledge"
export type CardAutomationCardType = "profession" | "ancestry" | "community" | "subclass" | "domain" | "variant"
export type CardSelectableTargetGroupId = "attributes" | "experiences"
export type CardModifierTargetId = ModifierTargetId

export interface CardAutomationIR {
  format: typeof CARD_AUTOMATION_IR_FORMAT
  revision: string
  abilities: CardAbilityIR[]
}

export interface CardAbilityIR {
  id: string
  label: string
  lifetime: CardLifetimeIR
  choices?: CardChoiceIR[]
  when?: CardConditionIR
  effects: CardEffectIR[]
}

export type CardLifetimeIR =
  | { kind: "whileInLoadout" }
  | { kind: "permanentOnceClaimed" }

export type CardChoiceIR = CardStaticChoiceIR | CardTargetChoiceIR

export interface CardChoiceBaseIR {
  id: string
  label?: string
  requiredWhen?: CardConditionIR
  cardinality: { min: number; max: number; unique: boolean }
}

export type CardStaticChoiceIR = CardChoiceBaseIR & {
  kind: "selectOne" | "selectMany"
  domain: { kind: "staticOptions"; options: CardChoiceOptionIR[] }
}

export type CardTargetChoiceIR = CardChoiceBaseIR & {
  kind: "targetSelectMany"
  domain: { kind: "modifierTargetGroup"; group: CardSelectableTargetGroupId }
}

export interface CardChoiceOptionIR {
  id: string
  label: string
  effects?: CardOptionEffectIR[]
}

export type CardValueIR =
  | number
  | { kind: "readTarget"; target: CardModifierTargetId }
  | { kind: "level" }
  | { kind: "tier" }
  | { kind: "proficiency" }
  | { kind: "attribute"; attribute: CardAttributeKey }
  | { kind: "add"; values: CardValueIR[] }
  | { kind: "subtract"; left: CardValueIR; right: CardValueIR }
  | { kind: "multiply"; values: CardValueIR[] }
  | { kind: "divide"; left: CardValueIR; right: CardValueIR }
  | { kind: "floor"; value: CardValueIR }
  | { kind: "ceil"; value: CardValueIR }
  | { kind: "round"; value: CardValueIR }
  | { kind: "min"; values: CardValueIR[] }
  | { kind: "max"; values: CardValueIR[] }
  | { kind: "valueByTier"; values: Record<CardTier, CardValueIR> }

export type CardConditionIR =
  | { kind: "all"; conditions: [CardConditionIR, ...CardConditionIR[]] }
  | { kind: "any"; conditions: [CardConditionIR, ...CardConditionIR[]] }
  | { kind: "not"; condition: CardConditionIR }
  | { kind: "cardCount"; zone: CardZone | "any"; match: CardMatchIR; atLeast?: number; exactly?: number }
  | { kind: "equipmentSlotEmpty"; slot: "armor" | "primaryWeapon" | "secondaryWeapon" }
  | { kind: "equipmentSlotFilled"; slot: "armor" | "primaryWeapon" | "secondaryWeapon" }
  | { kind: "choiceEquals"; choiceId: string; valueId: string }
  | { kind: "choiceIncludes"; choiceId: string; valueId: string }

export interface CardMatchIR {
  type?: CardAutomationCardType
  classification?: string
  level?: number
  variantType?: string
  variantSubCategory?: string
}

export type CardEffectIR =
  | CardContributionEffectIR
  | CardConditionalEffectIR
  | CardSelectedOptionEffectIR
  | CardSelectedTargetEffectIR

export type CardOptionEffectIR = CardContributionEffectIR | CardOptionConditionalEffectIR

export type CardContributionEffectIR =
  | { kind: "emitModifier"; id: string; target: CardModifierTargetId; value: CardValueIR; label?: string }
  | { kind: "emitBase"; id: string; target: CardModifierTargetId; value: CardValueIR; label?: string }

export interface CardConditionalEffectIR {
  kind: "emitWhen"
  id?: string
  when: CardConditionIR
  effects: CardEffectIR[]
}

export interface CardOptionConditionalEffectIR {
  kind: "emitWhen"
  id?: string
  when: CardConditionIR
  effects: CardContributionEffectIR[]
}

export interface CardSelectedOptionEffectIR {
  kind: "emitEachSelectedOptionEffect"
  id?: string
  choiceId: string
}

export interface CardSelectedTargetEffectIR {
  kind: "emitEachSelectedTarget"
  id: string
  choiceId: string
  value: CardValueIR
  label?: string
}

export type CardChoiceValues = Record<string, string[]>

export interface CardAbilityState {
  choiceValues?: CardChoiceValues
}

export interface CardInstanceAutomationState {
  version: 1
  abilities?: Record<string, CardAbilityState>
}

export interface CardAutomationSourceSnapshot {
  templateId: string
  packId?: string
  templateAutomationRevision?: string
  copiedAt?: string
}

export interface ResolvedCardAutomation {
  sources: ResolvedCardAutomationSource[]
  diagnostics: CardAutomationRuntimeDiagnostic[]
}

export interface ResolvedCardAutomationSource {
  cardInstanceId: string
  cardTemplateId: string
  cardName: string
  zone: CardZone
  abilities: ResolvedCardAbility[]
}

export interface ResolvedCardAbility {
  abilityId: string
  abilityLabel: string
  lifetime: CardLifetimeIR
  status: "ready" | "inactive" | "blocked" | "invalid"
  choices: Record<string, ResolvedCardChoice>
  effects: ResolvedCardEffect[]
  diagnostics: CardAutomationRuntimeDiagnostic[]
}

export interface ResolvedCardChoice {
  choiceId: string
  kind: CardChoiceIR["kind"]
  status: "notRequired" | "missing" | "valid" | "invalid"
  selectedIds: string[]
  selectedOptions?: CardChoiceOptionIR[]
  selectedTargets?: CardModifierTargetId[]
  diagnostics: CardAutomationRuntimeDiagnostic[]
}

export interface ResolvedCardEffect {
  effectId: string
  status: "ready" | "blocked" | "skipped" | "invalid"
  contribution?: CardModifierContribution
  diagnostics: CardAutomationRuntimeDiagnostic[]
}

export interface CardModifierContribution {
  id: string
  kind: "base" | "modifier"
  target: CardModifierTargetId
  value: number
  label?: string
  source: CardModifierSourceIdentity
}

export interface CardModifierSourceIdentity {
  type: "card"
  cardInstanceId: string
  cardTemplateId: string
  cardName: string
  abilityId: string
  abilityLabel: string
  zone: CardZone
  effectId: string
  packId?: string
}
