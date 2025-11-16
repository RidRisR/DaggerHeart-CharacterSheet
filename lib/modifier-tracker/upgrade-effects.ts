/**
 * 调整值统计器 - 升级项配置
 *
 * 定义所有升级项提供的调整值效果
 * 注意：这是初始配置，需要根据实际升级项逐步完善
 */

import type { ModifierDeclaration } from './types'

/**
 * 升级项配置接口
 */
export interface UpgradeConfig {
  /**
   * 升级项 key
   * 格式：tier{N}-{optionIndex}-{boxIndex}
   * @example 'tier1-5-0', 'tier2-1'
   */
  checkKey: string

  /**
   * 显示名称
   * @example '闪避值 +1', '生命槽 +1'
   */
  label: string

  /**
   * 调整值声明列表
   */
  modifiers: ModifierDeclaration[]
}

/**
 * 升级项配置表
 *
 * TODO: 需要根据实际升级项完整填写
 * 当前仅包含示例配置，用于测试框架
 */
export const UPGRADE_CONFIGS: UpgradeConfig[] = [
  // ============================================
  // Tier 1 升级项示例
  // ============================================
  {
    checkKey: 'tier1-5-0',
    label: '闪避值 +1',
    modifiers: [
      {
        attribute: 'evasion',
        type: 'bonus',
        value: 1,
        description: 'Tier 1 升级'
      }
    ]
  },

  // 示例：生命槽升级
  // {
  //   checkKey: 'tier1-1-0',
  //   label: '生命槽 +1',
  //   modifiers: [
  //     {
  //       attribute: 'hpMax',
  //       type: 'bonus',
  //       value: 1,
  //       description: 'Tier 1 升级'
  //     }
  //   ]
  // },

  // ============================================
  // Tier 2 升级项示例
  // ============================================
  // TODO: 添加 Tier 2 升级项配置

  // ============================================
  // Tier 3 升级项示例
  // ============================================
  // TODO: 添加 Tier 3 升级项配置
]

/**
 * 根据 checkKey 查找升级项配置
 *
 * @param checkKey - 升级项 key
 * @returns 配置对象，如果不存在则返回 undefined
 */
export function getUpgradeConfig(checkKey: string): UpgradeConfig | undefined {
  return UPGRADE_CONFIGS.find(cfg => cfg.checkKey === checkKey)
}

/**
 * 获取所有升级项配置
 *
 * @returns 所有升级项配置数组
 */
export function getAllUpgradeConfigs(): UpgradeConfig[] {
  return UPGRADE_CONFIGS
}
