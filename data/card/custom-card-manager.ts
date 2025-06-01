/**
 * 自定义卡牌管理器
 * 负责自定义卡牌的导入、管理和与现有卡牌系统的集成
 */

import { CardManager } from './card-manager';
import { CustomCardStorage, type BatchData, type ImportBatch } from './custom-card-storage';
import {
    StandardCard,
    ImportData,
    ImportResult,
    ValidationResult,
    CustomCardStats,
    BatchStats,
    CardSource,
    ExtendedStandardCard
} from './card-types';
import { CardTypeValidator } from './type-validators';
import { professionCardConverter } from './profession-card/convert';
import { ancestryCardConverter } from './ancestry-card/convert';
import { communityCardConverter } from './community-card/convert';
import { subclassCardConverter } from './subclass-card/convert';
import { domainCardConverter } from './domain-card/convert';

/**
 * 自定义卡牌管理器类
 */
export class CustomCardManager {
    private static instance: CustomCardManager;
    private customCards: ExtendedStandardCard[] = [];
    private cardManager: CardManager;

    private constructor() {
        this.cardManager = CardManager.getInstance();
        if (typeof window !== 'undefined') {
            this.loadCustomCards();
        }
    }

    static getInstance(): CustomCardManager {
        if (!CustomCardManager.instance) {
            CustomCardManager.instance = new CustomCardManager();
        }
        return CustomCardManager.instance;
    }

    // ===== 核心导入功能 =====

    /**
     * 导入自定义卡牌数据
     * @param importData 导入的原始数据
     * @param batchName 批次名称（可选）
     * @returns 导入结果
     */
    async importCards(importData: ImportData, batchName?: string): Promise<ImportResult> {
        const batchId = CustomCardStorage.generateBatchId();
        let hasCreatedBatch = false;

        try {
            // 第一步：验证导入数据格式
            const formatValidation = this.validateImportDataFormat(importData);
            if (!formatValidation.isValid) {
                return {
                    success: false,
                    imported: 0,
                    errors: formatValidation.errors
                };
            }

            // 第二步：ID冲突检查（严格模式）
            const existingCards = await this.getAllExistingCards();
            const validation = this.validateUniqueIds(importData, existingCards);
            if (!validation.isValid) {
                return {
                    success: false,
                    imported: 0,
                    errors: [`ID冲突检测到重复ID: ${validation.duplicateIds.join(', ')}`],
                    duplicateIds: validation.duplicateIds
                };
            }

            // 第三步：数据转换
            const convertResult = await this.convertImportData(importData);
            if (!convertResult.success) {
                return {
                    success: false,
                    imported: 0,
                    errors: convertResult.errors
                };
            }

            // 第四步：准备批次数据
            const batchData: BatchData = {
                metadata: {
                    batchId,
                    fileName: batchName || 'imported.json',
                    importTime: new Date().toISOString(),
                    originalData: importData
                },
                cards: convertResult.cards
            };

            // 第五步：检查存储空间
            const dataSize = JSON.stringify(batchData).length * 2;
            if (!CustomCardStorage.checkStorageSpace(dataSize)) {
                const storageInfo = CustomCardStorage.getFormattedStorageInfo();
                return {
                    success: false,
                    imported: 0,
                    errors: [`存储空间不足。当前使用: ${storageInfo.used}/${storageInfo.total}`]
                };
            }

            // 第六步：存储操作（事务性）
            CustomCardStorage.saveBatch(batchId, batchData);
            hasCreatedBatch = true;

            // 第七步：更新索引
            const index = CustomCardStorage.loadIndex();
            const cardTypes = [...new Set(convertResult.cards.map(card => card.type))];

            index.batches[batchId] = {
                id: batchId,
                name: batchName || `导入批次 ${new Date().toLocaleDateString()}`,
                fileName: batchName || 'imported.json',
                importTime: batchData.metadata.importTime,
                cardCount: convertResult.cards.length,
                cardTypes,
                size: dataSize
            };
            index.totalCards += convertResult.cards.length;
            index.totalBatches++;

            CustomCardStorage.saveIndex(index);

            // 第八步：更新内存缓存
            this.reloadCustomCards();

            return {
                success: true,
                imported: convertResult.cards.length,
                errors: [],
                batchId
            };

        } catch (error) {
            // 清理失败的操作
            if (hasCreatedBatch) {
                CustomCardStorage.removeBatch(batchId);
            }

            console.error('[CustomCardManager] 导入失败:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                imported: 0,
                errors: [`导入失败: ${errorMessage}`]
            };
        }
    }

    // ===== 数据验证 =====

    /**
     * 验证导入数据格式（支持新的类型化格式和传统格式）
     */
    private validateImportDataFormat(importData: ImportData): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        console.log('[DEBUG] 开始验证导入数据格式');
        console.log('[DEBUG] 导入数据:', JSON.stringify(importData, null, 2));

        if (!importData || typeof importData !== 'object') {
            errors.push('导入数据格式无效：必须是JSON对象');
            return { isValid: false, errors };
        }

        // 使用新的类型验证器
        console.log('[DEBUG] 使用CardTypeValidator验证数据');
        const typeValidation = CardTypeValidator.validateImportData(importData);
        console.log('[DEBUG] 验证结果:', typeValidation);

        if (!typeValidation.isValid) {
            const errorMessages = typeValidation.errors.map(err => `${err.path}: ${err.message}`);
            errors.push(...errorMessages);
        }

        // 检查是否有任何卡牌数据
        if (typeValidation.totalCards === 0) {
            errors.push('导入数据为空：没有找到任何卡牌数据');
        }

        console.log('[DEBUG] 最终验证结果:', { isValid: errors.length === 0, errors });
        return { isValid: errors.length === 0, errors };
    }

    /**
     * 验证ID唯一性（支持新的类型化格式和传统格式）
     */
    private validateUniqueIds(importData: ImportData, existingCards: StandardCard[]): ValidationResult {
        const duplicateIds: string[] = [];
        const existingIds = new Set(existingCards.map(card => card.id).filter(Boolean));

        console.log(`[CustomCardManager] 当前已存在的卡牌ID数量: ${existingIds.size}`);

        // 检查各种类型的卡牌ID
        const cardTypesToCheck = [
            { cards: importData.profession, type: 'profession' },
            { cards: importData.ancestry, type: 'ancestry' },
            { cards: importData.community, type: 'community' },
            { cards: importData.subclass, type: 'subclass' },
            { cards: importData.domain, type: 'domain' },
        ];

        for (const { cards, type } of cardTypesToCheck) {
            if (cards && Array.isArray(cards)) {
                for (const card of cards) {
                    if (card) {
                        // 根据卡牌类型提取ID
                        const cardId = this.extractCardId(card, type);
                        if (cardId && existingIds.has(cardId)) {
                            duplicateIds.push(`${type}.${cardId}`);
                            console.log(`[CustomCardManager] 发现重复ID: ${cardId} (类型: ${type})`);
                        }
                    }
                }
            }
        }

        return {
            isValid: duplicateIds.length === 0,
            duplicateIds
        };
    }

    /**
     * 从卡牌数据中提取ID（支持不同卡牌类型的字段名）
     */
    private extractCardId(card: any, cardType: string): string | null {
        if (!card) return null;

        // 根据不同卡牌类型的字段名提取ID
        switch (cardType) {
            case 'domain':
            case 'community':
                return card.ID || card.id || null;
            case 'profession':
            case 'ancestry':
            case 'subclass':
                return card.id || null;
            default:
                return card.id || card.ID || null;
        }
    }

    // ===== 数据转换 =====

    /**
     * 转换导入数据为StandardCard格式（支持新的类型化格式）
     */
    private async convertImportData(importData: ImportData): Promise<{
        success: boolean;
        cards: ExtendedStandardCard[];
        errors: string[]
    }> {
        const convertedCards: ExtendedStandardCard[] = [];
        const errors: string[] = [];

        try {
            console.log(`[CustomCardManager] 开始转换卡牌数据`);

            // 转换职业卡牌
            if (importData.profession && Array.isArray(importData.profession)) {
                for (let i = 0; i < importData.profession.length; i++) {
                    try {
                        const standardCard = professionCardConverter.toStandard(importData.profession[i]);
                        const extendedCard: ExtendedStandardCard = {
                            ...standardCard,
                            source: CardSource.CUSTOM
                        };
                        convertedCards.push(extendedCard);
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        errors.push(`profession[${i}]: 转换失败 - ${errorMessage}`);
                    }
                }
            }

            // 转换血统卡牌
            if (importData.ancestry && Array.isArray(importData.ancestry)) {
                for (let i = 0; i < importData.ancestry.length; i++) {
                    try {
                        const standardCard = ancestryCardConverter.toStandard(importData.ancestry[i]);
                        const extendedCard: ExtendedStandardCard = {
                            ...standardCard,
                            source: CardSource.CUSTOM
                        };
                        convertedCards.push(extendedCard);
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        errors.push(`ancestry[${i}]: 转换失败 - ${errorMessage}`);
                    }
                }
            }

            // 转换社群卡牌
            if (importData.community && Array.isArray(importData.community)) {
                for (let i = 0; i < importData.community.length; i++) {
                    try {
                        const standardCard = communityCardConverter.toStandard(importData.community[i]);
                        const extendedCard: ExtendedStandardCard = {
                            ...standardCard,
                            source: CardSource.CUSTOM
                        };
                        convertedCards.push(extendedCard);
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        errors.push(`community[${i}]: 转换失败 - ${errorMessage}`);
                    }
                }
            }

            // 转换子职业卡牌
            if (importData.subclass && Array.isArray(importData.subclass)) {
                for (let i = 0; i < importData.subclass.length; i++) {
                    try {
                        const standardCard = subclassCardConverter.toStandard(importData.subclass[i]);
                        const extendedCard: ExtendedStandardCard = {
                            ...standardCard,
                            source: CardSource.CUSTOM
                        };
                        convertedCards.push(extendedCard);
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        errors.push(`subclass[${i}]: 转换失败 - ${errorMessage}`);
                    }
                }
            }

            // 转换领域卡牌
            if (importData.domain && Array.isArray(importData.domain)) {
                for (let i = 0; i < importData.domain.length; i++) {
                    try {
                        const standardCard = domainCardConverter.toStandard(importData.domain[i]);
                        const extendedCard: ExtendedStandardCard = {
                            ...standardCard,
                            source: CardSource.CUSTOM
                        };
                        convertedCards.push(extendedCard);
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        errors.push(`domain[${i}]: 转换失败 - ${errorMessage}`);
                    }
                }
            }

            console.log(`[CustomCardManager] 转换完成，成功: ${convertedCards.length}, 错误: ${errors.length}`);

            return {
                success: convertedCards.length > 0,
                cards: convertedCards,
                errors
            };

        } catch (error) {
            console.error('[CustomCardManager] 数据转换失败:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                cards: [],
                errors: [`数据转换失败: ${errorMessage}`]
            };
        }
    }

    // ===== 数据获取 =====

    /**
     * 获取所有现有卡牌（内置+自定义）
     */
    private async getAllExistingCards(): Promise<StandardCard[]> {
        // 导入内置卡牌（避免循环依赖，在运行时导入）
        let builtinCards: StandardCard[] = [];

        try {
            // 只导入内置卡牌，不包含自定义卡牌
            const cardModule = await import('./index');
            // 获取内置卡牌，避免包含可能过时的自定义卡牌
            builtinCards = cardModule.getAllBuiltinCards();
        } catch (error) {
            console.warn('[CustomCardManager] 无法加载内置卡牌，仅检查自定义卡牌ID冲突');
        }

        console.log(`[CustomCardManager] 内置卡牌数量: ${builtinCards.length}, 当前自定义卡牌数量: ${this.customCards.length}`);
        return [...builtinCards, ...this.customCards];
    }

    /**
     * 重新加载自定义卡牌到内存
     */
    private reloadCustomCards(): void {
        console.log(`[CustomCardManager] 开始重新加载自定义卡牌`);
        this.customCards = [];
        const index = CustomCardStorage.loadIndex();

        console.log(`[CustomCardManager] 索引中的批次数量: ${Object.keys(index.batches).length}`);

        for (const batchId of Object.keys(index.batches)) {
            const batchData = CustomCardStorage.loadBatch(batchId);
            if (batchData && batchData.cards) {
                const cardsWithBatchId = batchData.cards.map(card => ({
                    ...card,
                    source: CardSource.CUSTOM,
                    batchId
                }));
                this.customCards.push(...cardsWithBatchId);
                console.log(`[CustomCardManager] 从批次 ${batchId} 加载了 ${cardsWithBatchId.length} 张卡牌`);
            }
        }

        console.log(`[CustomCardManager] 重新加载完成，总共 ${this.customCards.length} 张自定义卡牌`);
    }

    /**
     * 初始加载自定义卡牌
     */
    private loadCustomCards(): void {
        this.reloadCustomCards();
    }

    // ===== 公共接口 =====

    /**
     * 获取所有自定义卡牌
     */
    getCustomCards(): ExtendedStandardCard[] {
        return [...this.customCards];
    }

    /**
     * 根据类型获取自定义卡牌
     */
    getCustomCardsByType(type: string): ExtendedStandardCard[] {
        return this.customCards.filter(card => card.type === type);
    }

    /**
     * 获取所有批次信息
     */
    getAllBatches(): ImportBatch[] {
        const index = CustomCardStorage.loadIndex();
        return Object.values(index.batches);
    }

    /**
     * 根据ID获取批次信息
     */
    getBatchById(batchId: string): ImportBatch | null {
        const index = CustomCardStorage.loadIndex();
        return index.batches[batchId] || null;
    }

    /**
     * 删除批次
     */
    removeBatch(batchId: string): boolean {
        try {
            const index = CustomCardStorage.loadIndex();

            if (!index.batches[batchId]) {
                return false;
            }

            const batch = index.batches[batchId];

            // 删除批次数据
            CustomCardStorage.removeBatch(batchId);

            // 更新索引
            delete index.batches[batchId];
            index.totalBatches--;
            index.totalCards -= batch.cardCount;

            CustomCardStorage.saveIndex(index);

            // 重新加载内存中的卡牌数据
            this.reloadCustomCards();

            return true;
        } catch (error) {
            console.error(`[CustomCardManager] 删除批次 ${batchId} 失败:`, error);
            return false;
        }
    }

    /**
     * 清空所有自定义卡牌
     */
    clearAllCustomCards(): void {
        try {
            CustomCardStorage.clearAllData();
            this.customCards = [];
        } catch (error) {
            console.error('[CustomCardManager] 清空自定义卡牌失败:', error);
            throw error;
        }
    }

    /**
     * 获取统计信息
     */
    getStats(): CustomCardStats {
        const index = CustomCardStorage.loadIndex();
        const cardsByType: Record<string, number> = {};
        const cardsByBatch: Record<string, number> = {};

        // 统计各类型卡牌数量
        for (const card of this.customCards) {
            cardsByType[card.type] = (cardsByType[card.type] || 0) + 1;
        }

        // 统计各批次卡牌数量
        for (const batch of Object.values(index.batches)) {
            cardsByBatch[batch.id] = batch.cardCount;
        }

        const storageStats = CustomCardStorage.calculateStorageUsage();

        return {
            totalCards: index.totalCards,
            totalBatches: index.totalBatches,
            cardsByType,
            cardsByBatch,
            storageUsed: storageStats.totalSize
        };
    }

    /**
     * 获取批次统计信息
     */
    getBatchStats(batchId: string): BatchStats | null {
        const batch = this.getBatchById(batchId);
        if (!batch) return null;

        return {
            cardCount: batch.cardCount,
            cardTypes: batch.cardTypes,
            storageSize: batch.size,
            importTime: batch.importTime
        };
    }

    /**
     * 获取存储完整性报告
     */
    validateIntegrity() {
        return CustomCardStorage.validateIntegrity();
    }

    /**
     * 清理孤立数据
     */
    cleanupOrphanedData() {
        const result = CustomCardStorage.cleanupOrphanedData();
        if (result.removedKeys.length > 0) {
            this.reloadCustomCards();
        }
        return result;
    }

    /**
     * 获取存储使用情况
     */
    getStorageInfo() {
        return CustomCardStorage.getFormattedStorageInfo();
    }
}

// 导出单例实例
export const customCardManager = CustomCardManager.getInstance();
