import { tryParseNumber } from "@/lib/number-utils"
import type { SheetData } from "@/lib/sheet-data"
import { createModifierEntry } from "./entry-utils"
import type { ModifierEntry, ModifierTargetId } from "./types"

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

function selectedUpgradeEntries(sourceId: string, selection: unknown): ModifierEntry[] {
  if (!isSelectionRecord(selection) || selection.selected !== true) return []
  const params = isSelectionRecord(selection.params) ? selection.params : {}

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

  if (params.target === "hpMax" || params.target === "stressMax" || params.target === "proficiency") {
    const labelMap = {
      hpMax: "升级：生命上限 +1",
      stressMax: "升级：压力上限 +1",
      proficiency: "升级：熟练度 +1",
    } as const
    return [createModifierEntry({
      id: `${sourceId}:${params.target}`,
      sourceId,
      target: params.target,
      kind: "modifier",
      label: labelMap[params.target],
      value: 1,
      sourceType: "upgrade",
      priority: 200,
    })]
  }

  if (Array.isArray(params.attributes)) {
    return params.attributes.flatMap((attribute) => {
      if (typeof attribute !== "string" || !(attribute in ATTRIBUTE_LABELS)) return []
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

  if (Array.isArray(params.experienceIndexes)) {
    return params.experienceIndexes.flatMap((index) => {
      if (!Number.isInteger(index) || index < 0) return []
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
  const professionId = professionCard?.id || sheetData.professionRef?.id || sheetData.profession || "current"
  const professionName = professionCard?.name || sheetData.professionRef?.name || sheetData.profession || "职业"
  const evasion = professionCard?.professionSpecial?.["起始闪避"]
  const hp = professionCard?.professionSpecial?.["起始生命"]

  if (typeof evasion === "number") {
    entries.push(createModifierEntry({
      id: `profession:${professionId}:evasion`,
      sourceId: `profession:${professionId}`,
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
      id: `profession:${professionId}:hpMax`,
      sourceId: `profession:${professionId}`,
      target: "hpMax",
      kind: "base",
      label: `${professionName}：起始生命上限`,
      value: hp,
      sourceType: "profession",
      priority: 100,
    }))
  }

  const armorLabel = sheetData.armorName || "当前护甲"
  const armorValue = tryParseNumber(sheetData.armorBaseScore)
  if (armorValue !== undefined) {
    entries.push(createModifierEntry({
      id: "armor:current:armorValue",
      sourceId: "armor:current",
      target: "armorValue",
      kind: "base",
      label: `${armorLabel}：基础护甲值`,
      value: armorValue,
      sourceType: "armor",
      priority: 100,
    }))
  }

  const [minorRaw, majorRaw] = String(sheetData.armorThreshold || "").split("/")
  const minor = tryParseNumber(minorRaw)
  const major = tryParseNumber(majorRaw)
  if (minor !== undefined) {
    entries.push(createModifierEntry({
      id: "armor:current:minorThreshold",
      sourceId: "armor:current",
      target: "minorThreshold",
      kind: "base",
      label: `${armorLabel}：基础重伤阈值`,
      value: minor,
      sourceType: "armor",
      priority: 100,
    }))
  }
  if (major !== undefined) {
    entries.push(createModifierEntry({
      id: "armor:current:majorThreshold",
      sourceId: "armor:current",
      target: "majorThreshold",
      kind: "base",
      label: `${armorLabel}：基础严重阈值`,
      value: major,
      sourceType: "armor",
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

  Object.entries(sheetData.automationSelections ?? {}).forEach(([sourceId, selection]) => {
    entries.push(...selectedUpgradeEntries(sourceId, selection))
  })

  return entries
}
