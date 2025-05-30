/**
 * 卡牌UI配置
 * 用于定义卡牌UI相关的配置和辅助函数
 */

import { CardType } from "./card-types";

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
  profession: ["吟游诗人", "德鲁伊", "守护者", "游侠", "盗贼", "神使", "术士", "战士", "法师"],
  ancestry: ["械灵", "恶魔", "龙人", "矮人", "精灵", "仙灵", "羊蹄人", "费尔伯格", "孢菌人", "龟人", "巨人", "哥布林", "半身人", "人类", "猫人", "兽人", "蛙裔", "猿人"],
  community: ["高贵之民", "学识之民", "秩序之民", "山脊之民", "海滨之民", "狡诈之民", "地下之民", "流浪之民", "荒野之民"],
  subclass: ["吟游诗人", "德鲁伊", "守护者", "游侠", "盗贼", "神使", "术士", "战士", "法师"],
  domain: ["奥术", "利刃", "骸骨", "典籍", "优雅", "午夜", "贤者", "辉耀", "勇气"],
}

// 按类型分组的卡牌类别选项
export const CARD_CLASS_OPTIONS_BY_TYPE = {
  profession: [...CARD_CLASS_OPTIONS.profession.map(value => ({ value, label: value }))],
  ancestry: [...CARD_CLASS_OPTIONS.ancestry.map(value => ({ value, label: value }))],
  community: [...CARD_CLASS_OPTIONS.community.map(value => ({ value, label: value }))],
  subclass: [...CARD_CLASS_OPTIONS.subclass.map(value => ({ value, label: value }))],
  domain: [...CARD_CLASS_OPTIONS.domain.map(value => ({ value, label: value }))]
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
  profession: [],
  community: [],
  ancestry: [...CARD_LEVEL_OPTIONS.ancestry.map((label, index) => ({ value: (index + 1).toString(), label }))],
  subclass: [...CARD_LEVEL_OPTIONS.subclass.map((label, index) => ({ value: (index + 1).toString(), label }))],
  domain: [...CARD_LEVEL_OPTIONS.domain.map((label, index) => ({ value: (index + 1).toString(), label }))],
};

// 获取卡牌类型名称
export function getCardTypeName(typeId: CardType): string {
  return ALL_CARD_TYPES.get(typeId) || "未知类型";
}

// 获取等级选项
export function getLevelOptions(typeId: string): { value: string; label: string }[] {
  return CARD_LEVEL_OPTIONS_BY_TYPE[typeId as keyof typeof CARD_LEVEL_OPTIONS_BY_TYPE] || [];
}