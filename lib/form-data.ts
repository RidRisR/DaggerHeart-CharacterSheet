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
  weapons: WeaponData[]
  // ===== 动态伙伴经验重构为数组结构 =====
  companionExperience?: string[]
  companionExperienceValue?: string[]
  // ===== 统一为数组类型的字段 =====
  gold: boolean[]
  experience: string[]
  hope: boolean[]
  hp?: boolean[]
  stress?: boolean[]
  armorBoxes?: boolean[]
  inventory: string[]
  characterBackground?: string
  characterAppearance?: string
  characterMotivation?: string
  cards: StandardCard[]
  checkedUpgrades: CheckedUpgrades
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
  // ===== 临时索引签名，兼容动态key访问，后续逐步收敛类型安全 =====
  // [key: string]: any // 已废弃，彻底类型安全后移除
}
