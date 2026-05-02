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
  | "armorValue"
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
export type ModifierSourceType = "profession" | "armor" | "level" | "upgrade" | "user"

export interface ModifierEntry {
  id: ModifierEntryId
  sourceId: AutomationSourceId
  target: ModifierTargetId
  kind: ModifierEntryKind
  label: string
  value: number
  sourceType: ModifierSourceType
  priority: number
}

export interface UserModifierEntry extends ModifierEntry {
  sourceType: "user"
}

export interface TargetModifierState {
  activeBaseId?: ModifierEntryId
  disabledEntryIds?: ModifierEntryId[]
  userEntries?: UserModifierEntry[]
}

export interface ModifierState {
  byTarget: Partial<Record<ModifierTargetId, TargetModifierState>>
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
