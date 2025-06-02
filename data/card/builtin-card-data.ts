/**
 * 内置卡牌数据源
 * 提供所有内置卡牌的原始数据，用于统一管理和版本控制
 */

import { BuiltinCardManager } from './builtin-card-manager';
import { StandardCard } from './card-types';

// 导入各个卡牌类型的数据
import { professionCards } from "./profession-card/cards";
import { ancestryCards } from "./ancestry-card/cards";
import { communityCards } from "./community-card/cards";
import { subclassCards } from "./subclass-card/cards";
import { domainCards } from "./domain-card/cards";

// 内置卡包版本号 - 修改此版本号以触发重新种子化
export const BUILTIN_CARDS_VERSION = "V20250520";

// 内置卡包唯一标识符
export const BUILTIN_BATCH_ID = "SYSTEM_BUILTIN_CARDS";

// 卡牌数据映射
const cardDataByType = {
  profession: professionCards,
  ancestry: ancestryCards,
  community: communityCards,
  subclass: subclassCards,
  domain: domainCards,
};

/**
 * 获取所有内置卡牌的标准化数据
 * @returns 标准化的内置卡牌数组
 */
export function getBuiltinStandardCards(): StandardCard[] {
  console.log("[BuiltinCardData] 开始转换所有内置卡牌");
  
  const builtinCardManager = BuiltinCardManager.getInstance();
  const standardCards: StandardCard[] = [];

  try {
    // 检查转换器注册状态
    const registeredTypes = builtinCardManager.getRegisteredTypes();
    console.log('[BuiltinCardData] 当前已注册的转换器:', registeredTypes);
    
    if (registeredTypes.length === 0) {
      console.warn('[BuiltinCardData] 没有转换器注册，返回空数组');
      return [];
    }

    // 按类型转换卡牌
    Object.entries(cardDataByType).forEach(([type, cards]) => {
      console.log(`[BuiltinCardData] 检查 ${type} 类型转换器...`);
      
      // 检查该类型的转换器是否已注册
      if (!builtinCardManager.isTypeRegistered(type)) {
        console.warn(`[BuiltinCardData] ${type} 类型转换器未注册，跳过该类型`);
        return;
      }
      
      console.log(`[BuiltinCardData] 开始转换 ${type} 类型卡牌, 数量: ${cards.length}`);
      
      const convertedCards = cards.map((card: any, index: number) => {
        try {
          const convertedCard = builtinCardManager.ConvertCard(card, type as keyof typeof cardDataByType);
          if (!convertedCard) {
            console.warn(`[BuiltinCardData] ${type}类型卡牌转换失败, 索引: ${index}:`, card);
            return null;
          }
          // 确保内置卡牌标记为标准化
          convertedCard.standarized = true;
          return convertedCard;
        } catch (error) {
          console.error(`[BuiltinCardData] ${type}类型卡牌转换失败, 索引: ${index}:`, error, card);
          return null;
        }
      }).filter(Boolean) as StandardCard[];
      
      standardCards.push(...convertedCards);
      console.log(`[BuiltinCardData] ${type}类型卡牌转换完成, 数量: ${convertedCards.length}`);
    });
    
    console.log(`[BuiltinCardData] 所有内置卡牌转换完成, 总数: ${standardCards.length}`);
    return standardCards;
  } catch (error) {
    console.error("[BuiltinCardData] 转换过程出错:", error);
    // 发生错误时返回空数组而不是抛出异常
    return [];
  }
}

/**
 * 获取内置卡包的元数据
 * @returns 内置卡包的ImportBatch元数据
 */
export function getBuiltinBatchMetadata(): {
  id: string;
  name: string;
  fileName: string;
  importTime: string;
  cardCount: number;
  cardTypes: string[];
  size: number;
  isSystemBatch: boolean;
  version: string;
} {
  // 直接计算卡牌数量，避免递归调用getBuiltinStandardCards
  const totalCards = Object.values(cardDataByType).reduce((sum, cards) => sum + cards.length, 0);
  const cardTypes = Object.keys(cardDataByType);
  
  return {
    id: BUILTIN_BATCH_ID,
    name: "系统内置卡牌",
    fileName: "builtin-cards",
    importTime: new Date().toISOString(),
    cardCount: totalCards,
    cardTypes,
    size: JSON.stringify(cardDataByType).length, // 估算大小
    isSystemBatch: true,
    version: BUILTIN_CARDS_VERSION
  };
}
