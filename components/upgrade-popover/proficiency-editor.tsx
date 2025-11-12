"use client"

import { X } from "lucide-react"
import { useSheetStore } from "@/lib/sheet-store"

interface ProficiencyEditorProps {
  onClose?: () => void
}

export function ProficiencyEditor({ onClose }: ProficiencyEditorProps) {
  const { sheetData } = useSheetStore()
  const updateProficiency = useSheetStore(state => state.updateProficiency)

  // 获取当前熟练度数组
  const proficiency = Array.isArray(sheetData.proficiency) ? sheetData.proficiency : []

  // 计算当前有多少个熟练度标记（从前往后数有多少个true）
  const currentCount = proficiency.filter(v => v === true).length

  const handleClick = (index: number) => {
    updateProficiency(index)
  }

  return (
    <div className="w-40">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-700">熟练度 ({currentCount}/6)</span>
        <button
          onClick={onClose}
          className="p-0.5 hover:bg-gray-100 rounded transition-colors"
          title="关闭"
        >
          <X className="w-2.5 h-2.5 text-gray-500" />
        </button>
      </div>

      <div className="flex gap-1">
        {Array(6).fill(null).map((_, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            className={`w-5 h-5 rounded-full border-2 border-gray-800 transition-colors ${
              proficiency[i] ? "bg-gray-800" : "bg-white hover:bg-gray-200"
            }`}
            title={`熟练度 ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
