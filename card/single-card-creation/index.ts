/**
 * 单张卡牌创建功能 - 入口文件
 * 导出所有公共接口
 */

// 导出核心管理类
export { SingleCardManager } from './manager';

// 导出字段配置
export { 
  getFieldConfigsForCardType, 
  getSupportedCardTypes, 
  getCardTypeDisplayName 
} from './field-configs';

// 导出类型定义
export type { 
  FieldConfig, 
  FieldControlType, 
  PredefinedOption 
} from './field-configs';

export type { 
  FormData, 
  ValidationResult 
} from './manager';

// 导出工具函数
export { 
  getCardTypeOptions, 
  isSupportedCardType, 
  formatErrorMessage, 
  generatePlaceholder, 
  deepClone, 
  debounce 
} from './utils';
