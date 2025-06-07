/**
 * 验证工具模块
 * 提供临时数据与存储数据的内存合并机制，避免预写入操作
 */

import { CustomCardStorage, type CustomFieldsForBatch, type CustomFieldNamesStore, type VariantTypesForBatch } from './card-storage';
import type { ValidationContext } from './type-validators';

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
        logDebug('mergeCustomFields', { tempBatchId, tempDefinitions });

        // 获取现有的自定义字段（不包含临时数据）
        const existing = CustomCardStorage.getAggregatedCustomFieldNamesFromBatches();

        if (!tempDefinitions) {
            logDebug('mergeCustomFields', { result: 'no temp definitions, returning existing', existing });
            return existing;
        }

        // 内存中合并，不写入存储
        const merged: CustomFieldNamesStore = { ...existing };

        for (const [category, names] of Object.entries(tempDefinitions)) {
            if (Array.isArray(names)) {
                if (!merged[category]) {
                    merged[category] = [];
                }
                // 合并并去重
                merged[category] = [...new Set([...merged[category], ...names])];
            }
        }

        logDebug('mergeCustomFields', {
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
        const existing = CustomCardStorage.getAggregatedVariantTypesFromBatches();

        if (!tempDefinitions) {
            logDebug('mergeVariantTypes', { result: 'no temp definitions, returning existing', existing });
            return existing;
        }

        // 内存中合并，临时定义优先
        const merged = { ...existing, ...tempDefinitions };

        logDebug('mergeVariantTypes', {
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
        logDebug('createValidationContext', {
            tempBatchId,
            hasCustomFields: !!tempCustomFields,
            hasVariantTypes: !!tempVariantTypes
        });

        const context: ValidationContext = {
            customFields: this.mergeCustomFields(tempBatchId, tempCustomFields),
            variantTypes: this.mergeVariantTypes(tempBatchId, tempVariantTypes),
            tempBatchId
        };

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

        // 提取变体类型定义
        const tempVariantTypes = importData.customFieldDefinitions?.variantTypes;

        return this.createValidationContext(tempBatchId, tempCustomFields, tempVariantTypes);
    }
}
