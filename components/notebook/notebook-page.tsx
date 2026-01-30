"use client"

import React, { useState, useCallback } from "react"
import type { NotebookPage as NotebookPageType, NotebookLine } from "@/lib/sheet-data"
import { TextLine } from "./lines/text-line"
import { CounterLine } from "./lines/counter-line"
import { DiceLine } from "./lines/dice-line"

interface NotebookPageProps {
  page: NotebookPageType
  onUpdateLine: (lineId: string, updates: Partial<NotebookLine>) => void
  onDeleteLine: (lineId: string) => void
  onReorderLines: (fromIndex: number, toIndex: number) => void
}

export function NotebookPage({ page, onUpdateLine, onDeleteLine, onReorderLines }: NotebookPageProps) {
  // 蓝色横线背景样式
  const lineHeight = 28 // 行高

  // 拖拽状态
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // 拖拽开始
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index)
  }, [])

  // 拖拽结束
  const handleDragEnd = useCallback(() => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      onReorderLines(draggedIndex, dragOverIndex)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [draggedIndex, dragOverIndex, onReorderLines])

  // 拖拽经过
  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && index !== draggedIndex) {
      setDragOverIndex(index)
    }
  }, [draggedIndex])

  // 拖拽离开
  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null)
  }, [])

  // 创建拖拽手柄属性
  const createDragHandleProps = (index: number) => ({
    draggable: true,
    onDragStart: () => handleDragStart(index),
    onDragEnd: handleDragEnd,
  })

  return (
    <div
      className="relative min-h-[260px] pl-8 pr-3 py-2"
      style={{
        // 蓝色横线背景
        backgroundImage: `repeating-linear-gradient(
          transparent,
          transparent ${lineHeight - 1}px,
          #B3D4E8 ${lineHeight - 1}px,
          #B3D4E8 ${lineHeight}px
        )`,
        backgroundPosition: '0 0',
      }}
    >
      {page.lines.length === 0 ? (
        <div
          className="text-gray-400 text-sm italic select-none"
          style={{ lineHeight: `${lineHeight}px` }}
        >
          点击下方按钮添加内容...
        </div>
      ) : (
        <div className="space-y-0">
          {page.lines.map((line, index) => (
            <div
              key={line.id}
              className={`group relative transition-all duration-150 ${
                draggedIndex === index ? 'opacity-50' : ''
              } ${
                dragOverIndex === index ? 'border-t-2 border-amber-500' : ''
              }`}
              style={{ minHeight: lineHeight }}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
            >
              {line.type === 'text' && (
                <TextLine
                  line={line}
                  lineHeight={lineHeight}
                  onUpdate={(updates) => onUpdateLine(line.id, updates)}
                  onDelete={() => onDeleteLine(line.id)}
                />
              )}
              {line.type === 'counter' && (
                <CounterLine
                  line={line}
                  lineHeight={lineHeight}
                  onUpdate={(updates) => onUpdateLine(line.id, updates)}
                  onDelete={() => onDeleteLine(line.id)}
                  dragHandleProps={createDragHandleProps(index)}
                />
              )}
              {line.type === 'dice' && (
                <DiceLine
                  line={line}
                  lineHeight={lineHeight}
                  onUpdate={(updates) => onUpdateLine(line.id, updates)}
                  onDelete={() => onDeleteLine(line.id)}
                  dragHandleProps={createDragHandleProps(index)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
