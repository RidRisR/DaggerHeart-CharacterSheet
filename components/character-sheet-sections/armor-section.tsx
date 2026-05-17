"use client"

import type React from "react"
import { useState } from "react"
import { useAutoResizeFont } from "@/hooks/use-auto-resize-font"
import { useSheetStore } from "@/lib/sheet-store"
import { EquipmentProviderAnchor } from "@/components/modifiers/equipment-provider-popover"
import { ContentEditableField } from "@/components/ui/content-editable-field"
import { formatArmorThreshold } from "@/lib/equipment/armor-utils"
import type { ArmorSlot } from "@/lib/equipment/types"

interface ArmorSectionProps {
  onOpenArmorModal: () => void;
}

export function ArmorSection({ onOpenArmorModal }: ArmorSectionProps) {
  const { sheetData: formData, setSheetData, updateArmorBaseThresholds, updateArmorBaseMax } = useSheetStore()
  const [isEditingName, setIsEditingName] = useState(false)
  const armorSlot = formData.equipment.armorSlot
  const baseArmorMaxValue = armorSlot.baseArmorMax === null ? "" : String(armorSlot.baseArmorMax)
  const baseThresholdsValue = formatArmorThreshold(armorSlot.baseThresholds)

  const updateArmorSlot = (updates: Partial<ArmorSlot>) => {
    setSheetData((prev) => ({
      equipment: {
        ...prev.equipment,
        armorSlot: {
          ...prev.equipment.armorSlot,
          ...updates,
        },
      },
    }))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name === 'baseThresholds') {
      // 使用新的护甲阈值更新函数，自动计算伤害阈值
      updateArmorBaseThresholds(value)
    } else if (name === 'baseArmorMax') {
      // 使用新的护甲值更新函数，同步更新属性栏的护甲值
      updateArmorBaseMax(value)
    } else if (name === 'feature') {
      updateArmorSlot({ feature: value })
    } else {
      setSheetData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const openArmorModal = () => {
    onOpenArmorModal()
  }

  const handleEditName = () => {
    setIsEditingName(true)
  }

  const handleNameChange = (value: string) => {
    updateArmorSlot({ name: value })
  }

  const handleNameSubmit = () => {
    setIsEditingName(false)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSubmit()
    }
  }

  const { getElementProps } = useAutoResizeFont({
    maxFontSize: 14,
    minFontSize: 10
  })

  return (
    <div>
      <h4 className="flex items-center justify-between font-bold text-[10px] bg-gray-800 text-white p-1 rounded-t-md">
        <span>护甲</span>
        <EquipmentProviderAnchor
          slotRef={{ type: "armor" }}
          fallbackLabel="护甲"
          size="compact"
        />
      </h4>
      <div className="grid grid-cols-10 gap-1 -mt-0.5">
        <div className="col-span-4">
          <label className="text-[8px] text-gray-600">名称</label>
          {isEditingName ? (
            <input
              type="text"
              value={armorSlot.name || ""}
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
                onClick={openArmorModal}
                className="flex-1 text-sm text-left px-2 py-0.5 hover:bg-gray-50 focus:outline-none"
              >
                {armorSlot.name || <span className="print:hidden">选择护甲</span>}
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
          <label className="text-[8px] text-gray-600">护甲值</label>
          <input
            type="text"
            name="baseArmorMax"
            value={baseArmorMaxValue}
            onChange={handleInputChange}
            {...getElementProps(baseArmorMaxValue, "armor-base-score")}
            className="w-full border-b border-gray-400 focus:outline-none print-empty-hide"
          />
        </div>
        <div className="col-span-3">
          <label className="text-[8px] text-gray-600">阈值</label>
          <input
            type="text"
            name="baseThresholds"
            value={baseThresholdsValue}
            onChange={handleInputChange}
            {...getElementProps(baseThresholdsValue, "armor-threshold")}
            className="w-full border-b border-gray-400 focus:outline-none print-empty-hide"
          />
        </div>
      </div>
      <div className="mt-1">
        <ContentEditableField
          name="feature"
          value={armorSlot.feature || ""}
          onChange={handleInputChange}
          placeholder=""
          maxLines={2}
        />
      </div>
    </div>
  )
}
