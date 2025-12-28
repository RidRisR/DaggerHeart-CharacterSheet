"use client"

import type React from "react"
import { useState } from "react"
import { useSheetStore } from "@/lib/sheet-store"
import { ContentEditableField } from "@/components/ui/content-editable-field"

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
  const [isEditingName, setIsEditingName] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setSheetData((prev) => ({ ...prev, [name]: value }))
  }

  const openWeaponModal = (fieldName: string, slotType: "primary" | "secondary" | "inventory") => {
    onOpenWeaponModal(fieldName, slotType)
  }

  const handleEditName = () => {
    setIsEditingName(true)
  }

  const handleNameChange = (value: string) => {
    setSheetData((prev) => ({ ...prev, [nameField]: value }))
  }

  const handleNameSubmit = () => {
    setIsEditingName(false)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSubmit()
    }
  }


  const nameField = `${fieldPrefix}Name`
  const traitField = `${fieldPrefix}Trait`
  const damageField = `${fieldPrefix}Damage`
  const featureField = `${fieldPrefix}Feature`

  return (
    <div className="mb-2.5">
      <h4 className="font-bold text-[10px] bg-gray-800 text-white p-1 rounded-t-md">
        {isPrimary ? "主武器" : "副武器"}
      </h4>
      <div className="grid grid-cols-10 gap-1 -mt-0.5">
        <div className="col-span-4">
          <label className="text-[8px] text-gray-600">名称</label>
          {isEditingName ? (
            <input
              type="text"
              value={(formData as any)[nameField] || ""}
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
                onClick={() => openWeaponModal(nameField, isPrimary ? "primary" : "secondary")}
                className="flex-1 text-sm text-left px-2 py-0.5 hover:bg-gray-50 focus:outline-none"
              >
                {(formData as any)[nameField] || <span className="print:hidden">选择武器</span>}
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
            name={traitField}
            value={(formData as any)[traitField] || ""}
            onChange={handleInputChange}
            className="w-full border-b border-gray-400 focus:outline-none print-empty-hide text-sm"
          />
        </div>
        <div className="col-span-3">
          <label className="text-[8px] text-gray-600">伤害骰</label>
          <input
            type="text"
            name={damageField}
            value={(formData as any)[damageField] || ""}
            onChange={handleInputChange}
            className="w-full border-b border-gray-400 focus:outline-none print-empty-hide text-sm"
          />
        </div>
      </div>
      <div className="mt-1">
        <ContentEditableField
          name={featureField}
          value={(formData as any)[featureField] || ""}
          onChange={handleInputChange}
          placeholder=""
          maxLines={2}
        />
      </div>
    </div>
  )
}
