import type { CardPackageState, CardType } from '../types'

/**
 * 生成防碰撞的短ID
 * 组合时间戳和随机数，确保唯一性
 */
function generateShortId(): string {
  // 时间戳部分（base36，约6-7个字符）
  const timestamp = Date.now().toString(36)

  // 随机部分（6个字符，增加长度以补偿移除的计数器）
  const random = Math.random().toString(36).substring(2, 8).padEnd(6, '0')

  return `${timestamp}-${random}`
}

/**
 * 生成唯一的卡牌ID（新版本，不依赖卡牌名称）
 * @param packageName 卡包名称
 * @param author 作者名称
 * @param cardType 卡牌类型
 * @param existingCards 已存在的卡牌数据，用于去重检查
 * @returns 唯一的卡牌ID
 */
export function generateRobustCardId(
  packageName: string,
  author: string,
  cardType: CardType,
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

  const cleanPackageName = truncateIdString(sanitizeIdString(packageName) || '新建卡包', 8)
  const cleanAuthor = truncateIdString(sanitizeIdString(author) || '作者', 8)
  const typeCode = typeAbbreviation[cardType] || cardType

  // 生成防碰撞的短ID
  const shortId = generateShortId()

  // 组合成完整ID
  const baseId = `${cleanPackageName}-${cleanAuthor}-${typeCode}-${shortId}`

  // 额外的唯一性检查（如果有已存在的卡牌）
  if (existingCards && !isIdUniqueInPackage(baseId, existingCards)) {
    // 极小概率事件：添加额外的随机后缀
    const extraRandom = Math.random().toString(36).substring(2, 6)
    return `${baseId}-${extraRandom}`
  }

  return baseId
}

/**
 * 生成唯一的卡牌ID（保留旧版本兼容）
 * @deprecated 请使用 generateRobustCardId
 */
export function generateUniqueCardId(
  packageName: string,
  author: string,
  cardType: CardType,
  _cardName: string,  // 前缀下划线表示参数未使用
  existingCards?: CardPackageState
): string {
  // 直接调用新版本，忽略cardName参数
  return generateRobustCardId(packageName, author, cardType, existingCards)
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
 * 截断字符串到指定长度（按字符数，支持中文）
 * @param str 原始字符串
 * @param maxLength 最大字符数（默认8）
 * @returns 截断后的字符串
 */
function truncateIdString(str: string, maxLength: number = 8): string {
  if (str.length <= maxLength) {
    return str
  }
  return str.substring(0, maxLength)
}

/**
 * 获取卡牌类型缩写
 */
function getTypeAbbreviation(cardType: CardType): string {
  const typeAbbreviation = {
    'profession': 'prof',
    'ancestry': 'ance',
    'community': 'comm',
    'subclass': 'subc',
    'domain': 'doma',
    'variant': 'vari'
  } as const

  return typeAbbreviation[cardType] || cardType
}

/**
 * 解析卡牌ID，分离前缀和后缀
 */
export function parseCardId(
  id: string,
  packageName: string,
  author: string,
  cardType: CardType
): { isStandard: boolean; customSuffix: string; prefix: string } {
  const cleanPackageName = truncateIdString(sanitizeIdString(packageName) || '新建卡包', 8)
  const cleanAuthor = truncateIdString(sanitizeIdString(author) || '作者', 8)
  const typeCode = getTypeAbbreviation(cardType)

  const expectedPrefix = `${cleanPackageName}-${cleanAuthor}-${typeCode}-`

  if (id.startsWith(expectedPrefix)) {
    // 标准格式：提取后缀
    return {
      isStandard: true,
      customSuffix: id.substring(expectedPrefix.length),
      prefix: expectedPrefix
    }
  } else {
    // 非标准格式：整个ID作为后缀（向后兼容）
    return {
      isStandard: false,
      customSuffix: id,
      prefix: expectedPrefix
    }
  }
}

/**
 * 组合前缀和后缀为完整ID
 */
export function buildCardId(
  packageName: string,
  author: string,
  cardType: CardType,
  customSuffix: string
): string {
  const cleanPackageName = truncateIdString(sanitizeIdString(packageName) || '新建卡包', 8)
  const cleanAuthor = truncateIdString(sanitizeIdString(author) || '作者', 8)
  const typeCode = getTypeAbbreviation(cardType)
  const cleanSuffix = sanitizeIdString(customSuffix) || 'unnamed'

  return `${cleanPackageName}-${cleanAuthor}-${typeCode}-${cleanSuffix}`
}

/**
 * 根据卡牌名称智能生成ID
 * @deprecated 新版本不再依赖卡牌名称
 */
export function generateSmartCardId(
  packageName: string,
  author: string,
  cardType: CardType,
  _cardName: string,  // 前缀下划线表示参数未使用
  packageData?: CardPackageState
): string {
  // 使用新的ID生成策略，不再依赖卡牌名称
  return generateRobustCardId(packageName, author, cardType, packageData)
}