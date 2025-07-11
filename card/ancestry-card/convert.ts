import { v4 as uuidv4 } from "uuid";
import { CardType, processCardDescription, type StandardCard } from "@/card/card-types";
import { getAncestryCardNames } from "@/card/card-predefined-field";

// 血统卡牌类型
export type AncestryCardClass = string;

export interface AncestryCard {
  id: string;
  名称: string;
  种族: AncestryCardClass;
  简介: string;
  效果: string;
  类别: number
  imageUrl?: string;
}

class AncestryCardConverter {
  // 转换为标准格式
  toStandard(rawCard: AncestryCard): StandardCard {
    return {
      standarized: true,
      id: rawCard.id || uuidv4(),
      name: rawCard.名称,
      type: CardType.Ancestry,
      description: processCardDescription(rawCard.效果) || "",
      hint: rawCard.简介,
      imageUrl: rawCard.imageUrl || "",
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
