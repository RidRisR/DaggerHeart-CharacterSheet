export const PROFESSION_CARD_NAMES: string[] = [
    "吟游诗人", "德鲁伊", "守护者", "游侠", "游荡者", "神使", "术士", "战士", "法师"
];

export const ANCESTRY_CARD_NAMES: string[] = [
    "械灵", "魔裔", "龙人", "矮人", "精灵", "仙灵", "羊蹄人", "费尔博格", "孢菌人", "龟人", "巨人", "哥布林", "半身人", "人类", "猫族", "兽人", "蛙裔", "猿族"
];

export const COMMUNITY_CARD_NAMES: string[] = [
    "高城之民", "博识之民", "结社之民", "山岭之民", "滨海之民", "法外之民", "地下之民", "漂泊之民", "荒野之民"
];

export const DOMAIN_CARD_NAMES: string[] = [
    "奥术", "利刃", "骸骨", "典籍", "优雅", "午夜", "贤者", "辉耀", "勇气"
];

export type SubClassClass = string;
export type ProfessionClass = string;
export type AncestryClass = string;
export type CommunityClass = string;
export type DomainClass = string;

// Import storage functions
import { CustomCardStorage } from './card-storage';

// Getter functions
export function getProfessionCardNames(): string[] {
    const defaultNames = [...PROFESSION_CARD_NAMES];
    const aggregatedCustomFields = CustomCardStorage.getAggregatedCustomFieldNames();
    const customNames = aggregatedCustomFields.profession || [];
    return [...new Set([...defaultNames, ...customNames])];
}

export function getAncestryCardNames(): string[] {
    const defaultNames = [...ANCESTRY_CARD_NAMES];
    const aggregatedCustomFields = CustomCardStorage.getAggregatedCustomFieldNames();
    const customNames = aggregatedCustomFields.ancestry || [];
    return [...new Set([...defaultNames, ...customNames])];
}

export function getCommunityCardNames(): string[] {
    const defaultNames = [...COMMUNITY_CARD_NAMES];
    const aggregatedCustomFields = CustomCardStorage.getAggregatedCustomFieldNames();
    const customNames = aggregatedCustomFields.community || [];
    return [...new Set([...defaultNames, ...customNames])];
}

export function getSubClassCardNames(): string[] {
    // Subclass names are now directly derived from profession names.
    // This includes default professions and any custom professions added.
    return getProfessionCardNames();
}

export function getDomainCardNames(): string[] {
    const defaultNames = [...DOMAIN_CARD_NAMES];
    const aggregatedCustomFields = CustomCardStorage.getAggregatedCustomFieldNames();
    const customNames = aggregatedCustomFields.domain || [];
    return [...new Set([...defaultNames, ...customNames])];
}

// Note: Custom field names are now managed per-batch during card pack import/deletion.
// The add functions below are deprecated and no longer used.
// Custom field names are automatically aggregated from all enabled card packs.

// (Optional) Functions to remove custom names can be added here if needed
