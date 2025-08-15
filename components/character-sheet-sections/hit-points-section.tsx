"use client"

import type React from "react"
import { useSheetStore } from "@/lib/sheet-store"

export function HitPointsSection() {
  const { sheetData: formData, setSheetData } = useSheetStore()
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setSheetData((prev) => ({ ...prev, [name]: value }))
  }

  const handleMaxChange = (field: "hp" | "stress", value: string) => {
    const maxField = `${field}Max` as "hpMax" | "stressMax"
    const currentField = field
    const intValue = parseInt(value) || 0

    setSheetData((prev) => {
      const newSheetData = { ...prev, [maxField]: intValue }
      const currentArray = (newSheetData[currentField] as boolean[]) || []
      const checkedCount = currentArray.filter(Boolean).length

      if (checkedCount > intValue) {
        const newArray = Array(currentArray.length).fill(false)
        for (let i = 0; i < intValue; i++) {
          newArray[i] = true
        }
        newSheetData[currentField] = newArray
      }

      return newSheetData
    })
  }

  const renderBoxes = (field: "hp" | "stress", max: number, total: number) => {
    const fieldArray = Array.isArray(formData[field]) ? (formData[field] as boolean[]) : Array(total).fill(false)

    const handleClick = (index: number) => {
      const newFieldData = [...fieldArray]
      const lastCheckedIndex = fieldArray.lastIndexOf(true)

      if (lastCheckedIndex === index) {
        // If clicking the last checked box, uncheck all
        for (let i = 0; i < newFieldData.length; i++) {
          newFieldData[i] = false
        }
      } else {
        // Otherwise, check up to the clicked box
        for (let i = 0; i < newFieldData.length; i++) {
          newFieldData[i] = i <= index
        }
      }
      setSheetData((prev) => ({ ...prev, [field]: newFieldData }))
    }

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
                    handleClick(i)
                  }
                }}
              />
            )
          })}
      </div>
    )
  }
  return (
    <div className="py-1 mb-1">
      <h3 className="text-xs font-bold text-center mb-2.5 print:mb-2">生命值与压力</h3>

      <div className="flex justify-between items-center mb-2 gap-1">
        <div className="bg-gray-800 text-white text-[10px] p-1 text-center rounded-md flex-1">
          <div>轻度伤害</div>
          <div className="text-[8px] mt-0.5 text-gray-300">Mark 1 HP</div>
        </div>
        <input
          type="text"
          name="minorThreshold"
          value={formData.minorThreshold}
          onChange={handleInputChange}
          placeholder={
            formData.armorThreshold && formData.level
              ? (() => {
                const thresholds = formData.armorThreshold.split('/')
                const minorThreshold = thresholds[0]?.trim()
                return minorThreshold ? String(Number(minorThreshold) + Number(formData.level)) : ""
              })()
              : "NaN"
          }
          className="w-10 text-center text-m border border-gray-400 rounded mx-1 placeholder-gray-400 print-empty-hide"
        />
        <div className="bg-gray-800 text-white text-[10px] p-1 text-center rounded-md flex-1">
          <div>重度伤害</div>
          <div className="text-[8px] mt-0.5 text-gray-300">Mark 2 HP</div>
        </div>
        <input
          type="text"
          name="majorThreshold"
          value={formData.majorThreshold}
          onChange={handleInputChange}
          placeholder={
            formData.armorThreshold && formData.level
              ? (() => {
                const thresholds = formData.armorThreshold.split('/')
                const majorThreshold = thresholds[1]?.trim()
                return majorThreshold ? String(Number(majorThreshold) + Number(formData.level)) : ""
              })()
              : "NaN"
          }
          className="w-10 text-center text-m border border-gray-400 rounded mx-1 placeholder-gray-400 print-empty-hide"
        />
        <div className="bg-gray-800 text-white text-[10px] p-1 text-center rounded-md flex-1">
          <div>严重伤害</div>
          <div className="text-[8px] mt-0.5 text-gray-300">Mark 3 HP</div>
        </div>
      </div>

      <div className="mt-2.5 space-y-1.5 print:space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-bold mr-2 text-xs">
            HP
            {formData.cards?.[0]?.professionSpecial?.["起始生命"] && (
              <span className="text-[10px] text-gray-600 ml-1">
                (职业初始: {formData.cards?.[0]?.professionSpecial?.["起始生命"] ?? "未知"})
              </span>
            )}
          </span>
          <div className="flex items-center">
            <span className="text-[9px] mr-1 print:hidden">最大值:</span> {/* 打印时隐藏 */}
            <input
              type="number"
              min="1"
              max="18"
              value={formData.hpMax || 6} // 默认值为职业起始生命或6
              onChange={(e) => handleMaxChange("hp", e.target.value)}
              className="w-8 text-center border border-gray-400 rounded text-xs print:hidden" // 打印时隐藏
            />
          </div>
        </div>
        {renderBoxes("hp", Number(formData.hpMax || formData.cards?.[0]?.professionSpecial?.["起始生命"] || 6), 18)}

        <div className="flex items-center justify-between">
          <span className="font-bold mr-2 text-xs">压力</span>
          <div className="flex items-center">
            <span className="text-[9px] mr-1 print:hidden">最大值:</span> {/* 打印时隐藏 */}
            <input
              type="number"
              min="1"
              max="12"
              value={formData.stressMax || 6} // 默认值为6
              onChange={(e) => handleMaxChange("stress", e.target.value)}
              className="w-8 text-center border border-gray-400 rounded text-xs print:hidden" // 打印时隐藏
            />
          </div>
        </div>
        {renderBoxes("stress", Number(formData.stressMax || 6), 18)}
      </div>
    </div>
  )
}
