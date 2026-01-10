/**
 * JSON合并函数
 *
 * 纯函数实现的卡包数据合并逻辑
 */

import type { CardPackageState } from '@/app/card-editor/types'
import type { MergeOptions, CardType } from './ai-types'

/**
 * 合并两个CardPackageState
 *
 * @param existing 现有的卡包数据
 * @param incoming AI生成的新数据
 * @param options 合并选项
 * @returns 合并后的卡包数据
 */
export function mergeCardData(
  existing: Partial<CardPackageState>,
  incoming: Partial<CardPackageState>,
  options: MergeOptions = {
    deduplicateById: true,
    conflictStrategy: 'merge'
  }
): Partial<CardPackageState> {
  // 创建副本避免修改原对象
  const merged: Partial<CardPackageState> = { ...existing }

  // 1. 合并customFieldDefinitions
  if (incoming.customFieldDefinitions) {
    merged.customFieldDefinitions = mergeCustomFieldDefinitions(
      existing.customFieldDefinitions || {},
      incoming.customFieldDefinitions
    )
  }

  // 2. 合并卡牌数组
  const cardTypes: CardType[] = [
    'profession',
    'ancestry',
    'community',
    'subclass',
    'domain',
    'variant'
  ]

  cardTypes.forEach((type) => {
    const incomingCards = incoming[type]
    if (!incomingCards || incomingCards.length === 0) {
      return
    }

    const existingCards = (merged[type] as any[]) || []

    if (options.deduplicateById) {
      merged[type] = deduplicateById(
        existingCards,
        incomingCards,
        options.conflictStrategy || 'merge'
      ) as any
    } else {
      merged[type] = [...existingCards, ...incomingCards] as any
    }
  })

  // 3. 更新元数据
  if (incoming.name) merged.name = incoming.name
  if (incoming.version) merged.version = incoming.version
  if (incoming.author) merged.author = incoming.author
  if (incoming.description) merged.description = incoming.description

  return merged
}

/**
 * 合并customFieldDefinitions
 */
function mergeCustomFieldDefinitions(
  existing: Record<string, string[]>,
  incoming: Record<string, string[]>
): Record<string, string[]> {
  const merged: Record<string, string[]> = { ...existing }

  Object.keys(incoming).forEach((key) => {
    const existingSet = new Set(merged[key] || [])
    const incomingArray = incoming[key] || []

    // 去重合并
    incomingArray.forEach((item) => existingSet.add(item))

    merged[key] = Array.from(existingSet)
  })

  return merged
}

/**
 * 按ID去重合并卡牌数组
 */
function deduplicateById(
  existing: any[],
  incoming: any[],
  strategy: 'overwrite' | 'keep_existing' | 'merge'
): any[] {
  // 创建ID到卡牌的映射
  const cardMap = new Map<string, any>()

  // 先添加现有卡牌
  existing.forEach((card) => {
    const id = card.id || generateTempId(card)
    cardMap.set(id, card)
  })

  // 处理incoming卡牌
  incoming.forEach((incomingCard) => {
    const id = incomingCard.id || generateTempId(incomingCard)

    if (cardMap.has(id)) {
      // ID冲突,根据策略处理
      const existingCard = cardMap.get(id)!

      switch (strategy) {
        case 'overwrite':
          // 新卡牌完全覆盖旧卡牌
          cardMap.set(id, incomingCard)
          break

        case 'keep_existing':
          // 保留旧卡牌,忽略新卡牌
          break

        case 'merge':
          // 字段级合并:新卡牌的非空字段填充旧卡牌的空字段
          const mergedCard = mergeCardFields(existingCard, incomingCard)
          cardMap.set(id, mergedCard)
          break
      }
    } else {
      // 无冲突,直接添加
      cardMap.set(id, incomingCard)
    }
  })

  return Array.from(cardMap.values())
}

/**
 * 字段级合并两张卡牌
 */
function mergeCardFields(existing: any, incoming: any): any {
  const merged = { ...existing }

  Object.keys(incoming).forEach((key) => {
    const incomingValue = incoming[key]
    const existingValue = existing[key]

    // 如果incoming有值且existing为空,则使用incoming的值
    if (incomingValue !== undefined && incomingValue !== null && incomingValue !== '') {
      if (
        existingValue === undefined ||
        existingValue === null ||
        existingValue === ''
      ) {
        merged[key] = incomingValue
      }
    }
  })

  return merged
}

/**
 * 生成临时ID(用于没有ID字段的卡牌)
 */
function generateTempId(card: any): string {
  // 使用名称和类型生成简单的hash
  const name = card.名称 || card.name || 'unnamed'
  const type = card.类型 || card.type || 'unknown'
  return `temp-${type}-${name}-${Math.random().toString(36).substring(7)}`
}

/**
 * 统计卡包中的卡牌总数
 */
export function countCards(packageData: Partial<CardPackageState>): number {
  let total = 0

  const cardTypes: CardType[] = [
    'profession',
    'ancestry',
    'community',
    'subclass',
    'domain',
    'variant'
  ]

  cardTypes.forEach((type) => {
    const cards = packageData[type]
    if (cards && Array.isArray(cards)) {
      total += cards.length
    }
  })

  return total
}

/**
 * 按类型统计卡牌数量
 */
export function countCardsByType(
  packageData: Partial<CardPackageState>
): Partial<Record<CardType, number>> {
  const counts: Partial<Record<CardType, number>> = {}

  const cardTypes: CardType[] = [
    'profession',
    'ancestry',
    'community',
    'subclass',
    'domain',
    'variant'
  ]

  cardTypes.forEach((type) => {
    const cards = packageData[type]
    if (cards && Array.isArray(cards)) {
      counts[type] = cards.length
    }
  })

  return counts
}
