# DaggerHeart Character Sheet - localStorage Gradual Optimization Plan

## Overview
This document outlines a **gradual optimization approach** for consolidating localStorage usage in the DaggerHeart Character Sheet system. Instead of a radical 3-key restructure, we'll first consolidate same-batch data together, reducing complexity incrementally.

## Current State Analysis

### Current localStorage Keys Pattern
- `DHCS_CARD_INDEX` - Batch metadata and indexes
- `DHCS_CARD_CONFIG` - Global configuration
- `batch_${batchId}` - Individual batch card data (proliferates with each batch)
- `DHCS_CARD_CUSTOM_FIELDS_BY_BATCH` - Custom field definitions per batch
- `DHCS_CARD_VARIANT_TYPES_BY_BATCH` - Variant type definitions per batch

### Key Problems
1. **Data Fragmentation**: Same-batch data scattered across multiple localStorage keys
2. **Key Proliferation**: Each new batch creates additional localStorage entries
3. **Complex Operations**: Single logical operations require multiple localStorage reads/writes
4. **Data Consistency Risk**: Related data stored separately can become inconsistent

## Phase 1: Batch Data Consolidation

### Goal
Consolidate all data for each batch into a single localStorage entry while maintaining current functionality.

### New Storage Structure

#### Unified Batch Storage Key Pattern
```
DHCS_BATCH_DATA_${batchId}
```

#### Unified Batch Data Structure
```typescript
interface UnifiedBatchData {
  metadata: BatchBase;
  cards: CustomCard[];
  customFields: CustomFieldDefinition[];
  variantTypes: VariantTypeDefinition[];
  enabled: bool; //if system load the batch
  statistics: {
    totalCards: number;
    lastAccessTime: string;
    operationCount: number;
  };
}
```
需求：

index 需要保留吗？

在项目启动的时候检查有没有老版本的数据残留，并重构到新架构（静默，但明确日志报错）

理论上卡牌数据只要在项目初始化的时候加载一次，对吗？