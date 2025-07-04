/**
 * 单张卡牌创建功能 - 工具函数
 * 提供各种辅助工具函数
 */

import { CardType } from "@/card/card-types";
import { getSupportedCardTypes, getCardTypeDisplayName } from "./field-configs";

/**
 * 获取支持创建的卡牌类型选项
 */
export function getCardTypeOptions() {
  return getSupportedCardTypes().map(type => ({
    value: type,
    label: getCardTypeDisplayName(type)
  }));
}

/**
 * 检查是否为支持的卡牌类型
 */
export function isSupportedCardType(cardType: string): cardType is CardType {
  return getSupportedCardTypes().includes(cardType as CardType);
}

/**
 * 格式化错误消息
 */
export function formatErrorMessage(error: string): string {
  return error.replace(/^\w/, char => char.toUpperCase());
}

/**
 * 生成占位符文本
 */
export function generatePlaceholder(fieldName: string, cardType: CardType): string {
  const placeholders: Record<string, Record<CardType, string>> = {
    name: {
      [CardType.Profession]: '如：神秘法师',
      [CardType.Ancestry]: '如：龙血觉醒',
      [CardType.Community]: '如：魔法学院',
      [CardType.Subclass]: '如：奥术专精',
      [CardType.Domain]: '如：火球术',
      [CardType.Variant]: ''
    },
    description: {
      [CardType.Profession]: '掌握星辰之力的强大法师...',
      [CardType.Ancestry]: '体内流淌着古老巨龙的血脉...',
      [CardType.Community]: '致力于魔法研究的学术组织...',
      [CardType.Subclass]: '专精于奥术魔法的研究者...',
      [CardType.Domain]: '投掷一颗火球，对范围内的敌人造成伤害...',
      [CardType.Variant]: ''
    }
  };

  return placeholders[fieldName]?.[cardType] || '';
}

/**
 * 深度克隆对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }

  return obj;
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
