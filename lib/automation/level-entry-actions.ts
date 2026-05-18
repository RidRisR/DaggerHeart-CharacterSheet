import type { AttributeValue, SheetData } from "@/lib/sheet-data"
import type { AttributeKey } from "@/lib/modifiers/types"

const ATTRIBUTE_KEYS = [
  "agility",
  "strength",
  "finesse",
  "instinct",
  "presence",
  "knowledge",
] as const satisfies readonly AttributeKey[]

type LevelEntryAction = (sheetData: SheetData) => SheetData

export const LEVEL_ENTRY_AUTOMATIONS: Partial<Record<number, readonly LevelEntryAction[]>> = {
  5: [clearAttributeUpgradeMarks],
  8: [clearAttributeUpgradeMarks],
}

function isAttributeValue(value: unknown): value is AttributeValue {
  return !!value && typeof value === "object" && "checked" in value && "value" in value
}

export function normalizeLevelForEntryAutomation(value: unknown): number {
  if (typeof value !== "string" && typeof value !== "number") return 1

  const level = typeof value === "string" ? Number(value.trim()) : value
  if (!Number.isInteger(level) || level < 1 || level > 10) return 1

  return level
}

export function enteredLevelsBetween(oldLevel: unknown, newLevel: unknown): number[] {
  const normalizedOldLevel = normalizeLevelForEntryAutomation(oldLevel)
  const normalizedNewLevel = normalizeLevelForEntryAutomation(newLevel)

  if (normalizedNewLevel <= normalizedOldLevel) return []

  return Array.from(
    { length: normalizedNewLevel - normalizedOldLevel },
    (_, index) => normalizedOldLevel + index + 1,
  )
}

export function clearAttributeUpgradeMarks(sheetData: SheetData): SheetData {
  const nextSheetData: SheetData = { ...sheetData }

  ATTRIBUTE_KEYS.forEach((attributeKey) => {
    const currentAttribute = sheetData[attributeKey]
    if (!isAttributeValue(currentAttribute)) return

    nextSheetData[attributeKey] = {
      ...currentAttribute,
      checked: false,
    }
  })

  if (!sheetData.upgradeStates) return nextSheetData

  nextSheetData.upgradeStates = Object.fromEntries(
    Object.entries(sheetData.upgradeStates).map(([checkKey, state]) => {
      if (!state.params || !("attributes" in state.params)) {
        return [checkKey, state]
      }

      const { attributeMarksApplied: _attributeMarksApplied, ...stateWithoutAttributeMarks } = state
      return [checkKey, stateWithoutAttributeMarks]
    }),
  )

  return nextSheetData
}

export function applyLevelEntryAutomations(sheetData: SheetData, newLevel: string): SheetData {
  return enteredLevelsBetween(sheetData.level, newLevel).reduce((currentSheetData, enteredLevel) => {
    const automations = LEVEL_ENTRY_AUTOMATIONS[enteredLevel] ?? []
    return automations.reduce(
      (automatedSheetData, automation) => automation(automatedSheetData),
      currentSheetData,
    )
  }, sheetData)
}
