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
    ExtendedStandardCard,
    CardType // Assuming CardType enum might be useful here or for keys
} from './card-types';
import { getBuiltinStandardCards, getBuiltinBatchMetadata, BUILTIN_BATCH_ID, BUILTIN_CARDS_VERSION } from './builtin-card-data';
import { CardTypeValidator } from './type-validators';
import { professionCardConverter } from './profession-card/convert';
import { ancestryCardConverter } from './ancestry-card/convert';
import { communityCardConverter } from './community-card/convert';
import { subclassCardConverter } from './subclass-card/convert';
import { domainCardConverter } from './domain-card/convert';

// Import functions to add custom names
import {
    addCustomProfessionName,
    addCustomAncestryName,
    addCustomCommunityName,
    addCustomSubClassName,
    addCustomDomainName
} from './card-predefined-field';

// Helper map to call the correct add function based on category key from JSON
const customFieldNameAdders: { [key: string]: (name: string) => void } = {
    [CardType.Profession]: addCustomProfessionName,
    [CardType.Ancestry]: addCustomAncestryName,
    [CardType.Community]: addCustomCommunityName,
    [CardType.Subclass]: addCustomSubClassName,
    [CardType.Domain]: addCustomDomainName,
};

/**
 * 自定义卡牌管理器类
 */
export class CustomCardManager {
    private static instance: CustomCardManager;
    private customCards: ExtendedStandardCard[] = [];
    private cardManager: CardManager;

    private isInitialized = false;
    private initializationPromise: Promise<void> | null = null;

    private constructor() {
        this.cardManager = CardManager.getInstance();
        if (typeof window !== 'undefined') {
            // 立即开始初始化但不等待
            this.initializationPromise = this.initializeSystem();
        }
    }

    /**
     * 初始化系统，包括内置卡牌种子化和自定义卡牌加载
     */
    private async initializeSystem(): Promise<void> {
        if (this.isInitialized) return;
        
        try {
            console.log('[CustomCardManager] 开始初始化系统...');
            
            // 简化初始化逻辑，直接尝试种子化
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
        if (typeof window !== 'undefined') {
            if (this.initializationPromise) {
                await this.initializationPromise;
            } else if (!this.isInitialized) {
                this.initializationPromise = this.initializeSystem();
                await this.initializationPromise;
            }
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
     * 处理导入数据中定义的自定义字段名
     */
    private processCustomFieldDefinitions(definitions: NonNullable<ImportData['customFieldDefinitions']>) {
        console.log('[CustomCardManager] Processing custom field definitions:', definitions);

        const keyMap: { [jsonKey: string]: CardType | undefined } = {
            "professions": CardType.Profession,
            "ancestries": CardType.Ancestry,
            "communities": CardType.Community,
            // "subclasses": CardType.Subclass, // Remove or comment out to prevent processing
            "domains": CardType.Domain
        };

        for (const categoryKey in definitions) {
            const names = definitions[categoryKey as keyof typeof definitions];
            const lowerCategoryKey = categoryKey.toLowerCase();

            // Explicitly skip 'subclasses' if it's still in the JSON for some reason
            if (lowerCategoryKey === 'subclasses') {
                console.log(`[CustomCardManager] Skipping 'subclasses' in customFieldDefinitions as it's no longer processed through this mechanism.`);
                continue;
            }

            const mappedCardTypeKey = keyMap[lowerCategoryKey]; // Get CardType enum value like CardType.Profession

            if (mappedCardTypeKey) {
                const adder = customFieldNameAdders[mappedCardTypeKey]; // Look up adder using CardType value (e.g., "profession")

                if (names && Array.isArray(names) && adder) {
                    names.forEach(name => {
                        if (typeof name === 'string' && name.trim() !== '') {
                            try {
                                adder(name.trim());
                                console.log(`[CustomCardManager] Added/updated custom field name '${name.trim()}' for category '${categoryKey}' (mapped to ${mappedCardTypeKey})`);
                            } catch (error) {
                                console.error(`[CustomCardManager] Error adding custom field name '${name.trim()}' for category '${categoryKey}':`, error);
                                // Optionally collect these errors to return in ImportResult
                            }
                        }
                    });
                } else if (!adder) {
                    console.warn(`[CustomCardManager] No adder function found for mapped key '${mappedCardTypeKey}' from JSON key '${categoryKey}'`);
                }
            } else {
                console.warn(`[CustomCardManager] Unknown category key '${lowerCategoryKey}' in customFieldDefinitions. Ensure it is one of: ${Object.keys(keyMap).join(', ')}`);
            }
        }
    }

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
            // 新增：处理自定义字段定义
            if (importData.customFieldDefinitions) {
                this.processCustomFieldDefinitions(importData.customFieldDefinitions);
                // After this, calls to get<Category>CardNames() will include these new definitions,
                // making them available for subsequent validation steps.
            }

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
                    name: importData.name,
                    version: importData.version,
                    description: importData.description,
                    author: importData.author
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

    /**
     * 种子化或更新内置卡牌到存储系统
     * 检查版本号，如果不匹配则更新内置卡牌
     */
    private async _seedOrUpdateBuiltinCards(): Promise<void> {
        try {
            console.log('[CustomCardManager] 检查内置卡牌状态...');
            
            const index = CustomCardStorage.loadIndex();
            const existingBatch = index.batches[BUILTIN_BATCH_ID];
            
            // 检查是否需要种子化或更新
            const needsUpdate = !existingBatch || 
                               !existingBatch.version ||
                               existingBatch.version !== BUILTIN_CARDS_VERSION;
            
            if (needsUpdate) {
                console.log('[CustomCardManager] 内置卡牌需要更新，开始种子化...');
                
                // 获取内置卡牌数据
                const builtinCards = getBuiltinStandardCards();
                const batchMetadata = getBuiltinBatchMetadata();
                
                // 转换为扩展标准卡牌格式
                const extendedCards: ExtendedStandardCard[] = builtinCards.map(card => ({
                    ...card,
                    source: CardSource.BUILTIN,
                    batchId: BUILTIN_BATCH_ID
                }));
                
                // 准备批次数据
                const batchData: BatchData = {
                    metadata: {
                        batchId: BUILTIN_BATCH_ID,
                        fileName: batchMetadata.fileName,
                        importTime: batchMetadata.importTime,
                        name: batchMetadata.name,
                        version: batchMetadata.version,
                        description: "系统内置卡牌包",
                        author: "DaggerHeart System"
                    },
                    cards: extendedCards
                };
                
                // 如果已存在旧版本，先删除
                if (existingBatch) {
                    console.log('[CustomCardManager] 移除旧版本内置卡牌...');
                    CustomCardStorage.removeBatch(BUILTIN_BATCH_ID);
                }
                
                // 添加新的内置卡牌批次
                CustomCardStorage.saveBatch(BUILTIN_BATCH_ID, batchData);
                
                // 更新索引 - 添加内置卡包信息
                const newIndex = CustomCardStorage.loadIndex();
                const builtinBatchInfo: ImportBatch = {
                    id: BUILTIN_BATCH_ID,
                    name: batchMetadata.name,
                    fileName: batchMetadata.fileName,
                    importTime: batchMetadata.importTime,
                    cardCount: batchMetadata.cardCount,
                    cardTypes: batchMetadata.cardTypes,
                    size: batchMetadata.size,
                    isSystemBatch: true,
                    version: BUILTIN_CARDS_VERSION
                };
                
                newIndex.batches[BUILTIN_BATCH_ID] = builtinBatchInfo;
                newIndex.totalBatches = Object.keys(newIndex.batches).length;
                newIndex.totalCards = Object.values(newIndex.batches).reduce((sum, batch) => sum + batch.cardCount, 0);
                newIndex.lastUpdate = new Date().toISOString();
                CustomCardStorage.saveIndex(newIndex);
                
                console.log(`[CustomCardManager] 内置卡牌种子化完成，版本: ${BUILTIN_CARDS_VERSION}, 卡牌数量: ${builtinCards.length}`);
            } else {
                console.log(`[CustomCardManager] 内置卡牌已是最新版本: ${BUILTIN_CARDS_VERSION}`);
            }
        } catch (error) {
            console.error('[CustomCardManager] 内置卡牌种子化失败:', error);
            throw error;
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
        const index = CustomCardStorage.loadIndex();
        const allCards: ExtendedStandardCard[] = [];

        // 遍历所有批次，包括系统内置批次
        for (const batchId of Object.keys(index.batches)) {
            try {
                const batchData = CustomCardStorage.loadBatch(batchId);
                if (batchData && batchData.cards) {
                    allCards.push(...batchData.cards as ExtendedStandardCard[]);
                }
            } catch (error) {
                console.error(`[CustomCardManager] 加载批次 ${batchId} 失败:`, error);
            }
        }

        return allCards;
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
     * 删除批次
     */
    removeBatch(batchId: string): boolean {
        try {
            // 防止删除系统内置卡包
            if (batchId === BUILTIN_BATCH_ID) {
                console.warn('[CustomCardManager] 不允许删除系统内置卡包');
                return false;
            }

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
