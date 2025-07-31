"use client"

import React from 'react'
import type { SheetData } from '@/lib/sheet-data'
import { getVisiblePages } from '@/lib/page-registry'

interface PrintPageRendererProps {
  sheetData: SheetData
}

/**
 * 动态渲染打印页面
 * 根据页面注册信息和当前数据状态自动渲染所有可见页面
 */
export function PrintPageRenderer({ sheetData }: PrintPageRendererProps) {
  const visiblePages = getVisiblePages(sheetData)
  const lastPageIndex = visiblePages.length - 1
  
  return (
    <>
      {visiblePages.map((page, index) => {
        const Component = page.component
        const isLastPage = index === lastPageIndex
        
        return (
          <div
            key={page.id}
            className={`${page.printClass} flex justify-center items-start ${
              isLastPage ? 'last-printed-page' : ''
            }`}
          >
            <Component />
          </div>
        )
      })}
    </>
  )
}