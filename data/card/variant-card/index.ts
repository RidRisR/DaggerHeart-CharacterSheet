/**
 * Variant Card System Entry Point
 * 变体卡牌系统入口文件 - 统一导出所有变体卡牌相关功能
 */

// 核心类型定义
export type {
  VariantCard,
  VariantCardInfo,
  VariantCardValidationRule,
  VariantConversionOptions
} from './variant-types';

export {
  isVariantCard,
  createVariantCard,
  extractBaseCard,
  defaultVariantValidationRules
} from './variant-types';

// 类型注册表
export type { VariantTypeDefinition } from './variant-registry';
export { VariantTypeRegistry } from './variant-registry';

// 转换器
export { VariantCardConverter, variantCardConverter } from './convert';

// 验证器
export type { VariantValidationResult } from './validator';
export { VariantCardValidator, variantCardValidator } from './validator';

// 便捷函数
export function getVariantRegistry(): VariantTypeRegistry {
  return VariantTypeRegistry.getInstance();
}

export function getVariantConverter(): VariantCardConverter {
  return variantCardConverter;
}

export function getVariantValidator(): VariantCardValidator {
  return variantCardValidator;
}
