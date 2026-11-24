import type { EquipmentBurden, EquipmentDamageType } from "./import/types"

export const DAMAGE_TYPE_LABELS: Record<EquipmentDamageType, string> = {
  physical: "物理",
  magic: "魔法",
  physicalOrMagic: "两用",
}

export const BURDEN_LABELS: Record<EquipmentBurden, string> = {
  oneHanded: "单手",
  twoHanded: "双手",
  offHand: "副手",
}
