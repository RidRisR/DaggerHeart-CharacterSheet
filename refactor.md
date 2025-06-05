## CardStorage 重构：简化与数据一致性增强

此部分重构专注于 `card/card-storage.ts` 文件，目标是简化 localStorage 的键结构，并将与特定批次相关的数据（自定义字段定义、变体类型定义）直接整合到该批次的主数据中，从而增强数据一致性。

### 当前 `CardStorage` 的问题点

1.  **过多的 localStorage 键**：
    *   `STORAGE_KEYS.INDEX`: 存储卡牌批次的索引。
    *   `STORAGE_KEYS.BATCH_PREFIX + batchId`: 每个批次的卡牌数据。
    *   `STORAGE_KEYS.CONFIG`: 存储配置。
    *   `STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH`: **独立存储**所有批次的自定义字段定义。
    *   `STORAGE_KEYS.VARIANT_TYPES_BY_BATCH`: **独立存储**所有批次的变体类型定义。
    这种分离存储批次数据、批次自定义字段、批次变体类型的方式，增加了数据管理的复杂性，并在删除批次时可能导致孤立数据。

2.  **数据一致性风险**：当一个批次被删除时，需要手动确保其对应的自定义字段和变体类型定义也从 `CUSTOM_FIELDS_BY_BATCH` 和 `VARIANT_TYPES_BY_BATCH` 中移除。如果操作不当，容易产生数据不一致。

3.  **API 冗余**：`CustomCardStorage` 类中存在多套针对自定义字段和变体类型的保存、移除和聚合方法（如 `saveCustomFieldsForBatch`, `removeCustomFieldsForBatch`, `getAggregatedCustomFieldNames` 等），增加了类的复杂度和维护成本。

### 重构目标

1.  **减少 localStorage 键的数量**：将 `CUSTOM_FIELDS_BY_BATCH` 和 `VARIANT_TYPES_BY_BATCH` 的内容合并到每个批次自身的数据中（即存储在 `STORAGE_KEYS.BATCH_PREFIX + batchId` 下的数据）。
2.  **增强数据一致性**：确保与批次相关的所有数据（卡牌、自定义字段、变体类型）作为一个单元进行存储和删除。
3.  **简化 `CustomCardStorage` API**：移除专门针对独立存储自定义字段和变体类型的 API，聚合逻辑直接从批次数据中读取。
4.  **保持上层应用兼容性**：对外暴露的聚合接口（如 `getAggregatedCustomFieldNames`, `getAggregatedVariantTypes`）的签名和行为应保持不变，仅修改其内部实现以适应新的数据结构。

### 重构方案详述

#### 1. 更新数据接口 `BatchData`

修改 `card/card-storage.ts` 中的 `BatchData` 接口，使其直接包含自定义字段和变体类型定义：

```typescript
// card/card-storage.ts
// ... 其他接口 ...

export interface BatchData {
    metadata: BatchBase; // 批次的元数据
    cards: any[]; // StandardCard[] - 避免循环依赖，使用any
    // 原有: customFieldDefinitions?: CustomFieldsForBatch; // 此字段在旧结构中可能在顶层导入数据中有，但未直接存入BatchData
    
    // 新增: 直接在批次数据中存储这些信息
    customFieldDefinitions?: CustomFieldsForBatch; 
    variantTypes?: VariantTypesForBatch; 
}

// ... 其他接口 ...
```

#### 2. 修改 `CustomCardStorage` 类的方法

*   **`saveBatch(batchId: string, data: BatchData)`**:
    *   在保存批次数据时，确保 `data` 参数中可以包含 `customFieldDefinitions` 和 `variantTypes`。
    *   `JSON.stringify(data)` 时，这些信息会自然地随批次数据一同保存。

*   **`loadBatch(batchId: string): BatchData | null`**:
    *   加载批次数据时，返回的 `BatchData` 对象将自然包含 `customFieldDefinitions` 和 `variantTypes`（如果存在）。

*   **移除以下方法**:
    *   `saveCustomFieldsForBatch(batchId: string, definitions: CustomFieldsForBatch)`
    *   `removeCustomFieldsForBatch(batchId: string)`
    *   `saveVariantTypesForBatch(batchId: string, variantTypes: VariantTypesForBatch)`
    *   `removeVariantTypesForBatch(batchId: string)`
    这些方法的功能将通过直接修改 `BatchData` 并调用 `saveBatch` 来实现，或者在删除批次时通过 `removeBatch` 自动完成。

*   **修改聚合方法**:
    *   `getAggregatedCustomFieldNames(): CustomFieldNamesStore`
    *   `getAggregatedCustomFieldNamesWithTemp(tempBatchId?: string, tempDefinitions?: CustomFieldsForBatch): CustomFieldNamesStore`
    *   `getAggregatedVariantTypes(): VariantTypesForBatch`
    *   `getAggregatedVariantTypesWithTemp(tempBatchId?: string, tempDefinitions?: VariantTypesForBatch): VariantTypesForBatch`

    这些方法的逻辑需要调整：
    1.  加载索引 `this.loadIndex()` 以获取所有批次ID和状态（是否启用）。
    2.  对于每个启用的批次ID，调用 `this.loadBatch(batchId)` 来获取其 `BatchData`。
    3.  从加载的 `BatchData` 中提取 `customFieldDefinitions` 或 `variantTypes`。
    4.  进行聚合（合并、去重等）。
    5.  对于 `WithTemp` 版本，按现有逻辑将临时数据合并到聚合结果中。

#### 3. 移除相关的 `STORAGE_KEYS`

从 `STORAGE_KEYS`常量中移除：
*   `CUSTOM_FIELDS_BY_BATCH`
*   `VARIANT_TYPES_BY_BATCH`

#### 4. 数据迁移策略 (关键步骤)

由于此重构改变了数据的存储方式，需要一个一次性的数据迁移过程，以确保现有用户的自定义字段和变体类型数据不会丢失。

**迁移时机**：可以在应用启动时，`CustomCardStorage` 类初始化或首次被调用相关方法时执行。

**迁移步骤**:

1.  **检测旧数据**：检查 `localStorage` 中是否存在 `STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH` 和 `STORAGE_KEYS.VARIANT_TYPES_BY_BATCH`。
2.  **加载旧数据**：如果存在，则加载它们的内容。
    *   `const allOldCustomFields: AllCustomFieldsByBatch = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH) || '{}');`
    *   `const allOldVariantTypes: AllVariantTypesByBatch = JSON.parse(localStorage.getItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH) || '{}');`
3.  **遍历所有批次**：获取当前索引中的所有批次 `const index = this.loadIndex(); Object.keys(index.batches)`.
4.  **合并数据到批次中**：
    *   对于每个 `batchId`：
        *   加载该批次的现有数据: `let batchData = this.loadBatch(batchId);`
        *   如果批次数据存在：
            *   从 `allOldCustomFields[batchId]` 获取该批次的自定义字段，并赋值给 `batchData.customFieldDefinitions`。
            *   从 `allOldVariantTypes[batchId]` 获取该批次的变体类型，并赋值给 `batchData.variantTypes`。
            *   重新保存批次数据: `this.saveBatch(batchId, batchData);`
5.  **删除旧的存储键**：迁移完成后，从 `localStorage` 中删除 `STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH` 和 `STORAGE_KEYS.VARIANT_TYPES_BY_BATCH`。
    *   `localStorage.removeItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH);`
    *   `localStorage.removeItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH);`
6.  **标记迁移完成**：可以使用一个新的 `localStorage` 键（例如 `daggerheart_storage_migrated_vX_Y_Z`）来标记此特定迁移已完成，避免重复执行。

**注意**：数据迁移逻辑应健壮，并包含充分的错误处理和日志记录。

### 影响分析

*   **上层应用**：
    *   直接调用已移除方法（如 `saveCustomFieldsForBatch`）的代码需要修改。这些通常在卡牌导入或编辑逻辑中。新的逻辑会是：先加载批次数据，修改其 `customFieldDefinitions` 或 `variantTypes` 属性，然后重新保存整个批次数据。
    *   调用聚合方法（如 `getAggregatedCustomFieldNames`）的代码**不应受到影响**，因为这些方法的外部签名保持不变。
*   **`CustomCardManager`**：
    *   `CustomCardManager` 中处理导入JSON文件时，如果JSON文件包含顶层的自定义字段或变体类型定义，需要确保这些定义被正确地放入 `BatchData` 对象的相应属性中，然后传递给 `CustomCardStorage.saveBatch`。
    *   删除批次时，由于所有数据都在一个条目下，`CustomCardStorage.removeBatch` 会自动移除所有相关数据，简化了 `CustomCardManager` 的逻辑。

### 实施建议

1.  **备份**：在实施前，强烈建议用户备份其 `localStorage` 数据（可以通过浏览器开发者工具导出）。
2.  **逐步实施**：
    *   首先修改接口和 `CustomCardStorage` 内部逻辑。
    *   实现数据迁移逻辑，并进行充分测试（可以使用模拟的旧版 `localStorage` 数据）。
    *   更新 `CustomCardManager` 和其他可能调用被移除方法的地方。
3.  **版本控制**：如果应用有版本概念，可以将此重构与一个新版本关联，并在更新日志中说明存储结构的变化。

通过以上方案，可以将 `card-storage.ts` 的存储结构变得更加内聚和一致，减少潜在的错误，并简化其API。