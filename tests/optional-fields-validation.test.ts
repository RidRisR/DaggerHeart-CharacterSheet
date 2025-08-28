/**
 * 选填字段验证测试
 * 测试子类别、等级、简略信息字段的各种空值情况
 */

import { preprocessVariantFormat } from '../card/variant-format-preprocessor';
import { ImportData } from '../card/card-types';
import { CardTypeValidator, ValidationContext } from '../card/type-validators';

describe('选填字段验证测试', () => {

  it('应该允许完全省略选填字段', () => {
    const inputData: ImportData = {
      customFieldDefinitions: {
        variants: ['道具']
      },
      variant: [
        {
          id: 'minimal-001',
          名称: '最简单的道具',
          类型: '道具',
          效果: '简单效果'
          // 完全省略：子类别、等级、简略信息
        }
      ]
    };

    const processedData = preprocessVariantFormat(inputData);
    
    const context: ValidationContext = {
      customFields: {},
      variantTypes: processedData.customFieldDefinitions!.variantTypes!
    };
    
    const validationResult = CardTypeValidator.validateImportData(processedData, context);
    
    expect(validationResult.isValid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);
  });

  it('应该允许各种空值组合', () => {
    const inputData: ImportData = {
      customFieldDefinitions: {
        variants: ['物品']
      },
      variant: [
        {
          id: 'empty-001',
          名称: '空值测试1',
          类型: '物品',
          子类别: undefined,    // undefined
          等级: null,          // null
          简略信息: undefined, // undefined
          效果: '测试效果1'
        },
        {
          id: 'empty-002',
          名称: '空值测试2',
          类型: '物品',
          子类别: null,        // null
          等级: undefined,     // undefined
          简略信息: null,      // null
          效果: '测试效果2'
        },
        {
          id: 'empty-003',
          名称: '空值测试3',
          类型: '物品',
          子类别: '',          // 空字符串
          // 等级: 完全省略
          // 简略信息: 完全省略
          效果: '测试效果3'
        }
      ]
    };

    const processedData = preprocessVariantFormat(inputData);
    
    const context: ValidationContext = {
      customFields: {},
      variantTypes: processedData.customFieldDefinitions!.variantTypes!
    };
    
    const validationResult = CardTypeValidator.validateImportData(processedData, context);
    
    expect(validationResult.isValid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);
  });

  it('应该正确收集非空值', () => {
    const inputData: ImportData = {
      customFieldDefinitions: {
        variants: ['工具']
      },
      variant: [
        {
          id: 'valid-001',
          名称: '有效工具1',
          类型: '工具',
          子类别: '手动工具',
          等级: 3,
          简略信息: { item1: '耐用' },
          效果: '修理'
        },
        {
          id: 'empty-001',
          名称: '空值工具',
          类型: '工具',
          子类别: undefined,   // 应该被跳过
          等级: null,         // 应该被跳过
          简略信息: null,     // 应该被跳过
          效果: '简单效果'
        },
        {
          id: 'valid-002',
          名称: '有效工具2',
          类型: '工具',
          子类别: '电动工具',
          等级: 0,           // 0级是有效的
          简略信息: { item1: '高效' },
          效果: '快速修理'
        }
      ]
    };

    const processedData = preprocessVariantFormat(inputData);
    
    // 验证预处理器正确收集了非空值
    const variantTypes = processedData.customFieldDefinitions!.variantTypes!;
    expect(variantTypes['工具'].subclasses).toEqual(['手动工具', '电动工具']); // 按字母排序
    expect(variantTypes['工具'].levelRange).toEqual([0, 4]); // 包含0和3

    const context: ValidationContext = {
      customFields: {},
      variantTypes: variantTypes
    };
    
    const validationResult = CardTypeValidator.validateImportData(processedData, context);
    
    expect(validationResult.isValid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);
  });

  it('应该拒绝错误类型的值', () => {
    const inputData: ImportData = {
      customFieldDefinitions: {
        variants: ['装备']
      },
      variant: [
        {
          id: 'invalid-001',
          名称: '错误类型测试',
          类型: '装备',
          子类别: 123,         // 错误：应该是字符串
          等级: '五级',        // 错误：应该是数字
          简略信息: '不是对象', // 错误：应该是对象
          效果: '测试效果'
        }
      ]
    };

    const processedData = preprocessVariantFormat(inputData);
    
    const context: ValidationContext = {
      customFields: {},
      variantTypes: processedData.customFieldDefinitions!.variantTypes!
    };
    
    const validationResult = CardTypeValidator.validateImportData(processedData, context);
    
    expect(validationResult.isValid).toBe(false);
    expect(validationResult.errors.length).toBeGreaterThan(0);
    
    const errorMessages = validationResult.errors.map(e => e.message);
    expect(errorMessages.some(msg => msg.includes('子类别字段必须是字符串'))).toBe(true);
    expect(errorMessages.some(msg => msg.includes('等级字段必须是非负数字'))).toBe(true);
    expect(errorMessages.some(msg => msg.includes('简略信息字段必须是对象'))).toBe(true);
  });

  it('应该允许简略信息为空对象', () => {
    const inputData: ImportData = {
      customFieldDefinitions: {
        variants: ['材料']
      },
      variant: [
        {
          id: 'empty-obj-001',
          名称: '空对象测试',
          类型: '材料',
          简略信息: {},       // 空对象应该是有效的
          效果: '材料效果'
        }
      ]
    };

    const processedData = preprocessVariantFormat(inputData);
    
    const context: ValidationContext = {
      customFields: {},
      variantTypes: processedData.customFieldDefinitions!.variantTypes!
    };
    
    const validationResult = CardTypeValidator.validateImportData(processedData, context);
    
    expect(validationResult.isValid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);
  });

  it('应该拒绝简略信息为数组', () => {
    const inputData: ImportData = {
      customFieldDefinitions: {
        variants: ['消耗品']
      },
      variant: [
        {
          id: 'array-001',
          名称: '数组错误测试',
          类型: '消耗品',
          简略信息: ['错误', '数组'],  // 错误：数组不是对象
          效果: '消耗效果'
        }
      ]
    };

    const processedData = preprocessVariantFormat(inputData);
    
    const context: ValidationContext = {
      customFields: {},
      variantTypes: processedData.customFieldDefinitions!.variantTypes!
    };
    
    const validationResult = CardTypeValidator.validateImportData(processedData, context);
    
    expect(validationResult.isValid).toBe(false);
    expect(validationResult.errors.length).toBeGreaterThan(0);
    
    const errorMessage = validationResult.errors[0].message;
    expect(errorMessage).toContain('简略信息字段必须是对象');
  });

  it('应该正确处理混合的有效和空值', () => {
    const inputData: ImportData = {
      customFieldDefinitions: {
        variants: ['宝石']
      },
      variant: [
        {
          id: 'mixed-001',
          名称: '混合测试1',
          类型: '宝石',
          子类别: '红宝石',   // 有效值
          等级: undefined,    // 空值
          简略信息: { item1: '闪亮' }, // 有效值
          效果: '增强属性'
        },
        {
          id: 'mixed-002',
          名称: '混合测试2',
          类型: '宝石',
          子类别: null,      // 空值
          等级: 5,           // 有效值
          简略信息: null,    // 空值
          效果: '魔法效果'
        }
      ]
    };

    const processedData = preprocessVariantFormat(inputData);
    
    // 验证只收集了非空值
    const variantTypes = processedData.customFieldDefinitions!.variantTypes!;
    expect(variantTypes['宝石'].subclasses).toEqual(['红宝石']); // 只收集了非空的子类别
    expect(variantTypes['宝石'].levelRange).toEqual([5, 6]); // 只收集了非空的等级

    const context: ValidationContext = {
      customFields: {},
      variantTypes: variantTypes
    };
    
    const validationResult = CardTypeValidator.validateImportData(processedData, context);
    
    expect(validationResult.isValid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);
  });

});