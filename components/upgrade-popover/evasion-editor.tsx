"use client"

import { useSheetStore } from "@/lib/sheet-store"
import { X, Check } from "lucide-react"
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
  const handleConfirm = () => {
    const setAutomationSelection = useSheetStore.getState().setAutomationSelection
    setAutomationSelection(`upgrade:${checkKey}`, true, { target: "evasion" })

    showFadeNotification({
      message: "闪避值升级已记录",
      type: "success",
      position: "middle"
    })

    // 勾选复选框
    toggleUpgradeCheckbox(checkKey, optionIndex, true)

    // 关闭编辑器
    onClose?.()
  }

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
