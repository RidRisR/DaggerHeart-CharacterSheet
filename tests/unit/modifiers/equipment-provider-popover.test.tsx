import { act, render, screen, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ArmorSection } from "@/components/character-sheet-sections/armor-section"
import { InventoryWeaponSection } from "@/components/character-sheet-sections/inventory-weapon-section"
import { WeaponSection } from "@/components/character-sheet-sections/weapon-section"
import { EquipmentProviderAnchor } from "@/components/modifiers/equipment-provider-popover"
import { ModifierFieldAnchor } from "@/components/modifiers/modifier-field-anchor"
import type { EquipmentModifierContribution } from "@/lib/equipment/types"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { resetSheetStore, sheet, store } from "../automation/test-helpers"

function contribution(
  id: string,
  label: string,
  value: number,
  target: EquipmentModifierContribution["definition"]["target"] = "evasion",
): EquipmentModifierContribution {
  return {
    id,
    definition: { target, kind: "modifier" },
    editable: { label, value },
  }
}

describe("EquipmentProviderAnchor", () => {
  it("opens a provider popover using the slot name when available", async () => {
    resetSheetStore({
      equipment: {
        ...defaultSheetData.equipment,
        weaponSlots: {
          ...defaultSheetData.equipment.weaponSlots,
          primary: {
            ...defaultSheetData.equipment.weaponSlots.primary,
            name: "长剑",
            modifierContributions: [contribution("equipment:weapon:primary:one", "锋利", 1)],
          },
        },
      },
    })

    render(<EquipmentProviderAnchor slotRef={{ type: "weapon", slot: "primary" }} fallbackLabel="主手武器" />)

    await userEvent.click(screen.getByRole("button", { name: "查看长剑来源" }))

    expect(screen.getByRole("dialog", { name: "长剑来源" })).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "修正名称" })).toHaveValue("锋利")
    expect(screen.getByRole("textbox", { name: "修正数值" })).toHaveValue("1")
    expect(screen.getByRole("combobox", { name: "修正目标" })).toHaveDisplayValue("闪避")
  })

  it("uses the fallback label for unnamed slots and adds a default contribution", async () => {
    resetSheetStore()

    render(<EquipmentProviderAnchor slotRef={{ type: "weapon", slot: "secondary" }} fallbackLabel="副手武器" />)

    await userEvent.click(screen.getByRole("button", { name: "查看副手武器来源" }))
    await userEvent.click(screen.getByRole("button", { name: "新增修正" }))

    expect(screen.getByRole("dialog", { name: "副手武器来源" })).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "修正名称" })).toHaveValue("")
    expect(screen.getByRole("textbox", { name: "修正名称" })).toHaveAttribute("placeholder", "未命名修正")
    expect(sheet().equipment.weaponSlots.secondary.modifierContributions).toEqual([
      expect.objectContaining({
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "", value: 0 },
      }),
    ])
  })

  it("edits contribution label, parsed value, and target", async () => {
    resetSheetStore({
      equipment: {
        ...defaultSheetData.equipment,
        weaponSlots: {
          ...defaultSheetData.equipment.weaponSlots,
          inventory: [
            {
              ...defaultSheetData.equipment.weaponSlots.inventory[0],
              name: "备用斧",
              modifierContributions: [contribution("equipment:inventory:0:one", "", 0)],
            },
            defaultSheetData.equipment.weaponSlots.inventory[1],
          ],
        },
      },
    })

    render(<EquipmentProviderAnchor slotRef={{ type: "inventoryWeapon", index: 0 }} fallbackLabel="背包武器 1" />)

    await userEvent.click(screen.getByRole("button", { name: "查看备用斧来源" }))
    await userEvent.type(screen.getByRole("textbox", { name: "修正名称" }), "护手")
    await userEvent.clear(screen.getByRole("textbox", { name: "修正数值" }))
    await userEvent.type(screen.getByRole("textbox", { name: "修正数值" }), "2+3")
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "修正目标" }), "armorMax")

    const updated = sheet().equipment.weaponSlots.inventory[0].modifierContributions[0]
    expect(updated.editable).toEqual({ label: "护手", value: 5 })
    expect(updated.definition).toEqual({ target: "armorMax", kind: "modifier" })
    expect(updated.id).not.toBe("equipment:inventory:0:one")
  })

  it("deletes contributions using the unnamed fallback in the accessible label", async () => {
    resetSheetStore({
      equipment: {
        ...defaultSheetData.equipment,
        weaponSlots: {
          ...defaultSheetData.equipment.weaponSlots,
          secondary: {
            ...defaultSheetData.equipment.weaponSlots.secondary,
            modifierContributions: [contribution("equipment:weapon:secondary:one", "", 1)],
          },
        },
      },
    })

    render(<EquipmentProviderAnchor slotRef={{ type: "weapon", slot: "secondary" }} fallbackLabel="副手武器" />)

    await userEvent.click(screen.getByRole("button", { name: "查看副手武器来源" }))
    await userEvent.click(screen.getByRole("button", { name: "删除未命名修正" }))

    expect(sheet().equipment.weaponSlots.secondary.modifierContributions).toEqual([])
    expect(screen.queryByRole("button", { name: "删除未命名修正" })).not.toBeInTheDocument()
  })

  it("filters invalid and base equipment contributions from the provider panel", async () => {
    resetSheetStore({
      equipment: {
        ...defaultSheetData.equipment,
        weaponSlots: {
          ...defaultSheetData.equipment.weaponSlots,
          primary: {
            ...defaultSheetData.equipment.weaponSlots.primary,
            name: "长剑",
            modifierContributions: [
              contribution("equipment:weapon:primary:valid", "锋利", 1),
              {
                id: "equipment:weapon:primary:experience",
                definition: { target: "experienceValues.0", kind: "modifier" },
                editable: { label: "经历污染", value: 2 },
              },
              {
                id: "equipment:weapon:primary:base",
                definition: { target: "evasion", kind: "base" },
                editable: { label: "基础污染", value: 12 },
              },
            ],
          },
        },
      },
    })

    render(<EquipmentProviderAnchor slotRef={{ type: "weapon", slot: "primary" }} fallbackLabel="主手武器" />)

    await userEvent.click(screen.getByRole("button", { name: "查看长剑来源" }))

    expect(screen.getByRole("textbox", { name: "修正名称" })).toHaveValue("锋利")
    expect(screen.queryByDisplayValue("经历污染")).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue("基础污染")).not.toBeInTheDocument()
  })

  it("updates target panel source labels when the equipment name changes", async () => {
    resetSheetStore({
      evasion: "13",
      equipment: {
        ...defaultSheetData.equipment,
        weaponSlots: {
          ...defaultSheetData.equipment.weaponSlots,
          primary: {
            ...defaultSheetData.equipment.weaponSlots.primary,
            name: "旧剑",
            modifierContributions: [contribution("equipment:weapon:primary:evasion", "锋利", 1)],
          },
        },
      },
      modifierState: {
        targetStates: { evasion: { autoCalculation: false } },
        entryStates: {},
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)
    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

    expect(screen.getByText("旧剑：锋利")).toBeInTheDocument()

    act(() => {
      store().updateActiveWeaponSlot("primary", { name: "新名" })
    })

    expect(await screen.findByText("新名：锋利")).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByText("旧剑：锋利")).not.toBeInTheDocument()
    })
  })

  it("shows armor base values as read-only summary rows", async () => {
    resetSheetStore({
      equipment: {
        ...defaultSheetData.equipment,
        armorSlot: {
          ...defaultSheetData.equipment.armorSlot,
          name: "锁子甲",
          baseArmorMax: 5,
          baseThresholds: { minor: 8, major: 15 },
        },
      },
    })

    render(<EquipmentProviderAnchor slotRef={{ type: "armor" }} fallbackLabel="护甲" />)

    await userEvent.click(screen.getByRole("button", { name: "查看锁子甲来源" }))

    expect(screen.getByText("护甲值 5")).toBeInTheDocument()
    expect(screen.getByText("重伤 8")).toBeInTheDocument()
    expect(screen.getByText("严重 15")).toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: "护甲值" })).not.toBeInTheDocument()
  })

  it("shows missing armor base summary values as unknown instead of zero", async () => {
    resetSheetStore({
      equipment: {
        ...defaultSheetData.equipment,
        armorSlot: {
          ...defaultSheetData.equipment.armorSlot,
          name: "自定义护甲",
          baseArmorMax: null,
          baseThresholds: { minor: null, major: null },
        },
      },
    })

    render(<EquipmentProviderAnchor slotRef={{ type: "armor" }} fallbackLabel="护甲" />)

    await userEvent.click(screen.getByRole("button", { name: "查看自定义护甲来源" }))

    expect(screen.getByText("护甲值 未知")).toBeInTheDocument()
    expect(screen.getByText("重伤 未知")).toBeInTheDocument()
    expect(screen.getByText("严重 未知")).toBeInTheDocument()
    expect(screen.queryByText("护甲值 0")).not.toBeInTheDocument()
  })

  it("closes when clicking outside or pressing Escape", async () => {
    resetSheetStore()

    render(<EquipmentProviderAnchor slotRef={{ type: "armor" }} fallbackLabel="护甲" />)

    await userEvent.click(screen.getByRole("button", { name: "查看护甲来源" }))
    expect(screen.getByRole("dialog", { name: "护甲来源" })).toBeInTheDocument()

    await userEvent.click(document.body)
    expect(screen.queryByRole("dialog", { name: "护甲来源" })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "查看护甲来源" }))
    await userEvent.keyboard("{Escape}")
    expect(screen.queryByRole("dialog", { name: "护甲来源" })).not.toBeInTheDocument()
  })
})

describe("equipment provider section integration", () => {
  it("opens weapon provider panel without opening the weapon template modal", async () => {
    resetSheetStore({
      equipment: {
        ...defaultSheetData.equipment,
        weaponSlots: {
          ...defaultSheetData.equipment.weaponSlots,
          primary: {
            name: "阔剑",
            trait: "",
            damage: "",
            feature: "",
            modifierContributions: [],
          },
        },
      },
    })
    const onOpenWeaponModal = vi.fn()

    render(<WeaponSection isPrimary slotType="primary" onOpenWeaponModal={onOpenWeaponModal} />)

    const providerButton = screen.getByRole("button", { name: "查看阔剑来源" })
    expect(providerButton.closest("div")).not.toHaveClass("hidden")

    await userEvent.click(providerButton)

    expect(screen.getByRole("dialog", { name: "阔剑来源" })).toBeInTheDocument()
    expect(onOpenWeaponModal).not.toHaveBeenCalled()
  })

  it("switches inventory weapon slots with tabs and opens the selected slot provider panel", async () => {
    resetSheetStore({
      equipment: {
        ...defaultSheetData.equipment,
        weaponSlots: {
          ...defaultSheetData.equipment.weaponSlots,
          inventory: [
            {
              name: "备用短剑",
              trait: "",
              damage: "",
              feature: "",
              modifierContributions: [],
            },
            {
              name: "备用长弓",
              trait: "",
              damage: "",
              feature: "",
              modifierContributions: [],
            },
          ],
        },
      },
    })
    const onOpenWeaponModal = vi.fn()

    render(<InventoryWeaponSection index={0} onOpenWeaponModal={onOpenWeaponModal} />)

    expect(screen.getByRole("tab", { name: "备用武器 1" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("button", { name: "备用短剑" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "备用长弓" })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("tab", { name: "备用武器 2" }))

    expect(screen.getByRole("tab", { name: "备用武器 2" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("button", { name: "备用长弓" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "备用短剑" })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "备用长弓" }))
    expect(onOpenWeaponModal).toHaveBeenCalledWith({ slotType: "inventory", index: 1 })

    await userEvent.click(screen.getByRole("button", { name: "查看备用长弓来源" }))
    expect(screen.getByRole("dialog", { name: "备用长弓来源" })).toBeInTheDocument()
  })

  it("opens armor provider panel without opening the armor template modal", async () => {
    resetSheetStore({
      equipment: {
        ...defaultSheetData.equipment,
        armorSlot: {
          name: "锁子甲",
          baseArmorMax: 4,
          baseThresholds: { minor: 7, major: 15 },
          feature: "",
          modifierContributions: [],
        },
      },
    })
    const onOpenArmorModal = vi.fn()

    render(<ArmorSection onOpenArmorModal={onOpenArmorModal} />)

    await userEvent.click(screen.getByRole("button", { name: "查看锁子甲来源" }))

    expect(screen.getByRole("dialog", { name: "锁子甲来源" })).toBeInTheDocument()
    expect(onOpenArmorModal).not.toHaveBeenCalled()
  })
})
