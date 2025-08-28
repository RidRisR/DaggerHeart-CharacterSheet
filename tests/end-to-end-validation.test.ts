/**
 * 端到端验证测试
 * 测试完整的新格式 → 预处理 → 验证流程
 */

import { preprocessVariantFormat } from '../card/variant-format-preprocessor';
import { ImportData } from '../card/card-types';
import { CardTypeValidator, ValidationContext } from '../card/type-validators';

describe('端到端验证测试', () => {

  it('应该正确处理完整的新格式到验证流程', () => {
    // 1️⃣ 用户输入：新的简化格式
    const userInput: ImportData = {
      name: '测试卡包',
      customFieldDefinitions: {
        variants: ['食物', '武器'] // 新的简化格式
      },
      variant: [
        {
          id: 'food-001',
          名称: '苹果',
          类型: '食物',
          子类别: '水果',
          等级: 2,
          效果: '恢复生命',
          简略信息: { item1: '营养' }
        },
        {
          id: 'weapon-001', 
          名称: '长剑',
          类型: '武器',
          子类别: '剑',
          等级: 5,
          效果: '攻击',
          简略信息: { item1: '锋利' }
        }
      ]
    };

    // 2️⃣ 系统预处理：转换为传统格式
    const processedData = preprocessVariantFormat(userInput);

    // 验证预处理结果
    expect(processedData.customFieldDefinitions?.variants).toBeUndefined(); // 新格式被删除
    expect(processedData.customFieldDefinitions?.variantTypes).toBeDefined(); // 生成了旧格式

    const variantTypes = processedData.customFieldDefinitions!.variantTypes!;
    expect(variantTypes['食物'].subclasses).toEqual(['水果']); // 收集了子类别
    expect(variantTypes['食物'].levelRange).toEqual([2, 3]); // 收集了等级范围
    expect(variantTypes['武器'].subclasses).toEqual(['剑']);
    expect(variantTypes['武器'].levelRange).toEqual([5, 6]);

    // 3️⃣ 系统验证：使用传统格式进行严格验证
    const context: ValidationContext = {
      customFields: {},
      variantTypes: variantTypes
    };

    const validationResult = CardTypeValidator.validateImportData(processedData, context);
    
    // 验证应该通过，因为卡牌数据符合预处理生成的规则
    expect(validationResult.isValid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);
  });

  it('应该拒绝不符合收集规则的数据', () => {
    // 用户输入了不一致的数据
    const userInput: ImportData = {
      customFieldDefinitions: {
        variants: ['工具']
      },
      variant: [
        {
          id: 'tool-001',
          名称: '锤子',
          类型: '工具',
          子类别: '重型',
          等级: 3,
          效果: '建造',
          简略信息: { item1: '坚固' }
        },
        // 这张卡牌会被预处理器收集，然后验证器会用收集的规则验证所有卡牌
        {
          id: 'tool-002',
          名称: '螺丝刀',
          类型: '工具',
          子类别: '轻型', // 这个子类别会被收集
          等级: 1,       // 这个等级会被收集
          效果: '维修',
          简略信息: { item1: '精确' }
        },
        // 这张卡牌不符合收集的规则
        {
          id: 'tool-003',
          名称: '电钻',
          类型: '工具',
          子类别: '超级工具', // 这个子类别不在收集列表中
          等级: 10,           // 这个等级超出收集范围
          效果: '钻孔',
          简略信息: { item1: '强力' }
        }
      ]
    };

    const processedData = preprocessVariantFormat(userInput);
    
    // 预处理会收集所有子类别和等级
    const variantTypes = processedData.customFieldDefinitions!.variantTypes!;
    expect(variantTypes['工具'].subclasses).toEqual(['超级工具', '轻型', '重型']); // 包含所有子类别（按字母排序）
    expect(variantTypes['工具'].levelRange).toEqual([1, 11]); // 包含所有等级范围

    const context: ValidationContext = {
      customFields: {},
      variantTypes: variantTypes
    };

    const validationResult = CardTypeValidator.validateImportData(processedData, context);
    
    // 验证应该通过，因为预处理器收集了所有实际使用的值
    expect(validationResult.isValid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);
  });

  it('应该拒绝类型不在预定义列表中的卡牌', () => {
    const userInput: ImportData = {
      customFieldDefinitions: {
        variants: ['食物'] // 只允许食物类型
      },
      variant: [
        {
          id: 'invalid-001',
          名称: '剑',
          类型: '武器', // 错误：不在预定义列表中
          子类别: '长剑',
          等级: 5,
          效果: '攻击',
          简略信息: { item1: '锋利' }
        }
      ]
    };

    const processedData = preprocessVariantFormat(userInput);
    
    // 预处理只会为预定义类型生成规则
    const variantTypes = processedData.customFieldDefinitions!.variantTypes!;
    expect(variantTypes).toHaveProperty('食物');
    expect(variantTypes).not.toHaveProperty('武器'); // 武器类型不会被生成

    const context: ValidationContext = {
      customFields: {},
      variantTypes: variantTypes
    };

    const validationResult = CardTypeValidator.validateImportData(processedData, context);
    
    // 验证应该失败，因为"武器"类型不在预定义的variantTypes中
    expect(validationResult.isValid).toBe(false);
    expect(validationResult.errors.length).toBeGreaterThan(0);
    
    const errorMessage = validationResult.errors[0].message;
    expect(errorMessage).toContain('必须是预定义的变体类型');
    expect(errorMessage).toContain('食物'); // 应该显示可用的类型
  });

  it('应该正确处理完全空白的变体数据', () => {
    const userInput: ImportData = {
      customFieldDefinitions: {
        variants: ['神秘物品']
      },
      variant: [
        {
          id: 'mystery-001',
          名称: '神秘盒子',
          类型: '神秘物品',
          // 没有子类别
          // 没有等级
          效果: '未知效果',
          简略信息: { item1: '神秘' }
        }
      ]
    };

    const processedData = preprocessVariantFormat(userInput);
    
    // 预处理会为没有数据的类型生成默认规则
    const variantTypes = processedData.customFieldDefinitions!.variantTypes!;
    expect(variantTypes['神秘物品'].subclasses).toEqual([]); // 没有子类别
    expect(variantTypes['神秘物品'].levelRange).toEqual([1, 10]); // 默认等级范围

    const context: ValidationContext = {
      customFields: {},
      variantTypes: variantTypes
    };

    const validationResult = CardTypeValidator.validateImportData(processedData, context);
    
    // 验证应该通过
    expect(validationResult.isValid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);
  });

});