/**
 * 内置卡牌数据源
 * 提供所有内置卡牌的原始数据，用于统一管理和版本控制
 */

import { ImportBatch } from './card-storage';

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
 * 获取内置卡包的元数据
 * @returns 内置卡包的ImportBatch元数据
 */
export function getBuiltinBatchMetadata(): ImportBatch {
  // 直接计算卡牌数量，避免递归调用getBuiltinStandardCards
  const totalCards = Object.values(cardDataByType).reduce((sum, cards) => sum + cards.length, 0);
  const cardTypes = Object.keys(cardDataByType);
  
  return {
    id: BUILTIN_BATCH_ID,
    name: "系统内置卡牌包",
    fileName: "builtin-cards",
    description: "系统内置卡牌包，数据来自SRD。",
    author: "RidRisR",
    importTime: new Date().toISOString(),
    cardCount: totalCards,
    cardTypes,
    size: JSON.stringify(cardDataByType).length, // 估算大小
    isSystemBatch: true,
    version: BUILTIN_CARDS_VERSION
  };
}
