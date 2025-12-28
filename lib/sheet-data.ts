// types/form-data.ts

import { StandardCard } from "@/card/card-types"

// ===== 多角色系统数据结构 =====
export interface CharacterMetadata {
  id: string          // 唯一ID
  saveName: string    // 存档名称（用户为这个存档起的名字）
  lastModified: string // ISO 日期字符串
  createdAt: string   // ISO 日期字符串
  order: number       // 用于排序
}

export interface CharacterList {
  characters: CharacterMetadata[]  // 最多10个
  activeCharacterId: string | null // 当前活动角色ID
  lastUpdated: string             // ISO 日期字符串
}

// ===== 原有数据结构 =====
export interface SheetCardReference {
  id: string
  name: string
}

/**
 * 升级选项的勾选状态存储
 *
 * ## 存储格式说明
 *
 * CheckedUpgrades 使用**扁平化的 key-value 结构**来存储升级选项的勾选状态。
 *
 * ### Key 格式（checkKey）
 *
 * - **单个 checkbox 的选项**：`"tier{N}-{optionIndex}"`
 *   - 例如：`"tier1-5"` 表示 tier1 的第 5 个选项（闪避值+1）
 *
 * - **多个 checkbox 的选项**：`"tier{N}-{optionIndex}-{boxIndex}"`
 *   - 例如：`"tier1-0-2"` 表示 tier1 的第 0 个选项（属性升级）的第 3 个 checkbox
 *   - 例如：`"tier1-1-0"` 表示 tier1 的第 1 个选项（生命槽）的第 1 个 checkbox
 *
 * - **doubleBox 选项**：`"tier{N}-{optionIndex}"`（两个框作为一组）
 *   - 例如：`"tier2-1"` 表示 tier2 的第 1 个选项（熟练度+1）
 *
 * ### Value 格式
 *
 * Value 是一个 `Record<number, boolean>`，其中：
 * - **Key**：optionIndex（升级选项在列表中的索引）
 * - **Value**：`true` 表示已勾选，`false` 或不存在表示未勾选
 *
 * ### 实际存储示例
 *
 * ```json
 * {
 *   "checkedUpgrades": {
 *     // 保留的基础结构（向后兼容）
 *     "tier1": {},
 *     "tier2": {},
 *     "tier3": {},
 *
 *     // 实际的扁平化存储
 *     "tier1-0-2": { "0": true },    // tier1 第0个选项（属性升级）的第3个checkbox
 *     "tier1-1-0": { "1": true },    // tier1 第1个选项（生命槽）的第1个checkbox
 *     "tier1-5-0": { "5": true },    // tier1 第5个选项（闪避值）的第1个checkbox
 *     "tier2-1": { "1": true }       // tier2 第1个选项（熟练度）doubleBox
 *   }
 * }
 * ```
 *
 * ### 为什么内层还有 optionIndex？
 *
 * 虽然 optionIndex 在外层 key 和内层 key 中都出现了，但这是当前实现的工作方式：
 * - 外层 checkKey 包含完整信息：`tier-optionIndex-boxIndex`
 * - 内层 key 使用 optionIndex 作为索引
 * - 这种冗余设计保证了向后兼容性，并且代码逻辑已经正确运行
 *
 * ### 查询示例
 *
 * ```typescript
 * // 检查 tier1 第0个选项的第3个checkbox是否被勾选
 * const checkKey = "tier1-0-2"
 * const optionIndex = 0
 * const isChecked = checkedUpgrades?.[checkKey]?.[optionIndex]  // 查询 checkedUpgrades["tier1-0-2"][0]
 * ```
 *
 * ### 更新示例
 *
 * ```typescript
 * // 勾选 tier1 第0个选项的第3个checkbox
 * checkedUpgrades["tier1-0-2"] = { 0: true }
 * ```
 *
 * ### 向后兼容性
 *
 * - ✅ 保留 `tier1`, `tier2`, `tier3` 基础结构
 * - ✅ 支持扁平化的 checkKey 格式
 * - ✅ 旧数据可以正常读取（如果存在的话）
 * - ✅ 新数据使用扁平化格式存储
 */
interface CheckedUpgrades {
  tier1: Record<number, boolean>
  tier2: Record<number, boolean>
  tier3: Record<number, boolean>
  // 索引签名：允许任意 checkKey 格式的动态 key
  [checkKey: string]: Record<number, boolean>
}

export interface AttributeValue {
  checked: boolean
  value: string
  spellcasting?: boolean  // 施法属性标记，可选字段确保向后兼容
}

export interface ArmorTemplateData {
  // Basic information
  weaponName?: string
  description?: string
  
  // Iknis configuration
  weaponAttribute?: 'agility' | 'strength' | 'finesse' | 'presence' | 'instinct' | 'knowledge'
  attackRange?: 'melee' | 'near' | 'close' | 'far' | 'very-far'
  customRangeAndDamage?: string
  damageType?: 'physical' | 'tech'
  
  // Upgrade slots (5 slots)
  upgradeSlots?: Array<{
    checked: boolean
    text: string
  }>
  
  // Upgrade system - grouped by tier, using efficient data structure
  upgrades?: {
    basic: Record<string, boolean | boolean[]>  // Basic upgrades, support multiple checkboxes
    tier2: Record<string, boolean | boolean[]>  // Pre-compiled tier 2
    tier3: Record<string, boolean | boolean[]>  // Pre-compiled tier 3
    tier4: Record<string, boolean | boolean[]>  // Pre-compiled tier 4
  }
  
  // Scrap collection system - grouped by dice type
  scrapMaterials?: {
    fragments: number[]   // Fragments (d6) - 6 items: gear, coil, wire, trigger, lens, crystal
    metals: number[]      // Metals (d8) - 6 items: aluminum, copper, cobalt, silver, platinum, gold
    components: number[]  // Components (d10) - 6 items: fuse, circuit, disc, relay, capacitor, battery
    relics: string[]      // Relics - 5 custom text inputs
  }
  
  // Electronic coins
  electronicCoins?: number
}

// ===== 冒险笔记相关类型定义 =====

export interface AdventureNotesCharacterProfile {
  race?: string          // 种族
  age?: string           // 年龄  
  gender?: string        // 性别
  height?: string        // 身高
  weight?: string        // 体重
  skinColor?: string     // 肤色
  eyeColor?: string      // 瞳色
  hairColor?: string     // 发色
  birthplace?: string    // 出生地
  faith?: string         // 信仰/理念
  otherInfo?: string     // 其他信息
}

export interface AdventureNotesPlayerInfo {
  nickname?: string      // 昵称
  preference?: string    // 偏好
  activeTime?: string    // 活动时间
  playStyle?: string     // 游戏风格
}

export interface AdventureLogEntry {
  name?: string          // 冒险名称
  levelRange?: string    // 等级跨度
  trauma?: string        // 创伤
  date?: string          // 时间
}

export interface AdventureNotesData {
  // 角色简介（左栏上部）
  characterProfile?: AdventureNotesCharacterProfile
  
  // 玩家信息（左栏下部）
  playerInfo?: AdventureNotesPlayerInfo
  
  // 故事内容（右栏）
  backstory?: string       // 背景故事
  milestones?: string      // 大事记
  
  // 冒险履历（右栏底部，动态数组）
  adventureLog?: AdventureLogEntry[]
}

export interface SheetData {
  // 通用属性
  name: string
  characterImage?: string
  level: string
  proficiency: number | boolean[]
  ancestry1?: string
  ancestry2?: string
  profession: string
  community: string
  subclass?: string

  // New fields for storing full card references to avoid compatibility issues
  professionRef?: SheetCardReference
  ancestry1Ref?: SheetCardReference
  ancestry2Ref?: SheetCardReference
  communityRef?: SheetCardReference
  subclassRef?: SheetCardReference

  evasion?: string
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
  hope: number        // 当前希望值 (0-hopeMax)
  hopeMax?: number    // 希望最大值，默认6
  hp?: boolean[]
  stress?: boolean[]
  armorBoxes?: boolean[]
  inventory: string[]
  characterBackground?: string
  characterAppearance?: string
  characterMotivation?: string
  cards: StandardCard[]
  inventory_cards?: StandardCard[] // 新增：库存卡组
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
  trainingOptions: {
    intelligent: boolean[]
    radiantInDarkness: boolean[]
    creatureComfort: boolean[]
    armored: boolean[]
    vicious: boolean[]
    resilient: boolean[]
    bonded: boolean[]
    aware: boolean[]
  }
  // ===== 多角色系统新增字段已移除 focused_card_ids =====
  // focused_card_ids 字段已被移除，聚焦功能由 cards 数组直接表示
  
  // ===== 页面可见性控制 =====
  includePageThreeInExport?: boolean // @deprecated 使用 pageVisibility 代替
  pageVisibility?: {
    rangerCompanion: boolean  // 游侠伙伴页
    armorTemplate: boolean    // 护甲模板页
    adventureNotes: boolean   // 冒险笔记页
    // 未来可添加更多页面
  }

  // ===== 护甲模板数据 =====
  armorTemplate?: ArmorTemplateData

  // ===== 冒险笔记数据 =====
  adventureNotes?: AdventureNotesData

  // ===== 临时索引签名，兼容动态key访问，后续逐步收敛类型安全 =====
  // [key: string]: any // 已废弃，彻底类型安全后移除
}

