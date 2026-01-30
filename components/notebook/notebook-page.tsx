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
    if (draggedIndex !== null && dragOverIndex !== null) {
      // dragOverIndex 表示目标位置（0 = 最顶部, 1 = 第一个之后, etc.）
      let targetIndex = dragOverIndex
      // 如果拖拽到自己下方，需要调整索引
      if (targetIndex > draggedIndex) {
        targetIndex = targetIndex - 1
      }
      if (targetIndex !== draggedIndex) {
        onReorderLines(draggedIndex, targetIndex)
      }
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [draggedIndex, dragOverIndex, onReorderLines])

  // 拖拽经过
  const handleDragOver = useCallback((e: React.DragEvent, targetPosition: number) => {
    e.preventDefault()
    if (draggedIndex !== null) {
      setDragOverIndex(targetPosition)
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
        backgroundPosition: '0 6px',
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
        <div className="space-y-0 relative">
          {/* 拖拽到最顶部的放置指示器 */}
          {draggedIndex !== null && dragOverIndex === 0 && (
            <div
              className="h-px bg-amber-500 -mx-8"
              style={{ boxShadow: '0 0 4px rgba(245, 158, 11, 0.8)' }}
            />
          )}

          {page.lines.map((line, index) => (
            <div
              key={line.id}
              className={`group relative transition-all duration-150 ${draggedIndex === index ? 'opacity-50 bg-amber-100/50' : ''
                } ${draggedIndex !== null && draggedIndex !== index ? 'bg-amber-50/30 border-t border-amber-200/60' : ''
                }`}
              style={{
                minHeight: lineHeight,
                marginLeft: draggedIndex !== null && draggedIndex !== index ? '-32px' : undefined,
                paddingLeft: draggedIndex !== null && draggedIndex !== index ? '32px' : undefined,
              }}
              onDragOver={(e) => {
                e.preventDefault()
                // 根据鼠标位置决定放置在上方还是下方
                const rect = e.currentTarget.getBoundingClientRect()
                const midY = rect.top + rect.height / 2
                if (e.clientY < midY) {
                  setDragOverIndex(index)
                } else {
                  setDragOverIndex(index + 1)
                }
              }}
              onDragLeave={handleDragLeave}
            >
              {/* 放置指示器 - 上方 */}
              {draggedIndex !== null && dragOverIndex === index && draggedIndex !== index && (
                <div
                  className="absolute -top-px left-0 right-0 h-px bg-amber-500 -mx-8 z-10"
                  style={{ boxShadow: '0 0 4px rgba(245, 158, 11, 0.8)' }}
                />
              )}
              {/* 放置指示器 - 下方 */}
              {draggedIndex !== null && dragOverIndex === index + 1 && draggedIndex !== index && (
                <div
                  className="absolute -bottom-px left-0 right-0 h-px bg-amber-500 -mx-8 z-10"
                  style={{ boxShadow: '0 0 4px rgba(245, 158, 11, 0.8)' }}
                />
              )}
              {line.type === 'text' && (
                <TextLine
                  line={line}
                  lineHeight={lineHeight}
                  onUpdate={(updates) => onUpdateLine(line.id, updates)}
                  onDelete={() => onDeleteLine(line.id)}
                  dragHandleProps={createDragHandleProps(index)}
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

          {/* 拖拽到最底部的放置区域 */}
          {draggedIndex !== null && (
            <div
              className="h-8 -mx-8 px-8"
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverIndex(page.lines.length)
              }}
              onDragLeave={handleDragLeave}
            >
              {dragOverIndex === page.lines.length && (
                <div
                  className="h-px bg-amber-500"
                  style={{ boxShadow: '0 0 4px rgba(245, 158, 11, 0.8)' }}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
