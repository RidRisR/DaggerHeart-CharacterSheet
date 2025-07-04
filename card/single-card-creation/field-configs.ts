/**
 * 单张卡牌创建功能 - 字段配置定义
 * 定义每种卡牌类型的表单字段配置
 */

import { CardType } from "@/card/card-types";
import { 
  getProfessionCardNames, 
  getAncestryCardNames, 
  getCommunityCardNames, 
  getDomainCardNames, 
  ATTRIBUTE_CLASS_NAMES, 
  SUBCLASS_LEVEL_NAMES 
} from "@/card/card-predefined-field";

// 字段控件类型定义
export type FieldControlType = 'text' | 'textarea' | 'number' | 'select' | 'combobox';

// 预设选项接口
export interface PredefinedOption {
  value: string;
  label: string;
}

// 字段配置接口
export interface FieldConfig {
  name: string;
  label: string;
  type: FieldControlType;
  required: boolean;
  predefined?: PredefinedOption[]; // 预设选项
  placeholder?: string;
  description?: string; // 字段说明
}

// 获取职业卡牌字段配置
function getProfessionFieldConfigs(): FieldConfig[] {
  return [
    {
      name: 'name',
      label: '职业名称',
      type: 'text',
      required: true,
      placeholder: '请输入职业名称',
      description: '职业的名称，如"神秘法师"、"龙骑士"等'
    },
    {
      name: 'description',
      label: '简介',
      type: 'textarea',
      required: true,
      placeholder: '请输入职业简介',
      description: '职业的简要介绍'
    },
    {
      name: 'domain1',
      label: '领域1',
      type: 'combobox',
      required: true,
      predefined: getDomainCardNames().map(value => ({ value, label: value })),
      description: '职业的第一个领域'
    },
    {
      name: 'domain2',
      label: '领域2',
      type: 'combobox',
      required: true,
      predefined: getDomainCardNames().map(value => ({ value, label: value })),
      description: '职业的第二个领域'
    },
    {
      name: 'startingHP',
      label: '起始生命',
      type: 'number',
      required: true,
      placeholder: '150',
      description: '职业的起始生命值'
    },
    {
      name: 'startingEvasion',
      label: '起始闪避',
      type: 'number',
      required: true,
      placeholder: '120',
      description: '职业的起始闪避值'
    },
    {
      name: 'startingItems',
      label: '起始物品',
      type: 'textarea',
      required: true,
      placeholder: '法师法杖、魔法长袍、法术书',
      description: '职业的起始装备'
    },
    {
      name: 'hopeFeature',
      label: '希望特性',
      type: 'textarea',
      required: true,
      placeholder: '*__博学多识：__* 对神秘知识和古老传说有深入理解',
      description: '职业的希望特性'
    },
    {
      name: 'classFeature',
      label: '职业特性',
      type: 'textarea',
      required: true,
      placeholder: '*__星辰之力：__* 你可以从星空中汲取力量...',
      description: '职业的核心特性能力'
    }
  ];
}

// 获取血统卡牌字段配置
function getAncestryFieldConfigs(): FieldConfig[] {
  return [
    {
      name: 'name',
      label: '血统名称',
      type: 'text',
      required: true,
      placeholder: '请输入血统名称',
      description: '血统特性的名称，如"龙血觉醒"'
    },
    {
      name: 'ancestry',
      label: '种族',
      type: 'combobox',
      required: true,
      predefined: getAncestryCardNames().map(value => ({ value, label: value })),
      description: '所属的种族类别'
    },
    {
      name: 'description',
      label: '简介',
      type: 'textarea',
      required: true,
      placeholder: '请输入简介',
      description: '血统的简要介绍'
    },
    {
      name: 'effect',
      label: '效果',
      type: 'textarea',
      required: true,
      placeholder: '*__龙血传承：__* 你对**火焰伤害**有抗性...',
      description: '血统的具体效果和能力'
    },
    {
      name: 'category',
      label: '类别',
      type: 'select',
      required: true,
      predefined: [
        { value: '1', label: '类别1' },
        { value: '2', label: '类别2' }
      ],
      description: '血统的类别分组'
    }
  ];
}

// 获取社群卡牌字段配置
function getCommunityFieldConfigs(): FieldConfig[] {
  return [
    {
      name: 'name',
      label: '社群名称',
      type: 'text',
      required: true,
      placeholder: '请输入社群名称',
      description: '社群的名称，如"魔法学院"'
    },
    {
      name: 'trait',
      label: '特性',
      type: 'text',
      required: true,
      placeholder: '请输入社群特性',
      description: '社群的核心特性'
    },
    {
      name: 'summary',
      label: '简介',
      type: 'textarea',
      required: true,
      placeholder: '请输入简介',
      description: '社群的简要介绍'
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      required: true,
      placeholder: '请输入详细描述',
      description: '社群的详细描述和背景'
    }
  ];
}

// 获取子职业卡牌字段配置
function getSubclassFieldConfigs(): FieldConfig[] {
  return [
    {
      name: 'name',
      label: '子职业名称',
      type: 'text',
      required: true,
      placeholder: '请输入子职业名称',
      description: '子职业的名称'
    },
    {
      name: 'mainClass',
      label: '主职',
      type: 'combobox',
      required: true,
      predefined: getProfessionCardNames().map(value => ({ value, label: value })),
      description: '所属的主职业'
    },
    {
      name: 'subclassName',
      label: '子职业',
      type: 'text',
      required: true,
      placeholder: '请输入子职业分类',
      description: '子职业的分类名称'
    },
    {
      name: 'level',
      label: '等级',
      type: 'select',
      required: true,
      predefined: SUBCLASS_LEVEL_NAMES.map(value => ({ value, label: value })),
      description: '子职业的等级'
    },
    {
      name: 'spellcasting',
      label: '施法属性',
      type: 'select',
      required: true,
      predefined: ATTRIBUTE_CLASS_NAMES.map(value => ({ value, label: value })),
      description: '施法所使用的属性'
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      required: true,
      placeholder: '请输入子职业描述',
      description: '子职业的详细描述和能力'
    }
  ];
}

// 获取领域卡牌字段配置
function getDomainFieldConfigs(): FieldConfig[] {
  return [
    {
      name: 'name',
      label: '法术名称',
      type: 'text',
      required: true,
      placeholder: '请输入法术名称',
      description: '领域法术的名称'
    },
    {
      name: 'domain',
      label: '领域',
      type: 'combobox',
      required: true,
      predefined: getDomainCardNames().map(value => ({ value, label: value })),
      description: '所属的领域类别'
    },
    {
      name: 'level',
      label: '等级',
      type: 'number',
      required: true,
      placeholder: '1',
      description: '法术的等级'
    },
    {
      name: 'attribute',
      label: '属性',
      type: 'select',
      required: true,
      predefined: ATTRIBUTE_CLASS_NAMES.filter(attr => attr !== '不可施法').map(value => ({ value, label: value })),
      description: '施法使用的属性'
    },
    {
      name: 'recall',
      label: '回想',
      type: 'number',
      required: true,
      placeholder: '0',
      description: '法术的回想值'
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      required: true,
      placeholder: '请输入法术效果描述',
      description: '法术的详细效果描述'
    }
  ];
}

// 主函数：根据卡牌类型获取字段配置
export function getFieldConfigsForCardType(cardType: CardType): FieldConfig[] {
  switch (cardType) {
    case CardType.Profession:
      return getProfessionFieldConfigs();
    case CardType.Ancestry:
      return getAncestryFieldConfigs();
    case CardType.Community:
      return getCommunityFieldConfigs();
    case CardType.Subclass:
      return getSubclassFieldConfigs();
    case CardType.Domain:
      return getDomainFieldConfigs();
    default:
      return [];
  }
}

// 获取支持的卡牌类型列表
export function getSupportedCardTypes(): CardType[] {
  return [
    CardType.Profession,
    CardType.Ancestry,
    CardType.Community,
    CardType.Subclass,
    CardType.Domain
  ];
}

// 获取卡牌类型的显示名称
export function getCardTypeDisplayName(cardType: CardType): string {
  const displayNames: Record<CardType, string> = {
    [CardType.Profession]: '职业',
    [CardType.Ancestry]: '血统',
    [CardType.Community]: '社群',
    [CardType.Subclass]: '子职业',
    [CardType.Domain]: '领域法术',
    [CardType.Variant]: '变体' // 暂不支持变体卡牌的创建
  };
  
  return displayNames[cardType] || cardType;
}
