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
import { LEGACY_EQUIPMENT_KEYS, migrateSheetData } from './sheet-data-migration'
import { sanitizeOtherAdjustments } from '@/lib/modifiers/other-adjustments'
import { mergeLegacyUpgradeStateFields } from '@/lib/modifiers/upgrade-states'

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

  // 检查数组字段（hope 已改为 number，不在此检查）
  const arrayFields = ['gold', 'experience', 'inventory', 'cards']
  for (const field of arrayFields) {
    if (!Array.isArray(data[field])) {
      console.warn(`Field ${field} should be an array`)
      return false
    }
  }

  // hope 字段支持 number 或 boolean[] 两种格式（向后兼容）
  if (typeof data.hope !== 'number' && !Array.isArray(data.hope)) {
    console.warn('Field hope should be a number or boolean array')
    return false
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

function validateRawImportCandidate(data: any): data is Record<string, unknown> {
  if (!data || typeof data !== 'object') {
    return false
  }

  const requiredFields = ['name', 'level', 'gold', 'experience', 'hope', 'inventory', 'cards']
  return requiredFields.every(field => field in data)
}

function validateCurrentSheetData(data: any): data is SheetData {
  return validateSheetData(data) && typeof data.schemaVersion === 'number'
}

function sanitizeValidatedSheetData(data: SheetData): SheetData {
  const sanitized: SheetData = {
    ...data,
    otherAdjustments: sanitizeOtherAdjustments(data.otherAdjustments),
    upgradeStates: mergeLegacyUpgradeStateFields(data),
  }

  delete (sanitized as any).checkedUpgrades
  delete (sanitized as any).automationSelections

  return sanitized
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
  const cleaned: any = {
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

    // Hope 验证和转换（支持 number 和 boolean[] 两种格式）
    hope: (() => {
      if (typeof data.hope === 'number') {
        return Math.max(0, Math.min(data.hope, data.hopeMax || 12))
      }
      if (Array.isArray(data.hope)) {
        const lastLit = data.hope.lastIndexOf(true)
        return lastLit >= 0 ? lastLit + 1 : 0
      }
      return 0
    })(),

    hopeMax: (() => {
      if (typeof data.hopeMax === 'number') {
        return Math.max(1, Math.min(data.hopeMax, 12))
      }
      if (Array.isArray(data.hope)) {
        return data.hope.length || 6
      }
      return 6
    })(),

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

    modifierState: data.modifierState && typeof data.modifierState === "object" ? data.modifierState : undefined,
    userModifierContributions: Array.isArray(data.userModifierContributions) ? data.userModifierContributions : undefined,
    otherAdjustments: sanitizeOtherAdjustments(data.otherAdjustments),
    upgradeStates: mergeLegacyUpgradeStateFields(data),

    // 战斗相关
    minorThreshold: data.minorThreshold ? String(data.minorThreshold) : undefined,
    majorThreshold: data.majorThreshold ? String(data.majorThreshold) : undefined,
    armorBonus: data.armorBonus ? String(data.armorBonus) : undefined,
    armorMax: typeof data.armorMax === 'number' || typeof data.armorMax === 'string' ? data.armorMax : undefined,
    hpMax: typeof data.hpMax === 'number' ? data.hpMax : undefined,
    stressMax: typeof data.stressMax === 'number' ? data.stressMax : undefined,

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

  if (data.equipment && typeof data.equipment === "object" && !Array.isArray(data.equipment)) {
    cleaned.equipment = data.equipment
  }

  copyLegacyEquipmentInput(cleaned, data)

  return sanitizeValidatedSheetData(cleaned as SheetData)
}

function copyLegacyEquipmentInput(cleanedData: any, data: any) {
  LEGACY_EQUIPMENT_KEYS.forEach(key => {
    if (key in data) {
      cleanedData[key] = typeof data[key] === "boolean" ? data[key] : String(data[key] ?? "")
    }
  })
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

  // hope 字段已在 validateSheetData() 中验证类型，任何值（0-8）都是合法的，无需警告

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

    // 1. 外部导入只做原始结构粗校验；字段修正统一交给迁移管线处理。
    if (!validateRawImportCandidate(rawData)) {
      return {
        valid: false,
        error: '数据格式无效，必须是JSON对象且包含角色数据必需字段',
        warnings: []
      }
    }

    // 2. 应用数据迁移。这里必须直接使用原始对象，避免默认值提前遮蔽旧字段。
    const migratedData = migrateSheetData(rawData)
    const validatedData = sanitizeValidatedSheetData(migratedData)
    console.log(`[Data Validation] Applied data migrations for ${source.toUpperCase()}`)

    // 3. 迁移后再验证当前版本结构。
    if (!validateCurrentSheetData(validatedData)) {
      return {
        valid: false,
        error: '角色数据结构验证失败，缺少必需字段或字段类型不正确',
        warnings: []
      }
    }

    // 4. 兼容性检查
    const compatibility = validateCompatibility(validatedData)

    console.log(`[Data Validation] ${source.toUpperCase()}数据验证成功:`, validatedData.name)

    return {
      valid: true,
      data: validatedData,
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
