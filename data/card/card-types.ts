export interface StandardCard {
  standarized: boolean
  id: string
  name: string
  type: string // 确保这个字段存在
  class: string
  level?: number
  description?: string
  imageUrl?: string
  primaryAttribute?: string,
  secondaryAttribute?: string,
  attributes?: Record<string, string>,
  // ... 其他字段
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
  0: { name: "职业卡", type: "profession" },
  1: { name: "血统卡 1", type: "ancestry" },
  2: { name: "血统卡 2", type: "ancestry" },
  3: { name: "社区卡", type: "community" },
}

// 确保 isSpecialCardPosition 函数只将前4个位置视为特殊卡位
export function isSpecialCardPosition(index: number): boolean {
  return index >= 0 && index <= 3
}

export function getAllowedCardTypeForPosition(index: number): string {
  if (isSpecialCardPosition(index)) {
    return specialCardPositions[index as keyof typeof specialCardPositions].type
  }
  return ""
}
