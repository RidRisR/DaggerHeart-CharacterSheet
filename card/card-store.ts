/**
 * 卡牌全局状态管理 - 使用 Zustand
 * 提供全局的卡牌数据存储和管理
 */

import { create } from 'zustand';
import { getAllStandardCardsAsync, getStandardCardsByTypeAsync, CardType, ExtendedStandardCard } from './index';

// 状态接口定义
interface CardStore {
  // 所有卡牌状态
  allCards: ExtendedStandardCard[];
  allCardsLoading: boolean;
  allCardsError: string | null;
  allCardsInitialized: boolean;
  
  // 按类型分组的卡牌缓存
  cardsByType: Record<CardType, ExtendedStandardCard[]>;
  cardsByTypeLoading: Record<CardType, boolean>;
  cardsByTypeError: Record<CardType, string | null>;
  cardsByTypeInitialized: Record<CardType, boolean>;
  
  // 操作方法
  fetchAllCards: () => Promise<void>;
  fetchCardsByType: (type: CardType) => Promise<void>;
  clearAllCardsError: () => void;
  clearCardsByTypeError: (type: CardType) => void;
  reset: () => void;
}

// 初始化状态
const initialCardsByType: Record<CardType, ExtendedStandardCard[]> = {
  [CardType.Profession]: [],
  [CardType.Ancestry]: [],
  [CardType.Community]: [],
  [CardType.Subclass]: [],
  [CardType.Domain]: [],
  [CardType.Variant]: [],
};

const initialCardsByTypeLoading: Record<CardType, boolean> = {
  [CardType.Profession]: false,
  [CardType.Ancestry]: false,
  [CardType.Community]: false,
  [CardType.Subclass]: false,
  [CardType.Domain]: false,
  [CardType.Variant]: false,
};

const initialCardsByTypeError: Record<CardType, string | null> = {
  [CardType.Profession]: null,
  [CardType.Ancestry]: null,
  [CardType.Community]: null,
  [CardType.Subclass]: null,
  [CardType.Domain]: null,
  [CardType.Variant]: null,
};

const initialCardsByTypeInitialized: Record<CardType, boolean> = {
  [CardType.Profession]: false,
  [CardType.Ancestry]: false,
  [CardType.Community]: false,
  [CardType.Subclass]: false,
  [CardType.Domain]: false,
  [CardType.Variant]: false,
};

// 创建 Zustand store
export const useCardStore = create<CardStore>((set, get) => ({
  // 初始状态
  allCards: [],
  allCardsLoading: false,
  allCardsError: null,
  allCardsInitialized: false,
  
  cardsByType: initialCardsByType,
  cardsByTypeLoading: initialCardsByTypeLoading,
  cardsByTypeError: initialCardsByTypeError,
  cardsByTypeInitialized: initialCardsByTypeInitialized,
  
  // 获取所有卡牌
  fetchAllCards: async () => {
    const state = get();
    
    // 如果已经初始化且没有错误，跳过加载
    if (state.allCardsInitialized && !state.allCardsError) {
      return;
    }
    
    set({ allCardsLoading: true, allCardsError: null });
    
    try {
      console.log('[CardStore] 开始加载所有卡牌...');
      const cards = await getAllStandardCardsAsync();
      
      set({
        allCards: cards,
        allCardsLoading: false,
        allCardsError: null,
        allCardsInitialized: true,
      });
      
      console.log(`[CardStore] 成功加载 ${cards.length} 张卡牌`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取卡牌数据失败';
      console.error('[CardStore] 加载失败:', error);
      
      set({
        allCardsLoading: false,
        allCardsError: errorMessage,
        allCardsInitialized: true,
      });
    }
  },
  
  // 按类型获取卡牌
  fetchCardsByType: async (type: CardType) => {
    const state = get();
    
    // 如果已经初始化且没有错误，跳过加载
    if (state.cardsByTypeInitialized[type] && !state.cardsByTypeError[type]) {
      return;
    }
    
    set({
      cardsByTypeLoading: { ...state.cardsByTypeLoading, [type]: true },
      cardsByTypeError: { ...state.cardsByTypeError, [type]: null },
    });
    
    try {
      console.log(`[CardStore] 开始加载 ${type} 类型卡牌...`);
      const cards = await getStandardCardsByTypeAsync(type);
      
      set({
        cardsByType: { ...state.cardsByType, [type]: cards },
        cardsByTypeLoading: { ...state.cardsByTypeLoading, [type]: false },
        cardsByTypeError: { ...state.cardsByTypeError, [type]: null },
        cardsByTypeInitialized: { ...state.cardsByTypeInitialized, [type]: true },
      });
      
      console.log(`[CardStore] 成功加载 ${cards.length} 张 ${type} 卡牌`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `获取 ${type} 卡牌数据失败`;
      console.error(`[CardStore] 加载 ${type} 失败:`, error);
      
      set({
        cardsByTypeLoading: { ...state.cardsByTypeLoading, [type]: false },
        cardsByTypeError: { ...state.cardsByTypeError, [type]: errorMessage },
        cardsByTypeInitialized: { ...state.cardsByTypeInitialized, [type]: true },
      });
    }
  },
  
  // 清除所有卡牌错误
  clearAllCardsError: () => {
    set({ allCardsError: null });
  },
  
  // 清除指定类型卡牌错误
  clearCardsByTypeError: (type: CardType) => {
    const state = get();
    set({
      cardsByTypeError: { ...state.cardsByTypeError, [type]: null },
    });
  },
  
  // 重置所有状态
  reset: () => {
    set({
      allCards: [],
      allCardsLoading: false,
      allCardsError: null,
      allCardsInitialized: false,
      
      cardsByType: initialCardsByType,
      cardsByTypeLoading: initialCardsByTypeLoading,
      cardsByTypeError: initialCardsByTypeError,
      cardsByTypeInitialized: initialCardsByTypeInitialized,
    });
  },
}));

// 导出便于使用的选择器
export const useAllCards = () => {
  const allCards = useCardStore((state) => state.allCards);
  const loading = useCardStore((state) => state.allCardsLoading);
  const error = useCardStore((state) => state.allCardsError);
  const initialized = useCardStore((state) => state.allCardsInitialized);
  const fetchAllCards = useCardStore((state) => state.fetchAllCards);
  const clearError = useCardStore((state) => state.clearAllCardsError);
  
  return {
    cards: allCards,
    loading,
    error,
    initialized,
    fetchAllCards,
    clearError,
  };
};

export const useCardsByType = (type: CardType) => {
  const cards = useCardStore((state) => state.cardsByType[type]);
  const loading = useCardStore((state) => state.cardsByTypeLoading[type]);
  const error = useCardStore((state) => state.cardsByTypeError[type]);
  const initialized = useCardStore((state) => state.cardsByTypeInitialized[type]);
  const fetchCardsByType = useCardStore((state) => state.fetchCardsByType);
  const clearError = useCardStore((state) => state.clearCardsByTypeError);
  
  return {
    cards,
    loading,
    error,
    initialized,
    fetchCardsByType: () => fetchCardsByType(type),
    clearError: () => clearError(type),
  };
};
