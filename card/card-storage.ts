/**
 * 自定义卡牌存储抽象层
 * 提供对localStorage的抽象操作，管理自定义卡牌的存储架构
 */

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
    // 这两个键将被弃用，保留是为了向后兼容
    CUSTOM_FIELDS_BY_BATCH: 'daggerheart_custom_fields_by_batch', // DEPRECATED: 自定义字段定义现在存储在各批次的数据中
    VARIANT_TYPES_BY_BATCH: 'daggerheart_variant_types_by_batch' // DEPRECATED: 变体类型定义现在存储在各批次的数据中
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
    customFieldDefinitions?: CustomFieldsForBatch; // 自定义字段定义
    variantTypes?: VariantTypesForBatch; // 变体类型定义
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
    static removeCustomFieldsForBatch(batchId: string) {
        throw new Error('Method not implemented.');
    }
    static removeVariantTypesForBatch(batchId: string) {
        throw new Error('Method not implemented.');
    }

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
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.INDEX);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('[CustomCardStorage] 索引加载失败:', error);
        }
        // 返回默认索引结构
        return {
            batches: {},
            totalCards: 0,
            totalBatches: 0,
            lastUpdate: new Date().toISOString()
        };
    }

    /**
     * 保存主索引
     */
    static saveIndex(index: CustomCardIndex): void {
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
        try {
            index.lastUpdate = new Date().toISOString();
            localStorage.setItem(STORAGE_KEYS.INDEX, JSON.stringify(index));
        } catch (error) {
            console.error('[CustomCardStorage] 索引保存失败:', error);
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
            const jsonData = JSON.stringify(data);

            // 检查存储空间
            const config = this.getConfig();
            const currentUsage = this.calculateStorageUsage();
            const dataSize = jsonData.length * 2; // UTF-16编码

            if (currentUsage.totalSize + dataSize > config.maxStorageSize) {
                throw new Error(`存储空间不足。当前使用: ${(currentUsage.totalSize / 1024 / 1024).toFixed(2)}MB, 需要: ${(dataSize / 1024 / 1024).toFixed(2)}MB`);
            }

            localStorage.setItem(key, jsonData);
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
        try {
            const key = this.getBatchStorageKey(batchId);
            console.log(`[CustomCardStorage] 加载批次 ${batchId}，存储键: ${key}`);
            const stored = localStorage.getItem(key);
            if (stored) {
                console.log(`[CustomCardStorage] 批次 ${batchId} 原始数据长度: ${stored.length}`);
                const parsed = JSON.parse(stored);
                console.log(`[CustomCardStorage] 批次 ${batchId} 解析后数据:`, {
                    hasMetadata: !!parsed.metadata,
                    hasCards: !!parsed.cards,
                    cardsLength: parsed.cards ? parsed.cards.length : 'N/A'
                });
                return parsed;
            } else {
                console.warn(`[CustomCardStorage] 批次 ${batchId} 在localStorage中不存在`);
                return null;
            }
        } catch (error) {
            console.error(`[CustomCardStorage] 批次 ${batchId} 加载失败:`, error);
            return null;
        }
    }

    /**
     * 删除批次数据
     */
    static removeBatch(batchId: string): void {
        const key = this.getBatchStorageKey(batchId);
        localStorage.removeItem(key);
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
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.CONFIG);
            if (stored) {
                const config = JSON.parse(stored);
                return { ...DEFAULT_CONFIG, ...config };
            }
        } catch (error) {
            console.error('[CustomCardStorage] 配置加载失败:', error);
        }

        return { ...DEFAULT_CONFIG };
    }

    /**
     * 设置存储配置
     */
    static setConfig(config: Partial<StorageConfig>): void {
        try {
            const currentConfig = this.getConfig();
            const newConfig = { ...currentConfig, ...config };
            localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(newConfig));
        } catch (error) {
            console.error('[CustomCardStorage] 配置保存失败:', error);
            throw new Error('无法保存存储配置');
        }
    }

    // ===== 新增：按批次的自定义字段名操作 =====

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
            // 优先尝试从批次数据中读取（新版存储结构）
            const fromBatches = this.getAggregatedCustomFieldNamesFromBatches();

            // 检查是否有数据，如果有，则直接返回
            const categoriesCount = Object.keys(fromBatches).length;
            if (categoriesCount > 0) {
                logDebug('getAggregatedCustomFieldNames', {
                    source: 'from batches',
                    categoriesCount
                });
                return fromBatches;
            }

            // 如果没有数据，尝试从旧版存储中读取
            // 加载所有批次的自定义字段
            const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH);
            if (!stored) {
                logDebug('getAggregatedCustomFieldNames', 'no custom fields stored');
                return {};
            }

            const allFieldsByBatch: AllCustomFieldsByBatch = JSON.parse(stored);
            logDebug('getAggregatedCustomFieldNames', {
                source: 'legacy storage',
                allFieldsByBatch
            });

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
            // 优先尝试从批次数据中读取（新版存储结构）
            const fromBatches = this.getAggregatedCustomFieldNamesWithTempFromBatches(tempBatchId, tempDefinitions);

            // 检查是否有数据，如果有，则直接返回
            const categoriesCount = Object.keys(fromBatches).length;
            if (categoriesCount > 0 || (tempDefinitions && Object.keys(tempDefinitions).length > 0)) {
                logDebug('getAggregatedCustomFieldNamesWithTemp', {
                    source: 'from batches',
                    categoriesCount
                });
                return fromBatches;
            }

            // 如果没有数据且没有临时定义，尝试从旧版存储中读取
            // 加载所有批次的自定义字段
            const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH);
            if (!stored) {
                logDebug('getAggregatedCustomFieldNamesWithTemp', 'no custom fields stored');
                return {};
            }

            const allFieldsByBatch: AllCustomFieldsByBatch = JSON.parse(stored);
            logDebug('getAggregatedCustomFieldNamesWithTemp', {
                source: 'legacy storage',
                allFieldsByBatch
            });

            // 加载主索引以检查批次状态
            const index = this.loadIndex();
            logDebug('getAggregatedCustomFieldNamesWithTemp', {
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
                    logDebug('getAggregatedCustomFieldNamesWithTemp', {
                        batchId,
                        status: !batchInfo ? 'not found in index' : 'disabled',
                        skipped: true
                    });
                    continue;
                }

                const batchFields = allFieldsByBatch[batchId];
                logDebug('getAggregatedCustomFieldNamesWithTemp', {
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

            logDebug('getAggregatedCustomFieldNamesWithTemp', { result: aggregatedFields });

            return aggregatedFields;
        } catch (error) {
            console.error('[CustomCardStorage] 聚合自定义字段名加载失败:', error);
            return {};
        }
    }


    // ===== 新版：获取聚合的自定义字段名称（来自所有启用的批次） =====

    /**
     * 新版：获取聚合的自定义字段名称（来自所有启用的批次）
     * 直接从批次数据中读取，而不是从独立存储中读取
     */
    static getAggregatedCustomFieldNamesFromBatches(): CustomFieldNamesStore {
        logDebug('getAggregatedCustomFieldNamesFromBatches', 'starting aggregation');

        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            logDebug('getAggregatedCustomFieldNamesFromBatches', 'localStorage unavailable');
            return {};
        }

        try {
            // 加载索引以获取所有批次ID和状态
            const index = this.loadIndex();
            const enabledBatchIds = Object.keys(index.batches)
                .filter(batchId => !index.batches[batchId].disabled);

            logDebug('getAggregatedCustomFieldNamesFromBatches', {
                totalBatches: Object.keys(index.batches).length,
                enabledBatches: enabledBatchIds.length
            });

            // 初始化聚合结果
            const aggregatedFields: CustomFieldNamesStore = {};

            // 遍历所有启用的批次
            for (const batchId of enabledBatchIds) {
                // 加载批次数据
                const batchData = this.loadBatch(batchId);
                if (!batchData || !batchData.customFieldDefinitions) {
                    logDebug('getAggregatedCustomFieldNamesFromBatches', {
                        batchId,
                        status: !batchData ? 'batch data not found' : 'no custom fields',
                        skipped: true
                    });
                    continue;
                }

                const batchFields = batchData.customFieldDefinitions;
                logDebug('getAggregatedCustomFieldNamesFromBatches', {
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

            logDebug('getAggregatedCustomFieldNamesFromBatches', { result: aggregatedFields });

            return aggregatedFields;
        } catch (error) {
            console.error('[CustomCardStorage] 聚合自定义字段名加载失败:', error);
            return {};
        }
    }

    /**
     * 新版：获取聚合的自定义字段名称（包含临时批次定义，用于验证阶段）
     * 直接从批次数据中读取，而不是从独立存储中读取
     */
    static getAggregatedCustomFieldNamesWithTempFromBatches(
        tempBatchId?: string,
        tempDefinitions?: CustomFieldsForBatch
    ): CustomFieldNamesStore {
        logDebug('getAggregatedCustomFieldNamesWithTempFromBatches', { tempBatchId, tempDefinitions });

        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            logDebug('getAggregatedCustomFieldNamesWithTempFromBatches', 'localStorage unavailable');
            // 如果没有localStorage，至少返回临时定义
            return tempDefinitions || {};
        }

        try {
            // 首先获取现有的聚合字段
            const existingFields = this.getAggregatedCustomFieldNamesFromBatches();

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

            logDebug('getAggregatedCustomFieldNamesWithTempFromBatches', {
                existingFields,
                tempDefinitions,
                mergedFields
            });

            return mergedFields;
        } catch (error) {
            logDebug('getAggregatedCustomFieldNamesWithTempFromBatches', { error });
            console.error('[CustomCardStorage] 聚合自定义字段名加载失败:', error);
            // 出错时至少返回临时定义
            return tempDefinitions || {};
        }
    }


    // ===== 新增：按批次的变体类型定义操作 =====

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
            // 优先尝试从批次数据中读取（新版存储结构）
            const fromBatches = this.getAggregatedVariantTypesFromBatches();

            // 检查是否有数据，如果有，则直接返回
            const typesCount = Object.keys(fromBatches).length;
            if (typesCount > 0) {
                logDebug('getAggregatedVariantTypes', {
                    source: 'from batches',
                    typesCount
                });
                return fromBatches;
            }

            // 如果没有数据，尝试从旧版存储中读取
            // 加载所有批次的变体类型定义
            const stored = localStorage.getItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH);
            if (!stored) {
                logDebug('getAggregatedVariantTypes', 'no variant types stored');
                return {};
            }

            const allVariantTypesByBatch: AllVariantTypesByBatch = JSON.parse(stored);
            logDebug('getAggregatedVariantTypes', {
                source: 'legacy storage',
                allVariantTypesByBatch
            });

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
            // 优先尝试从批次数据中读取（新版存储结构）
            const fromBatches = this.getAggregatedVariantTypesWithTempFromBatches(tempBatchId, tempDefinitions);

            // 检查是否有数据，如果有，则直接返回
            const typesCount = Object.keys(fromBatches).length;
            if (typesCount > 0 || (tempDefinitions && Object.keys(tempDefinitions).length > 0)) {
                logDebug('getAggregatedVariantTypesWithTemp', {
                    source: 'from batches',
                    typesCount
                });
                return fromBatches;
            }

            // 如果没有数据且没有临时定义，尝试从旧版存储中读取
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
                existingTypes: Object.keys(existingTypes),
                tempDefinitions: Object.keys(tempDefinitions || {}),
                mergedTypes: Object.keys(mergedTypes)
            });

            return mergedTypes;
        } catch (error) {
            logDebug('getAggregatedVariantTypesWithTemp', { error });
            console.error('[CustomCardStorage] 聚合变体类型定义加载失败:', error);
            // 出错时至少返回临时定义
            return tempDefinitions || {};
        }
    }


    // ===== 新版：获取聚合的变体类型定义（来自所有启用的批次） =====

    /**
     * 新版：获取聚合的变体类型定义（来自所有启用的批次）
     * 直接从批次数据中读取，而不是从独立存储中读取
     */
    static getAggregatedVariantTypesFromBatches(): VariantTypesForBatch {
        logDebug('getAggregatedVariantTypesFromBatches', 'starting aggregation');

        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            logDebug('getAggregatedVariantTypesFromBatches', 'localStorage unavailable');
            return {};
        }

        try {
            // 加载索引以获取所有批次ID和状态
            const index = this.loadIndex();
            const enabledBatchIds = Object.keys(index.batches)
                .filter(batchId => !index.batches[batchId].disabled);

            logDebug('getAggregatedVariantTypesFromBatches', {
                totalBatches: Object.keys(index.batches).length,
                enabledBatches: enabledBatchIds.length
            });

            // 初始化聚合结果
            const aggregatedTypes: VariantTypesForBatch = {};

            // 遍历所有启用的批次
            for (const batchId of enabledBatchIds) {
                // 加载批次数据
                const batchData = this.loadBatch(batchId);
                if (!batchData || !batchData.variantTypes) {
                    logDebug('getAggregatedVariantTypesFromBatches', {
                        batchId,
                        status: !batchData ? 'batch data not found' : 'no variant types',
                        skipped: true
                    });
                    continue;
                }

                const batchTypes = batchData.variantTypes;
                logDebug('getAggregatedVariantTypesFromBatches', {
                    batchId,
                    enabled: true,
                    batchTypes: Object.keys(batchTypes)
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

            logDebug('getAggregatedVariantTypesFromBatches', {
                result: Object.keys(aggregatedTypes)
            });

            return aggregatedTypes;
        } catch (error) {
            console.error('[CustomCardStorage] 聚合变体类型定义加载失败:', error);
            return {};
        }
    }

    /**
     * 新版：获取聚合的变体类型定义（包含临时批次定义，用于验证阶段）
     * 直接从批次数据中读取，而不是从独立存储中读取
     */
    static getAggregatedVariantTypesWithTempFromBatches(
        tempBatchId?: string,
        tempDefinitions?: VariantTypesForBatch
    ): VariantTypesForBatch {
        logDebug('getAggregatedVariantTypesWithTempFromBatches', { tempBatchId, tempDefinitions });

        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            logDebug('getAggregatedVariantTypesWithTempFromBatches', 'localStorage unavailable');
            // 如果没有localStorage，至少返回临时定义
            return tempDefinitions || {};
        }

        try {
            // 首先获取现有的聚合变体类型
            const existingTypes = this.getAggregatedVariantTypesFromBatches();

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

            logDebug('getAggregatedVariantTypesWithTempFromBatches', {
                existingTypes: Object.keys(existingTypes),
                tempDefinitions: Object.keys(tempDefinitions || {}),
                mergedTypes: Object.keys(mergedTypes)
            });

            return mergedTypes;
        } catch (error) {
            logDebug('getAggregatedVariantTypesWithTempFromBatches', { error });
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
            // 计算索引大小
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
                    const data = localStorage.getItem(key);
                    if (data) {
                        freedSpace += data.length * 2;
                    }
                    localStorage.removeItem(key);
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

            // 检查是否存在旧格式的数据，如果所有批次已迁移，则清理旧格式数据
            const MIGRATION_MARKER = 'daggerheart_storage_migrated_v2_0';
            const isMigrated = localStorage.getItem(MIGRATION_MARKER) === 'true';

            if (isMigrated) {
                // 检查旧的自定义字段存储
                const oldCustomFields = localStorage.getItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH);
                if (oldCustomFields) {
                    try {
                        freedSpace += oldCustomFields.length * 2;
                        localStorage.removeItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH);
                        removedKeys.push(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH);
                        logDebug('cleanupOrphanedData', 'removed old custom fields storage');
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        errors.push(`清理旧自定义字段存储失败: ${errorMessage}`);
                    }
                }

                // 检查旧的变体类型存储
                const oldVariantTypes = localStorage.getItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH);
                if (oldVariantTypes) {
                    try {
                        freedSpace += oldVariantTypes.length * 2;
                        localStorage.removeItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH);
                        removedKeys.push(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH);
                        logDebug('cleanupOrphanedData', 'removed old variant types storage');
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        errors.push(`清理旧变体类型存储失败: ${errorMessage}`);
                    }
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

            // 清空批次自定义字段和变体类型存储（只删除非系统批次）
            // 注意：这是为了兼容旧版存储结构，在迁移完成后，这部分代码可以移除
            if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
                // 处理自定义字段存储
                const storedCustomFields = localStorage.getItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH);
                if (storedCustomFields) {
                    const allCustomFields: AllCustomFieldsByBatch = JSON.parse(storedCustomFields);
                    const systemCustomFields: AllCustomFieldsByBatch = {};

                    // 只保留系统批次的自定义字段定义
                    for (const batchId in allCustomFields) {
                        if (systemBatches[batchId]) {
                            systemCustomFields[batchId] = allCustomFields[batchId];
                        }
                    }

                    localStorage.setItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH, JSON.stringify(systemCustomFields));
                }

                // 处理变体类型存储
                const storedVariantTypes = localStorage.getItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH);
                if (storedVariantTypes) {
                    const allVariantTypes: AllVariantTypesByBatch = JSON.parse(storedVariantTypes);
                    const systemVariantTypes: AllVariantTypesByBatch = {};

                    // 只保留系统批次的变体类型定义
                    for (const batchId in allVariantTypes) {
                        if (systemBatches[batchId]) {
                            systemVariantTypes[batchId] = allVariantTypes[batchId];
                        }
                    }

                    localStorage.setItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH, JSON.stringify(systemVariantTypes));
                }
            }

            console.log(`[CustomCardStorage] 清空完成，保留 ${systemBatchCount} 个系统批次，${systemCardCount} 张系统卡牌`);

        } catch (error) {
            console.error('[CustomCardStorage] 清空数据失败:', error);
            throw new Error('无法清空自定义卡牌数据');
        }
    }

    /**
     * 迁移数据到新的存储结构（v1.x -> v2.x）
     * 将独立存储的自定义字段和变体类型数据合并到各批次的主数据中
     */
    static migrateToIntegratedStorage(): {
        migrated: boolean;
        batchesUpdated: string[];
        errors: string[];
    } {
        logDebug('migrateToIntegratedStorage', 'starting migration');

        const MIGRATION_MARKER = 'daggerheart_storage_migrated_v2_0';
        const batchesUpdated: string[] = [];
        const errors: string[] = [];

        // 如果不在浏览器环境或已经迁移过，则跳过
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            logDebug('migrateToIntegratedStorage', 'not in browser environment, skipping');
            return { migrated: false, batchesUpdated: [], errors: ['Not in browser environment'] };
        }

        // 检查是否已经迁移过
        if (localStorage.getItem(MIGRATION_MARKER)) {
            logDebug('migrateToIntegratedStorage', 'already migrated, skipping');
            return { migrated: false, batchesUpdated: [], errors: [] };
        }

        try {
            // 检查是否存在旧的数据结构
            const hasCustomFields = !!localStorage.getItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH);
            const hasVariantTypes = !!localStorage.getItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH);

            if (!hasCustomFields && !hasVariantTypes) {
                logDebug('migrateToIntegratedStorage', 'no old data found, marking as migrated');
                localStorage.setItem(MIGRATION_MARKER, 'true');
                return { migrated: true, batchesUpdated: [], errors: [] };
            }

            // 加载旧数据
            const allOldCustomFields: AllCustomFieldsByBatch =
                hasCustomFields
                    ? JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH) || '{}')
                    : {};

            const allOldVariantTypes: AllVariantTypesByBatch =
                hasVariantTypes
                    ? JSON.parse(localStorage.getItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH) || '{}')
                    : {};

            // 加载索引
            const index = this.loadIndex();
            const batchIds = Object.keys(index.batches);

            logDebug('migrateToIntegratedStorage', {
                customFieldBatchIds: Object.keys(allOldCustomFields),
                variantTypeBatchIds: Object.keys(allOldVariantTypes),
                indexBatchIds: batchIds
            });

            // 合并所有批次ID（索引中的和旧数据中的）
            const allBatchIds = new Set([
                ...batchIds,
                ...Object.keys(allOldCustomFields),
                ...Object.keys(allOldVariantTypes)
            ]);

            // 处理每个批次
            for (const batchId of allBatchIds) {
                try {
                    // 加载批次数据
                    const batchData = this.loadBatch(batchId);

                    // 如果批次数据不存在，但存在旧的自定义字段或变体类型数据，则记录错误
                    if (!batchData) {
                        if (allOldCustomFields[batchId] || allOldVariantTypes[batchId]) {
                            const errorMsg = `批次 ${batchId} 不存在，但有孤立的自定义字段或变体类型数据`;
                            logDebug('migrateToIntegratedStorage', { error: errorMsg, batchId });
                            errors.push(errorMsg);
                        }
                        continue;
                    }

                    let updated = false;

                    // 合并自定义字段
                    if (allOldCustomFields[batchId]) {
                        batchData.customFieldDefinitions = allOldCustomFields[batchId];
                        updated = true;
                        logDebug('migrateToIntegratedStorage', {
                            action: 'merged custom fields',
                            batchId,
                            fields: allOldCustomFields[batchId]
                        });
                    }

                    // 合并变体类型
                    if (allOldVariantTypes[batchId]) {
                        batchData.variantTypes = allOldVariantTypes[batchId];
                        updated = true;
                        logDebug('migrateToIntegratedStorage', {
                            action: 'merged variant types',
                            batchId,
                            types: Object.keys(allOldVariantTypes[batchId])
                        });
                    }

                    // 如果有更新，保存批次数据
                    if (updated) {
                        this.saveBatch(batchId, batchData);
                        batchesUpdated.push(batchId);
                        logDebug('migrateToIntegratedStorage', {
                            action: 'saved updated batch',
                            batchId
                        });
                    }
                } catch (error) {
                    const errorMsg = `处理批次 ${batchId} 时出错: ${error instanceof Error ? error.message : String(error)}`;
                    logDebug('migrateToIntegratedStorage', { error: errorMsg, batchId });
                    errors.push(errorMsg);
                }
            }

            // 如果没有错误，删除旧数据并标记为已迁移
            if (errors.length === 0) {
                if (hasCustomFields) {
                    localStorage.removeItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH);
                    logDebug('migrateToIntegratedStorage', 'removed old custom fields storage');
                }

                if (hasVariantTypes) {
                    localStorage.removeItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH);
                    logDebug('migrateToIntegratedStorage', 'removed old variant types storage');
                }

                localStorage.setItem(MIGRATION_MARKER, 'true');
                logDebug('migrateToIntegratedStorage', 'migration completed successfully');
            } else {
                logDebug('migrateToIntegratedStorage', {
                    warning: 'migration completed with errors, old data preserved',
                    errors
                });
            }

            return {
                migrated: true,
                batchesUpdated,
                errors
            };

        } catch (error) {
            const errorMsg = `迁移失败: ${error instanceof Error ? error.message : String(error)}`;
            logDebug('migrateToIntegratedStorage', { error: errorMsg });
            errors.push(errorMsg);
            return {
                migrated: false,
                batchesUpdated,
                errors
            };
        }
    }

    /**
     * 初始化存储系统
     * 在应用启动时调用，执行必要的迁移和清理操作
     */
    static initialize(): {
        initialized: boolean;
        migrationResult?: {
            migrated: boolean;
            batchesUpdated: string[];
            errors: string[];
        };
        errors: string[];
    } {
        logDebug('initialize', 'starting initialization');
        const errors: string[] = [];

        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            logDebug('initialize', 'not in browser environment, skipping');
            return { initialized: false, errors: ['Not in browser environment'] };
        }

        try {
            // 1. 执行数据迁移（从旧存储结构迁移到新存储结构）
            const migrationResult = this.migrateToIntegratedStorage();

            if (migrationResult.errors.length > 0) {
                logDebug('initialize', {
                    message: 'migration errors encountered',
                    errors: migrationResult.errors
                });
                errors.push(...migrationResult.errors);
            } else if (migrationResult.migrated) {
                logDebug('initialize', {
                    message: 'migration completed successfully',
                    batchesUpdated: migrationResult.batchesUpdated
                });
            } else {
                logDebug('initialize', 'migration skipped (already migrated or no data)');
            }

            // 2. 执行存储清理（清理孤立数据等）
            const cleanupReport = this.cleanupOrphanedData();

            if (cleanupReport.errors.length > 0) {
                logDebug('initialize', {
                    message: 'cleanup errors encountered',
                    errors: cleanupReport.errors
                });
                errors.push(...cleanupReport.errors);
            } else if (cleanupReport.removedKeys.length > 0) {
                logDebug('initialize', {
                    message: 'cleanup completed',
                    removedKeys: cleanupReport.removedKeys,
                    freedSpace: cleanupReport.freedSpace
                });
            } else {
                logDebug('initialize', 'no orphaned data found');
            }

            // 3. 验证数据完整性
            const integrityReport = this.validateIntegrity();

            if (!integrityReport.isValid) {
                logDebug('initialize', {
                    message: 'integrity issues found',
                    issues: integrityReport.issues
                });
                errors.push(...integrityReport.issues);
            } else {
                logDebug('initialize', 'data integrity verified');
            }

            return {
                initialized: true,
                migrationResult,
                errors
            };
        } catch (error) {
            const errorMsg = `初始化失败: ${error instanceof Error ? error.message : String(error)}`;
            logDebug('initialize', { error: errorMsg });
            errors.push(errorMsg);
            return {
                initialized: false,
                errors
            };
        }
    }

    /**
     * 更新批次的自定义字段定义（新版方法）
     * 直接更新批次数据，而不是单独存储
     */
    static updateBatchCustomFields(batchId: string, definitions: CustomFieldsForBatch): void {
        logDebug('updateBatchCustomFields', { batchId, definitions });

        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            logDebug('updateBatchCustomFields', 'localStorage unavailable');
            return;
        }

        try {
            // 加载批次数据
            let batchData = this.loadBatch(batchId);
            
            // 如果批次不存在，创建一个新批次（这可能发生在种子化内置卡牌时）
            if (!batchData) {
                logDebug('updateBatchCustomFields', { message: 'batch not found, creating new', batchId });
                batchData = {
                    metadata: {
                        id: batchId,
                        fileName: `${batchId}.json`,
                        importTime: new Date().toISOString()
                    },
                    cards: []
                };
            }

            // 更新自定义字段定义
            batchData.customFieldDefinitions = definitions;

            // 保存批次数据
            this.saveBatch(batchId, batchData);

            logDebug('updateBatchCustomFields', {
                action: 'updated batch custom fields',
                batchId,
                definitions
            });

            // 向后兼容：同时更新旧版存储中的数据
            // 直接操作旧存储，而不是调用 saveCustomFieldsForBatch 以避免循环引用
            try {
                const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH);
                const allFields: AllCustomFieldsByBatch = stored ? JSON.parse(stored) : {};
                
                if (JSON.stringify(allFields[batchId]) !== JSON.stringify(definitions)) {
                    allFields[batchId] = definitions;
                    localStorage.setItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH, JSON.stringify(allFields));
                    
                    logDebug('updateBatchCustomFields', {
                        message: 'also updated old storage for compatibility',
                        storageKey: STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH
                    });
                } else {
                    logDebug('updateBatchCustomFields', {
                        message: 'definitions unchanged, skipping save to old storage',
                        storageKey: STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH
                    });
                }
            } catch (error) {
                console.warn('[CustomCardStorage] 更新旧自定义字段存储失败 (非致命错误):', error);
                // 旧存储更新失败不阻止主要存储的成功
            }

        } catch (error) {
            logDebug('updateBatchCustomFields', { error });
            console.error(`[CustomCardStorage] 批次 ${batchId} 的自定义字段更新失败:`, error);
            throw new Error(`无法更新批次 ${batchId} 的自定义字段: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 更新批次的变体类型定义（新版方法）
     * 直接更新批次数据，而不是单独存储
     */
    static updateBatchVariantTypes(batchId: string, variantTypes: VariantTypesForBatch): void {
        logDebug('updateBatchVariantTypes', { batchId, variantTypes: Object.keys(variantTypes) });

        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            logDebug('updateBatchVariantTypes', 'localStorage unavailable');
            return;
        }

        try {
            // 加载批次数据
            let batchData = this.loadBatch(batchId);
            
            // 如果批次不存在，创建一个新批次（这可能发生在种子化内置卡牌时）
            if (!batchData) {
                logDebug('updateBatchVariantTypes', { message: 'batch not found, creating new', batchId });
                batchData = {
                    metadata: {
                        id: batchId,
                        fileName: `${batchId}.json`,
                        importTime: new Date().toISOString()
                    },
                    cards: []
                };
            }

            // 更新变体类型定义
            batchData.variantTypes = variantTypes;

            // 保存批次数据
            this.saveBatch(batchId, batchData);

            logDebug('updateBatchVariantTypes', {
                action: 'updated batch variant types',
                batchId,
                variantTypesCount: Object.keys(variantTypes).length
            });

            // 向后兼容：同时更新旧版存储中的数据
            // 直接操作旧存储，而不是调用 saveVariantTypesForBatch 以避免循环引用
            try {
                const stored = localStorage.getItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH);
                const allVariantTypes: AllVariantTypesByBatch = stored ? JSON.parse(stored) : {};
                
                allVariantTypes[batchId] = variantTypes;
                localStorage.setItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH, JSON.stringify(allVariantTypes));
                
                logDebug('updateBatchVariantTypes', {
                    message: 'also updated old storage for compatibility',
                    storageKey: STORAGE_KEYS.VARIANT_TYPES_BY_BATCH
                });
            } catch (error) {
                console.warn('[CustomCardStorage] 更新旧变体类型存储失败 (非致命错误):', error);
                // 旧存储更新失败不阻止主要存储的成功
            }

        } catch (error) {
            logDebug('updateBatchVariantTypes', { error });
            console.error(`[CustomCardStorage] 批次 ${batchId} 的变体类型定义更新失败:`, error);
            throw new Error(`无法更新批次 ${batchId} 的变体类型定义: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
