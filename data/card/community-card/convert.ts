import { v4 as uuidv4 } from "uuid"
import type { StandardCard } from "@/data/card/card-types"

// 社区卡牌类型
export type CommunityCardClass = "高贵之民" | "学识之民" | "秩序之民" | "山脊之民" | "海滨之民" | "狡诈之民" | "地下之民" | "流浪之民" | "荒野之民"

// 社区卡牌数据结构
export interface CommunityCard {
  ID: string
  名称: CommunityCardClass
  特性?: string
  简介?: string
  描述?: string
  imageUrl?: string
}

class CommunityCardConverter {
  // 转换为标准格式
  toStandard(card: CommunityCard): StandardCard {
    return {
      standarized: true,
      id: card.ID || uuidv4(),
      name: card.名称 || "",
      type: "community",
      primaryAttribute: "种族",
      secondaryAttribute: card.特性,
      description: card.描述 || "",
      imageUrl: card.imageUrl,
      class: card.名称,
      attributes: {
        "简介": card.简介 || "",
        "特性": card.特性 || "",
      },
    }
  }
}

export const communityCardConverter = new CommunityCardConverter()
