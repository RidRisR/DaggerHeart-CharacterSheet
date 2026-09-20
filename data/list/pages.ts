/**
 * 页面配置数据 - 统一管理所有页面的标签和信息
 */

import type { CharacterPageVisibility, OptionalPageKey } from '@/character/page-visibility'

export interface PageConfig {
  id: 'page1' | 'page2' | 'page3' | 'adventure-notes' | 'page4' | 'beast-forms'
  label: string
  description: string
  alwaysVisible: boolean
  visibilityKey?: OptionalPageKey
}

export const pageConfigs: PageConfig[] = [
  {
    id: 'page1',
    label: '第一页',
    description: '角色基础信息',
    alwaysVisible: true
  },
  {
    id: 'page2',
    label: '第二页',
    description: '角色详细属性',
    alwaysVisible: true
  },
  {
    id: 'page3',
    label: '游侠伙伴',
    description: '游侠专用伙伴表',
    alwaysVisible: false,
    visibilityKey: 'rangerCompanion'
  },
  {
    id: 'page4',
    label: '主板扩展',
    description: '伊科尼斯武装表',
    alwaysVisible: false,
    visibilityKey: 'armorTemplate'
  },
  {
    id: 'beast-forms',
    label: '野兽形态',
    description: '德鲁伊野兽形态参考表',
    alwaysVisible: false,
    visibilityKey: 'beastForms'
  },
  {
    id: 'adventure-notes',
    label: '冒险笔记',
    description: '角色背景与冒险记录',
    alwaysVisible: false,
    visibilityKey: 'adventureNotes'
  }
]

/**
 * 获取可见的页面配置
 */
export function getVisiblePageConfigs(pageVisibility?: Partial<CharacterPageVisibility>) {
  return pageConfigs.filter(config => {
    if (config.alwaysVisible) return true
    if (!config.visibilityKey) return false
    return pageVisibility?.[config.visibilityKey] || false
  })
}

/**
 * 获取可选页面配置（用于下拉菜单）
 */
export function getOptionalPageConfigs() {
  return pageConfigs.filter(config => !config.alwaysVisible)
}
