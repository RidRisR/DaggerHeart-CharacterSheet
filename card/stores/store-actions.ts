/**
 * Unified Card Store Actions
 * All business logic and actions for the card system
 */

import {
  UnifiedCardState,
  UnifiedCardActions,
  BatchInfo,
  CustomCardIndex,
  BatchData,
  CustomFieldNamesStore,
  VariantTypesForBatch,
  CustomFieldsForBatch,
  STORAGE_KEYS,
  BUILTIN_BATCH_ID,
  isServer,
  ExtendedStandardCard,
  CardType,
  CardSource,
  ImportData,
  CustomCardStats,
  BatchStats
} from './store-types';
import { isVariantCard } from '../card-types';
import { createImageServiceActions } from './image-service/actions';
import { getCardDisabledSourceIds } from '@/lib/app-preferences';
import { assembleCardRuntimeSources } from '@/card/runtime/source-assembly';
import { loadBuiltinCardRuntimeSource } from '@/card/runtime/builtin-source-adapter';
import { loadCustomCardRuntimeSourcesFromSnapshot } from '@/card/runtime/custom-source-adapter';
import { CARD_BUILTIN_SOURCE_ID, type CardRuntimeSourceSnapshot } from '@/card/runtime/source-types';
import { setBuiltinCardRuntimeSourceDisabled } from '@/card/runtime/source-disabled-state';

// Type for Zustand's set and get functions
type SetFunction = (partial: Partial<UnifiedCardState> | ((state: UnifiedCardState) => Partial<UnifiedCardState>)) => void;
type GetFunction = () => UnifiedCardState & UnifiedCardActions;

function buildCustomIndexFromSources(sources: CardRuntimeSourceSnapshot[]): CustomCardIndex {
  const batches: CustomCardIndex["batches"] = {};
  let totalCards = 0;

  for (const source of sources) {
    if (source.kind !== "custom") continue;
    const batch = source.batch;
    batches[source.sourceId] = {
      id: batch.id,
      name: batch.name,
      fileName: batch.fileName,
      importTime: batch.importTime,
      version: batch.version,
      author: batch.author,
      cardCount: batch.cardCount,
      cardTypes: batch.cardTypes,
      size: batch.size,
      disabled: batch.disabled,
    };
    totalCards += source.cards.length;
  }

  return {
    batches,
    totalCards,
    totalBatches: Object.keys(batches).length,
    lastUpdate: new Date().toISOString(),
  };
}

export const createStoreActions = (set: SetFunction, get: GetFunction): UnifiedCardActions => ({
  // Image service actions
  ...createImageServiceActions(set as any, get as any),
  // System lifecycle
  initializeSystem: async () => {
    const state = get();
    if (state.initialized) {
      return { initialized: true };
    }

    set({ loading: true, error: null });

    try {
      // Check for legacy data migration
      const migrationResult = await get()._migrateLegacyData();

      // Load all cards using unified loading function (builtin first, then custom)
      await get()._loadAllCards();

      // Validate and compute initial aggregations
      get()._recomputeAggregations();

      // 重建类型 Map（确保所有卡牌都被正确分类）
      get()._rebuildCardsByType();

      // Rebuild subclass count index
      get()._rebuildSubclassIndex();

      // 现在所有卡牌都已加载完毕，统一进行图片预处理
      get()._preprocessCardImages();

      // Initialize image service
      await get().initializeImageService();

      // 统一同步到 localStorage（避免数据不一致）
      get()._syncToLocalStorage();

      const computedStats = get()._computeStats();
      set({
        initialized: true,
        loading: false,
        stats: computedStats
      });

      return { initialized: true, migrationResult };
    } catch (error) {
      console.error('[UnifiedCardStore] Initialization failed:', error);
      set({
        error: error instanceof Error ? error.message : 'Initialization failed',
        loading: false
      });
      return { initialized: false };
    }
  },

  resetSystem: async () => {
    // Clear IndexedDB images table first
    try {
      await get().clearAllBatchImages();
    } catch (error) {
      console.error('[UnifiedCardStore] Error clearing IndexedDB during reset:', error);
    }

    // Clean up all batch keys from localStorage
    if (typeof window !== 'undefined' && !isServer) {
      try {
        // Get all keys from localStorage
        const keysToRemove: string[] = [];
        for (const key of Object.keys(localStorage)) {
          // Remove all batch data and index
          if (key.startsWith(STORAGE_KEYS.BATCH_PREFIX) || key === STORAGE_KEYS.INDEX) {
            keysToRemove.push(key);
          }
        }

        // Remove all identified keys
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
          console.log(`[UnifiedCardStore] Removed ${key} from localStorage during system reset`);
        });

        console.log(`[UnifiedCardStore] System reset: removed ${keysToRemove.length} keys from localStorage`);
      } catch (error) {
        console.error('[UnifiedCardStore] Error cleaning localStorage during reset:', error);
      }
    }

    // Reset in-memory state
    set({
      cards: new Map(),
      batches: new Map(),
      cardsByType: new Map(),
      index: {
        batches: {},
        totalCards: 0,
        totalBatches: 0,
        lastUpdate: new Date().toISOString()
      },
      aggregatedCustomFields: null,
      aggregatedVariantTypes: null,
      cacheValid: false,
      initialized: false,
      loading: false,
      error: null,
      stats: null
    });
  },

  // Core data operations
  loadAllCards: () => {
    const state = get();
    const allCards = Array.from(state.cards.values());
    const filteredCards = allCards.filter(card => {
      // Filter out cards from disabled batches
      if (card.batchId) {
        const batch = state.batches.get(card.batchId);
        return !batch?.disabled;
      }
      return true;
    });
    return filteredCards;
  },

  loadCardsByType: (type: CardType) => {
    const state = get();
    // 使用预构建的类型ID Map，性能从 O(n) 提升到 O(m)
    const typeCardIds = state.cardsByType.get(type) || [];

    // 通过ID获取卡牌并筛选禁用批次的卡牌
    return typeCardIds
      .map(cardId => state.cards.get(cardId))
      .filter(card => {
        if (!card) return false;
        if (card.batchId) {
          const batch = state.batches.get(card.batchId);
          return !batch?.disabled;
        }
        return true;
      }) as ExtendedStandardCard[];
  },

  getCardById: (cardId: string) => {
    const state = get();
    const card = state.cards.get(cardId);

    // Check if card exists and is not from a disabled batch
    if (!card) return null;

    if (card.batchId) {
      const batch = state.batches.get(card.batchId);
      if (batch?.disabled) return null;
    }

    return card;
  },

  reloadCustomCards: () => {
    get().reloadCustomRuntimeFromStorage().catch(error => {
      console.error('[UnifiedCardStore] Failed to refresh card runtime:', error);
    });
  },

  reloadCustomRuntimeFromStorage: async () => {
    const builtinSource = await loadBuiltinCardRuntimeSource({
      disabledSourceIds: getCardDisabledSourceIds(),
    });
    const customSources = get()._loadCustomRuntimeSourceSnapshots();
    const assembled = assembleCardRuntimeSources([builtinSource, ...customSources]);

    set({
      cards: assembled.cards,
      batches: assembled.batches,
      index: buildCustomIndexFromSources(customSources),
      cacheValid: false,
    });
    get()._recomputeAggregations();
    get()._rebuildCardsByType();
    get()._rebuildSubclassIndex();
    set({ stats: get()._computeStats() });
  },

  // Custom card management
  removeBatch: (batchId: string) => {
    const state = get();
    const batch = state.batches.get(batchId);
    if (!batch) return false;

    // Delete batch images from IndexedDB if they exist
    if (batch.imageCardIds && batch.imageCardIds.length > 0) {
      get().deleteBatchImages(batch.imageCardIds).catch(error => {
        console.error(`[UnifiedCardStore] Failed to delete images for batch ${batchId}:`, error);
      });
    }

    // Remove batch and its cards
    const newBatches = new Map(state.batches);
    newBatches.delete(batchId);

    const newCards = new Map(state.cards);
    // 通过 cardIds 删除卡牌
    batch.cardIds.forEach(cardId => {
      newCards.delete(cardId);
    });

    // Update index
    const newIndex = { ...state.index };
    delete newIndex.batches[batchId];
    newIndex.totalBatches = newBatches.size;
    newIndex.totalCards = newCards.size;
    newIndex.lastUpdate = new Date().toISOString();

    set({
      batches: newBatches,
      cards: newCards,
      index: newIndex,
      cacheValid: false
    });

    // Remove the batch from localStorage explicitly
    if (typeof window !== 'undefined' && !isServer) {
      try {
        localStorage.removeItem(`${STORAGE_KEYS.BATCH_PREFIX}${batchId}`);
        console.log(`[UnifiedCardStore] Removed batch ${batchId} from localStorage`);
      } catch (error) {
        console.error(`[UnifiedCardStore] Failed to remove batch ${batchId} from localStorage:`, error);
      }
    }

    // Sync to localStorage (updates index and remaining batches)
    get()._syncToLocalStorage();

    // Rebuild cardsByType map after removing cards
    get()._rebuildCardsByType();

    // Rebuild subclass count index
    get()._rebuildSubclassIndex();

    return true;
  },

  clearAllCustomCards: async () => {
    const state = get();
    const newBatches = new Map();
    const newCards = new Map();

    // Clear all IndexedDB images (builtin batch doesn't store images in IndexedDB)
    try {
      await get().clearAllBatchImages();
    } catch (error) {
      console.error('[UnifiedCardStore] Error clearing IndexedDB during clearAllCustomCards:', error);
    }

    // Remove all custom batch keys from localStorage
    if (typeof window !== 'undefined' && !isServer) {
      for (const [batchId] of state.batches) {
        // Skip builtin batch
        if (batchId === BUILTIN_BATCH_ID) continue;

        try {
          localStorage.removeItem(`${STORAGE_KEYS.BATCH_PREFIX}${batchId}`);
          console.log(`[UnifiedCardStore] Removed custom batch ${batchId} from localStorage`);
        } catch (error) {
          console.error(`[UnifiedCardStore] Failed to remove batch ${batchId} from localStorage:`, error);
        }
      }
    }

    // Keep only builtin batch
    const builtinBatch = state.batches.get(BUILTIN_BATCH_ID);
    if (builtinBatch) {
      newBatches.set(BUILTIN_BATCH_ID, builtinBatch);
      // 通过 cardIds 保留内置卡牌
      builtinBatch.cardIds.forEach(cardId => {
        const card = state.cards.get(cardId);
        if (card) {
          newCards.set(cardId, card);
        }
      });
    }

    const newIndex: CustomCardIndex = {
      batches: {},
      totalCards: 0,
      totalBatches: 0,
      lastUpdate: new Date().toISOString()
    };

    set({
      batches: newBatches,
      cards: newCards,
      index: newIndex,
      cacheValid: false
    });

    get()._syncToLocalStorage();
  },

  getAllBatches: () => {
    const state = get();
    return Array.from(state.batches.entries()).map(([id, batch]) => ({
      id,
      name: batch.name,
      fileName: batch.fileName,
      importTime: batch.importTime,
      author: batch.author,
      version: batch.version,
      cardCount: batch.cardCount,
      cardTypes: batch.cardTypes,
      storageSize: batch.size,
      isSystemBatch: batch.isSystemBatch || false,
      disabled: batch.disabled || false
    } as BatchStats & {
      id: string;
      name: string;
      fileName: string;
      author?: string;
      version?: string;
      isSystemBatch: boolean;
      disabled: boolean;
    }));
  },

  // Aggregated data with smart caching
  getAggregatedCustomFields: () => {
    const state = get();

    if (state.cacheValid && state.aggregatedCustomFields) {
      return state.aggregatedCustomFields;
    }

    get()._recomputeAggregations();
    return get().aggregatedCustomFields || {};
  },

  getAggregatedVariantTypes: () => {
    const state = get();

    if (state.cacheValid && state.aggregatedVariantTypes) {
      return state.aggregatedVariantTypes;
    }

    get()._recomputeAggregations();
    return get().aggregatedVariantTypes || {};
  },

  // Storage management
  getStorageInfo: () => {
    const stats = get().calculateStorageUsage();
    const totalSpace = stats.totalSize + stats.availableSpace;
    const usagePercent = totalSpace > 0 ? (stats.totalSize / totalSpace) * 100 : 0;

    return {
      used: (stats.totalSize / (1024 * 1024)).toFixed(2) + ' MB',
      available: (stats.availableSpace / (1024 * 1024)).toFixed(2) + ' MB',
      total: (totalSpace / (1024 * 1024)).toFixed(2) + ' MB',
      percentage: usagePercent,
      usagePercent: usagePercent  // Add for compatibility
    };
  },

  getStats: () => {
    const state = get();
    return state.stats || (() => {
      const newStats = get()._computeStats();
      set({ stats: newStats });
      return newStats;
    })();
  },

  calculateStorageUsage: () => {
    // Return default values on server-side
    if (isServer) {
      return {
        totalSize: 0,
        indexSize: 0,
        batchesSize: 0,
        configSize: 0,
        availableSpace: get().config.maxStorageSize
      };
    }

    // Calculate storage usage from localStorage
    let totalSize = 0;
    let indexSize = 0;
    let batchesSize = 0;

    try {
      const indexStr = localStorage.getItem(STORAGE_KEYS.INDEX);
      if (indexStr) {
        indexSize = new Blob([indexStr]).size;
        totalSize += indexSize;
      }

      // Calculate batches size
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith(STORAGE_KEYS.BATCH_PREFIX)) {
          const batchStr = localStorage.getItem(key);
          if (batchStr) {
            const batchSize = new Blob([batchStr]).size;
            batchesSize += batchSize;
            totalSize += batchSize;
          }
        }
      }

      const maxSize = get().config.maxStorageSize;
      const availableSpace = Math.max(0, maxSize - totalSize);

      return {
        totalSize,
        indexSize,
        batchesSize,
        configSize: 0,
        availableSpace
      };
    } catch (error) {
      console.error('[UnifiedCardStore] Error calculating storage usage:', error);
      return {
        totalSize: 0,
        indexSize: 0,
        batchesSize: 0,
        configSize: 0,
        availableSpace: get().config.maxStorageSize
      };
    }
  },

  checkStorageSpace: (requiredSize: number) => {
    const stats = get().calculateStorageUsage();
    return stats.availableSpace >= requiredSize;
  },

  // Data integrity (simplified implementations)
  validateIntegrity: () => {
    const state = get();
    const issues: string[] = [];
    const orphanedKeys: string[] = [];
    const missingBatches: string[] = [];
    const corruptedBatches: string[] = [];
    const customCardCount = Array.from(state.cards.values()).filter(
      card => card.batchId !== CARD_BUILTIN_SOURCE_ID
    ).length;
    const customBatchCount = Array.from(state.batches.keys()).filter(
      batchId => batchId !== CARD_BUILTIN_SOURCE_ID
    ).length;

    // Basic validation
    if (customCardCount !== state.index.totalCards) {
      issues.push(`Card count mismatch: ${customCardCount} vs ${state.index.totalCards}`);
    }

    if (customBatchCount !== state.index.totalBatches) {
      issues.push(`Batch count mismatch: ${customBatchCount} vs ${state.index.totalBatches}`);
    }

    // Check for orphaned batch keys in localStorage
    if (typeof window !== 'undefined' && !isServer) {
      try {
        const indexBatchIds = new Set(Object.keys(state.index.batches));
        
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith(STORAGE_KEYS.BATCH_PREFIX)) {
            const batchId = key.replace(STORAGE_KEYS.BATCH_PREFIX, '');
            
            // Check if this batch is not in the index (orphaned)
            if (!indexBatchIds.has(batchId)) {
              orphanedKeys.push(key);
              issues.push(`Orphaned batch found in localStorage: ${batchId}`);
            }
          }
        }

        // Check for missing batches (in index but not in localStorage)
        for (const batchId of indexBatchIds) {
          if (batchId === BUILTIN_BATCH_ID) continue; // Skip builtin batch check
          
          const key = `${STORAGE_KEYS.BATCH_PREFIX}${batchId}`;
          if (!localStorage.getItem(key)) {
            missingBatches.push(batchId);
            issues.push(`Batch in index but missing from localStorage: ${batchId}`);
          }
        }

        // Check for corrupted batches (exists but can't be parsed)
        for (const batchId of indexBatchIds) {
          if (batchId === BUILTIN_BATCH_ID) continue; // Skip builtin batch check
          
          const key = `${STORAGE_KEYS.BATCH_PREFIX}${batchId}`;
          const dataStr = localStorage.getItem(key);
          if (dataStr) {
            try {
              JSON.parse(dataStr);
            } catch {
              corruptedBatches.push(batchId);
              issues.push(`Corrupted batch data in localStorage: ${batchId}`);
            }
          }
        }
      } catch (error) {
        issues.push(`Failed to validate localStorage integrity: ${error}`);
      }
    }

    return {
      isValid: issues.length === 0 && orphanedKeys.length === 0 && missingBatches.length === 0 && corruptedBatches.length === 0,
      issues,
      orphanedKeys,
      missingBatches,
      corruptedBatches
    };
  },

  cleanupOrphanedData: () => {
    const removedKeys: string[] = [];
    const errors: string[] = [];
    let freedSpace = 0;

    if (typeof window === 'undefined' || isServer) {
      return { removedKeys, errors, freedSpace };
    }

    try {
      // Get current index to know which batches are valid
      const indexStr = localStorage.getItem(STORAGE_KEYS.INDEX);
      const index: CustomCardIndex = indexStr ? JSON.parse(indexStr) : { batches: {} };
      const validBatchIds = new Set(Object.keys(index.batches));

      // Scan localStorage for orphaned batch keys
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith(STORAGE_KEYS.BATCH_PREFIX)) {
          const batchId = key.replace(STORAGE_KEYS.BATCH_PREFIX, '');
          
          // Check if this batch is not in the index (orphaned)
          if (!validBatchIds.has(batchId)) {
            try {
              // Calculate size before removal
              const dataStr = localStorage.getItem(key);
              if (dataStr) {
                freedSpace += new Blob([dataStr]).size;
              }
              
              // Remove orphaned batch
              localStorage.removeItem(key);
              removedKeys.push(key);
              console.log(`[UnifiedCardStore] Cleaned up orphaned batch: ${batchId}`);
            } catch (error) {
              const errorMsg = `Failed to remove orphaned batch ${batchId}: ${error}`;
              errors.push(errorMsg);
              console.error(`[UnifiedCardStore] ${errorMsg}`);
            }
          }
        }
      }

      if (removedKeys.length > 0) {
        console.log(`[UnifiedCardStore] Cleanup completed: removed ${removedKeys.length} orphaned keys, freed ${freedSpace} bytes`);
      } else {
        console.log('[UnifiedCardStore] No orphaned data found during cleanup');
      }
    } catch (error) {
      const errorMsg = `Cleanup failed: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      console.error(`[UnifiedCardStore] ${errorMsg}`);
    }

    return {
      removedKeys,
      errors,
      freedSpace
    };
  },

  // Batch operations
  updateBatchCustomFields: (batchId: string, definitions: CustomFieldsForBatch) => {
    const state = get();
    const batch = state.batches.get(batchId);
    if (!batch) return;

    const updatedBatch = {
      ...batch,
      customFieldDefinitions: definitions
    };

    const newBatches = new Map(state.batches);
    newBatches.set(batchId, updatedBatch);

    set({
      batches: newBatches,
      cacheValid: false
    });

    get()._syncToLocalStorage();
  },

  updateBatchVariantTypes: (batchId: string, types: VariantTypesForBatch) => {
    const state = get();
    const batch = state.batches.get(batchId);
    if (!batch) return;

    const updatedBatch = {
      ...batch,
      variantTypes: types
    };

    const newBatches = new Map(state.batches);
    newBatches.set(batchId, updatedBatch);

    set({
      batches: newBatches,
      cacheValid: false
    });

    get()._syncToLocalStorage();
  },

  toggleBatchDisabled: async (batchId: string) => {
    const state = get();
    const batch = state.batches.get(batchId);
    if (!batch) {
      console.log(`[UnifiedCardStore] toggleBatchDisabled: batch ${batchId} not found`);
      return false;
    }

    const oldDisabled = batch.disabled || false;
    const newDisabled = !oldDisabled;

    console.log(`[UnifiedCardStore] toggleBatchDisabled: batch ${batchId} disabled: ${oldDisabled} -> ${newDisabled}`);

    if (batchId === CARD_BUILTIN_SOURCE_ID) {
      const result = setBuiltinCardRuntimeSourceDisabled(newDisabled);
      if (!result.ok) return false;
    } else {
      if (isServer) return false;
      const existingIndexEntry = state.index.batches[batchId];
      if (!existingIndexEntry) return false;

      try {
        const newIndex: CustomCardIndex = {
          ...state.index,
          batches: {
            ...state.index.batches,
            [batchId]: {
              ...existingIndexEntry,
              disabled: newDisabled,
            },
          },
          lastUpdate: new Date().toISOString(),
        };

        localStorage.setItem(STORAGE_KEYS.INDEX, JSON.stringify(newIndex));
      } catch (error) {
        console.error(`[UnifiedCardStore] Failed to persist disabled state for batch ${batchId}:`, error);
        return false;
      }
    }

    try {
      await get().reloadCustomRuntimeFromStorage();
      return true;
    } catch (error) {
      console.error(`[UnifiedCardStore] Failed to refresh runtime after toggling batch ${batchId}:`, error);
      return false;
    }
  },

  getBatchDisabledStatus: (batchId: string) => {
    const batch = get().batches.get(batchId);
    return batch?.disabled || false;
  },

  getAllBuiltinCardTemplateIds: () => {
    const state = get();
    return Array.from(state.cards.values())
      .filter(card => card.batchId === CARD_BUILTIN_SOURCE_ID || card.source === CardSource.BUILTIN)
      .map(card => card.id);
  },


  // Utilities
  getBatchName: (batchId: string) => {
    const batch = get().batches.get(batchId);
    return batch?.name || null;
  },

  generateBatchId: () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 7);
    return `batch_${timestamp}_${random}`;
  },

  invalidateCache: () => {
    set({ cacheValid: false });
  },

  // Image URL preprocessing
  _preprocessCardImages: () => {
    const state = get();
    const updatedCards = new Map(state.cards);
    let processedCount = 0;

    for (const [cardId, card] of state.cards) {
      // 跳过已有图片URL的卡牌
      if (card.imageUrl) continue;

      const inferredUrl = get()._inferCardImageUrl(card);
      if (inferredUrl) {
        updatedCards.set(cardId, { ...card, imageUrl: inferredUrl });
        processedCount++;
      } else {
        console.log(`[UnifiedCardStore] 无法为卡牌 "${card.name}" (ID: ${cardId}) 推断图片路径`);
      }
    }

    if (processedCount > 0) {
      console.log(`[UnifiedCardStore] Preprocessed ${processedCount} card images`);
      set({ cards: updatedCards });
    }
  },

  _inferCardImageUrl: (card: ExtendedStandardCard): string | null => {
    try {
      // 获取batch名称
      let batchName: string | null = null;

      // 如果是内置卡片，优先使用 builtin-cards
      if (card.source === 'builtin') {
        batchName = 'builtin-cards';
      }
      // 如果已经有 batchName，直接使用（但内置卡片除外）
      else if (card.batchName && typeof card.batchName === 'string') {
        batchName = card.batchName;
      }
      // 如果没有 batchName 但有 batchId，通过 getBatchName 获取名称
      else if (card.batchId && typeof card.batchId === 'string') {
        const batch = get().batches.get(card.batchId);
        batchName = batch?.name || null;
      }

      // 如果获取不到 batchName，就直接返回 null
      if (!batchName) {
        return null;
      }

      // 获取卡片类型
      const cardType = card.type?.toLowerCase() || 'unknown';

      // 获取卡片名称，转换为适合文件名的格式
      let cardName: string;
      if (cardType === 'ancestry' && card.class) {
        cardName = card.class.toLowerCase()
          .replace(/[^a-z0-9\u4e00-\u9fff]/g, '')  // 移除特殊字符，保留中文
          .replace(/\s+/g, '');
      } else {
        cardName = card.name?.toLowerCase()
          .replace(/[^a-z0-9\u4e00-\u9fff]/g, '')  // 移除特殊字符，保留中文
          .replace(/\s+/g, '') || 'unknown';
      }

      // 构建推断的图片路径
      const inferredPath = `/${batchName}/${cardType}/${cardName}.webp`;
      // console.log(`[_inferCardImageUrl] "${card.name}" 推断图片路径: ${inferredPath}`);
      return inferredPath;
    } catch (error) {
      console.warn('[_inferCardImageUrl] 推断图片路径失败:', error);
      return null;
    }
  },

  // Internal helpers
  _rebuildCardsByType: () => {
    const state = get();
    const newCardsByType = new Map<CardType, string[]>();

    // 初始化所有类型的空数组
    Object.values(CardType).forEach(type => {
      newCardsByType.set(type as CardType, []);
    });

    // 遍历所有卡牌，按类型分组卡牌ID
    for (const card of state.cards.values()) {
      const typeCardIds = newCardsByType.get(card.type as CardType) || [];
      typeCardIds.push(card.id);
      newCardsByType.set(card.type as CardType, typeCardIds);
    }

    set({ cardsByType: newCardsByType });
  },

  _addCardToTypeMap: (card: ExtendedStandardCard) => {
    const state = get();
    const typeCardIds = state.cardsByType.get(card.type as CardType) || [];
    typeCardIds.push(card.id);

    const newCardsByType = new Map(state.cardsByType);
    newCardsByType.set(card.type as CardType, typeCardIds);
    set({ cardsByType: newCardsByType });
  },

  _removeCardFromTypeMap: (card: ExtendedStandardCard) => {
    const state = get();
    const typeCardIds = state.cardsByType.get(card.type as CardType) || [];
    const filteredCardIds = typeCardIds.filter(id => id !== card.id);

    const newCardsByType = new Map(state.cardsByType);
    newCardsByType.set(card.type as CardType, filteredCardIds);
    set({ cardsByType: newCardsByType });
  },

  _recomputeAggregations: () => {
    const state = get();

    // Compute aggregated custom fields
    const aggregatedFields: CustomFieldNamesStore = {};
    const aggregatedVariants: VariantTypesForBatch = {};

    for (const batch of state.batches.values()) {
      if (batch.disabled) continue;

      // Aggregate custom fields
      if (batch.customFieldDefinitions) {
        for (const [category, fields] of Object.entries(batch.customFieldDefinitions)) {
          if (!Array.isArray(fields)) continue; // Skip non-array values
          if (!aggregatedFields[category]) {
            aggregatedFields[category] = [];
          }
          aggregatedFields[category].push(...fields);
        }
      }

      // Aggregate variant types
      if (batch.variantTypes) {
        Object.assign(aggregatedVariants, batch.variantTypes);
      }
    }

    // Remove duplicates from custom fields
    for (const category of Object.keys(aggregatedFields)) {
      aggregatedFields[category] = [...new Set(aggregatedFields[category])];
    }

    set({
      aggregatedCustomFields: aggregatedFields,
      aggregatedVariantTypes: aggregatedVariants,
      cacheValid: true
    });
  },

  _rebuildSubclassIndex: () => {
    const state = get();

    // Initialize the index objects
    const cardIndex: Record<string, Record<string, string[]>> = {};
    const levelIndex: Record<string, Record<string, string[]>> = {};

    // 🚀 New: Batch-specific keyword and level indexes
    const batchKeywordIndex: Record<string, Record<string, Set<string>>> = {};
    const batchLevelIndex: Record<string, Record<string, Set<string>>> = {};

    // Iterate through all cards
    for (const card of state.cards.values()) {
      // Skip cards from disabled batches
      if (card.batchId) {
        const batch = state.batches.get(card.batchId);
        if (batch?.disabled) continue;
      }

      let indexKey: string;
      let subclass: string | undefined;

      if (isVariantCard(card)) {
        // For variant cards:
        // - Use variantSpecial.realType as the index key (e.g., "武器", "护甲", "野兽形态")
        // - Use variantSpecial.subCategory as the subclass (e.g., "长剑", "短剑")
        // - For variant types without subclasses (like 野兽形态), use "__no_subclass__" as placeholder
        indexKey = card.variantSpecial?.realType || '';
        subclass = card.variantSpecial?.subCategory || '__no_subclass__';
      } else {
        // For standard cards:
        // - Use card.type as the index key (e.g., "domain", "profession")
        // - Use card.class as the subclass (e.g., "火焰", "Guardian")
        indexKey = card.type;
        subclass = card.class;
      }

      if (!indexKey || !subclass) continue;

      // 🚀 Build card ID index (for O(1) filtering)
      if (!cardIndex[indexKey]) {
        cardIndex[indexKey] = {};
      }
      if (!cardIndex[indexKey][subclass]) {
        cardIndex[indexKey][subclass] = [];
      }
      cardIndex[indexKey][subclass].push(card.id);

      // 🚀 Build level index (for O(1) level filtering)
      if (card.level) {
        if (!levelIndex[indexKey]) {
          levelIndex[indexKey] = {};
        }
        const levelKey = card.level.toString();
        if (!levelIndex[indexKey][levelKey]) {
          levelIndex[indexKey][levelKey] = [];
        }
        levelIndex[indexKey][levelKey].push(card.id);
      }

      // 🚀 New: Record batch-specific keywords and levels
      if (card.batchId) {
        // Record keywords
        if (!batchKeywordIndex[card.batchId]) {
          batchKeywordIndex[card.batchId] = {};
        }
        if (!batchKeywordIndex[card.batchId][indexKey]) {
          batchKeywordIndex[card.batchId][indexKey] = new Set();
        }
        // Add class/keyword (exclude placeholder)
        if (subclass && subclass !== '__no_subclass__') {
          batchKeywordIndex[card.batchId][indexKey].add(subclass);
        }

        // Record levels
        if (card.level) {
          if (!batchLevelIndex[card.batchId]) {
            batchLevelIndex[card.batchId] = {};
          }
          if (!batchLevelIndex[card.batchId][indexKey]) {
            batchLevelIndex[card.batchId][indexKey] = new Set();
          }
          batchLevelIndex[card.batchId][indexKey].add(card.level.toString());
        }
      }
    }

    // 🚀 Convert Sets to Arrays for serialization
    const finalBatchKeywordIndex: Record<string, Record<string, string[]>> = {};
    const finalBatchLevelIndex: Record<string, Record<string, string[]>> = {};

    for (const [batchId, types] of Object.entries(batchKeywordIndex)) {
      finalBatchKeywordIndex[batchId] = {};
      for (const [type, keywords] of Object.entries(types)) {
        finalBatchKeywordIndex[batchId][type] = Array.from(keywords);
      }
    }

    for (const [batchId, types] of Object.entries(batchLevelIndex)) {
      finalBatchLevelIndex[batchId] = {};
      for (const [type, levels] of Object.entries(types)) {
        finalBatchLevelIndex[batchId][type] = Array.from(levels);
      }
    }

    console.log('[UnifiedCardStore] Rebuilt subclass card index - sample:', Object.keys(cardIndex));
    console.log('[UnifiedCardStore] Rebuilt level card index - sample:', Object.keys(levelIndex));
    console.log('[UnifiedCardStore] Rebuilt batch keyword index - sample:', Object.keys(finalBatchKeywordIndex));
    console.log('[UnifiedCardStore] Rebuilt batch level index - sample:', Object.keys(finalBatchLevelIndex));

    set({
      subclassCardIndex: cardIndex,
      levelCardIndex: levelIndex,
      batchKeywordIndex: finalBatchKeywordIndex,
      batchLevelIndex: finalBatchLevelIndex
    });
  },

  _syncToLocalStorage: () => {
    // Skip on server-side
    if (isServer) return;

    const state = get();

    try {
      const customSources: CardRuntimeSourceSnapshot[] = [];

      // Persists custom card storage only. Built-in source state belongs to app preferences.
      for (const [batchId, batch] of state.batches) {
        if (batchId === CARD_BUILTIN_SOURCE_ID) continue;

        // 从全局状态中获取卡牌数据
        const batchCards = batch.cardIds.map(cardId => state.cards.get(cardId)).filter(card => card !== undefined);

        const batchData: BatchData = {
          metadata: {
            id: batch.id,
            name: batch.name,
            fileName: batch.fileName,
            importTime: batch.importTime,
            version: batch.version,
            description: batch.description,
            author: batch.author,
            imageCardIds: batch.imageCardIds,        // ✅ 保存图片ID列表
            imageCount: batch.imageCount,            // ✅ 保存图片数量
            totalImageSize: batch.totalImageSize     // ✅ 保存图片总大小
          },
          cards: batchCards,
          customFieldDefinitions: batch.customFieldDefinitions,
          variantTypes: batch.variantTypes
        };

        localStorage.setItem(
          `${STORAGE_KEYS.BATCH_PREFIX}${batchId}`,
          JSON.stringify(batchData)
        );

        customSources.push({
          sourceId: batchId,
          kind: "custom",
          batch,
          cards: batchCards as ExtendedStandardCard[],
        });
      }

      // Save custom-only index after payloads have been written.
      localStorage.setItem(STORAGE_KEYS.INDEX, JSON.stringify(buildCustomIndexFromSources(customSources)));
    } catch (error) {
      console.error('[UnifiedCardStore] Error syncing to localStorage:', error);
    }
  },

  _clearCustomRuntimeState: () => {
    const state = get();
    const cards = new Map<string, ExtendedStandardCard>();
    const batches = new Map<string, BatchInfo>();

    for (const [cardId, card] of state.cards) {
      if (card.batchId === BUILTIN_BATCH_ID || (!card.batchId && card.source !== CardSource.CUSTOM)) {
        cards.set(cardId, card);
      }
    }

    for (const [batchId, batch] of state.batches) {
      if (batchId === BUILTIN_BATCH_ID || batch.isSystemBatch) {
        batches.set(batchId, batch);
      }
    }

    for (const url of state.imageService.cache.values()) {
      URL.revokeObjectURL(url);
    }

    set({
      cards,
      batches,
      cardsByType: new Map(),
      index: {
        batches: {},
        totalCards: 0,
        totalBatches: 0,
        lastUpdate: state.index.lastUpdate
      },
      aggregatedCustomFields: null,
      aggregatedVariantTypes: null,
      subclassCardIndex: null,
      levelCardIndex: null,
      batchKeywordIndex: null,
      batchLevelIndex: null,
      cacheValid: false,
      stats: null,
      imageService: {
        ...state.imageService,
        cache: new Map(),
        cacheOrder: [],
        loadingImages: new Set(),
        failedImages: new Set()
      }
    });
  },

  _loadAllCards: async () => {
    console.log('[UnifiedCardStore] Starting unified card loading...');
    
    try {
      await get().reloadCustomRuntimeFromStorage();
      console.log('[UnifiedCardStore] Unified card loading completed');
      
    } catch (error) {
      console.error('[UnifiedCardStore] Unified card loading failed:', error);
      throw error;
    }
  },

  _loadCustomRuntimeSourceSnapshots: () => {
    if (isServer) return [];

    console.log('[UnifiedCardStore] Loading custom card runtime sources from localStorage...');

    const indexStr = localStorage.getItem(STORAGE_KEYS.INDEX);
    if (!indexStr) {
      console.log('[UnifiedCardStore] No custom cards index found');
      return [];
    }

    const index: CustomCardIndex = JSON.parse(indexStr);
    const batchData = new Map<string, BatchData>();

    const orphanedKeys: string[] = [];
    const indexBatchIds = new Set(Object.keys(index.batches));

    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(STORAGE_KEYS.BATCH_PREFIX)) {
        const batchId = key.replace(STORAGE_KEYS.BATCH_PREFIX, '');
        if (batchId === CARD_BUILTIN_SOURCE_ID) continue;
        if (!indexBatchIds.has(batchId)) {
          orphanedKeys.push(key);
          console.warn(`[UnifiedCardStore] Found orphaned batch key: ${key} (batch ID: ${batchId})`);
        }
      }
    }

    if (orphanedKeys.length > 0) {
      console.warn(`[UnifiedCardStore] Detected ${orphanedKeys.length} orphaned batch keys. Run cleanupOrphanedData() to remove them.`);
    }

    for (const batchId of Object.keys(index.batches)) {
      if (batchId === CARD_BUILTIN_SOURCE_ID) continue;

      const batchStr = localStorage.getItem(`${STORAGE_KEYS.BATCH_PREFIX}${batchId}`);
      if (batchStr) {
        batchData.set(batchId, JSON.parse(batchStr));
      }
    }

    const sources = loadCustomCardRuntimeSourcesFromSnapshot({ index, batches: batchData });
    console.log(
      `[UnifiedCardStore] Loaded ${sources.length} custom card runtime sources with ${sources.reduce((sum, source) => sum + source.cards.length, 0)} cards`,
    );
    return sources;
  },

  _loadCustomCardsFromStorage: () => {
    const state = get();
    const customSources = get()._loadCustomRuntimeSourceSnapshots();
    const builtinBatch = state.batches.get(CARD_BUILTIN_SOURCE_ID);
    const builtinSource: CardRuntimeSourceSnapshot | null = builtinBatch
      ? {
          sourceId: CARD_BUILTIN_SOURCE_ID,
          kind: "builtin",
          batch: builtinBatch,
          cards: builtinBatch.cardIds
            .map(cardId => state.cards.get(cardId))
            .filter((card): card is ExtendedStandardCard => Boolean(card)),
        }
      : null;
    const assembled = assembleCardRuntimeSources([
      ...(builtinSource ? [builtinSource] : []),
      ...customSources,
    ]);

    set({
      cards: assembled.cards,
      batches: assembled.batches,
      index: buildCustomIndexFromSources(customSources),
      cacheValid: false,
    });
  },

  _migrateLegacyData: async () => {
    // Implementation will be added in next iteration
    console.log('[UnifiedCardStore] Checking for legacy data migration...');
    return null;
  },

  _computeStats: (): CustomCardStats => {
    const state = get();
    const customCards = Array.from(state.cards.values()).filter(
      card => card.source === CardSource.CUSTOM
    );

    const cardsByType: Record<string, number> = {};
    const cardsByBatch: Record<string, number> = {};

    customCards.forEach(card => {
      cardsByType[card.type] = (cardsByType[card.type] || 0) + 1;
      if (card.batchId) {
        cardsByBatch[card.batchId] = (cardsByBatch[card.batchId] || 0) + 1;
      }
    });

    return {
      totalCards: customCards.length,
      totalBatches: Array.from(state.batches.keys()).filter(batchId => batchId !== CARD_BUILTIN_SOURCE_ID).length,
      cardsByType,
      cardsByBatch,
      storageUsed: get().calculateStorageUsage().totalSize
    };
  },

  _validateImportData: (importData: ImportData) => {
    const errors: string[] = [];

    // Basic validation
    if (!importData || typeof importData !== 'object') {
      errors.push('Invalid import data format');
      return { isValid: false, errors };
    }

    // Check if at least one card type is present
    const cardTypes = ['profession', 'ancestry', 'community', 'subclass', 'domain', 'variant'];
    const hasCards = cardTypes.some(type => {
      const cards = (importData as any)[type];
      return cards && Array.isArray(cards) && cards.length > 0;
    });

    if (!hasCards) {
      errors.push('No valid card data found in import');
    }

    // Use the original validation system for detailed validation
    try {
      // Import validation utilities dynamically
      const { CardTypeValidator } = require('../type-validators');

      // Create validation context from import data (inline implementation to avoid circular dependency)
      const tempCustomFields = importData.customFieldDefinitions ? Object.fromEntries(
        Object.entries(importData.customFieldDefinitions)
          .filter(([key, value]) => Array.isArray(value) && key !== 'variantTypes')
          .map(([key, value]) => [key, value as string[]])
      ) : undefined;

      const tempVariantTypes = importData.customFieldDefinitions?.variantTypes;

      // Merge custom fields (inline implementation)
      const existing = get().getAggregatedCustomFields();
      const builtinFields: CustomFieldNamesStore = {};

      // Get builtin fields
      const builtinCardPackJson = require('../../data/cards/builtin-base.json');
      const builtinCustomFields = (builtinCardPackJson as any).customFieldDefinitions;
      if (builtinCustomFields) {
        for (const [category, names] of Object.entries(builtinCustomFields)) {
          if (Array.isArray(names) && category !== 'variantTypes') {
            builtinFields[category] = names as string[];
          }
        }
      }

      const mergedCustomFields: CustomFieldNamesStore = { ...builtinFields };
      for (const [category, names] of Object.entries(existing)) {
        if (!mergedCustomFields[category]) {
          mergedCustomFields[category] = [];
        }
        mergedCustomFields[category] = [...new Set([...mergedCustomFields[category], ...names])];
      }

      if (tempCustomFields) {
        for (const [category, names] of Object.entries(tempCustomFields)) {
          if (Array.isArray(names)) {
            if (!mergedCustomFields[category]) {
              mergedCustomFields[category] = [];
            }
            mergedCustomFields[category] = [...new Set([...mergedCustomFields[category], ...names])];
          }
        }
      }

      // Merge variant types (inline implementation)
      const existingVariantTypes = get().getAggregatedVariantTypes();
      const builtinVariantTypes: VariantTypesForBatch = {};
      if (builtinCustomFields?.variantTypes) {
        Object.assign(builtinVariantTypes, builtinCustomFields.variantTypes);
      }
      const mergedVariantTypes = { ...builtinVariantTypes, ...existingVariantTypes };
      if (tempVariantTypes) {
        Object.assign(mergedVariantTypes, tempVariantTypes);
      }

      // Create validation context
      const validationContext = {
        customFields: mergedCustomFields,
        variantTypes: mergedVariantTypes,
        tempBatchId: 'temp_validation'
      };

      // Validate using the original system's validator
      const validationResult = CardTypeValidator.validateImportData(importData, validationContext);

      if (!validationResult.isValid) {
        // Convert validation errors to simple error messages
        validationResult.errors.forEach((error: any) => {
          errors.push(`${error.path}: ${error.message}`);
        });
      }
    } catch (error) {
      console.warn('[UnifiedCardStore] Failed to use advanced validation, falling back to basic validation:', error);

      // Fallback: just check for ID field
      cardTypes.forEach(type => {
        const cards = (importData as any)[type];
        if (cards && Array.isArray(cards)) {
          cards.forEach((card: any, index: number) => {
            if (!card.id) {
              errors.push(`${type}[${index}]: Missing card ID`);
            }
          });
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
});
