import { tryParseNumberExpression } from "@/lib/number-utils"
import type { SheetData } from "@/lib/sheet-data"
import { applyHpStressMaxInvariant } from "./hp-stress-invariants"
import { sanitizeOtherAdjustments } from "./other-adjustments"
import { calculateReferenceSummary } from "./reference-calculator"
import { collectModifierEntries } from "./registry"
import { isUnattributedDeltaContribution } from "./special-contributions"
import { readTargetValue, writeTargetValue } from "./target-accessors"
import type { ModifierEntry, ModifierTargetId, ModifierState, TargetModifierState } from "./types"

export function isTargetAutoCalculationEnabled(state: TargetModifierState | undefined): boolean {
  return state?.autoCalculation !== false
}

const FIXED_TARGETS: ModifierTargetId[] = [
  "evasion",
  "armorMax",
  "minorThreshold",
  "majorThreshold",
  "hpMax",
  "stressMax",
  "proficiency",
  "agility.value",
  "strength.value",
  "finesse.value",
  "instinct.value",
  "presence.value",
  "knowledge.value",
]

function modifierTargetUniverse(sheetData: SheetData, entries: ModifierEntry[]): ModifierTargetId[] {
  const targets = new Set<ModifierTargetId>()
  FIXED_TARGETS.forEach(target => targets.add(target))
  for (let index = 0; index < 5; index += 1) {
    targets.add(`experienceValues.${index}` as ModifierTargetId)
  }
  entries.forEach(entry => {
    targets.add(entry.definition.target)
  })
  Object.keys(sheetData.modifierState?.targetStates ?? {}).forEach(target => {
    targets.add(target as ModifierTargetId)
  })
  sanitizeOtherAdjustments(sheetData.otherAdjustments).forEach(adjustment => {
    targets.add(adjustment.target)
  })

  return [...targets]
}

function isSameTargetValue(currentValue: unknown, desiredValue: number | string): boolean {
  if (desiredValue === "") return currentValue === ""
  if (typeof desiredValue === "number") return tryParseNumberExpression(currentValue) === desiredValue
  return String(currentValue ?? "") === desiredValue
}

function isBlankTargetValue(value: unknown): boolean {
  return value === "" || value === undefined || value === null
}

function writeTargetValueFromSync(sheetData: SheetData, target: ModifierTargetId, value: number | string): SheetData {
  return applyHpStressMaxInvariant(writeTargetValue(sheetData, target, value), target)
}

function withoutLegacyUnattributedDeltaContributions(sheetData: SheetData): SheetData {
  const contributions = sheetData.userModifierContributions ?? []
  const nextContributions = contributions.filter(
    contribution => !isUnattributedDeltaContribution(contribution),
  )

  if (nextContributions.length === contributions.length) return sheetData

  return {
    ...sheetData,
    userModifierContributions: nextContributions,
  }
}

function normalizeEntryStates(sheetData: SheetData, entries: ModifierEntry[]): SheetData {
  const entryIds = new Set(entries.map(entry => entry.id))
  const currentEntryStates = sheetData.modifierState?.entryStates ?? {}
  const nextEntryStates: ModifierState["entryStates"] = {}
  let changed = false

  Object.entries(currentEntryStates).forEach(([entryId, state]) => {
    if (!entryIds.has(entryId)) {
      changed = true
      return
    }
    nextEntryStates[entryId] = state
  })

  if (!changed) return sheetData

  return {
    ...sheetData,
    modifierState: {
      targetStates: sheetData.modifierState?.targetStates ?? {},
      entryStates: nextEntryStates,
    },
  }
}

function writeNormalizedTargetState(
  sheetData: SheetData,
  target: ModifierTargetId,
  activeBaseId: string | undefined,
): SheetData {
  const currentTargetState = sheetData.modifierState?.targetStates?.[target]
  const nextTargetState: TargetModifierState = {}

  if (activeBaseId !== undefined) nextTargetState.activeBaseId = activeBaseId
  if (currentTargetState?.autoCalculation === false) nextTargetState.autoCalculation = false

  const currentTargetStates = sheetData.modifierState?.targetStates ?? {}
  const currentStateExists = target in currentTargetStates
  const nextStateKeys = Object.keys(nextTargetState)
  const stateMatches = nextStateKeys.length === Object.keys(currentTargetState ?? {}).length
    && currentTargetState?.activeBaseId === nextTargetState.activeBaseId
    && currentTargetState?.autoCalculation === nextTargetState.autoCalculation

  if ((nextStateKeys.length === 0 && !currentStateExists) || stateMatches) return sheetData

  const targetStates = { ...currentTargetStates }
  if (nextStateKeys.length === 0) {
    delete targetStates[target]
  } else {
    targetStates[target] = nextTargetState
  }

  return {
    ...sheetData,
    modifierState: {
      targetStates,
      entryStates: sheetData.modifierState?.entryStates ?? {},
    },
  }
}

export function applyAutoCalculationForTargets(sheetData: SheetData): SheetData {
  let next = withoutLegacyUnattributedDeltaContributions(sheetData)
  const entries = collectModifierEntries(next)
  const withNormalizedEntries = normalizeEntryStates(next, entries)
  let changed = next !== sheetData || withNormalizedEntries !== next
  next = withNormalizedEntries

  modifierTargetUniverse(next, entries).forEach(target => {
    const currentValue = readTargetValue(next, target)

    const summary = calculateReferenceSummary({
      sheetData: next,
      target,
      entries,
      modifierState: next.modifierState,
    })
    const activeBaseId = summary.activeBase?.id
    const withNormalizedState = writeNormalizedTargetState(next, target, activeBaseId)
    if (withNormalizedState !== next) {
      next = withNormalizedState
      changed = true
    }

    if (!isTargetAutoCalculationEnabled(next.modifierState?.targetStates?.[target])) return
    if (!isBlankTargetValue(currentValue) && tryParseNumberExpression(currentValue) === undefined) return

    const desiredValue = summary.calculatedFinalTotal ?? ""
    const valueMatches = isSameTargetValue(currentValue, desiredValue)

    if (!valueMatches) {
      next = writeTargetValueFromSync(next, target, desiredValue)
      changed = true
    }
  })

  return changed ? next : sheetData
}
