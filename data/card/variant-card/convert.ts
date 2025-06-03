/**
 * Variant Card Converter
 * 变体卡牌转换器 - 将原始变体卡牌数据转换为标准格式
 */

import { v4 as uuidv4 } from "uuid";
import { CardType, type StandardCard, type RawVariantCard } from "@/data/card/card-types";

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
      class: card.类型,              // 将 "类型" 映射到 class 字段
      level: card.等级,
      description: card.效果,
      imageUrl: card.imageUrl || "",
      headerDisplay: card.名称,
      cardSelectDisplay: {
        item1: card.简略信息?.item1 || "",
        item2: card.简略信息?.item2 || "",
        item3: card.简略信息?.item3 || "",
      }
    };
  }
}

export const variantCardConverter = new VariantCardConverter();