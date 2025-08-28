/**
 * Variant Format Preprocessor Tests
 * 测试新旧格式的转换逻辑
 */

import { preprocessVariantFormat } from '../card/variant-format-preprocessor';
import { ImportData } from '../card/card-types';

describe('Variant Format Preprocessor', () => {
  
  describe('基础转换功能', () => {
    
    it('应该将新的简化格式转换为旧的复杂格式', () => {
      const inputData: ImportData = {
        name: 'Test Pack',
        customFieldDefinitions: {
          variants: ['食物', '武器', '药剂']
        },
        variant: [
          {
            id: 'food-001',
            名称: '精灵蜜酒',
            类型: '食物',
            子类别: '饮料',
            等级: 3,
            效果: '恢复2点生命'
          },
          {
            id: 'weapon-001',
            名称: '钢剑',
            类型: '武器',
            子类别: '单手剑',
            等级: 5,
            效果: '+2攻击力'
          }
        ]
      };

      const result = preprocessVariantFormat(inputData);

      // 验证格式转换
      expect(result.customFieldDefinitions?.variants).toBeUndefined();
      expect(result.customFieldDefinitions?.variantTypes).toBeDefined();
      
      const variantTypes = result.customFieldDefinitions!.variantTypes!;
      
      // 验证转换结果
      expect(variantTypes).toHaveProperty('食物');
      expect(variantTypes).toHaveProperty('武器');
      expect(variantTypes).toHaveProperty('药剂');
      
      // 验证收集的信息
      expect(variantTypes['食物'].subclasses).toContain('饮料');
      expect(variantTypes['武器'].subclasses).toContain('单手剑');
      expect(variantTypes['食物'].levelRange).toEqual([3, 4]);
      expect(variantTypes['武器'].levelRange).toEqual([5, 6]);
      expect(variantTypes['药剂'].subclasses).toEqual([]); // 没有使用
    });

    it('应该处理空数据', () => {
      const inputData: ImportData = {
        customFieldDefinitions: {
          variants: ['测试类型']
        }
        // 没有 variant 数组
      };

      const result = preprocessVariantFormat(inputData);

      expect(result.customFieldDefinitions?.variantTypes).toBeDefined();
      const variantTypes = result.customFieldDefinitions!.variantTypes!;
      expect(variantTypes['测试类型'].subclasses).toEqual([]);
      expect(variantTypes['测试类型'].levelRange).toEqual([1, 10]); // 默认范围
    });

  });

  describe('边界情况处理', () => {
    
    it('应该正确处理各种空值', () => {
      const inputData: ImportData = {
        customFieldDefinitions: {
          variants: ['食物']
        },
        variant: [
          {
            id: 'test-001',
            名称: '测试物品',
            类型: '食物',
            子类别: undefined, // 空值
            等级: null,        // 空值
            效果: '测试效果'
          },
          {
            id: 'test-002',
            名称: '测试物品2',
            类型: '食物',
            子类别: '',       // 空字符串
            等级: 0,         // 0应该是有效值
            效果: '测试效果2'
          }
        ]
      };

      const result = preprocessVariantFormat(inputData);
      const variantTypes = result.customFieldDefinitions!.variantTypes!;
      
      // 空值应该被跳过，0级应该被收集
      expect(variantTypes['食物'].subclasses).toEqual([]);
      expect(variantTypes['食物'].levelRange).toEqual([0, 1]); // 只有0级
    });

    it('应该过滤无效的类型', () => {
      const inputData: ImportData = {
        customFieldDefinitions: {
          variants: ['食物'] // 只允许食物类型
        },
        variant: [
          {
            id: 'valid-001',
            名称: '苹果',
            类型: '食物',  // 有效类型
            效果: '恢复生命'
          },
          {
            id: 'invalid-001',
            名称: '剑',
            类型: '武器',  // 无效类型，不在预定义列表中
            效果: '攻击'
          }
        ]
      };

      const result = preprocessVariantFormat(inputData);
      const variantTypes = result.customFieldDefinitions!.variantTypes!;
      
      // 只应该包含食物类型，武器类型应该被忽略
      expect(variantTypes).toHaveProperty('食物');
      expect(Object.keys(variantTypes)).toHaveLength(1);
    });

  });

  describe('向后兼容性', () => {

    it('应该跳过没有新格式的数据', () => {
      const inputData: ImportData = {
        customFieldDefinitions: {
          // 没有 variants 字段
          profession: ['战士', '法师']
        }
      };

      const result = preprocessVariantFormat(inputData);
      
      // 应该原样返回，不做任何修改
      expect(result).toEqual(inputData);
    });

    it('应该优先使用新格式，删除旧格式', () => {
      const inputData: ImportData = {
        customFieldDefinitions: {
          variants: ['食物'],           // 新格式
          variantTypes: {               // 旧格式，应该被删除
            '武器': {
              subclasses: ['剑'],
              levelRange: [1, 10] as [number, number]
            }
          }
        }
      };

      const result = preprocessVariantFormat(inputData);
      
      // 新格式应该覆盖旧格式
      expect(result.customFieldDefinitions?.variants).toBeUndefined();
      expect(result.customFieldDefinitions?.variantTypes).toBeDefined();
      expect(result.customFieldDefinitions?.variantTypes).toHaveProperty('食物');
      expect(result.customFieldDefinitions?.variantTypes).not.toHaveProperty('武器');
    });

    it('应该处理完全空的数据', () => {
      const inputData: ImportData = {};

      const result = preprocessVariantFormat(inputData);
      
      // 应该原样返回
      expect(result).toEqual(inputData);
    });

  });

  describe('信息收集精度', () => {

    it('应该正确去重和排序子类别', () => {
      const inputData: ImportData = {
        customFieldDefinitions: {
          variants: ['武器']
        },
        variant: [
          {
            id: 'weapon-001',
            名称: '长剑',
            类型: '武器',
            子类别: '剑',
            效果: '攻击'
          },
          {
            id: 'weapon-002',
            名称: '短剑',
            类型: '武器',
            子类别: '剑',  // 重复的子类别
            效果: '攻击'
          },
          {
            id: 'weapon-003',
            名称: '战斧',
            类型: '武器',
            子类别: '斧',
            效果: '攻击'
          }
        ]
      };

      const result = preprocessVariantFormat(inputData);
      const variantTypes = result.customFieldDefinitions!.variantTypes!;
      
      // 应该去重并排序
      expect(variantTypes['武器'].subclasses).toEqual(['剑', '斧']); // 中文字符排序
      expect(variantTypes['武器'].subclasses).toHaveLength(2);
    });

    it('应该正确计算等级范围', () => {
      const inputData: ImportData = {
        customFieldDefinitions: {
          variants: ['装备']
        },
        variant: [
          {
            id: 'item-001',
            名称: '新手装备',
            类型: '装备',
            等级: 1,
            效果: '基础'
          },
          {
            id: 'item-002',
            名称: '高级装备',
            类型: '装备',
            等级: 10,
            效果: '强力'
          },
          {
            id: 'item-003',
            名称: '中级装备',
            类型: '装备',
            等级: 5,
            效果: '中等'
          }
        ]
      };

      const result = preprocessVariantFormat(inputData);
      const variantTypes = result.customFieldDefinitions!.variantTypes!;
      
      // 等级范围应该是最小值到最大值+1
      expect(variantTypes['装备'].levelRange).toEqual([1, 11]);
    });

  });

});