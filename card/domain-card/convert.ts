/**
 * 领域卡牌转换器
 * 用于将原始领域卡牌数据转换为标准格式
 */

import { v4 as uuidv4 } from "uuid"
import { CardType, processCardDescription, type StandardCard } from "@/card/card-types"
import { DomainClass } from "../card-types"


// 领域卡牌数据结构
export interface DomainCard {
  id: string
  名称: string
  领域: DomainClass
  描述: string
  imageUrl?: string
  等级: number
  属性: string
  回想: number
}

// 领域卡牌转换器
class DomainCardConverter {
  // 将原始领域卡牌数据转换为标准格式
  toStandard(card: DomainCard): StandardCard {
    return {
      standarized: true,
      id: card.id || uuidv4(),
      name: card.名称 || "",
      type: CardType.Domain,
      description: processCardDescription(card.描述) || "",
      imageUrl: card.imageUrl || "",
      class: card.领域,
      level: card.等级,
      cardSelectDisplay: {
        "item1": card.领域 || "",
        "item2": card.属性 || "",
        "item3": card.回想 !== undefined && card.回想 !== null ? "RC." + card.回想 : "",
        "item4": card.等级 ? "LV." + card.等级.toString() : "",
      },
    }
  }
}

export const domainCardConverter = new DomainCardConverter()
