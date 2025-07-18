/**
 * Unified Card Store - Complete replacement for CustomCardManager/Storage/Cache
 * This single Zustand store handles all card system functionality
 */

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { 
  ExtendedStandardCard, 
  CardType, 
  CardSource, 
  ImportData, 
  ImportResult,
  CustomCardStats,
  BatchStats
} from '../card-types';

// Import existing interfaces for compatibility
import type {
  CustomCardIndex,
  BatchData,
  CustomFieldNamesStore,
  VariantTypesForBatch,
  CustomFieldsForBatch,
  StorageStats,
  IntegrityReport,
  CleanupReport
} from '../card-storage';

// Import built-in card data
// import builtinCardPackJson from '../../data/cards/builtin-base.json';

// Storage configuration
interface StorageConfig {
  maxBatches: number;
  maxStorageSize: number;
  autoCleanup: boolean;
  compressionEnabled: boolean;
}

// Batch info for internal management
interface BatchInfo {
  id: string;
  name: string;
  fileName: string;
  importTime: string;
  version?: string;
  description?: string;
  author?: string;
  cardCount: number;
  cardTypes: string[];
  size: number;
  isSystemBatch?: boolean;
  disabled?: boolean;
  cards: ExtendedStandardCard[];
  customFieldDefinitions?: CustomFieldsForBatch;
  variantTypes?: VariantTypesForBatch;
}

// Main store state
interface UnifiedCardState {
  // Core data
  cards: Map<string, ExtendedStandardCard>;
  batches: Map<string, BatchInfo>;
  
  // Index data
  index: CustomCardIndex;
  
  // Aggregated cache (computed from batches)
  aggregatedCustomFields: CustomFieldNamesStore | null;
  aggregatedVariantTypes: VariantTypesForBatch | null;
  cacheValid: boolean;
  
  // System state
  initialized: boolean;
  loading: boolean;
  error: string | null;
  
  // Configuration
  config: StorageConfig;
  
  // Statistics
  stats: CustomCardStats | null;
}

// Store actions
interface UnifiedCardActions {
  // System lifecycle
  initializeSystem: () => Promise<{ initialized: boolean; migrationResult?: any }>;
  resetSystem: () => void;
  
  // Core data operations
  loadAllCards: () => ExtendedStandardCard[];
  loadCardsByType: (type: CardType) => ExtendedStandardCard[];
  reloadCustomCards: () => void;
  
  // Custom card management
  importCards: (data: ImportData, batchName?: string) => Promise<ImportResult>;
  removeBatch: (batchId: string) => boolean;
  clearAllCustomCards: () => void;
  getAllBatches: () => BatchStats[];
  
  // Aggregated data (with smart caching)
  getAggregatedCustomFields: () => CustomFieldNamesStore;
  getAggregatedVariantTypes: () => VariantTypesForBatch;
  
  // Storage management
  getStorageInfo: () => {
    used: string;
    available: string;
    total: string;
    percentage: number;
    usagePercent: number;
  };
  getStats: () => CustomCardStats;
  calculateStorageUsage: () => StorageStats;
  checkStorageSpace: (requiredSize: number) => boolean;
  
  // Data integrity
  validateIntegrity: () => IntegrityReport;
  cleanupOrphanedData: () => CleanupReport;
  
  // Batch operations
  updateBatchCustomFields: (batchId: string, definitions: CustomFieldsForBatch) => void;
  updateBatchVariantTypes: (batchId: string, types: VariantTypesForBatch) => void;
  
  // Utilities
  getBatchName: (batchId: string) => string | null;
  generateBatchId: () => string;
  invalidateCache: () => void;
  
  // Internal helpers
  _recomputeAggregations: () => void;
  _syncToLocalStorage: () => void;
  _loadFromLocalStorage: () => void;
  _seedBuiltinCards: () => Promise<void>;
  _migrateLegacyData: () => Promise<any>;
  _computeStats: () => CustomCardStats;
  _importBuiltinCards: (jsonCardPack: any) => Promise<void>;
  _convertImportData: (importData: ImportData) => Promise<{ success: boolean; cards: ExtendedStandardCard[]; errors?: string[] }>;
  _validateImportData: (importData: ImportData) => { isValid: boolean; errors: string[] };
}

type UnifiedCardStore = UnifiedCardState & UnifiedCardActions;

// Storage keys (maintain compatibility with existing localStorage structure)
const STORAGE_KEYS = {
  INDEX: 'daggerheart_custom_cards_index',
  BATCH_PREFIX: 'daggerheart_custom_cards_batch_',
  CONFIG: 'daggerheart_custom_cards_config',
} as const;

// Default configuration
const DEFAULT_CONFIG: StorageConfig = {
  maxBatches: 50,
  maxStorageSize: 5 * 1024 * 1024, // 5MB
  autoCleanup: true,
  compressionEnabled: false
};

// Builtin batch ID
const BUILTIN_BATCH_ID = "SYSTEM_BUILTIN_CARDS";

// Create the unified store
export const useUnifiedCardStore = create<UnifiedCardStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        cards: new Map(),
        batches: new Map(),
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
        config: DEFAULT_CONFIG,
        stats: null,

        // System lifecycle
        initializeSystem: async () => {
          const state = get();
          if (state.initialized) {
            return { initialized: true };
          }

          set({ loading: true, error: null });

          try {
            // Load existing data from localStorage
            get()._loadFromLocalStorage();
            
            // Check for legacy data migration
            const migrationResult = await get()._migrateLegacyData();
            
            // Seed builtin cards
            await get()._seedBuiltinCards();
            
            // Validate and compute initial aggregations
            get()._recomputeAggregations();
            
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
          set({
            cards: new Map(),
            batches: new Map(),
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
          return Array.from(state.cards.values());
        },

        loadCardsByType: (type: CardType) => {
          const state = get();
          return Array.from(state.cards.values()).filter(card => card.type === type);
        },

        reloadCustomCards: () => {
          // Reload custom cards from localStorage
          get()._loadFromLocalStorage();
          get()._recomputeAggregations();
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
            
            // Validate import data
            const validation = get()._validateImportData(importData);
            if (!validation.isValid) {
              return {
                success: false,
                errors: validation.errors,
                importedCards: [],
                batchId: '',
                stats: { totalCards: 0, cardsByType: {} }
              };
            }
            
            // Check for ID conflicts with existing cards
            const existingCards = Array.from(state.cards.values());
            const allImportedCards: any[] = [];
            
            // Collect all cards from import data
            Object.entries(importData).forEach(([type, cards]) => {
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
                errors: [`Duplicate card IDs found: ${duplicateIds.join(', ')}`],
                importedCards: [],
                batchId: '',
                stats: { totalCards: 0, cardsByType: {} }
              };
            }
            
            // Convert import data to standard cards
            const convertResult = await get()._convertImportData(importData);
            if (!convertResult.success) {
              return {
                success: false,
                errors: convertResult.errors || ['Conversion failed'],
                importedCards: [],
                batchId: '',
                stats: { totalCards: 0, cardsByType: {} }
              };
            }
            
            // Generate batch ID and create batch info
            const batchId = get().generateBatchId();
            const cardTypes = [...new Set(convertResult.cards.map(card => card.type))];
            const batchDisplayName = importData.name || batchName || `Import ${new Date().toLocaleDateString()}`;
            
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
              cards: convertResult.cards.map(card => ({ ...card, batchId, source: CardSource.CUSTOM })),
              customFieldDefinitions: importData.customFieldDefinitions,
              variantTypes: importData.variantTypes
            };
            
            // Update store state
            const newBatches = new Map(state.batches);
            newBatches.set(batchId, batchInfo);
            
            const newCards = new Map(state.cards);
            batchInfo.cards.forEach(card => {
              newCards.set(card.id, card);
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
            
            console.log(`[UnifiedCardStore] Successfully imported ${convertResult.cards.length} cards`);
            
            return {
              success: true,
              importedCards: batchInfo.cards,
              batchId,
              stats: {
                totalCards: convertResult.cards.length,
                cardsByType: cardTypes.reduce((acc, type) => {
                  acc[type] = batchInfo.cards.filter(card => card.type === type).length;
                  return acc;
                }, {} as Record<string, number>)
              }
            };
            
          } catch (error) {
            console.error('[UnifiedCardStore] Import failed:', error);
            return {
              success: false,
              errors: [error instanceof Error ? error.message : 'Import failed'],
              importedCards: [],
              batchId: '',
              stats: { totalCards: 0, cardsByType: {} }
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
          batch.cards.forEach(card => {
            newCards.delete(card.id);
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

          // Sync to localStorage
          get()._syncToLocalStorage();
          
          return true;
        },

        clearAllCustomCards: () => {
          const state = get();
          const newBatches = new Map();
          const newCards = new Map();
          
          // Keep only builtin batch
          const builtinBatch = state.batches.get(BUILTIN_BATCH_ID);
          if (builtinBatch) {
            newBatches.set(BUILTIN_BATCH_ID, builtinBatch);
            builtinBatch.cards.forEach(card => {
              newCards.set(card.id, card);
            });
          }

          const newIndex: CustomCardIndex = {
            batches: builtinBatch ? { [BUILTIN_BATCH_ID]: {
              id: BUILTIN_BATCH_ID,
              name: builtinBatch.name,
              fileName: builtinBatch.fileName,
              importTime: builtinBatch.importTime,
              cardCount: builtinBatch.cardCount,
              cardTypes: builtinBatch.cardTypes,
              size: builtinBatch.size,
              isSystemBatch: true
            }} : {},
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
          
          // Basic validation - can be enhanced later
          if (state.cards.size !== state.index.totalCards) {
            issues.push(`Card count mismatch: ${state.cards.size} vs ${state.index.totalCards}`);
          }
          
          if (state.batches.size !== state.index.totalBatches) {
            issues.push(`Batch count mismatch: ${state.batches.size} vs ${state.index.totalBatches}`);
          }
          
          return {
            isValid: issues.length === 0,
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
          
          // Simple cleanup - can be enhanced later
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

        // Internal helpers
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
          const state = get();
          
          try {
            // Save index
            localStorage.setItem(STORAGE_KEYS.INDEX, JSON.stringify(state.index));
            
            // Save batches individually (maintain compatibility)
            for (const [batchId, batch] of state.batches) {
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
                cards: batch.cards,
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

        _loadFromLocalStorage: () => {
          try {
            // Load index
            const indexStr = localStorage.getItem(STORAGE_KEYS.INDEX);
            if (!indexStr) return;
            
            const index: CustomCardIndex = JSON.parse(indexStr);
            const batches = new Map<string, BatchInfo>();
            const cards = new Map<string, ExtendedStandardCard>();
            
            // Load all batches
            for (const batchId of Object.keys(index.batches)) {
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
                  cards: batchData.cards,
                  customFieldDefinitions: batchData.customFieldDefinitions,
                  variantTypes: batchData.variantTypes
                };
                
                batches.set(batchId, batch);
                
                // Add cards to the cards map
                batchData.cards.forEach(card => {
                  cards.set(card.id, card);
                });
              }
            }
            
            set({
              index,
              batches,
              cards,
              cacheValid: false
            });
          } catch (error) {
            console.error('[UnifiedCardStore] Error loading from localStorage:', error);
          }
        },

        _seedBuiltinCards: async () => {
          console.log('[UnifiedCardStore] Starting builtin cards seeding...');
          
          try {
            const state = get();
            
            // Check if builtin cards already exist and are up to date
            const existingBuiltinBatch = state.batches.get(BUILTIN_BATCH_ID);
            
            // Import builtin card pack JSON
            const builtinCardPackJson = await import('../../data/cards/builtin-base.json');
            
            if (existingBuiltinBatch && existingBuiltinBatch.version === builtinCardPackJson.default.version) {
              console.log(`[UnifiedCardStore] Builtin cards version (${builtinCardPackJson.default.version}) is up to date`);
              return;
            }
            
            // Remove existing builtin batch if outdated
            if (existingBuiltinBatch) {
              console.log('[UnifiedCardStore] Removing outdated builtin cards');
              get().removeBatch(BUILTIN_BATCH_ID);
            }
            
            // Import builtin cards using the same import mechanism
            console.log('[UnifiedCardStore] Importing builtin cards...');
            await get()._importBuiltinCards(builtinCardPackJson.default);
            
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

        _importBuiltinCards: async (jsonCardPack: any) => {
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
              disabled: false,
              cards: convertResult.cards.map(card => ({ ...card, batchId: BUILTIN_BATCH_ID, source: CardSource.BUILTIN })),
              customFieldDefinitions: jsonCardPack.customFieldDefinitions,
              variantTypes: jsonCardPack.variantTypes
            };
            
            // Update store state
            const state = get();
            const newBatches = new Map(state.batches);
            newBatches.set(BUILTIN_BATCH_ID, batchInfo);
            
            const newCards = new Map(state.cards);
            batchInfo.cards.forEach(card => {
              newCards.set(card.id, card);
            });
            
            // Update index
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
              isSystemBatch: true,
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
          const hasCards = cardTypes.some(type => importData[type] && Array.isArray(importData[type]) && importData[type].length > 0);
          
          if (!hasCards) {
            errors.push('No valid card data found in import');
          }
          
          // Use the original validation system for detailed validation
          try {
            // Import validation utilities dynamically
            const { CardTypeValidator } = require('../type-validators');
            const { ValidationDataMerger } = require('../validation-utils');
            
            // Create validation context from import data
            const validationContext = ValidationDataMerger.createValidationContextFromImportData(
              importData,
              'temp_validation'
            );
            
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
              if (importData[type] && Array.isArray(importData[type])) {
                importData[type].forEach((card: any, index: number) => {
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
      }),
      {
        name: 'unified-card-storage',
        // Use a minimal persistence that doesn't interfere with localStorage compatibility
        partialize: (state) => ({
          config: state.config,
          // Don't persist cards/batches here - we use direct localStorage for compatibility
        }),
      }
    )
  )
);

// Export convenience hooks
export const useCards = () => useUnifiedCardStore(state => state.cards);
export const useBatches = () => useUnifiedCardStore(state => state.batches);
export const useCardStats = () => useUnifiedCardStore(state => state.stats);
export const useCardSystem = () => useUnifiedCardStore(state => ({
  initialized: state.initialized,
  loading: state.loading,
  error: state.error,
  initializeSystem: state.initializeSystem
}));