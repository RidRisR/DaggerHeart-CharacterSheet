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
import { preprocessVariantFormat } from '../variant-format-preprocessor';

// Type for Zustand's set and get functions
type SetFunction = (partial: Partial<UnifiedCardState> | ((state: UnifiedCardState) => Partial<UnifiedCardState>)) => void;
type GetFunction = () => UnifiedCardState & UnifiedCardActions;

export const createStoreActions = (set: SetFunction, get: GetFunction): UnifiedCardActions => ({
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

      // 现在所有卡牌都已加载完毕，统一进行图片预处理
      get()._preprocessCardImages();

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

  resetSystem: () => {
    // Clean up all batch keys from localStorage first
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
    // Reload custom cards from localStorage
    get()._loadCustomCardsFromStorage();
    get()._recomputeAggregations();
    get()._rebuildCardsByType();
    const newStats = get()._computeStats();
    set({ stats: newStats });
  },

  // Custom card management
  importCards: async (importData: ImportData, batchName?: string) => {
    console.log('[UnifiedCardStore] Starting card import...');

    try {
      const state = get();

      // Ensure system is initialized
      if (!state.initialized) {
        const result = await get().initializeSystem();
        if (!result.initialized) {
          throw new Error('Failed to initialize card system');
        }
      }

      // 🎯 预处理新格式：将新的 variants 数组转换为旧的 variantTypes 对象
      const processedData = preprocessVariantFormat(importData);

      // Validate import data
      const validation = get()._validateImportData(processedData);
      if (!validation.isValid) {
        return {
          success: false,
          imported: 0,
          errors: validation.errors,
          batchId: ''
        };
      }

      // Check for ID conflicts with existing cards
      const existingCards = Array.from(state.cards.values());
      const allImportedCards: any[] = [];

      // Collect all cards from import data
      Object.entries(processedData).forEach(([, cards]) => {
        if (Array.isArray(cards)) {
          allImportedCards.push(...cards);
        }
      });

      // Check for duplicate IDs
      const duplicateIds = allImportedCards
        .filter(card => existingCards.some(existing => existing.id === card.id))
        .map(card => card.id);

      if (duplicateIds.length > 0) {
        return {
          success: false,
          imported: 0,
          errors: [`Duplicate card IDs found: ${duplicateIds.join(', ')}`],
          batchId: ''
        };
      }

      // Convert import data to standard cards
      const convertResult = await get()._convertImportData(processedData);
      if (!convertResult.success) {
        return {
          success: false,
          imported: 0,
          errors: convertResult.errors || ['Conversion failed'],
          batchId: ''
        };
      }

      // Generate batch ID and create batch info
      const batchId = get().generateBatchId();
      const cardTypes = [...new Set(convertResult.cards.map(card => card.type))];
      const batchDisplayName = processedData.name || batchName || `Import ${new Date().toLocaleDateString()}`;

      // Create batch info
      const batchInfo: BatchInfo = {
        id: batchId,
        name: batchDisplayName,
        fileName: batchName || 'Imported Cards',
        importTime: new Date().toISOString(),
        cardCount: convertResult.cards.length,
        cardTypes,
        size: JSON.stringify(convertResult.cards).length,
        isSystemBatch: false,
        disabled: false,
        cardIds: convertResult.cards.map(card => card.id),
        customFieldDefinitions: processedData.customFieldDefinitions ?
          Object.fromEntries(
            Object.entries(processedData.customFieldDefinitions)
              .filter(([key, value]) => key !== 'variantTypes' && Array.isArray(value))
          ) as CustomFieldsForBatch : undefined,
        variantTypes: processedData.customFieldDefinitions?.variantTypes
      };

      // Update store state
      const newBatches = new Map(state.batches);
      newBatches.set(batchId, batchInfo);

      const newCards = new Map(state.cards);
      // 直接将卡牌数据存储到全局状态中
      convertResult.cards.forEach(card => {
        const cardWithBatchId = { ...card, batchId, source: CardSource.CUSTOM };
        newCards.set(card.id, cardWithBatchId);
      });

      // Update index
      const newIndex = { ...state.index };
      newIndex.batches[batchId] = {
        id: batchId,
        name: batchDisplayName,
        fileName: batchInfo.fileName,
        importTime: batchInfo.importTime,
        cardCount: batchInfo.cardCount,
        cardTypes: batchInfo.cardTypes,
        size: batchInfo.size,
        isSystemBatch: false,
        disabled: false
      };
      newIndex.totalCards = newCards.size;
      newIndex.totalBatches = newBatches.size;
      newIndex.lastUpdate = new Date().toISOString();

      set({
        batches: newBatches,
        cards: newCards,
        index: newIndex,
        cacheValid: false
      });

      // Sync to localStorage
      get()._syncToLocalStorage();

      // Recompute aggregations
      get()._recomputeAggregations();

      // Rebuild cardsByType map
      get()._rebuildCardsByType();

      // NOTE: 不在这里调用 _preprocessCardImages()，在初始化完成后统一处理

      console.log(`[UnifiedCardStore] Successfully imported ${convertResult.cards.length} cards`);

      return {
        success: true,
        imported: convertResult.cards.length,
        errors: [],
        batchId
      };

    } catch (error) {
      console.error('[UnifiedCardStore] Import failed:', error);
      return {
        success: false,
        imported: 0,
        errors: [error instanceof Error ? error.message : 'Import failed'],
        batchId: ''
      };
    }
  },

  removeBatch: (batchId: string) => {
    const state = get();
    const batch = state.batches.get(batchId);
    if (!batch) return false;

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

    return true;
  },

  clearAllCustomCards: () => {
    const state = get();
    const newBatches = new Map();
    const newCards = new Map();

    // First, remove all custom batch keys from localStorage
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
      batches: builtinBatch ? {
        [BUILTIN_BATCH_ID]: {
          id: BUILTIN_BATCH_ID,
          name: builtinBatch.name,
          fileName: builtinBatch.fileName,
          importTime: builtinBatch.importTime,
          cardCount: builtinBatch.cardCount,
          cardTypes: builtinBatch.cardTypes,
          size: builtinBatch.size,
          isSystemBatch: true
        }
      } : {},
      totalCards: newCards.size,
      totalBatches: newBatches.size,
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
      cardCount: batch.cardCount,
      cardTypes: batch.cardTypes,
      storageSize: batch.size,
      isSystemBatch: batch.isSystemBatch || false,
      disabled: batch.disabled || false
    } as BatchStats & { id: string; name: string; fileName: string; isSystemBatch: boolean; disabled: boolean }));
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

    // Basic validation
    if (state.cards.size !== state.index.totalCards) {
      issues.push(`Card count mismatch: ${state.cards.size} vs ${state.index.totalCards}`);
    }

    if (state.batches.size !== state.index.totalBatches) {
      issues.push(`Batch count mismatch: ${state.batches.size} vs ${state.index.totalBatches}`);
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

    const updatedBatch = {
      ...batch,
      disabled: newDisabled
    };

    const newBatches = new Map(state.batches);
    newBatches.set(batchId, updatedBatch);

    // Update the index as well
    const newIndex = { ...state.index };
    if (newIndex.batches[batchId]) {
      newIndex.batches[batchId] = {
        ...newIndex.batches[batchId],
        disabled: newDisabled
      };
    }

    console.log(`[UnifiedCardStore] toggleBatchDisabled: batch ${batchId} disabled: ${oldDisabled} -> ${newDisabled}`);

    set({
      batches: newBatches,
      index: newIndex,
      cacheValid: false
    });

    get()._syncToLocalStorage();

    // Note: Old card-store cache reset is no longer needed with unified system
    // Cards are automatically updated through the unified store

    return true;
  },

  getBatchDisabledStatus: (batchId: string) => {
    const batch = get().batches.get(batchId);
    return batch?.disabled || false;
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
        console.log(`[UnifiedCardStore] 为卡牌 "${card.name}" (ID: ${cardId}) 推断图片路径: ${inferredUrl}`);
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

  _syncToLocalStorage: () => {
    // Skip on server-side
    if (isServer) return;

    const state = get();

    try {
      // Save index
      localStorage.setItem(STORAGE_KEYS.INDEX, JSON.stringify(state.index));

      // Save batches individually (maintain compatibility)
      for (const [batchId, batch] of state.batches) {
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
            author: batch.author
          },
          cards: batchCards,
          customFieldDefinitions: batch.customFieldDefinitions,
          variantTypes: batch.variantTypes
        };

        localStorage.setItem(
          `${STORAGE_KEYS.BATCH_PREFIX}${batchId}`,
          JSON.stringify(batchData)
        );
      }
    } catch (error) {
      console.error('[UnifiedCardStore] Error syncing to localStorage:', error);
    }
  },

  _loadAllCards: async () => {
    console.log('[UnifiedCardStore] Starting unified card loading...');
    
    try {
      // STEP 1: Load builtin cards first (ensures UI display order)
      await get()._seedBuiltinCards();
      
      // STEP 2: Load custom cards from localStorage (skip builtin)
      get()._loadCustomCardsFromStorage();
      
      console.log('[UnifiedCardStore] Unified card loading completed');
      
    } catch (error) {
      console.error('[UnifiedCardStore] Unified card loading failed:', error);
      throw error;
    }
  },

  _loadCustomCardsFromStorage: () => {
    // Skip on server-side
    if (isServer) return;

    console.log('[UnifiedCardStore] Loading custom cards from localStorage...');

    try {
      // Load index
      const indexStr = localStorage.getItem(STORAGE_KEYS.INDEX);
      if (!indexStr) {
        console.log('[UnifiedCardStore] No custom cards index found');
        return;
      }

      const index: CustomCardIndex = JSON.parse(indexStr);
      const state = get();
      const batches = new Map(state.batches); // Preserve existing batches (builtin already loaded)
      const cards = new Map(state.cards); // Preserve existing cards (builtin already loaded)

      let customBatchCount = 0;
      let customCardCount = 0;

      // Detect orphaned batch keys (keys in localStorage but not in index)
      const orphanedKeys: string[] = [];
      const indexBatchIds = new Set(Object.keys(index.batches));
      
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith(STORAGE_KEYS.BATCH_PREFIX)) {
          const batchId = key.replace(STORAGE_KEYS.BATCH_PREFIX, '');
          if (!indexBatchIds.has(batchId)) {
            orphanedKeys.push(key);
            console.warn(`[UnifiedCardStore] Found orphaned batch key: ${key} (batch ID: ${batchId})`);
          }
        }
      }
      
      if (orphanedKeys.length > 0) {
        console.warn(`[UnifiedCardStore] Detected ${orphanedKeys.length} orphaned batch keys. Run cleanupOrphanedData() to remove them.`);
      }

      // Load custom batches only (skip builtin which is already loaded)
      for (const batchId of Object.keys(index.batches)) {
        // Skip builtin batch - it's already loaded by _seedBuiltinCards
        if (batchId === BUILTIN_BATCH_ID) {
          console.log('[UnifiedCardStore] Skipping builtin batch - already loaded first');
          continue;
        }

        const batchStr = localStorage.getItem(`${STORAGE_KEYS.BATCH_PREFIX}${batchId}`);
        if (batchStr) {
          const batchData: BatchData = JSON.parse(batchStr);
          const batchInfo = index.batches[batchId];

          const batch: BatchInfo = {
            id: batchData.metadata.id,
            name: batchInfo.name,
            fileName: batchInfo.fileName,
            importTime: batchInfo.importTime,
            version: batchData.metadata.version,
            description: batchData.metadata.description,
            author: batchData.metadata.author,
            cardCount: batchInfo.cardCount,
            cardTypes: batchInfo.cardTypes,
            size: batchInfo.size,
            isSystemBatch: batchInfo.isSystemBatch,
            disabled: batchInfo.disabled,
            cardIds: batchData.cards.map(card => card.id),
            customFieldDefinitions: batchData.customFieldDefinitions,
            variantTypes: batchData.variantTypes
          };

          batches.set(batchId, batch);
          customBatchCount++;

          // Add cards to the cards map, ensuring they have the correct batchId
          batchData.cards.forEach(card => {
            const cardWithBatchId = {
              ...card,
              batchId: batchId,
              source: CardSource.CUSTOM // Ensure source is set
            };
            cards.set(card.id, cardWithBatchId);
            customCardCount++;
          });
        }
      }

      // Update store state (preserve existing index but ensure it's consistent)
      const newIndex = { ...index };
      set({
        index: newIndex,
        batches,
        cards,
        cacheValid: false
      });

      console.log(`[UnifiedCardStore] Loaded ${customBatchCount} custom batches with ${customCardCount} cards`);

    } catch (error) {
      console.error('[UnifiedCardStore] Error loading custom cards from localStorage:', error);
      throw error;
    }
  },


  _seedBuiltinCards: async () => {
    console.log('[UnifiedCardStore] Starting builtin cards seeding...');
    
    try {
      const state = get();
      
      // Check for saved disabled status in localStorage
      let savedDisabledStatus = false;
      const indexStr = localStorage.getItem('daggerheart_custom_cards_index');
      
      if (indexStr) {
        try {
          const index = JSON.parse(indexStr);
          savedDisabledStatus = index.batches?.[BUILTIN_BATCH_ID]?.disabled || false;
          console.log(`[UnifiedCardStore] Restoring builtin batch disabled status: ${savedDisabledStatus}`);
        } catch (error) {
          console.error('[UnifiedCardStore] Error reading builtin batch status:', error);
        }
      }
      
      // Remove any existing builtin batch
      if (state.batches.has(BUILTIN_BATCH_ID)) {
        console.log('[UnifiedCardStore] Removing existing builtin batch');
        get().removeBatch(BUILTIN_BATCH_ID);
      }
      
      // Import builtin card pack JSON
      const builtinCardPackJson = await import('../../data/cards/builtin-base.json');
      console.log('[UnifiedCardStore] Importing builtin cards...');
      await get()._importBuiltinCards(builtinCardPackJson.default, savedDisabledStatus);
      
      console.log('[UnifiedCardStore] Builtin cards seeding completed');
      
    } catch (error) {
      console.error('[UnifiedCardStore] Failed to seed builtin cards:', error);
      throw error;
    }
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
      totalCards: state.cards.size,
      totalBatches: state.batches.size,
      cardsByType,
      cardsByBatch,
      storageUsed: get().calculateStorageUsage().totalSize
    };
  },


  _importBuiltinCards: async (jsonCardPack: any, previousDisabledStatus?: boolean) => {
    console.log('[UnifiedCardStore] Importing builtin cards from JSON...');

    try {
      // Convert JSON to ImportData format
      const importData: ImportData = {
        name: jsonCardPack.name,
        version: jsonCardPack.version,
        description: jsonCardPack.description,
        customFieldDefinitions: jsonCardPack.customFieldDefinitions,
        variantTypes: jsonCardPack.variantTypes,
        ...jsonCardPack
      };

      // Convert import data
      const convertResult = await get()._convertImportData(importData);
      if (!convertResult.success) {
        throw new Error(`Builtin cards conversion failed: ${convertResult.errors?.join(', ')}`);
      }

      // Use provided disabled status (already resolved in caller)
      const savedDisabledStatus = previousDisabledStatus || false;

      if (savedDisabledStatus) {
        console.log(`[UnifiedCardStore] Applying builtin batch disabled status: ${savedDisabledStatus}`);
      }

      // Create builtin batch
      const batchInfo: BatchInfo = {
        id: BUILTIN_BATCH_ID,
        name: jsonCardPack.name,
        fileName: 'builtin-base.json',
        importTime: new Date().toISOString(),
        version: jsonCardPack.version,
        cardCount: convertResult.cards.length,
        cardTypes: [...new Set(convertResult.cards.map(card => card.type))],
        size: JSON.stringify(convertResult.cards).length,
        isSystemBatch: true,
        disabled: savedDisabledStatus,
        cardIds: convertResult.cards.map(card => card.id),
        customFieldDefinitions: jsonCardPack.customFieldDefinitions,
        variantTypes: jsonCardPack.customFieldDefinitions?.variantTypes
      };

      // Update store state
      const state = get();
      const newBatches = new Map(state.batches);
      const newCards = new Map(state.cards);

      // Add batch
      newBatches.set(BUILTIN_BATCH_ID, batchInfo);

      // Add cards with builtin source
      convertResult.cards.forEach(card => {
        newCards.set(card.id, {
          ...card,
          batchId: BUILTIN_BATCH_ID,
          source: CardSource.BUILTIN
        });
      });

      // Update index to include builtin batch
      const newIndex = { ...state.index };
      newIndex.batches[BUILTIN_BATCH_ID] = {
        id: BUILTIN_BATCH_ID,
        name: batchInfo.name,
        fileName: batchInfo.fileName,
        importTime: batchInfo.importTime,
        version: batchInfo.version,
        cardCount: batchInfo.cardCount,
        cardTypes: batchInfo.cardTypes,
        size: batchInfo.size,
        isSystemBatch: batchInfo.isSystemBatch,
        disabled: savedDisabledStatus
      };

      newIndex.totalCards = newCards.size;
      newIndex.totalBatches = newBatches.size;
      newIndex.lastUpdate = new Date().toISOString();

      set({
        batches: newBatches,
        cards: newCards,
        index: newIndex,
        cacheValid: false
      });

      // NOTE: Do NOT call _syncToLocalStorage here - will be called at end of _loadAllCards
      // NOTE: Do NOT call _rebuildCardsByType here - will be called in initializeSystem
      // NOTE: Do NOT call _preprocessCardImages here - will be called in initializeSystem

      console.log(`[UnifiedCardStore] Successfully imported ${convertResult.cards.length} builtin cards`);

    } catch (error) {
      console.error('[UnifiedCardStore] Failed to import builtin cards:', error);
      throw error;
    }
  },

  _convertImportData: async (importData: ImportData) => {
    try {
      const cards: ExtendedStandardCard[] = [];

      // Import converters dynamically to avoid circular dependencies
      const { professionCardConverter } = await import('../profession-card/convert');
      const { ancestryCardConverter } = await import('../ancestry-card/convert');
      const { communityCardConverter } = await import('../community-card/convert');
      const { subclassCardConverter } = await import('../subclass-card/convert');
      const { domainCardConverter } = await import('../domain-card/convert');
      const { variantCardConverter } = await import('../variant-card/convert');

      // Convert each card type
      if (importData.profession) {
        for (const card of importData.profession) {
          const converted = professionCardConverter.toStandard(card);
          cards.push(converted);
        }
      }

      if (importData.ancestry) {
        for (const card of importData.ancestry) {
          const converted = ancestryCardConverter.toStandard(card);
          cards.push(converted);
        }
      }

      if (importData.community) {
        for (const card of importData.community) {
          const converted = communityCardConverter.toStandard(card);
          cards.push(converted);
        }
      }

      if (importData.subclass) {
        for (const card of importData.subclass) {
          const converted = subclassCardConverter.toStandard(card);
          cards.push(converted);
        }
      }

      if (importData.domain) {
        for (const card of importData.domain) {
          const converted = domainCardConverter.toStandard(card);
          cards.push(converted);
        }
      }

      if (importData.variant) {
        for (const card of importData.variant) {
          const converted = variantCardConverter.toStandard(card);
          cards.push(converted);
        }
      }

      return {
        success: true,
        cards
      };

    } catch (error) {
      return {
        success: false,
        cards: [],
        errors: [error instanceof Error ? error.message : 'Conversion failed']
      };
    }
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