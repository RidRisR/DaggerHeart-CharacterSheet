/**
 * 卡牌UI配置
 * 用于定义卡牌UI相关的配置和辅助函数
 */

import { ALL_CARD_TYPES, CardType, isVariantType } from "./card-types";
import { CARD_LEVEL_OPTIONS } from "./card-types"; // Assuming CARD_LEVEL_OPTIONS from card-types is still valid

// 按类型分组的卡牌类别选项 - 动态生成以避免循环依赖
export function getCardClassOptionsByType(tempBatchId?: string, tempDefinitions?: any) {
  // Import functions dynamically to avoid circular dependencies
  const {
    getProfessionCardNames,
    getAncestryCardNames,
    getCommunityCardNames,
    getSubClassCardNames,
    getDomainCardNames
  } = require("./card-predefined-field");
  
  return {
    [CardType.Profession]: getProfessionCardNames(tempBatchId, tempDefinitions).map((value: string) => ({ value, label: value })),
    [CardType.Ancestry]: getAncestryCardNames(tempBatchId, tempDefinitions).map((value: string) => ({ value, label: value })),
    [CardType.Community]: getCommunityCardNames(tempBatchId, tempDefinitions).map((value: string) => ({ value, label: value })),
    [CardType.Subclass]: getSubClassCardNames(tempBatchId, tempDefinitions).map((value: string) => ({ value, label: value })),
    [CardType.Domain]: getDomainCardNames(tempBatchId, tempDefinitions).map((value: string) => ({ value, label: value }))
  };
}

// 获取变体类型的子类别选项（作为class选项）
export function getVariantSubclassOptions(variantType: string, tempBatchId?: string, tempDefinitions?: any): { value: string; label: string }[] {
  const { getVariantTypes } = require("./card-predefined-field");
  const variantTypes = getVariantTypes(tempBatchId, tempDefinitions);
  const typeDef = variantTypes[variantType];

  if (!typeDef?.subclasses) return [];

  return typeDef.subclasses.map((subclass: string) => ({
    value: subclass,
    label: subclass
  }));
}

// 获取所有可用的变体类型列表（用作UI中的卡牌类型选项）
export function getAvailableVariantTypes(tempBatchId?: string, tempDefinitions?: any): { value: string; label: string }[] {
  const { getVariantTypes } = require("./card-predefined-field");
  const variantTypes = getVariantTypes(tempBatchId, tempDefinitions);
  return Object.entries(variantTypes).map(([typeId, typeDef]) => ({
    value: typeId,
    label: typeId  // 直接使用对象键作为显示名称
  }));
}

// 动态生成变体卡牌等级选项
export function getVariantLevelOptions(variantType: string, tempBatchId?: string, tempDefinitions?: any): { value: string; label: string }[] {
  const { getVariantTypes } = require("./card-predefined-field");
  const variantTypes = getVariantTypes(tempBatchId, tempDefinitions);
  const typeDef = variantTypes[variantType];

  if (!typeDef?.levelRange) return [];

  const [min, max] = typeDef.levelRange;
  return Array.from({ length: max - min + 1 }, (_, i) => ({
    value: (min + i).toString(),
    label: `等级 ${min + i}`
  }));
}

// Define a dictionary for level options by type with display names
export const CARD_LEVEL_OPTIONS_BY_TYPE = {
  [CardType.Profession]: [], // Assuming no levels for Profession
  [CardType.Ancestry]: CARD_LEVEL_OPTIONS[CardType.Ancestry].map((label: string, index: number) => ({ value: (index + 1).toString(), label })),  // Corrected: Add level options for Ancestry
  [CardType.Community]: [],
  [CardType.Subclass]: CARD_LEVEL_OPTIONS[CardType.Subclass].map((label: string, index: number) => ({ value: (index + 1).toString(), label })),
  [CardType.Domain]: CARD_LEVEL_OPTIONS[CardType.Domain].map((label: string, index: number) => ({ value: (index + 1).toString(), label })),
};

// 获取卡牌类型名称
export function getCardTypeName(typeId: string): string {
  // 检查是否是标准卡牌类型
  if (Object.values(CardType).includes(typeId as CardType)) {
    return ALL_CARD_TYPES.get(typeId as CardType) || "未知类型";
  }

  // 检查是否是变体类型
  return getVariantTypeName(typeId);
}

// 获取等级选项
export function getLevelOptions(typeId: string): { value: string; label: string }[] {
  // 检查是否是标准卡牌类型
  if (Object.values(CardType).includes(typeId as CardType)) {
    return CARD_LEVEL_OPTIONS_BY_TYPE[typeId as keyof typeof CARD_LEVEL_OPTIONS_BY_TYPE] || [];
  }

  // 检查是否是变体类型
  return getVariantLevelOptions(typeId);
}