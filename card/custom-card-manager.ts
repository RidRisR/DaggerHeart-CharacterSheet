/**
 * 自定义卡牌管理器
 * 负责自定义卡牌的导入、管理和与现有卡牌系统的集成
 */

// 调试日志标记
const DEBUG_CARD_MANAGER = false;
const logDebug = (operation: string, details: any) => {
    if (DEBUG_CARD_MANAGER) {
        console.log(`[CustomCardManager:${operation}]`, details);
    }
};

import { CustomCardStorage, type BatchData, type ImportBatch } from './card-storage';
import { CardStorageCache } from './card-storage-cache';
import {
    StandardCard,
    ImportData,
    ImportResult,
    ValidationResult,
    CustomCardStats,
    BatchStats,
    CardSource,
    ExtendedStandardCard,
    CardType, // Assuming CardType enum might be useful here or for keys
    processCardDescription
} from './card-types';
// 移除对 builtin-card-data.ts 的依赖
const BUILTIN_BATCH_ID = "SYSTEM_BUILTIN_CARDS";
import { CardTypeValidator, type ValidationContext } from './type-validators';
import { ValidationDataMerger } from './validation-utils';
import { professionCardConverter } from './profession-card/convert';
import { ancestryCardConverter } from './ancestry-card/convert';
import { communityCardConverter } from './community-card/convert';
import { AncestryCard } from "@/card/ancestry-card/convert";
import { CommunityCard } from "@/card/community-card/convert";
import { DomainCard } from "@/card/domain-card/convert";
import { ProfessionCard } from "@/card/profession-card/convert";
import { SubClassCard } from "@/card/subclass-card/convert";
import { RawVariantCard } from "./variant-card/convert";
import { subclassCardConverter } from './subclass-card/convert';
import { domainCardConverter } from './domain-card/convert';
import { variantCardConverter } from './variant-card/convert';
// 静态导入内置卡牌包JSON文件
import builtinCardPackJson from '../data/cards/builtin-base.json';

/**
 * JSON卡牌包接口定义
 */
interface JsonCardPack {
    name: string;
    version: string;
    description: string;
    author: string;
    customFieldDefinitions?: any; // 支持自定义字段定义和变体类型定义
    profession?: any[];
    ancestry?: any[];
    community?: any[];
    subclass?: any[];
    domain?: any[];
    variant?: any[];
}

/**
 * 内置卡牌包加载器类
 */
class BuiltinCardPackLoader {
    /**
     * 获取静态导入的内置卡牌包
     */
    static getBuiltinCardPack(): JsonCardPack {
        const cardPack = builtinCardPackJson as JsonCardPack;
        return cardPack;
    }

    /**
     * 将JSON卡牌包转换为标准卡牌格式
     */
    static convertJsonPackToStandardCards(jsonPack: JsonCardPack): ExtendedStandardCard[] {
        const standardCards: ExtendedStandardCard[] = [];

        // 转换各种类型的卡牌
        const typeConverters = {
            profession: professionCardConverter,
            ancestry: ancestryCardConverter,
            community: communityCardConverter,
            subclass: subclassCardConverter,
            domain: domainCardConverter,
            variant: variantCardConverter
        };

        Object.entries(typeConverters).forEach(([type, converter]) => {
            const cards = jsonPack[type as keyof JsonCardPack];
            if (Array.isArray(cards)) {
                const convertedCards = cards
                    .map(card => {
                        try {
                            const converted = converter.toStandard(card);
                            return converted ? { ...converted, source: CardSource.BUILTIN } : null;
                        } catch (error) {
                            console.warn(`[BuiltinCardPackLoader] 转换${type}卡牌失败:`, card, error);
                            return null;
                        }
                    })
                    .filter(Boolean) as ExtendedStandardCard[];

                standardCards.push(...convertedCards);
                console.log(`[BuiltinCardPackLoader] 转换${type}卡牌: ${convertedCards.length}张`);
            }
        });

        return standardCards;
    }
}

/**
 * 统一卡牌管理器类 (原CustomCardManager)
 * 集成了BuiltinCardManager的转换器功能
 */
export class CustomCardManager {
    private static instance: CustomCardManager;
    private customCards: ExtendedStandardCard[] = [];

    // 转换器注册功能（原BuiltinCardManager功能）
    private cardConverters: {
        [K in keyof CardTypeMap]?: (card: CardTypeMap[K]) => StandardCard
    } = {}

    private isInitialized = false;
    private initializationPromise: Promise<void> | null = null;

    private constructor() {
        // 不在构造函数中立即开始初始化，等待ensureInitialized()被调用
        console.log('[CustomCardManager] 构造函数完成，等待显式初始化');
    }

    /**
     * 初始化系统，包括内置卡牌种子化和自定义卡牌加载
     */
    private async initializeSystem(): Promise<void> {
        if (this.isInitialized) return;

        try {
            console.log('[CustomCardManager] 开始初始化系统...');

            // 首先初始化存储系统，执行必要的迁移和清理
            const storageInitResult = CustomCardStorage.initialize();
            if (storageInitResult.initialized) {
                console.log('[CustomCardManager] 存储系统初始化成功');
                if (storageInitResult.migrationResult?.migrated) {
                    console.log(`[CustomCardManager] 数据迁移成功，更新了 ${storageInitResult.migrationResult.batchesUpdated.length} 个批次`);
                }
            } else {
                console.warn('[CustomCardManager] 存储系统初始化失败:', storageInitResult.errors);
            }

            // 种子化内置卡牌
            await this._seedOrUpdateBuiltinCards();
            // 然后加载自定义卡牌
            this.loadCustomCards();

            this.isInitialized = true;
            console.log('[CustomCardManager] 系统初始化完成');
        } catch (error) {
            console.error('[CustomCardManager] 系统初始化失败:', error);
            // 即使内置卡牌初始化失败，也要尝试加载自定义卡牌
            this.loadCustomCards();
            this.isInitialized = true; // 标记为已初始化，避免重复尝试
        }
    }

    static getInstance(): CustomCardManager {
        if (!CustomCardManager.instance) {
            CustomCardManager.instance = new CustomCardManager();
        }
        return CustomCardManager.instance;
    }

    /**
     * 手动初始化系统（用于确保转换器已注册后再初始化）
     */
    async ensureInitialized(): Promise<void> {
        // 在静态导出项目中，这个方法只在浏览器环境中有意义
        // 构建时的预渲染会跳过这个初始化
        if (typeof window === 'undefined') {
            console.log('[CustomCardManager] 跳过服务端/构建时初始化');
            return;
        }

        if (this.initializationPromise) {
            await this.initializationPromise;
        }
        if (!this.isInitialized) {
            this.initializationPromise = this.initializeSystem();
            await this.initializationPromise;
        }
    }

    /**
     * 检查系统是否已初始化（同步方法）
     */
    isSystemInitialized(): boolean {
        return this.isInitialized;
    }

    // ===== 核心导入功能 =====

    /**
     * 导入自定义卡牌数据
     * @param importData 导入的原始数据
     * @param batchName 批次名称（可选）
     * @returns 导入结果
     */
    async importCards(importData: ImportData, batchName?: string): Promise<ImportResult> {
        // 确保系统已初始化
        await this.ensureInitialized();

        const batchId = CustomCardStorage.generateBatchId();
        let hasCreatedBatch = false;

        logDebug('importCards', {
            batchId,
            batchName,
            hasCustomFieldDefs: !!importData.customFieldDefinitions,
            customFieldDefs: importData.customFieldDefinitions,
            professionCount: importData.profession?.length || 0,
            ancestryCount: importData.ancestry?.length || 0,
            communityCount: importData.community?.length || 0
        });

        try {
            // 第一步：准备验证上下文（不进行任何存储写入）
            logDebug('importCards', { step: 'preparing validation context' });

            // 创建验证上下文，包含当前存储的数据和导入数据的合并视图
            let validationContext = undefined;
            if (importData.customFieldDefinitions) {
                // 导入验证工具模块
                const { ValidationDataMerger } = await import('./validation-utils');

                // 获取当前存储的数据
                const currentCustomFields = CustomCardStorage.getAggregatedCustomFieldNames();
                const currentVariantTypes = CustomCardStorage.getAggregatedVariantTypes();

                // 创建验证上下文
                validationContext = ValidationDataMerger.createValidationContext(
                    batchId,
                    importData.customFieldDefinitions ? Object.fromEntries(
                        Object.entries(importData.customFieldDefinitions)
                            .filter(([key, value]) => Array.isArray(value))
                            .map(([key, value]) => [key, value as string[]])
                    ) : undefined,
                    importData.customFieldDefinitions?.variantTypes
                );

                logDebug('importCards', {
                    step: 'validation context created',
                    contextKeys: Object.keys(validationContext.customFields),
                    variantTypeKeys: Object.keys(validationContext.variantTypes)
                });
            }

            // 第二步：验证导入数据格式（使用验证上下文）
            logDebug('importCards', { step: 'format validation' });
            const formatValidation = this.validateImportDataFormat(importData, validationContext);
            if (!formatValidation.isValid) {
                logDebug('importCards', {
                    step: 'format validation failed',
                    errors: formatValidation.errors
                });
                return {
                    success: false,
                    imported: 0,
                    errors: formatValidation.errors
                };
            }

            // 第三步：ID冲突检查（严格模式）
            logDebug('importCards', { step: 'ID conflict check' });
            const existingCards = await this.getAllExistingCards();
            const validation = this.validateUniqueIds(importData, existingCards);
            if (!validation.isValid) {
                logDebug('importCards', {
                    step: 'ID conflict detected',
                    duplicateIds: validation.duplicateIds
                });
                return {
                    success: false,
                    imported: 0,
                    errors: [`ID冲突检测到重复ID: ${validation.duplicateIds.join(', ')}`],
                    duplicateIds: validation.duplicateIds
                };
            }

            // 第四步：变体类型冲突检测（严格模式）
            logDebug('importCards', { step: 'variant type conflict check' });
            const variantTypeValidation = this.validateVariantTypeUniqueness(importData);
            if (!variantTypeValidation.isValid) {
                logDebug('importCards', {
                    step: 'variant type conflict detected',
                    conflictingTypes: variantTypeValidation.conflictingTypes
                });
                return {
                    success: false,
                    imported: 0,
                    errors: [`variantTypes冲突检测到重复类型: ${variantTypeValidation.conflictingTypes.join(', ')}`],
                    conflictingTypes: variantTypeValidation.conflictingTypes
                };
            }

            // 第五步：数据转换
            logDebug('importCards', { step: 'data conversion' });
            const convertResult = await this.convertImportData(importData);
            if (!convertResult.success) {
                logDebug('importCards', {
                    step: 'conversion failed',
                    errors: convertResult.errors
                });
                return {
                    success: false,
                    imported: 0,
                    errors: convertResult.errors
                };
            }

            // 第六步：准备批次数据
            logDebug('importCards', { step: 'preparing batch data' });
            const batchData: BatchData = {
                metadata: {
                    id: batchId,
                    fileName: batchName || 'Unnamed Import',
                    importTime: new Date().toISOString(),
                    name: importData.name,
                    version: importData.version || 'NO VERSION PROVIDED',
                    description: importData.description,
                    author: importData.author
                },
                cards: convertResult.cards,
                customFieldDefinitions: importData.customFieldDefinitions
                    ? Object.fromEntries(
                        Object.entries(importData.customFieldDefinitions)
                            .filter(([key, value]) => Array.isArray(value) && key !== 'variantTypes')
                            .map(([key, value]) => [key, value as string[]])
                    )
                    : undefined,
                variantTypes: importData.customFieldDefinitions?.variantTypes || undefined
            };

            logDebug('importCards', {
                step: 'batch data prepared',
                cardCount: convertResult.cards.length,
                batchData: {
                    metadata: batchData.metadata,
                    customFieldDefinitions: batchData.customFieldDefinitions
                }
            });

            // 第七步：检查存储空间
            logDebug('importCards', { step: 'storage space check' });
            const dataSize = JSON.stringify(batchData).length * 2;
            if (!CustomCardStorage.checkStorageSpace(dataSize)) {
                logDebug('importCards', {
                    step: 'insufficient storage space',
                    requiredSize: dataSize
                });
                const storageInfo = CustomCardStorage.getFormattedStorageInfo();
                return {
                    success: false,
                    imported: 0,
                    errors: [`存储空间不足。当前使用: ${storageInfo.used}/${storageInfo.total}`]
                };
            }

            // 第八步：存储操作（事务性 - 使用新的优化存储机制）
            logDebug('importCards', { step: 'saving batch with optimized storage' });

            try {
                // 保存批次数据 - 这是关键的原子操作
                CustomCardStorage.saveBatch(batchId, batchData);
                hasCreatedBatch = true;

                logDebug('importCards', {
                    step: 'batch saved successfully',
                    batchId,
                    dataSize: dataSize,
                    cardCount: convertResult.cards.length
                });
            } catch (storageError) {
                logDebug('importCards', {
                    step: 'batch save failed',
                    error: storageError,
                    batchId
                });
                throw new Error(`批次数据保存失败: ${storageError instanceof Error ? storageError.message : String(storageError)}`);
            }

            // 第九步：更新索引
            logDebug('importCards', { step: 'updating index' });
            const index = CustomCardStorage.loadIndex();
            const cardTypes = [...new Set(convertResult.cards.map((card: any) => card.type))];

            // 优先使用 JSON 内的 name 字段，如果没有则使用文件名，最后使用默认名称
            const batchDisplayName = importData.name || batchName || `导入批次 ${new Date().toLocaleDateString()}`;

            index.batches[batchId] = {
                id: batchId,
                name: batchDisplayName,
                fileName: batchName || 'imported.json',
                importTime: batchData.metadata.importTime,
                cardCount: convertResult.cards.length,
                cardTypes: cardTypes as string[],
                size: dataSize,
                disabled: false
            };
            index.totalCards += convertResult.cards.length;
            index.totalBatches++;

            CustomCardStorage.saveIndex(index);

            // 第十步：优化内存缓存和数据一致性
            logDebug('importCards', { step: 'optimizing caches and reloading' });

            // 重新加载自定义卡牌到内存
            this.reloadCustomCards();

            // 预热关键缓存以提升后续性能
            // 这些操作会触发缓存的重新计算和存储
            try {
                CustomCardStorage.getAggregatedCustomFieldNames();
                CustomCardStorage.getAggregatedVariantTypes();
                logDebug('importCards', {
                    step: 'cache prewarming completed',
                    batchId
                });
            } catch (cacheError) {
                // 缓存预热失败不应该影响导入成功
                console.warn('[CustomCardManager] 缓存预热失败，但导入成功:', cacheError);
                logDebug('importCards', {
                    step: 'cache prewarming failed but import succeeded',
                    error: cacheError
                });
            }

            return {
                success: true,
                imported: convertResult.cards.length,
                errors: [],
                batchId
            };

        } catch (error) {
            // 清理失败的操作 - 增强的清理逻辑
            // 由于我们现在使用验证上下文而不是预写入，清理风险大大降低
            // 但仍需要在批次已创建时进行清理
            if (hasCreatedBatch) {
                try {
                    CustomCardStorage.removeBatch(batchId);
                    logDebug('importCards', {
                        step: 'cleanup completed',
                        batchId,
                        reason: 'import failed after batch creation'
                    });
                } catch (cleanupError) {
                    console.error('[CustomCardManager] 清理失败的批次时发生错误:', cleanupError);
                // 继续抛出原始错误，但记录清理失败
                }
            } else {
                logDebug('importCards', {
                    step: 'no cleanup needed',
                    batchId,
                    reason: 'batch was not created before failure'
                });
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
    private validateImportDataFormat(importData: ImportData, validationContext?: ValidationContext): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        logDebug('validateImportDataFormat', {
            hasContext: !!validationContext,
            hasCustomFields: !!importData.customFieldDefinitions
        });

        if (!importData || typeof importData !== 'object') {
            errors.push('导入数据格式无效：必须是JSON对象');
            return { isValid: false, errors };
        }

        // 使用验证上下文或创建临时字段定义
        let tempFields;
        if (validationContext) {
            // 使用提供的验证上下文
            tempFields = {
                tempBatchId: validationContext.tempBatchId || 'temp_validation',
                tempDefinitions: Object.fromEntries(
                    Object.entries(validationContext.customFields)
                        .filter(([, value]) => Array.isArray(value))
                        .map(([key, value]) => [key, value as string[]])
                ),
                tempVariantTypes: validationContext.variantTypes
            };
        } else if (importData.customFieldDefinitions) {
            // 回退到传统方式
            tempFields = {
                tempBatchId: 'temp_validation',
                tempDefinitions: Object.fromEntries(
                    Object.entries(importData.customFieldDefinitions)
                        .filter(([, value]) => Array.isArray(value))
                        .map(([key, value]) => [key, value as string[]])
                )
            };
        }

        logDebug('validateImportDataFormat', {
            tempFieldsKeys: tempFields ? Object.keys(tempFields.tempDefinitions || {}) : [],
            hasVariantTypes: !!(tempFields?.tempVariantTypes)
        });

        // 优先使用ValidationContext，否则使用tempFields
        const typeValidation = validationContext 
            ? CardTypeValidator.validateImportData(importData, validationContext)
            : CardTypeValidator.validateImportData(importData, tempFields);

        if (!typeValidation.isValid) {
            const errorMessages = typeValidation.errors.map(err => `${err.path}: ${err.message}`);
            errors.push(...errorMessages);
        }

        // 检查是否有任何卡牌数据
        if (typeValidation.totalCards === 0) {
            errors.push('导入数据为空：没有找到任何卡牌数据');
        }

        logDebug('validateImportDataFormat', {
            isValid: errors.length === 0,
            errorCount: errors.length,
            totalCards: typeValidation.totalCards
        });

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
            { cards: importData.profession, type: CardType.Profession },
            { cards: importData.ancestry, type: CardType.Ancestry },
            { cards: importData.community, type: CardType.Community },
            { cards: importData.subclass, type: CardType.Subclass },
            { cards: importData.domain, type: CardType.Domain },
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
     * 验证变体类型唯一性（严格模式）
     * @param importData 导入数据
     * @returns 验证结果和错误信息
     */
    private validateVariantTypeUniqueness(importData: ImportData): { isValid: boolean; errors: string[]; conflictingTypes: string[] } {
        const errors: string[] = [];
        
        // 如果没有变体类型定义，直接通过验证
        if (!importData.customFieldDefinitions?.variantTypes) {
            return { isValid: true, errors, conflictingTypes: [] };
        }
        
        const newVariantTypes = importData.customFieldDefinitions.variantTypes;
        const existingVariantTypes = CustomCardStorage.getAggregatedVariantTypes();
        const conflictingTypes: string[] = [];
        
        logDebug('validateVariantTypeUniqueness', {
            newTypes: Object.keys(newVariantTypes),
            existingTypes: Object.keys(existingVariantTypes)
        });
        
        // 检查每个新的变体类型是否与现有类型冲突
        for (const typeId in newVariantTypes) {
            if (existingVariantTypes[typeId]) {
                conflictingTypes.push(typeId);
                errors.push(`变体类型 "${typeId}" 已存在，不允许覆盖`);
            }
        }
        
        if (conflictingTypes.length > 0) {
            logDebug('validateVariantTypeUniqueness', {
                result: 'conflicts detected',
                conflictingTypes
            });
            
            return {
                isValid: false,
                errors,
                conflictingTypes
            };
        }
        
        logDebug('validateVariantTypeUniqueness', { result: 'no conflicts' });
        return { isValid: true, errors, conflictingTypes: [] };
    }

    /**
     * 从卡牌数据中提取ID（统一使用小写id字段）
     */
    private extractCardId(card: any, cardType: string): string | null {
        if (!card) return null;

        // 所有卡牌类型现在都统一使用小写的 id 字段
        return card.id || null;
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

            // 转换变体卡牌
            if (importData.variant && Array.isArray(importData.variant)) {
                for (let i = 0; i < importData.variant.length; i++) {
                    try {
                        const standardCard = variantCardConverter.toStandard(importData.variant[i]);
                        const extendedCard: ExtendedStandardCard = {
                            ...standardCard,
                            source: CardSource.CUSTOM
                        };
                        convertedCards.push(extendedCard);
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        errors.push(`variant[${i}]: 转换失败 - ${errorMessage}`);
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
        // 确保系统已初始化
        await this.ensureInitialized();

        // 导入内置卡牌（避免循环依赖，在运行时导入）
        let builtinCards: StandardCard[] = [];

        try {
            // 只导入内置卡牌，不包含自定义卡牌
            const cardModule = await import('./index');
            // 获取内置卡牌，避免包含可能过时的自定义卡牌
            builtinCards = cardModule.getBuiltinStandardCards();
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
            const batchInfo = index.batches[batchId]; // 获取完整的ImportBatch对象

            // 检查批次是否被禁用
            if (batchInfo.disabled === true) {
                console.log(`[CustomCardManager] 批次 ${batchId} (${batchInfo.name}) 已被禁用，跳过加载`);
                continue; // 跳过此批次的加载
            }

            console.log(`[CustomCardManager] 正在加载批次: ${batchId}`);
            const batchData = CustomCardStorage.loadBatch(batchId);
            console.log(`[CustomCardManager] 批次 ${batchId} 数据:`, batchData ? `存在，cards字段: ${batchData.cards ? `数组长度${batchData.cards.length}` : '不存在'}` : '不存在');

            if (batchData && batchData.cards) {
                const isSystemBatch = batchInfo.isSystemBatch === true;

                const cardsWithBatchId = batchData.cards.map(card => {
                    // 确保每张卡牌的描述都经过 processCardDescription 处理
                    const processedCard = {
                        ...card,
                        source: isSystemBatch ? CardSource.BUILTIN : CardSource.CUSTOM,
                        batchId
                    };

                    // 应用文本处理函数到描述字段
                    if (processedCard.description) {
                        processedCard.description = processCardDescription(processedCard.description);
                    }

                    return processedCard;
                });
                this.customCards.push(...cardsWithBatchId);
                console.log(`[CustomCardManager] 从批次 ${batchId} (${isSystemBatch ? '系统' : '自定义'}) 加载了 ${cardsWithBatchId.length} 张卡牌`);
            } else {
                console.warn(`[CustomCardManager] 批次 ${batchId} 数据无效或缺少cards字段`);
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

    /**
     * 种子化或更新内置卡牌（从JSON文件加载）
     * 重构：使用与自定义卡牌相同的validation流程
     */
    private async _seedOrUpdateBuiltinCards(): Promise<void> {
        try {
            console.log('[CustomCardManager] 开始种子化或更新内置卡牌（从JSON文件）');
            const index = CustomCardStorage.loadIndex();

            // 静态加载JSON卡牌包
            const jsonCardPack = BuiltinCardPackLoader.getBuiltinCardPack();

            // 检查内置卡包是否已存在且版本一致
            const existingBuiltinBatch = index.batches[BUILTIN_BATCH_ID];
            if (existingBuiltinBatch && existingBuiltinBatch.version === jsonCardPack.version) {
                console.log(`[CustomCardManager] 内置卡牌版本 (${jsonCardPack.version}) 已是最新，无需更新`);
                return;
            }

            console.log('[CustomCardManager] 内置卡牌需要种子化或更新，使用完整导入流程');

            // 如果已存在旧版本，先删除
            if (existingBuiltinBatch) {
                console.log('[CustomCardManager] 移除旧版本内置卡牌...');
                CustomCardStorage.removeBatch(BUILTIN_BATCH_ID);
            }

            // 使用完整的导入流程，确保validation和customFieldDefinitions处理
            const importResult = await this.importBuiltinCards(jsonCardPack);

            if (!importResult.success) {
                throw new Error(`内置卡牌导入失败: ${importResult.errors.join(', ')}`);
            }

            console.log(`[CustomCardManager] 内置卡牌种子化完成，版本: ${jsonCardPack.version}, 卡牌数量: ${importResult.imported}`);
        } catch (error) {
            console.error('[CustomCardManager] 内置卡牌种子化失败:', error);
            throw error;
        }
    }

    /**
     * 内置卡牌专用导入方法
     * 使用与自定义卡牌相同的流程，但标记为系统内置
     */
    private async importBuiltinCards(jsonCardPack: JsonCardPack): Promise<ImportResult> {
        const batchId = BUILTIN_BATCH_ID;
        let hasCreatedBatch = false;

        console.log('[CustomCardManager] 开始导入内置卡牌，使用完整validation流程');

        try {
            // 第一步：处理自定义字段定义和变体类型定义（内置数据也需要validation）
            if (jsonCardPack.customFieldDefinitions) {
                // 处理传统的自定义字段定义（字符串数组）
                const filteredDefinitions = Object.fromEntries(
                    Object.entries(jsonCardPack.customFieldDefinitions)
                        .filter(([, value]) => Array.isArray(value))
                        .map(([key, value]) => [key, value as string[]])
                );

                if (Object.keys(filteredDefinitions).length > 0) {
                    console.log('[CustomCardManager] 保存内置卡牌的customFieldDefinitions:', filteredDefinitions);
                    CustomCardStorage.updateBatchCustomFields(batchId, filteredDefinitions);
                }

                // 处理变体类型定义
                if (jsonCardPack.customFieldDefinitions.variantTypes) {
                    console.log('[CustomCardManager] 保存内置卡牌的variantTypes:', jsonCardPack.customFieldDefinitions.variantTypes);
                    CustomCardStorage.updateBatchVariantTypes(batchId, jsonCardPack.customFieldDefinitions.variantTypes);
                }
            }

            // 第二步：验证导入数据格式
            console.log('[CustomCardManager] 验证内置卡牌数据格式');

            // 为内置卡牌创建ValidationContext
            logDebug('[DEBUG] 创建内置卡牌ValidationContext之前，jsonCardPack.customFieldDefinitions:', jsonCardPack.customFieldDefinitions);
            const builtinValidationContext = ValidationDataMerger.createValidationContextFromImportData(
                jsonCardPack,
                'builtin_validation'
            );
            logDebug('[DEBUG] 创建的内置卡牌ValidationContext:', builtinValidationContext);

            const formatValidation = this.validateImportDataFormat(jsonCardPack, builtinValidationContext);
            if (!formatValidation.isValid) {
                console.error('[CustomCardManager] 内置卡牌格式验证失败:', formatValidation.errors);
                // 注意：在新的存储架构中，自定义字段和变体类型定义存储在批次数据中，
                // 格式验证失败时不需要清理，因为数据已经保存在批次中
                return {
                    success: false,
                    imported: 0,
                    errors: formatValidation.errors
                };
            }

            // 第三步：数据转换（使用相同的转换逻辑）
            console.log('[CustomCardManager] 转换内置卡牌数据');
            const convertResult = await this.convertImportData(jsonCardPack);
            if (!convertResult.success) {
                console.error('[CustomCardManager] 内置卡牌转换失败:', convertResult.errors);
                // 注意：在新的存储架构中，自定义字段和变体类型定义存储在批次数据中，
                // 转换失败时不需要清理，因为数据已经保存在批次中
                return {
                    success: false,
                    imported: 0,
                    errors: convertResult.errors
                };
            }

            // 第四步：将卡牌标记为内置卡牌并准备批次数据
            const builtinCards = convertResult.cards.map(card => ({
                ...card,
                source: CardSource.BUILTIN
            }));

            const batchData: BatchData = {
                metadata: {
                    id: batchId,
                    fileName: 'builtin-base.json',
                    importTime: new Date().toISOString(),
                    name: jsonCardPack.name,
                    version: jsonCardPack.version,
                    description: jsonCardPack.description,
                    author: jsonCardPack.author,
                },
                cards: builtinCards,
                // 处理自定义字段定义
                customFieldDefinitions: jsonCardPack.customFieldDefinitions
                    ? Object.fromEntries(
                        Object.entries(jsonCardPack.customFieldDefinitions)
                            .filter(([key, value]) => Array.isArray(value) && key !== 'variantTypes')
                            .map(([key, value]) => [key, value as string[]])
                    )
                    : undefined,
                // 处理变体类型定义
                variantTypes: jsonCardPack.customFieldDefinitions?.variantTypes || undefined
            };

            // 第五步：检查存储空间
            const dataSize = JSON.stringify(batchData).length * 2;
            if (!CustomCardStorage.checkStorageSpace(dataSize)) {
                const storageInfo = CustomCardStorage.getFormattedStorageInfo();
                // 注意：在新的存储架构中，自定义字段和变体类型定义存储在批次数据中，
                // 存储空间不足时不需要清理，因为批次本身还未创建
                return {
                    success: false,
                    imported: 0,
                    errors: [`存储空间不足。当前使用: ${storageInfo.used}/${storageInfo.total}`]
                };
            }

            // 第六步：保存批次数据（使用优化的存储机制）
            try {
                CustomCardStorage.saveBatch(batchId, batchData);
                hasCreatedBatch = true;
                console.log('[CustomCardManager] 内置卡牌批次数据保存成功');
            } catch (storageError) {
                console.error('[CustomCardManager] 内置卡牌批次保存失败:', storageError);
                throw new Error(`内置卡牌保存失败: ${storageError instanceof Error ? storageError.message : String(storageError)}`);
            }

            // 第七步：更新索引
            const index = CustomCardStorage.loadIndex();
            const cardTypes = [...new Set(builtinCards.map(card => card.type))];

            index.batches[batchId] = {
                id: batchId,
                name: jsonCardPack.name,
                fileName: 'builtin-base.json',
                importTime: batchData.metadata.importTime,
                cardCount: builtinCards.length,
                cardTypes,
                size: dataSize,
                isSystemBatch: true, // 标记为系统内置
                version: jsonCardPack.version,
                disabled: false
            };
            index.totalCards += builtinCards.length;
            index.totalBatches++;
            index.lastUpdate = new Date().toISOString();

            CustomCardStorage.saveIndex(index);

            // 优化：预热缓存以提升性能
            try {
                CustomCardStorage.getAggregatedCustomFieldNames();
                CustomCardStorage.getAggregatedVariantTypes();
                console.log('[CustomCardManager] 内置卡牌导入后缓存预热完成');
            } catch (cacheError) {
                console.warn('[CustomCardManager] 内置卡牌缓存预热失败，但导入成功:', cacheError);
            }

            return {
                success: true,
                imported: builtinCards.length,
                errors: [],
                batchId
            };

        } catch (error) {
            // 清理失败的操作 - 增强的清理逻辑
            if (hasCreatedBatch) {
                try {
                    CustomCardStorage.removeBatch(batchId);
                    console.log('[CustomCardManager] 内置卡牌失败批次清理完成');
                } catch (cleanupError) {
                    console.error('[CustomCardManager] 清理失败的内置卡牌批次时发生错误:', cleanupError);
                }
            }

            // 注意：在新的存储架构中，自定义字段和变体类型定义存储在批次数据中，
            // 导入失败时如果批次已删除，相关数据也会自动清理

            console.error('[CustomCardManager] 内置卡牌导入失败:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                imported: 0,
                errors: [`内置卡牌导入失败: ${errorMessage}`]
            };
        }
    }

    /**
     * 优化存储操作：检查和修复数据一致性
     * 在Step 9中新增，确保所有方法与验证上下文方式协同工作
     */
    optimizeStorage(): {
        performed: string[];
        errors: string[];
        cacheStatus: {
            preWarmed: boolean;
            customFieldsCached: boolean;
            variantTypesCached: boolean;
        };
    } {
        const performed: string[] = [];
        const errors: string[] = [];

        logDebug('optimizeStorage', { step: 'starting storage optimization' });

        try {
            // 1. 验证存储完整性
            const integrityReport = CustomCardStorage.validateIntegrity();
            if (integrityReport.orphanedKeys.length > 0 || integrityReport.missingBatches.length > 0) {
                performed.push('integrity-check');
                logDebug('optimizeStorage', {
                    integrityIssues: {
                        orphanedKeys: integrityReport.orphanedKeys.length,
                        missingBatches: integrityReport.missingBatches.length
                    }
                });
            }

            // 2. 清理孤立数据
            const cleanupReport = CustomCardStorage.cleanupOrphanedData();
            if (cleanupReport.removedKeys.length > 0) {
                performed.push('orphaned-data-cleanup');
                logDebug('optimizeStorage', {
                    cleanupStats: {
                        removedKeys: cleanupReport.removedKeys.length,
                        freedSpace: `${(cleanupReport.freedSpace / 1024).toFixed(2)}KB`
                    }
                });
            }
            if (cleanupReport.errors.length > 0) {
                errors.push(...cleanupReport.errors);
            }

            // 3. 预热关键缓存
            let customFieldsCached = false;
            let variantTypesCached = false;
            try {
                CustomCardStorage.getAggregatedCustomFieldNames();
                customFieldsCached = true;
                performed.push('custom-fields-cache-prewarmed');
            } catch (error) {
                errors.push(`自定义字段缓存预热失败: ${error instanceof Error ? error.message : String(error)}`);
            }

            try {
                CustomCardStorage.getAggregatedVariantTypes();
                variantTypesCached = true;
                performed.push('variant-types-cache-prewarmed');
            } catch (error) {
                errors.push(`变体类型缓存预热失败: ${error instanceof Error ? error.message : String(error)}`);
            }

            // 4. 确保内存数据与存储同步
            this.reloadCustomCards();
            performed.push('memory-sync');

            logDebug('optimizeStorage', {
                step: 'storage optimization completed',
                performed,
                errors: errors.length
            });

            return {
                performed,
                errors,
                cacheStatus: {
                    preWarmed: customFieldsCached && variantTypesCached,
                    customFieldsCached,
                    variantTypesCached
                }
            };

        } catch (error) {
            const errorMsg = `存储优化失败: ${error instanceof Error ? error.message : String(error)}`;
            errors.push(errorMsg);
            console.error('[CustomCardManager] Storage optimization failed:', error);

            return {
                performed,
                errors,
                cacheStatus: {
                    preWarmed: false,
                    customFieldsCached: false,
                    variantTypesCached: false
                }
            };
        }
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
     * 懒加载确保初始化（每次访问时都检查）
     */
    private async lazyEnsureInitialized(): Promise<void> {
        if (this.isInitialized) return;

        // 如果已有正在进行的初始化，等待它完成
        if (this.initializationPromise) {
            await this.initializationPromise;
            return;
        }

        // 开始新的初始化
        this.initializationPromise = this.initializeSystem();
        await this.initializationPromise;
    }

    /**
     * 获取所有卡牌（包括内置和自定义）- 带懒加载初始化
     */
    async getAllCardsAsync(): Promise<ExtendedStandardCard[]> {
        await this.lazyEnsureInitialized();
        return this.getAllCards();
    }

    /**
     * 获取所有卡牌（包括内置和自定义）
     * 使用统一的数据访问，内置卡牌作为特殊批次存储
     */
    getAllCards(): ExtendedStandardCard[] {
        return [...this.customCards];
    }

    /**
     * 尝试获取所有卡牌，如果系统未初始化则返回null
     */
    tryGetAllCards(): ExtendedStandardCard[] | null {
        if (!this.isInitialized) {
            return null;
        }
        return this.getAllCards();
    }

    /**
     * 根据类型获取所有卡牌（包括内置和自定义）
     */
    getAllCardsByType(type: string): ExtendedStandardCard[] {
        return this.getAllCards().filter(card => card.type === type);
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
     * 获取批次名称
     */
    getBatchName(batchId: string): string | null {
        const batch = this.getBatchById(batchId);
        return batch?.name || null;
    }

    /**
     * 删除批次
     */
    removeBatch(batchId: string): boolean {
        logDebug('removeBatch', { batchId });

        try {
            // 防止删除系统内置卡包
            if (batchId === BUILTIN_BATCH_ID) {
                logDebug('removeBatch', {
                    result: 'rejected',
                    reason: 'cannot delete builtin batch'
                });
                console.warn('[CustomCardManager] 不允许删除系统内置卡包');
                return false;
            }

            const index = CustomCardStorage.loadIndex();

            if (!index.batches[batchId]) {
                logDebug('removeBatch', {
                    result: 'not found',
                    availableBatches: Object.keys(index.batches)
                });
                return false;
            }

            const batch = index.batches[batchId];
            logDebug('removeBatch', {
                batchInfo: batch,
                step: 'batch found, proceeding with deletion'
            });

            // 删除批次数据（包含自定义字段和变体类型定义）
            logDebug('removeBatch', { step: 'removing batch data' });
            CustomCardStorage.removeBatch(batchId);

            // 注意：在新的存储架构中，自定义字段和变体类型定义已经包含在批次数据中，
            // 因此删除批次时会自动删除相关定义，不需要单独调用删除方法

            // 更新索引
            logDebug('removeBatch', { step: 'updating index' });
            delete index.batches[batchId];
            index.totalBatches--;
            index.totalCards -= batch.cardCount;

            CustomCardStorage.saveIndex(index);

            // 批次删除时清除缓存
            CardStorageCache.invalidateAll();
            logDebug('removeBatch', { message: 'cache invalidated after batch removal', batchId });

            // 重新加载内存中的卡牌数据
            logDebug('removeBatch', { step: 'reloading custom cards' });
            this.reloadCustomCards();

            logDebug('removeBatch', { result: 'success' });
            return true;
        } catch (error) {
            logDebug('removeBatch', { result: 'error', error });
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

    /**
     * 强制重置初始化状态并重新初始化系统
     * 用于调试和强制重新种子化
     */
    async forceReinitialize(): Promise<void> {
        console.log('[CustomCardManager] 强制重置初始化状态...');
        this.isInitialized = false;
        this.initializationPromise = null;
        this.customCards = [];

        try {
            // 重新初始化
            console.log('[CustomCardManager] 开始强制重新初始化...');
            this.initializationPromise = this.initializeSystem();
            await this.initializationPromise;
            console.log('[CustomCardManager] 强制重新初始化完成');
        } catch (error) {
            console.error('[CustomCardManager] 强制重新初始化失败:', error);
            throw error;
        }
    }

    /**
     * 切换批次的禁用状态
     * 重新加载卡牌以反映更改
     * @param batchId 要切换的批次ID
     * @returns 操作成功返回true，失败返回false
     */
    async toggleBatchDisabled(batchId: string): Promise<boolean> {
        try {
            const index = CustomCardStorage.loadIndex();
            const batchInfo = index.batches[batchId];

            if (!batchInfo) {
                console.warn(`[CustomCardManager] 批次 ${batchId} 未找到，无法切换禁用状态`);
                return false;
            }

            // 切换禁用状态
            batchInfo.disabled = !batchInfo.disabled;
            index.lastUpdate = new Date().toISOString();
            CustomCardStorage.saveIndex(index);

            // 批次启用/禁用状态变更时清除缓存
            CardStorageCache.invalidateAll();
            console.log(`[CustomCardManager] 缓存已清除，因为批次 ${batchId} 的禁用状态已变更`);

            // 重新加载卡牌以反映更改
            this.reloadCustomCards();

            console.log(`[CustomCardManager] 批次 ${batchId} (${batchInfo.name}) 禁用状态已设置为: ${batchInfo.disabled}`);
            return true;
        } catch (error) {
            console.error(`[CustomCardManager] 切换批次 ${batchId} 禁用状态时出错:`, error);
            return false;
        }
    }

    /**
     * 获取批次的禁用状态
     * @param batchId 批次ID
     * @returns 如果禁用返回true，如果启用或未找到返回false（默认为启用）
     */
    getBatchDisabledStatus(batchId: string): boolean {
        const index = CustomCardStorage.loadIndex();
        const batchInfo = index.batches[batchId];
        return batchInfo?.disabled === true; // 如果batchInfo或batchInfo.disabled为undefined，则视为启用
    }

    // ===== 转换器注册功能（原BuiltinCardManager功能）=====

    registerConverter<T extends keyof CardTypeMap>(
        type: T,
        converter: (card: CardTypeMap[T]) => StandardCard
    ): void {
        this.cardConverters[type] = converter as (card: any) => StandardCard
    }

    registerCardType<T extends keyof CardTypeMap>(
        type: T,
        registration: {
            converter: (card: CardTypeMap[T]) => StandardCard;
        }
    ): void {
        this.registerConverter(type, registration.converter)
    }

    ConvertCard<T extends keyof CardTypeMap>(
        card: CardTypeMap[T],
        type: T
    ): StandardCard | null {
        const converter = this.cardConverters[type]
        if (converter) {
            try {
                var standCard = converter(card)
                standCard.standarized = true

                return standCard
            } catch (error) {
                console.error(`使用${type}转换器转换卡牌失败:`, error, card)
                return null
            }
        }
        return null
    }

    getRegisteredTypes(): string[] {
        return Object.keys(this.cardConverters)
    }

    isTypeRegistered(type: string): boolean {
        return type in this.cardConverters
    }

    // ===== 系统初始化功能 =====
}

// 导出单例实例
export const customCardManager = CustomCardManager.getInstance();

// 定义所有可用的卡牌类型映射
type CardTypeMap = {
    profession: ProfessionCard;
    ancestry: AncestryCard;
    community: CommunityCard;
    domain: DomainCard;
    subclass: SubClassCard;
    variant: RawVariantCard;
}