/**
 * 卡牌数据入口
 * 这个文件导出所有卡牌相关的数据和函数
 */

// 导入各个卡牌类型的转换器
import { professionCardConverter } from "@/data/card/profession-card/convert"
import { ancestryCardConverter } from "@/data/card/ancestry-card/convert"
import { communityCardConverter } from "@/data/card/community-card/convert"
import { subclassCardConverter } from "@/data/card/subclass-card/convert"
import { domainCardConverter } from "@/data/card/domain-card/convert" // 导入领域卡牌转换器

// 导入各个卡牌类型的数据
import { professionCards } from "@/data/card/profession-card/cards"
import { ancestryCards } from "@/data/card/ancestry-card/cards"
import { communityCards } from "@/data/card/community-card/cards"
import { subclassCards } from "@/data/card/subclass-card/cards"
import { domainCards } from "@/data/card/domain-card/cards" // 导入领域卡牌数据

// 导入UI配置
import {
  ALL_CARD_TYPES,
  SPECIAL_CARD_POSITIONS,
  CARD_CLASS_OPTIONS,
  CARD_CLASS_OPTIONS_BY_TYPE,
  CARD_LEVEL_OPTIONS, // Updated import
  getCardTypeName,
  getCardTypeColor,
  getCardClassOptions,
  getLevelOptions,
  getLevelName,
  isSpecialCardPosition,
  getAllowedCardTypeForPosition,
} from "@/data/card/card-ui-config"

// 导入类型定义
import type { StandardCard } from "@/data/card/card-types"
import { convertToStandardCard } from "@/data/card/card-converter"
// Import CardManager directly from the file
import { CardManager } from "./card-manager"

// 导入CardManager
// export { CardManager } from "@/data/card/card-manager"

// 获取CardManager实例
const cardManager = CardManager.getInstance()

// 统一注册卡牌类型
cardManager.registerCardType("profession", {
  converter: professionCardConverter.toStandard,
})

cardManager.registerCardType("ancestry", {
  converter: ancestryCardConverter.toStandard,
})

cardManager.registerCardType("community", {
  converter: communityCardConverter.toStandard,
})

cardManager.registerCardType("subclass", {
  converter: subclassCardConverter.toStandard,
})

cardManager.registerCardType("domain", {
  converter: domainCardConverter.toStandard,
})

// 卡牌数据映射
export const cardDataByType = {
  profession: professionCards,
  ancestry: ancestryCards,
  community: communityCards,
  subclass: subclassCards,
  domain: domainCards,
}

// 预先转换好的标准格式卡牌
export const ALL_STANDARD_CARDS: StandardCard[] = (() => {
  try {
    console.log("[ALL_STANDARD_CARDS] 开始转换所有卡牌")
    const standardCards: StandardCard[] = []

    // 按类型转换卡牌
    Object.entries(cardDataByType).forEach(([type, cards]) => {
      console.log(`[ALL_STANDARD_CARDS] 开始转换 ${type} 类型卡牌, 数量: ${cards.length}`)

      const convertedCards = cards
        .map((card, index) => {
          try {
            return cardManager.ConvertCard(card, type as keyof typeof cardDataByType)
          } catch (error) {
            console.error(`[ALL_STANDARD_CARDS] ${type}类型卡牌转换失败, 索引: ${index}:`, error, card)
            return null
          }
        })
        .filter(Boolean) as StandardCard[]

      standardCards.push(...convertedCards)
      console.log(`[ALL_STANDARD_CARDS] ${type}类型卡牌转换完成, 数量: ${convertedCards.length}`)
    })

    console.log(`[ALL_STANDARD_CARDS] 所有卡牌转换完成, 总数: ${standardCards.length}`)
    return standardCards
  } catch (error) {
    console.error("[ALL_STANDARD_CARDS] 转换过程出错:", error)
    return []
  }
})()

// 按类型分组的标准格式卡牌
export const STANDARD_CARDS_BY_TYPE: Record<string, StandardCard[]> = (() => {
  const result: Record<string, StandardCard[]> = {}

  for (const tab of ALL_CARD_TYPES) {
    if (tab.id !== "all") {
      result[tab.id] = ALL_STANDARD_CARDS.filter((card) => card.type === tab.id)
      console.log(`[STANDARD_CARDS_BY_TYPE] ${tab.id}类型卡牌数量: ${result[tab.id].length}`)
    }
  }

  return result
})()

// 获取所有标准格式卡牌
export function getAllStandardCards(): StandardCard[] {
  return ALL_STANDARD_CARDS
}

// 根据类型获取标准格式卡牌
export function getStandardCardsByType(typeId: string): StandardCard[] {
  return STANDARD_CARDS_BY_TYPE[typeId] || []
}

// 添加 getCardsByType 作为 getStandardCardsByType 的别名
export const getCardsByType = getStandardCardsByType

// 导出所有内容
export {
  // UI配置
  ALL_CARD_TYPES,
  SPECIAL_CARD_POSITIONS,
  CARD_CLASS_OPTIONS,
  CARD_CLASS_OPTIONS_BY_TYPE,
  CARD_LEVEL_OPTIONS, // Updated export
  // UI辅助函数
  getCardTypeName,
  getCardTypeColor,
  getCardClassOptions,
  getLevelOptions,
  getLevelName,
  isSpecialCardPosition,
  getAllowedCardTypeForPosition,
  // 卡牌转换
  convertToStandardCard,
  // 卡牌注册
  cardManager,
  // Re-export CardManager
  CardManager,
}
