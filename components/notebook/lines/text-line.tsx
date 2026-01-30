"use client"

import React, { useRef, useEffect } from "react"
import { Trash2 } from "lucide-react"
import type { NotebookTextLine } from "@/lib/sheet-data"

interface TextLineProps {
  line: NotebookTextLine
  lineHeight: number
  onUpdate: (updates: Partial<NotebookTextLine>) => void
  onDelete: () => void
}

export function TextLine({ line, lineHeight, onUpdate, onDelete }: TextLineProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 自动调整高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const newHeight = Math.max(lineHeight, textareaRef.current.scrollHeight)
      textareaRef.current.style.height = `${newHeight}px`
    }
  }, [line.content, lineHeight])

  return (
    <div className="flex items-start gap-1">
      <textarea
        ref={textareaRef}
        value={line.content}
        onChange={(e) => onUpdate({ content: e.target.value })}
        placeholder="输入文本..."
        className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-gray-800 placeholder-gray-400"
        style={{
          lineHeight: `${lineHeight}px`,
          minHeight: lineHeight,
          padding: 0,
          fontFamily: 'inherit',
        }}
        rows={1}
      />
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
