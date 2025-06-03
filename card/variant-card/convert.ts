/**
 * Variant Card Converter
 * 变体卡牌转换器 - 将原始变体卡牌数据转换为标准格式
 */

import { v4 as uuidv4 } from "uuid";
import { CardType, type StandardCard } from "@/card/card-types";

// 原始变体卡牌数据结构（用户导入的格式）
export interface RawVariantCard {
  id: string;
  名称: string;
  类型: string;          // 变体类型，如 "食物"、"人物" 等
  子类别?: string;       // 子类别，如 "饮料"、"盟友" 等
  等级?: number;         // 可选的等级
  效果: string;          // 卡牌效果描述
  imageUrl?: string;     // 图片URL
  简略信息: {           // 卡牌选择时显示的简要信息
    item1?: string;
    item2?: string;
    item3?: string;
  };
  [key: string]: any;    // 允许扩展字段
}

/**
 * 变体卡牌转换器类
 */
export class VariantCardConverter {
  /**
   * 将原始变体卡牌转换为标准格式
   */
  toStandard(card: RawVariantCard): StandardCard {
    return {
      standarized: true,
      id: card.id || uuidv4(),
      name: card.名称,
      type: CardType.Variant,
      class: card.子类别 || "",              // 将 "子类别" 映射到 class 字段，确保为字符串
      level: card.等级,
      description: card.效果,
      imageUrl: card.imageUrl || "",
      headerDisplay: card.名称,
      cardSelectDisplay: {
        item1: card.简略信息?.item1 || "",
        item2: card.简略信息?.item2 || "",
        item3: card.简略信息?.item3 || "",
      },
      // 添加变体卡牌信息，保存真实类型
      variantSpecial: {
        realType: card.类型,           // 保存真实卡牌类型（如"食物"、"人物"）
        subCategory: card.子类别       // 保存子类别信息
      }
    };
  }
}

export const variantCardConverter = new VariantCardConverter();