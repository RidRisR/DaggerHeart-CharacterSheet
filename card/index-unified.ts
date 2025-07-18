/**
 * Unified Card System API - Complete replacement implementation
 * This file provides the same API as the original index.ts but uses the new Zustand store
 */

import { useUnifiedCardStore } from './stores/unified-card-store';
import { 
  ExtendedStandardCard, 
  CardType, 
  CardSource, 
  ImportData, 
  ImportResult,
  CustomCardStats,
  BatchStats
} from './card-types';

// Re-export types for compatibility
export {
  CardType,
  CardSource,
  ALL_CARD_TYPES,
  CARD_LEVEL_OPTIONS,
  getCardClassOptions as CARD_CLASS_OPTIONS
} from './card-types';

export type {
  ImportData,
  ImportResult,
  ExtendedStandardCard,
  StandardCard
} from './card-types';

// Re-export UI configuration functions
export {
  getCardClassOptionsByType as CARD_CLASS_OPTIONS_BY_TYPE,
  getCardClassOptionsByType,
  getCardTypeName,
  getLevelOptions,
  getVariantSubclassOptions,
  getAvailableVariantTypes,
  getVariantLevelOptions,
} from './card-ui-config';

// Re-export variant type functions
export {
  getVariantTypeName,
  getVariantTypeNames,
  getVariantTypes,
  getVariantSubclasses,
  hasVariantType,
} from './card-predefined-field';

// Re-export card converter
export { convertToStandardCard } from './card-converter';

// ===== Main Card Data Functions =====

/**
 * Get all cards (builtin + custom) with builtin cards if system is not initialized
 */
export function getBuiltinStandardCards(): ExtendedStandardCard[] {
  const store = useUnifiedCardStore.getState();
  if (!store.initialized) {
    console.warn('[Unified Card System] System not initialized, returning empty array');
    return [];
  }
  
  return store.loadAllCards().filter(card => card.source === CardSource.BUILTIN);
}

/**
 * Get all cards (builtin + custom) - async version ensuring system initialization
 */
export async function getAllStandardCardsAsync(): Promise<ExtendedStandardCard[]> {
  const store = useUnifiedCardStore.getState();
  
  // Ensure system is initialized
  if (!store.initialized) {
    const result = await store.initializeSystem();
    if (!result.initialized) {
      console.error('[Unified Card System] Failed to initialize system');
      return [];
    }
  }
  
  const allCards = store.loadAllCards();
  
  // Add batchName for custom cards (same as original implementation)
  const cardsWithBatchNames = allCards.map(card => {
    if (card.source === CardSource.CUSTOM && card.batchId) {
      const batchName = store.getBatchName(card.batchId);
      return { ...card, batchName: batchName || undefined };
    }
    return card;
  });
  
  console.log(`[Unified Card System] Loaded ${cardsWithBatchNames.length} cards`);
  return cardsWithBatchNames;
}

/**
 * Get cards by type - async version ensuring system initialization
 */
export async function getStandardCardsByTypeAsync(typeId: CardType): Promise<ExtendedStandardCard[]> {
  const store = useUnifiedCardStore.getState();
  
  // Ensure system is initialized
  if (!store.initialized) {
    const result = await store.initializeSystem();
    if (!result.initialized) {
      console.error('[Unified Card System] Failed to initialize system');
      return [];
    }
  }
  
  const cards = store.loadCardsByType(typeId);
  
  // Add batchName for custom cards
  const cardsWithBatchNames = cards.map(card => {
    if (card.source === CardSource.CUSTOM && card.batchId) {
      const batchName = store.getBatchName(card.batchId);
      return { ...card, batchName: batchName || undefined };
    }
    return card;
  });
  
  console.log(`[Unified Card System] Loaded ${cardsWithBatchNames.length} cards of type ${typeId}`);
  return cardsWithBatchNames;
}

// ===== Custom Card Management Functions =====

/**
 * Get all custom cards
 */
export function getCustomCards(): ExtendedStandardCard[] {
  const store = useUnifiedCardStore.getState();
  return store.loadAllCards().filter(card => card.source === CardSource.CUSTOM);
}

/**
 * Get custom cards by type
 */
export function getCustomCardsByType(typeId: CardType): ExtendedStandardCard[] {
  const store = useUnifiedCardStore.getState();
  return store.loadCardsByType(typeId).filter(card => card.source === CardSource.CUSTOM);
}

/**
 * Import custom cards
 */
export async function importCustomCards(importData: ImportData, batchName?: string): Promise<ImportResult> {
  const store = useUnifiedCardStore.getState();
  
  // Ensure system is initialized
  if (!store.initialized) {
    const result = await store.initializeSystem();
    if (!result.initialized) {
      throw new Error('Failed to initialize card system');
    }
  }
  
  return store.importCards(importData, batchName);
}

/**
 * Get all custom card batches
 */
export function getCustomCardBatches(): any[] {
  const store = useUnifiedCardStore.getState();
  return store.getAllBatches().filter((batch: any) => !batch.isSystemBatch);
}

/**
 * Remove a custom card batch
 */
export function removeCustomCardBatch(batchId: string): boolean {
  const store = useUnifiedCardStore.getState();
  return store.removeBatch(batchId);
}

/**
 * Get custom card statistics
 */
export function getCustomCardStats(): CustomCardStats {
  const store = useUnifiedCardStore.getState();
  return store.getStats();
}

/**
 * Clear all custom cards
 */
export function clearAllCustomCards(): void {
  const store = useUnifiedCardStore.getState();
  store.clearAllCustomCards();
}

/**
 * Get storage usage information
 */
export function getCustomCardStorageInfo() {
  const store = useUnifiedCardStore.getState();
  return store.getStorageInfo();
}

/**
 * Refresh custom cards (invalidate cache and reload)
 */
export function refreshCustomCards(): void {
  const store = useUnifiedCardStore.getState();
  store.reloadCustomCards();
  console.log('[Unified Card System] Custom cards refreshed');
}

/**
 * Get batch name by ID
 */
export const getBatchName = (batchId: string): string | null => {
  const store = useUnifiedCardStore.getState();
  return store.getBatchName(batchId);
};

/**
 * Toggle batch disabled status
 */
export const toggleBatchDisabled = async (batchId: string): Promise<boolean> => {
  const store = useUnifiedCardStore.getState();
  return store.toggleBatchDisabled(batchId);
};

/**
 * Get batch disabled status
 */
export const getBatchDisabledStatus = (batchId: string): boolean => {
  const store = useUnifiedCardStore.getState();
  return store.getBatchDisabledStatus(batchId);
};

/**
 * Get all batches with status information
 */
export const getAllBatches = () => {
  const store = useUnifiedCardStore.getState();
  return store.getAllBatches();
};

/**
 * Initialize the card system (compatibility function)
 */
export const initializeCardSystem = async (): Promise<void> => {
  const store = useUnifiedCardStore.getState();
  if (!store.initialized) {
    await store.initializeSystem();
  }
};

/**
 * Force reinitialize the card system
 */
export const reinitializeCardSystem = async (): Promise<void> => {
  const store = useUnifiedCardStore.getState();
  await store.initializeSystem();
};

// ===== Compatibility Layer for CustomCardManager =====

/**
 * Compatibility layer that provides the same interface as CustomCardManager
 */
const createCustomCardManagerCompatibility = () => {
  const getInstance = () => ({
    // Core data methods
    getAllCards: (): ExtendedStandardCard[] => {
      const store = useUnifiedCardStore.getState();
      return store.loadAllCards();
    },
    
    getAllCardsByType: (typeId: CardType): ExtendedStandardCard[] => {
      const store = useUnifiedCardStore.getState();
      return store.loadCardsByType(typeId);
    },
    
    getCustomCards: (): ExtendedStandardCard[] => {
      const store = useUnifiedCardStore.getState();
      return store.loadAllCards().filter(card => card.source === CardSource.CUSTOM);
    },
    
    getCustomCardsByType: (typeId: CardType): ExtendedStandardCard[] => {
      const store = useUnifiedCardStore.getState();
      return store.loadCardsByType(typeId).filter(card => card.source === CardSource.CUSTOM);
    },
    
    // System methods
    ensureInitialized: async (): Promise<void> => {
      const store = useUnifiedCardStore.getState();
      if (!store.initialized) {
        const result = await store.initializeSystem();
        if (!result.initialized) {
          throw new Error('Failed to initialize card system');
        }
      }
    },
    
    tryGetAllCards: (): ExtendedStandardCard[] | null => {
      const store = useUnifiedCardStore.getState();
      return store.initialized ? store.loadAllCards() : null;
    },
    
    // Batch management
    importCards: async (importData: ImportData, batchName?: string): Promise<ImportResult> => {
      const store = useUnifiedCardStore.getState();
      return store.importCards(importData, batchName);
    },
    
    getAllBatches: () => {
      const store = useUnifiedCardStore.getState();
      return store.getAllBatches();
    },
    
    removeBatch: (batchId: string): boolean => {
      const store = useUnifiedCardStore.getState();
      return store.removeBatch(batchId);
    },
    
    getBatchName: (batchId: string): string | null => {
      const store = useUnifiedCardStore.getState();
      return store.getBatchName(batchId);
    },
    
    // Statistics and storage
    getStats: (): CustomCardStats => {
      const store = useUnifiedCardStore.getState();
      return store.getStats();
    },
    
    getStorageInfo: () => {
      const store = useUnifiedCardStore.getState();
      return store.getStorageInfo();
    },
    
    clearAllCustomCards: (): void => {
      const store = useUnifiedCardStore.getState();
      store.clearAllCustomCards();
    },
    
    // Type registration (compatibility - not used in new system)
    registerCardType: (_typeId: string, _config: any): void => {
      console.log('[Unified Card System] registerCardType called (compatibility mode)');
    },
    
    // Cache management
    reloadCustomCards: (): void => {
      const store = useUnifiedCardStore.getState();
      store.reloadCustomCards();
    }
  });
  
  // Static methods for compatibility
  const staticMethods = {
    getInstance,
    
    // Direct static access to common methods
    initialize: async () => {
      const store = useUnifiedCardStore.getState();
      return store.initializeSystem();
    },
    
    generateBatchId: (): string => {
      const store = useUnifiedCardStore.getState();
      return store.generateBatchId();
    },
    
    getAggregatedCustomFieldNames: () => {
      const store = useUnifiedCardStore.getState();
      return store.getAggregatedCustomFields();
    },
    
    getAggregatedVariantTypes: () => {
      const store = useUnifiedCardStore.getState();
      return store.getAggregatedVariantTypes();
    },
    
    checkStorageSpace: (requiredSize: number): boolean => {
      const store = useUnifiedCardStore.getState();
      return store.checkStorageSpace(requiredSize);
    },
    
    getFormattedStorageInfo: () => {
      const store = useUnifiedCardStore.getState();
      return store.getStorageInfo();
    },
    
    saveBatch: (_batchId: string, _data: any): void => {
      console.warn('[Unified Card System] saveBatch called - not implemented in compatibility mode');
    },
    
    loadIndex: () => {
      const store = useUnifiedCardStore.getState();
      return store.index;
    },
    
    saveIndex: (_index: any): void => {
      console.warn('[Unified Card System] saveIndex called - handled automatically');
    },
    
    removeBatch: (batchId: string): void => {
      const store = useUnifiedCardStore.getState();
      store.removeBatch(batchId);
    },
    
    loadBatch: (_batchId: string) => {
      console.warn('[Unified Card System] loadBatch called - not implemented in compatibility mode');
      return null;
    },
    
    updateBatchCustomFields: (batchId: string, definitions: any): void => {
      const store = useUnifiedCardStore.getState();
      store.updateBatchCustomFields(batchId, definitions);
    },
    
    updateBatchVariantTypes: (batchId: string, types: any): void => {
      const store = useUnifiedCardStore.getState();
      store.updateBatchVariantTypes(batchId, types);
    },
    
    validateIntegrity: () => {
      const store = useUnifiedCardStore.getState();
      return store.validateIntegrity();
    },
    
    cleanupOrphanedData: () => {
      const store = useUnifiedCardStore.getState();
      return store.cleanupOrphanedData();
    },
    
    calculateStorageUsage: () => {
      const store = useUnifiedCardStore.getState();
      return store.calculateStorageUsage();
    },
    
    clearAllData: (): void => {
      const store = useUnifiedCardStore.getState();
      store.clearAllCustomCards();
    }
  };
  
  return Object.assign(getInstance, staticMethods);
};

// Create the compatibility layer instance
const customCardManagerInstance = createCustomCardManagerCompatibility();

// Add ensureInitialized directly to the top level for compatibility
(customCardManagerInstance as any).ensureInitialized = async (): Promise<void> => {
  const store = useUnifiedCardStore.getState();
  if (!store.initialized) {
    const result = await store.initializeSystem();
    if (!result.initialized) {
      throw new Error('Failed to initialize card system');
    }
  }
};

// Export the compatibility layer
export const customCardManager = customCardManagerInstance as any;
export const CustomCardManager = customCardManagerInstance as any;

// For backward compatibility
export const builtinCardManager = customCardManager;

// Export the CustomCardStorage compatibility (simplified)
export const CustomCardStorage = {
  initialize: () => {
    const store = useUnifiedCardStore.getState();
    return store.initializeSystem();
  },
  
  generateBatchId: (): string => {
    const store = useUnifiedCardStore.getState();
    return store.generateBatchId();
  },
  
  getAggregatedCustomFieldNames: () => {
    const store = useUnifiedCardStore.getState();
    return store.getAggregatedCustomFields();
  },
  
  getAggregatedVariantTypes: () => {
    const store = useUnifiedCardStore.getState();
    return store.getAggregatedVariantTypes();
  },
  
  checkStorageSpace: (requiredSize: number): boolean => {
    const store = useUnifiedCardStore.getState();
    return store.checkStorageSpace(requiredSize);
  },
  
  getFormattedStorageInfo: () => {
    const store = useUnifiedCardStore.getState();
    return store.getStorageInfo();
  },
  
  loadIndex: () => {
    const store = useUnifiedCardStore.getState();
    return store.index;
  },
  
  saveIndex: (_index: any): void => {
    console.warn('[Unified Card System] saveIndex called - handled automatically');
  },
  
  saveBatch: (_batchId: string, _data: any): void => {
    console.warn('[Unified Card System] saveBatch called - not implemented');
  },
  
  loadBatch: (_batchId: string) => {
    console.warn('[Unified Card System] loadBatch called - not implemented');
    return null;
  },
  
  removeBatch: (batchId: string): void => {
    const store = useUnifiedCardStore.getState();
    store.removeBatch(batchId);
  },
  
  updateBatchCustomFields: (batchId: string, definitions: any): void => {
    const store = useUnifiedCardStore.getState();
    store.updateBatchCustomFields(batchId, definitions);
  },
  
  updateBatchVariantTypes: (batchId: string, types: any): void => {
    const store = useUnifiedCardStore.getState();
    store.updateBatchVariantTypes(batchId, types);
  },
  
  validateIntegrity: () => {
    const store = useUnifiedCardStore.getState();
    return store.validateIntegrity();
  },
  
  cleanupOrphanedData: () => {
    const store = useUnifiedCardStore.getState();
    return store.cleanupOrphanedData();
  },
  
  calculateStorageUsage: () => {
    const store = useUnifiedCardStore.getState();
    return store.calculateStorageUsage();
  },
  
  clearAllData: (): void => {
    const store = useUnifiedCardStore.getState();
    store.clearAllCustomCards();
  }
};

// Register card types (for compatibility)
console.log('[Unified Card System] All converters registered, waiting for client initialization...');

// Export store for direct access if needed
export { useUnifiedCardStore };

// Export hooks for React components
export {
  useCards,
  useBatches,
  useCardStats,
  useCardSystem
} from './stores/unified-card-store';