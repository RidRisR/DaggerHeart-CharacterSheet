import { createEmptyCard, type StandardCard } from "@/card/card-types";
import type { SheetData } from "./sheet-data";

export const defaultSheetData: SheetData = {
    name: "",
    characterImage: "",
    level: "",
    proficiency: [false, false, false, false, false, false], // Default as boolean array
    ancestry1: "",
    ancestry2: "",
    profession: "",
    community: "",
    subclass: "",
    // Initialize new Ref fields
    professionRef: { id: "", name: "" },
    ancestry1Ref: { id: "", name: "" },
    ancestry2Ref: { id: "", name: "" },
    communityRef: { id: "", name: "" },
    subclassRef: { id: "", name: "" },

    evasion: "",

    agility: { checked: false, value: "", spellcasting: false },
    strength: { checked: false, value: "", spellcasting: false },
    finesse: { checked: false, value: "", spellcasting: false },
    instinct: { checked: false, value: "", spellcasting: false },
    presence: { checked: false, value: "", spellcasting: false },
    knowledge: { checked: false, value: "", spellcasting: false },

    gold: Array(20).fill(false),
    experience: ["", "", "", "", ""],
    experienceValues: ["", "", "", "", ""],
    hope: Array(6).fill(false),

    hp: Array(18).fill(false),
    stress: Array(18).fill(false),
    hpMax: 6, // Defaulting to 6 as it's a common base
    stressMax: 6, // Defaulting to 6 as it's a common base

    armorBoxes: Array(12).fill(false),
    armorValue: "",
    armorBonus: "",
    armorMax: 0,

    minorThreshold: "",
    majorThreshold: "",

    inventory: ["", "", "", "", ""],
    characterBackground: "",
    characterAppearance: "",
    characterMotivation: "",

    cards: Array(20).fill(0).map(() => createEmptyCard()),          // 聚焦卡组（20张）
    inventory_cards: Array(20).fill(0).map(() => createEmptyCard()), // 库存卡组（20张）

    checkedUpgrades: {
        tier1: {},
        tier2: {},
        tier3: {},
    },

    primaryWeaponName: "",
    primaryWeaponTrait: "",
    primaryWeaponDamage: "",
    primaryWeaponFeature: "",
    secondaryWeaponName: "",
    secondaryWeaponTrait: "",
    secondaryWeaponDamage: "",
    secondaryWeaponFeature: "",

    armorName: "",
    armorBaseScore: "",
    armorThreshold: "",
    armorFeature: "",

    inventoryWeapon1Name: "",
    inventoryWeapon1Trait: "",
    inventoryWeapon1Damage: "",
    inventoryWeapon1Feature: "",
    inventoryWeapon1Primary: false,
    inventoryWeapon1Secondary: false,
    inventoryWeapon2Name: "",
    inventoryWeapon2Trait: "",
    inventoryWeapon2Damage: "",
    inventoryWeapon2Feature: "",
    inventoryWeapon2Primary: false,
    inventoryWeapon2Secondary: false,

    // Companion fields
    companionImage: "",
    companionName: "",
    companionDescription: "",
    companionRange: "",
    companionStress: Array(18).fill(false),
    companionEvasion: "",
    companionStressMax: 0,
    companionWeapon: "",
    companionExperience: ["", "", "", "", ""],
    companionExperienceValue: ["", "", "", "", ""],

    // Training options
    trainingOptions: {
        intelligent: Array(3).fill(false),
        radiantInDarkness: [false],
        creatureComfort: [false],
        armored: [false],
        vicious: Array(3).fill(false),
        resilient: Array(3).fill(false),
        bonded: [false],
        aware: Array(3).fill(false),
    },

    // 注释：移除了 focused_card_ids 字段，聚焦功能由双卡组系统取代

    // 第三页导出控制
    includePageThreeInExport: true, // @deprecated 向后兼容
    pageVisibility: {
        rangerCompanion: true,  // 默认显示游侠伙伴页
        armorTemplate: true     // 默认显示护甲模板页
    },
};
