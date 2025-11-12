"use client"

import { useState, useEffect } from "react"
import { useSheetStore } from "@/lib/sheet-store"
import { X, ChevronUp } from "lucide-react"
import { isValidNumber, parseToNumber } from "@/lib/number-utils"

interface DodgeEditorProps {
  onClose?: () => void
  tier?: string
  optionIndex?: number
  boxIndex?: number
  handleUpgradeCheck?: (tier: string, index: number) => void
}

export function DodgeEditor({ onClose, tier, optionIndex, boxIndex, handleUpgradeCheck }: DodgeEditorProps) {
  const { sheetData, setSheetData } = useSheetStore()
  const currentDodge = sheetData.dodge ?? "0"
  const [inputValue, setInputValue] = useState(String(currentDodge))

  // 同步外部变化
  useEffect(() => {
    setInputValue(String(currentDodge))
  }, [currentDodge])

  const handleClose = () => {
    onClose?.()
  }

  const handleInputChange = (value: string) => {
    // 允许任意输入，不做限制
    setInputValue(value)
  }

  const handleBlur = () => {
    // 失焦时应用更改
    if (isValidNumber(inputValue)) {
      const numValue = parseToNumber(inputValue, 0)
      setSheetData({ dodge: String(numValue) })
      setInputValue(String(numValue))
    } else {
      // 如果不是有效数字，恢复到当前值
      setInputValue(String(currentDodge))
    }
  }

  const handleIncrement = () => {
    if (!isValidNumber(inputValue)) return

    const currentValue = parseToNumber(inputValue, 0)
    const newValue = currentValue + 1

    setInputValue(String(newValue))
    setSheetData({ dodge: String(newValue) })
  }

  // 判断是否可以增加
  const canIncrement = isValidNumber(inputValue)

  return (
    <div className="w-24">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-700">闪避值</span>
        <button
          onClick={handleClose}
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
          title={!isValidNumber(inputValue) ? "当前输入不是有效数字" : "增加闪避值 (+1)"}
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
