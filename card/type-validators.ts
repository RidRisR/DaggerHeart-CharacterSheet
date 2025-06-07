/**
 * 卡牌类型验证器
 * 用于验证导入的原始卡牌数据是否符合各自的类型定义
 */

import {
    getProfessionCardNames,
    getAncestryCardNames,
    getCommunityCardNames,
    getSubClassCardNames,
    getDomainCardNames,
    getProfessionCardNamesFromContext,
    getAncestryCardNamesFromContext,
    getCommunityCardNamesFromContext,
    getSubClassCardNamesFromContext,
    getDomainCardNamesFromContext,
    getVariantTypesFromContext,
    ATTRIBUTE_CLASS_NAMES,
    SUBCLASS_LEVEL_NAMES,
    type AttributeClass,
    type SubClassLevel
} from './card-predefined-field';
import { CustomFieldsForBatch, type CustomFieldNamesStore, type VariantTypesForBatch } from './card-storage';

export interface TemporaryCustomFields {
    tempBatchId?: string;
    tempDefinitions?: CustomFieldsForBatch;
    tempVariantTypes?: VariantTypesForBatch; // 新增：临时变体类型定义
}

export interface ValidationError {
    path: string;
    message: string;
    value?: any;
}

export interface TypeValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

// 新增：验证上下文结构，包含所有验证所需的数据
export interface ValidationContext {
    customFields: CustomFieldNamesStore;
    variantTypes: VariantTypesForBatch;
    tempBatchId?: string;
}

/**
 * 职业卡牌验证器
 */
export function validateProfessionCard(card: any, index: number, tempFields?: TemporaryCustomFields, context?: ValidationContext): TypeValidationResult {
    const errors: ValidationError[] = [];
    const prefix = `profession[${index}]`;

    // 优先使用ValidationContext，否则使用传统的tempFields
    let validProfessions: string[];
    let validDomains: string[];

    if (context) {
        validProfessions = getProfessionCardNamesFromContext(context);
        validDomains = getDomainCardNamesFromContext(context);
    } else {
        validProfessions = getProfessionCardNames(tempFields?.tempBatchId, tempFields?.tempDefinitions);
        validDomains = getDomainCardNames(tempFields?.tempBatchId, tempFields?.tempDefinitions);
    }

    // 必需字段验证
    if (!card.id || typeof card.id !== 'string') {
        errors.push({ path: `${prefix}.id`, message: 'id字段是必需的，且必须是字符串' });
    }

    if (!card.名称 || !validProfessions.includes(card.名称 as any)) {
        errors.push({
            path: `${prefix}.名称`,
            message: `名称字段必须是有效的职业名称。有效选项: ${validProfessions.join(', ')} (或用户自定义)`,
            value: card.名称
        });
    }

    if (!card.简介 || typeof card.简介 !== 'string') {
        errors.push({ path: `${prefix}.简介`, message: '简介字段是必需的，且必须是字符串' });
    }

    if (!card.领域1 || !validDomains.includes(card.领域1 as any)) {
        errors.push({
            path: `${prefix}.领域1`,
            message: `领域1字段必须是有效的领域名称。有效选项: ${validDomains.join(', ')} (或用户自定义)`,
            value: card.领域1
        });
    }

    if (!card.领域2 || !validDomains.includes(card.领域2 as any)) {
        errors.push({
            path: `${prefix}.领域2`,
            message: `领域2字段必须是有效的领域名称。有效选项: ${validDomains.join(', ')} (或用户自定义)`,
            value: card.领域2
        });
    }

    if (typeof card.起始生命 !== 'number' || card.起始生命 < 1) {
        errors.push({ path: `${prefix}.起始生命`, message: '起始生命必须是大于0的数字', value: card.起始生命 });
    }

    if (typeof card.起始闪避 !== 'number' || card.起始闪避 < 1) {
        errors.push({ path: `${prefix}.起始闪避`, message: '起始闪避必须是大于0的数字', value: card.起始闪避 });
    }

    if (!card.起始物品 || typeof card.起始物品 !== 'string') {
        errors.push({ path: `${prefix}.起始物品`, message: '起始物品字段是必需的，且必须是字符串' });
    }

    if (!card.希望特性 || typeof card.希望特性 !== 'string') {
        errors.push({ path: `${prefix}.希望特性`, message: '希望特性字段是必需的，且必须是字符串' });
    }

    if (!card.职业特性 || typeof card.职业特性 !== 'string') {
        errors.push({ path: `${prefix}.职业特性`, message: '职业特性字段是必需的，且必须是字符串' });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * 血统卡牌验证器
 */
export function validateAncestryCard(card: any, index: number, tempFields?: TemporaryCustomFields, context?: ValidationContext): TypeValidationResult {
    const errors: ValidationError[] = [];
    const prefix = `ancestry[${index}]`;

    // 优先使用ValidationContext，否则使用传统的tempFields
    const validAncestries = context
        ? getAncestryCardNamesFromContext(context)
        : getAncestryCardNames(tempFields?.tempBatchId, tempFields?.tempDefinitions);

    if (!card.id || typeof card.id !== 'string') {
        errors.push({ path: `${prefix}.id`, message: 'id字段是必需的，且必须是字符串' });
    }

    if (!card.名称 || typeof card.名称 !== 'string') {
        errors.push({ path: `${prefix}.名称`, message: '名称字段是必需的，且必须是字符串' });
    }

    if (!card.种族 || !validAncestries.includes(card.种族 as any)) {
        errors.push({
            path: `${prefix}.种族`,
            message: `种族字段必须是有效的血统名称。有效选项: ${validAncestries.join(', ')} (或用户自定义)`,
            value: card.种族
        });
    }

    if (!card.简介 || typeof card.简介 !== 'string') {
        errors.push({ path: `${prefix}.简介`, message: '简介字段是必需的，且必须是字符串' });
    }

    if (!card.效果 || typeof card.效果 !== 'string') {
        errors.push({ path: `${prefix}.效果`, message: '效果字段是必需的，且必须是字符串' });
    }

    if (typeof card.类别 !== 'number') {
        errors.push({ path: `${prefix}.类别`, message: '类别字段必须是数字', value: card.类别 });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * 社群卡牌验证器
 */
export function validateCommunityCard(card: any, index: number, tempFields?: TemporaryCustomFields, context?: ValidationContext): TypeValidationResult {
    const errors: ValidationError[] = [];
    const prefix = `community[${index}]`;

    // 优先使用ValidationContext，否则使用传统的tempFields
    const validCommunities = context
        ? getCommunityCardNamesFromContext(context)
        : getCommunityCardNames(tempFields?.tempBatchId, tempFields?.tempDefinitions);

    if (!card.id || typeof card.id !== 'string') {
        errors.push({ path: `${prefix}.id`, message: 'ID字段是必需的，且必须是字符串' });
    }

    if (!card.名称 || !validCommunities.includes(card.名称 as any)) {
        errors.push({
            path: `${prefix}.名称`,
            message: `名称字段必须是有效的社群名称。有效选项: ${validCommunities.join(', ')} (或用户自定义)`,
            value: card.名称
        });
    }

    if (!card.特性 || typeof card.特性 !== 'string') {
        errors.push({ path: `${prefix}.特性`, message: '特性字段是必需的，且必须是字符串' });
    }

    if (!card.简介 || typeof card.简介 !== 'string') {
        errors.push({ path: `${prefix}.简介`, message: '简介字段是必需的，且必须是字符串' });
    }

    if (!card.描述 || typeof card.描述 !== 'string') {
        errors.push({ path: `${prefix}.描述`, message: '描述字段是必需的，且必须是字符串' });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * 子职业卡牌验证器
 */
export function validateSubClassCard(card: any, index: number, tempFields?: TemporaryCustomFields, context?: ValidationContext): TypeValidationResult {
    const errors: ValidationError[] = [];
    const prefix = `subclass[${index}]`;

    // 优先使用ValidationContext，否则使用传统的tempFields
    const validSubClasses = context
        ? getSubClassCardNamesFromContext(context)
        : getSubClassCardNames(tempFields?.tempBatchId, tempFields?.tempDefinitions);

    if (!card.id || typeof card.id !== 'string') {
        errors.push({ path: `${prefix}.id`, message: 'id字段是必需的，且必须是字符串' });
    }

    if (!card.名称 || typeof card.名称 !== 'string') {
        errors.push({ path: `${prefix}.名称`, message: '名称字段是必需的，且必须是字符串' });
    }

    if (!card.描述 || typeof card.描述 !== 'string') {
        errors.push({ path: `${prefix}.描述`, message: '描述字段是必需的，且必须是字符串' });
    }

    if (!card.主职 || !validSubClasses.includes(card.主职 as any)) {
        errors.push({
            path: `${prefix}.主职`,
            message: `主职字段必须是有效的子职业名称。有效选项: ${validSubClasses.join(', ')} (或用户自定义)`,
            value: card.主职
        });
    }

    if (!card.子职业 || typeof card.子职业 !== 'string') {
        errors.push({ path: `${prefix}.子职业`, message: '子职业字段是必需的，且必须是字符串' });
    }

    // 等级验证 - 使用 SubClassLevel 类型约束
    if (!card.等级 || !SUBCLASS_LEVEL_NAMES.includes(card.等级)) {
        errors.push({
            path: `${prefix}.等级`,
            message: `等级字段必须是有效的等级名称。有效选项: ${SUBCLASS_LEVEL_NAMES.join(', ')}`,
            value: card.等级
        });
    }

    // 施法属性验证 - 使用 AttributeClass 类型约束
    if (!card.施法 || !ATTRIBUTE_CLASS_NAMES.includes(card.施法)) {
        errors.push({
            path: `${prefix}.施法`,
            message: `施法字段必须是有效的属性名称。有效选项: ${ATTRIBUTE_CLASS_NAMES.join(', ')}`,
            value: card.施法
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * 领域卡牌验证器
 */
export function validateDomainCard(card: any, index: number, tempFields?: TemporaryCustomFields, context?: ValidationContext): TypeValidationResult {
    const errors: ValidationError[] = [];
    const prefix = `domain[${index}]`;

    // 优先使用ValidationContext，否则使用传统的tempFields
    const validDomains = context
        ? getDomainCardNamesFromContext(context)
        : getDomainCardNames(tempFields?.tempBatchId, tempFields?.tempDefinitions);

    if (!card.id || typeof card.id !== 'string') {
        errors.push({ path: `${prefix}.id`, message: 'ID字段是必需的，且必须是字符串' });
    }

    if (!card.名称 || typeof card.名称 !== 'string') {
        errors.push({ path: `${prefix}.名称`, message: '名称字段是必需的，且必须是字符串' });
    }

    if (!card.领域 || !validDomains.includes(card.领域 as any)) {
        errors.push({
            path: `${prefix}.领域`,
            message: `领域字段必须是有效的领域名称。有效选项: ${validDomains.join(', ')} (或用户自定义)`,
            value: card.领域
        });
    }

    if (!card.描述 || typeof card.描述 !== 'string') {
        errors.push({ path: `${prefix}.描述`, message: '描述字段是必需的，且必须是字符串' });
    }

    if (typeof card.等级 !== 'number' || card.等级 < 1 || card.等级 > 10) {
        errors.push({ path: `${prefix}.等级`, message: '等级字段必须是1-10之间的数字', value: card.等级 });
    }

    if (!card.属性 || typeof card.属性 !== 'string') {
        errors.push({ path: `${prefix}.属性`, message: '属性字段是必需的，且必须是字符串' });
    }

    if (typeof card.回想 !== 'number' || card.回想 < 0) {
        errors.push({ path: `${prefix}.回想`, message: '回想字段必须是大于等于0的数字', value: card.回想 });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * 变体卡牌验证器
 */
export function validateVariantCard(card: any, index: number, variantTypes?: Record<string, any>, context?: ValidationContext): TypeValidationResult {
    const errors: ValidationError[] = [];
    const prefix = `variant[${index}]`;

    // 优先使用ValidationContext中的变体类型，否则使用传入的variantTypes
    const effectiveVariantTypes = context ? context.variantTypes : variantTypes;

    // 必需字段验证
    if (!card.id || typeof card.id !== 'string') {
        errors.push({ 
            path: `${prefix}.id`, 
            message: 'id字段是必需的，且必须是字符串' 
        });
    }

    if (!card.名称 || typeof card.名称 !== 'string') {
        errors.push({ 
            path: `${prefix}.名称`, 
            message: '名称字段是必需的，且必须是字符串' 
        });
    }

    if (!card.类型 || typeof card.类型 !== 'string') {
        errors.push({ 
            path: `${prefix}.类型`, 
            message: '类型字段是必需的，且必须是字符串' 
        });
    } else if (effectiveVariantTypes && !effectiveVariantTypes[card.类型]) {
        const availableTypes = Object.keys(effectiveVariantTypes);
        errors.push({ 
            path: `${prefix}.类型`, 
            message: `类型字段必须是预定义的变体类型。可用类型: ${availableTypes.join(', ')}`,
            value: card.类型
        });
    }

    // 子类别验证（如果提供）
    if (card.子类别) {
        if (typeof card.子类别 !== 'string') {
            errors.push({ 
                path: `${prefix}.子类别`, 
                message: '子类别字段必须是字符串' 
            });
        } else if (effectiveVariantTypes && effectiveVariantTypes[card.类型]) {
            const validSubclasses = effectiveVariantTypes[card.类型].subclasses;
            if (validSubclasses && Array.isArray(validSubclasses) && !validSubclasses.includes(card.子类别)) {
                errors.push({ 
                    path: `${prefix}.子类别`, 
                    message: `子类别字段必须是类型"${card.类型}"的有效子类别。可用选项: ${validSubclasses.join(', ')}`,
                    value: card.子类别
                });
            }
        }
    }

    // 等级验证（如果提供）
    if (card.等级 !== undefined) {
        if (typeof card.等级 !== 'number' || card.等级 < 0) {
            errors.push({ 
                path: `${prefix}.等级`, 
                message: '等级字段必须是非负数字',
                value: card.等级
            });
        } else if (effectiveVariantTypes && effectiveVariantTypes[card.类型]?.levelRange) {
            const [min, max] = effectiveVariantTypes[card.类型].levelRange;
            if (card.等级 < min || card.等级 > max) {
                errors.push({ 
                    path: `${prefix}.等级`, 
                    message: `等级字段必须在范围 ${min}-${max} 内`,
                    value: card.等级
                });
            }
        }
    }

    // 效果验证
    if (!card.效果 || typeof card.效果 !== 'string') {
        errors.push({ 
            path: `${prefix}.效果`, 
            message: '效果字段是必需的，且必须是字符串' 
        });
    }

    // 简略信息验证
    if (!card.简略信息 || typeof card.简略信息 !== 'object') {
        errors.push({ 
            path: `${prefix}.简略信息`, 
            message: '简略信息字段是必需的，且必须是对象' 
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * 验证变体类型定义
 */
export function validateVariantTypeDefinitions(variantTypes: Record<string, any>): ValidationError[] {
    const errors: ValidationError[] = [];
    
    Object.entries(variantTypes).forEach(([typeId, typeDef]) => {
        // 注意：不再验证name字段，显示名称直接使用对象键(typeId)
        
        if (!Array.isArray(typeDef.subclasses)) {
            errors.push({
                path: `customFieldDefinitions.variantTypes.${typeId}.subclasses`,
                message: 'subclasses字段必须是字符串数组'
            });
        }
        
        if (typeDef.levelRange && (!Array.isArray(typeDef.levelRange) || typeDef.levelRange.length !== 2)) {
            errors.push({
                path: `customFieldDefinitions.variantTypes.${typeId}.levelRange`,
                message: 'levelRange字段必须是长度为2的数字数组 [min, max]'
            });
        }
    });
    
    return errors;
}

/**
 * 综合类型验证器
 */
export class CardTypeValidator {
    /**
     * 验证完整的导入数据 (传统方式，使用TemporaryCustomFields)
     */
    static validateImportData(importData: any, tempFields?: TemporaryCustomFields): { isValid: boolean; errors: ValidationError[]; totalCards: number };

    /**
     * 验证完整的导入数据 (新方式，使用ValidationContext)
     */
    static validateImportData(importData: any, context: ValidationContext): { isValid: boolean; errors: ValidationError[]; totalCards: number };

    /**
     * 验证完整的导入数据 (实现)
     */
    static validateImportData(importData: any, contextOrTempFields?: ValidationContext | TemporaryCustomFields): { isValid: boolean; errors: ValidationError[]; totalCards: number } {
        console.log('[DEBUG] CardTypeValidator.validateImportData 开始');
        console.log('[DEBUG] 输入数据结构:', Object.keys(importData));
        console.log('[DEBUG] 参数类型:', contextOrTempFields);

        const allErrors: ValidationError[] = [];
        let totalCards = 0;

        // 检测参数类型
        const isValidationContext = contextOrTempFields && 'customFields' in contextOrTempFields && 'variantTypes' in contextOrTempFields;
        const context = isValidationContext ? contextOrTempFields as ValidationContext : undefined;
        const tempFields = !isValidationContext ? contextOrTempFields as TemporaryCustomFields : undefined;

        // 验证职业卡牌
        if (importData.profession && Array.isArray(importData.profession)) {
            console.log('[DEBUG] 验证职业卡牌，数量:', importData.profession.length);
            totalCards += importData.profession.length;
            importData.profession.forEach((card: any, index: number) => {
                const result = validateProfessionCard(card, index, tempFields, context);
                allErrors.push(...result.errors);
            });
        }

        // 验证血统卡牌
        if (importData.ancestry && Array.isArray(importData.ancestry)) {
            console.log('[DEBUG] 验证血统卡牌，数量:', importData.ancestry.length);
            totalCards += importData.ancestry.length;
            importData.ancestry.forEach((card: any, index: number) => {
                const result = validateAncestryCard(card, index, tempFields, context);
                allErrors.push(...result.errors);
            });
        }

        // 验证社群卡牌
        if (importData.community && Array.isArray(importData.community)) {
            console.log('[DEBUG] 验证社群卡牌，数量:', importData.community.length);
            totalCards += importData.community.length;
            importData.community.forEach((card: any, index: number) => {
                const result = validateCommunityCard(card, index, tempFields, context);
                allErrors.push(...result.errors);
            });
        }

        // 验证子职业卡牌
        if (importData.subclass && Array.isArray(importData.subclass)) {
            console.log('[DEBUG] 验证子职业卡牌，数量:', importData.subclass.length);
            totalCards += importData.subclass.length;
            importData.subclass.forEach((card: any, index: number) => {
                const result = validateSubClassCard(card, index, tempFields, context);
                allErrors.push(...result.errors);
            });
        }

        // 验证领域卡牌
        if (importData.domain && Array.isArray(importData.domain)) {
            console.log('[DEBUG] 验证领域卡牌，数量:', importData.domain.length);
            totalCards += importData.domain.length;
            importData.domain.forEach((card: any, index: number) => {
                const result = validateDomainCard(card, index, tempFields, context);
                allErrors.push(...result.errors);
            });
        }

        // 验证变体卡牌
        if (importData.variant && Array.isArray(importData.variant)) {
            console.log('[DEBUG] 验证变体卡牌，数量:', importData.variant.length);
            totalCards += importData.variant.length;
            
            // 获取变体类型定义
            const variantTypes = context ? context.variantTypes : (importData.customFieldDefinitions?.variantTypes || {});
            
            // 先验证变体类型定义
            const typeDefErrors = validateVariantTypeDefinitions(variantTypes);
            allErrors.push(...typeDefErrors);
            
            // 然后验证每张变体卡牌
            importData.variant.forEach((card: any, index: number) => {
                const result = validateVariantCard(card, index, variantTypes, context);
                allErrors.push(...result.errors);
            });
        }

        console.log('[DEBUG] 验证完成，总卡牌数:', totalCards, '错误数:', allErrors.length);

        return {
            isValid: allErrors.length === 0,
            errors: allErrors,
            totalCards
        };
    }
}
