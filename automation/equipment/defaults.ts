import type { ArmorSlot, EquipmentData, WeaponSlot } from "./types"

export function createEmptyWeaponSlot(): WeaponSlot {
  return {
    name: "",
    trait: "",
    damage: "",
    feature: "",
    modifierContributions: [],
  }
}

export function createEmptyArmorSlot(): ArmorSlot {
  return {
    name: "",
    baseArmorMax: null,
    baseThresholds: { minor: null, major: null },
    feature: "",
    modifierContributions: [],
  }
}

export function createEmptyEquipmentData(): EquipmentData {
  return {
    weaponSlots: {
      primary: createEmptyWeaponSlot(),
      secondary: createEmptyWeaponSlot(),
      inventory: [createEmptyWeaponSlot(), createEmptyWeaponSlot()],
    },
    armorSlot: createEmptyArmorSlot(),
  }
}
