/**
 * Variant Card Types
 * 变体卡牌类型定义和接口
 */

import { StandardCard } from '../card-types';

/**
 * 变体卡牌扩展信息
 */
export interface VariantCardInfo {
  /** 变体类型ID（对应 类型 字段） */
  variantType: string;
  /** 子类别（可选） */
  subclass?: string;
  /** 自定义字段数据 */
  customData?: Record<string, any>;
}

/**
 * 变体卡牌接口
 * 继承标准卡牌，添加变体特定信息
 */
export interface VariantCard extends StandardCard {
  type: 'variant';
  /** 变体信息 */
  variantInfo: VariantCardInfo;
}

/**
 * 检查卡牌是否为变体卡牌
 */
export function isVariantCard(card: StandardCard): card is VariantCard {
  return card.type === 'variant';
}

/**
 * 创建变体卡牌
 */
export function createVariantCard(
  baseCard: Omit<StandardCard, 'type'>,
  variantInfo: VariantCardInfo
): VariantCard {
  return {
    ...baseCard,
    type: 'variant',
    variantInfo
  };
}

/**
 * 从变体卡牌提取基础信息
 */
export function extractBaseCard(variantCard: VariantCard): StandardCard {
  const { variantInfo, ...baseCard } = variantCard;
  return {
    ...baseCard,
    type: variantCard.variantInfo.variantType as any // 转换为实际类型
  };
}

/**
 * 变体卡牌验证规则
 */
export interface VariantCardValidationRule {
  /** 规则名称 */
  name: string;
  /** 验证函数 */
  validate: (card: VariantCard) => boolean;
  /** 错误消息 */
  errorMessage: string;
}

/**
 * 默认变体卡牌验证规则
 */
export const defaultVariantValidationRules: VariantCardValidationRule[] = [
  {
    name: 'hasVariantType',
    validate: (card) => !!card.variantInfo?.variantType,
    errorMessage: '变体卡牌必须指定变体类型'
  },
  {
    name: 'hasValidId',
    validate: (card) => !!card.id && card.id.trim().length > 0,
    errorMessage: '变体卡牌必须有有效的ID'
  },
  {
    name: 'hasValidName',
    validate: (card) => !!card.名称 && card.名称.trim().length > 0,
    errorMessage: '变体卡牌必须有有效的名称'
  }
];

/**
 * 变体卡牌转换选项
 */
export interface VariantConversionOptions {
  /** 是否保留原始类型信息 */
  preserveOriginalType?: boolean;
  /** 是否验证转换结果 */
  validateResult?: boolean;
  /** 自定义字段映射 */
  customFieldMapping?: Record<string, string>;
}
