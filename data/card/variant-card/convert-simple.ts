/**
 * Variant Card Converter
 * 变体卡牌转换器 - 将原始变体卡牌数据转换为标准格式
 */

import { v4 as uuidv4 } from "uuid";
import { CardType, type StandardCard } from "@/data/card/card-types";

/**
 * 原始变体卡牌数据结构（用户导入的格式）
 */
export interface RawVariantCard {
  id: string;
  名称: string;
  类型: string;          // 变体类型，如 "食物"、"人物" 等
  子类别?: string;       // 可选的子类别，如 "饮料"、"盟友" 等
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
class VariantCardConverter {
  /**
   * 将原始变体卡牌转换为标准格式
   */
  toStandard(card: RawVariantCard): StandardCard {
    return {
      standarized: true,
      id: card.id || uuidv4(),
      name: card.名称,
      type: CardType.Variant,
      class: card.类型,              // 将 "类型" 映射到 class 字段
      level: card.等级,
      description: card.效果,
      imageUrl: card.imageUrl || "",
      headerDisplay: card.名称,
      cardSelectDisplay: {
        item1: card.简略信息?.item1 || "",
        item2: card.简略信息?.item2 || "",
        item3: card.简略信息?.item3 || "",
        item4: card.子类别 || ""        // 子类别作为第4项显示
      }
    };
  }

  /**
   * 将标准格式转换回原始变体卡牌格式（用于导出）
   */
  fromStandard(standardCard: StandardCard): RawVariantCard {
    return {
      id: standardCard.id,
      名称: standardCard.name,
      类型: standardCard.class,
      子类别: standardCard.cardSelectDisplay?.item4 || undefined,
      等级: standardCard.level,
      效果: standardCard.description || "",
      imageUrl: standardCard.imageUrl,
      简略信息: {
        item1: standardCard.cardSelectDisplay?.item1,
        item2: standardCard.cardSelectDisplay?.item2,
        item3: standardCard.cardSelectDisplay?.item3
      }
    };
  }
}

export const variantCardConverter = new VariantCardConverter();
