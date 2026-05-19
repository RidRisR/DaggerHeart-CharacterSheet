import { describe, expect, it } from "vitest"
import { createEmptyEquipmentData } from "@/automation/equipment/defaults"
import { swapInventoryWeaponWithActiveSlot } from "@/automation/equipment/weapon-slot-utils"

describe("weapon slot swap", () => {
  it("swaps an inventory slot with primary including contributions", () => {
    const equipment = createEmptyEquipmentData()
    equipment.weaponSlots.primary = {
      name: "Primary",
      trait: "",
      damage: "",
      feature: "",
      modifierContributions: [
        {
          id: "primary",
          definition: { target: "armorMax", kind: "modifier" },
          editable: { label: "p", value: 1 },
        },
      ],
    }
    equipment.weaponSlots.inventory[0] = {
      name: "Inventory",
      trait: "",
      damage: "",
      feature: "",
      modifierContributions: [
        {
          id: "inventory",
          definition: { target: "armorMax", kind: "modifier" },
          editable: { label: "i", value: 2 },
        },
      ],
    }

    const swapped = swapInventoryWeaponWithActiveSlot(equipment, 0, "primary")

    expect(swapped.weaponSlots.primary.name).toBe("Inventory")
    expect(swapped.weaponSlots.primary.modifierContributions[0].id).toBe("inventory")
    expect(swapped.weaponSlots.inventory[0].name).toBe("Primary")
  })

  it("swaps inventory slot 2 with secondary as whole weapon slots", () => {
    const equipment = createEmptyEquipmentData()
    equipment.weaponSlots.secondary = {
      name: "Secondary",
      trait: "secondary trait",
      damage: "secondary damage",
      feature: "secondary feature",
      modifierContributions: [
        {
          id: "secondary",
          definition: { target: "evasion", kind: "modifier" },
          editable: { label: "s", value: 1 },
        },
      ],
    }
    equipment.weaponSlots.inventory[1] = {
      name: "Inventory 2",
      trait: "inventory trait",
      damage: "inventory damage",
      feature: "inventory feature",
      modifierContributions: [
        {
          id: "inventory-2",
          definition: { target: "evasion", kind: "modifier" },
          editable: { label: "i2", value: 2 },
        },
      ],
    }

    const swapped = swapInventoryWeaponWithActiveSlot(equipment, 1, "secondary")

    expect(swapped.weaponSlots.secondary).toEqual({
      name: "Inventory 2",
      trait: "inventory trait",
      damage: "inventory damage",
      feature: "inventory feature",
      modifierContributions: [
        {
          id: "inventory-2",
          definition: { target: "evasion", kind: "modifier" },
          editable: { label: "i2", value: 2 },
        },
      ],
    })
    expect(swapped.weaponSlots.inventory[1]).toEqual({
      name: "Secondary",
      trait: "secondary trait",
      damage: "secondary damage",
      feature: "secondary feature",
      modifierContributions: [
        {
          id: "secondary",
          definition: { target: "evasion", kind: "modifier" },
          editable: { label: "s", value: 1 },
        },
      ],
    })
  })
})
