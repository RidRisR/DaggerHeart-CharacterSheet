"use client"

import React, { useState, useRef, useEffect } from "react"
import { Trash2 } from "lucide-react"
import type { NotebookTextLine } from "@/lib/sheet-data"

interface TextLineProps {
  line: NotebookTextLine
  lineHeight: number
  onUpdate: (updates: Partial<NotebookTextLine>) => void
  onDelete: () => void
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}

export function TextLine({ line, lineHeight, onUpdate, onDelete, dragHandleProps }: TextLineProps) {
  const label = line.label || '笔记'  // 兼容旧数据
  const [isEditingLabel, setIsEditingLabel] = useState(false)
  const [editLabel, setEditLabel] = useState(label)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const labelInputRef = useRef<HTMLInputElement>(null)

  // 聚焦标签输入框
  useEffect(() => {
    if (isEditingLabel && labelInputRef.current) {
      labelInputRef.current.focus()
      labelInputRef.current.select()
    }
  }, [isEditingLabel])

  // 自动调整高度（确保是 lineHeight 的整数倍）
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = textareaRef.current.scrollHeight
      // 向上取整到 lineHeight 的整数倍
      const lines = Math.max(1, Math.ceil(scrollHeight / lineHeight))
      textareaRef.current.style.height = `${lines * lineHeight}px`
    }
  }, [line.content, lineHeight])

  // 保存标签
  const handleSaveLabel = () => {
    onUpdate({ label: editLabel || '笔记' })
    setIsEditingLabel(false)
  }

  // 计算内容行数
  const contentLines = textareaRef.current
    ? Math.max(1, Math.ceil(textareaRef.current.scrollHeight / lineHeight))
    : 1

  return (
    <div
      className="flex flex-col relative"
      style={{ minHeight: lineHeight * 2 }}
    >
      {/* 拖拽区域 - 红线左侧的整个区域 */}
      <div
        {...dragHandleProps}
        className="absolute -left-8 top-0 bottom-0 w-6 cursor-grab hover:bg-amber-100/30 transition-colors"
        title="拖拽排序"
      />

      {/* 标题行：标题 + 删除按钮 */}
      <div className="flex items-center gap-2" style={{ height: lineHeight }}>
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
                setEditLabel(label)
                setIsEditingLabel(false)
              }
            }}
            className="text-xs font-medium text-gray-700 min-w-[48px] px-1 py-0.5 border border-amber-400 rounded bg-white outline-none"
          />
        ) : (
          <span
            onClick={() => {
              setEditLabel(label)
              setIsEditingLabel(true)
            }}
            className="text-xs font-medium text-gray-700 min-w-[48px] cursor-text hover:bg-amber-50 px-1 py-0.5 rounded transition-colors"
            title="点击编辑名称"
          >
            {label}
          </span>
        )}

        {/* 删除按钮 - 推到最右侧 */}
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all ml-auto"
          title="删除此行"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 内容区域 */}
      <div style={{ minHeight: lineHeight }}>
        <textarea
          ref={textareaRef}
          value={line.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          placeholder="输入文本..."
          maxLength={500}
          className="w-full bg-transparent border-none outline-none resize-none text-gray-800 placeholder-gray-400"
          style={{
            fontSize: '14px',
            lineHeight: `${lineHeight}px`,
            minHeight: lineHeight,
            padding: 0,
            margin: 0,
            display: 'block',
            fontFamily: 'inherit',
          }}
          rows={1}
        />
      </div>
    </div>
  )
}
