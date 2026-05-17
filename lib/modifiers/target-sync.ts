import { tryParseNumber } from "@/lib/number-utils"
import type { SheetData } from "@/lib/sheet-data"
import { getReferenceSummary } from "./registry"
import { readTargetValue, writeTargetValue } from "./target-accessors"
import type { ModifierTargetId, TargetModifierState } from "./types"

export interface SyncTargetOnceResult {
  sheetData: SheetData
  applied: boolean
}

export function getTargetSyncFallbackValue(target: ModifierTargetId): number | string | undefined {
  if (target === "hpMax" || target === "stressMax") return 6
  if (target === "proficiency") return undefined
  if (
    target === "evasion" ||
    target === "armorMax" ||
    target === "minorThreshold" ||
    target === "majorThreshold" ||
    target.startsWith("experienceValues.") ||
    target.endsWith(".value")
  ) {
    return ""
  }
  return undefined
}

function isContinuousState(state: TargetModifierState | undefined): boolean {
  const legacyState = state as (TargetModifierState & { syncMode?: unknown }) | undefined
  return state?.autoCalculation === true || legacyState?.syncMode === "continuous"
}

function continuousTargets(sheetData: SheetData): ModifierTargetId[] {
  return Object.entries(sheetData.modifierState?.targetStates ?? {})
    .filter(([, state]) => isContinuousState(state))
    .map(([target]) => target as ModifierTargetId)
}

function desiredContinuousValue(sheetData: SheetData, target: ModifierTargetId): number | string | undefined {
  const summary = getReferenceSummary(sheetData, target)
  return summary.referenceTotal ?? getTargetSyncFallbackValue(target)
}

function isSameTargetValue(currentValue: unknown, desiredValue: number | string): boolean {
  if (desiredValue === "") return currentValue === ""
  if (typeof desiredValue === "number") return tryParseNumber(currentValue) === desiredValue
  return String(currentValue ?? "") === desiredValue
}

function writeTargetValueFromSync(sheetData: SheetData, target: ModifierTargetId, value: number | string): SheetData {
  return writeTargetValue(sheetData, target, value)
}

export function syncTargetOnce(sheetData: SheetData, target: ModifierTargetId): SyncTargetOnceResult {
  const summary = getReferenceSummary(sheetData, target)
  if (summary.referenceTotal === undefined) {
    return { sheetData, applied: false }
  }

  if (isSameTargetValue(readTargetValue(sheetData, target), summary.referenceTotal)) {
    return { sheetData, applied: false }
  }

  return {
    sheetData: writeTargetValueFromSync(sheetData, target, summary.referenceTotal),
    applied: true,
  }
}

export function applyContinuousTargetSync(sheetData: SheetData): SheetData {
  let next = sheetData
  let changed = false

  continuousTargets(sheetData).forEach(target => {
    const desiredValue = desiredContinuousValue(next, target)
    if (desiredValue === undefined) return
    if (isSameTargetValue(readTargetValue(next, target), desiredValue)) return

    next = writeTargetValueFromSync(next, target, desiredValue)
    changed = true
  })

  return changed ? next : sheetData
}
