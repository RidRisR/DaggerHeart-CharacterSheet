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

// 特殊卡牌位置
export const SPECIAL_CARD_POSITIONS = ["profession", "ancestry", "community"]

// 卡牌类别选项
export const CARD_CLASS_OPTIONS = {
  profession: ["吟游诗人", "德鲁伊", "守护者", "游侠", "盗贼", "神使", "术士", "战士", "法师"],
  ancestry: ["械灵", "恶魔", "龙人", "矮人", "精灵", "仙灵", "羊蹄人", "费尔伯格", "孢菌人", "龟人", "巨人", "哥布林", "半身人", "人类", "猫人", "兽人", "蛙裔", "猿人"],
  community: ["学者", "工匠", "商人", "贵族", "农民", "士兵", "艺术家", "医师", "探险家", "海员"],
  attack: ["近战", "远程", "法术", "陷阱", "毒药", "爆炸", "突袭", "狙击", "连击", "群攻"],
  defense: ["格挡", "闪避", "护甲", "法术防护", "反击", "抵抗", "治疗", "恢复", "护盾", "反射"],
  subclass: ["战士", "法师", "游侠", "盗贼", "牧师", "德鲁伊", "圣骑士", "术士", "武僧", "诗人"],
  domain: ["奥术", "利刃", "骸骨", "典籍", "优雅", "午夜", "贤者", "辉耀", "勇气"],
}

// 按类型分组的卡牌类别选项
export const CARD_CLASS_OPTIONS_BY_TYPE = {
  profession: [{ value: "all", label: "全部" }, ...CARD_CLASS_OPTIONS.profession.map(value => ({ value, label: value }))],
  ancestry: [{ value: "all", label: "全部" }, ...CARD_CLASS_OPTIONS.ancestry.map(value => ({ value, label: value }))],
  community: [{ value: "all", label: "全部" }, ...CARD_CLASS_OPTIONS.community.map(value => ({ value, label: value }))],
  attack: [{ value: "all", label: "全部" }, ...CARD_CLASS_OPTIONS.attack.map(value => ({ value, label: value }))],
  defense: [{ value: "all", label: "全部" }, ...CARD_CLASS_OPTIONS.defense.map(value => ({ value, label: value }))],
  subclass: [{ value: "all", label: "全部" }, ...CARD_CLASS_OPTIONS.subclass.map(value => ({ value, label: value }))],
  domain: [{ value: "all", label: "全部" }, ...CARD_CLASS_OPTIONS.domain.map(value => ({ value, label: value }))]
}

// 等级选项
export const LEVEL_OPTIONS = ["all", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]

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
export function getLevelOptions(): string[] {
  return LEVEL_OPTIONS
}

// 获取等级名称
export function getLevelName(level: number): string {
  return `LV.${level}`
}

// 检查是否是特殊卡牌位置
export function isSpecialCardPosition(position: string): boolean {
  return SPECIAL_CARD_POSITIONS.includes(position)
}

// 获取允许的卡牌类型
export function getAllowedCardTypeForPosition(position: string): string {
  if (isSpecialCardPosition(position)) {
    return position
  }
  return "any"
}
