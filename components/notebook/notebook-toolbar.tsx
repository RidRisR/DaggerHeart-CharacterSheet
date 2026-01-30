"use client"

import React from "react"
import { Type, Hash, Dices } from "lucide-react"

interface NotebookToolbarProps {
  onAddText: () => void
  onAddCounter: () => void
  onAddDice: () => void
  disabled?: boolean
}

export function NotebookToolbar({ onAddText, onAddCounter, onAddDice, disabled }: NotebookToolbarProps) {
  const buttonClass = disabled
    ? "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors text-gray-400 cursor-not-allowed"
    : "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors hover:bg-amber-100 text-amber-900"

  return (
    <div
      className="flex items-center justify-center gap-2 px-3 py-2 border-t"
      style={{
        borderColor: '#D7CCC8',
        backgroundColor: 'rgba(253, 246, 227, 0.8)',
      }}
    >
      {disabled && (
        <span className="text-[10px] text-gray-400 mr-2">已达上限</span>
      )}
      <button
        onClick={onAddText}
        disabled={disabled}
        className={buttonClass}
        title={disabled ? "已达每页上限" : "添加文本行"}
      >
        <Type className="w-3.5 h-3.5" />
        <span>文本</span>
      </button>
      <button
        onClick={onAddCounter}
        disabled={disabled}
        className={buttonClass}
        title={disabled ? "已达每页上限" : "添加计数器"}
      >
        <Hash className="w-3.5 h-3.5" />
        <span>计数器</span>
      </button>
      <button
        onClick={onAddDice}
        disabled={disabled}
        className={buttonClass}
        title={disabled ? "已达每页上限" : "添加骰子"}
      >
        <Dices className="w-3.5 h-3.5" />
        <span>骰子</span>
      </button>
    </div>
  )
}
