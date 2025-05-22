import { v4 as uuidv4 } from "uuid"
import type { StandardCard } from "@/data/card/card-types"

// 社区卡牌类型
export type CommunityCardClass = "村庄" | "城市" | "前哨站" | "城堡" | "神殿" | "荒野" | "地下城" | "酒馆" | "要塞"

// 社区卡牌数据结构
export interface CommunityCard {
  ID?: string
  名称?: string
  描述?: string
  imageUrl?: string
  class: CommunityCardClass
}

class CommunityCardConverter {
  // 转换为标准格式
  toStandard(card: CommunityCard): StandardCard {
    return {
      standarized: true,
      id: card.ID || uuidv4(),
      name: card.名称 || "",
      type: "community",
      description: card.描述 || "",
      imageUrl: card.imageUrl,
      class: card.class,
    }
  }
}

export const communityCardConverter = new CommunityCardConverter()
