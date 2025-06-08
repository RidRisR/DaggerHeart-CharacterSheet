/**
 * DaggerHeart卡牌存储缓存层
 * 为聚合方法提供内存缓存以提升性能
 */

import { CustomFieldNamesStore, VariantTypesForBatch } from './card-storage';

// 缓存键类型定义
type CacheKey = 'customFieldNames' | 'variantTypes';

// 缓存条目接口
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    batchesHash: string; // 用于检测批次变化的哈希值
}

// 缓存配置
interface CacheConfig {
    maxAge: number; // 缓存最大存活时间（毫秒）
    checkInterval: number; // 缓存检查间隔（毫秒）
    enabled: boolean; // 是否启用缓存
}

// 默认缓存配置
const DEFAULT_CACHE_CONFIG: CacheConfig = {
    maxAge: 5 * 60 * 1000, // 5分钟
    checkInterval: 30 * 1000, // 30秒检查一次
    enabled: true
};

/**
 * 卡牌存储缓存管理器
 * 提供聚合数据的内存缓存功能
 */
export class CardStorageCache {
    private static cache = new Map<CacheKey, CacheEntry<any>>();
    private static config: CacheConfig = { ...DEFAULT_CACHE_CONFIG };
    private static cleanupTimer: NodeJS.Timeout | null = null;
    private static lastBatchesHash: string = '';

    // 统计信息
    private static stats = {
        hits: 0,
        misses: 0,
        totalRequests: 0
    };

    // 调试日志标记
    private static DEBUG_CACHE = false;
    
    private static logDebug(operation: string, details: any) {
        if (this.DEBUG_CACHE) {
            console.log(`[CardStorageCache:${operation}]`, details);
        }
    }

    /**
     * 启用/禁用调试模式
     */
    static setDebugMode(enabled: boolean): void {
        this.DEBUG_CACHE = enabled;
    }

    /**
     * 更新缓存配置
     */
    static updateConfig(config: Partial<CacheConfig>): void {
        this.config = { ...this.config, ...config };
        this.logDebug('updateConfig', this.config);
        
        // 重新启动清理定时器
        this.startCleanupTimer();
    }

    /**
     * 启动自动清理定时器
     */
    private static startCleanupTimer(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }

        if (this.config.enabled && this.config.checkInterval > 0) {
            this.cleanupTimer = setInterval(() => {
                this.cleanupExpiredEntries();
            }, this.config.checkInterval);
        }
    }

    /**
     * 生成批次状态哈希值
     * 用于检测批次数据变化
     */
    private static generateBatchesHash(): string {
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            return 'no-storage';
        }

        try {
            const indexStr = localStorage.getItem('daggerheart_custom_cards_index');
            if (!indexStr) return 'no-index';

            const index = JSON.parse(indexStr);
            const batchInfo = Object.entries(index.batches || {})
                .sort(([a], [b]) => a.localeCompare(b)) // 确保顺序一致
                .map(([id, batch]: [string, any]) => ({
                    id,
                    disabled: batch.disabled || false,
                    lastUpdate: batch.lastUpdate || ''
                }));

            return JSON.stringify(batchInfo);
        } catch (error) {
            this.logDebug('generateBatchesHash', { error });
            return 'error';
        }
    }

    /**
     * 检查批次数据是否发生变化
     */
    private static hasBatchesChanged(): boolean {
        const currentHash = this.generateBatchesHash();
        const changed = currentHash !== this.lastBatchesHash;
        
        if (changed) {
            this.logDebug('hasBatchesChanged', {
                oldHash: this.lastBatchesHash,
                newHash: currentHash
            });
            this.lastBatchesHash = currentHash;
        }
        
        return changed;
    }

    /**
     * 检查缓存条目是否有效
     */
    private static isEntryValid<T>(entry: CacheEntry<T>): boolean {
        if (!this.config.enabled) {
            return false;
        }

        const now = Date.now();
        const isExpired = (now - entry.timestamp) > this.config.maxAge;
        const isBatchesChanged = entry.batchesHash !== this.lastBatchesHash;

        if (isExpired || isBatchesChanged) {
            this.logDebug('isEntryValid', {
                key: 'unknown',
                isExpired,
                isBatchesChanged,
                age: now - entry.timestamp,
                maxAge: this.config.maxAge
            });
            return false;
        }

        return true;
    }

    /**
     * 获取缓存的自定义字段名称
     */
    static getCachedCustomFieldNames(): CustomFieldNamesStore | null {
        if (!this.config.enabled) {
            return null;
        }

        // 检查批次数据是否发生变化
        if (this.hasBatchesChanged()) {
            this.invalidateAll();
            return null;
        }

        const entry = this.cache.get('customFieldNames');
        if (!entry || !this.isEntryValid(entry)) {
            this.logDebug('getCachedCustomFieldNames', 'cache miss or invalid');
            return null;
        }

        this.logDebug('getCachedCustomFieldNames', 'cache hit');
        return entry.data;
    }

    /**
     * 缓存自定义字段名称
     */
    static setCachedCustomFieldNames(data: CustomFieldNamesStore): void {
        if (!this.config.enabled) {
            return;
        }

        const entry: CacheEntry<CustomFieldNamesStore> = {
            data,
            timestamp: Date.now(),
            batchesHash: this.lastBatchesHash || this.generateBatchesHash()
        };

        this.cache.set('customFieldNames', entry);
        this.logDebug('setCachedCustomFieldNames', {
            categoriesCount: Object.keys(data).length,
            timestamp: entry.timestamp
        });
    }

    /**
     * 获取缓存的变体类型定义
     */
    static getCachedVariantTypes(): VariantTypesForBatch | null {
        if (!this.config.enabled) {
            return null;
        }

        // 检查批次数据是否发生变化
        if (this.hasBatchesChanged()) {
            this.invalidateAll();
            return null;
        }

        const entry = this.cache.get('variantTypes');
        if (!entry || !this.isEntryValid(entry)) {
            this.logDebug('getCachedVariantTypes', 'cache miss or invalid');
            return null;
        }

        this.logDebug('getCachedVariantTypes', 'cache hit');
        return entry.data;
    }

    /**
     * 缓存变体类型定义
     */
    static setCachedVariantTypes(data: VariantTypesForBatch): void {
        if (!this.config.enabled) {
            return;
        }

        const entry: CacheEntry<VariantTypesForBatch> = {
            data,
            timestamp: Date.now(),
            batchesHash: this.lastBatchesHash || this.generateBatchesHash()
        };

        this.cache.set('variantTypes', entry);
        this.logDebug('setCachedVariantTypes', {
            typesCount: Object.keys(data).length,
            timestamp: entry.timestamp
        });
    }

    /**
     * 使指定缓存失效
     */
    static invalidate(key: CacheKey): void {
        const deleted = this.cache.delete(key);
        this.logDebug('invalidate', { key, deleted });
    }

    /**
     * 使所有缓存失效
     */
    static invalidateAll(): void {
        const size = this.cache.size;
        this.cache.clear();
        this.logDebug('invalidateAll', { clearedEntries: size });
    }

    /**
     * 清理过期的缓存条目
     */
    private static cleanupExpiredEntries(): void {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (!this.isEntryValid(entry)) {
                this.cache.delete(key);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            this.logDebug('cleanupExpiredEntries', { 
                cleanedCount, 
                remainingCount: this.cache.size 
            });
        }
    }

    /**
     * 获取缓存统计信息
     */
    static getStats(): {
        enabled: boolean;
        size: number;
        entries: Array<{
            key: CacheKey;
            timestamp: number;
            age: number;
            batchesHash: string;
            isValid: boolean;
        }>;
        config: CacheConfig;
    } {
        const now = Date.now();
        const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
            key,
            timestamp: entry.timestamp,
            age: now - entry.timestamp,
            batchesHash: entry.batchesHash,
            isValid: this.isEntryValid(entry)
        }));

        return {
            enabled: this.config.enabled,
            size: this.cache.size,
            entries,
            config: this.config
        };
    }

    /**
     * 初始化缓存系统
     */
    static initialize(): void {
        this.lastBatchesHash = this.generateBatchesHash();
        this.startCleanupTimer();
        this.logDebug('initialize', { 
            initialHash: this.lastBatchesHash,
            config: this.config 
        });
    }

    /**
     * 销毁缓存系统
     */
    static destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.invalidateAll();
        this.logDebug('destroy', 'cache system destroyed');
    }
}

// 自动初始化缓存系统
if (typeof window !== 'undefined') {
    CardStorageCache.initialize();
    
    // 在页面卸载时清理
    window.addEventListener('beforeunload', () => {
        CardStorageCache.destroy();
    });
}
