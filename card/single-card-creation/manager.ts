/**
 * 单张卡牌创建功能 - 核心管理类
 * 负责表单数据验证、转换和卡牌生成
 */

import { CardType, StandardCard } from "@/card/card-types";
import { getFieldConfigsForCardType, FieldConfig } from "./field-configs";

// 导入转换器
import { professionCardConverter } from "@/card/profession-card/convert";
import { ancestryCardConverter } from "@/card/ancestry-card/convert";
import { communityCardConverter } from "@/card/community-card/convert";
import { subclassCardConverter } from "@/card/subclass-card/convert";
import { domainCardConverter } from "@/card/domain-card/convert";

// 导入原始卡牌接口
import type { ProfessionCard } from "@/card/profession-card/convert";
import type { AncestryCard } from "@/card/ancestry-card/convert";
import type { CommunityCard } from "@/card/community-card/convert";
import type { SubClassCard } from "@/card/subclass-card/convert";
import type { DomainCard } from "@/card/domain-card/convert";

// 表单数据接口（扁平化的用户输入）
export interface FormData {
  [key: string]: string | number | boolean;
}

// 验证结果接口
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  fieldErrors: Record<string, string>;
}

/**
 * 单张卡牌创建管理器
 */
export class SingleCardManager {
  
  /**
   * 根据卡牌类型获取字段配置
   */
  static getFieldsForCardType(cardType: CardType): FieldConfig[] {
    return getFieldConfigsForCardType(cardType);
  }

  /**
   * 验证表单数据
   */
  static validateFormData(formData: FormData, cardType: CardType): ValidationResult {
    const errors: string[] = [];
    const fieldErrors: Record<string, string> = {};
    const fieldConfigs = getFieldConfigsForCardType(cardType);

    // 验证必填字段
    for (const config of fieldConfigs) {
      if (config.required) {
        const value = formData[config.name];
        if (value === undefined || value === null || value === '') {
          const error = `${config.label}是必填字段`;
          errors.push(error);
          fieldErrors[config.name] = error;
        }
      }

      // 验证数字类型字段
      if (config.type === 'number' && formData[config.name] !== undefined) {
        const value = formData[config.name];
        if (typeof value === 'string' && value !== '') {
          const numValue = Number(value);
          if (isNaN(numValue)) {
            const error = `${config.label}必须是有效的数字`;
            errors.push(error);
            fieldErrors[config.name] = error;
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      fieldErrors
    };
  }

  /**
   * 生成唯一ID
   */
  static generateUniqueId(): string {
    return `single-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 将表单数据转换为StandardCard
   */
  static createStandardCardFromCustomInput(formData: FormData, cardType: CardType): StandardCard {
    const id = this.generateUniqueId();
    
    try {
      let standardCard: StandardCard;
      
      switch (cardType) {
        case CardType.Profession:
          standardCard = this.createProfessionCard(formData, id);
          break;
        case CardType.Ancestry:
          standardCard = this.createAncestryCard(formData, id);
          break;
        case CardType.Community:
          standardCard = this.createCommunityCard(formData, id);
          break;
        case CardType.Subclass:
          standardCard = this.createSubclassCard(formData, id);
          break;
        case CardType.Domain:
          standardCard = this.createDomainCard(formData, id);
          break;
        default:
          throw new Error(`不支持的卡牌类型: ${cardType}`);
      }

      // 设置source标识
      (standardCard as any).source = 'single';
      
      return standardCard;
    } catch (error) {
      console.error('创建StandardCard失败:', error);
      throw new Error(`创建卡牌失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 创建职业卡牌
   */
  private static createProfessionCard(formData: FormData, id: string): StandardCard {
    const rawCard: ProfessionCard = {
      id,
      名称: formData.name as string,
      简介: formData.description as string,
      imageUrl: '', // 暂时不支持图片上传
      领域1: formData.domain1 as string,
      领域2: formData.domain2 as string,
      起始生命: Number(formData.startingHP),
      起始闪避: Number(formData.startingEvasion),
      起始物品: formData.startingItems as string,
      希望特性: formData.hopeFeature as string,
      职业特性: formData.classFeature as string
    };

    return professionCardConverter.toStandard(rawCard);
  }

  /**
   * 创建血统卡牌
   */
  private static createAncestryCard(formData: FormData, id: string): StandardCard {
    const rawCard: AncestryCard = {
      id,
      名称: formData.name as string,
      种族: formData.ancestry as string,
      简介: formData.description as string,
      效果: formData.effect as string,
      类别: Number(formData.category),
      imageURL: '' // 暂时不支持图片上传
    };

    return ancestryCardConverter.toStandard(rawCard);
  }

  /**
   * 创建社群卡牌
   */
  private static createCommunityCard(formData: FormData, id: string): StandardCard {
    const rawCard: CommunityCard = {
      id,
      名称: formData.name as string,
      特性: formData.trait as string,
      简介: formData.summary as string,
      描述: formData.description as string,
      imageUrl: '' // 暂时不支持图片上传
    };

    return communityCardConverter.toStandard(rawCard);
  }

  /**
   * 创建子职业卡牌
   */
  private static createSubclassCard(formData: FormData, id: string): StandardCard {
    const rawCard: SubClassCard = {
      id,
      名称: formData.name as string,
      描述: formData.description as string,
      imageUrl: '', // 暂时不支持图片上传
      主职: formData.mainClass as string,
      子职业: formData.subclassName as string,
      等级: formData.level as string,
      施法: formData.spellcasting as string
    };

    return subclassCardConverter.toStandard(rawCard);
  }

  /**
   * 创建领域卡牌
   */
  private static createDomainCard(formData: FormData, id: string): StandardCard {
    const rawCard: DomainCard = {
      id,
      名称: formData.name as string,
      领域: formData.domain as string,
      描述: formData.description as string,
      imageUrl: '', // 暂时不支持图片上传
      等级: Number(formData.level),
      属性: formData.attribute as string,
      回想: Number(formData.recall)
    };

    return domainCardConverter.toStandard(rawCard);
  }
}
