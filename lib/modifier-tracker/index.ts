/**
 * 调整值统计器 - 统一导出
 *
 * 公共 API 入口
 */

// 核心类型
export type {
  ModifierDeclaration,
  WithModifiers,
  Modifier,
  AttributeModifiers,
} from './types'

export {
  ModifierType,
  ModifierSourceType,
} from './types'

// 属性配置
export type { AttributeConfig } from './attributes'
export {
  getAttributeConfig,
  getAllAttributeConfigs,
  getAttributeConfigsByCategory,
} from './attributes'

// Provider 接口
export type { IModifierProvider } from './provider-interface'

// 计算引擎（导出单例）
export { modifierTracker, ModifierTracker } from './modifier-tracker'

// 升级项配置
export type { UpgradeConfig } from './upgrade-effects'
export {
  getUpgradeConfig,
  getAllUpgradeConfigs,
  UPGRADE_CONFIGS,
} from './upgrade-effects'
