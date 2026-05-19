import { tryParseNumberExpression } from "@/lib/number-utils"
import type { SheetData } from "@/lib/sheet-data"
import {
  createManualFinalAdjustment,
  createUnattributedDifference,
  getOtherAdjustmentId,
  removeOtherAdjustment,
  sanitizeOtherAdjustments,
  upsertOtherAdjustment,
} from "./other-adjustments"
import { getReferenceSummary } from "./registry"
import {
  createManualBaseContribution,
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

function withoutSavedUnattributedDifference(sheetData: SheetData, target: ModifierTargetId): SheetData {
  return {
    ...withoutUnattributedDelta(sheetData, target),
    otherAdjustments: removeOtherAdjustment(
      sheetData.otherAdjustments,
      getOtherAdjustmentId(target, "unattributedDifference"),
    ),
  }
}

function withoutSavedOtherAdjustmentsForTarget(sheetData: SheetData, target: ModifierTargetId): SheetData {
  return {
    ...sheetData,
    otherAdjustments: sanitizeOtherAdjustments(sheetData.otherAdjustments).filter(
      adjustment => adjustment.target !== target,
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

function sumSavedOtherExcluding(
  sheetData: SheetData,
  target: ModifierTargetId,
  excludedKind: "manualFinalAdjustment" | "unattributedDifference",
): number {
  return sanitizeOtherAdjustments(sheetData.otherAdjustments).reduce((sum, adjustment) => {
    if (adjustment.target !== target || adjustment.kind === excludedKind) return sum
    return sum + adjustment.value
  }, 0)
}

function writeManualFinalAdjustment(
  sheetData: SheetData,
  target: ModifierTargetId,
  finalValue: number,
  referenceTotal: number,
): SheetData {
  const manualAdjustmentId = getOtherAdjustmentId(target, "manualFinalAdjustment")
  const otherTotalExcludingManual = sumSavedOtherExcluding(sheetData, target, "manualFinalAdjustment")
  const delta = finalValue - referenceTotal - otherTotalExcludingManual
  const withoutManual = removeOtherAdjustment(sheetData.otherAdjustments, manualAdjustmentId)
  const otherAdjustments = delta === 0
    ? withoutManual
    : upsertOtherAdjustment(withoutManual, createManualFinalAdjustment(target, delta))

  return {
    ...sheetData,
    otherAdjustments,
  }
}

function writeMaterializedUnattributedDifference(
  sheetData: SheetData,
  target: ModifierTargetId,
  finalValue: number,
  referenceTotal: number,
): SheetData {
  const unattributedAdjustmentId = getOtherAdjustmentId(target, "unattributedDifference")
  const otherTotalExcludingUnattributed = sumSavedOtherExcluding(sheetData, target, "unattributedDifference")
  const delta = finalValue - referenceTotal - otherTotalExcludingUnattributed
  const withoutUnattributed = removeOtherAdjustment(sheetData.otherAdjustments, unattributedAdjustmentId)
  const otherAdjustments = delta === 0
    ? withoutUnattributed
    : upsertOtherAdjustment(withoutUnattributed, createUnattributedDifference(target, delta))

  return {
    ...sheetData,
    otherAdjustments,
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
    const withoutTargetOther = withoutSavedOtherAdjustmentsForTarget(withContributions, target)
    const withTarget = writeTargetValue(withoutTargetOther, target, finalValue)
    return writeTargetState(withTarget, target, {
      activeBaseId: getManualBaseId(target),
      autoCalculation: true,
    })
  }

  const referenceTotal = summary.referenceTotal ?? 0
  let contributions = removeContribution(sheetData.userModifierContributions ?? [], getUnattributedDeltaId(target))

  const withContributions = {
    ...sheetData,
    userModifierContributions: contributions,
  }
  const withManualFinalAdjustment = writeManualFinalAdjustment(withContributions, target, finalValue, referenceTotal)
  const withTarget = writeTargetValue(withManualFinalAdjustment, target, finalValue)
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
  const finalValue = tryParseNumberExpression(rawValue)
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
  const finalValue = tryParseNumberExpression(readTargetValue(sheetData, target))
  if (finalValue === undefined) {
    return writeTargetState(sheetData, target, {
      ...sheetData.modifierState?.targetStates?.[target],
      autoCalculation: true,
    })
  }

  const summary = getReferenceSummary(withoutUnattributedDelta(sheetData, target), target)
  const activeBase = summary.activeBase ?? summary.bases[0]

  if (!activeBase || summary.referenceTotal === undefined) {
    return writeTargetState(withoutUnattributedDelta(sheetData, target), target, {
      ...sheetData.modifierState?.targetStates?.[target],
      autoCalculation: true,
    })
  }

  const withContributions = withoutUnattributedDelta(sheetData, target)
  const withUnattributedDifference = writeMaterializedUnattributedDifference(
    withContributions,
    target,
    finalValue,
    summary.referenceTotal,
  )
  const withTarget = writeTargetValue(withUnattributedDifference, target, finalValue)
  return writeTargetState(withTarget, target, {
    activeBaseId: activeBase.id,
    autoCalculation: true,
  })
}

export function disableAutoCalculationForTarget(
  sheetData: SheetData,
  target: ModifierTargetId,
): SheetData {
  const withUnattributedRemoved = withoutSavedUnattributedDifference(sheetData, target)
  return writeTargetState(withUnattributedRemoved, target, {
    ...sheetData.modifierState?.targetStates?.[target],
    autoCalculation: false,
  })
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
  const finalValue = tryParseNumberExpression(readTargetValue(sheetData, target))

  if (!activeBase) {
    const withoutDelta = {
      ...withoutDeleted,
      userModifierContributions: removeContribution(
        withoutDeleted.userModifierContributions ?? [],
        getUnattributedDeltaId(target),
      ),
    }
    const withoutTargetOther = withoutSavedOtherAdjustmentsForTarget(withoutDelta, target)
    return writeTargetState(withoutTargetOther, target, { autoCalculation })
  }

  const withState = writeTargetState(withoutDeleted, target, {
    activeBaseId: activeBase.id,
    autoCalculation,
  })

  if (finalValue === undefined || !isTargetAutoCalculationEnabled(sheetData.modifierState?.targetStates?.[target])) return withState

  return reconcileDeltaForNumericFinal(withState, target, finalValue, true)
}
