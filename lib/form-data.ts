// types/form-data.ts

import { StandardCard } from "@/data/card/card-types"

export interface WeaponData {
  name: string
  damage: string
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
  characterImage?: string
  level: number
  proficiency: number | boolean[]
  ancestry1?: string
  ancestry2?: string
  profession: string
  community: string
  agility?: AttributeValue
  strength?: AttributeValue
  finesse?: AttributeValue
  instinct?: AttributeValue
  presence?: AttributeValue
  knowledge?: AttributeValue
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
  // ===== 新增：补充组件实际引用但未定义的字段 =====
  // 伙伴相关
  companionImage?: string
  companionDescription?: string
  companionRange?: string
  companionStress?: boolean[]
  companionEvasion?: string
  companionStressMax?: number
  // 其他页面引用但未定义字段
  evasion?: string
  subclass?: string
  // ===== 伙伴基础信息（page-three） =====
  companionName?: string // 伙伴名称
  companionWeapon?: string // 伙伴武器/攻击方式
  // ===== 伙伴训练选项（page-three） =====
  trainingIntelligent?: boolean[] // 聪慧训练（3格）
  trainingRadiantInDarkness?: boolean[] // 黑暗中的光芒训练（1格）
  trainingCreatureComfort?: boolean[] // 生物慰藉训练（1格）
  trainingArmored?: boolean[] // 装甲训练（1格）
  trainingVicious?: boolean[] // 凶猛训练（3格）
  trainingResilient?: boolean[] // 坚韧训练（3格）
  trainingBonded?: boolean[] // 羁绊训练（1格）
  trainingAware?: boolean[] // 警觉训练（3格）
  // ===== 临时索引签名，兼容动态key访问，后续逐步收敛类型安全 =====
  // [key: string]: any // 已废弃，彻底类型安全后移除
}
