/**
 * 调整值统计器 - Provider 接口定义
 *
 * Provider 负责从 SheetData 中收集数据源声明的调整值
 */

import type { Modifier } from './types'
import type { SheetData } from '@/lib/sheet-data'

/**
 * 调整值提供者接口
 *
 * 职责：从 SheetData 中收集数据源声明的调整值
 * 原则：只负责"收集"，不负责"解析"或"猜测"
 */
export interface IModifierProvider {
  /**
   * 提供者名称（用于调试和日志）
   */
  readonly name: string

  /**
   * 从 SheetData 中收集调整值
   *
   * @param sheetData - 完整的角色表数据
   * @returns 调整值数组
   */
  getModifiers(sheetData: SheetData): Modifier[]
}
