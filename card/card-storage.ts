/**
 * 自定义卡牌存储抽象层
 * 提供对localStorage的抽象操作，管理自定义卡牌的存储架构
 */

import { safeJsonParse, safeGetItem, safeSetItem, safeRemoveItem } from './storage-utils';

// 调试日志标记
const DEBUG_CARD_STORAGE = false;
const logDebug = (operation: string, details: any) => {
    if (DEBUG_CARD_STORAGE) {
        console.log(`[CardStorage:${operation}]`, details);
    }
};

// 存储键常量定义
export const STORAGE_KEYS = {
    INDEX: 'daggerheart_custom_cards_index',
    BATCH_PREFIX: 'daggerheart_custom_cards_batch_',
    CONFIG: 'daggerheart_custom_cards_config',
    CUSTOM_FIELDS_BY_BATCH: 'daggerheart_custom_fields_by_batch', // New key for batch-based custom fields
    VARIANT_TYPES_BY_BATCH: 'daggerheart_variant_types_by_batch' // New key for batch-based variant type definitions
} as const;

// 默认配置
const DEFAULT_CONFIG: StorageConfig = {
    maxBatches: 50,
    maxStorageSize: 5 * 1024 * 1024, // 5MB
    autoCleanup: true,
    compressionEnabled: false
};

// 接口定义
export interface CustomCardIndex {
    batches: Record<string, ImportBatch>;
    totalCards: number;
    totalBatches: number;
    lastUpdate: string;
}

// New base interface for common batch metadata
export interface BatchBase {
    id: string;          // Standardized identifier for the batch
    name?: string;        // Optional: Original name of the batch from source data.
    fileName: string;    // Original file name of the imported batch.
    importTime: string;  // Timestamp of import.
    version?: string;     // Version of the batch, if applicable (e.g., 内置卡包版本号).
    description?: string; // Optional: Description of the batch.
    author?: string;      // Optional: Author of the batch.
}

export interface ImportBatch extends BatchBase {
    name: string; // Name is required for index display (can be derived if missing in source).
    // id, fileName, importTime, version are inherited from BatchBase.
    cardCount: number;
    cardTypes: string[];
    size: number;
    isSystemBatch?: boolean; // 标识是否为系统内置卡包
    disabled?: boolean; // 新字段：如果为 true，批次将被禁用且不会加载
}

export interface BatchData {
    metadata: BatchBase; // Metadata for the batch
    cards: any[]; // StandardCard[] - 避免循环依赖，使用any
    customFieldDefinitions?: CustomFieldsForBatch; // Add this field for custom field definitions
}

export interface StorageConfig {
    maxBatches: number;
    maxStorageSize: number; // 字节数
    autoCleanup: boolean;
    compressionEnabled: boolean;
}

// New interface for storing custom field names
export interface CustomFieldNamesStore {
    [category: string]: string[];
}

// Interface for custom fields defined by a single batch
export interface CustomFieldsForBatch {
    [category: string]: string[]; // e.g., { professions: ["战士"], ancestries: ["树人"] }
}

// Interface for the entire structure stored in localStorage
export interface AllCustomFieldsByBatch {
    [batchId: string]: CustomFieldsForBatch;
}

// Interface for variant type definitions defined by a single batch
export interface VariantTypesForBatch {
    [typeId: string]: any; // VariantTypeDefinition, but using any to avoid import cycles
}

// Interface for the entire variant types structure stored in localStorage
export interface AllVariantTypesByBatch {
    [batchId: string]: VariantTypesForBatch;
}

export interface StorageStats {
    totalSize: number;
    indexSize: number;
    batchesSize: number;
    configSize: number;
    availableSpace: number; // 预估可用空间
}

export interface IntegrityReport {
    isValid: boolean;
    issues: string[];
    orphanedKeys: string[];
    missingBatches: string[];
    corruptedBatches: string[];
}

export interface CleanupReport {
    removedKeys: string[];
    freedSpace: number;
    errors: string[];
}

/**
 * 自定义卡牌存储类
 * 提供localStorage的抽象操作接口
 */
export class CustomCardStorage {

    // ===== 索引操作 =====

    /**
     * 加载主索引
     */
    static loadIndex(): CustomCardIndex {
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            // SSR 环境下返回默认索引结构
            return {
                batches: {},
                totalCards: 0,
                totalBatches: 0,
                lastUpdate: new Date().toISOString()
            };
        }
        
        const defaultIndex = {
            batches: {},
            totalCards: 0,
            totalBatches: 0,
            lastUpdate: new Date().toISOString()
        };
        
        return safeGetItem(STORAGE_KEYS.INDEX, defaultIndex);
    }

    /**
     * 保存主索引
     */
    static saveIndex(index: CustomCardIndex): void {
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
        
        index.lastUpdate = new Date().toISOString();
        
        if (!safeSetItem(STORAGE_KEYS.INDEX, index)) {
            console.error('[CustomCardStorage] 索引保存失败');
            throw new Error('无法保存自定义卡牌索引');
        }
    }

    // ===== 批次操作 =====

    /**
     * 生成批次存储键
     */
    private static getBatchStorageKey(batchId: string): string {
        return `${STORAGE_KEYS.BATCH_PREFIX}${batchId}`;
    }

    /**
     * 保存批次数据
     */
    static saveBatch(batchId: string, data: BatchData): void {
        try {
            const key = this.getBatchStorageKey(batchId);

            // 检查存储空间
            const config = this.getConfig();
            const currentUsage = this.calculateStorageUsage();
            const dataSize = JSON.stringify(data).length * 2; // UTF-16编码

            if (currentUsage.totalSize + dataSize > config.maxStorageSize) {
                throw new Error(`存储空间不足。当前使用: ${(currentUsage.totalSize / 1024 / 1024).toFixed(2)}MB, 需要: ${(dataSize / 1024 / 1024).toFixed(2)}MB`);
            }

            if (!safeSetItem(key, data)) {
                throw new Error(`无法保存批次数据到localStorage: ${batchId}`);
            }
        } catch (error) {
            console.error(`[CustomCardStorage] 批次 ${batchId} 保存失败:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`无法保存批次数据: ${batchId} - ${errorMessage}`);
        }
    }

    /**
     * 加载批次数据
     */
    static loadBatch(batchId: string): BatchData | null {
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            return null;
        }
        
        const key = this.getBatchStorageKey(batchId);
        console.log(`[CustomCardStorage] 加载批次 ${batchId}，存储键: ${key}`);
        
        const data = safeGetItem<BatchData | null>(key, null);
        
        if (data) {
            console.log(`[CustomCardStorage] 批次 ${batchId} 解析后数据:`, {
                hasMetadata: !!data.metadata,
                hasCards: !!data.cards,
                cardsLength: data.cards ? data.cards.length : 'N/A'
            });
        } else {
            console.warn(`[CustomCardStorage] 批次 ${batchId} 在localStorage中不存在`);
        }
        
        return data;
    }

    /**
     * 删除批次数据
     */
    static removeBatch(batchId: string): void {
        const key = this.getBatchStorageKey(batchId);
        safeRemoveItem(key);
    }

    /**
     * 列出所有批次ID
     */
    static listBatches(): string[] {
        const index = this.loadIndex();
        return Object.keys(index.batches);
    }

    // ===== 配置操作 =====

    /**
     * 获取存储配置
     */
    static getConfig(): StorageConfig {
        const defaultConfig = { ...DEFAULT_CONFIG };
        return safeGetItem(STORAGE_KEYS.CONFIG, defaultConfig);
    }

    /**
     * 设置存储配置
     */
    static setConfig(config: Partial<StorageConfig>): void {
        try {
            const currentConfig = this.getConfig();
            const newConfig = { ...currentConfig, ...config };
            if (!safeSetItem(STORAGE_KEYS.CONFIG, newConfig)) {
                throw new Error('无法保存存储配置到localStorage');
            }
        } catch (error) {
            console.error('[CustomCardStorage] 配置保存失败:', error);
            throw new Error('无法保存存储配置');
        }
    }

    // ===== 新增：按批次的自定义字段名操作 =====

    /**
     * 保存指定批次的自定义字段定义
     */
    static saveCustomFieldsForBatch(batchId: string, definitions: CustomFieldsForBatch): void {
        logDebug('saveCustomFieldsForBatch', { batchId, definitions });

        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            logDebug('saveCustomFieldsForBatch', 'localStorage unavailable');
            return;
        }

        try {
            // 获取现有的所有批次自定义字段数据
            const allFields: AllCustomFieldsByBatch = safeGetItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH, {});

            logDebug('saveCustomFieldsForBatch', {
                beforeSave: allFields,
                storageKey: STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH
            });

            // 设置此批次的自定义字段
            allFields[batchId] = definitions;

            // 保存更新后的数据
            if (!safeSetItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH, allFields)) {
                throw new Error('无法保存自定义字段数据到localStorage');
            }

            // 验证保存
            const verification: AllCustomFieldsByBatch = safeGetItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH, {});

            logDebug('saveCustomFieldsForBatch', {
                afterSave: verification,
                savedSuccessfully: verification[batchId] !== undefined,
                batchDefinitions: verification[batchId]
            });

        } catch (error) {
            logDebug('saveCustomFieldsForBatch', { error });
            console.error(`[CustomCardStorage] 批次 ${batchId} 的自定义字段保存失败:`, error);
            throw new Error(`无法保存批次 ${batchId} 的自定义字段`);
        }
    }

    /**
     * 移除指定批次的自定义字段定义
     */
    static removeCustomFieldsForBatch(batchId: string): void {
        logDebug('removeCustomFieldsForBatch', { batchId });

        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            logDebug('removeCustomFieldsForBatch', 'localStorage unavailable');
            return;
        }

        try {
            const allFields: AllCustomFieldsByBatch = safeGetItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH, {});
            logDebug('removeCustomFieldsForBatch', { beforeRemoval: allFields });

            // 删除指定批次的自定义字段
            if (allFields[batchId]) {
                delete allFields[batchId];
                if (!safeSetItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH, allFields)) {
                    throw new Error('无法保存自定义字段数据到localStorage');
                }

                // 验证删除
                const verification: AllCustomFieldsByBatch = safeGetItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH, {});

                logDebug('removeCustomFieldsForBatch', {
                    afterRemoval: verification,
                    batchRemoved: !(batchId in verification)
                });
            } else {
                logDebug('removeCustomFieldsForBatch', 'batch not found in stored data');
            }
        } catch (error) {
            logDebug('removeCustomFieldsForBatch', { error });
            console.error(`[CustomCardStorage] 批次 ${batchId} 的自定义字段删除失败:`, error);
            throw new Error(`无法删除批次 ${batchId} 的自定义字段`);
        }
    }

    /**
     * 获取聚合的自定义字段名称（来自所有启用的批次）
     */
    static getAggregatedCustomFieldNames(): CustomFieldNamesStore {
        logDebug('getAggregatedCustomFieldNames', 'starting aggregation');

        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            logDebug('getAggregatedCustomFieldNames', 'localStorage unavailable');
            return {};
        }

        try {
            // 加载所有批次的自定义字段
            const allFieldsByBatch: AllCustomFieldsByBatch = safeGetItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH, {});
            logDebug('getAggregatedCustomFieldNames', { allFieldsByBatch });

            // 加载主索引以检查批次状态
            const index = this.loadIndex();
            logDebug('getAggregatedCustomFieldNames', {
                indexBatches: Object.keys(index.batches),
                enabledBatches: Object.keys(index.batches).filter(batchId => !index.batches[batchId].disabled)
            });

            // 初始化聚合结果
            const aggregatedFields: CustomFieldNamesStore = {};

            // 遍历所有批次
            for (const batchId in allFieldsByBatch) {
                const batchInfo = index.batches[batchId];

                // 只处理未被禁用的批次
                if (!batchInfo || batchInfo.disabled) {
                    logDebug('getAggregatedCustomFieldNames', {
                        batchId,
                        status: !batchInfo ? 'not found in index' : 'disabled',
                        skipped: true
                    });
                    continue;
                }

                const batchFields = allFieldsByBatch[batchId];
                logDebug('getAggregatedCustomFieldNames', {
                    batchId,
                    enabled: true,
                    batchFields
                });

                // 遍历此批次的每个类别
                for (const category in batchFields) {
                    const namesArray = batchFields[category];

                    // 确保聚合结果中存在此类别
                    if (!aggregatedFields[category]) {
                        aggregatedFields[category] = [];
                    }

                    // 添加此批次的字段名到聚合结果
                    aggregatedFields[category].push(...namesArray);
                }
            }

            // 对每个类别进行去重
            for (const category in aggregatedFields) {
                aggregatedFields[category] = [...new Set(aggregatedFields[category])];
            }

            logDebug('getAggregatedCustomFieldNames', { result: aggregatedFields });

            return aggregatedFields;
        } catch (error) {
            console.error('[CustomCardStorage] 聚合自定义字段名加载失败:', error);
            return {};
        }
    }

    /**
     * 获取聚合的自定义字段名称（包含临时批次定义，用于验证阶段）
     */
    static getAggregatedCustomFieldNamesWithTemp(tempBatchId?: string, tempDefinitions?: CustomFieldsForBatch): CustomFieldNamesStore {
        logDebug('getAggregatedCustomFieldNamesWithTemp', { tempBatchId, tempDefinitions });

        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            logDebug('getAggregatedCustomFieldNamesWithTemp', 'localStorage unavailable');
            // 如果没有localStorage，至少返回临时定义
            return tempDefinitions || {};
        }

        try {
            // 首先获取现有的聚合字段
            const existingFields = this.getAggregatedCustomFieldNames();

            // 如果没有临时定义，直接返回现有字段
            if (!tempBatchId || !tempDefinitions) {
                return existingFields;
            }

            // 合并临时定义
            const mergedFields: CustomFieldNamesStore = { ...existingFields };

            for (const category in tempDefinitions) {
                const tempNames = tempDefinitions[category];

                if (!mergedFields[category]) {
                    mergedFields[category] = [];
                }

                // 添加临时定义的字段名并去重
                mergedFields[category] = [...new Set([...mergedFields[category], ...tempNames])];
            }

            logDebug('getAggregatedCustomFieldNamesWithTemp', {
                existingFields,
                tempDefinitions,
                mergedFields
            });

            return mergedFields;
        } catch (error) {
            logDebug('getAggregatedCustomFieldNamesWithTemp', { error });
            console.error('[CustomCardStorage] 聚合自定义字段名加载失败:', error);
            // 出错时至少返回临时定义
            return tempDefinitions || {};
        }
    }


    // ===== 新增：按批次的变体类型定义操作 =====

    /**
     * 保存指定批次的变体类型定义
     */
    static saveVariantTypesForBatch(batchId: string, variantTypes: VariantTypesForBatch): void {
        logDebug('saveVariantTypesForBatch', { batchId, variantTypes });

        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            logDebug('saveVariantTypesForBatch', 'localStorage unavailable');
            return;
        }

        try {
            // 获取现有的所有批次变体类型数据
            const allVariantTypes: AllVariantTypesByBatch = safeGetItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH, {});

            logDebug('saveVariantTypesForBatch', {
                beforeSave: allVariantTypes,
                storageKey: STORAGE_KEYS.VARIANT_TYPES_BY_BATCH
            });

            // 设置此批次的变体类型定义
            allVariantTypes[batchId] = variantTypes;

            // 保存更新后的数据
            if (!safeSetItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH, allVariantTypes)) {
                throw new Error('无法保存变体类型数据到localStorage');
            }

            // 验证保存
            const verification: AllVariantTypesByBatch = safeGetItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH, {});

            logDebug('saveVariantTypesForBatch', {
                afterSave: verification,
                savedSuccessfully: verification[batchId] !== undefined,
                batchDefinitions: verification[batchId]
            });

        } catch (error) {
            logDebug('saveVariantTypesForBatch', { error });
            console.error(`[CustomCardStorage] 批次 ${batchId} 的变体类型定义保存失败:`, error);
            throw new Error(`无法保存批次 ${batchId} 的变体类型定义`);
        }
    }

    /**
     * 移除指定批次的变体类型定义
     */
    static removeVariantTypesForBatch(batchId: string): void {
        logDebug('removeVariantTypesForBatch', { batchId });

        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            logDebug('removeVariantTypesForBatch', 'localStorage unavailable');
            return;
        }

        try {
            const allVariantTypes: AllVariantTypesByBatch = safeGetItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH, {});
            logDebug('removeVariantTypesForBatch', { beforeRemoval: allVariantTypes });

            // 删除指定批次的变体类型定义
            if (allVariantTypes[batchId]) {
                delete allVariantTypes[batchId];
                if (!safeSetItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH, allVariantTypes)) {
                    throw new Error('无法保存变体类型数据到localStorage');
                }

                // 验证删除
                const verification: AllVariantTypesByBatch = safeGetItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH, {});

                logDebug('removeVariantTypesForBatch', {
                    afterRemoval: verification,
                    batchRemoved: !(batchId in verification)
                });
            } else {
                logDebug('removeVariantTypesForBatch', 'batch not found in stored data');
            }
        } catch (error) {
            logDebug('removeVariantTypesForBatch', { error });
            console.error(`[CustomCardStorage] 批次 ${batchId} 的变体类型定义删除失败:`, error);
            throw new Error(`无法删除批次 ${batchId} 的变体类型定义`);
        }
    }

    /**
     * 获取聚合的变体类型定义（来自所有启用的批次）
     */
    static getAggregatedVariantTypes(): VariantTypesForBatch {
        logDebug('getAggregatedVariantTypes', 'starting aggregation');

        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            logDebug('getAggregatedVariantTypes', 'localStorage unavailable');
            return {};
        }

        try {
            // 加载所有批次的变体类型定义
            const allVariantTypesByBatch: AllVariantTypesByBatch = safeGetItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH, {});
            logDebug('getAggregatedVariantTypes', { allVariantTypesByBatch });

            // 加载主索引以检查批次状态
            const index = this.loadIndex();
            logDebug('getAggregatedVariantTypes', {
                indexBatches: Object.keys(index.batches),
                enabledBatches: Object.keys(index.batches).filter(batchId => !index.batches[batchId].disabled)
            });

            // 初始化聚合结果
            const aggregatedTypes: VariantTypesForBatch = {};

            // 遍历所有批次
            for (const batchId in allVariantTypesByBatch) {
                const batchInfo = index.batches[batchId];

                // 只处理未被禁用的批次
                if (!batchInfo || batchInfo.disabled) {
                    logDebug('getAggregatedVariantTypes', {
                        batchId,
                        status: !batchInfo ? 'not found in index' : 'disabled',
                        skipped: true
                    });
                    continue;
                }

                const batchTypes = allVariantTypesByBatch[batchId];
                logDebug('getAggregatedVariantTypes', {
                    batchId,
                    enabled: true,
                    batchTypes
                });

                // 遍历此批次的每个变体类型
                for (const typeId in batchTypes) {
                    const typeDef = batchTypes[typeId];

                    // 如果类型ID已存在，发出警告但允许覆盖（后加载的批次优先）
                    if (aggregatedTypes[typeId]) {
                        console.warn(`[CustomCardStorage] 变体类型 "${typeId}" 在多个批次中定义，使用批次 "${batchId}" 的定义`);
                    }

                    aggregatedTypes[typeId] = typeDef;
                }
            }

            logDebug('getAggregatedVariantTypes', { result: aggregatedTypes });

            return aggregatedTypes;
        } catch (error) {
            console.error('[CustomCardStorage] 聚合变体类型定义加载失败:', error);
            return {};
        }
    }

    /**
     * 获取聚合的变体类型定义（包含临时批次定义，用于验证阶段）
     */
    static getAggregatedVariantTypesWithTemp(tempBatchId?: string, tempDefinitions?: VariantTypesForBatch): VariantTypesForBatch {
        logDebug('getAggregatedVariantTypesWithTemp', { tempBatchId, tempDefinitions });

        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            logDebug('getAggregatedVariantTypesWithTemp', 'localStorage unavailable');
            // 如果没有localStorage，至少返回临时定义
            return tempDefinitions || {};
        }

        try {
            // 首先获取现有的聚合变体类型
            const existingTypes = this.getAggregatedVariantTypes();

            // 如果没有临时定义，直接返回现有类型
            if (!tempBatchId || !tempDefinitions) {
                return existingTypes;
            }

            // 合并临时定义
            const mergedTypes: VariantTypesForBatch = { ...existingTypes };

            for (const typeId in tempDefinitions) {
                const tempTypeDef = tempDefinitions[typeId];

                // 如果类型ID已存在，临时定义优先
                if (mergedTypes[typeId]) {
                    console.warn(`[CustomCardStorage] 变体类型 "${typeId}" 已存在，临时定义将覆盖现有定义`);
                }

                mergedTypes[typeId] = tempTypeDef;
            }

            logDebug('getAggregatedVariantTypesWithTemp', {
                existingTypes,
                tempDefinitions,
                mergedTypes
            });

            return mergedTypes;
        } catch (error) {
            logDebug('getAggregatedVariantTypesWithTemp', { error });
            console.error('[CustomCardStorage] 聚合变体类型定义加载失败:', error);
            // 出错时至少返回临时定义
            return tempDefinitions || {};
        }
    }


    // ===== 维护操作 =====

    /**
     * 计算存储使用情况
     */
    static calculateStorageUsage(): StorageStats {
        let totalSize = 0;
        let indexSize = 0;
        let batchesSize = 0;
        let configSize = 0;

        try {
            // 计算索引大小 - 需要获取原始JSON字符串长度
            if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
                const indexData = localStorage.getItem(STORAGE_KEYS.INDEX);
                if (indexData) {
                    indexSize = indexData.length * 2; // UTF-16编码
                    totalSize += indexSize;
                }

                // 计算配置大小
                const configData = localStorage.getItem(STORAGE_KEYS.CONFIG);
                if (configData) {
                    configSize = configData.length * 2;
                    totalSize += configSize;
                }

                // 计算各批次数据大小
                const index = this.loadIndex();
                for (const batchId of Object.keys(index.batches)) {
                    const key = this.getBatchStorageKey(batchId);
                    const data = localStorage.getItem(key);
                    if (data) {
                        const size = data.length * 2;
                        batchesSize += size;
                        totalSize += size;
                    }
                }
            }
        } catch (error) {
            console.error('[CustomCardStorage] 存储使用情况计算失败:', error);
        }

        const config = this.getConfig();
        const availableSpace = Math.max(0, config.maxStorageSize - totalSize);

        return {
            totalSize,
            indexSize,
            batchesSize,
            configSize,
            availableSpace
        };
    }

    /**
     * 验证数据完整性
     */
    static validateIntegrity(): IntegrityReport {
        const issues: string[] = [];
        const orphanedKeys: string[] = [];
        const missingBatches: string[] = [];
        const corruptedBatches: string[] = [];

        try {
            const index = this.loadIndex();

            // 检查索引中的批次是否都有对应的数据
            for (const [batchId, batch] of Object.entries(index.batches)) {
                const batchData = this.loadBatch(batchId);
                if (!batchData) {
                    missingBatches.push(batchId);
                    issues.push(`批次 ${batchId} (${batch.name}) 索引存在但数据丢失`);
                } else {
                    // 验证批次数据结构
                    if (!batchData.metadata || !batchData.cards || !Array.isArray(batchData.cards)) {
                        corruptedBatches.push(batchId);
                        issues.push(`批次 ${batchId} 数据结构损坏`);
                    }
                }
            }

            // 检查localStorage中是否有孤立的批次数据
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(STORAGE_KEYS.BATCH_PREFIX)) {
                    const batchId = key.replace(STORAGE_KEYS.BATCH_PREFIX, '');
                    if (!index.batches[batchId]) {
                        orphanedKeys.push(key);
                        issues.push(`发现孤立的批次数据: ${key}`);
                    }
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            issues.push(`完整性检查失败: ${errorMessage}`);
        }

        return {
            isValid: issues.length === 0,
            issues,
            orphanedKeys,
            missingBatches,
            corruptedBatches
        };
    }

    /**
     * 清理孤立数据
     */
    static cleanupOrphanedData(): CleanupReport {
        const removedKeys: string[] = [];
        const errors: string[] = [];
        let freedSpace = 0;

        try {
            const integrity = this.validateIntegrity();

            // 清理孤立的批次数据
            for (const key of integrity.orphanedKeys) {
                try {
                    // Calculate freed space before removal
                    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
                        const data = localStorage.getItem(key);
                        if (data) {
                            freedSpace += data.length * 2;
                        }
                    }
                    safeRemoveItem(key);
                    removedKeys.push(key);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    errors.push(`清理键 ${key} 失败: ${errorMessage}`);
                }
            }

            // 从索引中移除丢失的批次
            if (integrity.missingBatches.length > 0) {
                const index = this.loadIndex();
                let updated = false;

                for (const batchId of integrity.missingBatches) {
                    if (index.batches[batchId]) {
                        const batch = index.batches[batchId];
                        delete index.batches[batchId];
                        index.totalBatches--;
                        index.totalCards -= batch.cardCount;
                        updated = true;
                    }
                }

                if (updated) {
                    this.saveIndex(index);
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push(`清理操作失败: ${errorMessage}`);
        }

        return {
            removedKeys,
            freedSpace,
            errors
        };
    }

    /**
     * 生成唯一的批次ID
     */
    static generateBatchId(): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 5);
        return `batch_${timestamp}_${random}`;
    }

    /**
     * 检查存储空间是否足够
     */
    static checkStorageSpace(requiredSize: number): boolean {
        try {
            const stats = this.calculateStorageUsage();
            return stats.availableSpace >= requiredSize;
        } catch (error) {
            console.error('[CustomCardStorage] 存储空间检查失败:', error);
            return false;
        }
    }

    /**
     * 获取格式化的存储使用情况
     */
    static getFormattedStorageInfo(): {
        used: string;
        available: string;
        total: string;
        usagePercent: number;
    } {
        const stats = this.calculateStorageUsage();
        const config = this.getConfig();

        const formatSize = (bytes: number): string => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        const usagePercent = Math.round((stats.totalSize / config.maxStorageSize) * 100);

        return {
            used: formatSize(stats.totalSize),
            available: formatSize(stats.availableSpace),
            total: formatSize(config.maxStorageSize),
            usagePercent
        };
    }

    /**
     * 清空所有自定义卡牌数据（保留内置卡牌）
     */
    static clearAllData(): void {
        try {
            const index = this.loadIndex();

            // 删除所有非系统批次数据
            for (const batchId of Object.keys(index.batches)) {
                const batch = index.batches[batchId];
                // 跳过系统内置卡包
                if (batch.isSystemBatch === true) {
                    console.log(`[CustomCardStorage] 跳过删除系统内置卡包: ${batchId}`);
                    continue;
                }
                this.removeBatch(batchId);
            }

            // 重新计算索引，只保留系统批次
            const newIndex = this.loadIndex();
            const systemBatches: Record<string, ImportBatch> = {};
            let systemCardCount = 0;
            let systemBatchCount = 0;

            for (const [batchId, batch] of Object.entries(newIndex.batches)) {
                if (batch.isSystemBatch === true) {
                    systemBatches[batchId] = batch;
                    systemCardCount += batch.cardCount;
                    systemBatchCount++;
                }
            }

            newIndex.batches = systemBatches;
            newIndex.totalCards = systemCardCount;
            newIndex.totalBatches = systemBatchCount;
            newIndex.lastUpdate = new Date().toISOString();

            this.saveIndex(newIndex);

            // 清空批次自定义字段存储（只删除非系统批次）
            if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
                // 处理自定义字段存储
                const allCustomFields: AllCustomFieldsByBatch = safeGetItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH, {});
                const systemCustomFields: AllCustomFieldsByBatch = {};

                // 只保留系统批次的自定义字段定义
                for (const batchId in allCustomFields) {
                    if (systemBatches[batchId]) {
                        systemCustomFields[batchId] = allCustomFields[batchId];
                    }
                }

                safeSetItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH, systemCustomFields);

                // 处理变体类型存储
                const allVariantTypes: AllVariantTypesByBatch = safeGetItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH, {});
                const systemVariantTypes: AllVariantTypesByBatch = {};

                // 只保留系统批次的变体类型定义
                for (const batchId in allVariantTypes) {
                    if (systemBatches[batchId]) {
                        systemVariantTypes[batchId] = allVariantTypes[batchId];
                    }
                }

                safeSetItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH, systemVariantTypes);
            }

            console.log(`[CustomCardStorage] 清空完成，保留 ${systemBatchCount} 个系统批次，${systemCardCount} 张系统卡牌`);

        } catch (error) {
            console.error('[CustomCardStorage] 清空数据失败:', error);
            throw new Error('无法清空自定义卡牌数据');
        }
    }
}
