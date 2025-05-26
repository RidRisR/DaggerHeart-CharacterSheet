// types/form-data.ts

import { StandardCard } from "@/data/card/card-types"

export interface WeaponData {
  name: string
  damage: string
  type: string
  properties: string[]
  description: string
}

export interface ArmorData {
  name: string
  armorClass: number
  type: string
  properties: string[]
  description: string
}

export interface CheckedUpgrades {
  tier1: Record<number, boolean>
  tier2: Record<number, boolean>
  tier3: Record<number, boolean>
}

export interface AttributeValue {
  checked: boolean
  value: string
}

export interface FormData {
  // 通用属性
  name: string
  level: number
  proficiency: number | boolean[]
  ancestry: string
  ancestry1?: string
  ancestry2?: string
  profession: string
  community: string
  strength: number | AttributeValue
  dexterity?: number
  intelligence?: number
  wisdom?: number
  charisma?: number
  constitution?: number
  agility?: AttributeValue
  finesse?: AttributeValue
  instinct?: AttributeValue
  presence?: AttributeValue
  knowledge?: AttributeValue
  maxHitPoints?: number
  currentHitPoints?: number
  temporaryHitPoints?: number
  armor: ArmorData | string
  armorBoxes?: boolean[]
  weapons: WeaponData[]
  gold: number | boolean[]
  silver?: number
  copper?: number
  inventory: string[]
  experience: number | string[]
  experienceValues?: string[]
  hope: number | boolean[]
  characterBackground?: string
  characterAppearance?: string
  characterMotivation?: string
  cards: StandardCard[]
  checkedUpgrades: CheckedUpgrades
  hp?: boolean[]
  stress?: boolean[]
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
  // ===== 新增：补充组件实际引用但未定义的字段 =====
  // 伙伴相关
  companionExperience1?: string
  companionExperience2?: string
  companionExperience3?: string
  companionExperience4?: string
  companionExperience5?: string
  companionExperienceValue1?: string
  companionExperienceValue2?: string
  companionExperienceValue3?: string
  companionExperienceValue4?: string
  companionExperienceValue5?: string
  companionImage?: string
  companionDescription?: string
  companionRange?: string
  companionStress?: boolean[]
  companionEvasion?: string
  companionStressMax?: number
  // 其他页面引用但未定义字段
  characterName?: string
  evasion?: string
  subclass?: string
}
