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

// 所有卡牌类型
export const ALL_CARD_TYPES = new Map<string, string>([
  [CardType.Profession, "职业"],
  [CardType.Ancestry, "血统"],
  [CardType.Community, "社群"],
  [CardType.Subclass, "子职业"],
  [CardType.Domain, "领域"], // 添加领域卡牌类型
]);

// 卡牌类别选项
export const CARD_CLASS_OPTIONS = {
  [CardType.Profession]: ["吟游诗人", "德鲁伊", "守护者", "游侠", "盗贼", "神使", "术士", "战士", "法师"],
  [CardType.Ancestry]: ["械灵", "恶魔", "龙人", "矮人", "精灵", "仙灵", "羊蹄人", "费尔伯格", "孢菌人", "龟人", "巨人", "哥布林", "半身人", "人类", "猫人", "兽人", "蛙裔", "猿人"],
  [CardType.Community]: ["高贵之民", "学识之民", "秩序之民", "山脊之民", "海滨之民", "狡诈之民", "地下之民", "流浪之民", "荒野之民"],
  [CardType.Subclass]: ["吟游诗人", "德鲁伊", "守护者", "游侠", "盗贼", "神使", "术士", "战士", "法师"],
  [CardType.Domain]: ["奥术", "利刃", "骸骨", "典籍", "优雅", "午夜", "贤者", "辉耀", "勇气"],
}

// 定义不同卡牌类型对应的等级选项
export const CARD_LEVEL_OPTIONS = {
  [CardType.Profession]: [],
  [CardType.Ancestry]: [],
  [CardType.Community]: ["特性一", "特性二"],
  [CardType.Subclass]: ["基石", "专精", "大师"],
  [CardType.Domain]: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
};

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
