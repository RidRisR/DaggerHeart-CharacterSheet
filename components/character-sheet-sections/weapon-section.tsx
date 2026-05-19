"use client"

import type React from "react"
import { useState } from "react"
import { useSheetStore } from "@/lib/sheet-store"
import { EquipmentProviderAnchor } from "@/components/modifiers/equipment-provider-popover"
import { ContentEditableField } from "@/components/ui/content-editable-field"
import type { WeaponSlot } from "@/automation/equipment/types"

interface WeaponSectionProps {
  isPrimary?: boolean
  slotType: "primary" | "secondary"
  onOpenWeaponModal: (selection: { slotType: "primary" | "secondary" }) => void;
}

export function WeaponSection({
  isPrimary = false,
  slotType,
  onOpenWeaponModal,
}: WeaponSectionProps) {
  const { sheetData: formData, updateActiveWeaponSlot } = useSheetStore()
  const [isEditingName, setIsEditingName] = useState(false)
  const slot = formData.equipment.weaponSlots[slotType]

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    updateWeaponSlot({ [name]: value } as Partial<WeaponSlot>)
  }

  const updateWeaponSlot = (updates: Partial<WeaponSlot>) => {
    updateActiveWeaponSlot(slotType, updates)
  }

  const openWeaponModal = () => {
    onOpenWeaponModal({ slotType })
  }

  const handleEditName = () => {
    setIsEditingName(true)
  }

  const handleNameChange = (value: string) => {
    updateWeaponSlot({ name: value })
  }

  const handleNameSubmit = () => {
    setIsEditingName(false)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSubmit()
    }
  }


  return (
    <div className="mb-2.5">
      <h4 className="flex items-center gap-1 font-bold text-[10px] bg-gray-800 text-white p-1 rounded-t-md">
        <span>{isPrimary ? "主武器" : "副武器"}</span>
        <EquipmentProviderAnchor
          slotRef={{ type: "weapon", slot: slotType }}
          fallbackLabel={isPrimary ? "主武器" : "副武器"}
          size="compact"
        />
      </h4>
      <div className="grid grid-cols-10 gap-1 -mt-0.5">
        <div className="col-span-4">
          <label className="text-[8px] text-gray-600">名称</label>
          {isEditingName ? (
            <input
              type="text"
              value={slot.name ?? ""}
              onChange={(e) => handleNameChange(e.target.value)}
              onKeyDown={handleNameKeyDown}
              onBlur={handleNameSubmit}
              className="w-full border border-gray-400 rounded p-0.5 h-6 text-sm px-2 bg-white focus:outline-none focus:border-blue-500"
              autoFocus
            />
          ) : (
            <div className="group flex w-full border border-gray-400 rounded h-6 bg-white overflow-hidden">
              <button
                type="button"
                onClick={openWeaponModal}
                className="flex-1 text-sm text-left px-2 py-0.5 hover:bg-gray-50 focus:outline-none"
              >
                {slot.name || <span className="print:hidden">选择武器</span>}
              </button>
              <div className="w-px bg-gray-300 hidden group-hover:block"></div>
              <button
                type="button"
                onClick={handleEditName}
                className="w-8 hidden group-hover:flex items-center justify-center hover:bg-gray-50 focus:outline-none print:hidden"
                title="编辑名称"
              >
                <svg className="w-3 h-3 text-gray-500" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M11.498 1.5a.5.5 0 0 1 .707 0l2.295 2.295a.5.5 0 0 1 0 .707l-9.435 9.435a.5.5 0 0 1-.354.146H1.5a.5.5 0 0 1-.5-.5v-3.211a.5.5 0 0 1 .146-.354L10.582 1.5h.916zm-1 2.207-8.646 8.646v2.36h2.36l8.647-8.647L10.498 3.707z" />
                </svg>
              </button>
            </div>
          )}
        </div>
        <div className="col-span-3">
          <label className="text-[8px] text-gray-600">基本信息</label>
          <input
            type="text"
            name="trait"
            value={slot.trait ?? ""}
            onChange={handleInputChange}
            className="w-full border-b border-gray-400 focus:outline-none print-empty-hide text-sm"
          />
        </div>
        <div className="col-span-3">
          <label className="text-[8px] text-gray-600">伤害骰</label>
          <input
            type="text"
            name="damage"
            value={slot.damage ?? ""}
            onChange={handleInputChange}
            className="w-full border-b border-gray-400 focus:outline-none print-empty-hide text-sm"
          />
        </div>
      </div>
      <div className="mt-1">
        <ContentEditableField
          name="feature"
          value={slot.feature ?? ""}
          onChange={handleInputChange}
          placeholder=""
          maxLines={2}
        />
      </div>
    </div>
  )
}
