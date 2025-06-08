// 属性类别常量列表
export const ATTRIBUTE_CLASS_NAMES: string[] = [
    "力量", "敏捷", "灵巧", "风度", "本能", "知识", "不可施法"
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
import { type ValidationContext } from './type-validators';

// 调试日志标记
const DEBUG_PREDEFINED_FIELDS = false;
const logDebug = (operation: string, details: any) => {
    if (DEBUG_PREDEFINED_FIELDS) {
        console.log(`[PredefinedFields:${operation}]`, details);
    }
};

// Getter functions
export function getProfessionCardNames(tempBatchId?: string, tempDefinitions?: CustomFieldsForBatch): string[] {
    const aggregatedCustomFields = CustomCardStorage.getAggregatedCustomFieldNamesWithTemp(tempBatchId, tempDefinitions);
    const customNames = aggregatedCustomFields.professions || []; // Use 'professions' instead of 'profession'
    const result = [...new Set([...customNames])];
    
    logDebug('getProfessionCardNames', {
        customCount: customNames.length,
        totalCount: result.length,
        customNames,
        result,
        tempBatchId,
        tempDefinitions: tempDefinitions?.professions // Use 'professions' instead of 'profession'
    });
    
    return result;
}

export function getAncestryCardNames(tempBatchId?: string, tempDefinitions?: CustomFieldsForBatch): string[] {
    const aggregatedCustomFields = CustomCardStorage.getAggregatedCustomFieldNamesWithTemp(tempBatchId, tempDefinitions);
    const customNames = aggregatedCustomFields.ancestries || []; // Use 'ancestries' instead of 'ancestry'
    const result = [...new Set([...customNames])];
    
    logDebug('getAncestryCardNames', {
        customCount: customNames.length,
        totalCount: result.length,
        tempBatchId,
        tempDefinitions: tempDefinitions?.ancestries // Use 'ancestries' instead of 'ancestry'
    });
    
    return result;
}

export function getCommunityCardNames(tempBatchId?: string, tempDefinitions?: CustomFieldsForBatch): string[] {
    const aggregatedCustomFields = CustomCardStorage.getAggregatedCustomFieldNamesWithTemp(tempBatchId, tempDefinitions);
    const customNames = aggregatedCustomFields.communities || []; // Use 'communities' instead of 'community'
    const result = [...new Set([...customNames])];
    
    logDebug('getCommunityCardNames', {
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
    const aggregatedCustomFields = CustomCardStorage.getAggregatedCustomFieldNamesWithTemp(tempBatchId, tempDefinitions);
    const customNames = aggregatedCustomFields.domains || []; // Use 'domains' instead of 'domain'
    const result = [...new Set([...customNames])];
    
    logDebug('getDomainCardNames', {
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
    
    // 直接使用variantType作为显示名称，不再依赖name字段
    const displayName = variantType;
    
    logDebug('getVariantTypeName', {
        variantType,
        displayName,
        tempBatchId
    });
    
    return displayName;
}

// (Optional) Functions to remove custom names can be added here if needed

// ===== 新增：基于ValidationContext的字段获取函数 =====

/**
 * 基于ValidationContext获取职业卡牌名称
 * 用于在验证过程中使用内存中的数据而不是localStorage
 */
export function getProfessionCardNamesFromContext(context: ValidationContext): string[] {
    const customNames = context.customFields.professions || [];
    const result = [...new Set([...customNames])];

    logDebug('getProfessionCardNamesFromContext', {
        customCount: customNames.length,
        totalCount: result.length,
        customNames,
        batchId: context.tempBatchId
    });

    return result;
}

/**
 * 基于ValidationContext获取血统卡牌名称
 */
export function getAncestryCardNamesFromContext(context: ValidationContext): string[] {
    const customNames = context.customFields.ancestries || [];
    const result = [...new Set([...customNames])];

    logDebug('getAncestryCardNamesFromContext', {
        customCount: customNames.length,
        totalCount: result.length,
        customNames,
        batchId: context.tempBatchId
    });

    return result;
}

/**
 * 基于ValidationContext获取社区卡牌名称
 */
export function getCommunityCardNamesFromContext(context: ValidationContext): string[] {
    const customNames = context.customFields.communities || [];
    const result = [...new Set([...customNames])];

    logDebug('getCommunityCardNamesFromContext', {
        customCount: customNames.length,
        totalCount: result.length,
        customNames,
        batchId: context.tempBatchId
    });

    return result;
}

/**
 * 基于ValidationContext获取子职业卡牌名称
 */
export function getSubClassCardNamesFromContext(context: ValidationContext): string[] {
    // 子职业名称直接从职业名称衍生
    return getProfessionCardNamesFromContext(context);
}

/**
 * 基于ValidationContext获取领域卡牌名称
 */
export function getDomainCardNamesFromContext(context: ValidationContext): string[] {
    const customNames = context.customFields.domains || [];
    const result = [...new Set([...customNames])];

    logDebug('getDomainCardNamesFromContext', {
        customCount: customNames.length,
        totalCount: result.length,
        customNames,
        batchId: context.tempBatchId
    });

    return result;
}

/**
 * 基于ValidationContext获取所有可用的变体类型定义
 */
export function getVariantTypesFromContext(context: ValidationContext): Record<string, any> {
    const aggregatedTypes = context.variantTypes;

    logDebug('getVariantTypesFromContext', {
        typeCount: Object.keys(aggregatedTypes).length,
        typeIds: Object.keys(aggregatedTypes),
        batchId: context.tempBatchId
    });

    return aggregatedTypes;
}

/**
 * 基于ValidationContext获取指定变体类型的子类别选项
 */
export function getVariantSubclassesFromContext(variantType: string, context: ValidationContext): string[] {
    const aggregatedTypes = context.variantTypes;
    const typeDef = aggregatedTypes[variantType];

    logDebug('getVariantSubclassesFromContext', {
        variantType,
        typeDef: !!typeDef,
        subclasses: typeDef?.subclasses || [],
        batchId: context.tempBatchId
    });

    return typeDef?.subclasses || [];
}

/**
 * 基于ValidationContext获取所有变体类型的名称列表
 */
export function getVariantTypeNamesFromContext(context: ValidationContext): string[] {
    const aggregatedTypes = context.variantTypes;
    const typeNames = Object.keys(aggregatedTypes);

    logDebug('getVariantTypeNamesFromContext', {
        typeCount: typeNames.length,
        typeNames,
        batchId: context.tempBatchId
    });

    return typeNames;
}

/**
 * 基于ValidationContext检查变体类型是否存在
 */
export function hasVariantTypeFromContext(variantType: string, context: ValidationContext): boolean {
    const aggregatedTypes = context.variantTypes;
    const exists = variantType in aggregatedTypes;

    logDebug('hasVariantTypeFromContext', {
        variantType,
        exists,
        batchId: context.tempBatchId
    });

    return exists;
}

/**
 * 基于ValidationContext获取变体类型的显示名称
 */
export function getVariantTypeNameFromContext(variantType: string, context: ValidationContext): string {
    const aggregatedTypes = context.variantTypes;
    const typeDef = aggregatedTypes[variantType];

    // 直接使用variantType作为显示名称，不再依赖name字段
    const displayName = variantType;

    logDebug('getVariantTypeNameFromContext', {
        variantType,
        displayName,
        batchId: context.tempBatchId
    });

    return displayName;
}
