"use client"

import { useState } from "react"
import { useSheetStore } from "@/lib/sheet-store"
import { ChevronUp, X, Check } from "lucide-react"
import { isValidNumber, parseToNumber } from "@/lib/number-utils"

interface ExperienceValuesEditorProps {
  checkKey: string
  optionIndex: number
  toggleUpgradeCheckbox: (checkKey: string, index: number, checked: boolean) => void
  onClose?: () => void
}

interface ExperienceItem {
  index: number
  content: string
  originalValue: string
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

  // 过滤出有内容的经历
  const availableExperiences: ExperienceItem[] = experience
    .map((content, index) => ({
      index,
      content,
      originalValue: experienceValues[index] || ""
    }))
    .filter(item => item.content !== "")

  // 选择状态：记录被选中的经历索引
  const [selected, setSelected] = useState<Set<number>>(new Set())

  // 编辑中的值：只记录被选中的经历的值
  const [editingValues, setEditingValues] = useState<Record<number, string>>({})

  const selectedCount = selected.size

  const handleToggle = (index: number) => {
    const newSelected = new Set(selected)

    if (newSelected.has(index)) {
      // 取消选择：从 selected 和 editingValues 中移除
      newSelected.delete(index)
      setEditingValues(prev => {
        const newValues = { ...prev }
        delete newValues[index]
        return newValues
      })
    } else {
      // 选择：如果已选2个，不允许再选
      if (selectedCount >= 2) return

      newSelected.add(index)
      // 初始化编辑值为原始值
      setEditingValues(prev => ({
        ...prev,
        [index]: experienceValues[index] || ""
      }))
    }

    setSelected(newSelected)
  }

  const handleValueChange = (index: number, value: string) => {
    setEditingValues(prev => ({ ...prev, [index]: value }))
  }

  const handleIncrement = (index: number) => {
    const currentValue = editingValues[index] || ""
    if (!isValidNumber(currentValue)) return

    const numValue = parseToNumber(currentValue, 0)
    const newValue = numValue + 1
    setEditingValues(prev => ({ ...prev, [index]: String(newValue) }))
  }

  const handleConfirm = () => {
    // 找出所有被修改的经历索引
    const modifiedIndices: number[] = []

    selected.forEach(index => {
      const newValue = editingValues[index] || ""
      const oldValue = experienceValues[index] || ""

      if (newValue !== oldValue) {
        modifiedIndices.push(index)
      }
    })

    // 如果有修改，创建快照
    if (modifiedIndices.length > 0) {
      createExperienceValuesSnapshot(modifiedIndices)

      // 应用所有更改到 store
      modifiedIndices.forEach(index => {
        updateExperienceValues(index, editingValues[index])
      })
    }

    // 勾选复选框
    toggleUpgradeCheckbox(checkKey, optionIndex, true)

    // 关闭编辑器
    onClose?.()
  }

  // 检查是否可以应用：必须选择2项
  const canApply = selectedCount === 2

  return (
    <div className="w-48">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-700">经历加值升级</span>
        <button
          onClick={onClose}
          className="p-0.5 hover:bg-gray-100 rounded transition-colors"
          title="关闭"
        >
          <X className="w-3 h-3 text-gray-500" />
        </button>
      </div>

      <div className="text-xs text-gray-600 mb-2">
        <strong>选择并修改</strong>两项经历加值 ({selectedCount}/2)
      </div>

      {availableExperiences.length === 0 ? (
        <div className="text-xs text-gray-500 py-4 text-center bg-gray-50 rounded border border-gray-200">
          暂无经历内容
        </div>
      ) : availableExperiences.length < 2 ? (
        <div className="text-xs text-gray-500 py-4 text-center bg-gray-50 rounded border border-gray-200">
          需要至少2项经历
        </div>
      ) : (
        <>
          <div className="space-y-1 mb-3 max-h-64 overflow-y-auto">
            {availableExperiences.map(({ index, content, originalValue }) => {
              const isSelected = selected.has(index)
              const isDisabled = selectedCount >= 2 && !isSelected
              const displayValue = isSelected ? (editingValues[index] || "") : originalValue

              return (
                <div
                  key={index}
                  onClick={() => !isDisabled && handleToggle(index)}
                  className={`
                    flex items-center justify-between px-2 py-1.5 rounded border transition-colors
                    ${isDisabled
                      ? "bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed"
                      : "bg-white border-gray-300 cursor-pointer hover:bg-gray-50"
                    }
                    ${isSelected ? "!border-blue-500 !bg-blue-100 hover:!bg-blue-100" : ""}
                  `}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs text-gray-700 truncate" title={content}>
                      {content}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {isSelected && isValidNumber(displayValue) && (
                      <button
                        onClick={() => handleIncrement(index)}
                        className="w-6 h-6 flex items-center justify-center bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        title="增加经历加值 (+1)"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                    )}
                    <input
                      type="text"
                      value={displayValue}
                      onChange={(e) => handleValueChange(index, e.target.value)}
                      disabled={!isSelected}
                      className={`
                        w-14 px-1 py-0.5 text-xs text-center border rounded
                        ${isSelected
                          ? "bg-white border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          : "bg-gray-50 border-gray-200 text-gray-600"
                        }
                      `}
                      placeholder="+0"
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={handleConfirm}
            disabled={!canApply}
            className="w-full py-2 text-xs font-semibold rounded bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
          >
            <Check className="w-3 h-3" />
            应用升级
          </button>
        </>
      )}
    </div>
  )
}
