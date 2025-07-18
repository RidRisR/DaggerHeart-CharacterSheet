/**
 * Unified Card Store Types and Constants
 * All type definitions and constants for the card system
 */

import { 
  ExtendedStandardCard, 
  ImportData, 
  ImportResult,
  CustomCardStats,
  BatchStats
} from '../card-types';

// Import CardType and CardSource to be re-exported
import { CardType, CardSource } from '../card-types';

// Type definitions (moved from deleted card-storage.ts)
export interface CustomCardIndex {
  batches: Record<string, {
    id: string;
    name: string;
    fileName: string;
    importTime: string;
    version?: string;
    cardCount: number;
    cardTypes: string[];
    size: number;
    isSystemBatch?: boolean;
    disabled?: boolean;
  }>;
  totalCards: number;
  totalBatches: number;
  lastUpdate: string;
}

export interface BatchData {
  metadata: {
    id: string;
    name: string;
    fileName: string;
    importTime: string;
    version?: string;
    description?: string;
    author?: string;
  };
  cards: ExtendedStandardCard[];
  customFieldDefinitions?: CustomFieldsForBatch;
  variantTypes?: VariantTypesForBatch;
}

export interface CustomFieldNamesStore {
  [category: string]: string[];
}

export interface VariantTypesForBatch {
  [typeId: string]: {
    description?: string;
    subclasses?: string[];
    levelRange?: [number, number];
  };
}

export interface CustomFieldsForBatch {
  [category: string]: string[];
}

export interface StorageStats {
  totalSize: number;
  indexSize: number;
  batchesSize: number;
  configSize: number;
  availableSpace: number;
}

export interface IntegrityReport {
  isValid: boolean;
  issues: string[];
  orphanedKeys: string[];
  missingBatches: string[];
  corruptedBatches: string[];
}

export interface CleanupReport {
  removedKeys: string[];
  errors: string[];
  freedSpace: number;
}

// Storage configuration
export interface StorageConfig {
  maxBatches: number;
  maxStorageSize: number;
  autoCleanup: boolean;
  compressionEnabled: boolean;
}

// Batch info for internal management
export interface BatchInfo {
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
  // 只存储卡牌ID引用，不存储完整的卡牌数据
  cardIds: string[];
  customFieldDefinitions?: CustomFieldsForBatch;
  variantTypes?: VariantTypesForBatch;
}

// Main store state
export interface UnifiedCardState {
  // Core data
  cards: Map<string, ExtendedStandardCard>;
  batches: Map<string, BatchInfo>;
  
  // 按类型预构建的卡牌ID Map，包含所有卡牌ID（不管启用禁用状态）
  cardsByType: Map<CardType, string[]>;
  
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
export interface UnifiedCardActions {
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
  toggleBatchDisabled: (batchId: string) => Promise<boolean>;
  getBatchDisabledStatus: (batchId: string) => boolean;
  
  // Legacy compatibility methods
  ensureInitialized: () => Promise<void>;
  forceReinitialize: () => Promise<void>;
  
  // Utilities
  getBatchName: (batchId: string) => string | null;
  generateBatchId: () => string;
  invalidateCache: () => void;
  
  // Internal helpers
  _rebuildCardsByType: () => void;
  _addCardToTypeMap: (card: ExtendedStandardCard) => void;
  _removeCardFromTypeMap: (card: ExtendedStandardCard) => void;
  _recomputeAggregations: () => void;
  _syncToLocalStorage: () => void;
  _loadFromLocalStorage: () => void;
  _seedBuiltinCards: () => Promise<void>;
  _migrateLegacyData: () => Promise<any>;
  _computeStats: () => CustomCardStats;
  _importBuiltinCards: (jsonCardPack: any, previousDisabledStatus?: boolean) => Promise<void>;
  _convertImportData: (importData: ImportData) => Promise<{ success: boolean; cards: ExtendedStandardCard[]; errors?: string[] }>;
  _validateImportData: (importData: ImportData) => { isValid: boolean; errors: string[] };
}

export type UnifiedCardStore = UnifiedCardState & UnifiedCardActions;

// Storage keys (maintain compatibility with existing localStorage structure)
export const STORAGE_KEYS = {
  INDEX: 'daggerheart_custom_cards_index',
  BATCH_PREFIX: 'daggerheart_custom_cards_batch_',
  CONFIG: 'daggerheart_custom_cards_config',
} as const;

// Default configuration
export const DEFAULT_CONFIG: StorageConfig = {
  maxBatches: 50,
  maxStorageSize: 5 * 1024 * 1024, // 5MB
  autoCleanup: true,
  compressionEnabled: false
};

// Builtin batch ID
export const BUILTIN_BATCH_ID = "SYSTEM_BUILTIN_CARDS";

// Helper function to check if we're on the server
export const isServer = typeof window === 'undefined';

// Re-export types for compatibility
export type {
  ExtendedStandardCard,
  ImportData,
  ImportResult,
  CustomCardStats,
  BatchStats
};

// Re-export enums as values
export { CardType, CardSource } from '../card-types';