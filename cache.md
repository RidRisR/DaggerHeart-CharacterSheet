 # 卡牌系统缓存机制总结与改进方案

## 1. 缓存系统概述

当前卡牌系统的缓存机制主要围绕 `localStorage` 的数据存取优化，旨在提高性能、减少重复计算和I/O操作。主要涉及以下几个层面：

### 1.1. 核心缓存层

*   **`CustomCardStorage.batchCache`**:
    *   **目的**: 存储已加载的单个批次数据 (`BatchData`)。这是一个内存缓存（`Map`）。
    *   **填充**: 当通过 `CustomCardStorage.loadBatch()` 从 `localStorage` 加载批次数据成功后，或通过 `CustomCardStorage.saveBatch()` 保存批次数据后，会更新此缓存。
    *   **读取**: `CustomCardStorage.loadBatch()` 会首先检查此缓存。
    *   **失效**:
        *   `CustomCardStorage.removeBatch()` 会移除对应批次的缓存。
        *   `CustomCardStorage.clearBatchCache()` 会清空整个缓存（主要用于调试或特殊维护）。

*   **`CardStorageCache`**:
    *   **目的**: 存储聚合计算的结果，目前主要包括：
        *   聚合的自定义字段名称 (`CustomFieldNamesStore`)
        *   聚合的变体类型定义 (`VariantTypesForBatch`)
    *   **填充**: 当调用 `CustomCardStorage.getAggregatedCustomFieldNames()` 或 `CustomCardStorage.getAggregatedVariantTypes()` 时，如果缓存未命中，则会计算结果并存入此缓存。
    *   **读取**: `getAggregated...` 方法会首先检查此缓存。
    *   **失效**:
        *   `CardStorageCache.invalidateAll()`: 清空所有聚合缓存。
        *   此方法在以下关键操作后被调用：
            *   `CustomCardStorage.saveBatch()`: 保存批次数据（可能引入新的自定义字段/变体类型）。
            *   `CustomCardStorage.removeBatch()`: 删除批次数据。
            *   `CustomCardManager.toggleBatchDisabled()`: 启用/禁用批次会影响聚合结果。
            *   `CustomCardStorage.migrateToIntegratedStorage()`: 数据迁移可能改变批次内容。
            *   `CustomCardStorage.clearAllData()`: 清空数据。

### 1.2. 管理器层面缓存

*   **`CustomCardManager.customCards`**:
    *   **目的**: `CustomCardManager` 内部持有的当前所有已加载且启用的自定义卡牌列表 (`ExtendedStandardCard[]`)。
    *   **填充/刷新**: 通过 `CustomCardManager.reloadCustomCards()` 方法刷新。此方法会重新从 `CustomCardStorage` 加载所有启用的批次数据，并转换卡牌。
    *   **触发刷新**:
        *   系统初始化时 (`CustomCardManager.initializeSystem()`)。
        *   导入新卡牌成功后 (`CustomCardManager.importCards()`)。
        *   删除批次后 (`CustomCardManager.removeBatchAndReload()`)。
        *   切换批次启用状态后 (`CustomCardManager.toggleBatchDisabled()`)。
        *   清空所有数据后 (`CustomCardManager.clearAllCustomData()`)。

## 2. 现有机制的优点

1.  **分层缓存**: 针对不同类型的数据和操作（单个批次数据 vs. 聚合数据）使用了不同的缓存策略，设计清晰。
2.  **减少 `localStorage` 读写**: `batchCache` 有效减少了对 `localStorage` 的重复读取和JSON解析。
3.  **优化聚合计算**: `CardStorageCache` 避免了对所有批次数据的重复遍历和聚合，显著提升了获取自定义字段和变体类型定义的性能。
4.  **明确的失效点**: 缓存失效逻辑与数据修改操作关联，大部分情况下能保证数据一致性。例如，批次保存、删除、禁用/启用都会触发相关缓存的失效。

## 3. 存在的问题与改进点

### 主要问题：`CustomCardManager.importCards()` 中的预写入与潜在的孤立数据

在 `CustomCardManager.importCards` 方法中，存在一个关键问题：

*   **预写入自定义字段和变体类型**: 在导入流程的**第一步**，系统会调用 `CustomCardStorage.updateBatchCustomFields()` 和 `CustomCardStorage.updateBatchVariantTypes()`。这两个方法内部会调用 `CustomCardStorage.saveBatch()`，从而将一个包含自定义字段/变体类型定义（但可能还没有卡牌数据）的**初步批次数据**写入 `localStorage`，并更新 `batchCache` 和使 `CardStorageCache` 失效。
*   **验证后续失败的风险**: 如果在第一步预写入之后，后续的验证步骤（如ID冲突、数据转换等）失败，并且此时 `hasCreatedBatch` 标志位仍为 `false`（因为它在最终的 `saveBatch` 之后才置为 `true`），则 `catch` 块中的清理逻辑 `CustomCardStorage.removeBatch(batchId)` **不会执行**。
*   **后果**: 这会导致一个不完整或临时的批次数据残留在 `localStorage` 中，成为孤立数据。虽然系统提供了 `cleanupOrphanedData` 功能，但应尽可能避免在正常操作流程中产生此类数据。

**简述**：为了在验证阶段让新导入的自定义字段和变体类型可用，系统提前将它们写入了存储。但如果后续导入流程中断，这些提前写入的数据可能不会被清理。

## 4. 改进方案建议

针对上述 `CustomCardManager.importCards()` 的问题，提出以下改进方案：

### 方案：优化导入流程，避免预写入或增强清理

**核心思路**：尽量推迟对 `localStorage` 的写入操作，直到所有验证和数据准备完成，或者确保任何预写入操作在失败时都能被可靠清理。

**具体措施：**

1.  **调整验证逻辑以使用临时数据**:
    *   修改 `validateImportDataFormat` (内部依赖 `CardTypeValidator.validateImportData`) 和 `validateVariantTypeUniqueness` 等验证函数。
    *   当前 `CardTypeValidator.validateImportData` 已经接受一个 `tempFields` 参数，可以利用这个机制。
    *   让这些验证函数能够接收入参形式的、待导入的 `customFieldDefinitions` 和 `variantTypes`。
    *   在验证时，将这些临时的定义与从 `CustomCardStorage` 加载的现有已存储的定义进行**内存中合并**，形成一个临时的、用于当次验证的“聚合视图”，而不是依赖于预先写入 `localStorage` 的数据。
    *   **优点**: 无需预写入，从根本上避免了孤立数据的产生。
    *   **潜在挑战**: 可能需要调整验证器和聚合逻辑，使其能处理这种临时的、内存中的数据合并。

2.  **如果预写入不可避免，则强化清理逻辑**:
    *   如果方案1因验证逻辑复杂等原因难以实现，则需要确保即使 `hasCreatedBatch` 为 `false`，预写入的数据也能被清理。
    *   可以在 `importCards` 方法的 `try` 块开始时设置一个独立的标志，例如 `let preliminaryDataWritten = false;`。
    *   在调用 `CustomCardStorage.updateBatchCustomFields()` 或 `CustomCardStorage.updateBatchVariantTypes()` 成功后，将此标志设为 `true`。
    *   在 `catch` 块中，增加判断：
        ```typescript
        // filepath: /Users/zhonghanzhen/Desktop/DaggerHeart-CharacterSheet/card/custom-card-manager.ts
        // ...existing code...
        } catch (error) {
            let preliminaryDataPotentiallyWritten = false; // Flag to track if preliminary writes might have occurred

            // Check if the batchId was used in a context that might write it,
            // even if hasCreatedBatch is false. This is a conceptual check.
            // A more robust way is to set a flag when updateBatchCustomFields/updateBatchVariantTypes are called.
            // For now, we assume if an error happened, and batchId was generated, cleanup might be needed.

            if (batchId && CustomCardStorage.loadBatch(batchId) !== null) { // Check if a batch (even preliminary) exists
                 preliminaryDataPotentiallyWritten = true;
            }

            if (hasCreatedBatch || preliminaryDataPotentiallyWritten) {
                CustomCardStorage.removeBatch(batchId);
                // Ensure caches are also cleared or reloaded if necessary,
                // though removeBatch should handle its own cache invalidations.
            }
        // ...existing code...
        ```
        或者，更简单的方式是，只要 `batchId` 已生成且发生错误，就尝试 `removeBatch`，因为 `removeBatch` 对一个不存在的键操作是无害的。
        ```typescript
        // filepath: /Users/zhonghanzhen/Desktop/DaggerHeart-CharacterSheet/card/custom-card-manager.ts
        // ...existing code...
        } catch (error) {
            // 清理失败的操作
            // 如果 batchId 已生成，无论 hasCreatedBatch 状态如何，都尝试清理，
            // 因为预写入可能已经发生。removeBatch 对不存在的项是安全的。
            if (batchId) {
                CustomCardStorage.removeBatch(batchId);
            }
        // ...existing code...
        ```
    *   **优点**: 改动相对较小，主要集中在错误处理部分。
    *   **缺点**: 仍然有预写入操作，只是增强了清理。

**推荐方案**: **优先考虑方案1（调整验证逻辑以使用临时数据）**。这更为彻底地解决了问题根源，使得导入流程更加健壮，减少了对 `localStorage` 的不必要写入和潜在的清理依赖。

## 5. 远期考虑

*   **异步存储**: `localStorage` 是同步API，在处理大量数据时可能阻塞主线程。未来可以考虑调研 `IndexedDB` 等异步存储方案，但这将是更大幅度的重构。
*   **更细粒度的缓存失效**: 目前 `CardStorageCache` 主要通过 `invalidateAll()` 清空。如果聚合数据来源非常多且变化频繁，可以考虑更细粒度的失效策略（例如，只失效与特定批次相关的聚合数据），但这会增加复杂性，需权衡利弊。

通过实施上述改进方案，特别是针对 `importCards` 流程的优化，可以进一步提升卡牌系统缓存机制的健壮性和效率。