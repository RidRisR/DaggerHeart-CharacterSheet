/**
 * Variant Format Preprocessor
 * 预处理新的简化变体格式，转换为系统内部的复杂格式
 */

import { ImportData, VariantTypeDefinition } from './card-types';
import { RawVariantCard } from './variant-card/convert';

/**
 * 预处理导入数据，将新的简化变体格式转换为旧的复杂格式
 * 
 * @param importData 原始导入数据
 * @returns 处理后的导入数据（旧格式）
 */
export function preprocessVariantFormat(importData: ImportData): ImportData {
  // 如果没有自定义字段定义，直接返回
  if (!importData.customFieldDefinitions) {
    return importData;
  }

  const customFields = importData.customFieldDefinitions;
  
  // 检查是否存在新的简化格式 variants 数组
  const variants = customFields.variants as string[] | undefined;
  
  // 如果没有新格式，直接返回
  if (!variants || !Array.isArray(variants)) {
    return importData;
  }

  console.log('[Preprocessor] 检测到新格式 variants 数组:', variants);

  // 如果同时存在新旧格式，优先使用新格式，删除旧格式
  if (customFields.variantTypes) {
    console.log('[Preprocessor] 同时存在新旧格式，删除旧格式 variantTypes');
    delete customFields.variantTypes;
  }

  // 从变体卡牌中收集信息
  const collectedInfo = collectVariantInfoFromCards(importData.variant || [], variants);

  // 构建旧格式的 variantTypes 对象
  const variantTypes: Record<string, VariantTypeDefinition> = {};

  for (const variantType of variants) {
    const info = collectedInfo[variantType];
    
    variantTypes[variantType] = {
      description: `${variantType}类物品`, // 默认描述
      subclasses: info?.subclasses || [],
      levelRange: info?.levelRange || [1, 10] // 默认等级范围
    };
  }

  // 替换为旧格式
  customFields.variantTypes = variantTypes;
  
  // 删除新格式字段
  delete (customFields as any).variants;

  console.log('[Preprocessor] 转换完成，生成的 variantTypes:', variantTypes);

  return {
    ...importData,
    customFieldDefinitions: customFields
  };
}

/**
 * 从变体卡牌中收集信息
 */
function collectVariantInfoFromCards(
  variantCards: RawVariantCard[], 
  validTypes: string[]
): Record<string, { subclasses: string[], levelRange: [number, number] }> {
  const collected: Record<string, { 
    subclasses: Set<string>, 
    levels: number[] 
  }> = {};

  // 初始化所有类型
  for (const type of validTypes) {
    collected[type] = {
      subclasses: new Set<string>(),
      levels: []
    };
  }

  // 收集信息
  for (const card of variantCards) {
    const type = card.类型;
    
    if (!type || !validTypes.includes(type)) {
      continue; // 跳过无效类型
    }

    const info = collected[type];
    
    // 收集子类别（跳过空值）
    if (isValidValue(card.子类别)) {
      info.subclasses.add(card.子类别);
    }
    
    // 收集等级（0是有效值）
    if (isValidLevel(card.等级)) {
      info.levels.push(card.等级);
    }
  }

  // 转换为最终格式
  const result: Record<string, { subclasses: string[], levelRange: [number, number] }> = {};

  for (const [type, info] of Object.entries(collected)) {
    const subclasses = Array.from(info.subclasses).sort();
    
    let levelRange: [number, number] = [1, 10]; // 默认范围
    if (info.levels.length > 0) {
      const minLevel = Math.min(...info.levels);
      const maxLevel = Math.max(...info.levels);
      levelRange = [Math.max(0, minLevel), maxLevel + 1]; // maxLevel + 1
    }
    
    result[type] = {
      subclasses,
      levelRange
    };
  }

  return result;
}

/**
 * 检查值是否有效（非空、非undefined、非null）
 */
function isValidValue(value: any): value is string {
  return value !== null && value !== undefined && value !== "" && typeof value === "string";
}

/**
 * 检查等级是否有效（0是有效的！）
 */
function isValidLevel(value: any): value is number {
  return typeof value === "number" && !isNaN(value);
}