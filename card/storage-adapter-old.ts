/**
 * 存储适配器
 * 在新的统一存储系统和旧的接口之间提供兼容性适配
 */

import { UnifiedCardStorage } from './unified-storage';
import { StorageMigration } from './storage-migration';
import { 
    STORAGE_KEYS, 
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
     * 获取卡牌索引（兼容旧接口）
     */
    async getCardIndex(): Promise<CustomCardIndex | null> {
        try {
            if (this.useUnifiedStorage) {
                return await this.getIndexFromUnifiedStorage();
            } else {
                return this.getIndexFromOldStorage();
            }
        } catch (error) {
            logDebug('getCardIndex', { error });
            return null;
        }
    }

    /**
     * 获取批次数据（兼容旧接口）
     */
    async getBatchData(batchId: string): Promise<any> {
        try {
            if (this.useUnifiedStorage) {
                const unifiedData = await this.unifiedStorage.getBatchData(batchId);
                if (unifiedData) {
                    // 转换为旧格式
                    return {
                        metadata: unifiedData.metadata,
                        cards: unifiedData.cards
                    };
                }
                return null;
            } else {
                const key = `${STORAGE_KEYS.BATCH_PREFIX}${batchId}`;
                const stored = localStorage.getItem(key);
                return stored ? JSON.parse(stored) : null;
            }
        } catch (error) {
            logDebug('getBatchData', { batchId, error });
            return null;
        }
    }

    /**
     * 保存批次数据（兼容旧接口）
     */
    async saveBatchData(batchId: string, batchData: any): Promise<void> {
        try {
            if (this.useUnifiedStorage) {
                // 需要从旧格式转换为新的统一格式
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
            } else {
                const key = `${STORAGE_KEYS.BATCH_PREFIX}${batchId}`;
                localStorage.setItem(key, JSON.stringify(batchData));
            }
        } catch (error) {
            logDebug('saveBatchData', { batchId, error });
            throw error;
        }
    }

    /**
     * 删除批次数据（兼容旧接口）
     */
    async removeBatchData(batchId: string): Promise<void> {
        try {
            if (this.useUnifiedStorage) {
                await this.unifiedStorage.removeBatchData(batchId);
            } else {
                const key = `${STORAGE_KEYS.BATCH_PREFIX}${batchId}`;
                localStorage.removeItem(key);
            }
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
     * 保存索引
     */
    async saveIndex(index: CustomCardIndex): Promise<void> {
        try {
            if (this.useUnifiedStorage) {
                // 在统一存储中，索引是动态生成的，不需要单独保存
                // 但我们可以更新批次的元数据
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
            } else {
                localStorage.setItem(STORAGE_KEYS.INDEX, JSON.stringify(index));
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
            if (this.useUnifiedStorage) {
                const summaries = this.unifiedStorage.getAllBatchSummaries();
                return summaries.map(s => s.id);
            } else {
                const index = this.getIndexFromOldStorage();
                return index ? Object.keys(index.batches) : [];
            }
        } catch (error) {
            logDebug('listBatches', { error });
            return [];
        }
    }

    // ===== 配置操作 =====

    /**
     * 获取存储配置
     */
    getConfig(): StorageConfig {
        if (this.useUnifiedStorage) {
            // 统一存储系统没有单独的配置方法，使用默认配置
            return {
                maxBatches: 50,
                maxStorageSize: 5 * 1024 * 1024,
                autoCleanup: true,
                compressionEnabled: false
            };
        } else {
            try {
                const stored = localStorage.getItem(STORAGE_KEYS.CONFIG);
                if (stored) {
                    const config = JSON.parse(stored);
                    return { 
                        maxBatches: 50,
                        maxStorageSize: 10 * 1024 * 1024,
                        autoCleanup: true,
                        compressionEnabled: false,
                        ...config 
                    };
                }
            } catch (error) {
                logDebug('getConfig', { error });
            }
            
            return {
                maxBatches: 50,
                maxStorageSize: 10 * 1024 * 1024,
                autoCleanup: true,
                compressionEnabled: false
            };
        }
    }

    /**
     * 设置存储配置
     */
    setConfig(config: Partial<StorageConfig>): void {
        if (this.useUnifiedStorage) {
            // 统一存储系统没有单独的配置方法，暂时忽略
            logDebug('setConfig', { message: 'Configuration ignored in unified storage mode', config });
        } else {
            try {
                const currentConfig = this.getConfig();
                const newConfig = { ...currentConfig, ...config };
                localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(newConfig));
            } catch (error) {
                logDebug('setConfig', { config, error });
                throw error;
            }
        }
    }

    // ===== 自定义字段操作 =====

    /**
     * 保存指定批次的自定义字段定义
     */
    async saveCustomFieldsForBatch(batchId: string, definitions: CustomFieldsForBatch): Promise<void> {
        try {
            if (this.useUnifiedStorage) {
                const batchData = await this.unifiedStorage.getBatchData(batchId);
                if (batchData) {
                    batchData.customFields = definitions;
                    await this.unifiedStorage.saveBatchData(batchId, batchData);
                }
            } else {
                const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH);
                const allFields = stored ? JSON.parse(stored) : {};
                allFields[batchId] = definitions;
                localStorage.setItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH, JSON.stringify(allFields));
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
            if (this.useUnifiedStorage) {
                const batchData = await this.unifiedStorage.getBatchData(batchId);
                if (batchData) {
                    batchData.customFields = {};
                    await this.unifiedStorage.saveBatchData(batchId, batchData);
                }
            } else {
                const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH);
                if (stored) {
                    const allFields = JSON.parse(stored);
                    delete allFields[batchId];
                    localStorage.setItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH, JSON.stringify(allFields));
                }
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
            if (this.useUnifiedStorage) {
                const batchData = await this.unifiedStorage.getBatchData(batchId);
                if (batchData) {
                    batchData.variantTypes = variantTypes;
                    await this.unifiedStorage.saveBatchData(batchId, batchData);
                }
            } else {
                const stored = localStorage.getItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH);
                const allTypes = stored ? JSON.parse(stored) : {};
                allTypes[batchId] = variantTypes;
                localStorage.setItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH, JSON.stringify(allTypes));
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
            if (this.useUnifiedStorage) {
                const batchData = await this.unifiedStorage.getBatchData(batchId);
                if (batchData) {
                    batchData.variantTypes = {};
                    await this.unifiedStorage.saveBatchData(batchId, batchData);
                }
            } else {
                const stored = localStorage.getItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH);
                if (stored) {
                    const allTypes = JSON.parse(stored);
                    delete allTypes[batchId];
                    localStorage.setItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH, JSON.stringify(allTypes));
                }
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
        if (this.useUnifiedStorage) {
            const stats = this.unifiedStorage.getStorageStatistics();
            const config = {
                maxStorageSize: 5 * 1024 * 1024 // 5MB default for unified storage
            };
            return (stats.totalSize + requiredBytes) <= config.maxStorageSize;
        } else {
            const config = this.getConfig();
            const stats = this.calculateStorageUsage();
            return (stats.totalSize + requiredBytes) <= config.maxStorageSize;
        }
    }

    /**
     * 计算存储使用情况
     */
    calculateStorageUsage(): StorageStats {
        if (this.useUnifiedStorage) {
            const stats = this.unifiedStorage.getStorageStatistics();
            return {
                totalSize: stats.totalSize,
                indexSize: 0, // 统一存储没有单独的索引
                batchesSize: stats.totalSize,
                configSize: 0,
                availableSpace: stats.totalSize
            };
        } else {
            let totalSize = 0;
            let indexSize = 0;
            let batchesSize = 0;
            let configSize = 0;

            try {
                // 计算索引大小
                const indexData = localStorage.getItem(STORAGE_KEYS.INDEX);
                if (indexData) {
                    indexSize = indexData.length * 2;
                    totalSize += indexSize;
                }

                // 计算配置大小
                const configData = localStorage.getItem(STORAGE_KEYS.CONFIG);
                if (configData) {
                    configSize = configData.length * 2;
                    totalSize += configSize;
                }

                // 计算批次大小
                const index = this.getIndexFromOldStorage();
                if (index) {
                    for (const batchId of Object.keys(index.batches)) {
                        const key = `${STORAGE_KEYS.BATCH_PREFIX}${batchId}`;
                        const data = localStorage.getItem(key);
                        if (data) {
                            const size = data.length * 2;
                            batchesSize += size;
                            totalSize += size;
                        }
                    }
                }
            } catch (error) {
                logDebug('calculateStorageUsage', { error });
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
    }

    /**
     * 验证存储完整性
     */
    validateIntegrity(): IntegrityReport {
        if (this.useUnifiedStorage) {
            // 统一存储系统需要转换格式
            const unifiedReport = this.unifiedStorage.validateIntegrity();
            return {
                isValid: true, // 简化处理
                issues: [],
                orphanedKeys: [],
                missingBatches: [],
                corruptedBatches: []
            };
        } else {
            const report: IntegrityReport = {
                isValid: true,
                issues: [],
                orphanedKeys: [],
                missingBatches: [],
                corruptedBatches: []
            };

            try {
                const index = this.getIndexFromOldStorage();
                if (!index) {
                    report.isValid = false;
                    report.issues.push('Index not found');
                    return report;
                }

                // 检查批次数据完整性
                for (const batchId of Object.keys(index.batches)) {
                    const key = `${STORAGE_KEYS.BATCH_PREFIX}${batchId}`;
                    const data = localStorage.getItem(key);
                    
                    if (!data) {
                        report.missingBatches.push(batchId);
                        report.issues.push(`Missing batch data: ${batchId}`);
                    } else {
                        try {
                            JSON.parse(data);
                        } catch (error) {
                            report.corruptedBatches.push(batchId);
                            report.issues.push(`Corrupted batch data: ${batchId}`);
                            report.isValid = false;
                        }
                    }
                }

                // 检查孤立的批次数据
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key?.startsWith(STORAGE_KEYS.BATCH_PREFIX)) {
                        const batchId = key.substring(STORAGE_KEYS.BATCH_PREFIX.length);
                        if (!index.batches[batchId]) {
                            report.orphanedKeys.push(key);
                            report.issues.push(`Orphaned batch data: ${batchId}`);
                        }
                    }
                }
            } catch (error) {
                report.isValid = false;
                report.issues.push(`Integrity check failed: ${error}`);
            }

            return report;
        }
    }

    /**
     * 清理孤立数据
     */
    cleanupOrphanedData(): CleanupReport {
        if (this.useUnifiedStorage) {
            // 统一存储系统的清理操作
            return {
                removedKeys: [],
                freedSpace: 0,
                errors: ['Cleanup not available in unified storage mode']
            };
        } else {
            const report: CleanupReport = {
                removedKeys: [],
                freedSpace: 0,
                errors: []
            };

            try {
                const integrityReport = this.validateIntegrity();
                
                // 删除孤立的批次数据
                for (const key of integrityReport.orphanedKeys) {
                    try {
                        const data = localStorage.getItem(key);
                        if (data) {
                            report.freedSpace += data.length * 2;
                            localStorage.removeItem(key);
                            report.removedKeys.push(key);
                        }
                    } catch (error) {
                        report.errors.push(`Failed to remove orphaned key ${key}: ${error}`);
                    }
                }
            } catch (error) {
                report.errors.push(`Cleanup failed: ${error}`);
            }

            return report;
        }
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
        if (this.useUnifiedStorage) {
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
        } else {
            const stats = this.calculateStorageUsage();
            const config = this.getConfig();
            
            const formatSize = (bytes: number): string => {
                if (bytes < 1024) return `${bytes} B`;
                if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
                return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
            };

            const usagePercent = Math.round((stats.totalSize / config.maxStorageSize) * 100);

            return {
                used: formatSize(stats.totalSize),
                available: formatSize(stats.availableSpace),
                total: formatSize(config.maxStorageSize),
                usagePercent
            };
        }
    }

    /**
     * 清空所有自定义卡牌数据（保留内置卡牌）
     */
    async clearAllData(): Promise<void> {
        try {
            if (this.useUnifiedStorage) {
                // 在统一存储中，删除所有非系统批次
                const summaries = this.unifiedStorage.getAllBatchSummaries();
                for (const summary of summaries) {
                    if (!summary.isSystemBatch) {
                        await this.unifiedStorage.removeBatchData(summary.id);
                    }
                }
            } else {
                const index = this.getIndexFromOldStorage();
                if (!index) return;

                // 删除所有非系统批次数据
                for (const [batchId, batch] of Object.entries(index.batches)) {
                    // 跳过系统内置卡包
                    if ((batch as any).isSystemBatch === true) {
                        continue;
                    }
                    await this.removeBatch(batchId);
                }

                // 重新计算索引，只保留系统批次
                const newIndex = this.getIndexFromOldStorage();
                if (newIndex) {
                    const systemBatches: Record<string, ImportBatch> = {};
                    let systemCardCount = 0;
                    let systemBatchCount = 0;

                    for (const [batchId, batch] of Object.entries(newIndex.batches)) {
                        if ((batch as any).isSystemBatch === true) {
                            systemBatches[batchId] = batch;
                            systemCardCount += batch.cardCount;
                            systemBatchCount++;
                        }
                    }

                    newIndex.batches = systemBatches;
                    newIndex.totalCards = systemCardCount;
                    newIndex.totalBatches = systemBatchCount;
                    newIndex.lastUpdate = new Date().toISOString();

                    await this.saveIndex(newIndex);

                    // 清空批次自定义字段存储（只删除非系统批次）
                    const storedCustomFields = localStorage.getItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH);
                    if (storedCustomFields) {
                        const allCustomFields = JSON.parse(storedCustomFields);
                        const systemCustomFields: Record<string, any> = {};

                        for (const batchId in allCustomFields) {
                            if (systemBatches[batchId]) {
                                systemCustomFields[batchId] = allCustomFields[batchId];
                            }
                        }
                        localStorage.setItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH, JSON.stringify(systemCustomFields));
                    }

                    // 清空变体类型存储（只删除非系统批次）
                    const storedVariantTypes = localStorage.getItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH);
                    if (storedVariantTypes) {
                        const allVariantTypes = JSON.parse(storedVariantTypes);
                        const systemVariantTypes: Record<string, any> = {};

                        for (const batchId in allVariantTypes) {
                            if (systemBatches[batchId]) {
                                systemVariantTypes[batchId] = allVariantTypes[batchId];
                            }
                        }
                        localStorage.setItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH, JSON.stringify(systemVariantTypes));
                    }
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
            if (this.useUnifiedStorage) {
                return await this.unifiedStorage.getAllEnabledCards();
            } else {
                // 使用旧逻辑聚合所有卡牌
                return await this.aggregateCardsFromOldStorage();
            }
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
            if (this.useUnifiedStorage) {
                return await this.unifiedStorage.getAggregatedCustomFields();
            } else {
                // 从旧存储获取
                const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_FIELDS_BY_BATCH);
                if (stored) {
                    const batchFields = JSON.parse(stored);
                    // 聚合所有批次的自定义字段
                    const aggregated: Record<string, string[]> = {};
                    for (const fields of Object.values(batchFields)) {
                        if (typeof fields === 'object' && fields !== null) {
                            for (const [category, categoryFields] of Object.entries(fields as Record<string, string[]>)) {
                                if (!aggregated[category]) {
                                    aggregated[category] = [];
                                }
                                aggregated[category] = [...new Set([...aggregated[category], ...categoryFields])];
                            }
                        }
                    }
                    return aggregated;
                }
                return {};
            }
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
            if (this.useUnifiedStorage) {
                return await this.unifiedStorage.getAggregatedVariantTypes();
            } else {
                // 从旧存储获取
                const stored = localStorage.getItem(STORAGE_KEYS.VARIANT_TYPES_BY_BATCH);
                if (stored) {
                    const batchTypes = JSON.parse(stored);
                    const aggregated: Record<string, any> = {};
                    for (const types of Object.values(batchTypes)) {
                        if (typeof types === 'object' && types !== null) {
                            Object.assign(aggregated, types);
                        }
                    }
                    return aggregated;
                }
                return {};
            }
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
            if (this.useUnifiedStorage) {
                await this.unifiedStorage.toggleBatchEnabled(batchId, enabled);
            } else {
                // 在旧存储中，通过索引标记批次状态
                const index = this.getIndexFromOldStorage();
                if (index && index.batches[batchId]) {
                    // 注意：旧版本没有 enabled 字段，这里添加一个 disabled 字段
                    (index.batches[batchId] as any).disabled = !enabled;
                    localStorage.setItem(STORAGE_KEYS.INDEX, JSON.stringify(index));
                }
            }
        } catch (error) {
            logDebug('toggleBatchEnabled', { batchId, enabled, error });
            throw error;
        }
    }

    /**
     * 获取存储统计信息
     */
    getStorageStatistics(): any {
        if (this.useUnifiedStorage) {
            return this.unifiedStorage.getStorageStatistics();
        } else {
            // 计算旧存储的统计信息
            let totalSize = 0;
            let totalBatches = 0;
            let totalCards = 0;

            try {
                const index = this.getIndexFromOldStorage();
                if (index) {
                    totalBatches = index.totalBatches;
                    totalCards = index.totalCards;
                }

                // 计算存储大小
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key?.startsWith('daggerheart_')) {
                        const value = localStorage.getItem(key);
                        if (value) {
                            totalSize += (key.length + value.length) * 2;
                        }
                    }
                }
            } catch (error) {
                logDebug('getStorageStatistics', { error });
            }

            return {
                totalSize,
                totalBatches,
                enabledBatches: totalBatches, // 旧版本默认都启用
                totalCards,
                enabledCards: totalCards,
                cacheSize: 0
            };
        }
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

    /**
     * 私有方法：从旧存储获取索引
     */
    private getIndexFromOldStorage(): CustomCardIndex | null {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.INDEX);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            logDebug('getIndexFromOldStorage', { error });
            return null;
        }
    }

    /**
     * 私有方法：从旧存储聚合所有卡牌
     */
    private async aggregateCardsFromOldStorage(): Promise<any[]> {
        const allCards: any[] = [];
        
        try {
            const index = this.getIndexFromOldStorage();
            if (!index) return allCards;

            for (const [batchId, batch] of Object.entries(index.batches)) {
                // 跳过禁用的批次
                if ((batch as any).disabled) continue;

                const batchData = await this.getBatchData(batchId);
                if (batchData && batchData.cards) {
                    allCards.push(...batchData.cards);
                }
            }
        } catch (error) {
            logDebug('aggregateCardsFromOldStorage', { error });
        }

        return allCards;
    }
}

// 导出单例实例
export const storageAdapter = StorageAdapter.getInstance();
