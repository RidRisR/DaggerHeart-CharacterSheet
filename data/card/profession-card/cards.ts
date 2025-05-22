import { ProfessionCard } from "@/data/card/profession-card/convert";

export const professionCards: ProfessionCard[] = [
  {
    ID: "warrior-1",
    名称: "战士",
    描述: "擅长近战和防御的职业",
    imageUrl: "/fantasy-warrior-profession-card.png",
    等级: 1,
    职业: "战士",
    特技: "格挡：减少受到的伤害",
    要求: "力量 14+",
    type: "profession",
  },
  {
    ID: "mage-1",
    名称: "法师",
    描述: "掌握魔法的奥术师",
    imageUrl: "/fantasy-mage-profession-card.png",
    职业: "法师",
    特技: "法术专精：增加法术伤害",
    要求: "智力 14+",
    type: "profession",
  },
  {
    ID: "rogue-1",
    名称: "盗贼",
    描述: "擅长隐匿和突袭的职业",
    imageUrl: "/fantasy-rogue-card.png",
    职业: "盗贼",
    特技: "背刺：从背后攻击造成额外伤害",
    要求: "敏捷 14+",
    type: "profession",
  },
]
