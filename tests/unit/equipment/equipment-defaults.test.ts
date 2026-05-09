import { describe, expect, it } from "vitest"
import { createEmptyArmorSlot, createEmptyEquipmentData, createEmptyWeaponSlot } from "@/lib/equipment/defaults"
import { parseArmorMax, parseArmorThreshold } from "@/lib/equipment/armor-utils"
import { defaultSheetData } from "@/lib/default-sheet-data"

describe("equipment defaults", () => {
  it("creates empty weapon slots", () => {
    expect(createEmptyWeaponSlot()).toEqual({
      name: "",
      trait: "",
      damage: "",
      feature: "",
      modifierContributions: [],
    })
  })

  it("creates empty armor slots", () => {
    expect(createEmptyArmorSlot()).toEqual({
      name: "",
      baseArmorMax: null,
      baseThresholds: { minor: null, major: null },
      feature: "",
      modifierContributions: [],
    })
  })

  it("creates two fixed inventory weapon slots", () => {
    const equipment = createEmptyEquipmentData()

    expect(equipment.weaponSlots.inventory).toHaveLength(2)
    expect(equipment.weaponSlots.primary).toEqual(createEmptyWeaponSlot())
    expect(equipment.weaponSlots.secondary).toEqual(createEmptyWeaponSlot())
  })

  it("default sheet data has equipment and no legacy equipment fields", () => {
    const data = defaultSheetData as unknown as Record<string, unknown>

    expect(data.equipment).toEqual(createEmptyEquipmentData())
    expect("primaryWeaponName" in data).toBe(false)
    expect("secondaryWeaponName" in data).toBe(false)
    expect("armorName" in data).toBe(false)
    expect("armorBaseScore" in data).toBe(false)
    expect("armorThreshold" in data).toBe(false)
    expect("inventoryWeapon1Primary" in data).toBe(false)
  })
})

describe("armor parsing helpers", () => {
  it("parses numeric armor max values", () => {
    expect(parseArmorMax("4")).toBe(4)
    expect(parseArmorMax(5)).toBe(5)
    expect(parseArmorMax("bad")).toBeNull()
    expect(parseArmorMax("")).toBeNull()
  })

  it("parses slash-separated thresholds", () => {
    expect(parseArmorThreshold("7/15")).toEqual({ minor: 7, major: 15 })
    expect(parseArmorThreshold("(7 / 15)")).toEqual({ minor: 7, major: 15 })
    expect(parseArmorThreshold("bad")).toEqual({ minor: null, major: null })
    expect(parseArmorThreshold("7")).toEqual({ minor: null, major: null })
    expect(parseArmorThreshold(null)).toEqual({ minor: null, major: null })
    expect(parseArmorThreshold(undefined)).toEqual({ minor: null, major: null })
    expect(parseArmorThreshold("")).toEqual({ minor: null, major: null })
    expect(parseArmorThreshold("7/")).toEqual({ minor: null, major: null })
    expect(parseArmorThreshold("/15")).toEqual({ minor: null, major: null })
    expect(parseArmorThreshold("7/bad")).toEqual({ minor: null, major: null })
    expect(parseArmorThreshold("7/15/20")).toEqual({ minor: null, major: null })
  })

  it("parses object threshold values", () => {
    expect(parseArmorThreshold({ minor: 7, major: 15 })).toEqual({ minor: 7, major: 15 })
    expect(parseArmorThreshold({ minor: "7", major: "15" })).toEqual({ minor: 7, major: 15 })
    expect(parseArmorThreshold({ minor: "bad", major: 15 })).toEqual({ minor: null, major: 15 })
  })
})
