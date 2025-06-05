/**
 * localStorage 存储架构迁移工具
 * 负责将旧的分散存储结构迁移到新的统一存储结构
 */

// 调试日志标记
const DEBUG_MIGRATION = true;
const logMigration = (operation: string, details: any) => {
    if (DEBUG_MIGRATION) {
        console.log(`[StorageMigration:${operation}]`, details);
    }
};

// 新的存储键定义
export const NEW_STORAGE_KEYS = {
    INDEX: 'DHCS_BATCH_INDEX',                    // 批次索引（保留但简化）
    CONFIG: 'DHCS_GLOBAL_CONFIG',                 // 全局配置
    BATCH_DATA_PREFIX: 'DHCS_BATCH_DATA_',        // 统一批次数据前缀
} as const;

// 旧的存储键定义（用于迁移）
export const OLD_STORAGE_KEYS = {
    INDEX: 'daggerheart_custom_cards_index',
    BATCH_PREFIX: 'daggerheart_custom_cards_batch_',
    CONFIG: 'daggerheart_custom_cards_config',
    CUSTOM_FIELDS_BY_BATCH: 'daggerheart_custom_fields_by_batch',
    VARIANT_TYPES_BY_BATCH: 'daggerheart_variant_types_by_batch',
} as const;

// 新的统一批次数据结构
export interface UnifiedBatchData {
    metadata: BatchMetadata;
    cards: any[]; // StandardCard[] - 避免循环依赖
    customFields: Record<string, string[]>; // CustomFieldDefinition[]
    variantTypes: Record<string, any>; // VariantTypeDefinition[]
    enabled: boolean; // 是否启用此批次
    statistics: {
        totalCards: number;
        lastAccessTime: string;
        operationCount: number;
        createdTime: string;
    };
}

// 批次元数据
export interface BatchMetadata {
    id: string;
    name: string;
    fileName: string;
    importTime: string;
    version?: string;
    description?: string;
    author?: string;
    isSystemBatch?: boolean;
    cardCount: number;
    cardTypes: string[];
    size: number;
}

// 简化的索引结构
export interface SimplifiedIndex {
    batches: Record<string, BatchSummary>; // 只保留摘要信息
    statistics: {
        totalCards: number;
        totalBatches: number;
        lastUpdate: string;
        version: string; // 存储结构版本
    };
}

// 批次摘要信息
export interface BatchSummary {
    id: string;
    name: string;
    enabled: boolean;
    isSystemBatch?: boolean;
    cardCount: number;
    lastAccessTime: string;
    size: number;
}

// 迁移结果
export interface MigrationResult {
    success: boolean;
    migratedBatches: number;
    errors: string[];
    removedKeys: string[];
    totalSizeBefore: number;
    totalSizeAfter: number;
    migrationTime: number;
}

/**
 * 存储迁移管理器
 */
export class StorageMigration {
    private static readonly CURRENT_VERSION = '2.0.0';
    private static readonly MIGRATION_MARKER = 'DHCS_MIGRATION_V2_COMPLETED';

    /**
     * 检查是否需要迁移
     */
    static needsMigration(): boolean {
        try {
            // 检查迁移标记
            const migrationCompleted = localStorage.getItem(this.MIGRATION_MARKER);
            if (migrationCompleted) {
                logMigration('needsMigration', 'Migration already completed');
                return false;
            }

            // 检查是否存在旧格式数据
            const hasOldIndex = !!localStorage.getItem(OLD_STORAGE_KEYS.INDEX);
            const hasOldBatchData = this.findOldBatchKeys().length > 0;
            
            const needsMigration = hasOldIndex || hasOldBatchData;
            logMigration('needsMigration', {
                hasOldIndex,
                hasOldBatchData,
                oldBatchKeys: this.findOldBatchKeys().length,
                needsMigration
            });
            
            return needsMigration;
        } catch (error) {
            logMigration('needsMigration', { error });
            return false;
        }
    }

    /**
     * 执行迁移
     */
    static async migrate(): Promise<MigrationResult> {
        const startTime = Date.now();
        logMigration('migrate', 'Starting migration process');

        const result: MigrationResult = {
            success: false,
            migratedBatches: 0,
            errors: [],
            removedKeys: [],
            totalSizeBefore: 0,
            totalSizeAfter: 0,
            migrationTime: 0
        };

        try {
            // 计算迁移前大小
            result.totalSizeBefore = this.calculateStorageSize();

            // 第一步：加载旧数据
            const oldData = await this.loadOldData();
            logMigration('migrate', { oldDataSummary: {
                indexExists: !!oldData.index,
                batchCount: Object.keys(oldData.batches).length,
                customFieldBatches: Object.keys(oldData.customFields).length,
                variantTypeBatches: Object.keys(oldData.variantTypes).length
            }});

            // 第二步：转换数据格式
            const unifiedBatches = this.convertToUnifiedFormat(oldData);
            logMigration('migrate', { unifiedBatchesCount: Object.keys(unifiedBatches).length });

            // 第三步：保存新格式数据
            await this.saveUnifiedData(unifiedBatches, oldData.config);
            result.migratedBatches = Object.keys(unifiedBatches).length;

            // 第四步：清理旧数据
            const removedKeys = this.cleanupOldData();
            result.removedKeys = removedKeys;

            // 第五步：标记迁移完成
            localStorage.setItem(this.MIGRATION_MARKER, new Date().toISOString());

            // 计算迁移后大小
            result.totalSizeAfter = this.calculateStorageSize();
            result.migrationTime = Date.now() - startTime;
            result.success = true;

            logMigration('migrate', {
                success: true,
                migratedBatches: result.migratedBatches,
                sizeBefore: `${(result.totalSizeBefore / 1024).toFixed(2)}KB`,
                sizeAfter: `${(result.totalSizeAfter / 1024).toFixed(2)}KB`,
                timeTaken: `${result.migrationTime}ms`
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            result.errors.push(errorMessage);
            logMigration('migrate', { error: errorMessage });
        }

        return result;
    }

    /**
     * 查找旧的批次键
     */
    private static findOldBatchKeys(): string[] {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(OLD_STORAGE_KEYS.BATCH_PREFIX)) {
                keys.push(key);
            }
        }
        return keys;
    }

    /**
     * 加载所有旧格式数据
     */
    private static async loadOldData(): Promise<{
        index: any;
        batches: Record<string, any>;
        customFields: Record<string, any>;
        variantTypes: Record<string, any>;
        config: any;
    }> {
        const result = {
            index: null,
            batches: {} as Record<string, any>,
            customFields: {} as Record<string, any>,
            variantTypes: {} as Record<string, any>,
            config: null
        };

        try {
            // 加载索引
            const indexData = localStorage.getItem(OLD_STORAGE_KEYS.INDEX);
            if (indexData) {
                result.index = JSON.parse(indexData);
            }

            // 加载配置
            const configData = localStorage.getItem(OLD_STORAGE_KEYS.CONFIG);
            if (configData) {
                result.config = JSON.parse(configData);
            }

            // 加载自定义字段
            const customFieldsData = localStorage.getItem(OLD_STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH);
            if (customFieldsData) {
                result.customFields = JSON.parse(customFieldsData);
            }

            // 加载变体类型
            const variantTypesData = localStorage.getItem(OLD_STORAGE_KEYS.VARIANT_TYPES_BY_BATCH);
            if (variantTypesData) {
                result.variantTypes = JSON.parse(variantTypesData);
            }

            // 加载所有批次数据
            const oldBatchKeys = this.findOldBatchKeys();
            for (const key of oldBatchKeys) {
                const batchId = key.replace(OLD_STORAGE_KEYS.BATCH_PREFIX, '');
                const batchData = localStorage.getItem(key);
                if (batchData) {
                    result.batches[batchId] = JSON.parse(batchData);
                }
            }

        } catch (error) {
            logMigration('loadOldData', { error });
            throw new Error(`加载旧数据失败: ${error}`);
        }

        return result;
    }

    /**
     * 转换为统一格式
     */
    private static convertToUnifiedFormat(oldData: any): Record<string, UnifiedBatchData> {
        const unifiedBatches: Record<string, UnifiedBatchData> = {};

        try {
            for (const [batchId, batchData] of Object.entries(oldData.batches)) {
                const oldBatch = batchData as any;
                const indexBatch = oldData.index?.batches?.[batchId];

                // 创建统一的批次数据
                const unifiedBatch: UnifiedBatchData = {
                    metadata: {
                        id: batchId,
                        name: indexBatch?.name || oldBatch.metadata?.name || `Batch ${batchId}`,
                        fileName: indexBatch?.fileName || oldBatch.metadata?.fileName || 'unknown.json',
                        importTime: indexBatch?.importTime || oldBatch.metadata?.importTime || new Date().toISOString(),
                        version: indexBatch?.version || oldBatch.metadata?.version,
                        description: indexBatch?.description || oldBatch.metadata?.description,
                        author: indexBatch?.author || oldBatch.metadata?.author,
                        isSystemBatch: indexBatch?.isSystemBatch || false,
                        cardCount: indexBatch?.cardCount || oldBatch.cards?.length || 0,
                        cardTypes: indexBatch?.cardTypes || [],
                        size: indexBatch?.size || 0
                    },
                    cards: oldBatch.cards || [],
                    customFields: oldData.customFields[batchId] || {},
                    variantTypes: oldData.variantTypes[batchId] || {},
                    enabled: !indexBatch?.disabled, // 默认启用，除非明确禁用
                    statistics: {
                        totalCards: oldBatch.cards?.length || 0,
                        lastAccessTime: new Date().toISOString(),
                        operationCount: 0,
                        createdTime: indexBatch?.importTime || new Date().toISOString()
                    }
                };

                unifiedBatches[batchId] = unifiedBatch;
                
                logMigration('convertToUnifiedFormat', {
                    batchId,
                    name: unifiedBatch.metadata.name,
                    cardCount: unifiedBatch.metadata.cardCount,
                    enabled: unifiedBatch.enabled,
                    isSystem: unifiedBatch.metadata.isSystemBatch
                });
            }

        } catch (error) {
            logMigration('convertToUnifiedFormat', { error });
            throw new Error(`数据格式转换失败: ${error}`);
        }

        return unifiedBatches;
    }

    /**
     * 保存统一数据
     */
    private static async saveUnifiedData(unifiedBatches: Record<string, UnifiedBatchData>, oldConfig: any): Promise<void> {
        try {
            // 保存配置
            const newConfig = {
                maxBatches: oldConfig?.maxBatches || 50,
                maxStorageSize: oldConfig?.maxStorageSize || 5 * 1024 * 1024,
                autoCleanup: oldConfig?.autoCleanup !== false,
                compressionEnabled: oldConfig?.compressionEnabled || false,
                version: this.CURRENT_VERSION
            };
            localStorage.setItem(NEW_STORAGE_KEYS.CONFIG, JSON.stringify(newConfig));

            // 保存每个批次的统一数据
            for (const [batchId, batchData] of Object.entries(unifiedBatches)) {
                const key = `${NEW_STORAGE_KEYS.BATCH_DATA_PREFIX}${batchId}`;
                localStorage.setItem(key, JSON.stringify(batchData));
            }

            // 保存简化索引
            const simplifiedIndex: SimplifiedIndex = {
                batches: Object.fromEntries(
                    Object.entries(unifiedBatches).map(([batchId, batch]) => [
                        batchId,
                        {
                            id: batchId,
                            name: batch.metadata.name,
                            enabled: batch.enabled,
                            isSystemBatch: batch.metadata.isSystemBatch,
                            cardCount: batch.metadata.cardCount,
                            lastAccessTime: batch.statistics.lastAccessTime,
                            size: batch.metadata.size
                        }
                    ])
                ),
                statistics: {
                    totalCards: Object.values(unifiedBatches)
                        .filter(b => b.enabled)
                        .reduce((sum, b) => sum + b.metadata.cardCount, 0),
                    totalBatches: Object.keys(unifiedBatches).length,
                    lastUpdate: new Date().toISOString(),
                    version: this.CURRENT_VERSION
                }
            };

            localStorage.setItem(NEW_STORAGE_KEYS.INDEX, JSON.stringify(simplifiedIndex));

            logMigration('saveUnifiedData', {
                savedBatches: Object.keys(unifiedBatches).length,
                totalCards: simplifiedIndex.statistics.totalCards
            });

        } catch (error) {
            logMigration('saveUnifiedData', { error });
            throw new Error(`保存新数据失败: ${error}`);
        }
    }

    /**
     * 清理旧数据
     */
    private static cleanupOldData(): string[] {
        const removedKeys: string[] = [];

        try {
            // 清理旧索引
            if (localStorage.getItem(OLD_STORAGE_KEYS.INDEX)) {
                localStorage.removeItem(OLD_STORAGE_KEYS.INDEX);
                removedKeys.push(OLD_STORAGE_KEYS.INDEX);
            }

            // 清理旧配置
            if (localStorage.getItem(OLD_STORAGE_KEYS.CONFIG)) {
                localStorage.removeItem(OLD_STORAGE_KEYS.CONFIG);
                removedKeys.push(OLD_STORAGE_KEYS.CONFIG);
            }

            // 清理自定义字段
            if (localStorage.getItem(OLD_STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH)) {
                localStorage.removeItem(OLD_STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH);
                removedKeys.push(OLD_STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH);
            }

            // 清理变体类型
            if (localStorage.getItem(OLD_STORAGE_KEYS.VARIANT_TYPES_BY_BATCH)) {
                localStorage.removeItem(OLD_STORAGE_KEYS.VARIANT_TYPES_BY_BATCH);
                removedKeys.push(OLD_STORAGE_KEYS.VARIANT_TYPES_BY_BATCH);
            }

            // 清理旧批次数据
            const oldBatchKeys = this.findOldBatchKeys();
            for (const key of oldBatchKeys) {
                localStorage.removeItem(key);
                removedKeys.push(key);
            }

            logMigration('cleanupOldData', { removedKeys: removedKeys.length });

        } catch (error) {
            logMigration('cleanupOldData', { error });
        }

        return removedKeys;
    }

    /**
     * 计算存储大小
     */
    private static calculateStorageSize(): number {
        let totalSize = 0;
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                    const value = localStorage.getItem(key);
                    if (value) {
                        totalSize += (key.length + value.length) * 2; // UTF-16
                    }
                }
            }
        } catch (error) {
            logMigration('calculateStorageSize', { error });
        }
        return totalSize;
    }

    /**
     * 验证迁移结果
     */
    static validateMigration(): boolean {
        try {
            // 检查迁移标记
            const migrationCompleted = localStorage.getItem(this.MIGRATION_MARKER);
            if (!migrationCompleted) {
                return false;
            }

            // 检查新格式数据是否存在
            const newIndex = localStorage.getItem(NEW_STORAGE_KEYS.INDEX);
            const newConfig = localStorage.getItem(NEW_STORAGE_KEYS.CONFIG);

            if (!newIndex || !newConfig) {
                return false;
            }

            // 检查是否还有旧数据残留
            const hasOldData = this.findOldBatchKeys().length > 0 ||
                             !!localStorage.getItem(OLD_STORAGE_KEYS.INDEX) ||
                             !!localStorage.getItem(OLD_STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH);

            const isValid = !hasOldData;
            logMigration('validateMigration', { isValid, hasOldData });
            
            return isValid;

        } catch (error) {
            logMigration('validateMigration', { error });
            return false;
        }
    }

    /**
     * 强制重置迁移状态（用于调试）
     */
    static resetMigrationState(): void {
        try {
            localStorage.removeItem(this.MIGRATION_MARKER);
            logMigration('resetMigrationState', 'Migration state reset');
        } catch (error) {
            logMigration('resetMigrationState', { error });
        }
    }
}
