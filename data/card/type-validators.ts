/**
 * 卡牌类型验证器
 * 用于验证导入的原始卡牌数据是否符合各自的类型定义
 */

import type { ProfessionCard } from '@/data/card/profession-card/convert';
import type { AncestryCard } from '@/data/card/ancestry-card/convert';
import type { CommunityCard } from '@/data/card/community-card/convert';
import type { SubClassCard } from '@/data/card/subclass-card/convert';
import type { DomainCard } from '@/data/card/domain-card/convert';
import { PROFESSION_CARD_NAMES, ANCESTRY_CARD_NAMES, COMMUNITY_CARD_NAMES, SUBCLASS_CARD_NAMES, DOMAIN_CARD_NAMES } from '@/data/card/card-predefined-field';

export interface ValidationError {
    path: string;
    message: string;
    value?: any;
}

export interface TypeValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

/**
 * 职业卡牌验证器
 */
export function validateProfessionCard(card: any, index: number): TypeValidationResult {
    const errors: ValidationError[] = [];
    const prefix = `profession[${index}]`;

    // 必需字段验证
    if (!card.id || typeof card.id !== 'string') {
        errors.push({ path: `${prefix}.id`, message: 'id字段是必需的，且必须是字符串' });
    }

    if (!card.名称 || !PROFESSION_CARD_NAMES.includes(card.名称 as any)) {
        errors.push({
            path: `${prefix}.名称`,
            message: `名称字段必须是有效的职业名称。有效选项: ${PROFESSION_CARD_NAMES.join(', ')}`,
            value: card.名称
        });
    }

    if (!card.简介 || typeof card.简介 !== 'string') {
        errors.push({ path: `${prefix}.简介`, message: '简介字段是必需的，且必须是字符串' });
    }

    if (!card.领域1 || !DOMAIN_CARD_NAMES.includes(card.领域1 as any)) {
        errors.push({
            path: `${prefix}.领域1`,
            message: `领域1字段必须是有效的领域名称。有效选项: ${DOMAIN_CARD_NAMES.join(', ')}`,
            value: card.领域1
        });
    }

    if (!card.领域2 || !DOMAIN_CARD_NAMES.includes(card.领域2 as any)) {
        errors.push({
            path: `${prefix}.领域2`,
            message: `领域2字段必须是有效的领域名称。有效选项: ${DOMAIN_CARD_NAMES.join(', ')}`,
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
export function validateAncestryCard(card: any, index: number): TypeValidationResult {
    const errors: ValidationError[] = [];
    const prefix = `ancestry[${index}]`;

    if (!card.id || typeof card.id !== 'string') {
        errors.push({ path: `${prefix}.id`, message: 'id字段是必需的，且必须是字符串' });
    }

    if (!card.名称 || typeof card.名称 !== 'string') {
        errors.push({ path: `${prefix}.名称`, message: '名称字段是必需的，且必须是字符串' });
    }

    if (!card.种族 || !ANCESTRY_CARD_NAMES.includes(card.种族 as any)) {
        errors.push({
            path: `${prefix}.种族`,
            message: `种族字段必须是有效的血统名称。有效选项: ${ANCESTRY_CARD_NAMES.join(', ')}`,
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
export function validateCommunityCard(card: any, index: number): TypeValidationResult {
    const errors: ValidationError[] = [];
    const prefix = `community[${index}]`;

    if (!card.ID || typeof card.ID !== 'string') {
        errors.push({ path: `${prefix}.ID`, message: 'ID字段是必需的，且必须是字符串' });
    }

    if (!card.名称 || !COMMUNITY_CARD_NAMES.includes(card.名称 as any)) {
        errors.push({
            path: `${prefix}.名称`,
            message: `名称字段必须是有效的社群名称。有效选项: ${COMMUNITY_CARD_NAMES.join(', ')}`,
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
export function validateSubClassCard(card: any, index: number): TypeValidationResult {
    const errors: ValidationError[] = [];
    const prefix = `subclass[${index}]`;

    if (!card.id || typeof card.id !== 'string') {
        errors.push({ path: `${prefix}.id`, message: 'id字段是必需的，且必须是字符串' });
    }

    if (!card.名称 || typeof card.名称 !== 'string') {
        errors.push({ path: `${prefix}.名称`, message: '名称字段是必需的，且必须是字符串' });
    }

    if (!card.描述 || typeof card.描述 !== 'string') {
        errors.push({ path: `${prefix}.描述`, message: '描述字段是必需的，且必须是字符串' });
    }

    if (!card.主职 || !SUBCLASS_CARD_NAMES.includes(card.主职 as any)) {
        errors.push({
            path: `${prefix}.主职`,
            message: `主职字段必须是有效的子职业名称。有效选项: ${SUBCLASS_CARD_NAMES.join(', ')}`,
            value: card.主职
        });
    }

    if (!card.子职业 || typeof card.子职业 !== 'string') {
        errors.push({ path: `${prefix}.子职业`, message: '子职业字段是必需的，且必须是字符串' });
    }

    const validLevels = ["基石", "专精", "大师"];
    if (!card.等级 || !validLevels.includes(card.等级)) {
        errors.push({
            path: `${prefix}.等级`,
            message: `等级字段必须是有效的等级名称。有效选项: ${validLevels.join(', ')}`,
            value: card.等级
        });
    }

    if (!card.施法 || typeof card.施法 !== 'string') {
        errors.push({ path: `${prefix}.施法`, message: '施法字段是必需的，且必须是字符串' });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * 领域卡牌验证器
 */
export function validateDomainCard(card: any, index: number): TypeValidationResult {
    const errors: ValidationError[] = [];
    const prefix = `domain[${index}]`;

    if (!card.ID || typeof card.ID !== 'string') {
        errors.push({ path: `${prefix}.ID`, message: 'ID字段是必需的，且必须是字符串' });
    }

    if (!card.名称 || typeof card.名称 !== 'string') {
        errors.push({ path: `${prefix}.名称`, message: '名称字段是必需的，且必须是字符串' });
    }

    if (!card.领域 || !DOMAIN_CARD_NAMES.includes(card.领域 as any)) {
        errors.push({
            path: `${prefix}.领域`,
            message: `领域字段必须是有效的领域名称。有效选项: ${DOMAIN_CARD_NAMES.join(', ')}`,
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
 * 综合类型验证器
 */
export class CardTypeValidator {
    /**
     * 验证完整的导入数据
     */
    static validateImportData(importData: any): { isValid: boolean; errors: ValidationError[]; totalCards: number } {
        console.log('[DEBUG] CardTypeValidator.validateImportData 开始');
        console.log('[DEBUG] 输入数据结构:', Object.keys(importData));

        const allErrors: ValidationError[] = [];
        let totalCards = 0;

        // 验证职业卡牌
        if (importData.profession && Array.isArray(importData.profession)) {
            console.log('[DEBUG] 验证职业卡牌，数量:', importData.profession.length);
            totalCards += importData.profession.length;
            importData.profession.forEach((card: any, index: number) => {
                const result = validateProfessionCard(card, index);
                allErrors.push(...result.errors);
            });
        }

        // 验证血统卡牌
        if (importData.ancestry && Array.isArray(importData.ancestry)) {
            console.log('[DEBUG] 验证血统卡牌，数量:', importData.ancestry.length);
            totalCards += importData.ancestry.length;
            importData.ancestry.forEach((card: any, index: number) => {
                const result = validateAncestryCard(card, index);
                allErrors.push(...result.errors);
            });
        }

        // 验证社群卡牌
        if (importData.community && Array.isArray(importData.community)) {
            console.log('[DEBUG] 验证社群卡牌，数量:', importData.community.length);
            totalCards += importData.community.length;
            importData.community.forEach((card: any, index: number) => {
                const result = validateCommunityCard(card, index);
                allErrors.push(...result.errors);
            });
        }

        // 验证子职业卡牌
        if (importData.subclass && Array.isArray(importData.subclass)) {
            console.log('[DEBUG] 验证子职业卡牌，数量:', importData.subclass.length);
            totalCards += importData.subclass.length;
            importData.subclass.forEach((card: any, index: number) => {
                const result = validateSubClassCard(card, index);
                allErrors.push(...result.errors);
            });
        }

        // 验证领域卡牌
        if (importData.domain && Array.isArray(importData.domain)) {
            console.log('[DEBUG] 验证领域卡牌，数量:', importData.domain.length);
            totalCards += importData.domain.length;
            importData.domain.forEach((card: any, index: number) => {
                const result = validateDomainCard(card, index);
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
