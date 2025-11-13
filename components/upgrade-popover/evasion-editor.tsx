"use client"

import { useState } from "react"
import { useSheetStore } from "@/lib/sheet-store"
import { X, ChevronUp, Check } from "lucide-react"
import { isValidNumber, parseToNumber } from "@/lib/number-utils"

interface EvasionEditorProps {
  checkKey: string
  optionIndex: number
  toggleUpgradeCheckbox: (checkKey: string, index: number, checked: boolean) => void
  onClose?: () => void
}

export function EvasionEditor({
  checkKey,
  optionIndex,
  toggleUpgradeCheckbox,
  onClose
}: EvasionEditorProps) {
  const { sheetData, setSheetData } = useSheetStore()
  const createEvasionSnapshot = useSheetStore(state => state.createEvasionSnapshot)

  const currentEvasion = sheetData.evasion ?? "0"

  // 使用本地状态管理编辑
  const [localValue, setLocalValue] = useState(String(currentEvasion))

  const handleLocalChange = (value: string) => {
    setLocalValue(value)
  }

  const handleIncrement = () => {
    if (!isValidNumber(localValue)) return

    const currentValue = parseToNumber(localValue, 0)
    const newValue = currentValue + 1
    setLocalValue(String(newValue))
  }

  const handleConfirm = () => {
    // 验证输入
    if (!isValidNumber(localValue)) {
      // 如果不是有效数字，恢复到当前值
      setLocalValue(String(currentEvasion))
      return
    }

    const numValue = parseToNumber(localValue, 0)
    const finalValue = String(numValue)

    // 如果值发生了变化，创建快照
    if (finalValue !== currentEvasion) {
      createEvasionSnapshot(finalValue)
      setSheetData({ evasion: finalValue })
    }

    // 勾选复选框
    toggleUpgradeCheckbox(checkKey, optionIndex, true)

    // 关闭编辑器
    onClose?.()
  }

  // 判断是否可以增加
  const canIncrement = isValidNumber(localValue)

  return (
    <div className="w-32">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-700">闪避值 +1</span>
        <button
          onClick={onClose}
          className="p-0.5 hover:bg-gray-100 rounded transition-colors"
          title="关闭"
        >
          <X className="w-3 h-3 text-gray-500" />
        </button>
      </div>

      <div className="flex items-center gap-1 mb-3">
        <input
          type="text"
          inputMode="numeric"
          value={localValue}
          onChange={(e) => handleLocalChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleConfirm()
            }
          }}
          className="w-20 px-2 py-1 text-center text-sm font-bold border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          placeholder="0"
        />

        <button
          onClick={handleIncrement}
          disabled={!canIncrement}
          className="w-7 h-7 flex items-center justify-center bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          title={!isValidNumber(localValue) ? "当前输入不是有效数字" : "增加闪避值 (+1)"}
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>

      <button
        onClick={handleConfirm}
        className="w-full py-1.5 px-3 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors flex items-center justify-center gap-1"
      >
        <Check className="w-3 h-3" />
        确认
      </button>
    </div>
  )
}
