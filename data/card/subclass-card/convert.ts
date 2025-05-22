import { v4 as uuidv4 } from "uuid"
import type { StandardCard } from "@/data/card/card-types"

// 领域卡牌类型
export type SubClassClass = "吟游诗人" | "德鲁伊" | "守护者" | "游侠" | "盗贼" | "神使" | "术士" | "战士" | "法师"

// 领域卡牌数据结构
export interface SubClassCard {
  id: string
  名称: string
  描述: string
  imageUrl?: string
  主职: SubClassClass
  子职业: string
  等级: string
  施法?: string
}

class SubClassCardConverter {
  // 转换为标准格式
  toStandard(card: SubClassCard): StandardCard {
    return {
      standarized: true,
      id: card.id || uuidv4(),
      name: card.名称,
      type: "subclass",
      description: card.描述,
      imageUrl: card.imageUrl,
      class: card.主职,
      primaryAttribute: card.等级,
      secondaryAttribute: card.施法,
    }
  }
}

export const subclassCardConverter = new SubClassCardConverter()
