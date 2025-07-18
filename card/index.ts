/**
 * Card System Migration Entry Point
 * This file conditionally exports either the legacy or unified implementation
 * based on feature flags, enabling gradual rollout with zero breaking changes
 */

import { shouldUseUnifiedCardSystem } from './feature-flags';

// Check which implementation to use at runtime
const USE_UNIFIED_SYSTEM = shouldUseUnifiedCardSystem();

// Load the appropriate implementation
let implementation: any;

if (USE_UNIFIED_SYSTEM) {
  console.log('[Card System] 🚀 Using UNIFIED card system implementation');
  implementation = require('./index-unified');
} else {
  console.log('[Card System] 🔙 Using LEGACY card system implementation');
  implementation = require('./index-legacy');
}

// Re-export all functions from the chosen implementation
export const {
  // Main card data functions
  getBuiltinStandardCards,
  getAllStandardCardsAsync,
  getStandardCardsByTypeAsync,
  
  // Custom card management
  getCustomCards,
  getCustomCardsByType,
  importCustomCards,
  getCustomCardBatches,
  removeCustomCardBatch,
  getCustomCardStats,
  clearAllCustomCards,
  getCustomCardStorageInfo,
  refreshCustomCards,
  getBatchName,
  
  // Manager instances
  customCardManager,
  CustomCardManager,
  builtinCardManager,
  CustomCardStorage,
  
  // Types and constants
  CardType,
  CardSource,
  ALL_CARD_TYPES,
  CARD_CLASS_OPTIONS,
  CARD_LEVEL_OPTIONS,
  CARD_CLASS_OPTIONS_BY_TYPE,
  getCardTypeName,
  getLevelOptions,
  convertToStandardCard,
  
  // Unified system specific (if available)
  useUnifiedCardStore,
  useCards,
  useBatches,
  useCardStats,
  useCardSystem
} = implementation;

// Always export feature flag utilities for debugging
export { 
  getFeatureFlags, 
  enableUnifiedCardSystem, 
  disableUnifiedCardSystem,
  shouldUseUnifiedCardSystem 
} from './feature-flags';

// Export types (same for both implementations)
export type {
  StandardCard,
  ExtendedStandardCard,
  ImportData,
  ImportResult,
  CustomCardStats,
  BatchStats
} from './card-types';