"use client"

import { useState } from "react"
import { useSheetStore } from "@/lib/sheet-store"
import { X, ChevronUp, ChevronDown, Check } from "lucide-react"
import { safeEvaluateExpression } from "@/lib/number-utils"
import { showFadeNotification } from "@/components/ui/fade-notification"

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

  const handleDecrement = () => {
    // 支持表达式：先计算当前值，然后 -1
    const currentValue = safeEvaluateExpression(localValue)
    const newValue = currentValue - 1
    setLocalValue(String(newValue))
  }

  const handleIncrement = () => {
    // 支持表达式：先计算当前值，然后 +1
    const currentValue = safeEvaluateExpression(localValue)
    const newValue = currentValue + 1
    setLocalValue(String(newValue))
  }

  const handleConfirm = () => {
    // 保存用户输入的字面字符串（可能是表达式如 "17+4"）
    const trimmedValue = localValue.trim()

    // 空字符串则不保存
    if (!trimmedValue) {
      setLocalValue(String(currentEvasion))
      return
    }

    // 直接保存用户输入的字符串，不做计算
    const finalValue = trimmedValue

    // 如果值发生了变化，创建快照
    if (finalValue !== currentEvasion) {
      createEvasionSnapshot(finalValue)
      setSheetData({ evasion: finalValue })

      // 显示成功通知
      showFadeNotification({
        message: `闪避值已更新为 ${finalValue}`,
        type: "success",
        position: "middle"
      })
    }

    // 勾选复选框
    toggleUpgradeCheckbox(checkKey, optionIndex, true)

    // 关闭编辑器
    onClose?.()
  }

  // 向上箭头仅在当前值可计算时启用
  const canIncrement = localValue.trim() !== ''

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
        <button
          onClick={handleDecrement}
          disabled={!canIncrement}
          className="w-6 h-6 flex items-center justify-center bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          title="计算当前值 -1"
        >
          <ChevronDown className="w-3 h-3" />
        </button>

        <button
          onClick={handleIncrement}
          disabled={!canIncrement}
          className="w-6 h-6 flex items-center justify-center bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          title="计算当前值 +1"
        >
          <ChevronUp className="w-3 h-3" />
        </button>

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
          className="w-16 px-2 py-1 text-center text-sm font-bold border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          placeholder="0"
        />
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
