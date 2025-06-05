/**
 * 新的统一卡牌存储管理器
 * 实现统一的localStorage存储架构
 */

import { 
    NEW_STORAGE_KEYS, 
    UnifiedBatchData, 
    SimplifiedIndex, 
    BatchSummary,
    BatchMetadata 
} from './storage-migration';

// 调试日志标记
const DEBUG_UNIFIED_STORAGE = false;
const logDebug = (operation: string, details: any) => {
    if (DEBUG_UNIFIED_STORAGE) {
        console.log(`[UnifiedStorage:${operation}]`, details);
    }
};

// 默认配置
const DEFAULT_CONFIG = {
    maxBatches: 50,
    maxStorageSize: 5 * 1024 * 1024, // 5MB
    autoCleanup: true,
    compressionEnabled: false,
    version: '2.0.0'
};

/**
 * 统一卡牌存储管理器
 */
export class UnifiedCardStorage {
    private static instance: UnifiedCardStorage;
    private memoryCache = new Map<string, UnifiedBatchData>();
    private indexCache: SimplifiedIndex | null = null;
    private initialized = false;

    private constructor() {}

    static getInstance(): UnifiedCardStorage {
        if (!this.instance) {
            this.instance = new UnifiedCardStorage();
        }
        return this.instance;
    }

    /**
     * 初始化存储系统
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            logDebug('initialize', 'Starting initialization');

            // 加载索引到缓存
            this.indexCache = this.loadIndex();
            
            // 预加载所有启用的批次到内存（可选，基于性能需求）
            if (this.shouldPreloadBatches()) {
                await this.preloadEnabledBatches();
            }

            this.initialized = true;
            logDebug('initialize', 'Initialization completed');

        } catch (error) {
            logDebug('initialize', { error });
            throw new Error(`存储系统初始化失败: ${error}`);
        }
    }

    /**
     * 加载索引
     */
    private loadIndex(): SimplifiedIndex {
        try {
            const stored = localStorage.getItem(NEW_STORAGE_KEYS.INDEX);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            logDebug('loadIndex', { error });
        }

        // 返回默认索引
        return {
            batches: {},
            statistics: {
                totalCards: 0,
                totalBatches: 0,
                lastUpdate: new Date().toISOString(),
                version: '2.0.0'
            }
        };
    }

    /**
     * 保存索引
     */
    private saveIndex(index: SimplifiedIndex): void {
        try {
            index.statistics.lastUpdate = new Date().toISOString();
            localStorage.setItem(NEW_STORAGE_KEYS.INDEX, JSON.stringify(index));
            this.indexCache = index;
            logDebug('saveIndex', { totalBatches: index.statistics.totalBatches });
        } catch (error) {
            logDebug('saveIndex', { error });
            throw new Error('索引保存失败');
        }
    }

    /**
     * 获取批次数据（带缓存）
     */
    async getBatchData(batchId: string): Promise<UnifiedBatchData | null> {
        try {
            // 先检查内存缓存
            if (this.memoryCache.has(batchId)) {
                const cachedData = this.memoryCache.get(batchId)!;
                // 更新访问时间
                cachedData.statistics.lastAccessTime = new Date().toISOString();
                cachedData.statistics.operationCount++;
                return cachedData;
            }

            // 从localStorage加载
            const key = `${NEW_STORAGE_KEYS.BATCH_DATA_PREFIX}${batchId}`;
            const stored = localStorage.getItem(key);
            
            if (!stored) {
                logDebug('getBatchData', { batchId, found: false });
                return null;
            }

            const batchData: UnifiedBatchData = JSON.parse(stored);
            
            // 更新访问统计
            batchData.statistics.lastAccessTime = new Date().toISOString();
            batchData.statistics.operationCount++;

            // 加入内存缓存
            this.memoryCache.set(batchId, batchData);
            
            // 异步更新localStorage中的统计信息
            this.updateBatchStatistics(batchId, batchData.statistics);

            logDebug('getBatchData', { 
                batchId, 
                found: true, 
                cardCount: batchData.cards.length,
                fromCache: false 
            });

            return batchData;

        } catch (error) {
            logDebug('getBatchData', { batchId, error });
            return null;
        }
    }

    /**
     * 保存批次数据
     */
    async saveBatchData(batchId: string, batchData: UnifiedBatchData): Promise<void> {
        try {
            // 更新统计信息
            batchData.statistics.lastAccessTime = new Date().toISOString();
            batchData.statistics.totalCards = batchData.cards.length;
            batchData.metadata.cardCount = batchData.cards.length;

            // 保存到localStorage
            const key = `${NEW_STORAGE_KEYS.BATCH_DATA_PREFIX}${batchId}`;
            localStorage.setItem(key, JSON.stringify(batchData));

            // 更新内存缓存
            this.memoryCache.set(batchId, batchData);

            // 更新索引
            await this.updateIndexForBatch(batchId, batchData);

            logDebug('saveBatchData', { 
                batchId, 
                cardCount: batchData.cards.length,
                enabled: batchData.enabled 
            });

        } catch (error) {
            logDebug('saveBatchData', { batchId, error });
            throw new Error(`批次数据保存失败: ${batchId}`);
        }
    }

    /**
     * 删除批次数据
     */
    async removeBatchData(batchId: string): Promise<void> {
        try {
            // 从localStorage删除
            const key = `${NEW_STORAGE_KEYS.BATCH_DATA_PREFIX}${batchId}`;
            localStorage.removeItem(key);

            // 从内存缓存删除
            this.memoryCache.delete(batchId);

            // 从索引中删除
            await this.removeFromIndex(batchId);

            logDebug('removeBatchData', { batchId });

        } catch (error) {
            logDebug('removeBatchData', { batchId, error });
            throw new Error(`批次删除失败: ${batchId}`);
        }
    }

    /**
     * 获取所有启用的批次摘要
     */
    getEnabledBatchSummaries(): BatchSummary[] {
        if (!this.indexCache) {
            return [];
        }

        return Object.values(this.indexCache.batches)
            .filter(batch => batch.enabled);
    }

    /**
     * 获取所有批次摘要
     */
    getAllBatchSummaries(): BatchSummary[] {
        if (!this.indexCache) {
            return [];
        }

        return Object.values(this.indexCache.batches);
    }

    /**
     * 切换批次启用状态
     */
    async toggleBatchEnabled(batchId: string, enabled: boolean): Promise<void> {
        try {
            // 更新批次数据中的启用状态
            const batchData = await this.getBatchData(batchId);
            if (batchData) {
                batchData.enabled = enabled;
                await this.saveBatchData(batchId, batchData);
            }

            // 更新索引中的启用状态
            if (this.indexCache && this.indexCache.batches[batchId]) {
                this.indexCache.batches[batchId].enabled = enabled;
                this.saveIndex(this.indexCache);
            }

            logDebug('toggleBatchEnabled', { batchId, enabled });

        } catch (error) {
            logDebug('toggleBatchEnabled', { batchId, enabled, error });
            throw new Error(`切换批次状态失败: ${batchId}`);
        }
    }

    /**
     * 获取所有启用批次的卡牌
     */
    async getAllEnabledCards(): Promise<any[]> {
        const allCards: any[] = [];
        const enabledBatches = this.getEnabledBatchSummaries();

        for (const batchSummary of enabledBatches) {
            const batchData = await this.getBatchData(batchSummary.id);
            if (batchData && batchData.enabled) {
                allCards.push(...batchData.cards);
            }
        }

        logDebug('getAllEnabledCards', { 
            enabledBatches: enabledBatches.length,
            totalCards: allCards.length 
        });

        return allCards;
    }

    /**
     * 获取聚合的自定义字段
     */
    async getAggregatedCustomFields(): Promise<Record<string, string[]>> {
        const aggregated: Record<string, string[]> = {};
        const enabledBatches = this.getEnabledBatchSummaries();

        for (const batchSummary of enabledBatches) {
            const batchData = await this.getBatchData(batchSummary.id);
            if (batchData && batchData.enabled) {
                for (const [category, fields] of Object.entries(batchData.customFields)) {
                    if (!aggregated[category]) {
                        aggregated[category] = [];
                    }
                    // 去重合并
                    aggregated[category] = [...new Set([...aggregated[category], ...fields])];
                }
            }
        }

        logDebug('getAggregatedCustomFields', { 
            categories: Object.keys(aggregated).length,
            totalFields: Object.values(aggregated).flat().length 
        });

        return aggregated;
    }

    /**
     * 获取聚合的变体类型
     */
    async getAggregatedVariantTypes(): Promise<Record<string, any>> {
        const aggregated: Record<string, any> = {};
        const enabledBatches = this.getEnabledBatchSummaries();

        for (const batchSummary of enabledBatches) {
            const batchData = await this.getBatchData(batchSummary.id);
            if (batchData && batchData.enabled) {
                Object.assign(aggregated, batchData.variantTypes);
            }
        }

        logDebug('getAggregatedVariantTypes', { 
            totalTypes: Object.keys(aggregated).length 
        });

        return aggregated;
    }

    /**
     * 获取存储统计信息
     */
    getStorageStatistics(): {
        totalSize: number;
        totalBatches: number;
        enabledBatches: number;
        totalCards: number;
        enabledCards: number;
        cacheSize: number;
    } {
        let totalSize = 0;
        let enabledCards = 0;

        // 计算localStorage使用量
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(NEW_STORAGE_KEYS.BATCH_DATA_PREFIX) ||
                    key === NEW_STORAGE_KEYS.INDEX ||
                    key === NEW_STORAGE_KEYS.CONFIG) {
                    const value = localStorage.getItem(key);
                    if (value) {
                        totalSize += (key.length + value.length) * 2;
                    }
                }
            }
        } catch (error) {
            logDebug('getStorageStatistics', { error });
        }

        const enabledBatches = this.getEnabledBatchSummaries();
        enabledCards = enabledBatches.reduce((sum, batch) => sum + batch.cardCount, 0);

        const statistics = {
            totalSize,
            totalBatches: this.indexCache?.statistics.totalBatches || 0,
            enabledBatches: enabledBatches.length,
            totalCards: this.indexCache?.statistics.totalCards || 0,
            enabledCards,
            cacheSize: this.memoryCache.size
        };

        logDebug('getStorageStatistics', statistics);
        return statistics;
    }

    /**
     * 清理内存缓存
     */
    clearMemoryCache(): void {
        this.memoryCache.clear();
        logDebug('clearMemoryCache', 'Memory cache cleared');
    }

    /**
     * 验证数据完整性
     */
    async validateIntegrity(): Promise<{
        isValid: boolean;
        issues: string[];
        missingBatches: string[];
        orphanedData: string[];
    }> {
        const issues: string[] = [];
        const missingBatches: string[] = [];
        const orphanedData: string[] = [];

        try {
            if (!this.indexCache) {
                issues.push('索引缓存未加载');
                return { isValid: false, issues, missingBatches, orphanedData };
            }

            // 检查索引中的批次是否都有对应数据
            for (const [batchId, batchSummary] of Object.entries(this.indexCache.batches)) {
                const batchData = await this.getBatchData(batchId);
                if (!batchData) {
                    missingBatches.push(batchId);
                    issues.push(`批次 ${batchSummary.name} (${batchId}) 索引存在但数据丢失`);
                }
            }

            // 检查是否有孤立的批次数据
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(NEW_STORAGE_KEYS.BATCH_DATA_PREFIX)) {
                    const batchId = key.replace(NEW_STORAGE_KEYS.BATCH_DATA_PREFIX, '');
                    if (!this.indexCache.batches[batchId]) {
                        orphanedData.push(key);
                        issues.push(`发现孤立的批次数据: ${key}`);
                    }
                }
            }

        } catch (error) {
            issues.push(`完整性检查失败: ${error}`);
        }

        const isValid = issues.length === 0;
        logDebug('validateIntegrity', { isValid, issueCount: issues.length });

        return { isValid, issues, missingBatches, orphanedData };
    }

    /**
     * 私有方法：是否应该预加载批次
     */
    private shouldPreloadBatches(): boolean {
        // 根据批次数量和设备性能决定是否预加载
        const batchCount = this.indexCache?.statistics.totalBatches || 0;
        return batchCount <= 10; // 只有少量批次时才预加载
    }

    /**
     * 私有方法：预加载启用的批次
     */
    private async preloadEnabledBatches(): Promise<void> {
        const enabledBatches = this.getEnabledBatchSummaries();
        const loadPromises = enabledBatches.map(batch => this.getBatchData(batch.id));
        await Promise.all(loadPromises);
        
        logDebug('preloadEnabledBatches', { 
            loadedBatches: enabledBatches.length 
        });
    }

    /**
     * 私有方法：更新批次统计信息
     */
    private async updateBatchStatistics(batchId: string, statistics: any): Promise<void> {
        try {
            // 异步更新，不阻塞主流程
            setTimeout(() => {
                const key = `${NEW_STORAGE_KEYS.BATCH_DATA_PREFIX}${batchId}`;
                const stored = localStorage.getItem(key);
                if (stored) {
                    const batchData = JSON.parse(stored);
                    batchData.statistics = statistics;
                    localStorage.setItem(key, JSON.stringify(batchData));
                }
            }, 0);
        } catch (error) {
            logDebug('updateBatchStatistics', { batchId, error });
        }
    }

    /**
     * 私有方法：为批次更新索引
     */
    private async updateIndexForBatch(batchId: string, batchData: UnifiedBatchData): Promise<void> {
        if (!this.indexCache) {
            this.indexCache = this.loadIndex();
        }

        const batchSummary: BatchSummary = {
            id: batchId,
            name: batchData.metadata.name,
            enabled: batchData.enabled,
            isSystemBatch: batchData.metadata.isSystemBatch,
            cardCount: batchData.metadata.cardCount,
            lastAccessTime: batchData.statistics.lastAccessTime,
            size: batchData.metadata.size
        };

        const wasNew = !this.indexCache.batches[batchId];
        this.indexCache.batches[batchId] = batchSummary;

        if (wasNew) {
            this.indexCache.statistics.totalBatches++;
        }

        // 重新计算总卡牌数
        this.indexCache.statistics.totalCards = Object.values(this.indexCache.batches)
            .filter(b => b.enabled)
            .reduce((sum, b) => sum + b.cardCount, 0);

        this.saveIndex(this.indexCache);
    }

    /**
     * 私有方法：从索引中删除批次
     */
    private async removeFromIndex(batchId: string): Promise<void> {
        if (!this.indexCache) {
            return;
        }

        const batch = this.indexCache.batches[batchId];
        if (batch) {
            delete this.indexCache.batches[batchId];
            this.indexCache.statistics.totalBatches--;
            
            if (batch.enabled) {
                this.indexCache.statistics.totalCards -= batch.cardCount;
            }

            this.saveIndex(this.indexCache);
        }
    }
}
