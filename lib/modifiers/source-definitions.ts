import { tryParseNumber } from "@/lib/number-utils"
import type { SheetData } from "@/lib/sheet-data"
import { createModifierEntry } from "./entry-utils"
import type { ModifierEntry, ModifierTargetId, UpgradeStateParams } from "./types"
import { isAttributeKey, isFixedUpgradeTargetId } from "./upgrade-states"

const ATTRIBUTE_LABELS: Record<string, string> = {
  agility: "敏捷",
  strength: "力量",
  finesse: "灵巧",
  instinct: "本能",
  presence: "风度",
  knowledge: "知识",
}

const PROFICIENCY_LEVEL_THRESHOLDS = [2, 5, 8]

function isSelectionRecord(selection: unknown): selection is Record<string, unknown> {
  return typeof selection === "object" && selection !== null && !Array.isArray(selection)
}

function selectedUpgradeEntries(sourceId: string, state: unknown): ModifierEntry[] {
  if (!isSelectionRecord(state) || state.checked !== true) return []
  const params = isSelectionRecord(state.params)
    ? state.params as UpgradeStateParams
    : undefined
  if (!params) return []

  if ("target" in params && isFixedUpgradeTargetId(params.target)) {
    if (params.target === "evasion") {
      return [createModifierEntry({
        id: `${sourceId}:evasion`,
        sourceId,
        target: "evasion",
        kind: "modifier",
        label: "升级：闪避 +1",
        value: 1,
        sourceType: "upgrade",
        priority: 200,
      })]
    }

    const labelMap = {
      hpMax: "升级：生命上限 +1",
      stressMax: "升级：压力上限 +1",
      proficiency: "升级：熟练度 +1",
    } as const
    const target = params.target
    return [createModifierEntry({
      id: `${sourceId}:${target}`,
      sourceId,
      target,
      kind: "modifier",
      label: labelMap[target],
      value: 1,
      sourceType: "upgrade",
      priority: 200,
    })]
  }

  if ("attributes" in params && Array.isArray(params.attributes)) {
    return params.attributes.flatMap((attribute) => {
      if (!isAttributeKey(attribute)) return []
      const target = `${attribute}.value` as ModifierTargetId
      return [createModifierEntry({
        id: `${sourceId}:${target}`,
        sourceId,
        target,
        kind: "modifier",
        label: `升级：${ATTRIBUTE_LABELS[attribute]} +1`,
        value: 1,
        sourceType: "upgrade",
        priority: 200,
      })]
    })
  }

  if ("experienceIndexes" in params && Array.isArray(params.experienceIndexes)) {
    return params.experienceIndexes.flatMap((index) => {
      if (!Number.isSafeInteger(index) || index < 0) return []
      const target = `experienceValues.${index}` as ModifierTargetId
      return [createModifierEntry({
        id: `${sourceId}:${target}`,
        sourceId,
        target,
        kind: "modifier",
        label: `升级：经历 ${index + 1} +1`,
        value: 1,
        sourceType: "upgrade",
        priority: 200,
      })]
    })
  }

  return []
}

export function collectSystemModifierEntries(sheetData: SheetData): ModifierEntry[] {
  const entries: ModifierEntry[] = []
  const professionCard = sheetData.cards?.find(card => card?.type === "profession")
  const professionName = professionCard?.name || sheetData.professionRef?.name || sheetData.profession || "职业"
  const evasion = professionCard?.professionSpecial?.["起始闪避"]
  const hp = professionCard?.professionSpecial?.["起始生命"]

  if (typeof evasion === "number") {
    entries.push(createModifierEntry({
      id: "profession:current:evasion",
      sourceId: "profession:current",
      target: "evasion",
      kind: "base",
      label: `${professionName}：起始闪避`,
      value: evasion,
      sourceType: "profession",
      priority: 100,
    }))
  }

  if (typeof hp === "number") {
    entries.push(createModifierEntry({
      id: "profession:current:hpMax",
      sourceId: "profession:current",
      target: "hpMax",
      kind: "base",
      label: `${professionName}：起始生命上限`,
      value: hp,
      sourceType: "profession",
      priority: 100,
    }))
  }

  const armorSlot = sheetData.equipment.armorSlot
  const armorLabel = armorSlot.name || "当前护甲"
  if (armorSlot.baseArmorMax !== null) {
    entries.push(createModifierEntry({
      id: "equipment:armor:current:armorMax",
      sourceId: "armor:current",
      target: "armorMax",
      kind: "base",
      label: `${armorLabel}：基础护甲值`,
      value: armorSlot.baseArmorMax,
      sourceType: "equipment",
      priority: 100,
    }))
  }

  if (armorSlot.baseThresholds.minor !== null) {
    entries.push(createModifierEntry({
      id: "equipment:armor:current:minorThreshold",
      sourceId: "armor:current",
      target: "minorThreshold",
      kind: "base",
      label: `${armorLabel}：基础重伤阈值`,
      value: armorSlot.baseThresholds.minor,
      sourceType: "equipment",
      priority: 100,
    }))
  }
  if (armorSlot.baseThresholds.major !== null) {
    entries.push(createModifierEntry({
      id: "equipment:armor:current:majorThreshold",
      sourceId: "armor:current",
      target: "majorThreshold",
      kind: "base",
      label: `${armorLabel}：基础严重阈值`,
      value: armorSlot.baseThresholds.major,
      sourceType: "equipment",
      priority: 100,
    }))
  }

  const level = tryParseNumber(sheetData.level)
  if (level !== undefined && level >= 1 && level <= 10) {
    entries.push(
      createModifierEntry({
        id: "level:current:minorThreshold",
        sourceId: "level:current",
        target: "minorThreshold",
        kind: "modifier",
        label: `等级 ${level}：重伤阈值 +${level}`,
        value: level,
        sourceType: "level",
        priority: 150,
      }),
      createModifierEntry({
        id: "level:current:majorThreshold",
        sourceId: "level:current",
        target: "majorThreshold",
        kind: "modifier",
        label: `等级 ${level}：严重阈值 +${level}`,
        value: level,
        sourceType: "level",
        priority: 150,
      }),
    )

    entries.push(createModifierEntry({
      id: "level:base:proficiency",
      sourceId: "level:base",
      target: "proficiency",
      kind: "base",
      label: "基础熟练度",
      value: 1,
      sourceType: "level",
      priority: 100,
    }))

    PROFICIENCY_LEVEL_THRESHOLDS.forEach(threshold => {
      if (level < threshold) return
      entries.push(createModifierEntry({
        id: `level:threshold-${threshold}:proficiency`,
        sourceId: `level:threshold-${threshold}`,
        target: "proficiency",
        kind: "modifier",
        label: `等级 ${threshold}：熟练度 +1`,
        value: 1,
        sourceType: "level",
        priority: 150,
      }))
    })
  }

  Object.entries(sheetData.upgradeStates ?? {}).forEach(([checkKey, state]) => {
    entries.push(...selectedUpgradeEntries(`upgrade:${checkKey}`, state))
  })

  return entries
}
