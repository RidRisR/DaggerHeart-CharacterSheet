// Functions will be imported dynamically to avoid circular dependencies

// 属性类别常量列表
export const ATTRIBUTE_CLASS_NAMES: string[] = [
    "力量", "敏捷", "灵巧", "风度", "本能", "知识", "不可施法"
];

// 子职业等级常量列表  
export const SUBCLASS_LEVEL_NAMES: string[] = [
    "基石", "专精", "大师", "未知"
];

// 从常量列表生成类型
export type AttributeClass = typeof ATTRIBUTE_CLASS_NAMES[number];
export type SubClassLevel = typeof SUBCLASS_LEVEL_NAMES[number];

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
  // 变体卡牌信息（仅在type="variant"时使用）
  variantSpecial?: {
    realType: string;      // 真实卡牌类型，来自RawVariantCard.类型
    subCategory?: string;   // 子类别，来自RawVariantCard.子类别
  }
  // ... 其他字段
}

export enum CardType {
  Profession = "profession",
  Ancestry = "ancestry",
  Community = "community",
  Subclass = "subclass",
  Domain = "domain",
  Variant = "variant", // 新增变体卡牌类型
  // Add "all" if it's a valid type for getStandardCardsByType, or handle separately.
  // For now, assuming it's not directly used with getStandardCardsByType for a filtered list.
}

// 卡牌分类枚举
export enum CardCategory {
  Standard = "standard",   // 标准卡牌（内置类型）
  Extended = "extended"    // 扩展卡牌（变体卡牌）
}

// 所有卡牌类型
export const ALL_CARD_TYPES = new Map<string, string>([
  [CardType.Profession, "职业"],
  [CardType.Ancestry, "血统"],
  [CardType.Community, "社群"],
  [CardType.Subclass, "子职业"],
  [CardType.Domain, "领域"], // 添加领域卡牌类型
  [CardType.Variant, "杂项"], // 添加变体卡牌类型
]);

// 根据分类获取卡牌类型
export function getCardTypesByCategory(category: CardCategory): string[] {
  switch (category) {
    case CardCategory.Standard:
      return [CardType.Profession, CardType.Ancestry, CardType.Community, CardType.Subclass, CardType.Domain];
    case CardCategory.Extended:
      // 动态获取可用的variant类型
      const { getVariantTypeNames } = require('./card-predefined-field');
      return getVariantTypeNames();
    default:
      return Object.values(CardType);
  }
}

// 卡牌类别选项 - 动态生成以避免循环依赖
export function getCardClassOptions(tempBatchId?: string, tempDefinitions?: any) {
  // Import functions dynamically to avoid circular dependencies
  const {
    getProfessionCardNames,
    getAncestryCardNames,
    getCommunityCardNames,
    getSubClassCardNames,
    getDomainCardNames
  } = require("@/card/card-predefined-field");
  
  return {
    [CardType.Profession]: getProfessionCardNames(tempBatchId, tempDefinitions),
    [CardType.Ancestry]: getAncestryCardNames(tempBatchId, tempDefinitions),
    [CardType.Community]: getCommunityCardNames(tempBatchId, tempDefinitions),
    [CardType.Subclass]: getSubClassCardNames(tempBatchId, tempDefinitions),
    [CardType.Domain]: getDomainCardNames(tempBatchId, tempDefinitions),
  };
}

// 定义不同卡牌类型对应的等级选项
export const CARD_LEVEL_OPTIONS = {
  [CardType.Profession]: [],
  [CardType.Ancestry]: ["特性一", "特性二"],
  [CardType.Community]: [],
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

// ===== 自定义卡牌导入相关类型定义 =====

// 引入原始卡牌类型
import type { ProfessionCard } from '@/card/profession-card/convert';
import type { AncestryCard } from '@/card/ancestry-card/convert';
import type { CommunityCard } from '@/card/community-card/convert';
import type { SubClassCard } from '@/card/subclass-card/convert';
import type { DomainCard } from '@/card/domain-card/convert';
import { RawVariantCard } from "./variant-card/convert";

// 变体类型定义接口（简化版）
export interface VariantTypeDefinition {
  subclasses: string[];           // 允许的子类别列表
  defaultLevel?: number;          // 默认等级
  levelRange?: [number, number];  // 等级范围 [最小值, 最大值]
  description?: string;           // 类型描述
  // 注意：显示名称直接使用对象键，不再需要name字段
}

// 新的导入数据格式定义 - 支持原始卡牌类型
export interface ImportData {
  name?: string;        // 卡牌包名称
  version?: string;     // 版本
  description?: string; // 描述
  author?: string;      // 作者

  // New field for defining custom field names
  customFieldDefinitions?: {
    profession?: string[];
    ancestry?: string[];
    community?: string[];
    subclass?: string[];
    domain?: string[];
    variantTypes?: Record<string, VariantTypeDefinition>; // 变体类型定义
    [key: string]: string[] | Record<string, VariantTypeDefinition> | undefined; // Allows for other potential categories
  };

  // 类型化的卡牌数组 - 用户导入原始格式
  profession?: ProfessionCard[];
  ancestry?: AncestryCard[];
  community?: CommunityCard[];
  subclass?: SubClassCard[];
  domain?: DomainCard[];
  variant?: RawVariantCard[]; // 变体卡牌数组
}

// 导入结果定义
export interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  duplicateIds?: string[];
  conflictingTypes?: string[]; // 变体类型冲突列表
  batchId?: string; // 成功导入时返回批次ID
}

// ID验证结果定义
export interface ValidationResult {
  isValid: boolean;
  duplicateIds: string[];
}

// 自定义卡牌统计信息
export interface CustomCardStats {
  totalCards: number;
  totalBatches: number;
  cardsByType: Record<string, number>;
  cardsByBatch: Record<string, number>;
  storageUsed: number; // 字节数
}

// Card class types (moved here to avoid circular dependencies)
export type SubClassClass = string;
export type ProfessionClass = string;
export type AncestryClass = string;
export type CommunityClass = string;
export type DomainClass = string;

// 批次统计信息
export interface BatchStats {
  cardCount: number;
  cardTypes: string[];
  storageSize: number;
  importTime: string;
}

// 卡牌来源标识
export enum CardSource {
  BUILTIN = 'builtin',
  CUSTOM = 'custom'
}

// 扩展的StandardCard，包含来源信息
export interface ExtendedStandardCard extends StandardCard {
  source?: CardSource;
  batchId?: string; // 自定义卡牌的批次ID
  batchName?: string; // 自定义卡牌的批次名称
}

// Helper: 判断给定的类型ID是否是变体类型
export function isVariantType(typeId: string): boolean {
  // 如果是标准卡牌类型，则不是variant类型
  if (Object.values(CardType).includes(typeId as CardType)) {
    return false;
  }

  // 检查是否在已注册的variant类型中
  try {
    const { hasVariantType } = require('./card-predefined-field');
    return hasVariantType(typeId);
  } catch (error) {
    return false;
  }
}

// Helper: 判断卡牌是否为变体卡牌
export function isVariantCard(card: StandardCard): boolean {
  return card.type === CardType.Variant;
}

// Helper: 获取变体卡牌的真实类型
export function getVariantRealType(card: StandardCard): string | null {
  if (!isVariantCard(card) || !card.variantSpecial) {
    return null;
  }
  return card.variantSpecial.realType;
}

// Helper: 获取变体卡牌的子类别
export function getVariantSubCategory(card: StandardCard): string | null {
  if (!isVariantCard(card) || !card.variantSpecial) {
    return null;
  }
  return card.variantSpecial.subCategory || null;
}

// Helper: 获取卡牌的有效类型（变体卡牌返回真实类型，其他返回type）
export function getEffectiveCardType(card: StandardCard): string {
  if (isVariantCard(card)) {
    return getVariantRealType(card) || card.type;
  }
  return card.type;
}

// Helper: 判断卡牌是否为自定义卡牌
export function isCustomCard(card: StandardCard | ExtendedStandardCard): boolean {
  return (card as ExtendedStandardCard).source === CardSource.CUSTOM;
}

/**
 * 统一的文本处理函数
 * 对卡牌描述进行格式化处理
 */
export function processCardDescription(description: string): string {
  if (!description) return description;

  // 1. 先找到所有特性标题的位置
  const featurePattern = /\*__.*?__\*/g;
  const matches = Array.from(description.matchAll(featurePattern));

  if (matches.length === 0) {
    // 如果没有特性标题，处理列表项后的段落分隔
    return processListItemParagraphs(description);
  }

  // 2. 分段处理文本
  let processed = '';
  let lastIndex = 0;

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const matchStart = match.index!;
    const matchEnd = matchStart + match[0].length;

    // 处理特性标题之前的文本
    let beforeText = description.substring(lastIndex, matchStart);

    // 检查特性标题是否在列表项中（包括可能的换行符）
    const isInListItem = beforeText.match(/- \s*\n?$/);

    if (isInListItem) {
      // 如果在列表项中，移除特性标题前的换行符，保持紧凑格式
      beforeText = beforeText.replace(/- \s*\n?$/, '- ');
    } else {
      // 如果不在列表项中，按原逻辑处理
      beforeText = beforeText.replace(/\n+/g, '\n');

      // 如果不是第一个特性，在特性标题前添加段落分隔
      if (i > 0) {
        // 确保前面有两个换行符来分隔段落
        if (beforeText.endsWith('\n')) {
          beforeText = beforeText.slice(0, -1) + '\n\n';
        } else {
          beforeText += '\n\n';
        }
      }
    }

    processed += beforeText + match[0];
    lastIndex = matchEnd;
  }

  // 处理最后一个特性标题之后的文本
  let afterText = description.substring(lastIndex);
  afterText = afterText.replace(/\n+/g, '\n');
  processed += afterText;

  // 最后处理列表项后的段落分隔
  return processListItemParagraphs(processed.trim());
}

/**
 * 处理列表项后的段落分隔
 * 确保列表项结束后的新段落有适当的分隔
 */
function processListItemParagraphs(text: string): string {
  if (!text) return text;

  // 匹配列表项结束后直接跟着的文本段落
  // 列表项模式：以 "- " 开始的行，结束后换行跟着非列表项文本
  const listItemEndPattern = /(-\s[^\n]+)\n([^\n-][^\n]*)/g;

  return text.replace(listItemEndPattern, '$1\n\n$2');
}
