import { SheetData, AttributeValue } from './sheet-data'

/**
 * 骰子导出器 - 将角色数据转换为骰子可用的.st命令格式
 */

/**
 * 获取属性值的数值
 * @param attr 属性值对象或字符串
 * @returns 数值，无效时返回0
 */
function getAttributeNumericValue(attr: AttributeValue | string | undefined): number {
  if (!attr) return 0
  if (typeof attr === 'string') {
    const num = parseInt(attr)
    return isNaN(num) ? 0 : num
  }
  if (typeof attr === 'object' && attr.value) {
    const num = parseInt(attr.value)
    return isNaN(num) ? 0 : num
  }
  return 0
}

/**
 * 计算布尔数组中true的数量
 * @param boolArray 布尔数组
 * @returns true的数量
 */
function countTrueValues(boolArray: boolean[] | undefined): number {
  if (!boolArray) return 0
  return boolArray.filter(Boolean).length
}

/**
 * 计算布尔数组的最大容量
 * @param boolArray 布尔数组
 * @returns 数组长度
 */
function getMaxCapacity(boolArray: boolean[] | undefined): number {
  if (!boolArray) return 0
  return boolArray.length
}

/**
 * 将角色数据导出为骰子格式
 * @param sheetData 角色表单数据
 * @returns .st命令字符串
 */
export function exportToSealDice(sheetData: SheetData): string {
  const attributes: string[] = []

  // 基础属性 - 对应daggerheart.js中的六大属性
  const agility = getAttributeNumericValue(sheetData.agility)
  const strength = getAttributeNumericValue(sheetData.strength)
  const instinct = getAttributeNumericValue(sheetData.instinct)
  const knowledge = getAttributeNumericValue(sheetData.knowledge)
  const presence = getAttributeNumericValue(sheetData.presence)
  const finesse = getAttributeNumericValue(sheetData.finesse)

  attributes.push(`敏捷${agility}`)
  attributes.push(`力量${strength}`)
  attributes.push(`本能${instinct}`)
  attributes.push(`知识${knowledge}`)
  attributes.push(`风度${presence}`)
  attributes.push(`灵巧${finesse}`)

  // 状态数值 - 生命值：存档中的值表示损失，实际值 = 最大值 - 损失值
  const hpDamage = countTrueValues(sheetData.hp)
  const maxHp = sheetData.hpMax || getMaxCapacity(sheetData.hp) || 6
  const currentHp = maxHp - hpDamage
  attributes.push(`生命${currentHp}`)
  attributes.push(`生命上限${maxHp}`)

  const currentStress = countTrueValues(sheetData.stress)
  const maxStress = sheetData.stressMax || getMaxCapacity(sheetData.stress) || 6
  attributes.push(`压力${currentStress}`)
  attributes.push(`压力上限${maxStress}`)

  const currentHope = countTrueValues(sheetData.hope)
  // 希望上限通常是6，从hope数组长度获取
  const maxHope = getMaxCapacity(sheetData.hope) || 6
  attributes.push(`希望${currentHope}`)
  attributes.push(`希望上限${maxHope}`)

  // 护甲值：存档中的值表示损失，实际值 = 最大值 - 损失值
  const armorDamage = countTrueValues(sheetData.armorBoxes)
  const maxArmor = sheetData.armorMax || getMaxCapacity(sheetData.armorBoxes) || 0
  const currentArmor = maxArmor - armorDamage
  attributes.push(`护甲${currentArmor}`)
  attributes.push(`护甲上限${maxArmor}`)

  // GM恐惧值 - 默认为0，上限12
  attributes.push(`恐惧0`)
  attributes.push(`恐惧上限12`)

  // 闪避值
  const evasion = sheetData.evasion ? parseInt(sheetData.evasion) : 0
  attributes.push(`闪避${evasion}`)

  // 阈值
  const minorThreshold = sheetData.minorThreshold ? parseInt(sheetData.minorThreshold) : 0
  const majorThreshold = sheetData.majorThreshold ? parseInt(sheetData.majorThreshold) : 0
  attributes.push(`重伤阈值${minorThreshold}`)
  attributes.push(`严重阈值${majorThreshold}`)

  // 经历属性 - 从experience数组中获取
  if (sheetData.experience && sheetData.experienceValues) {
    for (let i = 0; i < sheetData.experience.length; i++) {
      const expName = sheetData.experience[i]
      const expValue = sheetData.experienceValues[i]
      
      if (expName && expName.trim() && expValue) {
        const numValue = parseInt(expValue)
        if (!isNaN(numValue)) {
          // 清理经历名称，移除特殊字符，确保骰子系统能正确识别
          const cleanName = expName.trim().replace(/[<>]/g, '')
          attributes.push(`${cleanName}${numValue}`)
        }
      }
    }
  }

  // 伙伴经历属性
  if (sheetData.companionExperience && sheetData.companionExperienceValue) {
    for (let i = 0; i < sheetData.companionExperience.length; i++) {
      const expName = sheetData.companionExperience[i]
      const expValue = sheetData.companionExperienceValue[i]
      
      if (expName && expName.trim() && expValue) {
        const numValue = parseInt(expValue)
        if (!isNaN(numValue)) {
          // 为伙伴经历添加前缀以区分
          const cleanName = expName.trim().replace(/[<>]/g, '')
          attributes.push(`伙伴${cleanName}${numValue}`)
        }
      }
    }
  }

  // 生成最终的.st命令
  return `.st ${attributes.join('')}`
}

/**
 * 验证导出的字符串是否符合骰子格式
 * @param exportString 导出的字符串
 * @returns 是否有效
 */
export function validateSealDiceFormat(exportString: string): boolean {
  // 基本格式检查：应该以.st开头，包含属性名<值>的格式
  if (!exportString.startsWith('.st ')) {
    return false
  }

  // 检查是否包含属性格式 (属性名+数字)
  const attributePattern = /[\u4e00-\u9fa5\w]+\d+/g
  const matches = exportString.match(attributePattern)
  
  return matches !== null && matches.length > 0
}