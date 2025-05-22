"use client"

import type React from "react"

interface InventoryWeaponSectionProps {
  formData: any
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  openWeaponModal: (fieldName: string, slotType: "primary" | "secondary" | "inventory") => void
  handleBooleanChange: (fieldName: string) => void // Added this line
  index: number
}

export function InventoryWeaponSection({
  formData,
  handleInputChange,
  openWeaponModal,
  handleBooleanChange, // Added this line
  index,
}: InventoryWeaponSectionProps) {
  const nameField = `inventoryWeapon${index}Name`
  const traitField = `inventoryWeapon${index}Trait`
  const damageField = `inventoryWeapon${index}Damage`
  const featureField = `inventoryWeapon${index}Feature`
  const primaryField = `inventoryWeapon${index}Primary`
  const secondaryField = `inventoryWeapon${index}Secondary`

  return (
    <div className="py-1 mb-2">
      <h3 className="text-xs font-bold text-center mb-1">INVENTORY WEAPON {index}</h3>

      <div className="grid grid-cols-3 gap-1">
        <div className="col-span-1">
          <label className="text-[8px] text-gray-600">NAME</label>
          <button
            type="button"
            onClick={() => openWeaponModal(`inventoryWeapons.${index}.name`, "inventory")}
            className="printable-selection-button w-full border border-gray-400 rounded p-0.5 h-6 text-[10px] text-left px-2 bg-white"
          >
            {formData[nameField] || "选择武器"}
          </button>
        </div>
        <div className="col-span-1">
          <label className="text-[8px] text-gray-600">TRAIT & RANGE</label>
          <input
            type="text"
            name={traitField}
            value={formData[traitField]}
            onChange={handleInputChange}
            className="w-full border-b border-gray-400 focus:outline-none text-[10px] print-empty-hide"
          />
        </div>
        <div className="col-span-1">
          <label className="text-[8px] text-gray-600">DAMAGE DICE</label>
          <input
            type="text"
            name={damageField}
            value={formData[damageField]}
            onChange={handleInputChange}
            className="w-full border-b border-gray-400 focus:outline-none text-[10px] print-empty-hide"
          />
        </div>
      </div>

      <div className="mt-1">
        <label className="text-[8px] text-gray-600">FEATURE</label>
        <input
          type="text"
          name={featureField}
          value={formData[featureField]}
          onChange={handleInputChange}
          className="w-full border-b border-gray-400 focus:outline-none text-[10px] print-empty-hide"
        />
      </div>

      <div className="flex gap-4 mt-1">
        <div className="flex items-center">
          <input
            type="checkbox"
            id={primaryField}
            checked={!!formData[primaryField]} // Ensure value is boolean
            onChange={() => handleBooleanChange(primaryField)}
            className="mr-1 h-3 w-3"
          />
          <label htmlFor={primaryField} className="text-[8px]">
            Set as Primary
          </label>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id={secondaryField}
            checked={!!formData[secondaryField]} // Ensure value is boolean
            onChange={() => handleBooleanChange(secondaryField)}
            className="mr-1 h-3 w-3"
          />
          <label htmlFor={secondaryField} className="text-[8px]">
            Set as Secondary
          </label>
        </div>
      </div>
    </div>
  )
}
