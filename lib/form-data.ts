// types/form-data.ts

import { StandardCard } from "@/data/card/card-types"
import { useEffect, useState } from "react"

interface CheckedUpgrades {
  tier1: Record<number, boolean>
  tier2: Record<number, boolean>
  tier3: Record<number, boolean>
}

export interface CharacterAttributeValue {
  checked: boolean
  value: string
}

export interface CharacterFormData {
  // 通用属性
  name: string
  characterImage?: string
  level: number
  proficiency: number | boolean[]
  ancestry1?: string
  ancestry2?: string
  profession: string
  community: string
  subclass?: string
  evasion?: string
  agility?: CharacterAttributeValue
  strength?: CharacterAttributeValue
  finesse?: CharacterAttributeValue
  instinct?: CharacterAttributeValue
  presence?: CharacterAttributeValue
  knowledge?: CharacterAttributeValue
  // ===== 动态伙伴经验重构为数组结构 =====
  companionExperience?: string[]
  companionExperienceValue?: string[]
  // ===== 统一为数组类型的字段 =====
  gold: boolean[]
  experience: string[]
  experienceValues?: string[] // 经验数值，与 experience 一一对应
  hope: boolean[]
  hp?: boolean[]
  stress?: boolean[]
  armorBoxes?: boolean[]
  inventory: string[]
  characterBackground?: string
  characterAppearance?: string
  characterMotivation?: string
  cards: StandardCard[]
  checkedUpgrades?: CheckedUpgrades
  minorThreshold?: string
  majorThreshold?: string
  armorValue?: string
  armorBonus?: string
  armorMax?: number
  hpMax?: number
  stressMax?: number
  primaryWeaponName?: string
  primaryWeaponTrait?: string
  primaryWeaponDamage?: string
  primaryWeaponFeature?: string
  secondaryWeaponName?: string
  secondaryWeaponTrait?: string
  secondaryWeaponDamage?: string
  secondaryWeaponFeature?: string
  armorName?: string
  armorBaseScore?: string
  armorThreshold?: string
  armorFeature?: string
  inventoryWeapon1Name?: string
  inventoryWeapon1Trait?: string
  inventoryWeapon1Damage?: string
  inventoryWeapon1Feature?: string
  inventoryWeapon1Primary?: boolean
  inventoryWeapon1Secondary?: boolean
  inventoryWeapon2Name?: string
  inventoryWeapon2Trait?: string
  inventoryWeapon2Damage?: string
  inventoryWeapon2Feature?: string
  inventoryWeapon2Primary?: boolean
  inventoryWeapon2Secondary?: boolean
  // 伙伴相关
  companionImage?: string
  companionDescription?: string
  companionRange?: string
  companionStress?: boolean[]
  companionEvasion?: string
  companionStressMax?: number
  // ===== 伙伴基础信息（page-three） =====
  companionName?: string // 伙伴名称
  companionWeapon?: string // 伙伴武器/攻击方式
  // ===== 伙伴训练选项（page-three） =====
  trainingOptions?: {
    intelligent: boolean[]
    radiantInDarkness: boolean[]
    creatureComfort: boolean[]
    armored: boolean[]
    vicious: boolean[]
    resilient: boolean[]
    bonded: boolean[]
    aware: boolean[]
  }
  // ===== 临时索引签名，兼容动态key访问，后续逐步收敛类型安全 =====
  // [key: string]: any // 已废弃，彻底类型安全后移除
}

// --- Selector Functions ---
export const getCharacterName = (formData: CharacterFormData): string => formData.name;
export const getCharacterLevel = (formData: CharacterFormData): number => formData.level;
export const getAncestry1Id = (formData: CharacterFormData): string | undefined => formData.ancestry1;
export const getProfessionId = (formData: CharacterFormData): string => formData.profession;
export const getAllCardsFromData = (formData: CharacterFormData): StandardCard[] => formData.cards || [];

// 通用 selector：允许通过 key 获取任意字段
export function getFormDataField<T = any>(formData: CharacterFormData, key: keyof CharacterFormData): T {
  return formData[key] as T;
}

// --- Mutator Functions ---
// Note: These return new FormData objects for immutability

export const updateCharacterName = (formData: CharacterFormData, newName: string): CharacterFormData => ({
  ...formData,
  name: newName,
});

export const updateCharacterLevel = (formData: CharacterFormData, newLevel: number): CharacterFormData => ({
  ...formData,
  level: newLevel,
});

export const updateAncestry1Id = (formData: CharacterFormData, newAncestry1Id?: string): CharacterFormData => ({
  ...formData,
  ancestry1: newAncestry1Id,
});

export const updateProfessionId = (formData: CharacterFormData, newProfessionId: string): CharacterFormData => ({
  ...formData,
  profession: newProfessionId,
});

export const setCardsInData = (formData: CharacterFormData, newCards: StandardCard[]): CharacterFormData => ({
  ...formData,
  cards: newCards,
});

export const addCardToData = (formData: CharacterFormData, newCard: StandardCard): CharacterFormData => ({
  ...formData,
  cards: [...(formData.cards || []), newCard],
});

// 通用 mutator：允许通过 key 更新任意字段
export function updateFormDataField<T = any>(formData: CharacterFormData, key: keyof CharacterFormData, value: T): CharacterFormData {
  return {
    ...formData,
    [key]: value,
  };
}

// 生成默认 FormData
export function getDefaultCharacterFormData(): CharacterFormData {
  return {
    name: '',
    characterImage: '',
    level: 1,
    proficiency: 0,
    ancestry1: '',
    ancestry2: '',
    profession: '',
    community: '',
    subclass: '',
    evasion: '',
    agility: { checked: false, value: '' },
    strength: { checked: false, value: '' },
    finesse: { checked: false, value: '' },
    instinct: { checked: false, value: '' },
    presence: { checked: false, value: '' },
    knowledge: { checked: false, value: '' },
    companionExperience: [],
    companionExperienceValue: [],
    gold: Array(15).fill(false),
    experience: [],
    experienceValues: [],
    hope: Array(10).fill(false),
    hp: Array(18).fill(false),
    stress: Array(18).fill(false),
    armorBoxes: Array(12).fill(false),
    inventory: [],
    characterBackground: '',
    characterAppearance: '',
    characterMotivation: '',
    cards: [],
    checkedUpgrades: { tier1: {}, tier2: {}, tier3: {} },
    minorThreshold: '',
    majorThreshold: '',
    armorValue: '',
    armorBonus: '',
    armorMax: 0,
    hpMax: 0,
    stressMax: 0,
    primaryWeaponName: '',
    primaryWeaponTrait: '',
    primaryWeaponDamage: '',
    primaryWeaponFeature: '',
    secondaryWeaponName: '',
    secondaryWeaponTrait: '',
    secondaryWeaponDamage: '',
    secondaryWeaponFeature: '',
    armorName: '',
    armorBaseScore: '',
    armorThreshold: '',
    armorFeature: '',
    inventoryWeapon1Name: '',
    inventoryWeapon1Trait: '',
    inventoryWeapon1Damage: '',
    inventoryWeapon1Feature: '',
    inventoryWeapon1Primary: false,
    inventoryWeapon1Secondary: false,
    inventoryWeapon2Name: '',
    inventoryWeapon2Trait: '',
    inventoryWeapon2Damage: '',
    inventoryWeapon2Feature: '',
    inventoryWeapon2Primary: false,
    inventoryWeapon2Secondary: false,
    companionImage: '',
    companionDescription: '',
    companionRange: '',
    companionStress: Array(10).fill(false),
    companionEvasion: '',
    companionStressMax: 0,
    companionName: '',
    companionWeapon: '',
    trainingOptions: {
      intelligent: Array(3).fill(false),
      radiantInDarkness: Array(3).fill(false),
      creatureComfort: Array(3).fill(false),
      armored: Array(3).fill(false),
      vicious: Array(3).fill(false),
      resilient: Array(3).fill(false),
      bonded: Array(3).fill(false),
      aware: Array(3).fill(false),
    },
  };
}

// 类型安全 props 支持
export interface CharacterFormDataReadonlyProps {
  formData: CharacterFormData;
}

export interface CharacterFormDataEditProps {
  formData: CharacterFormData;
  setFormData: React.Dispatch<React.SetStateAction<CharacterFormData>>;
}

export interface CharacterFormDataChangeProps {
  formData: CharacterFormData;
  onFormDataChange: (fd: CharacterFormData) => void;
}

// 单例 FormData 管理器
let singletonCharacterFormData: CharacterFormData | null = null
let singletonSetCharacterFormData: ((updater: (prev: CharacterFormData) => CharacterFormData) => void) | null = null

export function useSingletonCharacterFormData(initialValue: CharacterFormData): [CharacterFormData, (updater: (prev: CharacterFormData) => CharacterFormData) => void] {
  const [formData, setFormData] = useState<CharacterFormData>(() => {
    if (singletonCharacterFormData) return singletonCharacterFormData;
    singletonCharacterFormData = initialValue;
    return initialValue;
  });

  if (!singletonSetCharacterFormData) {
    singletonSetCharacterFormData = (updater) => {
      singletonCharacterFormData = updater(singletonCharacterFormData!);
      setFormData(singletonCharacterFormData);
    };
  }

  useEffect(() => {
    singletonCharacterFormData = formData;
  }, [formData]);

  return [formData, singletonSetCharacterFormData!];
}

export type { CharacterFormData };
