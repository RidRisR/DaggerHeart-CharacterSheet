import { v4 as uuidv4 } from "uuid"
import { CardType, processCardDescription, type StandardCard } from "@/card/card-types"
import { DomainClass, ProfessionClass } from "@/card/card-types";

// 职业卡牌数据结构
export interface ProfessionCard {
  id: string
  名称: ProfessionClass
  简介: string
  imageUrl?: string
  hasLocalImage?: boolean
  领域1: DomainClass
  领域2: DomainClass
  起始生命: number
  起始闪避: number
  起始物品: string
  希望特性: string
  职业特性: string
}


class ProfessionCardConverter {
  toStandard(card: ProfessionCard): StandardCard {
    return {
      standarized: true,
      id: card.id || uuidv4(),
      name: card.名称,
      type: CardType.Profession,
      description: processCardDescription(card.职业特性) || "",
      hint: card.简介,
      imageUrl: card.imageUrl || "",
      hasLocalImage: card.hasLocalImage,
      class: card.名称,
      headerDisplay: card.名称,
      cardSelectDisplay: {
        "item1": card.领域1,
        "item2": card.领域2,
      },
      professionSpecial: {
        "起始生命": card.起始生命,
        "起始闪避": card.起始闪避,
        "起始物品": card.起始物品,
        "希望特性": card.希望特性,
      },
    }
  }
}

export const professionCardConverter = new ProfessionCardConverter()
