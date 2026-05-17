import type { SheetData } from "@/lib/sheet-data"

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

export type ModifierEntryId = string
export type AutomationSourceId = string

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

export interface AutomationSelection {
  selected: boolean
  params?: Record<string, unknown>
}

export type AutomationSelections = Record<AutomationSourceId, AutomationSelection>

export interface AddEffect {
  operation: "add"
  target: ModifierTargetId
  value: number
}

export interface SetBaseEffect {
  operation: "setBase"
  target: ModifierTargetId
  value: number | string
}

export interface RecalculateEffect {
  operation: "recalculate"
  target: ModifierTargetId
  formulaId: string
}

export type AutomationEffect = AddEffect | SetBaseEffect | RecalculateEffect

export interface AutomationContext {
  sheetData: SheetData
  selections?: AutomationSelections
  sourceId?: AutomationSourceId
  params?: Record<string, unknown>
}

export interface AutomationSourceDefinition {
  id: AutomationSourceId
  sourceType: ModifierSourceType
  label: string
  createEffects: (context: AutomationContext) => AutomationEffect[]
  createModifierEntries: (context: AutomationContext) => ModifierEntry[]
}

export interface ApplyEffectsResult {
  sheetData: SheetData
  updates: Partial<SheetData>
  warnings: string[]
}
