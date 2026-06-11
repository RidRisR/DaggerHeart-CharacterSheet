export const zhCnEnumAliases = {
  trait: {
    敏捷: "agility",
    力量: "strength",
    灵巧: "finesse",
    本能: "instinct",
    风度: "presence",
    知识: "knowledge",
  },
  damageType: {
    物理: "physical",
    魔法: "magic",
  },
  range: {
    近战: "melee",
    邻近: "veryClose",
    近距离: "close",
    远距离: "far",
    极远: "veryFar",
  },
  burden: {
    单手: "oneHanded",
    双手: "twoHanded",
    副手: "offHand",
  },
} as const

export const enumAliasFields = Object.keys(zhCnEnumAliases) as Array<keyof typeof zhCnEnumAliases>
