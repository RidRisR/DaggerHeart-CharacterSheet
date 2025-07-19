# Card System Refactoring Plan

## Phase 1: Interface Analysis & Zustand Replacement Strategy

### CustomCardStorage Interface Used by CustomCardManager

Based on code analysis, CustomCardManager uses the following CustomCardStorage static methods:

#### 1. Initialization & Configuration
- `initialize()`: Initialize storage system
- `generateBatchId()`: Generate unique batch ID

#### 2. Index Management
- `loadIndex()`: Load card index
- `saveIndex(index)`: Save card index

#### 3. Batch Data Management
- `saveBatch(batchId, data)`: Save batch data
- `loadBatch(batchId)`: Load batch data
- `removeBatch(batchId)`: Remove batch data

#### 4. Aggregated Data
- `getAggregatedCustomFieldNames()`: Get aggregated custom field names
- `getAggregatedVariantTypes()`: Get aggregated variant types

#### 5. Storage Management
- `checkStorageSpace(requiredSize)`: Check storage space
- `getFormattedStorageInfo()`: Get formatted storage info
- `calculateStorageUsage()`: Calculate storage usage

#### 6. Data Integrity
- `validateIntegrity()`: Validate data integrity
- `cleanupOrphanedData()`: Cleanup orphaned data

#### 7. Batch Updates
- `updateBatchCustomFields(batchId, definitions)`: Update batch custom fields
- `updateBatchVariantTypes(batchId, types)`: Update batch variant types

#### 8. Data Cleanup
- `clearAllData()`: Clear all data

### Interface Type Definitions

```typescript
// Core interfaces
interface CustomCardIndex {
  batches: Record<string, ImportBatch>;
  totalCards: number;
  totalBatches: number;
  lastUpdate: string;
}

interface BatchData {
  metadata: BatchBase;
  cards: any[];
  customFieldDefinitions?: CustomFieldsForBatch;
  variantTypes?: VariantTypesForBatch;
}

interface CustomFieldNamesStore {
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
  // Additional stats
}

interface IntegrityReport {
  isValid: boolean;
  issues: string[];
  orphanedKeys: string[];
}

interface CleanupReport {
  removedKeys: string[];
  errors: string[];
  cleanedSize: number;
}
```

### Zustand Replacement Strategy

#### 1. State Structure Design
```typescript
interface CardStorageState {
  // Core data
  index: CustomCardIndex;
  batches: Map<string, BatchData>;
  
  // Aggregated data cache
  aggregatedCustomFields: CustomFieldNamesStore;
  aggregatedVariantTypes: VariantTypesForBatch;
  
  // Cache invalidation flags
  cacheValid: boolean;
  lastUpdateTime: number;
  
  // Initialization state
  initialized: boolean;
  
  // Storage statistics
  storageStats: StorageStats;
}
```

#### 2. Actions Design
```typescript
interface CardStorageActions {
  // Initialization
  initialize: () => Promise<{ initialized: boolean; migrationResult?: any }>;
  
  // Index management
  loadIndex: () => CustomCardIndex;
  saveIndex: (index: CustomCardIndex) => void;
  
  // Batch management
  saveBatch: (batchId: string, data: BatchData) => void;
  loadBatch: (batchId: string) => BatchData | null;
  removeBatch: (batchId: string) => void;
  
  // Aggregated data
  getAggregatedCustomFieldNames: () => CustomFieldNamesStore;
  getAggregatedVariantTypes: () => VariantTypesForBatch;
  
  // Storage management
  checkStorageSpace: (requiredSize: number) => boolean;
  getFormattedStorageInfo: () => { used: string; available: string; percentage: number };
  calculateStorageUsage: () => StorageStats;
  
  // Data integrity
  validateIntegrity: () => IntegrityReport;
  cleanupOrphanedData: () => CleanupReport;
  
  // Batch updates
  updateBatchCustomFields: (batchId: string, definitions: CustomFieldsForBatch) => void;
  updateBatchVariantTypes: (batchId: string, types: VariantTypesForBatch) => void;
  
  // Data cleanup
  clearAllData: () => void;
  
  // Utility methods
  generateBatchId: () => string;
  
  // Cache invalidation
  invalidateCache: () => void;
}
```

#### 3. Implementation Strategy

##### 3.1 Keep localStorage as Persistence Layer
- Zustand as in-memory state management
- Auto-sync to localStorage
- Maintain existing data structures and key names

##### 3.2 Caching Strategy
- Cache aggregated data in memory
- Smart invalidation: auto-invalidate on batch changes
- Lazy loading: compute aggregated data only when needed

##### 3.3 Compatibility Guarantee
- Identical static method interface
- Same return types and error handling
- Preserve existing data migration logic

### Phase 2: Implementation Plan

#### Step 1: Create Zustand Store
- Define state interfaces
- Implement basic store structure
- Add persistence middleware

#### Step 2: Implement Core Methods
- Implement all static methods
- Maintain identical API
- Add proper error handling

#### Step 3: Testing & Validation
- Unit tests for each method
- Integration tests with CustomCardManager
- Performance comparison tests

#### Step 4: Progressive Replacement
- Create compatibility wrapper
- Gradually replace references
- Verify functionality completeness

### Expected Benefits

#### 1. Performance Improvements
- Reduced localStorage access
- Smart caching mechanism
- More efficient memory management

#### 2. Code Simplification
- Centralized state management
- Reduced cache layer complexity
- Clearer data flow

#### 3. Maintainability
- Better type safety
- Unified state management pattern
- Easier debugging and testing

### Risk Assessment

#### 1. Compatibility Risk
- **Low** - Maintains identical API
- Mitigation: Strict interface testing

#### 2. Performance Risk
- **Low** - Zustand has excellent performance
- Mitigation: Performance benchmarking

#### 3. Migration Risk
- **Medium** - Requires careful progressive replacement
- Mitigation: Comprehensive testing and rollback mechanisms

### Conclusion

This strategy allows for a complete Zustand replacement of the existing storage layer while maintaining full compatibility, laying the foundation for future refactoring. The key is maintaining identical static method interfaces, allowing CustomCardManager to use the new storage implementation transparently.