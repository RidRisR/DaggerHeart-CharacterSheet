/**
 * 卡牌转换器
 * 用于将各种格式的卡牌转换为标准格式
 */

import type { StandardCard } from "@/card/card-types"
import { processCardDescription } from "@/card/card-types"
import { customCardManager } from "@/card"


export function createEmptyCard(type = "unknown"): StandardCard {
  return {
    standarized: true,
    id: "",
    name: "",
    class: "",
    type: type,
    description: "",
    imageUrl: "",
    cardSelectDisplay: {
      item1: "",
      item2: "",
      item3: "",
      item4: ""
    }
  }
}

// 将任意卡牌转换为标准格式
export function convertToStandardCard(card: any): StandardCard {

  try {
    if (!card) {
      console.warn("[convertToStandardCard] 输入为空，返回空卡牌")
      return createEmptyCard()
    }

    if (card.standarized) {
      // 即使是已经标准化的卡牌，也要确保描述经过处理
      const processedCard = { ...card } as StandardCard
      if (processedCard.description) {
        processedCard.description = processCardDescription(processedCard.description)
      }
      return processedCard
    }

    if (!card.id || card.id === "" || typeof card.id !== "string") {
      console.warn("[convertToStandardCard] 卡牌ID不合法，返回空卡牌")
      return createEmptyCard()
    }

    if (!card.type || card.type === "" || typeof card.type != "string") {
      console.warn("[convertToStandardCard] 卡牌类型不合法，返回空卡牌")
      return createEmptyCard()
    }
    const standardCard = customCardManager.getInstance().ConvertCard(card, card.type)
    if (standardCard === null) {
      return createEmptyCard()
    }
    return standardCard
  } catch (error) {
    console.error("[convertToStandardCard] 转换卡牌失败:", error, card)
    return createEmptyCard()
  }
}
