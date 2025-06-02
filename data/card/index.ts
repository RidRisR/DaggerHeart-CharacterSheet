/**
 * 卡牌数据入口
 * 这个文件导出所有卡牌相关的数据和函数
 */

// 导入各个卡牌类型的转换器
import { professionCardConverter } from "@/data/card/profession-card/convert"
import { ancestryCardConverter } from "@/data/card/ancestry-card/convert"
import { communityCardConverter } from "@/data/card/community-card/convert"
import { subclassCardConverter } from "@/data/card/subclass-card/convert"
import { domainCardConverter } from "@/data/card/domain-card/convert" // 导入领域卡牌转换器

// 导入各个卡牌类型的数据
import { professionCards } from "@/data/card/profession-card/cards"
import { ancestryCards } from "@/data/card/ancestry-card/cards"
import { communityCards } from "@/data/card/community-card/cards"
import { subclassCards } from "@/data/card/subclass-card/cards"
import { domainCards } from "@/data/card/domain-card/cards" // 导入领域卡牌数据

// 导入UI配置
import {
  CARD_CLASS_OPTIONS_BY_TYPE,
  getCardTypeName,
  getLevelOptions,
} from "@/data/card/card-ui-config"

// 导入类型定义
import { ALL_CARD_TYPES, CARD_CLASS_OPTIONS, CARD_LEVEL_OPTIONS, CardType, StandardCard, ExtendedStandardCard, CardSource, ImportData, ImportResult } from "@/data/card/card-types"
import { convertToStandardCard } from "@/data/card/card-converter"
// Import CardManager directly from the file
import { BuiltinCardManager } from "./builtin-card-manager"
// Import CustomCardManager
import { CustomCardManager } from "./custom-card-manager"

// 导入CardManager
// export { CardManager } from "@/data/card/card-manager"

// 获取CardManager实例
const builtinCardManager = BuiltinCardManager.getInstance()
// 获取CustomCardManager实例
const customCardManager = CustomCardManager.getInstance()

// 统一注册卡牌类型
builtinCardManager.registerCardType("profession", {
  converter: professionCardConverter.toStandard,
})

builtinCardManager.registerCardType("ancestry", {
  converter: ancestryCardConverter.toStandard,
})

builtinCardManager.registerCardType("community", {
  converter: communityCardConverter.toStandard,
})

builtinCardManager.registerCardType("subclass", {
  converter: subclassCardConverter.toStandard,
})

builtinCardManager.registerCardType("domain", {
  converter: domainCardConverter.toStandard,
})

// 注意：卡牌系统的初始化现在由 CardSystemInitializer 组件在客户端处理
// 这里只进行转换器注册，不执行运行时初始化
console.log('[Card Index] 所有转换器注册完成，等待客户端初始化...')

// 卡牌数据映射
export const cardDataByType = {
  profession: professionCards,
  ancestry: ancestryCards,
  community: communityCards,
  subclass: subclassCards,
  domain: domainCards,
}

// 预先转换好的内置卡牌（仅包含内置卡牌）
export const BUILTIN_STANDARD_CARDS: StandardCard[] = (() => {
  try {
    console.log("[BUILTIN_STANDARD_CARDS] 开始转换所有内置卡牌")
    const standardCards: StandardCard[] = []

    // 按类型转换卡牌
    Object.entries(cardDataByType).forEach(([type, cards]) => {
      console.log(`[BUILTIN_STANDARD_CARDS] 开始转换 ${type} 类型卡牌, 数量: ${cards.length}`)

      const convertedCards = cards
        .map((card, index) => {
          try {
            const converted = builtinCardManager.ConvertCard(card, type as keyof typeof cardDataByType)
            if (converted) {
              // 标记为内置卡牌
              const extendedCard: ExtendedStandardCard = {
                ...converted,
                source: CardSource.BUILTIN
              }
              return extendedCard
            }
            return null
          } catch (error) {
            console.error(`[BUILTIN_STANDARD_CARDS] ${type}类型卡牌转换失败, 索引: ${index}:`, error, card)
            return null
          }
        })
        .filter(Boolean) as ExtendedStandardCard[]

      standardCards.push(...convertedCards)
      console.log(`[BUILTIN_STANDARD_CARDS] ${type}类型卡牌转换完成, 数量: ${convertedCards.length}`)
    })

    console.log(`[BUILTIN_STANDARD_CARDS] 所有内置卡牌转换完成, 总数: ${standardCards.length}`)
    return standardCards
  } catch (error) {
    console.error("[BUILTIN_STANDARD_CARDS] 转换过程出错:", error)
    return []
  }
})()

// 合并内置卡牌和自定义卡牌的标准格式卡牌集合
export const ALL_STANDARD_CARDS: ExtendedStandardCard[] = (() => {
  // 在模块加载时，只返回内置卡牌，避免触发过早的初始化
  console.log("[ALL_STANDARD_CARDS] 模块加载时只包含内置卡牌，避免过早初始化")
  return [...BUILTIN_STANDARD_CARDS];
})()

// 按类型分组的标准格式卡牌（包含内置和自定义）
export const STANDARD_CARDS_BY_TYPE: Record<string, ExtendedStandardCard[]> = (() => {
  const result: Record<string, ExtendedStandardCard[]> = {};

  for (const [id, name] of ALL_CARD_TYPES.entries()) {
    if (id !== "all") {
      // 在模块加载时，只使用内置卡牌，避免过早初始化
      result[id] = BUILTIN_STANDARD_CARDS.filter((card) => card.type === id);
      console.log(`[STANDARD_CARDS_BY_TYPE] ${name}类型内置卡牌数量: ${result[id].length}`);
    }
  }

  return result;
})()

// 获取所有标准格式卡牌（内置+自定义）- 动态版本
export function getAllStandardCards(): ExtendedStandardCard[] {
  // 在客户端，尝试使用统一的卡牌系统
  if (typeof window !== 'undefined') {
    try {
      // 检查系统是否已初始化
      if (customCardManager.isSystemInitialized()) {
        const unifiedCards = customCardManager.getAllCards();
        if (unifiedCards.length > 0) {
          console.log(`[getAllStandardCards] 使用统一系统，卡牌数量: ${unifiedCards.length}`);
          return unifiedCards;
        }
      } else {
        // 系统未初始化，尝试获取但不等待
        const cards = customCardManager.tryGetAllCards();
        if (cards && cards.length > 0) {
          console.log(`[getAllStandardCards] 使用统一系统（未完全初始化），卡牌数量: ${cards.length}`);
          return cards;
        }
      }
    } catch (error) {
      console.warn('[getAllStandardCards] 统一系统暂不可用，回退到ALL_STANDARD_CARDS:', error);
    }
  }
  
  // 回退到原有的常量
  console.log(`[getAllStandardCards] 使用常量，卡牌数量: ${ALL_STANDARD_CARDS.length}`);
  return ALL_STANDARD_CARDS;
}

// 获取所有标准格式卡牌（内置+自定义）- 异步版本，确保系统已初始化
export async function getAllStandardCardsAsync(): Promise<ExtendedStandardCard[]> {
  // 在客户端，确保统一系统已初始化
  if (typeof window !== 'undefined') {
    try {
      await customCardManager.ensureInitialized();
      const unifiedCards = customCardManager.getAllCards();
      if (unifiedCards.length > 0) {
        console.log(`[getAllStandardCardsAsync] 使用统一系统，卡牌数量: ${unifiedCards.length}`);
        return unifiedCards;
      }
    } catch (error) {
      console.warn('[getAllStandardCardsAsync] 统一系统初始化失败，回退到ALL_STANDARD_CARDS:', error);
    }
  }
  
  // 回退到原有的常量
  console.log(`[getAllStandardCardsAsync] 使用常量，卡牌数量: ${ALL_STANDARD_CARDS.length}`);
  return ALL_STANDARD_CARDS;
}

// 根据类型获取标准格式卡牌（内置+自定义）- 异步版本
export async function getStandardCardsByTypeAsync(typeId: CardType): Promise<ExtendedStandardCard[]> {
  // 在客户端，确保统一系统已初始化
  if (typeof window !== 'undefined') {
    try {
      await customCardManager.ensureInitialized();
      const unifiedCards = customCardManager.getAllCardsByType(typeId);
      console.log(`[getStandardCardsByTypeAsync] 使用统一系统，${typeId}类型卡牌数量: ${unifiedCards.length}`);
      return unifiedCards;
    } catch (error) {
      console.warn(`[getStandardCardsByTypeAsync] 统一系统初始化失败，回退到常量 (${typeId}):`, error);
    }
  }
  
  // 回退到原有的常量
  return STANDARD_CARDS_BY_TYPE[typeId] || []
}

// 获取所有内置卡牌
export function getAllBuiltinCards(): ExtendedStandardCard[] {
  return BUILTIN_STANDARD_CARDS
}

// 根据类型获取标准格式卡牌（内置+自定义）
export function getStandardCardsByType(typeId: CardType): ExtendedStandardCard[] {
  // 在客户端，尝试使用统一的卡牌系统
  if (typeof window !== 'undefined') {
    try {
      // 检查系统是否已初始化
      if (customCardManager.isSystemInitialized()) {
        const unifiedCards = customCardManager.getAllCardsByType(typeId);
        console.log(`[getStandardCardsByType] 使用统一系统，${typeId}类型卡牌数量: ${unifiedCards.length}`);
        return unifiedCards;
      }
    } catch (error) {
      console.warn(`[getStandardCardsByType] 统一系统暂不可用，回退到常量 (${typeId}):`, error);
    }
  }
  
  // 回退到原有的常量
  return STANDARD_CARDS_BY_TYPE[typeId] || []
}

// ===== 自定义卡牌功能 =====

// 获取所有自定义卡牌
export function getCustomCards(): ExtendedStandardCard[] {
  return customCardManager.getCustomCards()
}

// 根据类型获取自定义卡牌
export function getCustomCardsByType(typeId: CardType): ExtendedStandardCard[] {
  return customCardManager.getCustomCardsByType(typeId)
}

// 导入自定义卡牌
export async function importCustomCards(importData: ImportData, batchName?: string): Promise<ImportResult> {
  return customCardManager.importCards(importData, batchName)
}

// 获取自定义卡牌批次列表
export function getCustomCardBatches() {
  return customCardManager.getAllBatches()
}

// 删除自定义卡牌批次
export function removeCustomCardBatch(batchId: string): boolean {
  return customCardManager.removeBatch(batchId)
}

// 获取自定义卡牌统计信息
export function getCustomCardStats() {
  return customCardManager.getStats()
}

// 清空所有自定义卡牌
export function clearAllCustomCards(): void {
  customCardManager.clearAllCustomCards()
}

// 获取存储使用情况
export function getCustomCardStorageInfo() {
  return customCardManager.getStorageInfo()
}

// 刷新自定义卡牌缓存（重新生成ALL_STANDARD_CARDS等）
export function refreshCustomCards(): void {
  // 这个函数的实现需要重新计算导出的常量
  // 由于常量是在模块加载时计算的，这里提供一个手动刷新的接口
  console.log('[Card Index] 自定义卡牌数据已更新，请刷新页面以查看最新数据')
}

// 添加 getCardsByType 作为 getStandardCardsByType 的别名
export const getCardsByType = getStandardCardsByType

// 导出所有内容
export {
  // UI配置
  ALL_CARD_TYPES,
  CARD_CLASS_OPTIONS,
  CARD_CLASS_OPTIONS_BY_TYPE,
  CARD_LEVEL_OPTIONS,
  // UI辅助函数
  getCardTypeName,
  getLevelOptions,
  // 卡牌转换
  convertToStandardCard,
  // 卡牌注册
  builtinCardManager as cardManager,
  // 自定义卡牌管理器
  customCardManager,
  // Re-export CardManager and CustomCardManager
  BuiltinCardManager,
  CustomCardManager,
  // 类型定义
  CardType,
  CardSource,
}

// 单独导出类型
export type {
  ImportData,
  ImportResult,
  ExtendedStandardCard,
}
