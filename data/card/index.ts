/**
 * Main Card Data Export
 * 主要卡牌数据导出模块 - 简化版本
 */

import { simpleCardManager } from './simple-card-manager';
import { convertToStandardCard } from './card-converter';
import { professionCardConverter } from './profession-card/convert';
import { ancestryCardConverter } from './ancestry-card/convert';
import { communityCardConverter } from './community-card/convert';
import { domainCardConverter } from './domain-card/convert';
import { subclassCardConverter } from './subclass-card/convert';
import { CardType, StandardCard } from './card-types';

/**
 * 初始化卡牌数据系统
 * 异步版本，支持网络加载
 */
export async function initializeCards(): Promise<void> {
  try {
    console.log('[Card System] Initializing simple JSON-based card data...');
    await simpleCardManager.initialize();
    console.log('[Card System] Simple JSON-based card data initialized successfully');
  } catch (error) {
    console.error('[Card System] Failed to initialize card data:', error);
    throw error;
  }
}

// 导出所有卡牌获取函数 (原始格式) - 安全版本
export const getAllProfessionCards = () => {
  try { return simpleCardManager.getProfessionCards(); } catch { return []; }
};
export const getAllAncestryCards = () => {
  try { return simpleCardManager.getAncestryCards(); } catch { return []; }
};
export const getAllCommunityCards = () => {
  try { return simpleCardManager.getCommunityCards(); } catch { return []; }
};
export const getAllDomainCards = () => {
  try { return simpleCardManager.getDomainCards(); } catch { return []; }
};
export const getAllSubclassCards = () => {
  try { return simpleCardManager.getSubclassCards(); } catch { return []; }
};

// 导出特定卡牌获取函数 (原始格式) - 安全版本
export const getProfessionCard = (id: string) => {
  try { return simpleCardManager.getProfessionCard(id); } catch { return null; }
};
export const getAncestryCard = (id: string) => {
  try { return simpleCardManager.getAncestryCard(id); } catch { return null; }
};
export const getCommunityCard = (id: string) => {
  try { return simpleCardManager.getCommunityCard(id); } catch { return null; }
};
export const getDomainCard = (id: string) => {
  try { return simpleCardManager.getDomainCard(id); } catch { return null; }
};
export const getSubclassCard = (id: string) => {
  try { return simpleCardManager.getSubclassCard(id); } catch { return null; }
};

// 导出统计函数 - 安全版本
export const getTotalCardsCount = () => {
  try { return simpleCardManager.getTotalCardsCount(); } catch { return 0; }
};
export const getCardsCountByType = (type: any) => {
  try { return simpleCardManager.getCardsCountByType(type); } catch { return 0; }
};

// 新增：标准化卡牌格式的获取函数
/**
 * 获取指定类型的标准化卡牌 - 安全版本
 */
export function getStandardCardsByType(type: CardType): StandardCard[] {
  try {
    // 如果管理器还没初始化，返回空数组
    if (!simpleCardManager.isInitialized()) {
      console.warn(`[getStandardCardsByType] Manager not yet initialized, returning empty array for ${type}`);
      return [];
    }

    switch (type) {
      case CardType.Profession:
        return simpleCardManager.getProfessionCards().map(card => professionCardConverter.toStandard(card));
      case CardType.Ancestry:
        return simpleCardManager.getAncestryCards().map(card => ancestryCardConverter.toStandard(card));
      case CardType.Community:
        return simpleCardManager.getCommunityCards().map(card => communityCardConverter.toStandard(card));
      case CardType.Domain:
        return simpleCardManager.getDomainCards().map(card => domainCardConverter.toStandard(card));
      case CardType.Subclass:
        return simpleCardManager.getSubclassCards().map(card => subclassCardConverter.toStandard(card));
      default:
        return [];
    }
  } catch (error) {
    console.warn(`[getStandardCardsByType] Error loading ${type} cards:`, error);
    return [];
  }
}

/**
 * 获取所有标准化卡牌 - 安全版本
 */
export function getAllStandardCards(): StandardCard[] {
  try {
    return [
      ...getStandardCardsByType(CardType.Profession),
      ...getStandardCardsByType(CardType.Ancestry),
      ...getStandardCardsByType(CardType.Community),
      ...getStandardCardsByType(CardType.Domain),
      ...getStandardCardsByType(CardType.Subclass)
    ];
  } catch (error) {
    console.warn('[getAllStandardCards] Error loading cards:', error);
    return [];
  }
}

/**
 * 获取所有标准化卡牌 (兼容性常量)
 * 使用getter函数来确保每次访问时都是最新数据，避免初始化问题
 */
export const ALL_STANDARD_CARDS = getAllStandardCards();

// 导出卡牌管理器实例（用于高级用法）
export { simpleCardManager as cardManager };

// 重新导出卡牌类型定义和其他工具
export * from './card-types';
export { convertToStandardCard } from './card-converter';
export { getCardTypeName } from './card-ui-config';