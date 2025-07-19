/**
 * 验证工具模块
 * 提供临时数据与存储数据的内存合并机制，避免预写入操作
 */

import { useUnifiedCardStore } from './stores/unified-card-store';
import type { CustomFieldsForBatch, CustomFieldNamesStore, VariantTypesForBatch } from './stores/unified-card-store';
import type { ValidationContext } from './type-validators';
import builtinCardPackJson from '../data/cards/builtin-base.json';

// 调试日志标记
const DEBUG_VALIDATION_UTILS = false;
const logDebug = (operation: string, details: any) => {
    if (DEBUG_VALIDATION_UTILS) {
        console.log(`[ValidationUtils:${operation}]`, details);
    }
};

/**
 * 验证数据合并器
 * 在内存中合并现有数据和临时数据，用于验证过程
 */
export class ValidationDataMerger {
    /**
     * 合并现有自定义字段定义和临时定义，创建验证用的聚合视图
     * @param tempBatchId 临时批次ID
     * @param tempDefinitions 临时自定义字段定义
     * @returns 合并后的自定义字段名称存储
     */
    static mergeCustomFields(
        tempBatchId?: string,
        tempDefinitions?: CustomFieldsForBatch
    ): CustomFieldNamesStore {
        logDebug('[DEBUG] mergeCustomFields 开始', []);
        logDebug('[DEBUG] tempBatchId:', tempBatchId);
        logDebug('[DEBUG] tempDefinitions:', tempDefinitions);
        
        logDebug('mergeCustomFields', { tempBatchId, tempDefinitions });

        // 获取现有的自定义字段（不包含临时数据）
        const store = useUnifiedCardStore.getState();
        const existing = store.getAggregatedCustomFields();
        logDebug('[DEBUG] 现有的字段定义:', existing);

        // 获取内置卡包的字段定义
        const builtinFields: CustomFieldNamesStore = {};
        const builtinCustomFields = (builtinCardPackJson as any).customFieldDefinitions;
        logDebug('[DEBUG] 内置卡包原始customFieldDefinitions:', builtinCustomFields);
        
        if (builtinCustomFields) {
            for (const [category, names] of Object.entries(builtinCustomFields)) {
                if (Array.isArray(names) && category !== 'variantTypes') {
                    builtinFields[category] = names as string[];
                }
            }
        }
        logDebug('[DEBUG] 提取的内置字段:', builtinFields);

        // 首先合并内置字段和现有字段
        const mergedWithBuiltin: CustomFieldNamesStore = { ...builtinFields };
        for (const [category, names] of Object.entries(existing)) {
            if (!mergedWithBuiltin[category]) {
                mergedWithBuiltin[category] = [];
            }
            mergedWithBuiltin[category] = [...new Set([...mergedWithBuiltin[category], ...names])];
        }
        logDebug('[DEBUG] 内置+现有字段合并结果:', mergedWithBuiltin);

        if (!tempDefinitions) {
            logDebug('[DEBUG] 没有临时定义，返回内置+现有的合并结果', []);
            logDebug('mergeCustomFields', { result: 'no temp definitions, returning merged builtin+existing', merged: mergedWithBuiltin });
            return mergedWithBuiltin;
        }

        // 内存中合并临时定义，不写入存储
        const merged: CustomFieldNamesStore = { ...mergedWithBuiltin };

        for (const [category, names] of Object.entries(tempDefinitions)) {
            if (Array.isArray(names)) {
                if (!merged[category]) {
                    merged[category] = [];
                }
                // 合并并去重
                merged[category] = [...new Set([...merged[category], ...names])];
            }
        }

        logDebug('[DEBUG] 最终合并结果:', merged);

        logDebug('mergeCustomFields', {
            builtinCategories: Object.keys(builtinFields),
            existingCategories: Object.keys(existing),
            tempCategories: Object.keys(tempDefinitions),
            mergedCategories: Object.keys(merged),
            result: merged
        });

        return merged;
    }

    /**
     * 合并现有变体类型定义和临时定义，创建验证用的聚合视图
     * @param tempBatchId 临时批次ID
     * @param tempDefinitions 临时变体类型定义
     * @returns 合并后的变体类型定义
     */
    static mergeVariantTypes(
        tempBatchId?: string,
        tempDefinitions?: VariantTypesForBatch
    ): VariantTypesForBatch {
        logDebug('mergeVariantTypes', { tempBatchId, tempDefinitions });

        // 获取现有的变体类型定义（不包含临时数据）
        const store = useUnifiedCardStore.getState();
        const existing = store.getAggregatedVariantTypes();

        // 获取内置卡包的变体类型定义
        const builtinVariantTypes: VariantTypesForBatch = {};
        const builtinCustomFields = (builtinCardPackJson as any).customFieldDefinitions;
        if (builtinCustomFields?.variantTypes) {
            Object.assign(builtinVariantTypes, builtinCustomFields.variantTypes);
        }

        // 首先合并内置变体类型和现有变体类型
        const mergedWithBuiltin = { ...builtinVariantTypes, ...existing };

        if (!tempDefinitions) {
            logDebug('mergeVariantTypes', { result: 'no temp definitions, returning merged builtin+existing', merged: mergedWithBuiltin });
            return mergedWithBuiltin;
        }

        // 内存中合并，临时定义优先
        const merged = { ...mergedWithBuiltin, ...tempDefinitions };

        logDebug('mergeVariantTypes', {
            builtinTypes: Object.keys(builtinVariantTypes),
            existingTypes: Object.keys(existing),
            tempTypes: Object.keys(tempDefinitions),
            mergedTypes: Object.keys(merged),
            result: merged
        });

        return merged;
    }

    /**
     * 创建完整的验证上下文
     * @param tempBatchId 临时批次ID
     * @param tempCustomFields 临时自定义字段定义
     * @param tempVariantTypes 临时变体类型定义
     * @returns 验证上下文
     */
    static createValidationContext(
        tempBatchId?: string,
        tempCustomFields?: CustomFieldsForBatch,
        tempVariantTypes?: VariantTypesForBatch
    ): ValidationContext {
        logDebug('[DEBUG] createValidationContext 开始', []);
        logDebug('[DEBUG] tempBatchId:', tempBatchId);
        logDebug('[DEBUG] tempCustomFields:', tempCustomFields);
        logDebug('[DEBUG] tempVariantTypes:', tempVariantTypes);
        
        logDebug('createValidationContext', {
            tempBatchId,
            hasCustomFields: !!tempCustomFields,
            hasVariantTypes: !!tempVariantTypes
        });

        logDebug('[DEBUG] 调用 mergeCustomFields...', []);
        const mergedCustomFields = this.mergeCustomFields(tempBatchId, tempCustomFields);
        logDebug('[DEBUG] mergeCustomFields 结果:', mergedCustomFields);
        
        logDebug('[DEBUG] 调用 mergeVariantTypes...', []);
        const mergedVariantTypes = this.mergeVariantTypes(tempBatchId, tempVariantTypes);
        logDebug('[DEBUG] mergeVariantTypes 结果:', mergedVariantTypes);

        const context: ValidationContext = {
            customFields: mergedCustomFields,
            variantTypes: mergedVariantTypes,
            tempBatchId
        };

        logDebug('[DEBUG] 最终创建的 ValidationContext:', context);

        logDebug('createValidationContext', {
            result: {
                customFieldCategories: Object.keys(context.customFields),
                variantTypeCount: Object.keys(context.variantTypes).length,
                tempBatchId: context.tempBatchId
            }
        });

        return context;
    }

    /**
     * 从导入数据创建验证上下文
     * @param importData 导入数据
     * @param tempBatchId 临时批次ID
     * @returns 验证上下文
     */
    static createValidationContextFromImportData(
        importData: any,
        tempBatchId?: string
    ): ValidationContext {
        logDebug('[DEBUG] createValidationContextFromImportData 开始', []);
        logDebug('[DEBUG] importData.customFieldDefinitions:', importData.customFieldDefinitions);
        logDebug('[DEBUG] tempBatchId:', tempBatchId);
        
        logDebug('createValidationContextFromImportData', {
            tempBatchId,
            hasCustomFieldDefinitions: !!importData.customFieldDefinitions
        });

        // 提取自定义字段定义（排除变体类型）
        const tempCustomFields = importData.customFieldDefinitions ? Object.fromEntries(
            Object.entries(importData.customFieldDefinitions)
                .filter(([key, value]) => Array.isArray(value) && key !== 'variantTypes')
                .map(([key, value]) => [key, value as string[]])
        ) : undefined;

        logDebug('[DEBUG] 提取的tempCustomFields:', tempCustomFields);

        // 提取变体类型定义
        const tempVariantTypes = importData.customFieldDefinitions?.variantTypes;
        logDebug('[DEBUG] 提取的tempVariantTypes:', tempVariantTypes);

        const result = this.createValidationContext(tempBatchId, tempCustomFields, tempVariantTypes);
        logDebug('[DEBUG] createValidationContext 返回结果:', result);
        
        return result;
    }
}
