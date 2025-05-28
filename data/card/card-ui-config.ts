/**
 * 卡牌UI配置
 * 用于定义卡牌UI相关的配置和辅助函数
 */

// 所有卡牌类型
export const ALL_CARD_TYPES = [
  { id: "profession", name: "职业" },
  { id: "ancestry", name: "血统" },
  { id: "community", name: "社区" },
  { id: "subclass", name: "子职业" },
  { id: "domain", name: "领域" }, // 添加领域卡牌类型
]

// 卡牌类别选项
export const CARD_CLASS_OPTIONS = {
  profession: ["吟游诗人", "德鲁伊", "守护者", "游侠", "盗贼", "神使", "术士", "战士", "法师"],
  ancestry: ["械灵", "恶魔", "龙人", "矮人", "精灵", "仙灵", "羊蹄人", "费尔伯格", "孢菌人", "龟人", "巨人", "哥布林", "半身人", "人类", "猫人", "兽人", "蛙裔", "猿人"],
  community: ["高贵之民", "学识之民", "秩序之民", "山脊之民", "海滨之民", "狡诈之民", "地下之民", "流浪之民", "荒野之民"],
  subclass: ["吟游诗人", "德鲁伊", "守护者", "游侠", "盗贼", "神使", "术士", "战士", "法师"],
  domain: ["奥术", "利刃", "骸骨", "典籍", "优雅", "午夜", "贤者", "辉耀", "勇气"],
}

// 按类型分组的卡牌类别选项
export const CARD_CLASS_OPTIONS_BY_TYPE = {
  profession: [{ value: "all", label: "全部" }, ...CARD_CLASS_OPTIONS.profession.map(value => ({ value, label: value }))],
  ancestry: [{ value: "all", label: "全部" }, ...CARD_CLASS_OPTIONS.ancestry.map(value => ({ value, label: value }))],
  community: [{ value: "all", label: "全部" }, ...CARD_CLASS_OPTIONS.community.map(value => ({ value, label: value }))],
  subclass: [{ value: "all", label: "全部" }, ...CARD_CLASS_OPTIONS.subclass.map(value => ({ value, label: value }))],
  domain: [{ value: "all", label: "全部" }, ...CARD_CLASS_OPTIONS.domain.map(value => ({ value, label: value }))]
}

// 定义不同卡牌类型对应的等级选项
export const CARD_LEVEL_OPTIONS = {
  profession: [],
  community: [],
  ancestry: ["特性一", "特性二"],
  subclass: ["基石", "专精", "大师"],
  domain: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
};

// Define a dictionary for level options by type with display names
export const CARD_LEVEL_OPTIONS_BY_TYPE = {
  profession: [{ value: "all", label: "全部" }],
  community: [{ value: "all", label: "全部" }],
  ancestry: [{ value: "all", label: "全部" }, ...CARD_LEVEL_OPTIONS.ancestry.map((label, index) => ({ value: (index + 1).toString(), label }))],
  subclass: [{ value: "all", label: "全部" }, ...CARD_LEVEL_OPTIONS.subclass.map((label, index) => ({ value: (index + 1).toString(), label }))],
  domain: [{ value: "all", label: "全部" }, ...CARD_LEVEL_OPTIONS.domain.map((label, index) => ({ value: (index + 1).toString(), label }))],
};

// 获取卡牌类型名称
export function getCardTypeName(typeId: string): string {
  const type = ALL_CARD_TYPES.find((t) => t.id === typeId)
  return type ? type.name : typeId
}

// 获取卡牌类型颜色
export function getCardTypeColor(typeId: string): string {
  return "gray-500"
}

// 获取卡牌类别选项
export function getCardClassOptions(typeId: string): string[] {
  return CARD_CLASS_OPTIONS[typeId as keyof typeof CARD_CLASS_OPTIONS] || []
}

// 获取等级选项
export function getLevelOptions(typeId: string): { value: string; label: string }[] {
  return CARD_LEVEL_OPTIONS_BY_TYPE[typeId as keyof typeof CARD_LEVEL_OPTIONS_BY_TYPE] || [];
}

// 获取等级名称
export function getLevelName(level: number): string {
  return `LV.${level}`
}
