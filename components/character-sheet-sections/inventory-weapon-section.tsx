"use client"

import type React from "react"
import type { SheetData } from "@/lib/sheet-data"
import { useAutoResizeFont } from "@/hooks/use-auto-resize-font"

interface InventoryWeaponSectionProps {
  formData: SheetData
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  openWeaponModal: (fieldName: string, slotType: "primary" | "secondary" | "inventory") => void
  handleBooleanChange: (field: keyof SheetData) => void
  index: number
}

export function InventoryWeaponSection({
  formData,
  handleInputChange,
  openWeaponModal,
  handleBooleanChange,
  index,
}: InventoryWeaponSectionProps) {
  const { getElementProps } = useAutoResizeFont({
    maxFontSize: 14,
    minFontSize: 10
  })

  const nameField = `inventoryWeapon${index}Name`
  const traitField = `inventoryWeapon${index}Trait`
  const damageField = `inventoryWeapon${index}Damage`
  const featureField = `inventoryWeapon${index}Feature`
  const primaryField = `inventoryWeapon${index}Primary`
  const secondaryField = `inventoryWeapon${index}Secondary`

  return (
    <div className="py-1 mb-1">

      <div className="grid grid-cols-3 gap-1">
        <div className="col-span-1">
          <label className="text-[8px] text-gray-600">名称</label>
          <button
            type="button"
            onClick={() => openWeaponModal(nameField, "inventory")}
            className="printable-selection-button w-full border border-gray-400 rounded p-0.5 h-6 text-sm text-left px-2 bg-white" // Changed text-[10px] to text-sm
          >
            {(formData as any)[nameField] || "选择武器"}
          </button>
        </div>
        <div className="col-span-1">
          <label className="text-[8px] text-gray-600">基本信息</label>
          <input
            type="text"
            name={traitField}
            value={(formData as any)[traitField]}
            onChange={handleInputChange}
            {...getElementProps((formData as any)[traitField] || "", `inventory-weapon-${index}-trait`)}
            className="w-full border-b border-gray-400 focus:outline-none print-empty-hide"
          />
        </div>
        <div className="col-span-1">
          <label className="text-[8px] text-gray-600">伤害骰</label>
          <input
            type="text"
            name={damageField}
            value={(formData as any)[damageField]}
            onChange={handleInputChange}
            {...getElementProps((formData as any)[damageField] || "", `inventory-weapon-${index}-damage`)}
            className="w-full border-b border-gray-400 focus:outline-none print-empty-hide"
          />
        </div>
      </div>

      <div className="mt-1">
        <label className="text-[8px] text-gray-600">特征</label>
        <input
          type="text"
          name={featureField}
          value={(formData as any)[featureField]}
          onChange={handleInputChange}
          {...getElementProps((formData as any)[featureField] || "", `inventory-weapon-${index}-feature`)}
          className="w-full border-b border-gray-400 focus:outline-none print-empty-hide"
        />
      </div>

      <div className="flex gap-4 mt-1">
        <div className="flex items-center">
          <input
            type="checkbox"
            id={primaryField}
            checked={!!(formData as any)[primaryField]} // Ensure value is boolean
            onChange={() => handleBooleanChange(primaryField as keyof SheetData)}
            className="mr-1 h-3 w-3"
          />
          <label htmlFor={primaryField} className="text-[8px]">
            设为主手
          </label>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id={secondaryField}
            checked={!!(formData as any)[secondaryField]} // Ensure value is boolean
            onChange={() => handleBooleanChange(secondaryField as keyof SheetData)}
            className="mr-1 h-3 w-3"
          />
          <label htmlFor={secondaryField} className="text-[8px]">
            设为副手
          </label>
        </div>
      </div>
    </div>
  )
}
