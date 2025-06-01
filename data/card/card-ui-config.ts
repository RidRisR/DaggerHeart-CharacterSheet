/**
 * 卡牌UI配置
 * 用于定义卡牌UI相关的配置和辅助函数
 */

import { ALL_CARD_TYPES, CardType } from "./card-types";
// Import getter functions directly from card-predefined-field.ts
import {
  getProfessionCardNames,
  getAncestryCardNames,
  getCommunityCardNames,
  getSubClassCardNames,
  getDomainCardNames
} from "./card-predefined-field";
import { CARD_LEVEL_OPTIONS } from "./card-types"; // Assuming CARD_LEVEL_OPTIONS from card-types is still valid

// 按类型分组的卡牌类别选项
// This now dynamically fetches the names including custom ones.
export const CARD_CLASS_OPTIONS_BY_TYPE = {
  [CardType.Profession]: getProfessionCardNames().map((value: string) => ({ value, label: value })),
  [CardType.Ancestry]: getAncestryCardNames().map((value: string) => ({ value, label: value })),
  [CardType.Community]: getCommunityCardNames().map((value: string) => ({ value, label: value })),
  [CardType.Subclass]: getSubClassCardNames().map((value: string) => ({ value, label: value })),
  [CardType.Domain]: getDomainCardNames().map((value: string) => ({ value, label: value }))
};

// Define a dictionary for level options by type with display names
export const CARD_LEVEL_OPTIONS_BY_TYPE = {
  [CardType.Profession]: [], // Assuming no levels for Profession
  [CardType.Ancestry]: [],  // Assuming no levels for Ancestry
  [CardType.Community]: CARD_LEVEL_OPTIONS[CardType.Community].map((label: string, index: number) => ({ value: (index + 1).toString(), label })),
  [CardType.Subclass]: CARD_LEVEL_OPTIONS[CardType.Subclass].map((label: string, index: number) => ({ value: (index + 1).toString(), label })),
  [CardType.Domain]: CARD_LEVEL_OPTIONS[CardType.Domain].map((label: string, index: number) => ({ value: (index + 1).toString(), label })),
};

// 获取卡牌类型名称
export function getCardTypeName(typeId: CardType): string {
  return ALL_CARD_TYPES.get(typeId) || "未知类型";
}

// 获取等级选项
export function getLevelOptions(typeId: CardType): { value: string; label: string }[] {
  return CARD_LEVEL_OPTIONS_BY_TYPE[typeId as keyof typeof CARD_LEVEL_OPTIONS_BY_TYPE] || [];
}