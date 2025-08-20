/**
 * 角色数据验证器 - 通用的数据验证和清理功能
 * 
 * 功能：
 * 1. 验证角色数据的基本结构和必需字段
 * 2. 数据类型检查和转换
 * 3. 数据清理和标准化
 * 4. 兼容性检查和警告
 */

import { SheetData } from './sheet-data'
import { StandardCard } from '@/card/card-types'
import { defaultSheetData } from './default-sheet-data'
import type { AttributeValue } from './sheet-data'
import { migrateSheetData } from './sheet-data-migration'

export interface ValidationResult {
  valid: boolean
  data?: SheetData
  error?: string
  warnings: string[]
}

/**
 * 验证SheetData对象的基本结构
 */
export function validateSheetData(data: any): data is SheetData {
  if (!data || typeof data !== 'object') {
    return false
  }

  // 检查必需字段
  const requiredFields = ['name', 'level', 'gold', 'experience', 'hope', 'inventory', 'cards']
  for (const field of requiredFields) {
    if (!(field in data)) {
      console.warn(`Missing required field: ${field}`)
      return false
    }
  }

  // 检查数组字段
  const arrayFields = ['gold', 'experience', 'hope', 'inventory', 'cards']
  for (const field of arrayFields) {
    if (!Array.isArray(data[field])) {
      console.warn(`Field ${field} should be an array`)
      return false
    }
  }

  // 检查cards数组中的对象结构
  if (data.cards && data.cards.length > 0) {
    const sampleCard = data.cards[0]
    if (!sampleCard.id || !sampleCard.name || !sampleCard.type) {
      console.warn('Invalid card structure in cards array')
      return false
    }
  }

  return true
}

/**
 * 验证卡牌对象是否有效
 */
export function isValidCard(card: any): card is StandardCard {
  return card &&
    typeof card === 'object' &&
    typeof card.id === 'string' &&
    typeof card.name === 'string' &&
    card.type !== undefined
}

/**
 * 清理和标准化数据
 */
export function cleanAndNormalizeData(data: any): SheetData {
  // 创建一个新的对象，只保留有效的字段
  const cleaned: SheetData = {
    name: String(data.name || ''),
    level: String(data.level || '1'),
    proficiency: Array.isArray(data.proficiency) ? data.proficiency : (typeof data.proficiency === 'number' ? data.proficiency : 0),

    // 字符串字段
    ancestry1: data.ancestry1 ? String(data.ancestry1) : undefined,
    ancestry2: data.ancestry2 ? String(data.ancestry2) : undefined,
    profession: String(data.profession || ''),
    community: String(data.community || ''),
    subclass: data.subclass ? String(data.subclass) : undefined,

    // 卡牌引用
    professionRef: data.professionRef || undefined,
    ancestry1Ref: data.ancestry1Ref || undefined,
    ancestry2Ref: data.ancestry2Ref || undefined,
    communityRef: data.communityRef || undefined,
    subclassRef: data.subclassRef || undefined,

    // 属性值 - 添加施法标记迁移逻辑
    evasion: data.evasion ? String(data.evasion) : undefined,
    agility: migrateAttributeValue(data.agility),
    strength: migrateAttributeValue(data.strength),
    finesse: migrateAttributeValue(data.finesse),
    instinct: migrateAttributeValue(data.instinct),
    presence: migrateAttributeValue(data.presence),
    knowledge: migrateAttributeValue(data.knowledge),

    // 数组字段 - 确保都是数组
    gold: Array.isArray(data.gold) ? data.gold : [],
    experience: Array.isArray(data.experience) ? data.experience : [],
    experienceValues: Array.isArray(data.experienceValues) ? data.experienceValues : undefined,
    hope: Array.isArray(data.hope) ? data.hope : [],
    hp: Array.isArray(data.hp) ? data.hp : undefined,
    stress: Array.isArray(data.stress) ? data.stress : undefined,
    armorBoxes: Array.isArray(data.armorBoxes) ? data.armorBoxes : undefined,
    inventory: Array.isArray(data.inventory) ? data.inventory : [],

    // 伙伴经验
    companionExperience: Array.isArray(data.companionExperience) ? data.companionExperience : undefined,
    companionExperienceValue: Array.isArray(data.companionExperienceValue) ? data.companionExperienceValue : undefined,

    // 角色描述
    characterBackground: data.characterBackground ? String(data.characterBackground) : undefined,
    characterAppearance: data.characterAppearance ? String(data.characterAppearance) : undefined,
    characterMotivation: data.characterMotivation ? String(data.characterMotivation) : undefined,
    characterImage: data.characterImage ? String(data.characterImage) : undefined,

    // 卡牌
    cards: Array.isArray(data.cards) ? data.cards.filter(isValidCard) : [],
    inventory_cards: Array.isArray(data.inventory_cards) ? data.inventory_cards.filter(isValidCard) : undefined,

    // 升级选项
    checkedUpgrades: data.checkedUpgrades || undefined,

    // 战斗相关
    minorThreshold: data.minorThreshold ? String(data.minorThreshold) : undefined,
    majorThreshold: data.majorThreshold ? String(data.majorThreshold) : undefined,
    armorValue: data.armorValue ? String(data.armorValue) : undefined,
    armorBonus: data.armorBonus ? String(data.armorBonus) : undefined,
    armorMax: typeof data.armorMax === 'number' ? data.armorMax : undefined,
    hpMax: typeof data.hpMax === 'number' ? data.hpMax : undefined,
    stressMax: typeof data.stressMax === 'number' ? data.stressMax : undefined,

    // 武器信息
    primaryWeaponName: data.primaryWeaponName ? String(data.primaryWeaponName) : undefined,
    primaryWeaponTrait: data.primaryWeaponTrait ? String(data.primaryWeaponTrait) : undefined,
    primaryWeaponDamage: data.primaryWeaponDamage ? String(data.primaryWeaponDamage) : undefined,
    primaryWeaponFeature: data.primaryWeaponFeature ? String(data.primaryWeaponFeature) : undefined,
    secondaryWeaponName: data.secondaryWeaponName ? String(data.secondaryWeaponName) : undefined,
    secondaryWeaponTrait: data.secondaryWeaponTrait ? String(data.secondaryWeaponTrait) : undefined,
    secondaryWeaponDamage: data.secondaryWeaponDamage ? String(data.secondaryWeaponDamage) : undefined,
    secondaryWeaponFeature: data.secondaryWeaponFeature ? String(data.secondaryWeaponFeature) : undefined,

    // 护甲信息
    armorName: data.armorName ? String(data.armorName) : undefined,
    armorBaseScore: data.armorBaseScore ? String(data.armorBaseScore) : undefined,
    armorThreshold: data.armorThreshold ? String(data.armorThreshold) : undefined,
    armorFeature: data.armorFeature ? String(data.armorFeature) : undefined,

    // 库存武器
    inventoryWeapon1Name: data.inventoryWeapon1Name ? String(data.inventoryWeapon1Name) : undefined,
    inventoryWeapon1Trait: data.inventoryWeapon1Trait ? String(data.inventoryWeapon1Trait) : undefined,
    inventoryWeapon1Damage: data.inventoryWeapon1Damage ? String(data.inventoryWeapon1Damage) : undefined,
    inventoryWeapon1Feature: data.inventoryWeapon1Feature ? String(data.inventoryWeapon1Feature) : undefined,
    inventoryWeapon1Primary: typeof data.inventoryWeapon1Primary === 'boolean' ? data.inventoryWeapon1Primary : undefined,
    inventoryWeapon1Secondary: typeof data.inventoryWeapon1Secondary === 'boolean' ? data.inventoryWeapon1Secondary : undefined,
    inventoryWeapon2Name: data.inventoryWeapon2Name ? String(data.inventoryWeapon2Name) : undefined,
    inventoryWeapon2Trait: data.inventoryWeapon2Trait ? String(data.inventoryWeapon2Trait) : undefined,
    inventoryWeapon2Damage: data.inventoryWeapon2Damage ? String(data.inventoryWeapon2Damage) : undefined,
    inventoryWeapon2Feature: data.inventoryWeapon2Feature ? String(data.inventoryWeapon2Feature) : undefined,
    inventoryWeapon2Primary: typeof data.inventoryWeapon2Primary === 'boolean' ? data.inventoryWeapon2Primary : undefined,
    inventoryWeapon2Secondary: typeof data.inventoryWeapon2Secondary === 'boolean' ? data.inventoryWeapon2Secondary : undefined,

    // 伙伴相关
    companionImage: data.companionImage ? String(data.companionImage) : undefined,
    companionDescription: data.companionDescription ? String(data.companionDescription) : undefined,
    companionRange: data.companionRange ? String(data.companionRange) : undefined,
    companionStress: Array.isArray(data.companionStress) ? data.companionStress : undefined,
    companionEvasion: data.companionEvasion ? String(data.companionEvasion) : undefined,
    companionStressMax: typeof data.companionStressMax === 'number' ? data.companionStressMax : undefined,
    companionName: data.companionName ? String(data.companionName) : undefined,
    companionWeapon: data.companionWeapon ? String(data.companionWeapon) : undefined,

    // 伙伴训练选项
    trainingOptions: data.trainingOptions && typeof data.trainingOptions === 'object' ? {
      intelligent: Array.isArray(data.trainingOptions.intelligent) ? data.trainingOptions.intelligent : [],
      radiantInDarkness: Array.isArray(data.trainingOptions.radiantInDarkness) ? data.trainingOptions.radiantInDarkness : [],
      creatureComfort: Array.isArray(data.trainingOptions.creatureComfort) ? data.trainingOptions.creatureComfort : [],
      armored: Array.isArray(data.trainingOptions.armored) ? data.trainingOptions.armored : [],
      vicious: Array.isArray(data.trainingOptions.vicious) ? data.trainingOptions.vicious : [],
      resilient: Array.isArray(data.trainingOptions.resilient) ? data.trainingOptions.resilient : [],
      bonded: Array.isArray(data.trainingOptions.bonded) ? data.trainingOptions.bonded : [],
      aware: Array.isArray(data.trainingOptions.aware) ? data.trainingOptions.aware : []
    } : {
      intelligent: [],
      radiantInDarkness: [],
      creatureComfort: [],
      armored: [],
      vicious: [],
      resilient: [],
      bonded: [],
      aware: []
    },

    // 页面可见性
    pageVisibility: data.pageVisibility || undefined,

    // 护甲模板数据 - 直接传递，让迁移函数处理
    armorTemplate: data.armorTemplate || undefined,

    // 冒险笔记数据 - 直接传递，让迁移函数处理  
    adventureNotes: data.adventureNotes || undefined
  }

  return cleaned
}

/**
 * 验证导入的数据是否与当前版本兼容
 */
export function validateCompatibility(data: SheetData): { compatible: boolean; warnings: string[] } {
  const warnings: string[] = []

  // 检查必需字段
  if (!data.name || data.name.trim() === '') {
    warnings.push('角色名称为空')
  }

  if (!data.level || data.level.trim() === '') {
    warnings.push('角色等级为空')
  }

  // 检查数组字段的完整性
  if (!Array.isArray(data.gold) || data.gold.length === 0) {
    warnings.push('金币数据可能不完整')
  }

  if (!Array.isArray(data.experience) || data.experience.length === 0) {
    warnings.push('经验数据可能不完整')
  }

  if (!Array.isArray(data.hope) || data.hope.length === 0) {
    warnings.push('希望数据可能不完整')
  }

  if (!Array.isArray(data.cards)) {
    warnings.push('卡牌数据缺失')
  }

  // 兼容性检查通过，如果有警告不影响导入
  return {
    compatible: true,
    warnings
  }
}

/**
 * 通用的角色数据验证和处理函数
 * 适用于JSON和HTML导入
 */
export function validateAndProcessCharacterData(rawData: any, source: 'json' | 'html' = 'json'): ValidationResult {
  try {
    console.log(`[Data Validation] 开始验证${source.toUpperCase()}数据...`)

    // 1. 基本类型检查
    if (!rawData || typeof rawData !== 'object') {
      return {
        valid: false,
        error: '数据格式无效，必须是JSON对象',
        warnings: []
      }
    }

    // 2. 结构验证
    if (!validateSheetData(rawData)) {
      return {
        valid: false,
        error: '角色数据结构验证失败，缺少必需字段或字段类型不正确',
        warnings: []
      }
    }

    // 3. 数据清理和标准化
    const cleanedData = cleanAndNormalizeData(rawData)

    // 4. 与默认数据合并（保持向后兼容）
    let mergedData: any = { 
      ...defaultSheetData, 
      ...cleanedData
    }

    // 保留特殊字段到合并后的数据中（用于向后兼容）
    if ((rawData as any).focused_card_ids) {
      mergedData.focused_card_ids = (rawData as any).focused_card_ids
    }

    // 5. 应用数据迁移
    mergedData = migrateSheetData(mergedData);
    console.log(`[Data Validation] Applied data migrations for ${source.toUpperCase()}`)

    // 6. 兼容性检查
    const compatibility = validateCompatibility(mergedData)

    console.log(`[Data Validation] ${source.toUpperCase()}数据验证成功:`, mergedData.name)

    return {
      valid: true,
      data: mergedData,
      warnings: compatibility.warnings
    }

  } catch (error) {
    console.error(`[Data Validation] ${source.toUpperCase()}数据验证失败:`, error)
    return {
      valid: false,
      error: `数据验证失败: ${error instanceof Error ? error.message : '未知错误'}`,
      warnings: []
    }
  }
}

/**
 * 从JSON字符串验证和处理角色数据
 */
export function validateJSONCharacterData(jsonString: string): ValidationResult {
  try {
    const rawData = JSON.parse(jsonString)
    return validateAndProcessCharacterData(rawData, 'json')
  } catch (parseError) {
    return {
      valid: false,
      error: `JSON解析失败: ${parseError instanceof Error ? parseError.message : '文件格式不正确'}`,
      warnings: []
    }
  }
}

/**
 * 迁移单个属性值，确保包含施法标记字段
 */
function migrateAttributeValue(attrValue: any): AttributeValue | undefined {
  if (!attrValue || typeof attrValue !== 'object') {
    return undefined
  }
  
  // 检查是否是有效的AttributeValue格式
  if ('checked' in attrValue && 'value' in attrValue) {
    // 如果缺少spellcasting字段，则添加默认值
    return {
      checked: Boolean(attrValue.checked),
      value: String(attrValue.value || ''),
      spellcasting: Boolean(attrValue.spellcasting || false)
    }
  }
  
  return undefined
}
