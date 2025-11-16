# 调整值统计器设计文档 v2.0

> 基于数据自描述架构的属性调整值追踪系统

---

## 1. 概述

### 1.1 功能定位

调整值统计器是一个用于**追踪和展示角色属性调整值来源**的系统。它能够：

- 统一收集来自不同数据源（武器、护甲、卡牌、升级项）的调整值
- 提供透明的调整值溯源信息
- 为用户提供直观的调整值明细查看界面

### 1.2 核心设计理念：数据自描述

本系统采用**数据自描述（Self-Describing Data）**架构：

**核心原则**：
- 每个数据源（武器、护甲、卡牌等）**自己声明**提供什么调整值
- Provider **只负责收集**这些声明，不负责解析或猜测
- 数据和效果统一存储，数据即文档

**优势**：
| 方面 | 传统解析方式 | 数据自描述方式 ✅ |
|------|------------|-----------------|
| **数据完整性** | 效果信息分散，易遗漏 | 数据和效果统一，一目了然 |
| **维护成本** | 需维护单独的映射表 | 直接修改数据源 |
| **扩展性** | 新增效果需修改 Provider 代码 | 只需修改数据 |
| **可读性** | 需查看代码理解效果 | 看数据即可理解 |
| **错误风险** | 映射表可能与描述不一致 | 数据即文档，不会脱节 |

### 1.3 使用场景

**用户交互流程**：

1. 用户在角色表上看到某个属性值（如：闪避值 = 15）
2. 点击属性旁边的 **"?"** 信息按钮
3. 弹出详情面板，显示：

```
闪避值调整明细
━━━━━━━━━━━━━━━━━━━━
基础值:  12

加值来源:
  🛡️ 轻型护甲           +2
  ✨ 敏捷专精 (卡牌)     +1

减值来源:
  ⚔️ 巨剑 (武器)        -1

━━━━━━━━━━━━━━━━━━━━
总计:  14
```

### 1.4 试验范围

**第一阶段（当前专注）**：
- ✅ **闪避值** (evasion)
- ✅ **护甲值** (armorValue)

**后续扩展**（框架支持，暂不实现）：
- 生命上限 (hpMax)
- 压力上限 (stressMax)
- 六大属性（力量、敏捷、灵巧、风度、本能、知识）
- 熟练度、伤害阈值等

---

## 2. 架构设计

### 2.1 核心类型定义

#### 2.1.1 调整值声明接口（数据层）

数据源用于**声明**自己提供的调整值：

```typescript
// lib/modifier-tracker/types.ts

/**
 * 调整值声明 - 由数据源自己声明
 *
 * 使用场景：
 * - 武器数据中声明：巨剑提供 闪避值-1
 * - 护甲数据中声明：轻甲提供 闪避值+2，护甲值+11
 * - 卡牌数据中声明：职业卡提供 起始闪避+3
 * - 升级项配置中声明：Tier1升级提供 闪避值+1
 */
export interface ModifierDeclaration {
  attribute: string          // 影响的属性名 (如 'evasion', 'armorValue')
  type: 'bonus' | 'penalty' | 'complex'  // 调整类型
  value: number             // 数值（绝对值）
  description?: string      // 描述（可选，用于详情显示）
  condition?: string        // 生效条件（可选，如 "装备时"、"战斗中"）
}

/**
 * 混入接口 - 标记数据源可提供调整值
 */
export interface WithModifiers {
  modifiers?: ModifierDeclaration[]
}
```

**设计要点**：
- `attribute`: 使用字符串而非枚举，保持灵活性
- `type`: 简单分类，复杂逻辑由 Provider 自行处理
- `value`: 存储绝对值，type 决定正负
- `description`: 可选，用于 UI 展示更友好的说明

#### 2.1.2 调整值运行时类型（计算层）

Provider 收集声明后转换为运行时调整值：

```typescript
// lib/modifier-tracker/types.ts

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
 */
export interface Modifier {
  id: string                        // 唯一标识符（用于 React key）
  attribute: string                 // 影响的属性
  sourceType: ModifierSourceType    // 来源类型
  sourceName: string                // 来源名称（用于显示）
  sourceId?: string                 // 来源ID（可选，用于溯源）
  modifierType: ModifierType        // 调整值类型
  value: number                     // 调整数值
  description?: string              // 描述信息
}

/**
 * 属性的完整调整值信息 - 用于 UI 展示
 */
export interface AttributeModifiers {
  attribute: string                 // 属性名称
  attributeLabel: string            // 属性显示名称（如 "闪避值"）
  baseValue: number                 // 基础值
  bonuses: Modifier[]               // 所有加值
  penalties: Modifier[]             // 所有减值
  total: number                     // 最终计算结果
}
```

#### 2.1.3 属性配置

```typescript
// lib/modifier-tracker/attributes.ts

import type { SheetData } from '@/lib/sheet-data'
import { safeEvaluateExpression } from '@/lib/number-utils'

/**
 * 属性配置
 */
export interface AttributeConfig {
  key: string                                    // 属性字段名
  label: string                                  // 显示名称
  baseValueGetter: (data: SheetData) => number  // 基础值获取函数
  category: 'combat' | 'resource' | 'stat'      // 分类
}

/**
 * 支持的属性配置表
 */
export const ATTRIBUTE_CONFIGS: Record<string, AttributeConfig> = {
  evasion: {
    key: 'evasion',
    label: '闪避值',
    baseValueGetter: (data) => {
      // 注意：这里获取的是"基础值"，不包含任何调整
      // 如果 data.evasion 已包含调整值，需要调整逻辑
      return safeEvaluateExpression(data.evasion || '0')
    },
    category: 'combat'
  },
  armorValue: {
    key: 'armorValue',
    label: '护甲值',
    baseValueGetter: (data) => {
      return safeEvaluateExpression(data.armorValue || '0')
    },
    category: 'combat'
  },
  // 后续扩展：hpMax, stressMax 等
}
```

---

### 2.2 数据源扩展方案

#### 2.2.1 武器数据扩展

**文件**: `data/list/primary-weapon.ts`, `data/list/secondary-weapon.ts`

**扩展接口**:
```typescript
import type { WithModifiers } from '@/lib/modifier-tracker/types'

export interface Weapon extends WithModifiers {
  名称: string
  等级: "T1" | "T2" | "T3" | "T4"
  检定: "敏捷" | "灵巧" | "知识" | "力量" | "本能" | "风度"
  属性: "物理" | "魔法"
  范围: "近战" | "邻近" | "远距离" | "极远" | "近距离"
  伤害: string
  负荷: string
  特性名称: string
  描述: string

  // 新增：调整值声明
  modifiers?: ModifierDeclaration[]
}
```

**示例 1：巨剑（减少闪避值）**
```typescript
{
  名称: "巨剑",
  等级: "T1",
  检定: "力量",
  属性: "物理",
  范围: "近战",
  伤害: "d10+3",
  负荷: "双手",
  特性名称: "巨型",
  描述: "闪避值-1，额外掷一个伤害骰并去掉其中最小的一个。",

  modifiers: [
    {
      attribute: 'evasion',
      type: 'penalty',
      value: 1,
      description: '巨型武器笨重，降低闪避'
    }
  ]
}
```

**示例 2：拉布里斯斧（增加护甲值）**
```typescript
{
  名称: "拉布里斯斧",
  等级: "T3",
  检定: "力量",
  属性: "物理",
  范围: "近战",
  伤害: "d10+7",
  负荷: "双手",
  特性名称: "保护",
  描述: "护甲值+1。",

  modifiers: [
    {
      attribute: 'armorValue',
      type: 'bonus',
      value: 1,
      description: '保护特性提供额外防护'
    }
  ]
}
```

#### 2.2.2 护甲数据扩展

**文件**: `data/list/armor.ts`

**扩展接口**:
```typescript
import type { WithModifiers } from '@/lib/modifier-tracker/types'

export interface ArmorItem extends WithModifiers {
  名称: string
  护甲值: string
  闪避加值: string
  阈值: string
  特性: string

  // 新增：调整值声明
  modifiers?: ModifierDeclaration[]
}
```

**示例：轻型护甲**
```typescript
{
  名称: "轻型护甲",
  护甲值: "11",
  闪避加值: "+2",
  阈值: "12/17",
  特性: "灵活、轻便...",

  modifiers: [
    {
      attribute: 'evasion',
      type: 'bonus',
      value: 2,
      description: '轻型护甲提供闪避加值'
    },
    {
      attribute: 'armorValue',
      type: 'bonus',
      value: 11,
      description: '护甲基础值'
    }
  ]
}
```

**示例：重型护甲**
```typescript
{
  名称: "重型护甲",
  护甲值: "15",
  闪避加值: "-1",
  阈值: "15/20",
  特性: "坚固、沉重...",

  modifiers: [
    {
      attribute: 'evasion',
      type: 'penalty',
      value: 1,
      description: '重型护甲降低闪避'
    },
    {
      attribute: 'armorValue',
      type: 'bonus',
      value: 15,
      description: '护甲基础值'
    }
  ]
}
```

#### 2.2.3 卡牌数据扩展

**文件**: `card/card-types.ts`

**扩展接口**:
```typescript
import type { WithModifiers } from '@/lib/modifier-tracker/types'

export interface StandardCard extends WithModifiers {
  standarized: boolean
  id: string
  name: string
  type: string
  class: string
  level?: number
  description?: string
  // ... 其他现有字段

  professionSpecial?: {
    "起始生命": number
    "起始闪避": number
    "起始物品": string
    "希望特性": string
  }

  // 新增：调整值声明
  modifiers?: ModifierDeclaration[]
}
```

**示例：职业卡（游侠）**
```typescript
{
  id: "profession-ranger",
  name: "游侠",
  type: "profession",
  class: "游侠",
  professionSpecial: {
    "起始生命": 5,
    "起始闪避": 13,
    "起始物品": "...",
    "希望特性": "..."
  },

  // 方式一：使用 modifiers（新格式，推荐）
  modifiers: [
    {
      attribute: 'hpMax',
      type: 'bonus',
      value: 5,
      description: '游侠起始生命'
    },
    {
      attribute: 'evasion',
      type: 'bonus',
      value: 13,
      description: '游侠起始闪避'
    }
  ]

}
```


#### 2.2.4 升级项配置

**文件**: `lib/modifier-tracker/upgrade-effects.ts`（新建）

升级项不在原始数据中，需要创建配置文件：

```typescript
import type { ModifierDeclaration } from './types'

/**
 * 升级项配置
 */
export interface UpgradeConfig {
  checkKey: string              // 升级项 key (如 "tier1-5-0")
  label: string                 // 显示名称
  modifiers: ModifierDeclaration[]
}

/**
 * 升级项配置表
 */
export const UPGRADE_CONFIGS: UpgradeConfig[] = [
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
  {
    checkKey: 'tier1-1-0',
    label: '生命槽 +1',
    modifiers: [
      {
        attribute: 'hpMax',
        type: 'bonus',
        value: 1,
        description: 'Tier 1 升级'
      }
    ]
  },
  // ... 更多升级项配置
  // TODO: 需要根据实际升级项完整填写
]

/**
 * 辅助函数：根据 checkKey 查找配置
 */
export function getUpgradeConfig(checkKey: string): UpgradeConfig | undefined {
  return UPGRADE_CONFIGS.find(cfg => cfg.checkKey === checkKey)
}
```

---

### 2.3 Provider 系统

#### 2.3.1 Provider 接口

```typescript
// lib/modifier-tracker/provider-interface.ts

import type { Modifier } from './types'
import type { SheetData } from '@/lib/sheet-data'

/**
 * 调整值提供者接口
 *
 * 职责：从 SheetData 中收集数据源声明的调整值
 */
export interface IModifierProvider {
  readonly name: string  // 提供者名称（用于调试）

  /**
   * 收集调整值
   * @param sheetData - 完整的角色表数据
   * @returns 调整值数组
   */
  getModifiers(sheetData: SheetData): Modifier[]
}
```

#### 2.3.2 Provider 实现

##### A. 武器 Provider

```typescript
// lib/modifier-tracker/providers/weapon-provider.ts

import type { IModifierProvider } from '../provider-interface'
import type { Modifier, ModifierDeclaration, ModifierSourceType, ModifierType } from '../types'
import type { SheetData } from '@/lib/sheet-data'
import { primaryWeaponList } from '@/data/list/primary-weapon'
import { secondaryWeaponList } from '@/data/list/secondary-weapon'

export class WeaponModifierProvider implements IModifierProvider {
  readonly name = 'WeaponProvider'

  getModifiers(sheetData: SheetData): Modifier[] {
    const modifiers: Modifier[] = []

    // 主武器
    if (sheetData.primaryWeaponName) {
      const weapon = primaryWeaponList.find(w => w.名称 === sheetData.primaryWeaponName)
      if (weapon?.modifiers) {
        modifiers.push(...this.convertDeclarations(
          weapon.modifiers,
          'weapon',
          weapon.名称
        ))
      }
    }

    // 副武器
    if (sheetData.secondaryWeaponName) {
      const weapon = secondaryWeaponList.find(w => w.名称 === sheetData.secondaryWeaponName)
      if (weapon?.modifiers) {
        modifiers.push(...this.convertDeclarations(
          weapon.modifiers,
          'weapon',
          weapon.名称
        ))
      }
    }

    return modifiers
  }

  /**
   * 将声明转换为运行时 Modifier
   */
  private convertDeclarations(
    declarations: ModifierDeclaration[],
    sourceType: ModifierSourceType,
    sourceName: string
  ): Modifier[] {
    return declarations.map((decl, index) => ({
      id: `${sourceType}-${sourceName}-${index}`,
      attribute: decl.attribute,
      sourceType,
      sourceName,
      modifierType: decl.type as ModifierType,
      value: decl.value,
      description: decl.description
    }))
  }
}
```

##### B. 护甲 Provider

```typescript
// lib/modifier-tracker/providers/armor-provider.ts

import type { IModifierProvider } from '../provider-interface'
import type { Modifier } from '../types'
import type { SheetData } from '@/lib/sheet-data'
import { armorItems } from '@/data/list/armor'

export class ArmorModifierProvider implements IModifierProvider {
  readonly name = 'ArmorProvider'

  getModifiers(sheetData: SheetData): Modifier[] {
    const modifiers: Modifier[] = []

    if (sheetData.armorName) {
      const armor = armorItems.find(a => a.名称 === sheetData.armorName)
      if (armor?.modifiers) {
        modifiers.push(...this.convertDeclarations(
          armor.modifiers,
          'armor',
          armor.名称
        ))
      }
    }

    return modifiers
  }

  private convertDeclarations(declarations, sourceType, sourceName) {
    // 同 WeaponProvider
  }
}
```

##### C. 卡牌 Provider

```typescript
// lib/modifier-tracker/providers/card-provider.ts

import type { IModifierProvider } from '../provider-interface'
import type { Modifier } from '../types'
import type { SheetData } from '@/lib/sheet-data'
import { isEmptyCard } from '@/card/card-types'

export class CardModifierProvider implements IModifierProvider {
  readonly name = 'CardProvider'

  getModifiers(sheetData: SheetData): Modifier[] {
    const modifiers: Modifier[] = []

    // 遍历聚焦卡组
    sheetData.cards.forEach((card) => {
      if (isEmptyCard(card)) return

      // 优先读取 modifiers 字段（新格式）
      if (card.modifiers) {
        modifiers.push(...this.convertDeclarations(
          card.modifiers,
          'card',
          card.name,
          card.id
        ))
      }

      // 兼容旧格式：professionSpecial
      if (card.type === 'profession' && card.professionSpecial) {
        const { '起始闪避': evasion, '起始生命': hp } = card.professionSpecial

        if (evasion) {
          modifiers.push({
            id: `card-${card.id}-evasion`,
            attribute: 'evasion',
            sourceType: 'card',
            sourceName: card.name,
            sourceId: card.id,
            modifierType: 'bonus',
            value: evasion,
            description: '职业起始闪避'
          })
        }

        if (hp) {
          modifiers.push({
            id: `card-${card.id}-hp`,
            attribute: 'hpMax',
            sourceType: 'card',
            sourceName: card.name,
            sourceId: card.id,
            modifierType: 'bonus',
            value: hp,
            description: '职业起始生命'
          })
        }
      }
    })

    return modifiers
  }

  private convertDeclarations(declarations, sourceType, sourceName, sourceId?) {
    // 同 WeaponProvider，但需要加上 sourceId
  }
}
```

##### D. 升级项 Provider

```typescript
// lib/modifier-tracker/providers/upgrade-provider.ts

import type { IModifierProvider } from '../provider-interface'
import type { Modifier } from '../types'
import type { SheetData } from '@/lib/sheet-data'
import { getUpgradeConfig } from '../upgrade-effects'

export class UpgradeModifierProvider implements IModifierProvider {
  readonly name = 'UpgradeProvider'

  getModifiers(sheetData: SheetData): Modifier[] {
    const modifiers: Modifier[] = []
    const checkedUpgrades = sheetData.checkedUpgrades

    if (!checkedUpgrades) return modifiers

    // 遍历所有已勾选的升级项
    Object.entries(checkedUpgrades).forEach(([checkKey, checkedMap]) => {
      // 跳过 tier1, tier2, tier3 基础结构
      if (checkKey === 'tier1' || checkKey === 'tier2' || checkKey === 'tier3') {
        return
      }

      // 检查是否有勾选
      const isChecked = Object.values(checkedMap).some(v => v === true)
      if (!isChecked) return

      // 查找配置
      const config = getUpgradeConfig(checkKey)
      if (config?.modifiers) {
        modifiers.push(...this.convertDeclarations(
          config.modifiers,
          'upgrade',
          config.label,
          checkKey
        ))
      }
    })

    return modifiers
  }

  private convertDeclarations(declarations, sourceType, sourceName, sourceId) {
    // 同 WeaponProvider
  }
}
```

---

### 2.4 调整值计算引擎

```typescript
// lib/modifier-tracker/modifier-tracker.ts

import type { AttributeModifiers, Modifier } from './types'
import type { SheetData } from '@/lib/sheet-data'
import { ATTRIBUTE_CONFIGS } from './attributes'
import { WeaponModifierProvider } from './providers/weapon-provider'
import { ArmorModifierProvider } from './providers/armor-provider'
import { CardModifierProvider } from './providers/card-provider'
import { UpgradeModifierProvider } from './providers/upgrade-provider'

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
   */
  getAttributeModifiers(
    attribute: string,
    sheetData: SheetData
  ): AttributeModifiers {
    const config = ATTRIBUTE_CONFIGS[attribute]
    if (!config) {
      throw new Error(`Unknown attribute: ${attribute}`)
    }

    // 1. 获取基础值
    const baseValue = config.baseValueGetter(sheetData)

    // 2. 收集所有调整值
    const allModifiers: Modifier[] = this.providers
      .flatMap(provider => provider.getModifiers(sheetData))
      .filter(modifier => modifier.attribute === attribute)

    // 3. 分类
    const bonuses = allModifiers.filter(m => m.modifierType === 'bonus')
    const penalties = allModifiers.filter(m => m.modifierType === 'penalty')

    // 4. 计算总值
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
   * 注册新的 Provider（扩展用）
   */
  registerProvider(provider: IModifierProvider): void {
    this.providers.push(provider)
  }
}

// 导出单例
export const modifierTracker = new ModifierTracker()
```

---

## 3. UI 设计

### 3.1 来源图标组件

```tsx
// components/modifier-tracker/source-type-icon.tsx

import { Shield, Sword, Sparkles, TrendingUp } from 'lucide-react'
import type { ModifierSourceType } from '@/lib/modifier-tracker/types'

const ICON_MAP: Record<ModifierSourceType, React.ComponentType> = {
  weapon: Sword,
  armor: Shield,
  card: Sparkles,
  upgrade: TrendingUp,
  base: () => null,
}

interface Props {
  type: ModifierSourceType
  className?: string
}

export function SourceTypeIcon({ type, className }: Props) {
  const Icon = ICON_MAP[type]
  if (!Icon) return null
  return <Icon className={className} />
}
```

### 3.2 调整值详情弹窗

```tsx
// components/modifier-tracker/modifier-info-dialog.tsx

"use client"

import { useMemo } from 'react'
import { useSheetStore } from '@/lib/sheet-store'
import { modifierTracker } from '@/lib/modifier-tracker'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SourceTypeIcon } from './source-type-icon'

interface Props {
  attribute: string
  open: boolean
  onClose: () => void
}

export function ModifierInfoDialog({ attribute, open, onClose }: Props) {
  const { sheetData } = useSheetStore()

  // 自动刷新：当 sheetData 变化时重新计算
  const modifierInfo = useMemo(
    () => modifierTracker.getAttributeModifiers(attribute, sheetData),
    [attribute, sheetData]
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {modifierInfo.attributeLabel} 调整值明细
            <span className="text-2xl font-bold text-blue-600">
              {modifierInfo.total}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 基础值 */}
          <div className="flex justify-between items-center py-2 border-b">
            <span className="font-medium text-gray-700">基础值</span>
            <span className="text-lg font-semibold">{modifierInfo.baseValue}</span>
          </div>

          {/* 加值列表 */}
          {modifierInfo.bonuses.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-green-700 mb-2">
                加值来源
              </h4>
              <div className="space-y-1">
                {modifierInfo.bonuses.map(mod => (
                  <div
                    key={mod.id}
                    className="flex justify-between items-center px-3 py-2 bg-green-50 rounded-md border border-green-200"
                  >
                    <div className="flex items-center gap-2">
                      <SourceTypeIcon type={mod.sourceType} className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-800">{mod.sourceName}</span>
                    </div>
                    <span className="text-sm font-bold text-green-600">
                      +{mod.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 减值列表 */}
          {modifierInfo.penalties.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-red-700 mb-2">
                减值来源
              </h4>
              <div className="space-y-1">
                {modifierInfo.penalties.map(mod => (
                  <div
                    key={mod.id}
                    className="flex justify-between items-center px-3 py-2 bg-red-50 rounded-md border border-red-200"
                  >
                    <div className="flex items-center gap-2">
                      <SourceTypeIcon type={mod.sourceType} className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-gray-800">{mod.sourceName}</span>
                    </div>
                    <span className="text-sm font-bold text-red-600">
                      -{mod.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 无调整值提示 */}
          {modifierInfo.bonuses.length === 0 && modifierInfo.penalties.length === 0 && (
            <p className="text-center text-gray-500 py-6 text-sm">
              暂无额外调整值
            </p>
          )}

          {/* 总计 */}
          <div className="flex justify-between items-center py-3 border-t-2 border-gray-300">
            <span className="font-bold text-gray-800">总计</span>
            <span className="text-2xl font-bold text-blue-600">
              {modifierInfo.total}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### 3.3 信息按钮

```tsx
// components/modifier-tracker/modifier-info-button.tsx

"use client"

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { ModifierInfoDialog } from './modifier-info-dialog'
import { cn } from '@/lib/utils'

interface Props {
  attribute: string
  className?: string
}

export function ModifierInfoButton({ attribute, className }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center justify-center",
          "w-4 h-4 rounded-full",
          "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
          "transition-colors print:hidden",
          className
        )}
        title="查看调整值明细"
        type="button"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      <ModifierInfoDialog
        attribute={attribute}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
```

### 3.4 集成示例

#### 集成到闪避值显示

```tsx
// components/upgrade-popover/evasion-editor.tsx 或相关组件

import { ModifierInfoButton } from '@/components/modifier-tracker/modifier-info-button'

export function EvasionDisplay() {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-600">闪避值</label>
      <input
        type="text"
        value={sheetData.evasion}
        // ... 其他属性
      />
      <ModifierInfoButton attribute="evasion" />
    </div>
  )
}
```

#### 集成到护甲值显示

```tsx
// components/character-sheet-sections/armor-section.tsx

import { ModifierInfoButton } from '@/components/modifier-tracker/modifier-info-button'

export function ArmorSection({ onOpenArmorModal }: ArmorSectionProps) {
  // ... 现有代码

  return (
    <div>
      <h4 className="font-bold text-[10px] bg-gray-800 text-white p-1 rounded-t-md">护甲</h4>
      <div className="grid grid-cols-10 gap-1 -mt-0.5">
        {/* ... 其他字段 */}

        <div className="col-span-3">
          <div className="flex items-center gap-1">
            <label className="text-[8px] text-gray-600">护甲值</label>
            <ModifierInfoButton attribute="armorValue" className="w-3 h-3" />
          </div>
          <input
            type="text"
            name="armorBaseScore"
            value={formData.armorBaseScore}
            // ... 其他属性
          />
        </div>
      </div>
    </div>
  )
}
```

---

## 4. 实施计划

### 阶段一：核心框架开发（当前专注）

**目标**：搭建完整的系统框架，验证架构可行性

#### 步骤 1：类型定义
- [ ] 创建 `lib/modifier-tracker/types.ts`
- [ ] 定义 `ModifierDeclaration`, `Modifier`, `AttributeModifiers` 等接口

#### 步骤 2：属性配置
- [ ] 创建 `lib/modifier-tracker/attributes.ts`
- [ ] 配置闪避值、护甲值两个属性

#### 步骤 3：数据结构扩展
- [ ] 扩展 `Weapon` 接口（添加 `modifiers` 字段）
- [ ] 扩展 `ArmorItem` 接口
- [ ] 扩展 `StandardCard` 接口
- [ ] 创建升级项配置文件 `upgrade-effects.ts`

#### 步骤 4：Provider 实现
- [ ] 创建 `provider-interface.ts`
- [ ] 实现 `WeaponModifierProvider`
- [ ] 实现 `ArmorModifierProvider`
- [ ] 实现 `CardModifierProvider`
- [ ] 实现 `UpgradeModifierProvider`

#### 步骤 5：计算引擎
- [ ] 实现 `ModifierTracker` 类
- [ ] 导出单例 `modifierTracker`
- [ ] 创建 `lib/modifier-tracker/index.ts` 统一导出

#### 步骤 6：UI 组件
- [ ] 实现 `SourceTypeIcon`
- [ ] 实现 `ModifierInfoDialog`
- [ ] 实现 `ModifierInfoButton`

#### 步骤 7：集成到界面
- [ ] 在闪避值显示区域添加信息按钮
- [ ] 在护甲值显示区域添加信息按钮

#### 步骤 8：测试验证
- [ ] 手动添加几条测试数据（武器、护甲、升级项）
- [ ] 验证完整流程：点击"?"按钮 → 显示调整值明细
- [ ] 验证自动刷新：修改装备 → 调整值实时更新

**交付物**：
- 完整的框架代码
- 两个属性（闪避、护甲）的调整值查看功能
- 几条测试数据验证系统可用

---

### 阶段二：数据标注（后续任务）

**目标**：为现有数据添加 `modifiers` 声明

#### 任务清单
1. **武器数据标注**
   - [ ] 遍历 `primaryWeaponList`，为有调整值的武器添加 `modifiers`
   - [ ] 遍历 `secondaryWeaponList`
   - [ ] 估算工作量：约 200+ 武器，可能需要标注的 < 50 个

2. **护甲数据标注**
   - [ ] 遍历 `armorItems`，为所有护甲添加 `modifiers`
   - [ ] 估算工作量：约 20 个护甲

3. **升级项配置**
   - [ ] 创建完整的 `UPGRADE_CONFIGS` 配置表
   - [ ] 估算工作量：根据实际升级项数量而定

4. **卡牌数据标注**（可选）
   - [ ] 为有特殊效果的卡牌添加 `modifiers`
   - [ ] 优先级：低（现有 `professionSpecial` 已覆盖大部分）

**策略**：
- 分批次标注，每次标注一类数据
- 优先标注常用的武器和护甲
- 升级项配置可在使用时逐步完善

---

### 阶段三：扩展和优化

**目标**：支持更多属性，优化性能和体验

1. **扩展属性支持**
   - [ ] 生命上限 (hpMax)
   - [ ] 压力上限 (stressMax)
   - [ ] 六大属性

2. **性能优化**
   - [ ] 添加缓存机制（如有需要）
   - [ ] 优化大量调整值时的计算性能

3. **UI/UX 优化**
   - [ ] 添加动画效果
   - [ ] 优化移动端显示
   - [ ] 键盘导航支持

---

## 5. 技术细节

### 5.1 目录结构

```
lib/
  modifier-tracker/
    index.ts                    # 统一导出
    types.ts                    # 类型定义
    attributes.ts               # 属性配置
    provider-interface.ts       # Provider 接口
    modifier-tracker.ts         # 计算引擎
    upgrade-effects.ts          # 升级项配置
    providers/
      weapon-provider.ts
      armor-provider.ts
      card-provider.ts
      upgrade-provider.ts

components/
  modifier-tracker/
    source-type-icon.tsx
    modifier-info-dialog.tsx
    modifier-info-button.tsx
```

### 5.2 数据流

```
用户点击"?"按钮
  ↓
ModifierInfoButton 打开 Dialog
  ↓
ModifierInfoDialog 调用 modifierTracker.getAttributeModifiers()
  ↓
ModifierTracker 遍历所有 Provider
  ↓
各 Provider 从 SheetData 中提取数据源的 modifiers 声明
  ↓
转换为运行时 Modifier 对象
  ↓
按 attribute 过滤、分类（bonuses/penalties）
  ↓
计算总值
  ↓
返回 AttributeModifiers
  ↓
UI 展示明细
```

### 5.3 自动刷新实现

使用 React 的 `useMemo` hook：

```tsx
const modifierInfo = useMemo(
  () => modifierTracker.getAttributeModifiers(attribute, sheetData),
  [attribute, sheetData]  // sheetData 是依赖项
)
```

**原理**：
- `sheetData` 来自 Zustand store
- 当用户修改装备、卡牌、升级项时，`sheetData` 更新
- `sheetData` 更新触发 `useMemo` 重新计算
- 无需手动刷新，自动实时更新

**性能**：
- 仅在 Dialog 打开时计算
- 仅在依赖项变化时重新计算
- 计算量小（遍历数组），性能无压力

---

## 6. 设计决策记录

### 已确认的决策

1. **试验范围** ✅
   - 第一阶段仅支持：闪避值、护甲值
   - 理由：聚焦核心功能，快速验证

2. **数据标注方式** ✅
   - 采用**完全手动标注**，不提供自动解析
   - 要求：为武器、护甲、卡牌、升级项都适配统一接口
   - 理由：保证准确性，避免解析错误

3. **刷新机制** ✅
   - 实现**自动刷新**（基于 `useMemo`）
   - 理由：实现难度低，用户体验好

4. **复杂调整值处理** ✅
   - 由 Provider 自行决定如何处理
   - 预留 `ModifierType.Complex` 接口，暂不强制实现
   - 理由：保持灵活性

5. **叠加规则** ✅
   - 试验阶段简单累加，不考虑复杂关系
   - 实现：`total = base + sum(bonuses) - sum(penalties)`
   - 理由：简化实现，后续可扩展

### 待定的问题

1. **数据文件格式**
   - 标记：后续考虑
   - 说明：当前专注框架开发

2. **数据标注优先级**
   - 标记：框架完成后确定
   - 说明：根据实际使用频率排序

---

## 7. 附录：数据标注指南

### 7.1 武器标注模板

```typescript
// 模板
{
  名称: "武器名称",
  // ... 其他字段
  描述: "描述文本，可能包含调整值说明",

  modifiers: [
    {
      attribute: 'evasion',  // 或 'armorValue', 'hpMax' 等
      type: 'bonus',         // 或 'penalty'
      value: 1,              // 绝对值
      description: '简短说明'  // 可选
    }
  ]
}

// 常见模式
// 1. 巨型武器 → 闪避值-1
modifiers: [{ attribute: 'evasion', type: 'penalty', value: 1 }]

// 2. 保护武器 → 护甲值+1
modifiers: [{ attribute: 'armorValue', type: 'bonus', value: 1 }]

// 3. 无调整值 → 不添加 modifiers 字段或设为 []
```

### 7.2 护甲标注模板

```typescript
// 模板
{
  名称: "护甲名称",
  护甲值: "11",
  闪避加值: "+2",
  // ... 其他字段

  modifiers: [
    {
      attribute: 'armorValue',
      type: 'bonus',
      value: 11,  // 护甲值
      description: '护甲基础值'
    },
    {
      attribute: 'evasion',
      type: 'bonus',  // 或 'penalty'
      value: 2,       // 闪避加值的绝对值
      description: '闪避加值'
    }
  ]
}

// 注意：闪避加值可能是负数，此时 type 用 'penalty'
```

### 7.3 升级项配置模板

```typescript
// 模板
{
  checkKey: 'tier1-5-0',  // 从 checkedUpgrades 中的 key
  label: '闪避值 +1',      // 显示名称
  modifiers: [
    {
      attribute: 'evasion',
      type: 'bonus',
      value: 1,
      description: 'Tier 1 升级'
    }
  ]
}

// 如何确定 checkKey？
// 1. 查看 SheetData.checkedUpgrades 的结构
// 2. 对应升级项勾选时的 key
// 3. 格式：tier{N}-{optionIndex}-{boxIndex}
```

### 7.4 卡牌标注模板

```typescript
// 模板（新格式）
{
  id: "card-id",
  name: "卡牌名称",
  type: "profession",
  // ... 其他字段

  modifiers: [
    {
      attribute: 'evasion',
      type: 'bonus',
      value: 3,
      description: '职业起始闪避'
    },
    {
      attribute: 'hpMax',
      type: 'bonus',
      value: 5,
      description: '职业起始生命'
    }
  ]
}

// 注意：保留 professionSpecial 字段，Provider 会兼容
```

---

## 8. 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|---------|------|
| 2025-11-16 | v2.0 | 重写设计文档，采用数据自描述架构 | Claude |
| 2025-11-16 | v1.0 | 初始版本（已废弃） | Claude |

---

**文档状态**: 🟢 Ready for Implementation

**下一步行动**:
1. ✅ 评审设计文档
2. ⏭️ 开始阶段一实施：类型定义和数据结构扩展
