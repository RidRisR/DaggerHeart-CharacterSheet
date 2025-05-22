import { v4 as uuidv4 } from "uuid"
import type { StandardCard } from "@/data/card/card-types"

// 职业卡牌类型
export type ProfessionCardClass = "战士" | "法师" | "盗贼" | "牧师" | "游侠" | "吟游诗人" | "圣骑士" | "德鲁伊"

// 职业卡牌数据结构
export interface ProfessionCard {
  ID: string
  名称: string
  职业: ProfessionCardClass
  描述?: string
  imageUrl?: string
  等级?: number
  特技?: string
  要求?: string
  type?: string
}


class ProfessionCardConverter {
  toStandard(card: ProfessionCard): StandardCard {
    return {
      standarized: true,
      id: card.ID || uuidv4(),
      name: card.名称 || "",
      type: "profession",
      description: card.描述 || "",
      imageUrl: card.imageUrl || "",
      class: card.职业,
      primaryAttribute: card.特技,
      secondaryAttribute: card.要求,
    }
  }
}

export const professionCardConverter = new ProfessionCardConverter()
