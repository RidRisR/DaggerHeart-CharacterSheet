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

    agility: { checked: false, value: "" },
    strength: { checked: false, value: "" },
    finesse: { checked: false, value: "" },
    instinct: { checked: false, value: "" },
    presence: { checked: false, value: "" },
    knowledge: { checked: false, value: "" },

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

    cards: Array(20).fill(0).map(() => createEmptyCard()),

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
};
