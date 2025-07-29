/**
 * SheetData 迁移模块
 * 
 * 提供统一的数据迁移接口，处理各种历史数据格式的兼容性问题
 * 
 * 主要功能：
 * 1. 页面可见性字段迁移（includePageThreeInExport -> pageVisibility）
 * 2. inventory_cards 字段添加
 * 3. 属性施法标记迁移
 * 4. 其他历史兼容性处理
 */

import type { SheetData, AttributeValue } from './sheet-data'
import { defaultSheetData } from './default-sheet-data'
import { createEmptyCard, type StandardCard } from '@/card/card-types'

/**
 * 迁移选项接口
 */
export interface MigrationOptions {
  // 保留接口以保持向后兼容，但不再需要
}

/**
 * 页面可见性字段迁移
 * 将旧的 includePageThreeInExport 转换为新的 pageVisibility 结构
 */
function migratePageVisibility(data: SheetData): SheetData {
  // 如果已经有新字段，直接返回
  if (data.pageVisibility) {
    return data
  }

  const migrated = { ...data }
  
  if ('includePageThreeInExport' in data && data.includePageThreeInExport !== undefined) {
    migrated.pageVisibility = {
      rangerCompanion: data.includePageThreeInExport,
      armorTemplate: true // 默认显示护甲模板
    }
    console.log('[Migration] Migrated includePageThreeInExport to pageVisibility')
  } else {
    // 如果没有相关字段，使用默认值
    migrated.pageVisibility = {
      rangerCompanion: true,
      armorTemplate: true
    }
    console.log('[Migration] Added default pageVisibility')
  }

  return migrated
}

/**
 * inventory_cards 字段迁移
 * 为缺少库存卡牌字段的旧数据添加空卡牌数组
 */
function migrateInventoryCards(data: SheetData): SheetData {
  if (data.inventory_cards) {
    return data
  }

  const migrated = { ...data }
  migrated.inventory_cards = Array(20).fill(0).map(() => createEmptyCard())
  console.log('[Migration] Added inventory_cards field')

  return migrated
}

/**
 * 属性施法标记迁移
 * 为旧的属性数据添加 spellcasting 字段
 */
function migrateAttributeSpellcasting(data: SheetData): SheetData {
  const migrated = { ...data }
  let hasChanges = false

  const attributeKeys: (keyof SheetData)[] = ['agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge']
  
  attributeKeys.forEach(key => {
    const attrValue = migrated[key] as AttributeValue | undefined
    if (attrValue && typeof attrValue === 'object' && 'checked' in attrValue && 'value' in attrValue) {
      if (!('spellcasting' in attrValue)) {
        (attrValue as AttributeValue).spellcasting = false
        hasChanges = true
      }
    }
  })

  if (hasChanges) {
    console.log('[Migration] Added spellcasting flags to attributes')
  }

  return migrated
}

/**
 * pageVisibility 字段重命名迁移
 * 将旧的 page3 字段重命名为 rangerCompanion
 */
function migratePageVisibilityRename(data: SheetData): SheetData {
  if (!data.pageVisibility) {
    return data
  }

  const migrated = { ...data }
  
  // 如果存在旧的 page3 字段，迁移到新字段名
  if ('page3' in data.pageVisibility) {
    migrated.pageVisibility = {
      ...data.pageVisibility,
      rangerCompanion: (data.pageVisibility as any).page3
    }
    // 删除旧字段
    delete (migrated.pageVisibility as any).page3
    console.log('[Migration] Renamed pageVisibility.page3 to rangerCompanion')
  }

  return migrated
}

/**
 * 清理废弃字段
 * 移除不再使用的字段，保持数据结构清洁
 */
function cleanupDeprecatedFields(data: SheetData): SheetData {
  const migrated = { ...data }
  
  // 移除废弃的字段
  if ('includePageThreeInExport' in migrated) {
    delete (migrated as any).includePageThreeInExport
    console.log('[Migration] Removed deprecated includePageThreeInExport field')
  }

  return migrated
}

/**
 * 主迁移函数 - 统一入口点
 * 
 * @param data 待迁移的数据（可能是不完整的 SheetData）
 * @param options 迁移选项，包含外部依赖
 * @returns 完整的已迁移 SheetData
 */
export function migrateSheetData(
  data: Partial<SheetData> | any, 
  options: MigrationOptions = {}
): SheetData {
  // 1. 确保基本结构，与默认数据合并
  let migrated: SheetData = {
    ...defaultSheetData,
    ...data
  }

  // 2. 应用各项迁移（按依赖顺序执行）
  migrated = migratePageVisibility(migrated)
  migrated = migrateInventoryCards(migrated)
  migrated = migrateAttributeSpellcasting(migrated)
  migrated = migratePageVisibilityRename(migrated)
  
  // 3. 清理废弃字段（最后执行）
  migrated = cleanupDeprecatedFields(migrated)

  return migrated
}

