"use client"

import React from "react"
import { Type, Hash, Dices } from "lucide-react"

interface NotebookToolbarProps {
  onAddText: () => void
  onAddCounter: () => void
  onAddDice: () => void
}

export function NotebookToolbar({ onAddText, onAddCounter, onAddDice }: NotebookToolbarProps) {
  return (
    <div
      className="flex items-center justify-center gap-2 px-3 py-2 border-t"
      style={{
        borderColor: '#D7CCC8',
        backgroundColor: 'rgba(253, 246, 227, 0.8)',
      }}
    >
      <button
        onClick={onAddText}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors hover:bg-amber-100 text-amber-900"
        title="添加文本行"
      >
        <Type className="w-3.5 h-3.5" />
        <span>文本</span>
      </button>
      <button
        onClick={onAddCounter}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors hover:bg-amber-100 text-amber-900"
        title="添加计数器"
      >
        <Hash className="w-3.5 h-3.5" />
        <span>计数器</span>
      </button>
      <button
        onClick={onAddDice}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors hover:bg-amber-100 text-amber-900"
        title="添加骰子"
      >
        <Dices className="w-3.5 h-3.5" />
        <span>骰子</span>
      </button>
    </div>
  )
}
