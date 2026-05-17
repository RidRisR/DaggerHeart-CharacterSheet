import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { EquipmentProviderAnchor } from "@/components/modifiers/equipment-provider-popover"
import type { EquipmentModifierContribution } from "@/lib/equipment/types"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { resetSheetStore, sheet } from "../automation/test-helpers"

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
