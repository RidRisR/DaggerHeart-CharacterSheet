import type {
  CanonicalBuiltinArmorTemplate,
  CanonicalBuiltinWeaponTemplate,
  RuntimeEquipmentTemplate,
} from "./types"

export function buildBuiltinRuntimeEquipmentTemplates(input: {
  weapons: readonly CanonicalBuiltinWeaponTemplate[]
  armor: readonly CanonicalBuiltinArmorTemplate[]
}): RuntimeEquipmentTemplate[] {
  return [
    ...input.weapons.map((weapon) => ({
      kind: "weapon" as const,
      ...weapon,
      modifierContributions: weapon.modifierContributions ?? [],
    })),
    ...input.armor.map((armor) => ({
      kind: "armor" as const,
      ...armor,
      modifierContributions: armor.modifierContributions ?? [],
    })),
  ]
}
