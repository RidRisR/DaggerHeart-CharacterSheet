/**
 * Variant Card Validator
 * 变体卡牌验证器 - 验证变体卡牌和类型定义
 */

import { VariantCard, VariantCardInfo, VariantCardValidationRule, defaultVariantValidationRules } from './variant-types';
import { VariantTypeRegistry, VariantTypeDefinition } from './variant-registry';

/**
 * 验证结果接口
 */
export interface VariantValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 变体卡牌验证器
 */
export class VariantCardValidator {
  private registry: VariantTypeRegistry;
  private customRules: VariantCardValidationRule[] = [];

  constructor() {
    this.registry = VariantTypeRegistry.getInstance();
  }

  /**
   * 验证变体卡牌
   */
  validateCard(card: VariantCard): VariantValidationResult {
    const result: VariantValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // 应用默认验证规则
    this.applyValidationRules(card, defaultVariantValidationRules, result);

    // 应用自定义验证规则
    this.applyValidationRules(card, this.customRules, result);

    // 验证变体特定逻辑
    this.validateVariantSpecific(card, result);

    // 设置最终验证状态
    result.isValid = result.errors.length === 0;

    return result;
  }

  /**
   * 验证变体类型定义
   */
  validateTypeDefinition(definition: VariantTypeDefinition): VariantValidationResult {
    const result: VariantValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // 验证必需字段
    if (!definition.id || definition.id.trim().length === 0) {
      result.errors.push('变体类型定义必须有有效的ID');
    }

    if (!definition.name || definition.name.trim().length === 0) {
      result.errors.push('变体类型定义必须有有效的名称');
    }

    // 验证ID格式
    if (definition.id && !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(definition.id)) {
      result.errors.push('变体类型ID只能包含字母、数字、下划线和连字符，且必须以字母开头');
    }

    // 验证子类别
    if (definition.subclasses) {
      if (!Array.isArray(definition.subclasses)) {
        result.errors.push('子类别必须是字符串数组');
      } else {
        definition.subclasses.forEach((subclass, index) => {
          if (!subclass || typeof subclass !== 'string' || subclass.trim().length === 0) {
            result.errors.push(`子类别[${index}]必须是有效的字符串`);
          }
        });

        // 检查重复的子类别
        const uniqueSubclasses = new Set(definition.subclasses);
        if (uniqueSubclasses.size !== definition.subclasses.length) {
          result.warnings.push('存在重复的子类别');
        }
      }
    }

    // 验证自定义字段
    if (definition.customFields) {
      if (!Array.isArray(definition.customFields)) {
        result.errors.push('自定义字段必须是数组');
      } else {
        definition.customFields.forEach((field, index) => {
          if (!field.key || typeof field.key !== 'string') {
            result.errors.push(`自定义字段[${index}]必须有有效的key`);
          }
          if (!field.label || typeof field.label !== 'string') {
            result.errors.push(`自定义字段[${index}]必须有有效的label`);
          }
          if (!['text', 'number', 'boolean', 'select'].includes(field.type)) {
            result.errors.push(`自定义字段[${index}]的type必须是text、number、boolean或select之一`);
          }
          if (field.type === 'select' && (!field.options || !Array.isArray(field.options) || field.options.length === 0)) {
            result.errors.push(`自定义字段[${index}]是select类型但没有提供有效的options`);
          }
        });

        // 检查重复的字段key
        const fieldKeys = definition.customFields.map(f => f.key);
        const uniqueKeys = new Set(fieldKeys);
        if (uniqueKeys.size !== fieldKeys.length) {
          result.errors.push('存在重复的自定义字段key');
        }
      }
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * 批量验证变体卡牌
   */
  validateCards(cards: VariantCard[]): {
    totalCards: number;
    validCards: number;
    invalidCards: number;
    results: Array<{ cardId: string; result: VariantValidationResult }>;
  } {
    const results: Array<{ cardId: string; result: VariantValidationResult }> = [];
    let validCount = 0;

    cards.forEach(card => {
      const result = this.validateCard(card);
      results.push({
        cardId: card.id,
        result
      });

      if (result.isValid) {
        validCount++;
      }
    });

    return {
      totalCards: cards.length,
      validCards: validCount,
      invalidCards: cards.length - validCount,
      results
    };
  }

  /**
   * 添加自定义验证规则
   */
  addValidationRule(rule: VariantCardValidationRule): void {
    this.customRules.push(rule);
  }

  /**
   * 移除自定义验证规则
   */
  removeValidationRule(ruleName: string): boolean {
    const index = this.customRules.findIndex(rule => rule.name === ruleName);
    if (index >= 0) {
      this.customRules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 清除所有自定义验证规则
   */
  clearCustomRules(): void {
    this.customRules = [];
  }

  /**
   * 应用验证规则
   */
  private applyValidationRules(
    card: VariantCard, 
    rules: VariantCardValidationRule[], 
    result: VariantValidationResult
  ): void {
    rules.forEach(rule => {
      try {
        if (!rule.validate(card)) {
          result.errors.push(`${rule.name}: ${rule.errorMessage}`);
        }
      } catch (error) {
        result.errors.push(`${rule.name}: 验证规则执行失败 - ${error}`);
      }
    });
  }

  /**
   * 验证变体特定逻辑
   */
  private validateVariantSpecific(card: VariantCard, result: VariantValidationResult): void {
    const { variantInfo } = card;

    if (!variantInfo) {
      result.errors.push('变体卡牌必须包含variantInfo');
      return;
    }

    // 验证变体类型是否存在
    if (!this.registry.hasType(variantInfo.variantType)) {
      result.errors.push(`未注册的变体类型: ${variantInfo.variantType}`);
      return;
    }

    // 验证子类别
    if (variantInfo.subclass && !this.registry.validateSubclass(variantInfo.variantType, variantInfo.subclass)) {
      result.errors.push(`无效的子类别 "${variantInfo.subclass}" for type "${variantInfo.variantType}"`);
    }

    // 验证等级字段
    const typeDefinition = this.registry.getType(variantInfo.variantType);
    if (typeDefinition) {
      if (!typeDefinition.supportsLevel && card.等级 !== undefined) {
        result.warnings.push(`变体类型 "${variantInfo.variantType}" 不支持等级字段`);
      }

      // 验证自定义字段
      if (typeDefinition.customFields && variantInfo.customData) {
        typeDefinition.customFields.forEach(field => {
          const value = variantInfo.customData![field.key];
          
          if (field.required && (value === undefined || value === null || value === '')) {
            result.errors.push(`必需的自定义字段 "${field.label}" 缺失`);
          }

          if (value !== undefined) {
            if (!this.validateCustomFieldValue(value, field)) {
              result.errors.push(`自定义字段 "${field.label}" 值格式不正确`);
            }
          }
        });
      }
    }
  }

  /**
   * 验证自定义字段值
   */
  private validateCustomFieldValue(value: any, field: any): boolean {
    switch (field.type) {
      case 'text':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'select':
        return field.options && field.options.includes(value);
      default:
        return true;
    }
  }
}

/**
 * 变体卡牌验证器实例
 */
export const variantCardValidator = new VariantCardValidator();
