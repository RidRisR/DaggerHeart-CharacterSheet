import { v4 as uuidv4 } from "uuid";
import type { StandardCard } from "@/data/card/card-types";
// 血统卡牌类型
export type AncestryCardClass =
  | "械灵"
  | "恶魔"
  | "龙人"
  | "矮人"
  | "精灵"
  | "仙灵"
  | "羊蹄人"
  | "费尔伯格"
  | "孢菌人"
  | "龟人"
  | "巨人"
  | "哥布林"
  | "半身人"
  | "人类"
  | "猫人"
  | "兽人"
  | "蛙裔"
  | "猿人";

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
      type: "ancestry",
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

