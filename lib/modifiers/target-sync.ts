import { tryParseNumber } from "@/lib/number-utils"
import type { SheetData } from "@/lib/sheet-data"
import { applyHpStressMaxInvariant } from "./hp-stress-invariants"
import { getReferenceSummary } from "./registry"
import { readTargetValue, writeTargetValue } from "./target-accessors"
import type { ModifierTargetId, TargetModifierState } from "./types"

function isAutoCalculationState(state: TargetModifierState | undefined): boolean {
  return state?.autoCalculation === true
}

function autoCalculationTargets(sheetData: SheetData): ModifierTargetId[] {
  return Object.entries(sheetData.modifierState?.targetStates ?? {})
    .filter(([, state]) => isAutoCalculationState(state))
    .map(([target]) => target as ModifierTargetId)
}

function isSameTargetValue(currentValue: unknown, desiredValue: number | string): boolean {
  if (desiredValue === "") return currentValue === ""
  if (typeof desiredValue === "number") return tryParseNumber(currentValue) === desiredValue
  return String(currentValue ?? "") === desiredValue
}

function isBlankTargetValue(value: unknown): boolean {
  return value === "" || value === undefined || value === null
}

function writeTargetValueFromSync(sheetData: SheetData, target: ModifierTargetId, value: number | string): SheetData {
  return applyHpStressMaxInvariant(writeTargetValue(sheetData, target, value), target)
}

export function applyAutoCalculationForTargets(sheetData: SheetData): SheetData {
  let next = sheetData
  let changed = false

  autoCalculationTargets(sheetData).forEach(target => {
    const currentValue = readTargetValue(next, target)
    if (!isBlankTargetValue(currentValue) && tryParseNumber(currentValue) === undefined) return

    const desiredValue = getReferenceSummary(next, target).referenceTotal
    if (desiredValue === undefined) return
    if (isSameTargetValue(currentValue, desiredValue)) return

    next = writeTargetValueFromSync(next, target, desiredValue)
    changed = true
  })

  return changed ? next : sheetData
}
