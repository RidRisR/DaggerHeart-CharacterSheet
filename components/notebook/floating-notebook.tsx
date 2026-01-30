"use client"

import React, { useRef, useState, useCallback, useEffect } from "react"
import { X, BookOpen } from "lucide-react"
import { useSheetStore } from "@/lib/sheet-store"
import { NotebookPage } from "./notebook-page"
import { NotebookToolbar } from "./notebook-toolbar"
import { NotebookPagination } from "./notebook-pagination"
import type { NotebookData, NotebookLine, NotebookPage as NotebookPageType } from "@/lib/sheet-data"

// 生成唯一ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// 默认笔记本数据
const defaultNotebookData: NotebookData = {
  pages: [{ id: 'page-1', lines: [] }],
  currentPageIndex: 0,
  isOpen: false
}

// 每页最大行数
const MAX_LINES_PER_PAGE = 10

export function FloatingNotebook() {
  const { sheetData, setSheetData } = useSheetStore()
  const notebook = sheetData.notebook || defaultNotebookData

  // 拖拽状态
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; offsetX: number; offsetY: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 更新笔记本数据
  const updateNotebook = useCallback((updates: Partial<NotebookData>) => {
    setSheetData(prev => ({
      ...prev,
      notebook: { ...(prev.notebook || defaultNotebookData), ...updates }
    }))
  }, [setSheetData])

  // 更新当前页
  const updateCurrentPage = useCallback((updater: (page: NotebookPageType) => NotebookPageType) => {
    setSheetData(prev => {
      const nb = prev.notebook || defaultNotebookData
      const newPages = [...nb.pages]
      newPages[nb.currentPageIndex] = updater(newPages[nb.currentPageIndex])
      return {
        ...prev,
        notebook: { ...nb, pages: newPages }
      }
    })
  }, [setSheetData])

  // 添加行
  const addLine = useCallback((line: NotebookLine) => {
    updateCurrentPage(page => ({
      ...page,
      lines: [...page.lines, line]
    }))
  }, [updateCurrentPage])

  // 更新行
  const updateLine = useCallback((lineId: string, updates: Partial<NotebookLine>) => {
    updateCurrentPage(page => ({
      ...page,
      lines: page.lines.map(line =>
        line.id === lineId ? { ...line, ...updates } as NotebookLine : line
      )
    }))
  }, [updateCurrentPage])

  // 删除行
  const deleteLine = useCallback((lineId: string) => {
    updateCurrentPage(page => ({
      ...page,
      lines: page.lines.filter(line => line.id !== lineId)
    }))
  }, [updateCurrentPage])

  // 重新排序行
  const reorderLines = useCallback((fromIndex: number, toIndex: number) => {
    updateCurrentPage(page => {
      const newLines = [...page.lines]
      const [removed] = newLines.splice(fromIndex, 1)
      newLines.splice(toIndex, 0, removed)
      return { ...page, lines: newLines }
    })
  }, [updateCurrentPage])

  // 添加页面
  const addPage = useCallback(() => {
    if (notebook.pages.length >= 5) return
    const newPage: NotebookPageType = {
      id: generateId(),
      lines: []
    }
    updateNotebook({
      pages: [...notebook.pages, newPage],
      currentPageIndex: notebook.pages.length
    })
  }, [notebook.pages, updateNotebook])

  // 删除当前页
  const deleteCurrentPage = useCallback(() => {
    if (notebook.pages.length <= 1) return
    const newPages = notebook.pages.filter((_, i) => i !== notebook.currentPageIndex)
    updateNotebook({
      pages: newPages,
      currentPageIndex: Math.min(notebook.currentPageIndex, newPages.length - 1)
    })
  }, [notebook.pages, notebook.currentPageIndex, updateNotebook])

  // 切换页面
  const goToPage = useCallback((index: number) => {
    if (index >= 0 && index < notebook.pages.length) {
      updateNotebook({ currentPageIndex: index })
    }
  }, [notebook.pages.length, updateNotebook])

  // 打开/关闭笔记本
  const toggleOpen = useCallback(() => {
    updateNotebook({ isOpen: !notebook.isOpen })
  }, [notebook.isOpen, updateNotebook])

  // 拖拽事件处理
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.notebook-content')) return
    setIsDragging(true)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      offsetX: position.x,
      offsetY: position.y
    }
  }, [position])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setPosition({
      x: dragRef.current.offsetX + dx,
      y: dragRef.current.offsetY + dy
    })
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    dragRef.current = null
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // 当前页数据
  const currentPage = notebook.pages[notebook.currentPageIndex] || notebook.pages[0]

  if (!notebook.isOpen) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className="fixed z-50 print:hidden"
      style={{
        left: position.x,
        top: position.y,
        width: 360,
      }}
    >
      {/* 窗口容器 - 皮革边框效果 */}
      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          boxShadow: `
            0 4px 6px -1px rgba(0, 0, 0, 0.2),
            0 10px 15px -3px rgba(0, 0, 0, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.1)
          `,
          border: '4px solid #5D4037',
          background: 'linear-gradient(135deg, #6D4C41 0%, #4E342E 100%)',
        }}
      >
        {/* 标题栏 - 可拖拽区域 */}
        <div
          className="flex items-center justify-between px-3 py-2 cursor-move select-none"
          onMouseDown={handleMouseDown}
          style={{
            background: 'linear-gradient(180deg, #5D4037 0%, #4E342E 100%)',
            borderBottom: '2px solid #3E2723',
          }}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-200" />
            <span className="text-sm font-medium text-amber-100">笔记本</span>
          </div>
          <button
            onClick={toggleOpen}
            className="p-1 hover:bg-amber-900/50 rounded transition-colors"
          >
            <X className="w-4 h-4 text-amber-200" />
          </button>
        </div>

        {/* 笔记本内容区域 - 固定高度 */}
        <div
          className="notebook-content relative flex flex-col"
          style={{
            background: '#FDF6E3', // 米黄色纸张
            height: 400,
          }}
        >
          {/* 纸张纹理噪点 */}
          <div
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
          />

          {/* 左侧红色装订线 */}
          <div
            className="absolute left-6 top-0 bottom-0 w-0.5"
            style={{ backgroundColor: '#E57373' }}
          />

          {/* 页面内容 - 可滚动区域 */}
          <div className="relative flex-1 overflow-y-auto overflow-x-visible">
            <NotebookPage
              page={currentPage}
              onUpdateLine={updateLine}
              onDeleteLine={deleteLine}
              onReorderLines={reorderLines}
            />
          </div>

          {/* 工具栏 */}
          <NotebookToolbar
            onAddText={() => addLine({ type: 'text', id: generateId(), label: '笔记', content: '' })}
            onAddCounter={() => addLine({ type: 'counter', id: generateId(), label: '计数器', current: 0, max: 6 })}
            onAddDice={() => addLine({ type: 'dice', id: generateId(), label: '骰子', dice: [{ sides: 6, value: 1 }] })}
            disabled={currentPage.lines.length >= MAX_LINES_PER_PAGE}
          />
        </div>

        {/* 翻页控制 */}
        <NotebookPagination
          currentPage={notebook.currentPageIndex}
          totalPages={notebook.pages.length}
          maxPages={5}
          onGoToPage={goToPage}
          onAddPage={addPage}
          onDeletePage={deleteCurrentPage}
        />
      </div>
    </div>
  )
}
