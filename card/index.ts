/**
 * Card System Entry Point
 * Unified implementation is now the default
 */

import { shouldUseUnifiedCardSystem } from './feature-flags';

// Default to unified system
console.log('[Card System] 🚀 Using UNIFIED card system implementation (default)');

// Re-export everything from unified implementation
export * from './index-unified';

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

// Note: Legacy system has been removed. The unified system is now the only implementation.
// Feature flags are kept for debugging purposes only.
if (!shouldUseUnifiedCardSystem()) {
  console.warn('[Card System] 💡 Legacy system has been removed. Using unified system regardless of flag.');
}