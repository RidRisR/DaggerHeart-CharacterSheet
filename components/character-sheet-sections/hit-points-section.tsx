"use client"

import type React from "react"
import type { SheetData } from "@/lib/sheet-data"

interface HitPointsSectionProps {
  formData: SheetData
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  handleMaxChange: (field: keyof SheetData, value: string) => void
  renderBoxes: (field: keyof SheetData, max: number, total: number) => React.ReactElement
}

export function HitPointsSection({ formData, handleInputChange, handleMaxChange, renderBoxes }: HitPointsSectionProps) {
  return (
    <div className="py-1 mb-0">
      <h3 className="text-xs font-bold text-center mb-1">生命值与压力</h3>

      <div className="flex justify-between items-center mb-1 gap-1">
        <div className="bg-gray-800 text-white text-[9px] p-1 text-center rounded-md flex-1">
          <div>轻度伤害</div>
          <div className="text-[8px] mt-0.5 text-gray-300">Mark 1 HP</div>
        </div>
        <input
          type="text"
          name="minorThreshold"
          value={formData.minorThreshold}
          onChange={handleInputChange}
          className="w-10 text-center text-sm border border-gray-400 rounded mx-1 print-empty-hide"
        />
        <div className="bg-gray-800 text-white text-[9px] p-1 text-center rounded-md flex-1">
          <div>重度伤害</div>
          <div className="text-[8px] mt-0.5 text-gray-300">Mark 2 HP</div>
        </div>
        <input
          type="text"
          name="majorThreshold"
          value={formData.majorThreshold}
          onChange={handleInputChange}
          className="w-10 text-center text-sm border border-gray-400 rounded mx-1 print-empty-hide"
        />
        <div className="bg-gray-800 text-white text-[9px] p-1 text-center rounded-md flex-1">
          <div>严重伤害</div>
          <div className="text-[8px] mt-0.5 text-gray-300">Mark 3 HP</div>
        </div>
      </div>

      <div className="mb-1">
        <div className="flex items-center justify-between">
          <span className="font-bold mr-2 text-xs">HP</span>
          <div className="flex items-center">
            <span className="text-[9px] mr-1 print:hidden">最大值:</span> {/* 打印时隐藏 */}
            <input
              type="number"
              min="1"
              max="18"
              value={formData.hpMax || 6} // 默认值为6
              onChange={(e) => handleMaxChange("hpMax" as keyof SheetData, e.target.value)}
              className="w-8 text-center border border-gray-400 rounded text-xs print:hidden" // 打印时隐藏
            />
          </div>
        </div>
        {renderBoxes("hp" as keyof SheetData, Number(formData.hpMax || 6), 18)}

        <div className="flex items-center justify-between mt-1">
          <span className="font-bold mr-2 text-xs">压力</span>
          <div className="flex items-center">
            <span className="text-[9px] mr-1 print:hidden">最大值:</span> {/* 打印时隐藏 */}
            <input
              type="number"
              min="1"
              max="12"
              value={formData.stressMax || 6} // 默认值为6
              onChange={(e) => handleMaxChange("stressMax" as keyof SheetData, e.target.value)}
              className="w-8 text-center border border-gray-400 rounded text-xs print:hidden" // 打印时隐藏
            />
          </div>
        </div>
        {renderBoxes("stress" as keyof SheetData, Number(formData.stressMax || 6), 18)}
      </div>
    </div>
  )
}
