/**
 * 调整值统计器 - 核心类型定义
 *
 * 本模块定义了调整值系统的所有核心类型接口
 */

// ============================================
// 数据层：数据源声明接口
// ============================================

/**
 * 调整值声明 - 由数据源自己声明提供的调整值
 *
 * 使用场景：
 * - 武器数据中声明：巨剑提供 闪避值-1
 * - 护甲数据中声明：轻甲提供 闪避值+2，护甲值+11
 * - 卡牌数据中声明：职业卡提供 起始闪避+3
 * - 升级项配置中声明：Tier1升级提供 闪避值+1
 *
 * @example
 * ```typescript
 * // 巨剑减少闪避值
 * {
 *   attribute: 'evasion',
 *   type: 'penalty',
 *   value: 1,
 *   description: '巨型武器笨重，降低闪避'
 * }
 * ```
 */
export interface ModifierDeclaration {
  /**
   * 影响的属性名
   * @example 'evasion', 'armorValue', 'hpMax'
   */
  attribute: string

  /**
   * 调整类型
   * - 'bonus': 加值（正向调整）
   * - 'penalty': 减值（负向调整）
   * - 'complex': 复杂调整（预留，暂未实现）
   */
  type: 'bonus' | 'penalty' | 'complex'

  /**
   * 调整数值（绝对值）
   * @example 1, 2, 5
   */
  value: number

  /**
   * 描述信息（可选）
   * 用于 UI 展示更友好的说明
   * @example '巨型武器笨重，降低闪避'
   */
  description?: string

  /**
   * 生效条件（可选）
   * @example '装备时', '战斗中', '对特定敌人'
   */
  condition?: string
}

/**
 * 混入接口 - 标记数据源可提供调整值
 *
 * 任何数据结构（武器、护甲、卡牌等）通过 extends 此接口
 * 即可声明自己提供的调整值
 */
export interface WithModifiers {
  /**
   * 调整值声明列表
   */
  modifiers?: ModifierDeclaration[]
}

// ============================================
// 计算层：运行时类型
// ============================================

/**
 * 调整值类型枚举
 */
export enum ModifierType {
  Bonus = 'bonus',      // 加值
  Penalty = 'penalty',  // 减值
  Complex = 'complex'   // 复杂（预留）
}

/**
 * 调整值来源类型枚举
 */
export enum ModifierSourceType {
  Weapon = 'weapon',    // 武器
  Armor = 'armor',      // 护甲
  Card = 'card',        // 卡牌
  Upgrade = 'upgrade',  // 升级项
  Base = 'base',        // 基础值
}

/**
 * 运行时调整值 - 用于计算和展示
 *
 * Provider 将数据源的 ModifierDeclaration 转换为此类型
 */
export interface Modifier {
  /**
   * 唯一标识符（用于 React key）
   * @example 'weapon-巨剑-0', 'armor-轻甲-1'
   */
  id: string

  /**
   * 影响的属性
   * @example 'evasion', 'armorValue'
   */
  attribute: string

  /**
   * 来源类型
   */
  sourceType: ModifierSourceType

  /**
   * 来源名称（用于显示）
   * @example '巨剑', '轻型护甲', '游侠'
   */
  sourceName: string

  /**
   * 来源唯一ID（可选，用于溯源）
   * @example 卡牌ID、升级项checkKey
   */
  sourceId?: string

  /**
   * 调整值类型
   */
  modifierType: ModifierType

  /**
   * 调整数值
   */
  value: number

  /**
   * 描述信息（可选）
   */
  description?: string
}

/**
 * 属性的完整调整值信息 - 用于 UI 展示
 */
export interface AttributeModifiers {
  /**
   * 属性名称
   * @example 'evasion'
   */
  attribute: string

  /**
   * 属性显示名称
   * @example '闪避值'
   */
  attributeLabel: string

  /**
   * 基础值
   */
  baseValue: number

  /**
   * 所有加值
   */
  bonuses: Modifier[]

  /**
   * 所有减值
   */
  penalties: Modifier[]

  /**
   * 最终计算结果
   * total = baseValue + sum(bonuses) - sum(penalties)
   */
  total: number
}
