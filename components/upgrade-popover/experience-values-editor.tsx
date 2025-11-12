"use client"

import { useSheetStore } from "@/lib/sheet-store"
import { ChevronUp, X } from "lucide-react"
import { isValidNumber, parseToNumber } from "@/lib/number-utils"

interface ExperienceValuesEditorProps {
  onClose?: () => void
}

export function ExperienceValuesEditor({ onClose }: ExperienceValuesEditorProps) {
  const { sheetData } = useSheetStore()
  const updateExperienceValues = useSheetStore(state => state.updateExperienceValues)

  const experience = sheetData.experience || ["", "", "", "", ""]
  const experienceValues = sheetData.experienceValues || ["", "", "", "", ""]

  // 过滤出有加值且有内容的经历
  const experiencesWithValues = experience
    .map((content, index) => ({
      index,
      content,
      value: experienceValues[index] || ""
    }))
    .filter(item => item.value !== "" && item.content !== "")

  const handleIncrement = (index: number, currentValue: string) => {
    if (!isValidNumber(currentValue)) return

    const numValue = parseToNumber(currentValue, 0)
    const newValue = numValue + 1
    updateExperienceValues(index, String(newValue))
  }

  return (
    <div className="w-32">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-700">经历加值</span>
        <button
          onClick={onClose}
          className="p-0.5 hover:bg-gray-100 rounded transition-colors"
          title="关闭"
        >
          <X className="w-3 h-3 text-gray-500" />
        </button>
      </div>

      {experiencesWithValues.length === 0 ? (
        <div className="text-xs text-gray-500 py-2 text-center">
          暂无经历加值
        </div>
      ) : (
        <div className="space-y-2">
          {experiencesWithValues.map(({ index, content, value }) => {
            const canIncrement = isValidNumber(value)

            return (
              <div key={index} className="space-y-0.5">
                <div className="text-xs text-gray-600 truncate" title={content}>
                  {content}
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => updateExperienceValues(index, e.target.value)}
                    className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    placeholder="加值"
                  />
                  <button
                    onClick={() => handleIncrement(index, value)}
                    disabled={!canIncrement}
                    className="w-6 h-6 flex items-center justify-center bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    title={!canIncrement ? "当前输入不是有效数字" : "增加经历加值 (+1)"}
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
