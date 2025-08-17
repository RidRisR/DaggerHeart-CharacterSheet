/**
 * 页面注册系统 - 统一管理所有页面的配置和渲染逻辑
 */

import type { ComponentType } from 'react'
import type { SheetData } from './sheet-data'

export interface PageDefinition {
  id: string
  label: string
  component: ComponentType
  printClass: string
  tabValue?: string  // Tab值，如果与id不同
  
  // 显示条件
  visibility: 
    | { type: 'always' }
    | { type: 'config'; configKey: 'rangerCompanion' | 'armorTemplate' | 'adventureNotes' }
    | { type: 'data'; dataCheck: (data: SheetData) => boolean }
  
  // 打印顺序（数字越小越靠前）
  printOrder: number
  
  // 是否在Tab中显示
  showInTabs?: boolean
}

// 页面注册表
const pageRegistry = new Map<string, PageDefinition>()

/**
 * 注册页面
 */
export function registerPage(page: PageDefinition) {
  pageRegistry.set(page.id, page)
}

/**
 * 批量注册页面
 */
export function registerPages(pages: PageDefinition[]) {
  pages.forEach(page => registerPage(page))
}

/**
 * 获取页面定义
 */
export function getPageDefinition(pageId: string): PageDefinition | undefined {
  return pageRegistry.get(pageId)
}

/**
 * 获取所有页面定义
 */
export function getAllPages(): PageDefinition[] {
  return Array.from(pageRegistry.values())
}

/**
 * 判断页面是否可见
 */
export function isPageVisible(page: PageDefinition, sheetData: SheetData): boolean {
  switch (page.visibility.type) {
    case 'always':
      return true
    case 'config':
      return !!sheetData.pageVisibility?.[page.visibility.configKey]
    case 'data':
      return page.visibility.dataCheck(sheetData)
    default:
      return false
  }
}

/**
 * 获取所有可见页面（用于打印）
 */
export function getVisiblePages(sheetData: SheetData): PageDefinition[] {
  return getAllPages()
    .filter(page => isPageVisible(page, sheetData))
    .sort((a, b) => a.printOrder - b.printOrder)
}

/**
 * 获取Tab页面（用于正常视图）
 */
export function getTabPages(sheetData: SheetData): PageDefinition[] {
  return getAllPages()
    .filter(page => page.showInTabs !== false && isPageVisible(page, sheetData))
    .sort((a, b) => a.printOrder - b.printOrder)
}

/**
 * 清空注册表（主要用于测试）
 */
export function clearRegistry() {
  pageRegistry.clear()
}

/**
 * 获取最后一个可见页面的打印类名
 */
export function getLastVisiblePageClass(sheetData: SheetData): string {
  const visiblePages = getVisiblePages(sheetData)
  if (visiblePages.length === 0) return ''
  return visiblePages[visiblePages.length - 1].printClass
}