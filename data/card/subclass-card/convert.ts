import { v4 as uuidv4 } from "uuid"
import { CARD_CLASS_OPTIONS, CardType, type StandardCard } from "@/data/card/card-types"

// 领域卡牌类型
export type SubClassClass = typeof CARD_CLASS_OPTIONS.subclass[number];

// 领域卡牌数据结构
export interface SubClassCard {
  id: string
  名称: string
  描述: string
  imageUrl?: string
  主职: SubClassClass
  子职业: string
  等级: string
  施法: string
}

class SubClassCardConverter {
  // 转换为标准格式
  toStandard(card: SubClassCard): StandardCard {
    // 等级转换：基石=1，专精=2，精通=3
    let levelNum: number
    switch (card.等级) {
      case "基石":
        levelNum = 1
        break
      case "专精":
        levelNum = 2
        break
      case "大师":
        levelNum = 3
        break
      default:
        levelNum = 0 // 未知等级
    }

    return {
      standarized: true,
      id: card.id || uuidv4(),
      name: card.名称,
      type: CardType.Subclass,
      description: card.描述,
      imageUrl: "",
      class: card.主职,
      level: levelNum,
      headerDisplay: card.子职业,
      cardSelectDisplay: {
        item1: card.主职,
        item2: card.等级,
        item3: card.施法,
      },
    }
  }
}

export const subclassCardConverter = new SubClassCardConverter()
