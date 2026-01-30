"use client"

import React, { useState } from "react"
import { Trash2, Minus, Plus, Settings } from "lucide-react"
import type { NotebookCounterLine } from "@/lib/sheet-data"

interface CounterLineProps {
  line: NotebookCounterLine
  lineHeight: number
  onUpdate: (updates: Partial<NotebookCounterLine>) => void
  onDelete: () => void
}

export function CounterLine({ line, lineHeight, onUpdate, onDelete }: CounterLineProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editLabel, setEditLabel] = useState(line.label)
  const [editMax, setEditMax] = useState(line.max.toString())

  // 生成方块数组
  const boxes = Array(line.max).fill(false).map((_, i) => i < line.current)

  // 点击方块切换状态
  const handleBoxClick = (index: number) => {
    const lastCheckedIndex = boxes.lastIndexOf(true)
    if (lastCheckedIndex === index) {
      // 点击最后一个已填充方块，全部清空
      onUpdate({ current: 0 })
    } else {
      // 填充到点击位置
      onUpdate({ current: index + 1 })
    }
  }

  // 保存编辑
  const handleSave = () => {
    const newMax = Math.max(1, Math.min(18, parseInt(editMax) || 6))
    onUpdate({
      label: editLabel || '计数器',
      max: newMax,
      current: Math.min(line.current, newMax)
    })
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div
        className="flex items-center gap-2 py-1"
        style={{ minHeight: lineHeight }}
      >
        <input
          type="text"
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
          className="flex-1 px-2 py-0.5 text-xs border border-gray-300 rounded bg-white"
          placeholder="标签名称"
          autoFocus
        />
        <input
          type="number"
          value={editMax}
          onChange={(e) => setEditMax(e.target.value)}
          className="w-12 px-2 py-0.5 text-xs border border-gray-300 rounded bg-white text-center"
          min={1}
          max={18}
        />
        <button
          onClick={handleSave}
          className="px-2 py-0.5 text-xs bg-amber-600 text-white rounded hover:bg-amber-700"
        >
          确定
        </button>
        <button
          onClick={() => setIsEditing(false)}
          className="px-2 py-0.5 text-xs text-gray-500 hover:text-gray-700"
        >
          取消
        </button>
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-2 py-1"
      style={{ minHeight: lineHeight }}
    >
      {/* 标签 */}
      <span className="text-xs font-medium text-gray-700 min-w-[48px]">
        {line.label}
      </span>

      {/* 增减按钮 */}
      <button
        onClick={() => onUpdate({ current: Math.max(0, line.current - 1) })}
        disabled={line.current <= 0}
        className="w-5 h-5 flex items-center justify-center text-gray-500 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Minus className="w-3 h-3" />
      </button>

      {/* 方块显示 */}
      <div className="flex gap-0.5 flex-wrap">
        {boxes.map((isChecked, i) => (
          <div
            key={i}
            onClick={() => handleBoxClick(i)}
            className={`w-4 h-4 border-2 cursor-pointer transition-colors ${
              isChecked
                ? 'bg-amber-800 border-amber-800'
                : 'bg-white border-amber-800 hover:bg-amber-100'
            } ${i > 0 && i % 6 === 0 ? 'ml-0.5' : ''}`}
          />
        ))}
      </div>

      {/* 增加按钮 */}
      <button
        onClick={() => onUpdate({ current: Math.min(line.max, line.current + 1) })}
        disabled={line.current >= line.max}
        className="w-5 h-5 flex items-center justify-center text-gray-500 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Plus className="w-3 h-3" />
      </button>

      {/* 数值显示 */}
      <span className="text-xs text-gray-500 ml-1">
        {line.current}/{line.max}
      </span>

      {/* 编辑按钮 */}
      <button
        onClick={() => {
          setEditLabel(line.label)
          setEditMax(line.max.toString())
          setIsEditing(true)
        }}
        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition-all"
        title="编辑计数器"
      >
        <Settings className="w-3 h-3" />
      </button>

      {/* 删除按钮 */}
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
        title="删除此行"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
