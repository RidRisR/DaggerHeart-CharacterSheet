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
      armorTemplate: false, // 默认隐藏护甲模板页
      adventureNotes: false // 默认隐藏冒险笔记页
    }
    console.log('[Migration] Migrated includePageThreeInExport to pageVisibility')
  } else {
    // 如果没有相关字段，使用默认值
    migrated.pageVisibility = {
      rangerCompanion: false,
      armorTemplate: false,
      adventureNotes: false
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
 * pageVisibility 字段补充迁移
 * 确保所有必需的字段都存在
 */
function migratePageVisibilityFields(data: SheetData): SheetData {
  if (!data.pageVisibility) {
    return data
  }

  const migrated = { ...data }
  let needsSave = false

  // 确保 adventureNotes 字段存在
  if (!('adventureNotes' in data.pageVisibility)) {
    const currentVisibility = data.pageVisibility as Record<string, boolean>
    migrated.pageVisibility = {
      rangerCompanion: currentVisibility.rangerCompanion ?? false,
      armorTemplate: currentVisibility.armorTemplate ?? false,
      adventureNotes: false // 默认隐藏冒险笔记页
    }
    needsSave = true
    console.log('[Migration] Added missing adventureNotes field to pageVisibility')
  }

  return migrated
}

/**
 * 护甲模板字段迁移
 * 为缺少护甲模板字段的旧数据添加默认结构
 */
function migrateArmorTemplate(data: SheetData): SheetData {
  if (data.armorTemplate) {
    return data
  }

  const migrated = { ...data }
  migrated.armorTemplate = {
    weaponName: '',
    description: '',
    upgradeSlots: Array(5).fill(0).map(() => ({ checked: false, text: '' })),
    upgrades: {
      basic: {},
      tier2: {},
      tier3: {},
      tier4: {}
    },
    scrapMaterials: {
      fragments: Array(6).fill(0),
      metals: Array(6).fill(0),
      components: Array(6).fill(0),
      relics: Array(5).fill('')
    },
    electronicCoins: 0
  }
  
  console.log('[Migration] Added armorTemplate field')
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
  _options: MigrationOptions = {}
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
  migrated = migratePageVisibilityFields(migrated)
  migrated = migrateArmorTemplate(migrated)
  
  // 3. 清理废弃字段（最后执行）
  migrated = cleanupDeprecatedFields(migrated)

  return migrated
}

