export interface Weapon {
    名称: string;
    等级: "T1" | "T2" | "T3" | "T4";
    检定: "敏捷" | "灵巧" | "知识" | "力量" | "本能" | "风度";
    属性: "物理" | "魔法";
    范围: "近战" | "邻近" | "远距离" | "极远" | "近距离";
    伤害: string;
    负荷: string;
    特性名称: string;
    描述: string;
}

export const primaryWeapons: Weapon[] = [
// 位阶1 (等级1) - 物理武器
    {
        名称: "阔剑",
        等级: "T1",
        检定: "敏捷",
        属性: "物理",
        范围: "近战",
        伤害: "d8",
        负荷: "单手",
        特性名称: "可靠",
        描述: "你的攻击掷骰+1。",
    },
    {
        名称: "长剑",
        等级: "T1",
        检定: "敏捷",
        属性: "物理",
        范围: "近战",
        伤害: "d10+3",
        负荷: "双手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "战斧",
        等级: "T1",
        检定: "力量",
        属性: "物理",
        范围: "近战",
        伤害: "d10+3",
        负荷: "双手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "巨剑",
        等级: "T1",
        检定: "力量",
        属性: "物理",
        范围: "近战",
        伤害: "d10+3",
        负荷: "双手",
        特性名称: "巨型",
        描述: "闪避值-1，额外掷一个伤害骰并去掉其中最小的一个。",
    },
    {
        名称: "钉头锤",
        等级: "T1",
        检定: "力量",
        属性: "物理",
        范围: "近战",
        伤害: "d8+1",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "战锤",
        等级: "T1",
        检定: "力量",
        属性: "物理",
        范围: "近战",
        伤害: "d12+3",
        负荷: "双手",
        特性名称: "重型",
        描述: "闪避值-1。",
    },
    {
        名称: "匕首",
        等级: "T1",
        检定: "灵巧",
        属性: "物理",
        范围: "近战",
        伤害: "d8+1",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "短棍",
        等级: "T1",
        检定: "本能",
        属性: "物理",
        范围: "近战",
        伤害: "d10+3",
        负荷: "双手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "短刀",
        等级: "T1",
        检定: "风度",
        属性: "物理",
        范围: "近战",
        伤害: "d8+1",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "刺剑",
        等级: "T1",
        检定: "风度",
        属性: "物理",
        范围: "近战",
        伤害: "d8",
        负荷: "单手",
        特性名称: "迅捷",
        描述: "标记 1 压力点以额外攻击一个范围内的目标。",
    },
    {
        名称: "戟",
        等级: "T1",
        检定: "力量",
        属性: "物理",
        范围: "邻近",
        伤害: "d10+2",
        负荷: "双手",
        特性名称: "繁琐",
        描述: "灵巧-1。",
    },
    {
        名称: "长矛",
        等级: "T1",
        检定: "灵巧",
        属性: "物理",
        范围: "邻近",
        伤害: "d8+3",
        负荷: "双手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "短弓",
        等级: "T1",
        检定: "敏捷",
        属性: "物理",
        范围: "远距离",
        伤害: "d6+3",
        负荷: "双手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "弩",
        等级: "T1",
        检定: "灵巧",
        属性: "物理",
        范围: "远距离",
        伤害: "d6+1",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "长弓",
        等级: "T1",
        检定: "敏捷",
        属性: "物理",
        范围: "极远",
        伤害: "d8+3",
        负荷: "双手",
        特性名称: "繁琐",
        描述: "灵巧-1。",
    },
    // 位阶1 (等级1) - 魔法武器
    {
        名称: "奥术护手",
        等级: "T1",
        检定: "力量",
        属性: "魔法",
        范围: "近战",
        伤害: "d10+3",
        负荷: "双手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "圣斧",
        等级: "T1",
        检定: "力量",
        属性: "魔法",
        范围: "近战",
        伤害: "d8+1",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "发光戒指",
        等级: "T1",
        检定: "敏捷",
        属性: "魔法",
        范围: "邻近",
        伤害: "d10+2",
        负荷: "双手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "手持符文",
        等级: "T1",
        检定: "本能",
        属性: "魔法",
        范围: "邻近",
        伤害: "d10",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "回力剑",
        等级: "T1",
        检定: "灵巧",
        属性: "魔法",
        范围: "近距离",
        伤害: "d8",
        负荷: "单手",
        特性名称: "回力",
        描述: "当此武器在射程内被投掷后，会在完成攻击的瞬间重新出现在你手中。",
    },
    {
        名称: "短杖",
        等级: "T1",
        检定: "本能",
        属性: "魔法",
        范围: "近距离",
        伤害: "d8+1",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "双手法杖",
        等级: "T1",
        检定: "本能",
        属性: "魔法",
        范围: "远距离",
        伤害: "d6+3",
        负荷: "双手",
        特性名称: "", // Corrected: No "多用"
        描述: "",    // Corrected
    },
    {
        名称: "权杖",
        等级: "T1",
        检定: "风度",
        属性: "魔法",
        范围: "远距离",
        伤害: "d6",
        负荷: "双手", // Corrected
        特性名称: "多用", // Corrected
        描述: "这把武器也可以此方式使用 - 风度 近战 d8。", // Corrected
    },
    {
        名称: "魔杖",
        等级: "T1",
        检定: "知识",
        属性: "魔法",
        范围: "远距离",
        伤害: "d6+1",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "巨杖",
        等级: "T1",
        检定: "知识",
        属性: "魔法",
        范围: "极远",
        伤害: "d6",
        负荷: "双手",
        特性名称: "强力",
        描述: "额外掷一个伤害骰并去掉其中最小的一个。",
    },

    // 位阶2 (等级2-4) - 物理武器
    {
        名称: "改良阔剑",
        等级: "T2",
        检定: "敏捷",
        属性: "物理",
        范围: "近战",
        伤害: "d8+3",
        负荷: "单手",
        特性名称: "可靠",
        描述: "你的攻击掷骰+1。",
    },
    {
        名称: "改良长剑",
        等级: "T2",
        检定: "敏捷",
        属性: "物理",
        范围: "近战",
        伤害: "d10+6",
        负荷: "双手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "改良战斧",
        等级: "T2",
        检定: "力量",
        属性: "物理",
        范围: "近战",
        伤害: "d10+6",
        负荷: "双手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "改良巨剑",
        等级: "T2",
        检定: "力量",
        属性: "物理",
        范围: "近战",
        伤害: "d10+6",
        负荷: "双手",
        特性名称: "巨型",
        描述: "闪避值-1，额外掷一个伤害骰并去掉其中最小的一个。",
    },
    {
        名称: "改良钉头锤",
        等级: "T2",
        检定: "力量",
        属性: "物理",
        范围: "近战",
        伤害: "d8+4",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "改良战锤",
        等级: "T2",
        检定: "力量",
        属性: "物理",
        范围: "近战",
        伤害: "d12+6",
        负荷: "双手",
        特性名称: "重型",
        描述: "闪避值-1。",
    },
    {
        名称: "改良匕首",
        等级: "T2",
        检定: "灵巧",
        属性: "物理",
        范围: "近战",
        伤害: "d8+4",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "改良短棍",
        等级: "T2",
        检定: "本能",
        属性: "物理",
        范围: "近战",
        伤害: "d10+6",
        负荷: "双手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "改良短刀",
        等级: "T2",
        检定: "风度",
        属性: "物理",
        范围: "近战",
        伤害: "d8+4",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "改良刺剑",
        等级: "T2",
        检定: "风度",
        属性: "物理",
        范围: "近战",
        伤害: "d8+3",
        负荷: "单手",
        特性名称: "迅捷",
        描述: "标记 1 压力点以额外攻击一个范围内的目标。",
    },
    {
        名称: "改良戟",
        等级: "T2",
        检定: "力量",
        属性: "物理",
        范围: "邻近",
        伤害: "d10+5",
        负荷: "双手",
        特性名称: "繁琐",
        描述: "灵巧-1。",
    },
    {
        名称: "改良长矛",
        等级: "T2",
        检定: "灵巧",
        属性: "物理",
        范围: "邻近",
        伤害: "d8+6",
        负荷: "双手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "改良短弓",
        等级: "T2",
        检定: "敏捷",
        属性: "物理",
        范围: "远距离",
        伤害: "d6+6",
        负荷: "双手",
        特性名称: "", // Corrected (JSON desc is empty, but TS had "繁琐：灵巧-1" from previous item)
        描述: "",    // Corrected
    },
    {
        名称: "改良弩",
        等级: "T2",
        检定: "灵巧",
        属性: "物理",
        范围: "远距离",
        伤害: "d6+4",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "改良长弓",
        等级: "T2",
        检定: "敏捷",
        属性: "物理",
        范围: "极远",
        伤害: "d8+6",
        负荷: "双手",
        特性名称: "繁琐",
        描述: "灵巧-1。",
    },
    {
        名称: "鎏金弯刀",
        等级: "T2",
        检定: "力量",
        属性: "物理",
        范围: "近战",
        伤害: "d10+4",
        负荷: "单手",
        特性名称: "强力",
        描述: "额外掷一个伤害骰并去掉其中最小的一个。",
    },
    {
        名称: "拳刃",
        等级: "T2",
        检定: "力量",
        属性: "物理",
        范围: "近战",
        伤害: "d10+6",
        负荷: "双手",
        特性名称: "残暴",
        描述: "伤害骰每掷出一次最大值，就额外掷出一个伤害骰。",
    },
    {
        名称: "乌洛克阔剑",
        等级: "T2",
        检定: "灵巧",
        属性: "物理",
        范围: "近战",
        伤害: "d8+3",
        负荷: "单手",
        特性名称: "致命",
        描述: "造成严重伤害时，额外造成 1 生命点的伤害。",
    },
    {
        名称: "刃鞭",
        等级: "T2",
        检定: "敏捷",
        属性: "物理",
        范围: "邻近",
        伤害: "d8+3",
        负荷: "单手",
        特性名称: "迅捷",
        描述: "标记 1 压力点以额外攻击一个范围内的目标 。", // Note: JSON has a space before the period.
    },
    {
        名称: "钢铸戟",
        等级: "T2",
        检定: "力量",
        属性: "物理",
        范围: "邻近",
        伤害: "d8+4",
        负荷: "双手",
        特性名称: "恐惧",
        描述: "成功的攻击同时会额外标记 1 压力点。",
    },
    {
        名称: "战镰",
        等级: "T2",
        检定: "灵巧",
        属性: "物理",
        范围: "邻近",
        伤害: "d8+5",
        负荷: "双手",
        特性名称: "可靠",
        描述: "你的攻击掷骰+1。",
    },
    {
        名称: "火铳",
        等级: "T2",
        检定: "灵巧",
        属性: "物理",
        范围: "近距离",
        伤害: "d8+6",
        负荷: "双手",
        特性名称: "装填",
        描述: "攻击后掷一个d6，掷出1时，下次攻击前你必须标记 1 压力点进行装填。",
    },
    {
        名称: "巨弓",
        等级: "T2",
        检定: "力量",
        属性: "物理",
        范围: "远距离",
        伤害: "d6+6",
        负荷: "双手",
        特性名称: "强力",
        描述: "额外掷一个伤害骰并去掉其中最小的一个。",
    },
    {
        名称: "细弦弓",
        等级: "T2",
        检定: "敏捷",
        属性: "物理",
        范围: "极远",
        伤害: "d6+5",
        负荷: "双手",
        特性名称: "可靠",
        描述: "你的攻击掷骰+1。",
    },

    // 位阶2 (等级2-4) - 魔法武器
    {
        名称: "改良奥术护手",
        等级: "T2",
        检定: "力量",
        属性: "魔法",
        范围: "近战",
        伤害: "d10+6",
        负荷: "双手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "改良圣斧",
        等级: "T2",
        检定: "力量",
        属性: "魔法",
        范围: "近战",
        伤害: "d8+4",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "改良发光戒指",
        等级: "T2",
        检定: "敏捷",
        属性: "魔法",
        范围: "邻近",
        伤害: "d10+5",
        负荷: "双手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "改良手持符文",
        等级: "T2",
        检定: "本能",
        属性: "魔法",
        范围: "邻近",
        伤害: "d10+3",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "改良回力剑",
        等级: "T2",
        检定: "灵巧",
        属性: "魔法",
        范围: "近距离",
        伤害: "d8+3",
        负荷: "单手",
        特性名称: "回力",
        描述: "当此武器在射程内被投掷后，会在完成攻击的瞬间重新出现在你手中。",
    },
    {
        名称: "改良短杖",
        等级: "T2",
        检定: "本能",
        属性: "魔法",
        范围: "近距离",
        伤害: "d8+4",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "改良双手法杖",
        等级: "T2",
        检定: "本能",
        属性: "魔法",
        范围: "远距离",
        伤害: "d6+6", // Corrected
        负荷: "双手",
        特性名称: "", // Corrected
        描述: "",    // Corrected
    },
    {
        名称: "改良权杖", // JSON name is "改良权杖", damage "d6+3", two_handed "双手", desc "**多用：**这把武器也可以此方式使用 - 风度 近战 d8+3。"
        等级: "T2", // Original TS for "改良权杖" used "d6+4" which is for "改良魔杖"
        检定: "风度",
        属性: "魔法",
        范围: "远距离",
        伤害: "d6+3", // Corrected to match JSON "改良权杖"
        负荷: "双手", // Corrected
        特性名称: "多用", // Corrected
        描述: "这把武器也可以此方式使用 - 风度 近战 d8+3。", // Corrected
    },
    {
        名称: "改良魔杖", // JSON name "改良魔杖", damage "d6+4"
        等级: "T2",
        检定: "知识",
        属性: "魔法",
        范围: "远距离",
        伤害: "d6+4",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "改良巨杖",
        等级: "T2",
        检定: "知识",
        属性: "魔法",
        范围: "极远",
        伤害: "d6+3",
        负荷: "双手",
        特性名称: "强力",
        描述: "额外掷一个伤害骰并去掉其中最小的一个。",
    },
    {
        名称: "自我之刃",
        等级: "T2",
        检定: "敏捷",
        属性: "魔法",
        范围: "近战",
        伤害: "d12+4",
        负荷: "单手",
        特性名称: "傲慢",
        描述: "0或者更低的风度才可以使用该武器。",
    },
    {
        名称: "施法剑",
        等级: "T2",
        检定: "力量",
        属性: "魔法",
        范围: "近战",
        伤害: "d10+4",
        负荷: "双手",
        特性名称: "多用",
        描述: "这把武器也可以此方式使用 - 知识 远距离 d6+3。",
    },
    {
        名称: "吞噬匕首",
        等级: "T2",
        检定: "灵巧",
        属性: "魔法",
        范围: "近战",
        伤害: "d8+4",
        负荷: "单手",
        特性名称: "恐惧",
        描述: "成功攻击的同时会额外标记 1 压力点。",
    },
    {
        名称: "异界之锤",
        等级: "T2",
        检定: "本能",
        属性: "魔法",
        范围: "近战",
        伤害: "d8+6",
        负荷: "双手",
        特性名称: "爆发", // Corrected
        描述: "近战命中时，每个邻近的敌人都必须进行反应掷骰(14)，否则也受到一半的伤害。",
    },
    {
        名称: "尤塔里血弓",
        等级: "T2",
        检定: "灵巧",
        属性: "魔法",
        范围: "远距离",
        伤害: "d6+4",
        负荷: "双手",
        特性名称: "残暴",
        描述: "伤害骰每掷出一次最大值，就额外掷出一个伤害骰。",
    },
    {
        名称: "长者之弓",
        等级: "T2",
        检定: "本能",
        属性: "魔法",
        范围: "远距离",
        伤害: "d6+4",
        负荷: "双手",
        特性名称: "强力",
        描述: "额外掷一个伤害骰并去掉其中最小的一个。",
    },
    {
        名称: "伊利亚斯的权杖",
        等级: "T2",
        检定: "风度",
        属性: "魔法",
        范围: "远距离",
        伤害: "d6+3",
        负荷: "单手",
        特性名称: "振奋",
        描述: "当你成功攻击时，掷一个 d4。掷出 4 时，清除 1 压力点 。", // Note: JSON has a space before the period.
    },
    {
        名称: "迷惑魔杖", // JSON desc "**说服：**在进行风度掷骰前可**标记 1 压力点**以获得+2加值。" two_handed: "单手" damage: "d6+4"
        等级: "T2", // Original TS had d6+6 and 双手
        检定: "风度",
        属性: "魔法",
        范围: "远距离",
        伤害: "d6+4", // Corrected to match JSON
        负荷: "单手", // Corrected
        特性名称: "说服",
        描述: "在进行风度掷骰前可标记 1 压力点以获得+2加值。", // Corrected
    },
    {
        名称: "看守者之杖",
        等级: "T2",
        检定: "知识",
        属性: "魔法",
        范围: "远距离",
        伤害: "d6+4",
        负荷: "双手",
        特性名称: "可靠",
        描述: "你的攻击掷骰+1。",
    },

    // 位阶3 (等级5-7) - 物理武器
    {
        名称: "高级阔剑",
        等级: "T3",
        检定: "敏捷",
        属性: "物理",
        范围: "近战",
        伤害: "d8+6",
        负荷: "单手",
        特性名称: "可靠",
        描述: "你的攻击掷骰+1。",
    },
    {
        名称: "高级长剑",
        等级: "T3",
        检定: "敏捷",
        属性: "物理",
        范围: "近战",
        伤害: "d10+9",
        负荷: "双手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "高级战斧",
        等级: "T3",
        检定: "力量",
        属性: "物理",
        范围: "近战",
        伤害: "d10+9",
        负荷: "双手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "高级巨剑",
        等级: "T3",
        检定: "力量",
        属性: "物理",
        范围: "近战",
        伤害: "d10+9",
        负荷: "双手",
        特性名称: "巨型",
        描述: "闪避值-1，额外掷一个伤害骰并去掉其中最小的一个。",
    },
    {
        名称: "高级钉头锤",
        等级: "T3",
        检定: "力量",
        属性: "物理",
        范围: "近战",
        伤害: "d8+7",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "高级战锤",
        等级: "T3",
        检定: "力量",
        属性: "物理",
        范围: "近战",
        伤害: "d12+9",
        负荷: "双手",
        特性名称: "重型",
        描述: "闪避值-1。",
    },
    {
        名称: "高级匕首",
        等级: "T3",
        检定: "灵巧",
        属性: "物理",
        范围: "近战",
        伤害: "d8+7",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "高级短棍",
        等级: "T3",
        检定: "本能",
        属性: "物理",
        范围: "近战",
        伤害: "d10+9",
        负荷: "双手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "高级短刀",
        等级: "T3",
        检定: "风度",
        属性: "物理",
        范围: "近战",
        伤害: "d8+7",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "高级刺剑",
        等级: "T3",
        检定: "风度",
        属性: "物理",
        范围: "近战",
        伤害: "d8+6",
        负荷: "单手",
        特性名称: "迅捷",
        描述: "标记 1 压力点以额外攻击一个范围内的目标。",
    },
    {
        名称: "高级戟",
        等级: "T3",
        检定: "力量",
        属性: "物理",
        范围: "邻近",
        伤害: "d10+8",
        负荷: "双手",
        特性名称: "繁琐",
        描述: "灵巧-1。",
    },
    {
        名称: "高级长矛",
        等级: "T3",
        检定: "灵巧",
        属性: "物理",
        范围: "邻近",
        伤害: "d8+9",
        负荷: "双手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "高级短弓",
        等级: "T3",
        检定: "敏捷",
        属性: "物理",
        范围: "远距离",
        伤害: "d6+9",
        负荷: "双手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "高级弩",
        等级: "T3",
        检定: "灵巧",
        属性: "物理",
        范围: "远距离",
        伤害: "d6+7",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "高级长弓",
        等级: "T3",
        检定: "敏捷",
        属性: "物理",
        范围: "极远",
        伤害: "d8+9",
        负荷: "双手",
        特性名称: "繁琐",
        描述: "灵巧-1。",
    },
    {
        名称: "闪蝶之刃",
        等级: "T3",
        检定: "敏捷",
        属性: "物理",
        范围: "近战",
        伤害: "d8+5",
        负荷: "单手",
        特性名称: "锐翼",
        描述: "将你的敏捷属性值加入该武器的伤害掷骰加值中。",
    },
    {
        名称: "勇气之剑",
        等级: "T3",
        检定: "力量",
        属性: "物理",
        范围: "近战",
        伤害: "d12+7",
        负荷: "双手",
        特性名称: "勇气",
        描述: "闪避值 -1 ，严重伤害阈值 +3 。", // Note: JSON has spaces around symbols.
    },
    {
        名称: "愤怒之锤",
        等级: "T3",
        检定: "力量",
        属性: "物理",
        范围: "近战",
        伤害: "d10+7",
        负荷: "双手",
        特性名称: "毁灭",
        描述: "在攻击掷骰之前标记 1 压力点，在进行伤害掷骰时，把你的伤害骰改为d20",
    },
    {
        名称: "拉布里斯斧",
        等级: "T3",
        检定: "力量",
        属性: "物理",
        范围: "近战",
        伤害: "d10+7",
        负荷: "双手",
        特性名称: "保护",
        描述: "护甲值+1。",
    },
    {
        名称: "经络短刀",
        等级: "T3",
        检定: "风度",
        属性: "物理",
        范围: "近战",
        伤害: "d10+5",
        负荷: "单手",
        特性名称: "决斗",
        描述: "当近距离内除了当前目标外没有其他生物时，攻击掷骰时获得优势。",
    },
    {
        名称: "伸缩军刀",
        等级: "T3",
        检定: "风度",
        属性: "物理",
        范围: "近战",
        伤害: "d10+7",
        负荷: "单手",
        特性名称: "伸缩",
        描述: "刀片可以隐藏在刀柄中以避免被识别为武器。",
    },
    {
        名称: "双连枷",
        等级: "T3",
        检定: "敏捷",
        属性: "物理",
        范围: "邻近",
        伤害: "d10+8",
        负荷: "双手",
        特性名称: "强力",
        描述: "额外掷一个伤害骰并去掉其中最小的一个。",
    },
    {
        名称: "利爪之刃",
        等级: "T3",
        检定: "灵巧",
        属性: "物理",
        范围: "近距离",
        伤害: "d10+7",
        负荷: "双手",
        特性名称: "残暴",
        描述: "伤害骰每掷出一次最大值，就额外掷出一个伤害骰。",
    },
    {
        名称: "黑火药左轮",
        等级: "T3",
        检定: "灵巧",
        属性: "物理",
        范围: "远距离",
        伤害: "d6+8",
        负荷: "单手",
        特性名称: "装填",
        描述: "攻击后掷一个d6，掷出1时，下次攻击前你必须标记 1 压力点进行装填",
    },
    {
        名称: "尖刺弓",
        等级: "T3",
        检定: "敏捷",
        属性: "物理",
        范围: "极远",
        伤害: "d6+7",
        负荷: "双手",
        特性名称: "多用",
        描述: "这把武器也可以此方式使用 - 敏捷 近战 d10+5。",
    },

    // 位阶3 (等级5-7) - 魔法武器
    {
        名称: "高级奥术护手",
        等级: "T3",
        检定: "力量",
        属性: "魔法",
        范围: "近战",
        伤害: "d10+9",
        负荷: "双手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "高级圣斧",
        等级: "T3",
        检定: "力量",
        属性: "魔法",
        范围: "近战",
        伤害: "d8+7",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "高级发光戒指",
        等级: "T3",
        检定: "敏捷",
        属性: "魔法",
        范围: "邻近",
        伤害: "d10+8",
        负荷: "双手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "高级手持符文",
        等级: "T3",
        检定: "本能",
        属性: "魔法",
        范围: "邻近",
        伤害: "d10+6",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "高级回力剑",
        等级: "T3",
        检定: "灵巧",
        属性: "魔法",
        范围: "近距离",
        伤害: "d8+6",
        负荷: "单手",
        特性名称: "回力",
        描述: "当此武器在射程内被投掷后，会在完成攻击的瞬间重新出现在你手中。",
    },
    {
        名称: "高级短杖",
        等级: "T3",
        检定: "本能",
        属性: "魔法",
        范围: "近距离",
        伤害: "d8+7",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "高级双手法杖", // JSON "高级双手法杖" damage d6+9, desc ""
        等级: "T3", // Original TS had d6+6 which is for "高级权杖"
        检定: "本能",
        属性: "魔法",
        范围: "远距离",
        伤害: "d6+9", // Corrected
        负荷: "双手",
        特性名称: "", // Corrected
        描述: "",    // Corrected
    },
    {
        名称: "高级权杖", // JSON "高级权杖" damage d6+6, desc "**多用：**这把武器也可以此方式使用 - 本能 近战 d8+4。"
        等级: "T3", // Original TS had "单手"
        检定: "风度",
        属性: "魔法",
        范围: "远距离",
        伤害: "d6+6",
        负荷: "双手", // Corrected
        特性名称: "多用", // Corrected
        描述: "这把武器也可以此方式使用 - 本能 近战 d8+4。", // Corrected (JSON has 本能, not 风度 for the alternate use)
    },
    {
        名称: "高级魔杖",
        等级: "T3",
        检定: "知识",
        属性: "魔法",
        范围: "远距离",
        伤害: "d6+7",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "高级巨杖",
        等级: "T3",
        检定: "知识",
        属性: "魔法",
        范围: "极远",
        伤害: "d6+6",
        负荷: "双手",
        特性名称: "强力",
        描述: "额外掷一个伤害骰并去掉其中最小的一个。",
    },
    {
        名称: "运气之斧",
        等级: "T3",
        检定: "力量",
        属性: "魔法",
        范围: "近战",
        伤害: "d10+8",
        负荷: "双手",
        特性名称: "幸运",
        描述: "花费 1 压力点重骰一次失败的掷骰，并接受新的结果。",
    },
    {
        名称: "祝福匕首",
        等级: "T3",
        检定: "本能",
        属性: "魔法",
        范围: "近战",
        伤害: "d10+6",
        负荷: "单手",
        特性名称: "治愈",
        描述: "休息时间时，自动恢复 1 生命点",
    },
    {
        名称: "鬼魂之刃",
        等级: "T3",
        检定: "风度",
        属性: "魔法",
        范围: "近战",
        伤害: "d10+7",
        负荷: "单手",
        特性名称: "异界",
        描述: "你可以选择造成物理或者魔法伤害。",
    },
    {
        名称: "毁灭符文",
        等级: "T3",
        检定: "知识",
        属性: "魔法",
        范围: "邻近",
        伤害: "d20+4",
        负荷: "单手",
        特性名称: "苦痛",
        描述: "每次你使用此武器成功攻击时，你需标记 1 压力点。",
    },
    {
        名称: "维多加斯特的吊坠",
        等级: "T3",
        检定: "知识",
        属性: "魔法",
        范围: "近距离",
        伤害: "d10+5",
        负荷: "单手",
        特性名称: "时间扭曲者",
        描述: "你可以在攻击掷骰后选择攻击目标。",
    },
    {
        名称: "鎏金弓",
        等级: "T3",
        检定: "灵巧",
        属性: "魔法",
        范围: "远距离",
        伤害: "d6+7",
        负荷: "双手",
        特性名称: "自省",
        描述: "伤害掷骰中的所有1都视为6。",
    },
    {
        名称: "火焰杖",
        等级: "T3",
        检定: "本能",
        属性: "魔法",
        范围: "远距离",
        伤害: "d6+7",
        负荷: "双手", // Corrected
        特性名称: "灼烧",
        描述: "伤害掷骰中掷出的每个6都使目标标记 1 压力点。",
    },
    {
        名称: "法师球",
        等级: "T3",
        检定: "知识",
        属性: "魔法",
        范围: "远距离",
        伤害: "d6+7",
        负荷: "单手",
        特性名称: "强力",
        描述: "额外掷一个伤害骰并去掉其中最小的一个。",
    },
    {
        名称: "伊尔玛里的步枪",
        等级: "T3",
        检定: "灵巧",
        属性: "魔法",
        范围: "极远",
        伤害: "d6+6",
        负荷: "单手",
        特性名称: "装填",
        描述: "攻击后掷一个d6，掷出1时，下次攻击前你必须标记 1 压力点进行装填。",
    },

    // 位阶4 (等级8-10) - 物理武器
    {
        名称: "传奇阔剑",
        等级: "T4",
        检定: "敏捷",
        属性: "物理",
        范围: "近战",
        伤害: "d8+9",
        负荷: "单手",
        特性名称: "可靠",
        描述: "你的攻击掷骰+1。",
    },
    {
        名称: "传奇长剑",
        等级: "T4",
        检定: "敏捷",
        属性: "物理",
        范围: "近战",
        伤害: "d10+12",
        负荷: "双手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "传奇战斧",
        等级: "T4",
        检定: "力量",
        属性: "物理",
        范围: "近战",
        伤害: "d10+12",
        负荷: "双手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "传奇巨剑",
        等级: "T4",
        检定: "力量",
        属性: "物理",
        范围: "近战",
        伤害: "d10+12",
        负荷: "双手",
        特性名称: "巨型",
        描述: "闪避值-1，额外掷一个伤害骰并去掉其中最小的一个。",
    },
    {
        名称: "传奇钉头锤",
        等级: "T4",
        检定: "力量",
        属性: "物理",
        范围: "近战",
        伤害: "d8+10",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "传奇战锤",
        等级: "T4",
        检定: "力量",
        属性: "物理",
        范围: "近战",
        伤害: "d12+12",
        负荷: "双手",
        特性名称: "重型",
        描述: "闪避值-1。",
    },
    {
        名称: "传奇匕首",
        等级: "T4",
        检定: "灵巧",
        属性: "物理",
        范围: "近战",
        伤害: "d8+10",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "传奇短棍",
        等级: "T4",
        检定: "本能",
        属性: "物理",
        范围: "近战",
        伤害: "d10+12",
        负荷: "双手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "传奇短刀",
        等级: "T4",
        检定: "风度",
        属性: "物理",
        范围: "近战",
        伤害: "d8+10",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "传奇刺剑",
        等级: "T4",
        检定: "风度",
        属性: "物理",
        范围: "近战",
        伤害: "d8+9",
        负荷: "单手",
        特性名称: "迅捷",
        描述: "标记 1 压力点以额外攻击一个范围内的目标。",
    },
    {
        名称: "传奇戟",
        等级: "T4",
        检定: "力量",
        属性: "物理",
        范围: "邻近",
        伤害: "d10+11",
        负荷: "双手",
        特性名称: "繁琐",
        描述: "灵巧-1。",
    },
    {
        名称: "传奇长矛",
        等级: "T4",
        检定: "灵巧",
        属性: "物理",
        范围: "邻近",
        伤害: "d8+12",
        负荷: "双手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "传奇短弓",
        等级: "T4",
        检定: "敏捷",
        属性: "物理",
        范围: "远距离",
        伤害: "d6+12",
        负荷: "双手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "传奇弩",
        等级: "T4",
        检定: "灵巧",
        属性: "物理",
        范围: "远距离",
        伤害: "d6+10",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "传奇长弓",
        等级: "T4",
        检定: "敏捷",
        属性: "物理",
        范围: "极远",
        伤害: "d8+12",
        负荷: "双手",
        特性名称: "繁琐",
        描述: "灵巧-1。",
    },
    {
        名称: "双刃剑",
        等级: "T4",
        检定: "敏捷",
        属性: "物理",
        范围: "近战",
        伤害: "d10+9",
        负荷: "双手",
        特性名称: "迅捷",
        描述: "标记 1 压力点以额外攻击一个范围内的目标。",
    },
    {
        名称: "冲击拳套",
        等级: "T4",
        检定: "力量",
        属性: "物理",
        范围: "近战",
        伤害: "d10+11",
        负荷: "单手", // JSON is 单手
        特性名称: "震荡",
        描述: "在一次成功攻击后花费 1 希望点，将目标击退至远距离。",
    },
    {
        名称: "巨斧",
        等级: "T4",
        检定: "力量",
        属性: "物理",
        范围: "近战",
        伤害: "d12+13",
        负荷: "双手",
        特性名称: "破坏",
        描述: "敏捷-1，成功攻击后为所有邻近范围内的敌人标记 1 压力点。",
    },
    {
        名称: "弧形匕首",
        等级: "T4",
        检定: "灵巧",
        属性: "物理",
        范围: "近战", // JSON is 近战
        伤害: "d8+9",
        负荷: "单手",
        特性名称: "锯齿",
        描述: "伤害掷骰中的所有1都视为8。", // Original TS "伤害骰中的1皆视为8点伤害"
    },
    {
        名称: "延伸长柄武器",
        等级: "T4",
        检定: "灵巧",
        属性: "物理",
        范围: "邻近",
        伤害: "d8+10",
        负荷: "双手",
        特性名称: "延长",
        描述: "你能够将范围内所有处于一条直线上的敌人同时作为你的攻击目标。",
    },
    {
        名称: "摆动绳刃",
        等级: "T4",
        检定: "风度",
        属性: "物理",
        范围: "近距离",
        伤害: "d8+9",
        负荷: "双手",
        特性名称: "捕获",
        描述: "在一次成功攻击后花费 1 希望点，使目标处于束缚状态或者将其拉至你的近战范围。",
    },
    {
        名称: "弹跳斧",
        等级: "T4",
        检定: "敏捷",
        属性: "物理",
        范围: "远距离",
        伤害: "d6+11",
        负荷: "双手",
        特性名称: "弹跳",
        描述: "标记任意压力点，可同时攻击范围内等量的敌人。",
    },
    {
        名称: "安塔利弓",
        等级: "T4",
        检定: "灵巧",
        属性: "物理",
        范围: "远距离",
        伤害: "d6+11",
        负荷: "双手",
        特性名称: "可靠",
        描述: "你的攻击掷骰+1。",
    },
    {
        名称: "手炮",
        等级: "T4",
        检定: "灵巧",
        属性: "物理",
        范围: "极远",
        伤害: "d6+12",
        负荷: "单手",
        特性名称: "装填",
        描述: "攻击后掷一个d6，掷出1时，下次攻击前你必须标记 1 压力点进行装填。",
    },

    // 位阶4 (等级8-10) - 魔法武器
    {
        名称: "传奇奥术护手",
        等级: "T4",
        检定: "力量",
        属性: "魔法",
        范围: "近战",
        伤害: "d10+12",
        负荷: "双手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "传奇圣斧",
        等级: "T4",
        检定: "力量",
        属性: "魔法",
        范围: "近战",
        伤害: "d8+10",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "传奇发光戒指",
        等级: "T4",
        检定: "敏捷",
        属性: "魔法",
        范围: "邻近",
        伤害: "d10+11",
        负荷: "双手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "传奇手持符文",
        等级: "T4",
        检定: "本能",
        属性: "魔法",
        范围: "邻近",
        伤害: "d10+9",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "传奇回力剑",
        等级: "T4",
        检定: "灵巧",
        属性: "魔法",
        范围: "近距离",
        伤害: "d8+9",
        负荷: "单手",
        特性名称: "回力",
        描述: "当此武器在射程内被投掷后，会在完成攻击的瞬间重新出现在你手中。",
    },
    {
        名称: "传奇短杖",
        等级: "T4",
        检定: "本能",
        属性: "魔法",
        范围: "近距离",
        伤害: "d8+10",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "传奇双手法杖", // JSON "传奇双手法杖" damage d8+12, desc ""
        等级: "T4", // Original TS had d6+9 (likely meant for 传奇权杖 or 传奇巨杖)
        检定: "本能",
        属性: "魔法",
        范围: "远距离",
        伤害: "d8+12", // Corrected
        负荷: "双手",
        特性名称: "", // Corrected
        描述: "",    // Corrected
    },
    {
        名称: "传奇权杖", // JSON "传奇权杖" damage d6+9, desc "**多用：**这把武器也可以此方式使用 - 本能 近战 d8+6。"
        等级: "T4", // Original TS had "单手"
        检定: "风度",
        属性: "魔法",
        范围: "远距离",
        伤害: "d6+9",
        负荷: "双手", // Corrected
        特性名称: "多用", // Corrected
        描述: "这把武器也可以此方式使用 - 本能 近战 d8+6。", // Corrected
    },
    {
        名称: "传奇魔杖",
        等级: "T4",
        检定: "知识",
        属性: "魔法",
        范围: "远距离",
        伤害: "d6+10",
        负荷: "单手",
        特性名称: "",
        描述: "",
    },
    {
        名称: "传奇巨杖",
        等级: "T4",
        属性: "魔法",
        范围: "极远",
        检定: "知识",
        伤害: "d6+9",
        负荷: "双手",
        特性名称: "强力",
        描述: "额外掷一个伤害骰并去掉其中最小的一个。",
    },
    {
        名称: "光焰剑",
        等级: "T4",
        检定: "力量",
        属性: "魔法",
        范围: "近战",
        伤害: "d10+11",
        负荷: "双手",
        特性名称: "烧融",
        描述: "可以切开坚固的材质。",
    },
    {
        名称: "虹吸拳套",
        等级: "T4",
        检定: "风度",
        属性: "魔法",
        范围: "近战",
        伤害: "d10+9",
        负荷: "双手",
        特性名称: "系命", // Corrected
        描述: "在一次成功攻击后掷一个6，如果掷出6则恢复 1 生命点或清除 1 压力点", // Matched JSON (no period in JSON desc)
    },
    {
        名称: "迈达斯镰刀",
        等级: "T4",
        检定: "知识",
        属性: "魔法",
        范围: "近战",
        伤害: "d10+9",
        负荷: "双手",
        特性名称: "贪婪",
        描述: "你可以花费一把金币，使你的伤害掷骰熟练值+1。",
    },
    {
        名称: "漂浮碎刃",
        等级: "T4",
        检定: "本能",
        属性: "魔法",
        范围: "近距离", // Corrected
        伤害: "d8+9",
        负荷: "单手",
        特性名称: "强力",
        描述: "额外掷一个伤害骰并去掉其中最小的一个。",
    },
    { // Data for 蓟弓, original TS had this entry named 蓟弓 but with 血杖's data
        名称: "蓟弓",
        等级: "T4",
        检定: "本能",
        属性: "魔法",
        范围: "远距离",
        伤害: "d6+13", // Corrected to 蓟弓's damage
        负荷: "双手",
        特性名称: "可靠", // Corrected to 蓟弓's trait
        描述: "你的攻击掷骰+1。", // Corrected to 蓟弓's desc
    },
    { // Data for 血杖, original TS had this entry named 血杖 but with 蓟弓's data
        名称: "血杖",
        等级: "T4",
        检定: "本能",
        属性: "魔法",
        范围: "远距离",
        伤害: "d20+7", // Corrected to 血杖's damage
        负荷: "双手",
        特性名称: "苦痛", // Corrected to 血杖's trait
        描述: "每次你使用此武器攻击时，你需标记 1 压力点。", // Corrected to 血杖's desc
    },
    {
        名称: "埃塞克之杖",
        等级: "T4",
        检定: "知识",
        属性: "魔法",
        范围: "远距离",
        伤害: "d8+13",
        负荷: "单手",
        特性名称: "时间扭曲者",
        描述: "你可以在攻击掷骰后选择攻击目标。",
    },
    {
        名称: "魔战士左轮",
        等级: "T4",
        检定: "灵巧",
        属性: "魔法",
        范围: "极远",
        伤害: "d6+13",
        负荷: "单手",
        特性名称: "装填",
        描述: "攻击后掷一个6，如果掷出1，下次攻击前你必须标记 1 压力点进行装填。",
    },
    {
        名称: "融合手套",
        等级: "T4",
        检定: "知识",
        属性: "魔法",
        范围: "极远",
        伤害: "d6+9",
        负荷: "双手",
        特性名称: "绑定",
        描述: "将你的等级数添加到伤害掷骰中。",
    },
];