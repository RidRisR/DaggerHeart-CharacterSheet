/**
 * 卡牌UI配置
 * 用于定义卡牌UI相关的配置和辅助函数
 */

import { ALL_CARD_TYPES, CardType, isVariantType } from "./card-types";
import { CARD_LEVEL_OPTIONS } from "./card-types"; // Assuming CARD_LEVEL_OPTIONS from card-types is still valid
import { useUnifiedCardStore } from "./stores/unified-card-store";

/**
 * 🚀 优化：按需获取指定卡牌类型的类别选项（直接从 subclassCountIndex 读取）
 * 性能提升：从计算 5 种类型降至仅计算 1 种类型
 */
export function getCardClassOptionsForType(cardType: string): { value: string; label: string }[] {
  const store = useUnifiedCardStore.getState();
  const subclasses = store.subclassCountIndex?.[cardType];

  if (!subclasses) return [];

  // 从已有的 subclassCountIndex 缓存中读取，过滤计数为 0 的子类别
  return Object.entries(subclasses)
    .filter(([subclass, count]) => count > 0 && subclass !== '__no_subclass__')
    .map(([subclass]) => ({ value: subclass, label: subclass }));
}

// 按类型分组的卡牌类别选项 - 动态生成以避免循环依赖
// ⚠️ 性能警告：此函数会计算所有 5 种卡牌类型，建议使用 getCardClassOptionsForType 按需计算
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
  const { useUnifiedCardStore } = require("./stores/unified-card-store");

  const variantTypes = getVariantTypes(tempBatchId, tempDefinitions);
  const typeDef = variantTypes[variantType];

  if (!typeDef?.subclasses) return [];

  // Get all defined subclasses
  const allSubclasses = typeDef.subclasses.map((subclass: string) => ({
    value: subclass,
    label: subclass
  }));

  // Filter out subclasses with 0 cards
  const store = useUnifiedCardStore.getState();
  const counts = store.subclassCountIndex?.[variantType] || {};

  return allSubclasses.filter((option: { value: string | number; }) => (counts[option.value] || 0) > 0);
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

  // 检查是否是变体类型 - 对于变体类型，直接返回 typeId 作为显示名称
  return typeId;
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

// ===== 卡牌类型配色系统 =====

/**
 * 卡牌类型颜色配置
 * 用于区分不同类型的卡牌，提升视觉识别度
 */
export interface CardTypeColorConfig {
  /** 左侧边框颜色（CSS颜色值） */
  borderColor: string;
}

/**
 * 获取卡牌类型的颜色配置
 */
export function getCardTypeColors(card: { type: string; variantSpecial?: { realType?: string } }): CardTypeColorConfig {
  // 处理变体卡牌：使用真实类型的颜色
  let effectiveType = card.type;
  if (card.type === CardType.Variant && card.variantSpecial?.realType) {
    effectiveType = card.variantSpecial.realType;
  }

  const colorMap: Record<string, CardTypeColorConfig> = {
    [CardType.Domain]: {
      borderColor: '#f87171', // red-400 (淡红色)
    },
    [CardType.Profession]: {
      borderColor: '#60a5fa', // blue-400 (淡蓝色)
    },
    [CardType.Ancestry]: {
      borderColor: '#9ca3af', // gray-400 (淡灰色)
    },
    [CardType.Subclass]: {
      borderColor: '#c084fc', // purple-400 (淡紫色)
    },
    [CardType.Community]: {
      borderColor: '#2dd4bf', // teal-400 (淡青绿色)
    },
  };

  // 返回对应颜色，如果找不到则使用灰色默认值
  return colorMap[effectiveType] || {
    borderColor: '#34d399', // green-400 (淡绿色，变体卡牌)
  };
}