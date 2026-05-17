import { tryParseNumber } from "@/lib/number-utils"
import type { SheetData } from "@/lib/sheet-data"
import { getReferenceSummary } from "./registry"
import {
  createManualBaseContribution,
  createUnattributedDeltaContribution,
  getManualBaseId,
  getUnattributedDeltaId,
} from "./special-contributions"
import { readTargetValue, writeTargetValue } from "./target-accessors"
import { isTargetAutoCalculationEnabled } from "./target-sync"
import type { ModifierContribution, ModifierEntryId, ModifierTargetId, TargetModifierState } from "./types"

function withoutUnattributedDelta(sheetData: SheetData, target: ModifierTargetId): SheetData {
  const deltaId = getUnattributedDeltaId(target)
  return {
    ...sheetData,
    userModifierContributions: (sheetData.userModifierContributions ?? []).filter(
      contribution => contribution.id !== deltaId,
    ),
  }
}

function upsertContribution(
  contributions: ModifierContribution[],
  contribution: ModifierContribution,
): ModifierContribution[] {
  const index = contributions.findIndex(entry => entry.id === contribution.id)
  if (index === -1) return [...contributions, contribution]

  const next = [...contributions]
  next[index] = contribution
  return next
}

function removeContribution(
  contributions: ModifierContribution[],
  entryId: ModifierEntryId,
): ModifierContribution[] {
  return contributions.filter(contribution => contribution.id !== entryId)
}

function writeTargetState(
  sheetData: SheetData,
  target: ModifierTargetId,
  targetState: TargetModifierState,
): SheetData {
  const nextState: TargetModifierState = {}
  if (targetState.activeBaseId !== undefined) nextState.activeBaseId = targetState.activeBaseId
  if (targetState.autoCalculation !== undefined) nextState.autoCalculation = targetState.autoCalculation

  const targetStates = { ...(sheetData.modifierState?.targetStates ?? {}) }
  if (Object.keys(nextState).length === 0) {
    delete targetStates[target]
  } else {
    targetStates[target] = nextState
  }

  return {
    ...sheetData,
    modifierState: {
      targetStates,
      entryStates: sheetData.modifierState?.entryStates ?? {},
    },
  }
}

function reconcileDeltaForNumericFinal(
  sheetData: SheetData,
  target: ModifierTargetId,
  finalValue: number,
  autoCalculation: boolean | undefined,
): SheetData {
  const summary = getReferenceSummary(withoutUnattributedDelta(sheetData, target), target)
  const activeBase = summary.activeBase ?? summary.bases[0]

  if (!activeBase) {
    const manualBase = createManualBaseContribution(target, finalValue)
    const contributions = upsertContribution(
      removeContribution(sheetData.userModifierContributions ?? [], getUnattributedDeltaId(target)),
      manualBase,
    )

    const withContributions = {
      ...sheetData,
      userModifierContributions: contributions,
    }
    const withTarget = writeTargetValue(withContributions, target, finalValue)
    return writeTargetState(withTarget, target, {
      activeBaseId: getManualBaseId(target),
      autoCalculation: true,
    })
  }

  const referenceTotal = summary.referenceTotal ?? 0
  const delta = finalValue - referenceTotal
  let contributions = removeContribution(sheetData.userModifierContributions ?? [], getUnattributedDeltaId(target))
  if (delta !== 0) {
    contributions = upsertContribution(contributions, createUnattributedDeltaContribution(target, delta))
  }

  const withContributions = {
    ...sheetData,
    userModifierContributions: contributions,
  }
  const withTarget = writeTargetValue(withContributions, target, finalValue)
  return writeTargetState(withTarget, target, {
    activeBaseId: activeBase.id,
    autoCalculation,
  })
}

export function reconcileFinalInput(
  sheetData: SheetData,
  target: ModifierTargetId,
  rawValue: unknown,
): SheetData {
  const finalValue = tryParseNumber(rawValue)
  if (finalValue === undefined) return sheetData

  return reconcileDeltaForNumericFinal(
    sheetData,
    target,
    finalValue,
    sheetData.modifierState?.targetStates?.[target]?.autoCalculation,
  )
}

export function enableAutoCalculationForTarget(
  sheetData: SheetData,
  target: ModifierTargetId,
): SheetData {
  const finalValue = tryParseNumber(readTargetValue(sheetData, target))
  if (finalValue === undefined) {
    return writeTargetState(sheetData, target, {
      ...sheetData.modifierState?.targetStates?.[target],
      autoCalculation: true,
    })
  }

  return reconcileDeltaForNumericFinal(sheetData, target, finalValue, true)
}

export function deleteSpecialBase(
  sheetData: SheetData,
  target: ModifierTargetId,
  entryId: ModifierEntryId,
): SheetData {
  const withoutDeleted = {
    ...sheetData,
    userModifierContributions: removeContribution(sheetData.userModifierContributions ?? [], entryId),
  }
  const summary = getReferenceSummary(withoutUnattributedDelta(withoutDeleted, target), target)
  const activeBase = summary.activeBase ?? summary.bases[0]
  const autoCalculation = sheetData.modifierState?.targetStates?.[target]?.autoCalculation
  const finalValue = tryParseNumber(readTargetValue(sheetData, target))

  if (!activeBase) {
    const withoutDelta = {
      ...withoutDeleted,
      userModifierContributions: removeContribution(
        withoutDeleted.userModifierContributions ?? [],
        getUnattributedDeltaId(target),
      ),
    }
    return writeTargetState(withoutDelta, target, { autoCalculation })
  }

  const withState = writeTargetState(withoutDeleted, target, {
    activeBaseId: activeBase.id,
    autoCalculation,
  })

  if (finalValue === undefined || !isTargetAutoCalculationEnabled(sheetData.modifierState?.targetStates?.[target])) return withState

  return reconcileDeltaForNumericFinal(withState, target, finalValue, true)
}
