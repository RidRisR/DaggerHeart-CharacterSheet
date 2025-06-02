/**
 * 自定义卡牌存储抽象层
 * 提供对localStorage的抽象操作，管理自定义卡牌的存储架构
 */

// 调试日志标记
const DEBUG_CARD_STORAGE = true;
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
    CUSTOM_FIELDS_BY_BATCH: 'daggerheart_custom_fields_by_batch' // New key for batch-based custom fields
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
            const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH);
            const allFields: AllCustomFieldsByBatch = stored ? JSON.parse(stored) : {};

            logDebug('saveCustomFieldsForBatch', {
                beforeSave: allFields,
                storageKey: STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH
            });

            // 设置此批次的自定义字段
            allFields[batchId] = definitions;

            // 保存更新后的数据
            localStorage.setItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH, JSON.stringify(allFields));

            // 验证保存
            const verification = localStorage.getItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH);
            const parsedVerification = verification ? JSON.parse(verification) : {};

            logDebug('saveCustomFieldsForBatch', {
                afterSave: parsedVerification,
                savedSuccessfully: JSON.stringify(allFields) === verification,
                batchDefinitions: parsedVerification[batchId]
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
            const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH);
            if (!stored) {
                logDebug('removeCustomFieldsForBatch', 'no stored data found');
                return;
            }

            const allFields: AllCustomFieldsByBatch = JSON.parse(stored);
            logDebug('removeCustomFieldsForBatch', { beforeRemoval: allFields });

            // 删除指定批次的自定义字段
            if (allFields[batchId]) {
                delete allFields[batchId];
                localStorage.setItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH, JSON.stringify(allFields));

                // 验证删除
                const verification = localStorage.getItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH);
                const parsedVerification = verification ? JSON.parse(verification) : {};

                logDebug('removeCustomFieldsForBatch', {
                    afterRemoval: parsedVerification,
                    batchRemoved: !(batchId in parsedVerification)
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
            const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH);
            if (!stored) {
                logDebug('getAggregatedCustomFieldNames', 'no custom fields stored');
                return {};
            }

            const allFieldsByBatch: AllCustomFieldsByBatch = JSON.parse(stored);
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

            // 清空批次自定义字段存储
            if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
                localStorage.removeItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH);
            }

            console.log(`[CustomCardStorage] 清空完成，保留 ${systemBatchCount} 个系统批次，${systemCardCount} 张系统卡牌`);

        } catch (error) {
            console.error('[CustomCardStorage] 清空数据失败:', error);
            throw new Error('无法清空自定义卡牌数据');
        }
    }
}
