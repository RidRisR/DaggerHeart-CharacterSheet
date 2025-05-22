/**
 * 领域卡牌转换器
 * 用于将原始领域卡牌数据转换为标准格式
 */

import { v4 as uuidv4 } from "uuid"
import type { StandardCard } from "@/data/card/card-types"

// 领域卡牌类型
export type DomainCardClass = "奥术" | "利刃" | "骸骨" | "典籍" | "优雅" | "午夜" | "贤者" | "辉耀" | "勇气"

// 领域卡牌数据结构
export interface DomainCard {
  ID: string
  名称: string
  领域: DomainCardClass
  描述?: string
  imageUrl?: string
  等级?: number
  属性?: string
  回想?: number
}

// 领域卡牌转换器
class DomainCardConverter {
  // 将原始领域卡牌数据转换为标准格式
  toStandard(card: DomainCard): StandardCard {
    return {
      standarized: true,
      id: card.ID || uuidv4(),
      name: card.名称 || "",
      type: "domain",
      description: card.描述 || "",
      imageUrl: card.imageUrl || "",
      class: card.领域,
      primaryAttribute: card.属性,
      secondaryAttribute: "RC." + card.回想,
      level: card.等级,
      cardSelectDisplay: {
        "item1": card.属性 || "",
        "item2": card.回想 ? "RC." + card.回想 : "",
        "item3": card.等级 ? "LV." + card.等级.toString() : "",
      },
    }
  }
}

export const domainCardConverter = new DomainCardConverter()
