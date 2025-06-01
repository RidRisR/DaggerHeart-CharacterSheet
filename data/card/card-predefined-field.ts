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
import { CustomCardStorage } from './custom-card-storage';

// Define categories for custom names (must match what will be used in UI/logic)
const CATEGORIES = {
    PROFESSION: 'profession',
    ANCESTRY: 'ancestry',
    COMMUNITY: 'community',
    SUBCLASS: 'subclass',
    DOMAIN: 'domain'
};

// Getter functions
export function getProfessionCardNames(): string[] {
    const defaultNames = [...PROFESSION_CARD_NAMES];
    const customNames = CustomCardStorage.loadCustomFieldNames(CATEGORIES.PROFESSION);
    return [...new Set([...defaultNames, ...customNames])];
}

export function getAncestryCardNames(): string[] {
    const defaultNames = [...ANCESTRY_CARD_NAMES];
    const customNames = CustomCardStorage.loadCustomFieldNames(CATEGORIES.ANCESTRY);
    return [...new Set([...defaultNames, ...customNames])];
}

export function getCommunityCardNames(): string[] {
    const defaultNames = [...COMMUNITY_CARD_NAMES];
    const customNames = CustomCardStorage.loadCustomFieldNames(CATEGORIES.COMMUNITY);
    return [...new Set([...defaultNames, ...customNames])];
}

export function getSubClassCardNames(): string[] {
    // Subclass names are now directly derived from profession names.
    // This includes default professions and any custom professions added.
    return getProfessionCardNames();
}

export function getDomainCardNames(): string[] {
    const defaultNames = [...DOMAIN_CARD_NAMES];
    const customNames = CustomCardStorage.loadCustomFieldNames(CATEGORIES.DOMAIN);
    return [...new Set([...defaultNames, ...customNames])];
}

// Functions to add custom names (example for one category, repeat for others)
export function addCustomProfessionName(name: string): void {
    const currentCustomNames = CustomCardStorage.loadCustomFieldNames(CATEGORIES.PROFESSION);
    if (!currentCustomNames.includes(name)) {
        CustomCardStorage.saveCustomFieldNames(CATEGORIES.PROFESSION, [...currentCustomNames, name]);
    }
}

export function addCustomAncestryName(name: string): void {
    const currentCustomNames = CustomCardStorage.loadCustomFieldNames(CATEGORIES.ANCESTRY);
    if (!currentCustomNames.includes(name)) {
        CustomCardStorage.saveCustomFieldNames(CATEGORIES.ANCESTRY, [...currentCustomNames, name]);
    }
}

export function addCustomCommunityName(name: string): void {
    const currentCustomNames = CustomCardStorage.loadCustomFieldNames(CATEGORIES.COMMUNITY);
    if (!currentCustomNames.includes(name)) {
        CustomCardStorage.saveCustomFieldNames(CATEGORIES.COMMUNITY, [...currentCustomNames, name]);
    }
}

export function addCustomSubClassName(name: string): void {
    // This function is now a no-op as subclass names are derived from professions
    // and are not independently customizable through this mechanism.
    console.warn(`[card-predefined-field] addCustomSubClassName called with '${name}', but subclass names are now derived from professions and not stored separately.`);
    // No longer saves to CustomCardStorage for CATEGORIES.SUBCLASS
}

export function addCustomDomainName(name: string): void {
    const currentCustomNames = CustomCardStorage.loadCustomFieldNames(CATEGORIES.DOMAIN);
    if (!currentCustomNames.includes(name)) {
        CustomCardStorage.saveCustomFieldNames(CATEGORIES.DOMAIN, [...currentCustomNames, name]);
    }
}

// (Optional) Functions to remove custom names can be added here if needed
