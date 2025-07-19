/**
 * 卡牌转换器
 * 用于将各种格式的卡牌转换为标准格式
 */

import type { StandardCard } from "@/card/card-types"
import { processCardDescription, CardType } from "@/card/card-types"


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

// 根据卡牌类型调用相应的转换器
async function convertCardByType(card: any, cardType: string): Promise<StandardCard | null> {
  try {
    switch (cardType) {
      case CardType.Profession:
        const { professionCardConverter } = await import('@/card/profession-card/convert');
        return professionCardConverter.toStandard(card);
      
      case CardType.Ancestry:
        const { ancestryCardConverter } = await import('@/card/ancestry-card/convert');
        return ancestryCardConverter.toStandard(card);
      
      case CardType.Community:
        const { communityCardConverter } = await import('@/card/community-card/convert');
        return communityCardConverter.toStandard(card);
      
      case CardType.Subclass:
        const { subclassCardConverter } = await import('@/card/subclass-card/convert');
        return subclassCardConverter.toStandard(card);
      
      case CardType.Domain:
        const { domainCardConverter } = await import('@/card/domain-card/convert');
        return domainCardConverter.toStandard(card);
      
      case CardType.Variant:
        const { variantCardConverter } = await import('@/card/variant-card/convert');
        return variantCardConverter.toStandard(card);
      
      default:
        console.warn(`[convertCardByType] 未知的卡牌类型: ${cardType}`);
        return null;
    }
  } catch (error) {
    console.error(`[convertCardByType] 转换卡牌失败 (${cardType}):`, error);
    return null;
  }
}

// 将任意卡牌转换为标准格式 (同步版本，仅处理已标准化的卡牌)
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

    // 对于非标准化卡牌，直接返回基础转换
    console.warn("[convertToStandardCard] 卡牌未标准化，返回基础转换")
    return {
      standarized: true,
      id: card.id || "",
      name: card.name || card.名称 || "",
      type: card.type || "unknown",
      class: card.class || card.名称 || "",
      description: processCardDescription(card.description || card.简介 || card.职业特性 || card.特性 || ""),
      imageUrl: card.imageUrl || "",
      cardSelectDisplay: {
        item1: card.item1 || "",
        item2: card.item2 || "",
        item3: card.item3 || "",
        item4: card.item4 || ""
      }
    }
  } catch (error) {
    console.error("[convertToStandardCard] 转换卡牌失败:", error, card)
    return createEmptyCard()
  }
}

// 异步版本的转换函数，用于完整的卡牌转换
export async function convertToStandardCardAsync(card: any): Promise<StandardCard> {
  try {
    if (!card) {
      console.warn("[convertToStandardCardAsync] 输入为空，返回空卡牌")
      return createEmptyCard()
    }

    if (card.standarized) {
      return convertToStandardCard(card)
    }

    if (!card.id || card.id === "" || typeof card.id !== "string") {
      console.warn("[convertToStandardCardAsync] 卡牌ID不合法，返回空卡牌")
      return createEmptyCard()
    }

    if (!card.type || card.type === "" || typeof card.type != "string") {
      console.warn("[convertToStandardCardAsync] 卡牌类型不合法，返回空卡牌")
      return createEmptyCard()
    }
    
    // 根据卡牌类型调用相应的转换器
    const standardCard = await convertCardByType(card, card.type)
    if (standardCard === null) {
      return createEmptyCard()
    }
    return standardCard
  } catch (error) {
    console.error("[convertToStandardCardAsync] 转换卡牌失败:", error, card)
    return createEmptyCard()
  }
}
