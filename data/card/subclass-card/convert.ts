import { v4 as uuidv4 } from "uuid"
import type { StandardCard } from "@/data/card/card-types"

// 领域卡牌类型
export type SubClassClass = "吟游诗人" | "法师" | "战士" | "盗贼" | "牧师" | "德鲁伊" | "术士" | "游侠" | "武僧"

// 领域卡牌数据结构
export interface SubClassCard {
  id: string
  名称: string
  描述: string
  imageUrl?: string
  主职: SubClassClass
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
      class: card.主职, //must be string
      primaryAttribute: card.等级,
      secondaryAttribute: card.施法,
    }
  }
}

export const subclassCardConverter = new SubClassCardConverter()
