"use client"

import { useState } from "react"
import { useSheetStore } from "@/lib/sheet-store"
import { X, Check } from "lucide-react"
import { showFadeNotification } from "@/components/ui/fade-notification"

interface ExperienceValuesEditorProps {
  checkKey: string
  optionIndex: number
  toggleUpgradeCheckbox: (checkKey: string, index: number, checked: boolean) => void
  onClose?: () => void
}

interface ExperienceItem {
  index: number
  content: string
}

export function ExperienceValuesEditor({
  checkKey,
  optionIndex,
  toggleUpgradeCheckbox,
  onClose
}: ExperienceValuesEditorProps) {
  const { sheetData } = useSheetStore()

  const experience = sheetData.experience || ["", "", "", "", ""]
  // 过滤出有内容的经历
  const availableExperiences: ExperienceItem[] = experience
    .map((content, index) => ({
      index,
      content,
    }))
    .filter(item => item.content !== "")

  // 选择状态：记录被选中的经历索引
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const selectedCount = selected.size

  const handleToggle = (index: number) => {
    const newSelected = new Set(selected)

    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      // 选择：如果已选2个，不允许再选
      if (selectedCount >= 2) return

      newSelected.add(index)
    }

    setSelected(newSelected)
  }

  const handleConfirm = () => {
    const setAutomationSelection = useSheetStore.getState().setAutomationSelection
    setAutomationSelection(`upgrade:${checkKey}`, true, {
      experienceIndexes: Array.from(selected),
    })

    showFadeNotification({
      message: `已记录 ${selected.size} 项经历升级`,
      type: "success",
      position: "middle"
    })

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
        选择两项已有经历 ({selectedCount}/2)
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
            {availableExperiences.map(({ index, content }) => {
              const isSelected = selected.has(index)
              const isDisabled = selectedCount >= 2 && !isSelected

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
                  <div className="flex items-center gap-1 flex-shrink-0 text-xs text-gray-500">
                    {isSelected && (
                      <span className="font-medium text-blue-700">已选择</span>
                    )}
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
