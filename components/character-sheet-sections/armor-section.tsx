"use client"

import type React from "react"
import { useAutoResizeFont } from "@/hooks/use-auto-resize-font"
import { useSheetStore } from "@/lib/sheet-store"

interface ArmorSectionProps {
  onOpenArmorModal: () => void;
}

export function ArmorSection({ onOpenArmorModal }: ArmorSectionProps) {
  const { sheetData: formData, setSheetData } = useSheetStore()
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setSheetData((prev) => ({ ...prev, [name]: value }))
  }

  const openArmorModal = () => {
    onOpenArmorModal()
  }

  const { getElementProps } = useAutoResizeFont({
    maxFontSize: 14,
    minFontSize: 10
  })

  return (
    <div className="mb-2">
      <h4 className="font-bold text-[10px] bg-gray-800 text-white p-1 rounded-md">护甲</h4>
      <div className="grid grid-cols-3 gap-1 mt-1">
        <div className="col-span-1">
          <label className="text-[8px] text-gray-600">名称</label>
          <button
            type="button"
            onClick={openArmorModal}
            className="header-selection-button print-hide-selection-text printable-selection-button w-full border border-gray-400 rounded p-0.5 h-6 text-sm text-left px-2 bg-white"
          >
            {formData.armorName || "选择护甲"}
          </button>
        </div>
        <div className="col-span-1">
          <label className="text-[8px] text-gray-600">护甲值</label>
          <input
            type="text"
            name="armorBaseScore"
            value={formData.armorBaseScore}
            onChange={handleInputChange}
            {...getElementProps(formData.armorBaseScore || "", "armor-base-score")}
            className="w-full border-b border-gray-400 focus:outline-none print-empty-hide"
          />
        </div>
        <div className="col-span-1">
          <label className="text-[8px] text-gray-600">阈值</label>
          <input
            type="text"
            name="armorThreshold"
            value={formData.armorThreshold}
            onChange={handleInputChange}
            {...getElementProps(formData.armorThreshold || "", "armor-threshold")}
            className="w-full border-b border-gray-400 focus:outline-none print-empty-hide"
          />
        </div>
      </div>
      <div className="mt-1">
        <label className="text-[8px] text-gray-600">特性</label>
        <input
          type="text"
          name="armorFeature"
          value={formData.armorFeature}
          onChange={handleInputChange}
          {...getElementProps(formData.armorFeature || "", "armor-feature")}
          className="w-full border-b border-gray-400 focus:outline-none print-empty-hide"
        />
      </div>
    </div>
  )
}
