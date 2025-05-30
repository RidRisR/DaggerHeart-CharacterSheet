export interface StandardCard {
  standarized: boolean
  id: string
  name: string
  type: string // 确保这个字段存在
  class: string
  level?: number
  description?: string
  hint?: string
  imageUrl?: string
  headerDisplay?: string
  cardSelectDisplay: {
    item1?: string
    item2?: string
    item3?: string
    item4?: string
  }
  professionSpecial?: {
    "起始生命": number
    "起始闪避": number
    "起始物品": string
    "希望特性": string
  }
  // ... 其他字段
}

export enum CardType {
  Profession = "profession",
  Ancestry = "ancestry",
  Community = "community",
  Subclass = "subclass",
  Domain = "domain",
  // Add "all" if it's a valid type for getStandardCardsByType, or handle separately.
  // For now, assuming it's not directly used with getStandardCardsByType for a filtered list.
}

export function createEmptyCard(type = "unknown"): StandardCard {
  return {
    standarized: true,
    id: `empty-${Math.random().toString(36).substring(2, 9)}`,
    name: "",
    class: "",
    description: "",
    imageUrl: "",
    type: type, // 确保设置了 type 字段
    cardSelectDisplay: {
      item1: "",
      item2: "",
      item3: "",
    }
    // ... 其他必要字段的默认值
  }
}

// 添加 isEmptyCard 函数的实现
export function isEmptyCard(card: any): boolean {
  if (!card) return true

  // 检查卡牌是否为空（没有名称或其他关键属性）
  return !card.name || card.name === "" || card.type === "unknown" || card.id === ""
}

// 添加 isSpecialCardPosition 和 specialCardPositions 的定义
export const specialCardPositions = {
  0: { name: "职业卡", type: CardType.Profession },
  1: { name: "子职业卡", type: CardType.Subclass },
  2: { name: "血统卡 1", type: CardType.Ancestry },
  3: { name: "血统卡 2", type: CardType.Ancestry },
  4: { name: "社群卡", type: CardType.Community },
}
