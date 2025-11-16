/**
 * 调整值统计器 - 属性配置
 *
 * 定义所有支持调整值追踪的属性
 */

import type { SheetData } from '@/lib/sheet-data'
import { safeEvaluateExpression } from '@/lib/number-utils'

/**
 * 属性配置接口
 */
export interface AttributeConfig {
  /**
   * 属性在 SheetData 中的字段名
   */
  key: string

  /**
   * 属性显示名称（中文）
   */
  label: string

  /**
   * 获取基础值的函数
   *
   * 注意：此函数应该返回"基础值"，不包含任何调整值
   * 如果 SheetData 中的字段已经包含了调整值，需要特殊处理
   */
  baseValueGetter: (data: SheetData) => number

  /**
   * 属性分类
   * - combat: 战斗属性（闪避、护甲等）
   * - resource: 资源属性（生命、压力等）
   * - stat: 基础属性（力量、敏捷等）
   */
  category: 'combat' | 'resource' | 'stat'
}

/**
 * 所有支持的属性配置表
 *
 * 第一阶段仅实现：闪避值、护甲值
 */
export const ATTRIBUTE_CONFIGS: Record<string, AttributeConfig> = {
  /**
   * 闪避值配置
   */
  evasion: {
    key: 'evasion',
    label: '闪避值',
    baseValueGetter: (data) => {
      // 解析闪避值字符串，支持表达式如 "12+3"
      // 注意：这里获取的是用户输入的值，可能已包含调整值
      // 理想情况下应该有单独的 baseEvasion 字段，但当前没有
      // 所以暂时使用 evasion 字段作为"基础值"
      return safeEvaluateExpression(data.evasion || '0')
    },
    category: 'combat'
  },

  /**
   * 护甲值配置
   */
  armorValue: {
    key: 'armorValue',
    label: '护甲值',
    baseValueGetter: (data) => {
      // 同理，解析护甲值字符串
      return safeEvaluateExpression(data.armorValue || '0')
    },
    category: 'combat'
  },

  // 后续扩展：生命上限、压力上限等
  // hpMax: {
  //   key: 'hpMax',
  //   label: '生命上限',
  //   baseValueGetter: (data) => data.hpMax || 0,
  //   category: 'resource'
  // },
  //
  // stressMax: {
  //   key: 'stressMax',
  //   label: '压力上限',
  //   baseValueGetter: (data) => data.stressMax || 0,
  //   category: 'resource'
  // },
}

/**
 * 获取属性配置
 *
 * @param attribute - 属性名称
 * @returns 属性配置，如果不存在则返回 undefined
 */
export function getAttributeConfig(attribute: string): AttributeConfig | undefined {
  return ATTRIBUTE_CONFIGS[attribute]
}

/**
 * 获取所有支持的属性列表
 *
 * @returns 属性配置数组
 */
export function getAllAttributeConfigs(): AttributeConfig[] {
  return Object.values(ATTRIBUTE_CONFIGS)
}

/**
 * 按分类获取属性配置
 *
 * @param category - 属性分类
 * @returns 该分类下的所有属性配置
 */
export function getAttributeConfigsByCategory(
  category: 'combat' | 'resource' | 'stat'
): AttributeConfig[] {
  return Object.values(ATTRIBUTE_CONFIGS).filter(
    config => config.category === category
  )
}
