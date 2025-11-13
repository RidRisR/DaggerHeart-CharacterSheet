"use client"

import { useState, useEffect } from "react"
import { useSheetStore } from "@/lib/sheet-store"
import { ChevronUp, X, Check } from "lucide-react"
import { isValidNumber, parseToNumber } from "@/lib/number-utils"

interface ExperienceValuesEditorProps {
  checkKey: string
  optionIndex: number
  toggleUpgradeCheckbox: (checkKey: string, index: number, checked: boolean) => void
  onClose?: () => void
}

export function ExperienceValuesEditor({
  checkKey,
  optionIndex,
  toggleUpgradeCheckbox,
  onClose
}: ExperienceValuesEditorProps) {
  const { sheetData } = useSheetStore()
  const updateExperienceValues = useSheetStore(state => state.updateExperienceValues)
  const createExperienceValuesSnapshot = useSheetStore(state => state.createExperienceValuesSnapshot)

  const experience = sheetData.experience || ["", "", "", "", ""]
  const experienceValues = sheetData.experienceValues || ["", "", "", "", ""]

  // 使用本地状态管理编辑
  const [localValues, setLocalValues] = useState<string[]>([...experienceValues])

  // 过滤出有内容的经历（不管是否有加值）
  const experiencesWithContent = experience
    .map((content, index) => ({
      index,
      content,
      value: localValues[index] || ""
    }))
    .filter(item => item.content !== "")

  const handleLocalChange = (index: number, value: string) => {
    const newValues = [...localValues]
    newValues[index] = value
    setLocalValues(newValues)
  }

  const handleIncrement = (index: number, currentValue: string) => {
    if (!isValidNumber(currentValue)) return

    const numValue = parseToNumber(currentValue, 0)
    const newValue = numValue + 1
    handleLocalChange(index, String(newValue))
  }

  const handleConfirm = () => {
    // 找出所有被修改的经历索引
    const modifiedIndices: number[] = []
    localValues.forEach((value, index) => {
      if (value !== experienceValues[index]) {
        modifiedIndices.push(index)
      }
    })

    // 如果有修改，创建快照
    if (modifiedIndices.length > 0) {
      createExperienceValuesSnapshot(modifiedIndices)

      // 应用所有更改到 store
      modifiedIndices.forEach(index => {
        updateExperienceValues(index, localValues[index])
      })
    }

    // 勾选复选框
    toggleUpgradeCheckbox(checkKey, optionIndex, true)

    // 关闭编辑器
    onClose?.()
  }

  return (
    <div className="w-40">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-700">经历加值 +1</span>
        <button
          onClick={onClose}
          className="p-0.5 hover:bg-gray-100 rounded transition-colors"
          title="关闭"
        >
          <X className="w-3 h-3 text-gray-500" />
        </button>
      </div>

      {experiencesWithContent.length === 0 ? (
        <div className="text-xs text-gray-500 py-2 text-center">
          暂无经历内容
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
            {experiencesWithContent.map(({ index, content, value }) => {
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
                      onChange={(e) => handleLocalChange(index, e.target.value)}
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

          <button
            onClick={handleConfirm}
            className="w-full py-1.5 px-3 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors flex items-center justify-center gap-1"
          >
            <Check className="w-3 h-3" />
            确认
          </button>
        </>
      )}
    </div>
  )
}
