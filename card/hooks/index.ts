/**
 * Card Store Compatibility Layer
 * Provides backward-compatible hooks that wrap the unified card store
 */

import { useMemo, useCallback } from 'react';
import { useUnifiedCardStore } from '../stores/unified-card-store';
import { CardType, type ExtendedStandardCard } from '../card-types';

// Interface for useAllCards hook (maintains exact compatibility)
interface UseAllCardsResult {
  cards: ExtendedStandardCard[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  fetchAllCards: () => Promise<void>;
  clearError: () => void;
}

// Interface for useCardsByType hook (maintains exact compatibility)  
interface UseCardsByTypeResult {
  cards: ExtendedStandardCard[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  fetchCardsByType: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for fetching all cards - backward compatible with old card-store
 */
export const useAllCards = (): UseAllCardsResult => {
  const store = useUnifiedCardStore();
  
  const cards = useMemo(() => {
    if (!store.initialized) return [];
    return store.loadAllCards();
  }, [store.initialized, store.cards, store.batches]);
  
  const fetchAllCards = useCallback(async () => {
    if (!store.initialized) {
      await store.initializeSystem();
    }
    // Note: Unified store auto-loads, but we maintain the interface
  }, [store.initialized, store.initializeSystem]);
  
  const clearError = useCallback(() => {
    // In unified store, errors are managed differently
    // This is a no-op for compatibility
  }, []);
  
  return {
    cards,
    loading: store.loading,
    error: store.error,
    initialized: store.initialized,
    fetchAllCards,
    clearError,
  };
};

/**
 * Hook for fetching cards by type - backward compatible with old card-store
 */
export const useCardsByType = (type: CardType): UseCardsByTypeResult => {
  const store = useUnifiedCardStore();
  
  const cards = useMemo(() => {
    if (!store.initialized) return [];
    return store.loadCardsByType(type);
  }, [store.initialized, store.cards, store.batches, type]);
  
  const fetchCardsByType = useCallback(async () => {
    if (!store.initialized) {
      await store.initializeSystem();
    }
    // Note: Unified store auto-loads all cards, filtering by type is done in loadCardsByType
  }, [store.initialized, store.initializeSystem]);
  
  const clearError = useCallback(() => {
    // In unified store, errors are managed differently
    // This is a no-op for compatibility
  }, []);
  
  return {
    cards,
    loading: store.loading,
    error: store.error,
    initialized: store.initialized,
    fetchCardsByType,
    clearError,
  };
};

/**
 * Direct access to the unified card store
 * This replaces the old useCardStore export
 */
export const useCardStore = useUnifiedCardStore;

/**
 * Re-export the store instance for direct access if needed
 */
export { useUnifiedCardStore };