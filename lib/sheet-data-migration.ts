/**
 * SheetData 迁移模块
 * 
 * 提供统一的数据迁移接口，处理各种历史数据格式的兼容性问题
 * 
 * 主要功能：
 * 1. 页面可见性字段迁移（includePageThreeInExport -> pageVisibility）
 * 2. inventory_cards 字段添加
 * 3. 属性施法标记迁移
 * 4. 其他历史兼容性处理
 */

import type { SheetData, AttributeValue } from './sheet-data'
import { defaultSheetData } from './default-sheet-data'
import { createEmptyCard, isEmptyCard, type StandardCard } from '@/card/card-types'
import { armorItems } from "@/data/list/armor"
import { allWeapons, type AllWeapon } from "@/data/list/all-weapons"
import { primaryWeapons, type Weapon } from "@/data/list/primary-weapon"
import { secondaryWeapons } from "@/data/list/secondary-weapon"
import { upgradeOptionsData } from "@/data/list/upgrade"
import {
  CURRENT_SCHEMA_VERSION,
  V3_SCHEMA_VERSION,
  assertSupportedSchemaVersion,
  detectSchemaVersion,
} from './sheet-schema-version'
import {
  createEquipmentContributionId,
  sanitizeEquipmentModifierContributions,
} from "@/automation/equipment/contribution-utils"
import { createEmptyEquipmentData } from "@/automation/equipment/defaults"
import {
  createArmorSlotFromBuiltinTemplate,
  createWeaponSlotFromBuiltinTemplate,
} from "@/automation/equipment/template-to-slot"
import { parseArmorMax, parseArmorThreshold } from "@/automation/equipment/armor-utils"
import type { ArmorSlot, WeaponSlot } from "@/automation/equipment/types"
import { tryParseNumber } from "@/lib/number-utils"
import { collectModifierEntries, getReferenceSummary } from "@/automation/core/registry"
import { reconcileModifierState } from "@/automation/core/reconcile"
import {
  createUnknownMigrationDifference,
  getOtherAdjustmentId,
  removeOtherAdjustment,
  sanitizeOtherAdjustments,
  upsertOtherAdjustment,
} from "@/automation/core/other-adjustments"
import {
  createEstimatedBaseContribution,
  getEstimatedBaseId,
  getUnattributedDeltaId,
  isEstimatedBaseContribution,
  isUnattributedDeltaContribution,
} from "@/automation/core/special-contributions"
import { writeTargetValue } from "@/automation/core/target-accessors"
import { mergeUpgradeState, sanitizeUpgradeStates } from "@/automation/core/upgrade-states"
import type {
  ModifierContribution,
  ModifierEntryKind,
  ModifierTargetId,
  UpgradeAutomationMetadata,
  UpgradeState,
  UpgradeStates,
} from "@/automation/core/types"

const V1_SCHEMA_VERSION = 1
const V2_SCHEMA_VERSION = 2

type LegacyEquipmentInput = Partial<SheetData> & {
  primaryWeaponName?: string
  primaryWeaponTrait?: string
  primaryWeaponDamage?: string
  primaryWeaponFeature?: string
  secondaryWeaponName?: string
  secondaryWeaponTrait?: string
  secondaryWeaponDamage?: string
  secondaryWeaponFeature?: string
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
  armorName?: string
  armorBaseScore?: string
  armorThreshold?: string
  armorFeature?: string
  armorValue?: string
}

export const LEGACY_EQUIPMENT_KEYS = [
  "primaryWeaponName",
  "primaryWeaponTrait",
  "primaryWeaponDamage",
  "primaryWeaponFeature",
  "secondaryWeaponName",
  "secondaryWeaponTrait",
  "secondaryWeaponDamage",
  "secondaryWeaponFeature",
  "inventoryWeapon1Name",
  "inventoryWeapon1Trait",
  "inventoryWeapon1Damage",
  "inventoryWeapon1Feature",
  "inventoryWeapon1Primary",
  "inventoryWeapon1Secondary",
  "inventoryWeapon2Name",
  "inventoryWeapon2Trait",
  "inventoryWeapon2Damage",
  "inventoryWeapon2Feature",
  "inventoryWeapon2Primary",
  "inventoryWeapon2Secondary",
  "armorName",
  "armorBaseScore",
  "armorThreshold",
  "armorFeature",
  "armorValue",
] as const

/**
 * 迁移选项接口
 */
export interface MigrationOptions {
  // 保留接口以保持向后兼容，但不再需要
}

/**
 * 页面可见性字段迁移
 * 将旧的 includePageThreeInExport 转换为新的 pageVisibility 结构
 */
function migratePageVisibility(data: SheetData): SheetData {
  // 如果已经有新字段，直接返回
  if (data.pageVisibility) {
    return data
  }

  const migrated = { ...data }
  
  if ('includePageThreeInExport' in data && data.includePageThreeInExport !== undefined) {
    migrated.pageVisibility = {
      rangerCompanion: data.includePageThreeInExport,
      armorTemplate: false, // 默认隐藏护甲模板页
      adventureNotes: false // 默认隐藏冒险笔记页
    }
    console.log('[Migration] Migrated includePageThreeInExport to pageVisibility')
  } else {
    // 如果没有相关字段，使用默认值
    migrated.pageVisibility = {
      rangerCompanion: false,
      armorTemplate: false,
      adventureNotes: false
    }
    console.log('[Migration] Added default pageVisibility')
  }

  return migrated
}

/**
 * inventory_cards 字段迁移
 * 为缺少库存卡牌字段的旧数据添加空卡牌数组
 */
function migrateInventoryCards(data: SheetData): SheetData {
  if (data.inventory_cards) {
    return data
  }

  const migrated = { ...data }
  migrated.inventory_cards = Array(20).fill(0).map(() => createEmptyCard())
  console.log('[Migration] Added inventory_cards field')

  return migrated
}

/**
 * 属性施法标记迁移
 * 为旧的属性数据添加 spellcasting 字段
 */
function migrateAttributeSpellcasting(data: SheetData): SheetData {
  const migrated = { ...data }
  let hasChanges = false

  const attributeKeys: (keyof SheetData)[] = ['agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge']
  
  attributeKeys.forEach(key => {
    const attrValue = migrated[key] as AttributeValue | undefined
    if (attrValue && typeof attrValue === 'object' && 'checked' in attrValue && 'value' in attrValue) {
      if (!('spellcasting' in attrValue)) {
        (attrValue as AttributeValue).spellcasting = false
        hasChanges = true
      }
    }
  })

  if (hasChanges) {
    console.log('[Migration] Added spellcasting flags to attributes')
  }

  return migrated
}

/**
 * pageVisibility 字段重命名迁移
 * 将旧的 page3 字段重命名为 rangerCompanion
 */
function migratePageVisibilityRename(data: SheetData): SheetData {
  if (!data.pageVisibility) {
    return data
  }

  const migrated = { ...data }
  
  // 如果存在旧的 page3 字段，迁移到新字段名
  if ('page3' in data.pageVisibility) {
    migrated.pageVisibility = {
      ...data.pageVisibility,
      rangerCompanion: (data.pageVisibility as any).page3
    }
    // 删除旧字段
    delete (migrated.pageVisibility as any).page3
    console.log('[Migration] Renamed pageVisibility.page3 to rangerCompanion')
  }

  return migrated
}

/**
 * pageVisibility 字段补充迁移
 * 确保所有必需的字段都存在
 */
function migratePageVisibilityFields(data: SheetData): SheetData {
  if (!data.pageVisibility) {
    return data
  }

  const migrated = { ...data }
  let needsSave = false

  // 确保 adventureNotes 字段存在
  if (!('adventureNotes' in data.pageVisibility)) {
    const currentVisibility = data.pageVisibility as Record<string, boolean>
    migrated.pageVisibility = {
      rangerCompanion: currentVisibility.rangerCompanion ?? false,
      armorTemplate: currentVisibility.armorTemplate ?? false,
      adventureNotes: false // 默认隐藏冒险笔记页
    }
    needsSave = true
    console.log('[Migration] Added missing adventureNotes field to pageVisibility')
  }

  return migrated
}

/**
 * 护甲模板字段迁移
 * 为缺少护甲模板字段的旧数据添加默认结构
 */
function migrateArmorTemplate(data: SheetData): SheetData {
  if (data.armorTemplate) {
    return data
  }

  const migrated = { ...data }
  migrated.armorTemplate = {
    weaponName: '',
    description: '',
    upgradeSlots: Array(5).fill(0).map(() => ({ checked: false, text: '' })),
    upgrades: {
      basic: {},
      tier2: {},
      tier3: {},
      tier4: {}
    },
    scrapMaterials: {
      fragments: Array(6).fill(0),
      metals: Array(6).fill(0),
      components: Array(6).fill(0),
      relics: Array(5).fill('')
    },
    electronicCoins: 0
  }
  
  console.log('[Migration] Added armorTemplate field')
  return migrated
}

/**
 * 冒险笔记字段迁移
 * 为缺少冒险笔记字段的旧数据添加默认结构
 */
function migrateAdventureNotes(data: SheetData): SheetData {
  if (data.adventureNotes) {
    return data
  }

  const migrated = { ...data }
  migrated.adventureNotes = {
    characterProfile: {},
    playerInfo: {},
    backstory: '',
    milestones: '',
    adventureLog: Array(8).fill(null).map(() => ({
      name: '',
      levelRange: '',
      trauma: '',
      date: ''
    }))
  }
  
  console.log('[Migration] Added adventureNotes field')
  return migrated
}

function legacyWeaponSlot(data: LegacyEquipmentInput, prefix: string) {
  return {
    name: String((data as any)[`${prefix}Name`] ?? ""),
    trait: String((data as any)[`${prefix}Trait`] ?? ""),
    damage: String((data as any)[`${prefix}Damage`] ?? ""),
    feature: String((data as any)[`${prefix}Feature`] ?? ""),
    modifierContributions: [],
  }
}

function legacyArmorSlot(data: LegacyEquipmentInput): ArmorSlot {
  return {
    name: String(data.armorName ?? ""),
    baseArmorMax: parseArmorMax(data.armorBaseScore),
    baseThresholds: parseArmorThreshold(data.armorThreshold),
    feature: String(data.armorFeature ?? ""),
    modifierContributions: [],
  }
}

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function normalizedStringField(rawSlot: Record<string, unknown>, fallbackSlot: WeaponSlot | ArmorSlot, key: "name" | "trait" | "damage" | "feature"): string {
  const value = rawSlot[key]
  if (typeof value === "string") return value
  return String((fallbackSlot as any)[key] ?? "")
}

function normalizeWeaponSlot(value: unknown, fallbackSlot: WeaponSlot): WeaponSlot {
  if (!isRecord(value)) {
    return fallbackSlot
  }

  return {
    name: normalizedStringField(value, fallbackSlot, "name"),
    trait: normalizedStringField(value, fallbackSlot, "trait"),
    damage: normalizedStringField(value, fallbackSlot, "damage"),
    feature: normalizedStringField(value, fallbackSlot, "feature"),
    modifierContributions: sanitizeEquipmentModifierContributions(value.modifierContributions),
  }
}

function normalizeArmorSlot(value: unknown, fallbackSlot: ArmorSlot): ArmorSlot {
  if (!isRecord(value)) {
    return fallbackSlot
  }

  const parsedBaseArmorMax = hasOwn(value, "baseArmorMax")
    ? parseArmorMax(value.baseArmorMax)
    : fallbackSlot.baseArmorMax
  const parsedBaseThresholds = hasOwn(value, "baseThresholds")
    ? parseArmorThreshold(value.baseThresholds)
    : fallbackSlot.baseThresholds

  return {
    name: normalizedStringField(value, fallbackSlot, "name"),
    baseArmorMax: parsedBaseArmorMax,
    baseThresholds: parsedBaseThresholds,
    feature: normalizedStringField(value, fallbackSlot, "feature"),
    modifierContributions: sanitizeEquipmentModifierContributions(value.modifierContributions),
  }
}

function normalizeEquipmentFromLegacy(data: SheetData | LegacyEquipmentInput, useExistingEquipment: boolean) {
  const legacy = data as LegacyEquipmentInput
  const equipment = useExistingEquipment && isRecord((data as any).equipment) ? (data as any).equipment : {}
  const weaponSlots = isRecord(equipment.weaponSlots) ? equipment.weaponSlots : {}
  const inventorySlots = Array.isArray(weaponSlots.inventory) ? weaponSlots.inventory : []
  const inventory: [WeaponSlot, WeaponSlot] = [
    normalizeWeaponSlot(
      inventorySlots[0],
      legacyWeaponSlot(legacy, "inventoryWeapon1"),
    ),
    normalizeWeaponSlot(
      inventorySlots[1],
      legacyWeaponSlot(legacy, "inventoryWeapon2"),
    ),
  ]

  return {
    weaponSlots: {
      primary: normalizeWeaponSlot(
        weaponSlots.primary,
        legacyWeaponSlot(legacy, "primaryWeapon"),
      ),
      secondary: normalizeWeaponSlot(
        weaponSlots.secondary,
        legacyWeaponSlot(legacy, "secondaryWeapon"),
      ),
      inventory,
    },
    armorSlot: normalizeArmorSlot(equipment.armorSlot, legacyArmorSlot(legacy)),
  }
}

function normalizeCurrentEquipment(value: unknown) {
  const emptyEquipment = createEmptyEquipmentData()
  const equipment = isRecord(value) ? value : {}
  const weaponSlots = isRecord(equipment.weaponSlots) ? equipment.weaponSlots : {}
  const inventorySlots = Array.isArray(weaponSlots.inventory) ? weaponSlots.inventory : []
  const inventory: [WeaponSlot, WeaponSlot] = [
    normalizeWeaponSlot(
      inventorySlots[0],
      emptyEquipment.weaponSlots.inventory[0],
    ),
    normalizeWeaponSlot(
      inventorySlots[1],
      emptyEquipment.weaponSlots.inventory[1],
    ),
  ]

  return {
    weaponSlots: {
      primary: normalizeWeaponSlot(
        weaponSlots.primary,
        emptyEquipment.weaponSlots.primary,
      ),
      secondary: normalizeWeaponSlot(
        weaponSlots.secondary,
        emptyEquipment.weaponSlots.secondary,
      ),
      inventory,
    },
    armorSlot: normalizeArmorSlot(equipment.armorSlot, emptyEquipment.armorSlot),
  }
}

function stripLegacyEquipmentFields(data: SheetData | LegacyEquipmentInput): SheetData {
  const migrated: any = { ...data }

  LEGACY_EQUIPMENT_KEYS.forEach(key => {
    delete migrated[key]
  })

  return migrated as SheetData
}

function migrateEquipment(data: SheetData | LegacyEquipmentInput, useExistingEquipment: boolean): SheetData {
  const migrated: any = {
    ...data,
    equipment: normalizeEquipmentFromLegacy(data, useExistingEquipment),
  }

  return migrated as SheetData
}

function hasValidEquipmentContributions(slot: WeaponSlot | ArmorSlot): boolean {
  return sanitizeEquipmentModifierContributions(slot.modifierContributions).length > 0
}

function matchingWeaponSlotFromTemplates(
  slot: WeaponSlot,
  templates: readonly (Weapon | AllWeapon)[],
): WeaponSlot | undefined {
  if (hasValidEquipmentContributions(slot)) return undefined

  const matches = templates
    .map(template => createWeaponSlotFromBuiltinTemplate(template, createEquipmentContributionId))
    .filter(templateSlot => templateSlot.name === slot.name && templateSlot.feature === slot.feature)

  return matches.length === 1 ? matches[0] : undefined
}

function matchingArmorSlotFromTemplates(slot: ArmorSlot): ArmorSlot | undefined {
  if (hasValidEquipmentContributions(slot)) return undefined

  const matches = armorItems
    .map(template => createArmorSlotFromBuiltinTemplate(template, createEquipmentContributionId))
    .filter(templateSlot => templateSlot.name === slot.name && templateSlot.feature === slot.feature)

  return matches.length === 1 ? matches[0] : undefined
}

function backfillV1EquipmentContributions(data: SheetData): SheetData {
  const equipment = data.equipment
  const primaryMatch = matchingWeaponSlotFromTemplates(equipment.weaponSlots.primary, primaryWeapons)
  const secondaryMatch = matchingWeaponSlotFromTemplates(equipment.weaponSlots.secondary, secondaryWeapons)
  const inventoryMatches = equipment.weaponSlots.inventory.map(slot =>
    matchingWeaponSlotFromTemplates(slot, allWeapons),
  ) as [WeaponSlot | undefined, WeaponSlot | undefined]
  const armorMatch = matchingArmorSlotFromTemplates(equipment.armorSlot)

  return {
    ...data,
    equipment: {
      weaponSlots: {
        primary: primaryMatch
          ? { ...equipment.weaponSlots.primary, modifierContributions: primaryMatch.modifierContributions }
          : equipment.weaponSlots.primary,
        secondary: secondaryMatch
          ? { ...equipment.weaponSlots.secondary, modifierContributions: secondaryMatch.modifierContributions }
          : equipment.weaponSlots.secondary,
        inventory: [
          inventoryMatches[0]
            ? { ...equipment.weaponSlots.inventory[0], modifierContributions: inventoryMatches[0].modifierContributions }
            : equipment.weaponSlots.inventory[0],
          inventoryMatches[1]
            ? { ...equipment.weaponSlots.inventory[1], modifierContributions: inventoryMatches[1].modifierContributions }
            : equipment.weaponSlots.inventory[1],
        ],
      },
      armorSlot: armorMatch
        ? { ...equipment.armorSlot, modifierContributions: armorMatch.modifierContributions }
        : equipment.armorSlot,
    },
  }
}

/**
 * Hope 字段从 boolean[] 迁移到 number
 */
function migrateHopeToNumber(data: SheetData): SheetData {
  // 如果 hope 已经是 number，跳过
  if (typeof data.hope === 'number') {
    // 确保 hopeMax 存在
    if (!data.hopeMax) {
      const migrated = { ...data }
      migrated.hopeMax = 6
      console.log('[Migration] Added default hopeMax')
      return migrated
    }
    return data
  }

  // 如果 hope 是 boolean[]，进行转换
  if (Array.isArray(data.hope)) {
    const migrated = { ...data }
    const hopeArray = data.hope as boolean[]
    const lastLit = hopeArray.lastIndexOf(true)
    migrated.hope = lastLit >= 0 ? lastLit + 1 : 0
    migrated.hopeMax = hopeArray.length || 6

    console.log(`[Migration] Converted hope from boolean[] to number: ${migrated.hope}/${migrated.hopeMax}`)
    return migrated
  }

  // 其他情况，设置默认值
  const migrated = { ...data }
  migrated.hope = 0
  migrated.hopeMax = 6
  console.log('[Migration] Set default hope values')
  return migrated
}

/**
 * 笔记本字段迁移
 * 确保 notebook 字段存在且结构正确
 */
function migrateNotebook(data: SheetData): SheetData {
  // 如果已有 notebook 数据且结构正确，跳过
  if (data.notebook &&
      Array.isArray(data.notebook.pages) &&
      data.notebook.pages.length > 0 &&
      typeof data.notebook.currentPageIndex === 'number') {
    return data
  }

  const migrated = { ...data }
  migrated.notebook = {
    pages: [{
      id: 'page-1',
      lines: []
    }],
    currentPageIndex: 0,
    isOpen: false
  }

  console.log('[Migration] Added notebook field')
  return migrated
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isCompleteLegacyCheckKey(value: string): boolean {
  return value.includes("-")
}

function legacyUpgradeAutomationForCheckKey(checkKey: string): UpgradeAutomationMetadata | undefined {
  const match = /^(tier[123])-(\d+)(?:-\d+)?$/.exec(checkKey)
  if (!match) return undefined

  const tier = match[1] as keyof typeof upgradeOptionsData.tierSpecificUpgrades
  const optionIndex = Number(match[2])
  const baseAutomation = upgradeOptionsData.baseUpgrades[optionIndex]?.automation
  if (baseAutomation) return baseAutomation

  const tierSpecificIndex = optionIndex - upgradeOptionsData.baseUpgrades.length
  return upgradeOptionsData.tierSpecificUpgrades[tier]?.[tierSpecificIndex]?.automation
}

function legacyCheckedUpgradeState(checkKey: string): UpgradeState {
  const automation = legacyUpgradeAutomationForCheckKey(checkKey)
  if (automation?.kind === "fixedTarget") {
    return {
      checked: true,
      params: { target: automation.target },
    }
  }

  return { checked: true }
}

type LegacyUpgradeStateInput = SheetData & {
  checkedUpgrades?: unknown
}

function migrateLegacyUpgradeStates(data: LegacyUpgradeStateInput): SheetData {
  const upgradeStates: UpgradeStates = sanitizeUpgradeStates(data.upgradeStates)

  const addLegacyState = (checkKey: string, next: UpgradeState) => {
    if (!checkKey) return
    if (checkKey in upgradeStates) return
    upgradeStates[checkKey] = mergeUpgradeState(undefined, next)
  }

  if (isRecord(data.checkedUpgrades)) {
    Object.entries(data.checkedUpgrades).forEach(([checkKey, checkedByIndex]) => {
      if (!isCompleteLegacyCheckKey(checkKey) || !isRecord(checkedByIndex)) return
      if (Object.values(checkedByIndex).some(checked => checked === true)) {
        addLegacyState(checkKey, legacyCheckedUpgradeState(checkKey))
      }
    })
  }

  return {
    ...data,
    upgradeStates,
  }
}

function migrateModifierTarget(target: string): ModifierTargetId {
  return (target === "armorValue" ? "armorMax" : target) as ModifierTargetId
}

function isModifierTargetId(target: string): target is ModifierTargetId {
  if (
    target === "evasion" ||
    target === "armorMax" ||
    target === "minorThreshold" ||
    target === "majorThreshold" ||
    target === "hpMax" ||
    target === "stressMax" ||
    target === "proficiency"
  ) {
    return true
  }

  if (
    target === "agility.value" ||
    target === "strength.value" ||
    target === "finesse.value" ||
    target === "instinct.value" ||
    target === "presence.value" ||
    target === "knowledge.value"
  ) {
    return true
  }

  return /^experienceValues\.(0|[1-9]\d*)$/.test(target)
}

function normalizeTargetStates(value: unknown): NonNullable<SheetData["modifierState"]>["targetStates"] {
  if (!isRecord(value)) return {}

  const targetStates: NonNullable<SheetData["modifierState"]>["targetStates"] = {}
  Object.entries(value).forEach(([target, state]) => {
    if (!isRecord(state)) return
    const migratedTarget = migrateModifierTarget(target)
    if (!isModifierTargetId(migratedTarget)) return

    const nextState: NonNullable<SheetData["modifierState"]>["targetStates"][ModifierTargetId] = {}
    if (typeof state.activeBaseId === "string") {
      nextState.activeBaseId = migrateSystemModifierEntryId(state.activeBaseId)
    }
    if (state.autoCalculation === false) {
      nextState.autoCalculation = false
    } else if (state.autoCalculation === true || state.syncMode === "continuous") {
      nextState.autoCalculation = true
    }
    if (Object.keys(nextState).length > 0) {
      targetStates[migratedTarget] = nextState
    }
  })

  return targetStates
}

function sanitizeModifierEntryState(value: unknown): NonNullable<SheetData["modifierState"]>["entryStates"][string] | undefined {
  if (!isRecord(value)) return undefined

  const next: NonNullable<SheetData["modifierState"]>["entryStates"][string] = {}
  if (typeof value.order === "number") {
    next.order = value.order
  }

  return Object.keys(next).length > 0 ? next : undefined
}

function migrateSystemModifierEntryId(entryId: string): string {
  const equipmentArmorEntryIds: Record<string, string> = {
    "armor:current:armorValue": "equipment:armor:current:armorMax",
    "armor:current:armorMax": "equipment:armor:current:armorMax",
    "armor:current:minorThreshold": "equipment:armor:current:minorThreshold",
    "armor:current:majorThreshold": "equipment:armor:current:majorThreshold",
  }

  const migratedArmorEntryId = equipmentArmorEntryIds[entryId]
  if (migratedArmorEntryId) return migratedArmorEntryId

  const oldProfessionEntryId = /^profession:.+:(evasion|hpMax)$/.exec(entryId)
  if (oldProfessionEntryId) {
    return `profession:current:${oldProfessionEntryId[1]}`
  }

  return entryId
}

function migrateLegacyUserEntryId(entryId: string, target: string): string {
  if (target !== "armorValue") return entryId
  if (!entryId.startsWith("user:armorValue")) return entryId
  return `user:armorMax${entryId.slice("user:armorValue".length)}`
}

function migrateModifierEntryIdForTarget(entryId: string, target: string): string {
  const systemEntryId = migrateSystemModifierEntryId(entryId)
  if (systemEntryId !== entryId) return systemEntryId
  return migrateLegacyUserEntryId(entryId, target)
}

function toModifierContribution(value: unknown): ModifierContribution | undefined {
  if (!isRecord(value)) return undefined
  if (typeof value.id !== "string") return undefined
  if (!isRecord(value.definition)) return undefined
  if (typeof value.definition.target !== "string") return undefined
  if (value.definition.kind !== "base" && value.definition.kind !== "modifier") return undefined
  if (!isRecord(value.editable)) return undefined
  if (typeof value.editable.label !== "string") return undefined
  if (typeof value.editable.value !== "number") return undefined
  const originalTarget = value.definition.target
  const target = migrateModifierTarget(originalTarget)
  if (!isModifierTargetId(target)) return undefined

  return {
    id: migrateLegacyUserEntryId(value.id, originalTarget),
    definition: {
      target,
      kind: value.definition.kind as ModifierEntryKind,
    },
    editable: {
      label: value.editable.label,
      value: value.editable.value,
    },
  }
}

function sanitizeModifierContributions(values: unknown): ModifierContribution[] {
  if (!Array.isArray(values)) return []

  const contributions: ModifierContribution[] = []
  const seenIds = new Set<string>()

  values.forEach(value => {
    const contribution = toModifierContribution(value)
    if (!contribution) return
    if (seenIds.has(contribution.id)) return

    seenIds.add(contribution.id)
    contributions.push(contribution)
  })

  return contributions
}

function migrateModifierState(data: SheetData): SheetData {
  const migrated = { ...data }
  const legacyState: Record<string, unknown> = isRecord(migrated.modifierState) ? migrated.modifierState : {}
  const legacyByTarget: Record<string, unknown> = isRecord(legacyState.byTarget) ? legacyState.byTarget : {}
  const targetStates: NonNullable<SheetData["modifierState"]>["targetStates"] =
    {}
  const entryStates: NonNullable<SheetData["modifierState"]>["entryStates"] =
    {}
  const userModifierContributions = sanitizeModifierContributions(migrated.userModifierContributions)
  const seenUserContributionIds = new Set(userModifierContributions.map(entry => entry.id))

  if (isRecord(legacyState.targetStates)) {
    Object.entries(legacyState.targetStates).forEach(([target, state]) => {
      if (!isRecord(state)) return
      const migratedTarget = migrateModifierTarget(target)
      if (!isModifierTargetId(migratedTarget)) return

      const nextState: NonNullable<SheetData["modifierState"]>["targetStates"][ModifierTargetId] = {}
      if (typeof state.activeBaseId === "string") {
        nextState.activeBaseId = migrateSystemModifierEntryId(state.activeBaseId)
      }
      if (state.autoCalculation === false) {
        nextState.autoCalculation = false
      } else if (state.autoCalculation === true || state.syncMode === "continuous") {
        nextState.autoCalculation = true
      }
      if (Object.keys(nextState).length > 0) {
        targetStates[migratedTarget] = nextState
      }
    })
  }

  if (isRecord(legacyState.entryStates)) {
    Object.entries(legacyState.entryStates).forEach(([entryId, state]) => {
      const sanitizedState = sanitizeModifierEntryState(state)
      if (!sanitizedState) return
      const migratedEntryId = migrateSystemModifierEntryId(entryId)
      entryStates[migratedEntryId] = {
        ...(entryStates[migratedEntryId] ?? {}),
        ...sanitizedState,
      }
    })
  }

  Object.entries(legacyByTarget).forEach(([target, rawTargetState]) => {
    if (!isRecord(rawTargetState)) return
    const migratedTarget = migrateModifierTarget(target)
    if (!isModifierTargetId(migratedTarget)) return

    if (typeof rawTargetState.activeBaseId === "string") {
      targetStates[migratedTarget] = {
        activeBaseId: migrateModifierEntryIdForTarget(rawTargetState.activeBaseId, target),
      }
    }

    if (Array.isArray(rawTargetState.userEntries)) {
      rawTargetState.userEntries.forEach(entry => {
        if (!isRecord(entry)) return
        if (
          typeof entry.id !== "string" ||
          typeof entry.target !== "string" ||
          (entry.kind !== "base" && entry.kind !== "modifier") ||
          typeof entry.label !== "string" ||
          typeof entry.value !== "number"
        ) {
          return
        }
        const migratedEntryTarget = migrateModifierTarget(entry.target)
        if (!isModifierTargetId(migratedEntryTarget)) return
        const migratedEntryId = migrateLegacyUserEntryId(entry.id, entry.target)
        if (seenUserContributionIds.has(migratedEntryId)) return

        seenUserContributionIds.add(migratedEntryId)
        userModifierContributions.push({
          id: migratedEntryId,
          definition: {
            target: migratedEntryTarget,
            kind: entry.kind as ModifierEntryKind,
          },
          editable: {
            label: entry.label,
            value: entry.value,
          },
        })
      })
    }
  })

  migrated.modifierState = { targetStates, entryStates }
  migrated.userModifierContributions = userModifierContributions

  return reconcileModifierState(migrated)
}

const LEGACY_FINAL_TARGETS = [
  "evasion",
  "armorMax",
  "minorThreshold",
  "majorThreshold",
  "hpMax",
  "stressMax",
  "proficiency",
] as const satisfies readonly ModifierTargetId[]

const LEGACY_ATTRIBUTE_FINAL_TARGETS = [
  ["agility.value", "agility"],
  ["strength.value", "strength"],
  ["finesse.value", "finesse"],
  ["instinct.value", "instinct"],
  ["presence.value", "presence"],
  ["knowledge.value", "knowledge"],
] as const satisfies readonly [ModifierTargetId, keyof SheetData][]

function upsertModifierContribution(
  contributions: ModifierContribution[],
  contribution: ModifierContribution,
): ModifierContribution[] {
  const index = contributions.findIndex(entry => entry.id === contribution.id)
  if (index === -1) return [...contributions, contribution]

  const next = [...contributions]
  next[index] = contribution
  return next
}

function removeModifierContribution(
  contributions: ModifierContribution[],
  entryId: string,
): ModifierContribution[] {
  return contributions.filter(contribution => contribution.id !== entryId)
}

function legacyMigrationBaseline(target: ModifierTargetId): number | undefined {
  if (target.startsWith("experienceValues.")) return 2
  return undefined
}

function otherTotalExcludingUnknownMigrationDifference(
  otherAdjustments: unknown,
  target: ModifierTargetId,
): number {
  return sanitizeOtherAdjustments(otherAdjustments).reduce((sum, adjustment) => {
    if (adjustment.target !== target) return sum
    if (adjustment.kind === "unknownMigrationDifference") return sum
    return sum + adjustment.value
  }, 0)
}

function legacyExplicitFinalValue(raw: Partial<SheetData> | any, target: ModifierTargetId): unknown {
  if (!isRecord(raw)) return undefined

  const attributeTarget = LEGACY_ATTRIBUTE_FINAL_TARGETS.find(([attributeTarget]) => attributeTarget === target)
  if (attributeTarget) {
    const rawAttribute = raw[attributeTarget[1]]
    return isRecord(rawAttribute) && hasOwn(rawAttribute, "value") ? rawAttribute.value : undefined
  }

  if (target.startsWith("experienceValues.")) {
    const match = /^experienceValues\.(0|[1-9]\d*)$/.exec(target)
    const index = match ? Number(match[1]) : undefined
    return index !== undefined && Array.isArray(raw.experienceValues) ? raw.experienceValues[index] : undefined
  }

  if (target === "armorMax") {
    if (hasOwn(raw, "armorValue")) return raw.armorValue
    if (hasOwn(raw, "armorMax")) return raw.armorMax
    return undefined
  }

  if (target === "proficiency") {
    if (!hasOwn(raw, "proficiency")) return undefined
    return Array.isArray(raw.proficiency)
      ? raw.proficiency.filter(Boolean).length
      : raw.proficiency
  }

  return hasOwn(raw, target) ? raw[target] : undefined
}

function isLegacyExplicitFinal(value: unknown): boolean {
  return !(value === undefined || (typeof value === "string" && value.trim() === ""))
}

function collectLegacyExplicitFinals(raw: Partial<SheetData> | any): Partial<Record<ModifierTargetId, unknown>> {
  const finals: Partial<Record<ModifierTargetId, unknown>> = {}

  const targets = new Set<ModifierTargetId>(LEGACY_FINAL_TARGETS)
  LEGACY_ATTRIBUTE_FINAL_TARGETS.forEach(([target]) => {
    targets.add(target)
  })
  if (isRecord(raw) && Array.isArray(raw.experienceValues)) {
    raw.experienceValues.forEach((_, index) => {
      targets.add(`experienceValues.${index}` as ModifierTargetId)
    })
  }

  targets.forEach(target => {
    const value = legacyExplicitFinalValue(raw, target)
    if (isLegacyExplicitFinal(value)) {
      finals[target] = value
    }
  })

  return finals
}

function writeModifierTargetState(
  sheetData: SheetData,
  target: ModifierTargetId,
  activeBaseId: string | undefined,
): SheetData {
  const targetStates = { ...(sheetData.modifierState?.targetStates ?? {}) }
  targetStates[target] = {
    ...(activeBaseId ? { activeBaseId } : {}),
    autoCalculation: true,
  }

  return {
    ...sheetData,
    modifierState: {
      targetStates,
      entryStates: sheetData.modifierState?.entryStates ?? {},
    },
  }
}

function preserveLegacyNumericFinal(
  sheetData: SheetData,
  target: ModifierTargetId,
  finalValue: number,
): SheetData {
  const withoutDelta = {
    ...sheetData,
    userModifierContributions: removeModifierContribution(
      sheetData.userModifierContributions ?? [],
      getUnattributedDeltaId(target),
    ),
  }
  const summary = getReferenceSummary(withoutDelta, target)
  const activeBase = summary.activeBase ?? summary.bases[0]

  if (!activeBase) {
    const baseline = legacyMigrationBaseline(target)
    const modifiersTotal = summary.enabledModifiers.reduce((sum, entry) => sum + entry.presentation.value, 0)
    const estimatedBase = createEstimatedBaseContribution(target, baseline ?? finalValue - modifiersTotal)
    const contributions = upsertModifierContribution(
      removeModifierContribution(withoutDelta.userModifierContributions ?? [], getEstimatedBaseId(target)),
      estimatedBase,
    )
    const referenceTotal = estimatedBase.editable.value + modifiersTotal
    const delta = baseline === undefined
      ? 0
      : finalValue - referenceTotal - otherTotalExcludingUnknownMigrationDifference(withoutDelta.otherAdjustments, target)
    const otherAdjustments = delta === 0
      ? removeOtherAdjustment(withoutDelta.otherAdjustments, getOtherAdjustmentId(target, "unknownMigrationDifference"))
      : upsertOtherAdjustment(
        withoutDelta.otherAdjustments,
        createUnknownMigrationDifference(target, delta),
      )
    const withContributions = {
      ...withoutDelta,
      userModifierContributions: contributions,
      otherAdjustments,
    }
    const withFinal = writeTargetValue(withContributions, target, finalValue)
    return writeModifierTargetState(withFinal, target, estimatedBase.id)
  }

  const referenceTotal = summary.referenceTotal ?? 0
  const delta = finalValue - referenceTotal - otherTotalExcludingUnknownMigrationDifference(withoutDelta.otherAdjustments, target)
  const withoutExistingDelta = removeModifierContribution(
    withoutDelta.userModifierContributions ?? [],
    getUnattributedDeltaId(target),
  )
  const otherAdjustments = delta === 0
    ? removeOtherAdjustment(withoutDelta.otherAdjustments, getOtherAdjustmentId(target, "unknownMigrationDifference"))
    : upsertOtherAdjustment(
      withoutDelta.otherAdjustments,
      createUnknownMigrationDifference(target, delta),
    )
  const withContributions = {
    ...withoutDelta,
    userModifierContributions: withoutExistingDelta,
    otherAdjustments,
  }
  const withFinal = writeTargetValue(withContributions, target, finalValue)
  return writeModifierTargetState(withFinal, target, activeBase.id)
}

function preserveLegacyModifierFinals(
  data: SheetData,
  legacyExplicitFinals: Partial<Record<ModifierTargetId, unknown>>,
): SheetData {
  let migrated = data
  const targets = new Set<ModifierTargetId>(Object.keys(legacyExplicitFinals) as ModifierTargetId[])
  collectModifierEntries(migrated).forEach(entry => {
    targets.add(entry.definition.target)
  })

  targets.forEach(target => {
    if (!isModifierTargetId(target)) return
    const explicitFinal = legacyExplicitFinals[target]

    if (explicitFinal !== undefined) {
      const numericFinal = tryParseNumber(explicitFinal)
      if (numericFinal !== undefined) {
        migrated = preserveLegacyNumericFinal(migrated, target, numericFinal)
        return
      }

      const summary = getReferenceSummary(migrated, target)
      if (target === "armorMax" && (typeof explicitFinal === "string" || typeof explicitFinal === "number")) {
        migrated = { ...migrated, armorMax: explicitFinal }
      }
      migrated = writeModifierTargetState(migrated, target, summary.activeBase?.id ?? summary.bases[0]?.id)
      return
    }

    const summary = getReferenceSummary(migrated, target)
    if (summary.entries.length === 0) return
    migrated = writeModifierTargetState(migrated, target, summary.activeBase?.id ?? summary.bases[0]?.id)
  })

  return reconcileModifierState(migrated)
}

function isDuplicateSystemStressBase(contribution: ModifierContribution): boolean {
  return (
    isEstimatedBaseContribution(contribution) &&
    contribution.definition.target === "stressMax" &&
    contribution.definition.kind === "base" &&
    contribution.editable.value === 6
  )
}

function normalizeCurrentModifierCollections(data: SheetData): SheetData {
  let migrated = { ...data }

  migrated.userModifierContributions = sanitizeModifierContributions(migrated.userModifierContributions)
  let otherAdjustments = sanitizeOtherAdjustments(migrated.otherAdjustments)
  let removedDuplicateSystemStressBase = false

  const retainedContributions: ModifierContribution[] = []
  migrated.userModifierContributions.forEach(contribution => {
    if (isDuplicateSystemStressBase(contribution)) {
      removedDuplicateSystemStressBase = true
      return
    }

    if (!isUnattributedDeltaContribution(contribution)) {
      retainedContributions.push(contribution)
      return
    }

    const target = contribution.definition.target
    const existingUnknownDifference = otherAdjustments.find(
      adjustment => adjustment.target === target && adjustment.kind === "unknownMigrationDifference",
    )
    otherAdjustments = upsertOtherAdjustment(
      otherAdjustments,
      createUnknownMigrationDifference(
        target,
        (existingUnknownDifference?.value ?? 0) + contribution.editable.value,
      ),
    )
  })
  migrated.userModifierContributions = retainedContributions
  migrated.otherAdjustments = sanitizeOtherAdjustments(otherAdjustments)
  migrated = migrateLegacyUpgradeStates(migrated)

  if (!migrated.modifierState || typeof migrated.modifierState !== "object" || Array.isArray(migrated.modifierState)) {
    migrated.modifierState = { targetStates: {}, entryStates: {} }
  } else {
    const entryStates: NonNullable<SheetData["modifierState"]>["entryStates"] = {}
    if (isRecord(migrated.modifierState.entryStates)) {
      Object.entries(migrated.modifierState.entryStates).forEach(([entryId, state]) => {
        const sanitizedState = sanitizeModifierEntryState(state)
        if (!sanitizedState) return
        const migratedEntryId = migrateSystemModifierEntryId(entryId)
        entryStates[migratedEntryId] = {
          ...(entryStates[migratedEntryId] ?? {}),
          ...sanitizedState,
        }
      })
    }

    migrated.modifierState = {
      targetStates: normalizeTargetStates(migrated.modifierState.targetStates),
      entryStates,
    }
  }

  if (removedDuplicateSystemStressBase) {
    const currentStressState = migrated.modifierState.targetStates.stressMax ?? {}
    migrated.modifierState = {
      ...migrated.modifierState,
      targetStates: {
        ...migrated.modifierState.targetStates,
        stressMax: {
          activeBaseId: "level:base:stressMax",
          ...(currentStressState.autoCalculation === false ? { autoCalculation: false } : {}),
        },
      },
    }
  }

  return migrated
}

/**
 * 清理废弃字段
 * 移除不再使用的字段，保持数据结构清洁
 */
function cleanupDeprecatedFields(data: SheetData): SheetData {
  const migrated = { ...data }

  // 移除废弃的字段
  if ('includePageThreeInExport' in migrated) {
    delete (migrated as any).includePageThreeInExport
    console.log('[Migration] Removed deprecated includePageThreeInExport field')
  }

  delete (migrated as any).armorBonus

  return migrated
}

function cleanupLegacyUpgradeFields(data: SheetData): SheetData {
  const migrated = { ...data }
  delete (migrated as any).checkedUpgrades
  delete (migrated as any).automationSelections
  return migrated
}

function isValidStandardCard(card: any): card is StandardCard {
  return card &&
    typeof card === 'object' &&
    typeof card.id === 'string' &&
    typeof card.name === 'string' &&
    card.type !== undefined
}

export function normalizeCurrentSheetData(data: Partial<SheetData> | any): SheetData {
  let normalized: SheetData = {
    ...defaultSheetData,
    ...data,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  }

  normalized.cards = Array.isArray(data.cards)
    ? data.cards.filter(isValidStandardCard)
    : defaultSheetData.cards

  normalized.inventory_cards = Array.isArray(data.inventory_cards)
    ? data.inventory_cards.filter(isValidStandardCard)
    : defaultSheetData.inventory_cards

  normalized.equipment = normalizeCurrentEquipment(normalized.equipment)
  normalized = normalizeCurrentModifierCollections(normalized)
  normalized = reconcileModifierState(normalized)
  normalized = cleanupLegacyUpgradeFields(normalized)

  return cleanupDeprecatedFields(normalized)
}

function migrateV0ToV1(raw: Partial<SheetData> | any): Partial<SheetData> {
  let migrated = { ...raw } as SheetData

  migrated = migratePageVisibility(migrated)
  migrated = migrateInventoryCards(migrated)
  migrated = migrateAttributeSpellcasting(migrated)
  migrated = migratePageVisibilityRename(migrated)
  migrated = migratePageVisibilityFields(migrated)
  migrated = migrateArmorTemplate(migrated)
  migrated = migrateAdventureNotes(migrated)
  migrated = migrateHopeToNumber(migrated)
  migrated = migrateNotebook(migrated)
  migrated = cleanupDeprecatedFields(migrated)

  return {
    ...migrated,
    schemaVersion: V1_SCHEMA_VERSION,
  }
}

function migrateV1ToV2(raw: Partial<SheetData> | any): Partial<SheetData> {
  const hasInputEquipment = isRecord(raw?.equipment)
  const legacyExplicitFinals = collectLegacyExplicitFinals(raw)
  let migrated = { ...raw } as SheetData

  migrated = migrateEquipment(migrated, hasInputEquipment)
  migrated = migrateModifierState(migrated)
  migrated = backfillV1EquipmentContributions(migrated)
  migrated = migrateLegacyUpgradeStates(migrated)
  migrated = preserveLegacyModifierFinals(migrated, legacyExplicitFinals)
  migrated = stripLegacyEquipmentFields(migrated)
  migrated = cleanupDeprecatedFields(migrated)

  return {
    ...migrated,
    schemaVersion: V2_SCHEMA_VERSION,
  }
}

function createCardInstanceId(cardId: string, zone: "loadout" | "vault", index: number): string {
  const safeCardId = cardId.replace(/[^a-zA-Z0-9_-]/g, "_")
  return `cardinst_${zone}_${index}_${safeCardId}`
}

function migrateCardInstanceIds(raw: Partial<SheetData> | any): Partial<SheetData> {
  const migrateCards = (cards: unknown, zone: "loadout" | "vault") => {
    if (!Array.isArray(cards)) return cards

    return cards.map((card, index) => {
      if (!isValidStandardCard(card) || isEmptyCard(card)) return card
      if (typeof card.instanceId === "string" && card.instanceId.length > 0) return card

      return {
        ...card,
        instanceId: createCardInstanceId(card.id, zone, index),
      }
    })
  }

  return {
    ...raw,
    cards: migrateCards(raw.cards, "loadout"),
    inventory_cards: migrateCards(raw.inventory_cards, "vault"),
    schemaVersion: V3_SCHEMA_VERSION,
  }
}

/**
 * 主迁移函数 - 统一入口点
 * 
 * @param data 待迁移的数据（可能是不完整的 SheetData）
 * @param options 迁移选项，包含外部依赖
 * @returns 完整的已迁移 SheetData
 */
export function migrateSheetData(
  data: Partial<SheetData> | any, 
  _options: MigrationOptions = {}
): SheetData {
  const schemaVersion = detectSchemaVersion(data)
  assertSupportedSchemaVersion(schemaVersion)

  let migrated = data
  let migratedVersion = schemaVersion
  if (migratedVersion === 0) {
    migrated = migrateV0ToV1(migrated)
    migratedVersion = V1_SCHEMA_VERSION
  }

  if (migratedVersion === V1_SCHEMA_VERSION) {
    migrated = migrateV1ToV2(migrated)
    migratedVersion = V2_SCHEMA_VERSION
  }

  if (migratedVersion === V2_SCHEMA_VERSION) {
    migrated = migrateCardInstanceIds(migrated)
    migratedVersion = V3_SCHEMA_VERSION
  }

  return normalizeCurrentSheetData(migrated)
}
