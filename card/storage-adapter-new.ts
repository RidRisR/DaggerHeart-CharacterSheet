/**
 * 存储适配器
 * 强制使用新的统一存储系统 - 已移除旧格式兼容性
 * 这个版本将强制所有操作使用统一存储，快速暴露剩余问题
 */

import { UnifiedCardStorage } from './unified-storage';
import { 
    type CustomCardIndex, 
    type ImportBatch, 
    type BatchData,
    type CustomFieldsForBatch,
    type VariantTypesForBatch,
    type CustomFieldNamesStore,
    type StorageConfig,
    type StorageStats,
    type IntegrityReport,
    type CleanupReport
} from './card-storage';

// 调试日志标记
const DEBUG_ADAPTER = true;
const logDebug = (operation: string, details: any) => {
    if (DEBUG_ADAPTER) {
        console.log(`[StorageAdapter:${operation}]`, details);
    }
};

/**
 * 存储适配器类
 * 强制使用新的统一存储系统 - 已移除旧格式兼容性
 */
export class StorageAdapter {
    private static instance: StorageAdapter;
    private unifiedStorage: UnifiedCardStorage;

    private constructor() {
        this.unifiedStorage = UnifiedCardStorage.getInstance();
    }

    static getInstance(): StorageAdapter {
        if (!this.instance) {
            this.instance = new StorageAdapter();
        }
        return this.instance;
    }

    /**
     * 初始化适配器 - 强制使用统一存储
     */
    async initialize(): Promise<void> {
        try {
            logDebug('initialize', { 
                message: 'Forcing unified storage mode - old format support removed'
            });

            await this.unifiedStorage.initialize();
        } catch (error) {
            logDebug('initialize', { error });
            throw error; // 不再回退到旧格式
        }
    }

    /**
     * 获取卡牌索引（转换为统一存储格式）
     */
    async getCardIndex(): Promise<CustomCardIndex | null> {
        try {
            return await this.getIndexFromUnifiedStorage();
        } catch (error) {
            logDebug('getCardIndex', { error });
            return null;
        }
    }

    /**
     * 获取批次数据（统一存储格式）
     */
    async getBatchData(batchId: string): Promise<any> {
        try {
            const unifiedData = await this.unifiedStorage.getBatchData(batchId);
            if (unifiedData) {
                // 转换为旧接口兼容格式
                return {
                    metadata: unifiedData.metadata,
                    cards: unifiedData.cards
                };
            }
            return null;
        } catch (error) {
            logDebug('getBatchData', { batchId, error });
            return null;
        }
    }

    /**
     * 保存批次数据（统一存储格式）
     */
    async saveBatchData(batchId: string, batchData: any): Promise<void> {
        try {
            // 从旧格式转换为新的统一格式
            const unifiedData = {
                metadata: batchData.metadata,
                cards: batchData.cards || [],
                customFields: {},
                variantTypes: {},
                enabled: true,
                statistics: {
                    totalCards: batchData.cards?.length || 0,
                    lastAccessTime: new Date().toISOString(),
                    operationCount: 0,
                    createdTime: batchData.metadata?.importTime || new Date().toISOString()
                }
            };
            await this.unifiedStorage.saveBatchData(batchId, unifiedData);
        } catch (error) {
            logDebug('saveBatchData', { batchId, error });
            throw error;
        }
    }

    /**
     * 删除批次数据（统一存储格式）
     */
    async removeBatchData(batchId: string): Promise<void> {
        try {
            await this.unifiedStorage.removeBatchData(batchId);
        } catch (error) {
            logDebug('removeBatchData', { batchId, error });
            throw error;
        }
    }

    // ===== 索引操作 =====

    /**
     * 加载索引
     */
    async loadIndex(): Promise<CustomCardIndex> {
        const index = await this.getCardIndex();
        return index || {
            batches: {},
            totalCards: 0,
            totalBatches: 0,
            lastUpdate: new Date().toISOString()
        };
    }

    /**
     * 保存索引（在统一存储中，索引是动态生成的）
     */
    async saveIndex(index: CustomCardIndex): Promise<void> {
        try {
            // 在统一存储中，索引是动态生成的，但我们可以更新批次的元数据
            for (const [batchId, batch] of Object.entries(index.batches)) {
                const existingData = await this.unifiedStorage.getBatchData(batchId);
                if (existingData) {
                    existingData.metadata = {
                        ...existingData.metadata,
                        id: batch.id,
                        name: batch.name,
                        fileName: batch.fileName,
                        importTime: batch.importTime
                    };
                    existingData.enabled = !batch.disabled;
                    await this.unifiedStorage.saveBatchData(batchId, existingData);
                }
            }
        } catch (error) {
            logDebug('saveIndex', { error });
            throw error;
        }
    }

    // ===== 批次操作 =====

    /**
     * 保存批次（兼容旧接口）
     */
    async saveBatch(batchId: string, data: BatchData): Promise<void> {
        return this.saveBatchData(batchId, data);
    }

    /**
     * 加载批次（兼容旧接口）
     */
    async loadBatch(batchId: string): Promise<BatchData | null> {
        return this.getBatchData(batchId);
    }

    /**
     * 删除批次（兼容旧接口）
     */
    async removeBatch(batchId: string): Promise<void> {
        return this.removeBatchData(batchId);
    }

    /**
     * 列出所有批次ID
     */
    async listBatches(): Promise<string[]> {
        try {
            const summaries = this.unifiedStorage.getAllBatchSummaries();
            return summaries.map(s => s.id);
        } catch (error) {
            logDebug('listBatches', { error });
            return [];
        }
    }

    // ===== 配置操作 =====

    /**
     * 获取存储配置（统一存储使用默认配置）
     */
    getConfig(): StorageConfig {
        return {
            maxBatches: 50,
            maxStorageSize: 5 * 1024 * 1024,
            autoCleanup: true,
            compressionEnabled: false
        };
    }

    /**
     * 设置存储配置（统一存储暂时忽略）
     */
    setConfig(config: Partial<StorageConfig>): void {
        logDebug('setConfig', { message: 'Configuration ignored in unified storage mode', config });
    }

    // ===== 自定义字段操作 =====

    /**
     * 保存指定批次的自定义字段定义
     */
    async saveCustomFieldsForBatch(batchId: string, definitions: CustomFieldsForBatch): Promise<void> {
        try {
            const batchData = await this.unifiedStorage.getBatchData(batchId);
            if (batchData) {
                batchData.customFields = definitions;
                await this.unifiedStorage.saveBatchData(batchId, batchData);
            }
        } catch (error) {
            logDebug('saveCustomFieldsForBatch', { batchId, error });
            throw error;
        }
    }

    /**
     * 移除指定批次的自定义字段定义
     */
    async removeCustomFieldsForBatch(batchId: string): Promise<void> {
        try {
            const batchData = await this.unifiedStorage.getBatchData(batchId);
            if (batchData) {
                batchData.customFields = {};
                await this.unifiedStorage.saveBatchData(batchId, batchData);
            }
        } catch (error) {
            logDebug('removeCustomFieldsForBatch', { batchId, error });
            throw error;
        }
    }

    /**
     * 获取聚合的自定义字段名称
     */
    async getAggregatedCustomFieldNames(): Promise<CustomFieldNamesStore> {
        return this.getAggregatedCustomFields();
    }

    /**
     * 获取聚合的自定义字段名称（包含临时批次定义）
     */
    async getAggregatedCustomFieldNamesWithTemp(
        tempBatchId?: string, 
        tempDefinitions?: CustomFieldsForBatch
    ): Promise<CustomFieldNamesStore> {
        try {
            let aggregated = await this.getAggregatedCustomFields();
            
            // 添加临时定义
            if (tempBatchId && tempDefinitions) {
                for (const [category, fields] of Object.entries(tempDefinitions)) {
                    if (!aggregated[category]) {
                        aggregated[category] = [];
                    }
                    aggregated[category] = [...new Set([...aggregated[category], ...fields])];
                }
            }
            
            return aggregated;
        } catch (error) {
            logDebug('getAggregatedCustomFieldNamesWithTemp', { tempBatchId, error });
            return {};
        }
    }

    // ===== 变体类型操作 =====

    /**
     * 保存指定批次的变体类型定义
     */
    async saveVariantTypesForBatch(batchId: string, variantTypes: VariantTypesForBatch): Promise<void> {
        try {
            const batchData = await this.unifiedStorage.getBatchData(batchId);
            if (batchData) {
                batchData.variantTypes = variantTypes;
                await this.unifiedStorage.saveBatchData(batchId, batchData);
            }
        } catch (error) {
            logDebug('saveVariantTypesForBatch', { batchId, error });
            throw error;
        }
    }

    /**
     * 移除指定批次的变体类型定义
     */
    async removeVariantTypesForBatch(batchId: string): Promise<void> {
        try {
            const batchData = await this.unifiedStorage.getBatchData(batchId);
            if (batchData) {
                batchData.variantTypes = {};
                await this.unifiedStorage.saveBatchData(batchId, batchData);
            }
        } catch (error) {
            logDebug('removeVariantTypesForBatch', { batchId, error });
            throw error;
        }
    }

    // ===== 工具方法 =====

    /**
     * 生成批次ID
     */
    generateBatchId(): string {
        return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 检查存储空间
     */
    checkStorageSpace(requiredBytes: number): boolean {
        const stats = this.unifiedStorage.getStorageStatistics();
        const config = this.getConfig();
        return (stats.totalSize + requiredBytes) <= config.maxStorageSize;
    }

    /**
     * 计算存储使用情况
     */
    calculateStorageUsage(): StorageStats {
        const stats = this.unifiedStorage.getStorageStatistics();
        return {
            totalSize: stats.totalSize,
            indexSize: 0, // 统一存储没有单独的索引
            batchesSize: stats.totalSize,
            configSize: 0,
            availableSpace: stats.totalSize
        };
    }

    /**
     * 验证存储完整性
     */
    validateIntegrity(): IntegrityReport {
        // 使用统一存储系统的完整性验证
        try {
            const unifiedReport = this.unifiedStorage.validateIntegrity();
            return {
                isValid: unifiedReport.isValid,
                issues: unifiedReport.issues,
                orphanedKeys: [],
                missingBatches: [],
                corruptedBatches: unifiedReport.corruptedBatches || []
            };
        } catch (error) {
            return {
                isValid: false,
                issues: [`Integrity check failed: ${error}`],
                orphanedKeys: [],
                missingBatches: [],
                corruptedBatches: []
            };
        }
    }

    /**
     * 清理孤立数据（统一存储系统）
     */
    cleanupOrphanedData(): CleanupReport {
        return {
            removedKeys: [],
            freedSpace: 0,
            errors: ['Cleanup handled internally by unified storage system']
        };
    }

    /**
     * 获取格式化的存储使用情况
     */
    getFormattedStorageInfo(): {
        used: string;
        available: string;
        total: string;
        usagePercent: number;
    } {
        const stats = this.unifiedStorage.getStorageStatistics();
        const maxSize = 5 * 1024 * 1024; // 5MB default
        
        const formatSize = (bytes: number): string => {
            if (bytes < 1024) return `${bytes} B`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        };

        const usagePercent = Math.round((stats.totalSize / maxSize) * 100);
        const availableSpace = Math.max(0, maxSize - stats.totalSize);

        return {
            used: formatSize(stats.totalSize),
            available: formatSize(availableSpace),
            total: formatSize(maxSize),
            usagePercent
        };
    }

    /**
     * 清空所有自定义卡牌数据（保留内置卡牌）
     */
    async clearAllData(): Promise<void> {
        try {
            // 在统一存储中，删除所有非系统批次
            const summaries = this.unifiedStorage.getAllBatchSummaries();
            for (const summary of summaries) {
                if (!summary.isSystemBatch) {
                    await this.unifiedStorage.removeBatchData(summary.id);
                }
            }
        } catch (error) {
            logDebug('clearAllData', { error });
            throw error;
        }
    }

    /**
     * 获取所有启用的卡牌（新功能）
     */
    async getAllEnabledCards(): Promise<any[]> {
        try {
            return await this.unifiedStorage.getAllEnabledCards();
        } catch (error) {
            logDebug('getAllEnabledCards', { error });
            return [];
        }
    }

    /**
     * 获取聚合的自定义字段（新功能）
     */
    async getAggregatedCustomFields(): Promise<Record<string, string[]>> {
        try {
            return await this.unifiedStorage.getAggregatedCustomFields();
        } catch (error) {
            logDebug('getAggregatedCustomFields', { error });
            return {};
        }
    }

    /**
     * 获取聚合的变体类型（新功能）
     */
    async getAggregatedVariantTypes(): Promise<Record<string, any>> {
        try {
            return await this.unifiedStorage.getAggregatedVariantTypes();
        } catch (error) {
            logDebug('getAggregatedVariantTypes', { error });
            return {};
        }
    }

    /**
     * 切换批次启用状态（新功能）
     */
    async toggleBatchEnabled(batchId: string, enabled: boolean): Promise<void> {
        try {
            await this.unifiedStorage.toggleBatchEnabled(batchId, enabled);
        } catch (error) {
            logDebug('toggleBatchEnabled', { batchId, enabled, error });
            throw error;
        }
    }

    /**
     * 获取存储统计信息
     */
    getStorageStatistics(): any {
        return this.unifiedStorage.getStorageStatistics();
    }

    /**
     * 私有方法：从新存储获取索引
     */
    private async getIndexFromUnifiedStorage(): Promise<CustomCardIndex> {
        const summaries = this.unifiedStorage.getAllBatchSummaries();
        const batches: Record<string, ImportBatch> = {};

        for (const summary of summaries) {
            batches[summary.id] = {
                id: summary.id,
                name: summary.name,
                fileName: summary.name, // 简化处理
                importTime: summary.lastAccessTime,
                cardCount: summary.cardCount,
                cardTypes: [], // 需要从实际数据获取
                disabled: !summary.enabled,
                isSystemBatch: summary.isSystemBatch || false,
                size: summary.size
            };
        }

        const enabledCards = summaries
            .filter(s => s.enabled)
            .reduce((sum, s) => sum + s.cardCount, 0);

        return {
            batches,
            totalCards: enabledCards,
            totalBatches: summaries.length,
            lastUpdate: new Date().toISOString()
        };
    }
}

// 导出单例实例
export const storageAdapter = StorageAdapter.getInstance();
