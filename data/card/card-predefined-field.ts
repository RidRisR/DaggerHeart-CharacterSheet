export const PROFESSION_CARD_NAMES = [
    "吟游诗人", "德鲁伊", "守护者", "游侠", "游荡者", "神使", "术士", "战士", "法师"
] as const;

export const ANCESTRY_CARD_NAMES = [
    "械灵", "魔裔", "龙人", "矮人", "精灵", "仙灵", "羊蹄人", "费尔博格", "孢菌人", "龟人", "巨人", "哥布林", "半身人", "人类", "猫族", "兽人", "蛙裔", "猿族"
] as const;

export const COMMUNITY_CARD_NAMES = [
    "高城之民", "博识之民", "结社之民", "山岭之民", "滨海之民", "法外之民", "地下之民", "漂泊之民", "荒野之民"
] as const;

export const SUBCLASS_CARD_NAMES = [
    "吟游诗人", "德鲁伊", "守护者", "游侠", "游荡者", "神使", "术士", "战士", "法师"
] as const;

export const DOMAIN_CARD_NAMES = [
    "奥术", "利刃", "骸骨", "典籍", "优雅", "午夜", "贤者", "辉耀", "勇气"
] as const;

export type SubClassClass = typeof SUBCLASS_CARD_NAMES[number];
export type ProfessionClass = typeof PROFESSION_CARD_NAMES[number];
export type AncestryClass = typeof ANCESTRY_CARD_NAMES[number];
export type CommunityClass = typeof COMMUNITY_CARD_NAMES[number];
export type DomainClass = typeof DOMAIN_CARD_NAMES[number];
