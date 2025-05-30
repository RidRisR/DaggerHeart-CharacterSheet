/**
 * 卡牌UI配置
 * 用于定义卡牌UI相关的配置和辅助函数
 */

import { ALL_CARD_TYPES, CARD_CLASS_OPTIONS, CARD_LEVEL_OPTIONS, CardType } from "./card-types";

// 按类型分组的卡牌类别选项
export const CARD_CLASS_OPTIONS_BY_TYPE = {
  [CardType.Profession]: [...CARD_CLASS_OPTIONS.profession.map(value => ({ value, label: value }))],
  [CardType.Ancestry]: [...CARD_CLASS_OPTIONS.ancestry.map(value => ({ value, label: value }))],
  [CardType.Community]: [...CARD_CLASS_OPTIONS.community.map(value => ({ value, label: value }))],
  [CardType.Subclass]: [...CARD_CLASS_OPTIONS.subclass.map(value => ({ value, label: value }))],
  [CardType.Domain]: [...CARD_CLASS_OPTIONS.domain.map(value => ({ value, label: value }))]
}

// Define a dictionary for level options by type with display names
export const CARD_LEVEL_OPTIONS_BY_TYPE = {
  [CardType.Profession]: [],
  [CardType.Ancestry]: [],
  [CardType.Community]: [...CARD_LEVEL_OPTIONS.ancestry.map((label, index) => ({ value: (index + 1).toString(), label }))],
  [CardType.Subclass]: [...CARD_LEVEL_OPTIONS.subclass.map((label, index) => ({ value: (index + 1).toString(), label }))],
  [CardType.Domain]: [...CARD_LEVEL_OPTIONS.domain.map((label, index) => ({ value: (index + 1).toString(), label }))],
};

// 获取卡牌类型名称
export function getCardTypeName(typeId: CardType): string {
  return ALL_CARD_TYPES.get(typeId) || "未知类型";
}

// 获取等级选项
export function getLevelOptions(typeId: CardType): { value: string; label: string }[] {
  return CARD_LEVEL_OPTIONS_BY_TYPE[typeId as keyof typeof CARD_LEVEL_OPTIONS_BY_TYPE] || [];
}