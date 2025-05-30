import { v4 as uuidv4 } from "uuid"
import { CARD_CLASS_OPTIONS, CardType, type StandardCard } from "@/data/card/card-types"

// 定义社群卡牌的可用名称
export const COMMUNITY_CARD_NAMES = [
  "高城之民", "博识之民", "结社之民", "山岭之民", "滨海之民", "法外之民", "地下之民", "漂泊之民", "荒野之民"
] as const;

// 社群卡牌类型
export type CommunityCardClass = typeof COMMUNITY_CARD_NAMES[number];

// 社群卡牌数据结构
export interface CommunityCard {
  ID: string
  名称: CommunityCardClass
  特性: string
  简介: string
  描述: string
  imageUrl?: string
}

class CommunityCardConverter {
  // 转换为标准格式
  toStandard(card: CommunityCard): StandardCard {
    return {
      standarized: true,
      id: card.ID || uuidv4(),
      name: card.名称,
      type: CardType.Community,
      description: card.描述,
      hint: card.简介,
      imageUrl: "",
      class: card.名称,
      headerDisplay: card.名称,
      cardSelectDisplay: {
        "item1": card.特性,
      },
    }
  }
}

export const communityCardConverter = new CommunityCardConverter()
