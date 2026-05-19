export type AttributeTargetId =
  | "agility.value"
  | "strength.value"
  | "finesse.value"
  | "instinct.value"
  | "presence.value"
  | "knowledge.value"

export type ExperienceTargetId = `experienceValues.${number}`

export type ModifierTargetId =
  | "evasion"
  | "armorMax"
  | "minorThreshold"
  | "majorThreshold"
  | "hpMax"
  | "stressMax"
  | "proficiency"
  | AttributeTargetId
  | ExperienceTargetId

export type OtherAdjustmentKind =
  | "unknownMigrationDifference"
  | "manualFinalAdjustment"
  | "unattributedDifference"

export interface OtherAdjustment {
  id: string
  target: ModifierTargetId
  kind: OtherAdjustmentKind
  value: number
}

export type FixedUpgradeTargetId = "hpMax" | "stressMax" | "evasion" | "proficiency"

export type AttributeKey =
  | "agility"
  | "strength"
  | "finesse"
  | "instinct"
  | "presence"
  | "knowledge"

export type UpgradeStateParams =
  | { target: FixedUpgradeTargetId }
  | { attributes: AttributeKey[] }
  | { experienceIndexes: number[] }

export interface UpgradeState {
  checked: boolean
  params?: UpgradeStateParams
  attributeMarksApplied?: true
}

export type UpgradeStates = Record<string, UpgradeState>

export type UpgradeAutomationMetadata =
  | { kind: "fixedTarget"; target: FixedUpgradeTargetId }
  | { kind: "attributeSelection"; count: 2 }
  | { kind: "experienceSelection"; count: 2 }
  | { kind: "none" }

export type ModifierEntryId = string

export type ModifierEntryKind = "base" | "modifier"
export type ModifierSourceType = "profession" | "armor" | "level" | "upgrade" | "user" | "equipment"

export interface ModifierContributionDefinition {
  target: ModifierTargetId
  kind: ModifierEntryKind
}

export interface ModifierContributionEditable {
  label: string
  value: number
}

export interface ModifierContribution {
  id: ModifierEntryId
  definition: ModifierContributionDefinition
  editable: ModifierContributionEditable
}

export type UserModifierContribution = ModifierContribution

export interface ModifierEntryPresentation {
  label: string
  value: number
}

export interface ModifierEntrySource {
  type: ModifierSourceType
  id: string
}

export interface ModifierEntry {
  id: ModifierEntryId
  definition: ModifierContributionDefinition
  presentation: ModifierEntryPresentation
  source: ModifierEntrySource
  priority: number
}

export interface TargetModifierState {
  activeBaseId?: ModifierEntryId
  autoCalculation?: boolean
}

export interface ModifierEntryState {
  enabled?: boolean
  order?: number
}

export interface ModifierState {
  targetStates: Partial<Record<ModifierTargetId, TargetModifierState>>
  entryStates: Partial<Record<ModifierEntryId, ModifierEntryState>>
}
