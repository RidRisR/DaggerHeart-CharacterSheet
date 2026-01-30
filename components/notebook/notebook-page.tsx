"use client"

import React from "react"
import type { NotebookPage as NotebookPageType, NotebookLine } from "@/lib/sheet-data"
import { TextLine } from "./lines/text-line"
import { CounterLine } from "./lines/counter-line"
import { DiceLine } from "./lines/dice-line"

interface NotebookPageProps {
  page: NotebookPageType
  onUpdateLine: (lineId: string, updates: Partial<NotebookLine>) => void
  onDeleteLine: (lineId: string) => void
}

export function NotebookPage({ page, onUpdateLine, onDeleteLine }: NotebookPageProps) {
  // 蓝色横线背景样式
  const lineHeight = 28 // 行高

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
          {page.lines.map((line) => (
            <div
              key={line.id}
              className="group relative"
              style={{ minHeight: lineHeight }}
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
                />
              )}
              {line.type === 'dice' && (
                <DiceLine
                  line={line}
                  lineHeight={lineHeight}
                  onUpdate={(updates) => onUpdateLine(line.id, updates)}
                  onDelete={() => onDeleteLine(line.id)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
