import type { EquipmentData } from "./types"

export function swapInventoryWeaponWithActiveSlot(
  equipment: EquipmentData,
  inventoryIndex: 0 | 1,
  target: "primary" | "secondary",
): EquipmentData {
  const inventory = [...equipment.weaponSlots.inventory] as EquipmentData["weaponSlots"]["inventory"]
  const activeSlot = equipment.weaponSlots[target]
  const inventorySlot = inventory[inventoryIndex]

  inventory[inventoryIndex] = activeSlot

  return {
    ...equipment,
    weaponSlots: {
      ...equipment.weaponSlots,
      [target]: inventorySlot,
      inventory,
    },
  }
}
