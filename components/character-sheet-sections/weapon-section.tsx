"use client"

import type React from "react"

interface WeaponSectionProps {
  formData: any
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  openWeaponModal: (fieldName: string) => void
  isPrimary?: boolean
  fieldPrefix: string
}

export function WeaponSection({
  formData,
  handleInputChange,
  openWeaponModal,
  isPrimary = false,
  fieldPrefix,
}: WeaponSectionProps) {
  const nameField = `${fieldPrefix}Name`
  const traitField = `${fieldPrefix}Trait`
  const damageField = `${fieldPrefix}Damage`
  const featureField = `${fieldPrefix}Feature`

  return (
    <div className="mb-2">
      <h4 className="font-bold text-[10px] bg-gray-800 text-white p-1 rounded-md">
        {isPrimary ? "PRIMARY" : "SECONDARY"}
      </h4>
      <div className="grid grid-cols-3 gap-1 mt-1">
        <div className="col-span-1">
          <label className="text-[8px] text-gray-600">NAME</label>
          <button
            type="button"
            onClick={() => openWeaponModal(nameField)}
            className="header-selection-button print-hide-selection-text w-full border border-gray-400 rounded p-0.5 h-6 text-[10px] text-left px-2 bg-white"
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
    </div>
  )
}
