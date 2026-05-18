import { tryParseNumber } from "@/lib/number-utils"
import type { SheetData } from "@/lib/sheet-data"
import { applyHpStressMaxInvariant } from "./hp-stress-invariants"
import { collectModifierEntries, getReferenceSummary } from "./registry"
import { readTargetValue, writeTargetValue } from "./target-accessors"
import type { ModifierTargetId, TargetModifierState } from "./types"

export function isTargetAutoCalculationEnabled(state: TargetModifierState | undefined): boolean {
  return state?.autoCalculation !== false
}

function autoCalculationTargets(sheetData: SheetData): ModifierTargetId[] {
  const targets = new Set<ModifierTargetId>()
  collectModifierEntries(sheetData).forEach(entry => {
    targets.add(entry.definition.target)
  })
  Object.keys(sheetData.modifierState?.targetStates ?? {}).forEach(target => {
    targets.add(target as ModifierTargetId)
  })

  return [...targets].filter(target => (
    isTargetAutoCalculationEnabled(sheetData.modifierState?.targetStates?.[target])
  ))
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

    const desiredValue = getReferenceSummary(next, target).calculatedFinalTotal
    if (desiredValue === undefined) return
    if (isSameTargetValue(currentValue, desiredValue)) return

    next = writeTargetValueFromSync(next, target, desiredValue)
    changed = true
  })

  return changed ? next : sheetData
}
