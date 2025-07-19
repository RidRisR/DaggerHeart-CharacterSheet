/**
 * Card System Entry Point
 * Unified implementation
 */

console.log('[Card System] 🚀 Using UNIFIED card system implementation (default)');

// Re-export everything from unified implementation
export * from './index-unified';

// Export types
export type {
  StandardCard,
  ExtendedStandardCard,
  ImportData,
  ImportResult,
  CustomCardStats,
  BatchStats
} from './card-types';