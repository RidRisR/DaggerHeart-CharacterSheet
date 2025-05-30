import { v4 as uuidv4 } from "uuid";
import { CardType, type StandardCard } from "@/data/card/card-types";
import { ANCESTRY_CARD_NAMES } from "@/data/card/card-predefined-field";

// 血统卡牌类型
export type AncestryCardClass = typeof ANCESTRY_CARD_NAMES[number];

export interface AncestryCard {
  id: string;
  名称: string;
  种族: AncestryCardClass;
  简介: string;
  效果: string;
  类别: number
  imageURL?: string;
}

class AncestryCardConverter {
  // 转换为标准格式
  toStandard(rawCard: AncestryCard): StandardCard {
    return {
      standarized: true,
      id: rawCard.id || uuidv4(),
      name: rawCard.名称,
      type: CardType.Ancestry,
      description: rawCard.效果,
      hint: rawCard.简介,
      imageUrl: "",
      level: rawCard.类别,
      class: rawCard.种族, // Map 种族 to class
      headerDisplay: rawCard.名称,
      cardSelectDisplay: {
        "item1": rawCard.种族,
      },
    };
  }
}

export const ancestryCardConverter = new AncestryCardConverter();

