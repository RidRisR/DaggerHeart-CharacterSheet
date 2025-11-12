"use client"

import { useState, useEffect } from "react"
import { useSheetStore } from "@/lib/sheet-store"
import { ChevronUp, X } from "lucide-react"
import { isValidNumber, parseToNumber } from "@/lib/number-utils"

interface HPMaxEditorProps {
  onClose?: () => void
}

export function HPMaxEditor({ onClose }: HPMaxEditorProps) {
  const { sheetData } = useSheetStore()
  const updateHPMax = useSheetStore(state => state.updateHPMax)
  const currentHPMax = sheetData.hpMax ?? 6
  const [inputValue, setInputValue] = useState(String(currentHPMax))

  // 同步外部变化
  useEffect(() => {
    setInputValue(String(currentHPMax))
  }, [currentHPMax])

  const handleInputChange = (value: string) => {
    // 允许任意输入,不做限制
    setInputValue(value)
  }

  const handleBlur = () => {
    // 失焦时应用更改
    if (isValidNumber(inputValue)) {
      const numValue = parseToNumber(inputValue, 6)
      const finalValue = Math.min(Math.max(numValue, 1), 18)
      updateHPMax(finalValue)
      setInputValue(String(finalValue))
    } else {
      // 如果不是有效数字,恢复到当前值
      setInputValue(String(currentHPMax))
    }
  }

  const handleIncrement = () => {
    if (!isValidNumber(inputValue)) return

    const currentValue = parseToNumber(inputValue, currentHPMax)
    const newValue = Math.min(currentValue + 1, 18)

    setInputValue(String(newValue))
    updateHPMax(newValue)
  }

  // 判断是否可以增加
  const canIncrement = isValidNumber(inputValue) && parseToNumber(inputValue, 0) < 18

  return (
    <div className="w-24">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-700">HP上限</span>
        <button
          onClick={onClose}
          className="p-0.5 hover:bg-gray-100 rounded transition-colors"
          title="关闭"
        >
          <X className="w-3 h-3 text-gray-500" />
        </button>
      </div>

      <div className="flex items-center gap-1">
        <input
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleBlur()
            }
          }}
          className="w-10 px-1 py-1 text-center text-sm font-bold border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        />

        <button
          onClick={handleIncrement}
          disabled={!canIncrement}
          className="w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          title={!isValidNumber(inputValue) ? "当前输入不是有效数字" : "增加生命值上限 (+1)"}
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
