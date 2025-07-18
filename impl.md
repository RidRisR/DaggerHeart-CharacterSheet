# Zustand Card Storage Implementation Plan

## Complete Interface Analysis

### Verified CustomCardStorage Methods Used by CustomCardManager

After thorough analysis, the complete list of static methods is:

1. `initialize()` - Initialize storage system and handle migration
2. `generateBatchId()` - Generate unique batch identifier  
3. `getAggregatedCustomFieldNames()` - Get aggregated custom field names across all batches
4. `getAggregatedVariantTypes()` - Get aggregated variant types across all batches
5. `checkStorageSpace(requiredSize)` - Check if enough storage space available
6. `getFormattedStorageInfo()` - Get formatted storage usage information
7. `saveBatch(batchId, data)` - Save batch data to storage
8. `loadIndex()` - Load card index from storage
9. `saveIndex(index)` - Save card index to storage
10. `removeBatch(batchId)` - Remove batch data from storage
11. `loadBatch(batchId)` - Load specific batch data
12. `updateBatchCustomFields(batchId, definitions)` - Update custom field definitions for a batch
13. `updateBatchVariantTypes(batchId, types)` - Update variant types for a batch
14. `validateIntegrity()` - Validate storage data integrity
15. `cleanupOrphanedData()` - Clean up orphaned storage data
16. `calculateStorageUsage()` - Calculate current storage usage statistics
17. `clearAllData()` - Clear all storage data

### CardStorageCache Methods Used

- `invalidateAll()` - Invalidate all cache entries (called twice in CustomCardManager)

## Type Definitions Required

```typescript
// Core interfaces (from card-storage.ts)
interface CustomCardIndex {
  batches: Record<string, ImportBatch>;
  totalCards: number;
  totalBatches: number;
  lastUpdate: string;
}

interface BatchBase {
  id: string;
  name?: string;
  fileName: string;
  importTime: string;
  version?: string;
  description?: string;
  author?: string;
}

interface ImportBatch extends BatchBase {
  name: string;
  cardCount: number;
  cardTypes: string[];
  size: number;
  isSystemBatch?: boolean;
  disabled?: boolean;
}

interface BatchData {
  metadata: BatchBase;
  cards: any[];
  customFieldDefinitions?: CustomFieldsForBatch;
  variantTypes?: VariantTypesForBatch;
}

interface StorageConfig {
  maxBatches: number;
  maxStorageSize: number;
  autoCleanup: boolean;
  compressionEnabled: boolean;
}

interface CustomFieldNamesStore {
  [category: string]: string[];
}

interface CustomFieldsForBatch {
  [category: string]: string[];
}

interface VariantTypesForBatch {
  [typeId: string]: any;
}

interface StorageStats {
  totalSize: number;
  indexSize: number;
  batchesSize: number;
  configSize: number;
  availableSpace: number;
  usagePercentage: number;
}

interface IntegrityReport {
  isValid: boolean;
  issues: string[];
  orphanedKeys: string[];
  missingBatches?: string[];
}

interface CleanupReport {
  removedKeys: string[];
  errors: string[];
  cleanedSize?: number;
  freedSpace?: number;
}

// Initialization result
interface InitializeResult {
  initialized: boolean;
  migrationResult?: {
    migrated: boolean;
    migratedBatches: number;
    errors: string[];
  };
}

// Formatted storage info
interface FormattedStorageInfo {
  used: string;
  available: string;
  total: string;
  percentage: number;
}
```

## Zustand Store Implementation Plan

### Phase 1: Core Store Structure

```typescript
// card-storage-zustand.ts
import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';

interface CardStorageState {
  // Core data
  index: CustomCardIndex;
  batches: Map<string, BatchData>;
  
  // Cache state
  aggregatedCustomFields: CustomFieldNamesStore | null;
  aggregatedVariantTypes: VariantTypesForBatch | null;
  cacheValid: boolean;
  
  // System state
  initialized: boolean;
  config: StorageConfig;
  
  // Statistics
  storageStats: StorageStats | null;
}

interface CardStorageActions {
  // Initialization
  initialize: () => InitializeResult;
  
  // Index management
  loadIndex: () => CustomCardIndex;
  saveIndex: (index: CustomCardIndex) => void;
  
  // Batch management
  saveBatch: (batchId: string, data: BatchData) => void;
  loadBatch: (batchId: string) => BatchData | null;
  removeBatch: (batchId: string) => void;
  
  // Aggregated data (with caching)
  getAggregatedCustomFieldNames: () => CustomFieldNamesStore;
  getAggregatedVariantTypes: () => VariantTypesForBatch;
  
  // Storage management
  checkStorageSpace: (requiredSize: number) => boolean;
  getFormattedStorageInfo: () => FormattedStorageInfo;
  calculateStorageUsage: () => StorageStats;
  
  // Data integrity
  validateIntegrity: () => IntegrityReport;
  cleanupOrphanedData: () => CleanupReport;
  
  // Batch updates
  updateBatchCustomFields: (batchId: string, definitions: CustomFieldsForBatch) => void;
  updateBatchVariantTypes: (batchId: string, types: VariantTypesForBatch) => void;
  
  // System operations
  clearAllData: () => void;
  generateBatchId: () => string;
  
  // Cache management
  invalidateCache: () => void;
  
  // Internal helpers
  _recomputeAggregations: () => void;
  _syncToLocalStorage: () => void;
  _loadFromLocalStorage: () => void;
}

type CardStorageStore = CardStorageState & CardStorageActions;
```

### Phase 2: Store Implementation

#### Step 1: Basic Store Creation

```typescript
const useCardStorageStore = create<CardStorageStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        index: {
          batches: {},
          totalCards: 0,
          totalBatches: 0,
          lastUpdate: new Date().toISOString()
        },
        batches: new Map(),
        aggregatedCustomFields: null,
        aggregatedVariantTypes: null,
        cacheValid: false,
        initialized: false,
        config: {
          maxBatches: 50,
          maxStorageSize: 5 * 1024 * 1024,
          autoCleanup: true,
          compressionEnabled: false
        },
        storageStats: null,

        // Actions implementation...
        initialize: () => {
          // Implementation details
        },
        
        // ... other methods
      }),
      {
        name: 'card-storage-state',
        // Custom storage implementation to maintain localStorage compatibility
        storage: {
          getItem: (name) => {
            // Load from existing localStorage structure
          },
          setItem: (name, value) => {
            // Save to existing localStorage structure
          },
          removeItem: (name) => {
            // Remove from localStorage
          }
        }
      }
    )
  )
);
```

#### Step 2: Static Method Wrapper

```typescript
// Create a static class that wraps the Zustand store
class ZustandCardStorage {
  private static store = useCardStorageStore;

  static initialize(): InitializeResult {
    return this.store.getState().initialize();
  }

  static generateBatchId(): string {
    return this.store.getState().generateBatchId();
  }

  static getAggregatedCustomFieldNames(): CustomFieldNamesStore {
    return this.store.getState().getAggregatedCustomFieldNames();
  }

  static getAggregatedVariantTypes(): VariantTypesForBatch {
    return this.store.getState().getAggregatedVariantTypes();
  }

  static checkStorageSpace(requiredSize: number): boolean {
    return this.store.getState().checkStorageSpace(requiredSize);
  }

  static getFormattedStorageInfo(): FormattedStorageInfo {
    return this.store.getState().getFormattedStorageInfo();
  }

  static saveBatch(batchId: string, data: BatchData): void {
    return this.store.getState().saveBatch(batchId, data);
  }

  static loadIndex(): CustomCardIndex {
    return this.store.getState().loadIndex();
  }

  static saveIndex(index: CustomCardIndex): void {
    return this.store.getState().saveIndex(index);
  }

  static removeBatch(batchId: string): void {
    return this.store.getState().removeBatch(batchId);
  }

  static loadBatch(batchId: string): BatchData | null {
    return this.store.getState().loadBatch(batchId);
  }

  static updateBatchCustomFields(batchId: string, definitions: CustomFieldsForBatch): void {
    return this.store.getState().updateBatchCustomFields(batchId, definitions);
  }

  static updateBatchVariantTypes(batchId: string, types: VariantTypesForBatch): void {
    return this.store.getState().updateBatchVariantTypes(batchId, types);
  }

  static validateIntegrity(): IntegrityReport {
    return this.store.getState().validateIntegrity();
  }

  static cleanupOrphanedData(): CleanupReport {
    return this.store.getState().cleanupOrphanedData();
  }

  static calculateStorageUsage(): StorageStats {
    return this.store.getState().calculateStorageUsage();
  }

  static clearAllData(): void {
    return this.store.getState().clearAllData();
  }
}
```

### Phase 3: Implementation Details

#### Smart Caching Strategy

```typescript
// Inside store actions
getAggregatedCustomFieldNames: () => {
  const state = get();
  
  // Return cached version if valid
  if (state.cacheValid && state.aggregatedCustomFields) {
    return state.aggregatedCustomFields;
  }
  
  // Recompute and cache
  const aggregated = computeAggregatedCustomFields(state.batches);
  set({ 
    aggregatedCustomFields: aggregated,
    cacheValid: true 
  });
  
  return aggregated;
},

// Cache invalidation on batch changes
saveBatch: (batchId, data) => {
  const state = get();
  const newBatches = new Map(state.batches);
  newBatches.set(batchId, data);
  
  set({
    batches: newBatches,
    cacheValid: false // Invalidate cache
  });
  
  // Sync to localStorage
  get()._syncToLocalStorage();
},
```

#### localStorage Compatibility

```typescript
// Maintain exact localStorage structure for compatibility
_syncToLocalStorage: () => {
  const state = get();
  
  // Save index
  localStorage.setItem(
    'daggerheart_custom_cards_index',
    JSON.stringify(state.index)
  );
  
  // Save batches individually
  for (const [batchId, batchData] of state.batches) {
    localStorage.setItem(
      `daggerheart_custom_cards_batch_${batchId}`,
      JSON.stringify(batchData)
    );
  }
},

_loadFromLocalStorage: () => {
  // Load existing data from localStorage
  const indexStr = localStorage.getItem('daggerheart_custom_cards_index');
  if (!indexStr) return;
  
  const index = JSON.parse(indexStr);
  const batches = new Map();
  
  // Load all batches
  for (const batchId of Object.keys(index.batches)) {
    const batchStr = localStorage.getItem(`daggerheart_custom_cards_batch_${batchId}`);
    if (batchStr) {
      batches.set(batchId, JSON.parse(batchStr));
    }
  }
  
  set({ index, batches, initialized: true });
},
```

### Phase 4: Migration Strategy

#### Step 1: Create Compatibility Layer

```typescript
// card-storage-migration.ts
import { ZustandCardStorage } from './card-storage-zustand';
import { CustomCardStorage as LegacyCardStorage } from './card-storage';

// Feature flag for gradual rollout
const USE_ZUSTAND_STORAGE = process.env.NODE_ENV === 'development' || 
                           localStorage.getItem('use_zustand_storage') === 'true';

export const CustomCardStorage = USE_ZUSTAND_STORAGE ? 
  ZustandCardStorage : 
  LegacyCardStorage;
```

#### Step 2: Testing Phase

1. **Unit Tests**: Test each method independently
2. **Integration Tests**: Test with CustomCardManager
3. **Performance Tests**: Compare with existing implementation
4. **Compatibility Tests**: Ensure localStorage structure unchanged

#### Step 3: Gradual Rollout

1. **Development Environment**: Enable Zustand storage
2. **Beta Testing**: Feature flag for selected users
3. **Full Rollout**: Replace import in card-storage.ts
4. **Cleanup**: Remove legacy implementation

### Phase 5: Cache Integration

#### Replace CardStorageCache

```typescript
// The Zustand store already includes caching, so we can create a compatibility wrapper
class ZustandCardStorageCache {
  static invalidateAll(): void {
    useCardStorageStore.getState().invalidateCache();
  }
  
  // Other cache methods can be implemented if needed
  static setDebugMode(enabled: boolean): void {
    // Implementation or no-op since Zustand has its own debugging
  }
  
  static getStats() {
    // Return cache statistics from Zustand store
    const state = useCardStorageStore.getState();
    return {
      enabled: true,
      size: state.batches.size,
      cacheValid: state.cacheValid,
      // ... other stats
    };
  }
}
```

## Implementation Timeline

### Week 1: Foundation
- Set up Zustand store structure
- Implement basic state management
- Create localStorage compatibility layer

### Week 2: Core Methods
- Implement all 17 static methods
- Add comprehensive error handling
- Create static wrapper class

### Week 3: Caching & Optimization
- Implement smart caching for aggregated data
- Optimize performance-critical paths
- Add cache invalidation strategies

### Week 4: Testing & Integration
- Unit tests for all methods
- Integration tests with CustomCardManager
- Performance benchmarking

### Week 5: Migration
- Create feature flag system
- Test in development environment
- Prepare rollout strategy

## Benefits of This Approach

1. **Zero Breaking Changes**: Identical API surface
2. **Performance Improvements**: Smart in-memory caching
3. **Better Architecture**: Centralized state management
4. **Enhanced Debugging**: Zustand DevTools integration
5. **Future-Proof**: Foundation for further refactoring

## Risk Mitigation

1. **Data Loss Prevention**: Maintain exact localStorage structure
2. **Rollback Strategy**: Feature flag allows instant rollback
3. **Comprehensive Testing**: Cover all edge cases
4. **Gradual Migration**: Phased rollout reduces risk
5. **Monitoring**: Track performance and error metrics

This implementation plan provides a complete roadmap for replacing the current storage system with Zustand while maintaining full compatibility and improving performance.