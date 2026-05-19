import type {
  ExperienceTargetId,
  ModifierContribution,
  ModifierEntryKind,
  ModifierTargetId,
} from "@/automation/core/types"

export type EquipmentModifierTargetId = Exclude<ModifierTargetId, ExperienceTargetId>

export interface EquipmentModifierContribution extends ModifierContribution {
  definition: {
    target: EquipmentModifierTargetId
    kind: "modifier"
  }
}

export interface EquipmentModifierContributionTemplate {
  id: string
  definition: {
    target: EquipmentModifierTargetId
    kind: ModifierEntryKind
  }
  editable: {
    label: string
    value: number
  }
}

export interface WeaponSlot {
  name: string
  trait: string
  damage: string
  feature: string
  modifierContributions: ModifierContribution[]
}

export interface ArmorSlot {
  name: string
  baseArmorMax: number | null
  baseThresholds: {
    minor: number | null
    major: number | null
  }
  feature: string
  modifierContributions: ModifierContribution[]
}

export interface EquipmentData {
  weaponSlots: {
    primary: WeaponSlot
    secondary: WeaponSlot
    inventory: [WeaponSlot, WeaponSlot]
  }
  armorSlot: ArmorSlot
}
