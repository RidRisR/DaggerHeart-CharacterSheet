import type { CardPackageState, CardType } from '../types'

/**
 * 生成唯一的卡牌ID
 * @param packageName 卡包名称
 * @param author 作者名称
 * @param cardType 卡牌类型
 * @param cardName 卡牌名称
 * @param existingCards 已存在的卡牌数据，用于去重检查
 * @returns 唯一的卡牌ID
 */
export function generateUniqueCardId(
  packageName: string, 
  author: string, 
  cardType: CardType, 
  cardName: string,
  existingCards?: CardPackageState
): string {
  // 类型缩写映射
  const typeAbbreviation = {
    'profession': 'prof',
    'ancestry': 'ance',
    'community': 'comm',
    'subclass': 'subc',
    'domain': 'doma',
    'variant': 'vari'
  } as const

  const typeCode = typeAbbreviation[cardType] || cardType
  const baseId = `${packageName}-${author}-${typeCode}-${cardName}`
  
  // 如果没有提供已存在的卡牌数据，直接返回基础ID
  if (!existingCards) {
    return baseId
  }
  
  // 检查ID是否已存在
  const allCards = getAllCardsFromPackage(existingCards)
  const existingIds = new Set(allCards.map(card => card.id).filter(Boolean))
  
  // 如果基础ID不冲突，直接返回
  if (!existingIds.has(baseId)) {
    return baseId
  }
  
  // 如果冲突，添加数字后缀
  let counter = 2
  let uniqueId = `${baseId}-${counter}`
  
  while (existingIds.has(uniqueId) && counter < 100) { // 防止无限循环
    counter++
    uniqueId = `${baseId}-${counter}`
  }
  
  return uniqueId
}

/**
 * 兼容性函数，保持现有接口
 */
export function generateCardId(
  packageName: string, 
  author: string, 
  cardType: string, 
  cardName: string
): string {
  // 类型缩写映射
  const typeAbbreviation = {
    'profession': 'prof',
    'ancestry': 'ance', 
    'community': 'comm',
    'subclass': 'subc',
    'domain': 'doma',
    'variant': 'vari'
  } as const
  
  const typeCode = typeAbbreviation[cardType as keyof typeof typeAbbreviation] || cardType
  return `${packageName}-${author}-${typeCode}-${cardName}`
}

/**
 * 从卡包数据中提取所有卡牌
 */
function getAllCardsFromPackage(packageData: CardPackageState): Array<{ id?: string }> {
  const allCards: Array<{ id?: string }> = []
  
  // 遍历所有卡牌类型
  const cardTypes: CardType[] = ['profession', 'ancestry', 'community', 'subclass', 'domain', 'variant']
  
  cardTypes.forEach(cardType => {
    const cards = packageData[cardType] as Array<{ id?: string }>
    if (Array.isArray(cards)) {
      allCards.push(...cards)
    }
  })
  
  return allCards
}

/**
 * 检查ID是否在指定卡包中唯一
 */
export function isIdUniqueInPackage(id: string, packageData: CardPackageState, excludeCard?: { id?: string }): boolean {
  const allCards = getAllCardsFromPackage(packageData)
  
  return !allCards.some(card => 
    card.id === id && 
    (!excludeCard || card !== excludeCard)
  )
}

/**
 * 清理ID字符串，移除非法字符
 */
export function sanitizeIdString(str: string): string {
  return str
    .replace(/[^\w\u4e00-\u9fff-]/g, '-') // 只保留字母、数字、中文字符和连字符
    .replace(/-+/g, '-') // 合并多个连字符
    .replace(/^-|-$/g, '') // 移除开头和结尾的连字符
}

/**
 * 根据卡牌名称智能生成ID
 */
export function generateSmartCardId(
  packageName: string,
  author: string,
  cardType: CardType,
  cardName: string,
  packageData?: CardPackageState
): string {
  // 清理输入字符串
  const cleanPackageName = sanitizeIdString(packageName) || '新建卡包'
  const cleanAuthor = sanitizeIdString(author) || '作者'
  const cleanCardName = sanitizeIdString(cardName) || '卡牌名'
  
  // 生成唯一ID
  return generateUniqueCardId(cleanPackageName, cleanAuthor, cardType, cleanCardName, packageData)
}