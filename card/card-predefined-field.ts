export const PROFESSION_CARD_NAMES: string[] = [
    "吟游诗人", "德鲁伊", "守护者", "游侠", "游荡者", "神使", "术士", "战士", "法师"
];

export const ANCESTRY_CARD_NAMES: string[] = [
    "械灵", "魔裔", "龙人", "矮人", "精灵", "仙灵", "羊蹄人", "费尔博格", "孢菌人", "龟人", "巨人", "哥布林", "半身人", "人类", "猫族", "兽人", "蛙裔", "猿族"
];

export const COMMUNITY_CARD_NAMES: string[] = [
    "高城之民", "博识之民", "结社之民", "山岭之民", "滨海之民", "法外之民", "地下之民", "漂泊之民", "荒野之民"
];

export const DOMAIN_CARD_NAMES: string[] = [
    "奥术", "利刃", "骸骨", "典籍", "优雅", "午夜", "贤者", "辉耀", "勇气"
];

// 属性类别常量列表
export const ATTRIBUTE_CLASS_NAMES: string[] = [
    "力量", "敏捷", "灵巧", "风度", "本能", "知识"
];

// 子职业等级常量列表  
export const SUBCLASS_LEVEL_NAMES: string[] = [
    "基石", "专精", "大师", "未知"
];

// 从常量列表生成类型
export type AttributeClass = typeof ATTRIBUTE_CLASS_NAMES[number];
export type SubClassLevel = typeof SUBCLASS_LEVEL_NAMES[number];
export type SubClassClass = string;
export type ProfessionClass = string;
export type AncestryClass = string;
export type CommunityClass = string;
export type DomainClass = string;

// Import storage functions
import { CustomCardStorage, type CustomFieldsForBatch, type VariantTypesForBatch } from './card-storage';

// 调试日志标记
const DEBUG_PREDEFINED_FIELDS = true;
const logDebug = (operation: string, details: any) => {
    if (DEBUG_PREDEFINED_FIELDS) {
        console.log(`[PredefinedFields:${operation}]`, details);
    }
};

// Getter functions
export function getProfessionCardNames(tempBatchId?: string, tempDefinitions?: CustomFieldsForBatch): string[] {
    const defaultNames = [...PROFESSION_CARD_NAMES];
    const aggregatedCustomFields = CustomCardStorage.getAggregatedCustomFieldNamesWithTemp(tempBatchId, tempDefinitions);
    const customNames = aggregatedCustomFields.professions || []; // Use 'professions' instead of 'profession'
    const result = [...new Set([...defaultNames, ...customNames])];
    
    logDebug('getProfessionCardNames', {
        defaultCount: defaultNames.length,
        customCount: customNames.length,
        totalCount: result.length,
        defaultNames,
        customNames,
        result,
        tempBatchId,
        tempDefinitions: tempDefinitions?.professions // Use 'professions' instead of 'profession'
    });
    
    return result;
}

export function getAncestryCardNames(tempBatchId?: string, tempDefinitions?: CustomFieldsForBatch): string[] {
    const defaultNames = [...ANCESTRY_CARD_NAMES];
    const aggregatedCustomFields = CustomCardStorage.getAggregatedCustomFieldNamesWithTemp(tempBatchId, tempDefinitions);
    const customNames = aggregatedCustomFields.ancestries || []; // Use 'ancestries' instead of 'ancestry'
    const result = [...new Set([...defaultNames, ...customNames])];
    
    logDebug('getAncestryCardNames', {
        defaultCount: defaultNames.length,
        customCount: customNames.length,
        totalCount: result.length,
        tempBatchId,
        tempDefinitions: tempDefinitions?.ancestries // Use 'ancestries' instead of 'ancestry'
    });
    
    return result;
}

export function getCommunityCardNames(tempBatchId?: string, tempDefinitions?: CustomFieldsForBatch): string[] {
    const defaultNames = [...COMMUNITY_CARD_NAMES];
    const aggregatedCustomFields = CustomCardStorage.getAggregatedCustomFieldNamesWithTemp(tempBatchId, tempDefinitions);
    const customNames = aggregatedCustomFields.communities || []; // Use 'communities' instead of 'community'
    const result = [...new Set([...defaultNames, ...customNames])];
    
    logDebug('getCommunityCardNames', {
        defaultCount: defaultNames.length,
        customCount: customNames.length,
        totalCount: result.length,
        tempBatchId,
        tempDefinitions: tempDefinitions?.communities // Use 'communities' instead of 'community'
    });
    
    return result;
}

export function getSubClassCardNames(tempBatchId?: string, tempDefinitions?: CustomFieldsForBatch): string[] {
    // Subclass names are now directly derived from profession names.
    // This includes default professions and any custom professions added.
    return getProfessionCardNames(tempBatchId, tempDefinitions);
}

export function getDomainCardNames(tempBatchId?: string, tempDefinitions?: CustomFieldsForBatch): string[] {
    const defaultNames = [...DOMAIN_CARD_NAMES];
    const aggregatedCustomFields = CustomCardStorage.getAggregatedCustomFieldNamesWithTemp(tempBatchId, tempDefinitions);
    const customNames = aggregatedCustomFields.domains || []; // Use 'domains' instead of 'domain'
    const result = [...new Set([...defaultNames, ...customNames])];
    
    logDebug('getDomainCardNames', {
        defaultCount: defaultNames.length,
        customCount: customNames.length,
        totalCount: result.length,
        tempBatchId,
        tempDefinitions: tempDefinitions?.domains // Use 'domains' instead of 'domain'
    });
    
    return result;
}

// Note: Custom field names are now managed per-batch during card pack import/deletion.
// The add functions below are deprecated and no longer used.
// Custom field names are automatically aggregated from all enabled card packs.

// ===== 新增：变体类型相关函数 =====

/**
 * 获取所有可用的变体类型定义
 */
export function getVariantTypes(tempBatchId?: string, tempDefinitions?: VariantTypesForBatch): Record<string, any> {
    const aggregatedTypes = CustomCardStorage.getAggregatedVariantTypesWithTemp(tempBatchId, tempDefinitions);
    
    logDebug('getVariantTypes', {
        typeCount: Object.keys(aggregatedTypes).length,
        typeIds: Object.keys(aggregatedTypes),
        tempBatchId,
        tempDefinitions
    });
    
    return aggregatedTypes;
}

/**
 * 获取指定变体类型的子类别选项
 */
export function getVariantSubclasses(variantType: string, tempBatchId?: string, tempDefinitions?: VariantTypesForBatch): string[] {
    const aggregatedTypes = CustomCardStorage.getAggregatedVariantTypesWithTemp(tempBatchId, tempDefinitions);
    const typeDef = aggregatedTypes[variantType];
    
    logDebug('getVariantSubclasses', {
        variantType,
        typeDef: !!typeDef,
        subclasses: typeDef?.subclasses || [],
        tempBatchId
    });
    
    return typeDef?.subclasses || [];
}

/**
 * 获取所有变体类型的名称列表
 */
export function getVariantTypeNames(tempBatchId?: string, tempDefinitions?: VariantTypesForBatch): string[] {
    const aggregatedTypes = CustomCardStorage.getAggregatedVariantTypesWithTemp(tempBatchId, tempDefinitions);
    
    const typeNames = Object.keys(aggregatedTypes);
    
    logDebug('getVariantTypeNames', {
        typeCount: typeNames.length,
        typeNames,
        tempBatchId
    });
    
    return typeNames;
}

/**
 * 检查变体类型是否存在
 */
export function hasVariantType(variantType: string, tempBatchId?: string, tempDefinitions?: VariantTypesForBatch): boolean {
    const aggregatedTypes = CustomCardStorage.getAggregatedVariantTypesWithTemp(tempBatchId, tempDefinitions);
    const exists = variantType in aggregatedTypes;
    
    logDebug('hasVariantType', {
        variantType,
        exists,
        tempBatchId
    });
    
    return exists;
}

/**
 * 获取变体类型的显示名称
 */
export function getVariantTypeName(variantType: string, tempBatchId?: string, tempDefinitions?: VariantTypesForBatch): string {
    const aggregatedTypes = CustomCardStorage.getAggregatedVariantTypesWithTemp(tempBatchId, tempDefinitions);
    const typeDef = aggregatedTypes[variantType];
    
    const displayName = typeDef?.name || variantType;
    
    logDebug('getVariantTypeName', {
        variantType,
        displayName,
        tempBatchId
    });
    
    return displayName;
}

// (Optional) Functions to remove custom names can be added here if needed
