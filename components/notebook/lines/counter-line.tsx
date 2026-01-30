"use client"

import React, { useState, useRef, useEffect } from "react"
import { Trash2, Minus, Plus, GripVertical } from "lucide-react"
import type { NotebookCounterLine } from "@/lib/sheet-data"

interface CounterLineProps {
  line: NotebookCounterLine
  lineHeight: number
  onUpdate: (updates: Partial<NotebookCounterLine>) => void
  onDelete: () => void
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}

export function CounterLine({ line, lineHeight, onUpdate, onDelete, dragHandleProps }: CounterLineProps) {
  const [isEditingLabel, setIsEditingLabel] = useState(false)
  const [isEditingMax, setIsEditingMax] = useState(false)
  const [editLabel, setEditLabel] = useState(line.label)
  const [editMax, setEditMax] = useState(line.max.toString())
  const labelInputRef = useRef<HTMLInputElement>(null)
  const maxInputRef = useRef<HTMLInputElement>(null)

  // 聚焦输入框
  useEffect(() => {
    if (isEditingLabel && labelInputRef.current) {
      labelInputRef.current.focus()
      labelInputRef.current.select()
    }
  }, [isEditingLabel])

  useEffect(() => {
    if (isEditingMax && maxInputRef.current) {
      maxInputRef.current.focus()
      maxInputRef.current.select()
    }
  }, [isEditingMax])

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

  // 保存标签编辑
  const handleSaveLabel = () => {
    onUpdate({ label: editLabel || '计数器' })
    setIsEditingLabel(false)
  }

  // 保存最大值编辑
  const handleSaveMax = () => {
    const newMax = Math.max(1, Math.min(12, parseInt(editMax) || 6))
    onUpdate({
      max: newMax,
      current: Math.min(line.current, newMax)
    })
    setEditMax(newMax.toString())
    setIsEditingMax(false)
  }

  return (
    <div
      className="flex flex-col gap-1 py-2"
      style={{ minHeight: Math.max(lineHeight * 2, 48) }}
    >
      {/* 标题行：拖拽手柄 + 标题 + 最大值 + 删除按钮 */}
      <div className="flex items-center gap-2">
        {/* 拖拽手柄 */}
        <div
          {...dragHandleProps}
          className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        {/* 标签 - 点击可编辑 */}
        {isEditingLabel ? (
          <input
            ref={labelInputRef}
            type="text"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={handleSaveLabel}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveLabel()
              if (e.key === 'Escape') {
                setEditLabel(line.label)
                setIsEditingLabel(false)
              }
            }}
            className="text-xs font-medium text-gray-700 min-w-[48px] px-1 py-0.5 border border-amber-400 rounded bg-white outline-none"
          />
        ) : (
          <span
            onClick={() => {
              setEditLabel(line.label)
              setIsEditingLabel(true)
            }}
            className="text-xs font-medium text-gray-700 min-w-[48px] cursor-text hover:bg-amber-50 px-1 py-0.5 rounded transition-colors"
            title="点击编辑名称"
          >
            {line.label}
          </span>
        )}

        {/* 最大值编辑 */}
        <span className="text-xs text-gray-500 flex items-center">
          (最大:
          {isEditingMax ? (
            <input
              ref={maxInputRef}
              type="number"
              value={editMax}
              onChange={(e) => setEditMax(e.target.value)}
              onBlur={handleSaveMax}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveMax()
                if (e.key === 'Escape') {
                  setEditMax(line.max.toString())
                  setIsEditingMax(false)
                }
              }}
              className="w-8 text-center text-xs border border-amber-400 rounded bg-white outline-none mx-0.5"
              min={1}
              max={12}
            />
          ) : (
            <span
              onClick={() => {
                setEditMax(line.max.toString())
                setIsEditingMax(true)
              }}
              className="cursor-text hover:bg-amber-50 px-1 rounded transition-colors"
              title="点击编辑最大值"
            >
              {line.max}
            </span>
          )}
          )
        </span>

        {/* 删除按钮 */}
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
          title="删除此行"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 计数器区域 - 占据整行 */}
      <div className="flex items-center gap-2 pl-5">
        {/* 减少按钮 */}
        <button
          onClick={() => onUpdate({ current: Math.max(0, line.current - 1) })}
          disabled={line.current <= 0}
          className="w-5 h-5 flex items-center justify-center text-gray-500 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Minus className="w-3 h-3" />
        </button>

        {/* 方块显示 - 每6个一组 */}
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: Math.ceil(line.max / 6) }).map((_, groupIndex) => (
            <div key={groupIndex} className="flex gap-0.5">
              {boxes.slice(groupIndex * 6, (groupIndex + 1) * 6).map((isChecked, i) => (
                <div
                  key={groupIndex * 6 + i}
                  onClick={() => handleBoxClick(groupIndex * 6 + i)}
                  className={`w-4 h-4 border-2 cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-amber-800 border-amber-800'
                      : 'bg-white border-amber-800 hover:bg-amber-100'
                  }`}
                />
              ))}
            </div>
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
      </div>
    </div>
  )
}
