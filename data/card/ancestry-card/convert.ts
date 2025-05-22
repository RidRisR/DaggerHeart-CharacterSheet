import { v4 as uuidv4 } from "uuid"
import type { StandardCard } from "@/data/card/card-types"

// 血统卡牌类型
export type AncestryCardClass = "人类" | "精灵" | "矮人" | "半身人" | "侏儒" | "半兽人" | "半精灵" | "龙裔" | "兽人"

// 血统卡牌数据结构
export interface AncestryCard {
  id: string
  name: string
  description?: string
  imageUrl?: string
  class: AncestryCardClass
  trait?: string
  homeland?: string
}

class AncestryCardConverter {
  // 转换为标准格式
  toStandard(card: AncestryCard): StandardCard {
    return {
      standarized: true,
      id: card.id || uuidv4(),
      name: card.name,
      type: "ancestry",
      description: card.description,
      imageUrl: card.imageUrl,
      class: card.class, //must be string
      primaryAttribute: card.trait,
      secondaryAttribute: card.homeland,
    }
  }
}

export const ancestryCardConverter = new AncestryCardConverter()
