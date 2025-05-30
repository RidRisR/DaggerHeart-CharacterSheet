import { v4 as uuidv4 } from "uuid"
import { CardType, type StandardCard } from "@/data/card/card-types"
import { CommunityClass } from "../card-predefined-field"


// 社群卡牌数据结构
export interface CommunityCard {
  ID: string
  名称: CommunityClass
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
