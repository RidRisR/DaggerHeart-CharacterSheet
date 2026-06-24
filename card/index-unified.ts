/**
 * Unified Card System API - Complete replacement implementation
 * This file provides the same API as the original index.ts but uses the new Zustand store
 */

import { useUnifiedCardStore } from './stores/unified-card-store';
import { createCardObjectSource } from './import/source';
import { getDefaultCardPackApplicationService } from './packs/default-card-pack-services';
import { CARD_BUILTIN_SOURCE_ID } from './runtime/source-types';
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
  getCardClassOptionsForType,  // 🚀 新增：按需计算单个类型的选项
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
export { convertToStandardCard, convertToStandardCardAsync } from './card-converter';

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
 * Get cards by type - synchronous version (use when system is guaranteed to be initialized)
 */
export function getStandardCardsByType(typeId: CardType): ExtendedStandardCard[] {
  const store = useUnifiedCardStore.getState();
  
  if (!store.initialized) {
    console.warn('[Unified Card System] System not initialized, returning empty array. Use getStandardCardsByTypeAsync() for automatic initialization.');
    return [];
  }
  
  const cards = store.loadCardsByType(typeId);
  
  // Add batchName for custom cards
  return cards.map(card => {
    if (card.source === CardSource.CUSTOM && card.batchId) {
      const batchName = store.getBatchName(card.batchId);
      return { ...card, batchName: batchName || undefined };
    }
    return card;
  });
}

/**
 * Get a specific card by ID - O(1) lookup
 */
export function getStandardCardById(cardId: string): ExtendedStandardCard | null {
  const store = useUnifiedCardStore.getState();
  
  if (!store.initialized) {
    console.warn('[Unified Card System] System not initialized, returning null. Use async version for automatic initialization.');
    return null;
  }
  
  const card = store.getCardById(cardId);
  if (!card) return null;
  
  // Add batchName for custom cards
  if (card.source === CardSource.CUSTOM && card.batchId) {
    const batchName = store.getBatchName(card.batchId);
    return { ...card, batchName: batchName || undefined };
  }
  
  return card;
}

/**
 * Get cards by type - async version ensuring system initialization (legacy support)
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
  
  return getStandardCardsByType(typeId);
}

/**
 * Get a specific card by ID - async version ensuring system initialization (legacy support)
 */
export async function getStandardCardByIdAsync(cardId: string): Promise<ExtendedStandardCard | null> {
  const store = useUnifiedCardStore.getState();
  
  // Ensure system is initialized
  if (!store.initialized) {
    const result = await store.initializeSystem();
    if (!result.initialized) {
      console.error('[Unified Card System] Failed to initialize system');
      return null;
    }
  }
  
  return getStandardCardById(cardId);
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
 * Get cards by batch ID
 * @param batchId - The batch ID to filter by
 * @returns Array of cards belonging to the specified batch
 */
export function getCardsByBatchId(batchId: string): ExtendedStandardCard[] {
  const store = useUnifiedCardStore.getState();
  return store.loadAllCards().filter(card => card.batchId === batchId);
}

/**
 * Import custom cards
 */
export async function importCustomCards(importData: ImportData, batchName?: string): Promise<ImportResult> {
  const service = await getDefaultCardPackApplicationService();
  const result = await service.importFromSource(
    createCardObjectSource(importData, batchName ?? 'Imported Cards'),
    { mode: 'commit' },
  );

  if (!result.success) {
    return {
      success: false,
      imported: 0,
      errors: result.diagnostics.map((diagnostic) => diagnostic.message),
      batchId: '',
    };
  }

  return {
    success: true,
    imported: result.summary.cardCount,
    errors: [],
    batchId: result.summary.packId ?? '',
  };
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
export async function removeCustomCardBatch(batchId: string): Promise<boolean> {
  try {
    const service = await getDefaultCardPackApplicationService();
    const result = await service.removePack(batchId);
    return result.success;
  } catch (error) {
    console.error('[Unified Card System] Failed to remove custom card batch:', error);
    return false;
  }
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
export async function clearAllCustomCards(): Promise<void> {
  const store = useUnifiedCardStore.getState();
  await store.clearAllCustomCards();
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
  try {
    if (batchId === CARD_BUILTIN_SOURCE_ID) {
      const store = useUnifiedCardStore.getState();
      if (!store.initialized) {
        const result = await store.initializeSystem();
        if (!result.initialized) return false;
      }
      return store.toggleBatchDisabled(batchId);
    }

    const service = await getDefaultCardPackApplicationService();
    const snapshot = await service.loadSnapshot();
    const entry = snapshot.packs.get(batchId);
    if (!entry) return false;

    const result = await service.setPackDisabled(batchId, !entry.disabled);
    return result.success;
  } catch (error) {
    console.error('[Unified Card System] Failed to toggle custom card batch disabled state:', error);
    return false;
  }
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

// ===== Store and Hooks =====

console.log('[Unified Card System] System loaded, waiting for client initialization...');

// Export store for direct access
export { useUnifiedCardStore };

// Export hooks for React components
export {
  useCards,
  useBatches,
  useCardStats,
  useCardSystem,
  useCardById
} from './stores/unified-card-store';

// Export .dhcb import functionality
export {
  importDhcbCardPackage,
  type DhcbImportResult
} from './utils/dhcb-importer';
