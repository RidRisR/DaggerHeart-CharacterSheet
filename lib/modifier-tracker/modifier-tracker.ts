/**
 * 调整值统计器 - 核心计算引擎
 *
 * ModifierTracker 负责协调所有 Provider，收集和计算调整值
 */

import type { AttributeModifiers, Modifier } from './types'
import type { SheetData } from '@/lib/sheet-data'
import type { IModifierProvider } from './provider-interface'
import { getAttributeConfig } from './attributes'
import {
  WeaponModifierProvider,
  ArmorModifierProvider,
  CardModifierProvider,
  UpgradeModifierProvider
} from './providers'

/**
 * 调整值追踪器
 *
 * 单例模式，统一管理所有调整值的收集和计算
 */
export class ModifierTracker {
  private providers: IModifierProvider[] = []

  constructor() {
    // 注册所有 Provider
    this.providers = [
      new WeaponModifierProvider(),
      new ArmorModifierProvider(),
      new CardModifierProvider(),
      new UpgradeModifierProvider(),
    ]
  }

  /**
   * 获取指定属性的完整调整值信息
   *
   * @param attribute - 属性名称（如 'evasion', 'armorValue'）
   * @param sheetData - 完整的角色表数据
   * @returns 属性的完整调整值信息
   * @throws 如果属性配置不存在
   */
  getAttributeModifiers(
    attribute: string,
    sheetData: SheetData
  ): AttributeModifiers {
    // 1. 获取属性配置
    const config = getAttributeConfig(attribute)
    if (!config) {
      throw new Error(`Unknown attribute: ${attribute}`)
    }

    // 2. 获取基础值
    const baseValue = config.baseValueGetter(sheetData)

    // 3. 收集所有调整值
    const allModifiers: Modifier[] = this.providers
      .flatMap(provider => provider.getModifiers(sheetData))
      .filter(modifier => modifier.attribute === attribute)

    // 4. 分类调整值
    const bonuses = allModifiers.filter(m => m.modifierType === 'bonus')
    const penalties = allModifiers.filter(m => m.modifierType === 'penalty')

    // 5. 计算总值
    const bonusTotal = bonuses.reduce((sum, m) => sum + m.value, 0)
    const penaltyTotal = penalties.reduce((sum, m) => sum + m.value, 0)
    const total = baseValue + bonusTotal - penaltyTotal

    return {
      attribute,
      attributeLabel: config.label,
      baseValue,
      bonuses,
      penalties,
      total
    }
  }

  /**
   * 注册新的 Provider（用于扩展）
   *
   * @param provider - Provider 实例
   */
  registerProvider(provider: IModifierProvider): void {
    this.providers.push(provider)
  }

  /**
   * 获取所有已注册的 Provider（用于调试）
   *
   * @returns Provider 列表
   */
  getProviders(): IModifierProvider[] {
    return [...this.providers]
  }
}

/**
 * 导出单例实例
 *
 * 使用方式：
 * ```typescript
 * import { modifierTracker } from '@/lib/modifier-tracker'
 *
 * const modifiers = modifierTracker.getAttributeModifiers('evasion', sheetData)
 * ```
 */
export const modifierTracker = new ModifierTracker()
