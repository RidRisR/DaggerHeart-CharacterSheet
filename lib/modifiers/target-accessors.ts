import type { AttributeValue, SheetData } from "@/lib/sheet-data"
import type { ModifierTargetId } from "./types"

const ATTRIBUTE_TARGETS = {
  "agility.value": "agility",
  "strength.value": "strength",
  "finesse.value": "finesse",
  "instinct.value": "instinct",
  "presence.value": "presence",
  "knowledge.value": "knowledge",
} as const

type AttributeTarget = keyof typeof ATTRIBUTE_TARGETS
type AttributeKey = (typeof ATTRIBUTE_TARGETS)[AttributeTarget]

export function readTargetValue(sheetData: SheetData, target: ModifierTargetId): unknown {
  if (target in ATTRIBUTE_TARGETS) {
    const attr = sheetData[ATTRIBUTE_TARGETS[target as AttributeTarget]]
    return typeof attr === "object" && attr !== null && "value" in attr ? attr.value : undefined
  }

  if (target.startsWith("experienceValues.")) {
    const index = Number(target.split(".")[1])
    return Number.isInteger(index) ? sheetData.experienceValues?.[index] : undefined
  }

  if (target === "proficiency") {
    const proficiency = sheetData.proficiency
    if (Array.isArray(proficiency)) return proficiency.filter(Boolean).length
    return typeof proficiency === "number" ? proficiency : undefined
  }

  return sheetData[target as keyof SheetData]
}

export function writeTargetValue(sheetData: SheetData, target: ModifierTargetId, value: number | string): SheetData {
  if (target in ATTRIBUTE_TARGETS) {
    const key = ATTRIBUTE_TARGETS[target as AttributeTarget] as AttributeKey
    const current = sheetData[key] as AttributeValue | undefined
    return {
      ...sheetData,
      [key]: {
        checked: current?.checked ?? false,
        value: String(value),
        ...(current?.spellcasting !== undefined ? { spellcasting: current.spellcasting } : {}),
      },
    }
  }

  if (target.startsWith("experienceValues.")) {
    const index = Number(target.split(".")[1])
    if (!Number.isInteger(index) || index < 0) return sheetData
    const values = [...(sheetData.experienceValues ?? ["", "", "", "", ""])]
    while (values.length <= index) values.push("")
    values[index] = String(value)
    return { ...sheetData, experienceValues: values }
  }

  if (target === "hpMax" || target === "stressMax") {
    return { ...sheetData, [target]: Number(value) }
  }

  if (target === "proficiency") {
    const count = Math.max(0, Math.min(6, Number(value)))
    return {
      ...sheetData,
      proficiency: Array(6).fill(false).map((_, index) => index < count),
    }
  }

  if (
    target === "evasion" ||
    target === "armorValue" ||
    target === "minorThreshold" ||
    target === "majorThreshold"
  ) {
    return { ...sheetData, [target]: String(value) }
  }

  return sheetData
}

export function targetUpdate(sheetData: SheetData, before: SheetData, target: ModifierTargetId): Partial<SheetData> {
  if (target in ATTRIBUTE_TARGETS) {
    const key = ATTRIBUTE_TARGETS[target as AttributeTarget]
    return sheetData[key] === before[key] ? {} : { [key]: sheetData[key] }
  }

  if (target.startsWith("experienceValues.")) {
    return sheetData.experienceValues === before.experienceValues ? {} : { experienceValues: sheetData.experienceValues }
  }

  if (target === "proficiency") {
    return sheetData.proficiency === before.proficiency ? {} : { proficiency: sheetData.proficiency }
  }

  return sheetData[target as keyof SheetData] === before[target as keyof SheetData]
    ? {}
    : ({ [target]: sheetData[target as keyof SheetData] } as Partial<SheetData>)
}
