import {
  // Import the new getter functions
  getProfessionCardNames,
  getAncestryCardNames,
  getCommunityCardNames,
  getSubClassCardNames,
  getDomainCardNames
} from "@/data/card/card-predefined-field";

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
export function getCardTypesByCategory(category: CardCategory): CardType[] {
  switch (category) {
    case CardCategory.Standard:
      return [CardType.Profession, CardType.Ancestry, CardType.Community, CardType.Subclass, CardType.Domain];
    case CardCategory.Extended:
      return [CardType.Variant];
    default:
      return Object.values(CardType);
  }
}

// 卡牌类别选项
// This structure might need to be dynamically generated if it's used to populate UI directly
// For now, we assume it might be used for initial setup or as a base, and UI components
// will call the getter functions directly for the most up-to-date list.
export const CARD_CLASS_OPTIONS = {
  [CardType.Profession]: getProfessionCardNames(),
  [CardType.Ancestry]: getAncestryCardNames(),
  [CardType.Community]: getCommunityCardNames(),
  [CardType.Subclass]: getSubClassCardNames(),
  [CardType.Domain]: getDomainCardNames(),
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

// ===== 自定义卡牌导入相关类型定义 =====

// 引入原始卡牌类型
import type { ProfessionCard } from '@/data/card/profession-card/convert';
import type { AncestryCard } from '@/data/card/ancestry-card/convert';
import type { CommunityCard } from '@/data/card/community-card/convert';
import type { SubClassCard } from '@/data/card/subclass-card/convert';
import type { DomainCard } from '@/data/card/domain-card/convert';
import type { VariantTypeDefinition } from '@/data/card/variant-card/variant-registry';

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
  variant?: any[]; // 变体卡牌数组，使用any[]因为结构是动态的
}

// 导入结果定义
export interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  duplicateIds?: string[];
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
}

// Helper: 判断卡牌是否为自定义卡牌
export function isCustomCard(card: StandardCard | ExtendedStandardCard): boolean {
  return (card as ExtendedStandardCard).source === CardSource.CUSTOM;
}
