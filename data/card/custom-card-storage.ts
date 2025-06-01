/**
 * 自定义卡牌存储抽象层
 * 提供对localStorage的抽象操作，管理自定义卡牌的存储架构
 */

// 存储键常量定义
export const STORAGE_KEYS = {
    INDEX: 'daggerheart_custom_cards_index',
    BATCH_PREFIX: 'daggerheart_custom_cards_batch_',
    CONFIG: 'daggerheart_custom_cards_config',
    CUSTOM_FIELD_NAMES: 'daggerheart_custom_field_names' // New key for custom field names
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

export interface ImportBatch {
    id: string;
    name: string;
    fileName: string;
    importTime: string;
    cardCount: number;
    cardTypes: string[];
    size: number;
    isSystemBatch?: boolean; // 标识是否为系统内置卡包
    version?: string; // 内置卡包版本号
}

export interface BatchData {
    metadata: {
        batchId: string;
        fileName: string;
        importTime: string;
        // 保留卡包源信息
        name?: string;
        version?: string;
        description?: string;
        author?: string;
    };
    cards: any[]; // StandardCard[] - 避免循环依赖，使用any
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
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : null;
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

    // ===== 新增：自定义字段名操作 =====

    /**
     * 加载所有自定义字段名
     */
    static getAllCustomFieldNames(): CustomFieldNamesStore {
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            return {};
        }
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_FIELD_NAMES);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('[CustomCardStorage] 自定义字段名加载失败:', error);
        }
        return {};
    }

    /**
     * 保存指定类别的自定义字段名列表
     */
    static saveCustomFieldNames(category: string, names: string[]): void {
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
        try {
            const allCustomFieldNames = this.getAllCustomFieldNames();
            allCustomFieldNames[category] = [...new Set(names)]; // Ensure uniqueness before saving
            localStorage.setItem(STORAGE_KEYS.CUSTOM_FIELD_NAMES, JSON.stringify(allCustomFieldNames));
        } catch (error) {
            console.error(`[CustomCardStorage] 类别 ${category} 的自定义字段名保存失败:`, error);
            throw new Error(`无法保存类别 ${category} 的自定义字段名`);
        }
    }

    /**
     * 加载指定类别的自定义字段名列表
     */
    static loadCustomFieldNames(category: string): string[] {
        const allCustomFieldNames = this.getAllCustomFieldNames();
        return allCustomFieldNames[category] || [];
    }

    /**
     * 清除指定类别的自定义字段名
     */
    static clearCustomFieldNames(category: string): void {
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
        try {
            const allCustomFieldNames = this.getAllCustomFieldNames();
            if (allCustomFieldNames[category]) {
                delete allCustomFieldNames[category];
                localStorage.setItem(STORAGE_KEYS.CUSTOM_FIELD_NAMES, JSON.stringify(allCustomFieldNames));
            }
        } catch (error) {
            console.error(`[CustomCardStorage] 类别 ${category} 的自定义字段名清除失败:`, error);
            throw new Error(`无法清除类别 ${category} 的自定义字段名`);
        }
    }

    /**
     * 清空所有自定义字段名数据
     */
    static clearAllCustomFieldNamesData(): void {
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
        try {
            localStorage.removeItem(STORAGE_KEYS.CUSTOM_FIELD_NAMES);
        } catch (error) {
            console.error('[CustomCardStorage] 清空所有自定义字段名数据失败:', error);
            throw new Error('无法清空所有自定义字段名数据');
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
     * 清空所有自定义卡牌数据
     */
    static clearAllData(): void {
        try {
            const index = this.loadIndex();

            // 删除所有批次数据
            for (const batchId of Object.keys(index.batches)) {
                this.removeBatch(batchId);
            }

            // 清空索引和配置
            localStorage.removeItem(STORAGE_KEYS.INDEX);
            localStorage.removeItem(STORAGE_KEYS.CONFIG);
            // 清空自定义字段名
            this.clearAllCustomFieldNamesData();

        } catch (error) {
            console.error('[CustomCardStorage] 清空数据失败:', error);
            throw new Error('无法清空自定义卡牌数据');
        }
    }
}
