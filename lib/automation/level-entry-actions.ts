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

type LevelEntryNotification = {
  message: string
  type: "success" | "error" | "info"
}

type LevelEntryActionHandler = (sheetData: SheetData) => SheetData
type LevelEntryAction =
  | LevelEntryActionHandler
  | {
    apply: LevelEntryActionHandler
    notification?: (enteredLevel: number) => LevelEntryNotification
  }
type LevelEntryAutomationRegistry = Partial<Record<number, readonly LevelEntryAction[]>>

export type LevelEntryAutomationResult = {
  sheetData: SheetData
  notifications: LevelEntryNotification[]
}

const clearAttributeUpgradeMarksAutomation: LevelEntryAction = {
  apply: clearAttributeUpgradeMarks,
  notification: (enteredLevel) => ({
    message: `等级提升至${enteredLevel}级，已清除属性升级标记，并提升了熟练度`,
    type: "success",
  }),
}

export const LEVEL_ENTRY_AUTOMATIONS: LevelEntryAutomationRegistry = {
  5: [clearAttributeUpgradeMarksAutomation],
  8: [clearAttributeUpgradeMarksAutomation],
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

export function runLevelEntryAutomations(
  sheetData: SheetData,
  enteredLevels: readonly number[],
  registry: LevelEntryAutomationRegistry,
): SheetData {
  return runLevelEntryAutomationsWithNotifications(sheetData, enteredLevels, registry).sheetData
}

export function runLevelEntryAutomationsWithNotifications(
  sheetData: SheetData,
  enteredLevels: readonly number[],
  registry: LevelEntryAutomationRegistry,
): LevelEntryAutomationResult {
  return enteredLevels.reduce<LevelEntryAutomationResult>((currentResult, enteredLevel) => {
    const automations = registry[enteredLevel] ?? []
    return automations.reduce<LevelEntryAutomationResult>((automatedResult, automation) => {
      if (typeof automation === "function") {
        return {
          ...automatedResult,
          sheetData: automation(automatedResult.sheetData),
        }
      }

      return {
        sheetData: automation.apply(automatedResult.sheetData),
        notifications: [
          ...automatedResult.notifications,
          ...(automation.notification ? [automation.notification(enteredLevel)] : []),
        ],
      }
    }, currentResult)
  }, { sheetData, notifications: [] })
}

export function applyLevelEntryAutomations(sheetData: SheetData, newLevel: string): SheetData {
  return runLevelEntryAutomations(
    sheetData,
    enteredLevelsBetween(sheetData.level, newLevel),
    LEVEL_ENTRY_AUTOMATIONS,
  )
}

export function applyLevelEntryAutomationsWithNotifications(
  sheetData: SheetData,
  newLevel: string,
): LevelEntryAutomationResult {
  return runLevelEntryAutomationsWithNotifications(
    sheetData,
    enteredLevelsBetween(sheetData.level, newLevel),
    LEVEL_ENTRY_AUTOMATIONS,
  )
}
