"use client"

import type React from "react"
import { useSheetStore } from "@/lib/sheet-store"

export function HitPointsSection() {
  const { sheetData: formData, setSheetData } = useSheetStore()
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setSheetData((prev) => ({ ...prev, [name]: value }))
  }

  const handleMaxChange = (field: string, value: string) => {
    setSheetData((prev) => ({ ...prev, [field]: parseInt(value) || 0 }))
  }

  const renderBoxes = (field: string, max: number, total: number) => {
    const fieldArray = Array.isArray((formData as any)[field]) ? ((formData as any)[field] as boolean[]) : Array(total).fill(false)
    
    return (
      <div className="flex gap-1 flex-wrap">
        {Array(total)
          .fill(0)
          .map((_, i) => {
            const isWithinMax = i < max
            const isChecked = fieldArray[i] || false
            
            return (
              <div
                key={`${String(field)}-${i}`}
                className={`w-4 h-4 border-2 ${
                  isWithinMax ? "border-gray-800 cursor-pointer" : "border-gray-400 border-dashed"
                } ${isChecked ? "bg-gray-800" : "bg-white"}`}
                onClick={() => {
                  if (isWithinMax) {
                    setSheetData((prev) => {
                      const newFieldData = [...((prev as any)[field] as boolean[])]
                      newFieldData[i] = !newFieldData[i]
                      return { ...prev, [field]: newFieldData }
                    })
                  }
                }}
              />
            )
          })}
      </div>
    )
  }
  return (
    <div className="py-1 mb-2">
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
              onChange={(e) => handleMaxChange("hpMax", e.target.value)}
              className="w-8 text-center border border-gray-400 rounded text-xs print:hidden" // 打印时隐藏
            />
          </div>
        </div>
        {renderBoxes("hp", Number(formData.hpMax || 6), 18)}

        <div className="flex items-center justify-between mt-1">
          <span className="font-bold mr-2 text-xs">压力</span>
          <div className="flex items-center">
            <span className="text-[9px] mr-1 print:hidden">最大值:</span> {/* 打印时隐藏 */}
            <input
              type="number"
              min="1"
              max="12"
              value={formData.stressMax || 6} // 默认值为6
              onChange={(e) => handleMaxChange("stressMax", e.target.value)}
              className="w-8 text-center border border-gray-400 rounded text-xs print:hidden" // 打印时隐藏
            />
          </div>
        </div>
        {renderBoxes("stress", Number(formData.stressMax || 6), 18)}
      </div>
    </div>
  )
}
