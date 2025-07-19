/**
 * Unified Card Store - Main Entry Point
 * This file creates the Zustand store and exports the main API
 */

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { useMemo } from 'react';
import {
  UnifiedCardStore,
  DEFAULT_CONFIG,
  ExtendedStandardCard
} from './store-types';
import { createStoreActions } from './store-actions';

// Create the unified store
export const useUnifiedCardStore = create<UnifiedCardStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
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
        config: DEFAULT_CONFIG,
        stats: null,

        // Actions (created from store-actions.ts)
        ...createStoreActions(set, get)
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

/**
 * Hook for getting a specific card by ID - optimized lookup with memoization
 */
export const useCardById = (cardId: string): ExtendedStandardCard | null => {
  const store = useUnifiedCardStore();
  
  return useMemo(() => {
    if (!store.initialized || !cardId) return null;
    return store.getCardById(cardId);
  }, [store.initialized, store.cards, store.batches, cardId]);
};

/**
 * Direct access to the unified card store
 * Use this for all card operations
 */
export const useCardStore = useUnifiedCardStore;

// Re-export types for external use
export type {
  UnifiedCardStore,
  UnifiedCardState,
  ExtendedStandardCard,
  ImportData,
  ImportResult,
  CustomCardStats,
  BatchStats,
  CustomFieldsForBatch,
  CustomFieldNamesStore,
  VariantTypesForBatch
} from './store-types';

// Re-export enums as values
export { CardType, CardSource } from './store-types';

// Re-export commonly used constants
export {
  STORAGE_KEYS,
  DEFAULT_CONFIG,
  BUILTIN_BATCH_ID,
  isServer
} from './store-types';