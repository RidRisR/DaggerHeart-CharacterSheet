import { v4 as uuidv4 } from "uuid"
import { CARD_CLASS_OPTIONS, CardType, type StandardCard } from "@/data/card/card-types"

// 定义职业卡牌的可用名称
export const PROFESSION_CARD_NAMES = [
  "吟游诗人", "德鲁伊", "守护者", "游侠", "游荡者", "神使", "术士", "战士", "法师"
] as const;

// 职业卡牌类型
export type ProfessionCardClass = typeof PROFESSION_CARD_NAMES[number];

// 职业卡牌数据结构
export interface ProfessionCard {
  id: string
  名称: ProfessionCardClass
  简介: string
  imageUrl?: string
  领域1: string
  领域2: string
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
      description: card.职业特性,
      hint: card.简介,
      imageUrl: "",
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
