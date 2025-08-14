"use client"

import type React from "react"
import { useAutoResizeFont } from "@/hooks/use-auto-resize-font"
import { useSheetStore } from "@/lib/sheet-store"

interface WeaponSectionProps {
  isPrimary?: boolean
  fieldPrefix: string
  onOpenWeaponModal: (fieldName: string, slotType: "primary" | "secondary" | "inventory") => void;
}

export function WeaponSection({
  isPrimary = false,
  fieldPrefix,
  onOpenWeaponModal,
}: WeaponSectionProps) {
  const { sheetData: formData, setSheetData } = useSheetStore()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setSheetData((prev) => ({ ...prev, [name]: value }))
  }

  const openWeaponModal = (fieldName: string, slotType: "primary" | "secondary" | "inventory") => {
    onOpenWeaponModal(fieldName, slotType)
  }

  const { getElementProps } = useAutoResizeFont({
    maxFontSize: 14,
    minFontSize: 10
  })

  const nameField = `${fieldPrefix}Name`
  const traitField = `${fieldPrefix}Trait`
  const damageField = `${fieldPrefix}Damage`
  const featureField = `${fieldPrefix}Feature`

  return (
    <div className="mb-2 print:mb-3">
      <h4 className="font-bold text-[10px] bg-gray-800 text-white p-1 rounded-t-md">
        {isPrimary ? "主武器" : "副武器"}
      </h4>
      <div className="grid grid-cols-3 gap-1 mt-1">
        <div className="col-span-1">
          <label className="text-[8px] text-gray-600">名称</label>
          <button
            type="button"
            onClick={() => openWeaponModal(nameField, isPrimary ? "primary" : "secondary")}
            className="header-selection-button print-hide-selection-text printable-selection-button w-full border border-gray-400 rounded p-0.5 h-6 text-sm text-left px-2 bg-white"
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
            {...getElementProps((formData as any)[traitField] || "", `${fieldPrefix}-trait`)}
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
            {...getElementProps((formData as any)[damageField] || "", `${fieldPrefix}-damage`)}
            className="w-full border-b border-gray-400 focus:outline-none print-empty-hide"
          />
        </div>
      </div>
      <div className="mt-1">
        <label className="text-[8px] text-gray-600">特性</label>
        <input
          type="text"
          name={featureField}
          value={(formData as any)[featureField]}
          onChange={handleInputChange}
          {...getElementProps((formData as any)[featureField] || "", `${fieldPrefix}-feature`)}
          className="w-full border-b border-gray-400 focus:outline-none print-empty-hide"
        />
      </div>
    </div>
  )
}
