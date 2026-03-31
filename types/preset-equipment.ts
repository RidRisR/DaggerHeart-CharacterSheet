export type CharacterAttributeKey =
  | "agility"
  | "strength"
  | "finesse"
  | "instinct"
  | "presence"
  | "knowledge"

export type EquipmentSelectionMode = "none" | "preset" | "custom"

export interface EquipmentSelectionState {
  mode: EquipmentSelectionMode
  id?: string
}

export type EquipmentAttributeModifiers = Partial<Record<CharacterAttributeKey, number>>

export interface EquipmentEffects {
  evasion?: number
  armorValue?: number
  attributes?: EquipmentAttributeModifiers
}
