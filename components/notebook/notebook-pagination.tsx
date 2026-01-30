"use client"

import React from "react"
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react"

interface NotebookPaginationProps {
  currentPage: number
  totalPages: number
  maxPages: number
  onGoToPage: (index: number) => void
  onAddPage: () => void
  onDeletePage: () => void
}

export function NotebookPagination({
  currentPage,
  totalPages,
  maxPages,
  onGoToPage,
  onAddPage,
  onDeletePage
}: NotebookPaginationProps) {
  const canAddPage = totalPages < maxPages
  const canDeletePage = totalPages > 1

  return (
    <div
      className="flex items-center justify-between px-3 py-2"
      style={{
        background: 'linear-gradient(180deg, #4E342E 0%, #3E2723 100%)',
        borderTop: '2px solid #3E2723',
      }}
    >
      {/* 左侧：删除页面按钮 */}
      <div className="w-20">
        {canDeletePage && (
          <button
            onClick={onDeletePage}
            className="p-1.5 text-amber-300/60 hover:text-red-400 transition-colors"
            title="删除当前页"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 中间：页码导航 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onGoToPage(currentPage - 1)}
          disabled={currentPage <= 0}
          className="p-1 text-amber-200 hover:text-amber-100 disabled:text-amber-900 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* 页码指示器 */}
        <div className="flex items-center gap-1">
          {Array(totalPages).fill(0).map((_, i) => (
            <button
              key={i}
              onClick={() => onGoToPage(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentPage
                  ? 'bg-amber-200 scale-125'
                  : 'bg-amber-800 hover:bg-amber-600'
              }`}
              title={`第 ${i + 1} 页`}
            />
          ))}
        </div>

        <button
          onClick={() => onGoToPage(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          className="p-1 text-amber-200 hover:text-amber-100 disabled:text-amber-900 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 右侧：添加页面按钮 */}
      <div className="w-20 flex justify-end">
        {canAddPage && (
          <button
            onClick={onAddPage}
            className="p-1.5 text-amber-300/60 hover:text-amber-100 transition-colors"
            title={`添加新页 (${totalPages}/${maxPages})`}
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
