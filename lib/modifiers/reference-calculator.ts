import { tryParseNumber } from "@/lib/number-utils"
import type { SheetData } from "@/lib/sheet-data"
import { entryKind, entryTarget, entryValue } from "./entry-utils"
import { sanitizeOtherAdjustments } from "./other-adjustments"
import { readTargetValue } from "./target-accessors"
import type { ModifierEntry, ModifierState, ModifierTargetId, OtherAdjustment } from "./types"

export interface ReferenceSummary {
  target: ModifierTargetId
  entries: ModifierEntry[]
  bases: ModifierEntry[]
  modifiers: ModifierEntry[]
  enabledModifiers: ModifierEntry[]
  disabledEntries: ModifierEntry[]
  activeBase?: ModifierEntry
  activeBaseChanged: boolean
  unknownBase: boolean
  referenceTotal?: number
  otherAdjustments: OtherAdjustment[]
  otherTotal: number
  calculatedFinalTotal?: number
  unattributedDelta?: number
}

export interface CalculateReferenceSummaryInput {
  sheetData: SheetData
  target: ModifierTargetId
  entries: ModifierEntry[]
  modifierState?: ModifierState
}

function sortEntries(a: ModifierEntry, b: ModifierEntry): number {
  if (a.priority !== b.priority) return a.priority - b.priority
  return a.id.localeCompare(b.id)
}

export function calculateReferenceSummary(input: CalculateReferenceSummaryInput): ReferenceSummary {
  const targetEntries = input.entries
    .filter(entry => entryTarget(entry) === input.target)
    .sort(sortEntries)
  const disabledEntries: ModifierEntry[] = []
  const bases = targetEntries.filter(entry => entryKind(entry) === "base")
  const modifiers = targetEntries.filter(entry => entryKind(entry) === "modifier")
  const enabledModifiers = modifiers
  const otherAdjustments = sanitizeOtherAdjustments(input.sheetData.otherAdjustments).filter(
    adjustment => adjustment.target === input.target,
  )
  const otherTotal = otherAdjustments.reduce((sum, adjustment) => sum + adjustment.value, 0)

  const savedBaseId = input.modifierState?.targetStates?.[input.target]?.activeBaseId
  const savedBase = savedBaseId ? bases.find(entry => entry.id === savedBaseId) : undefined
  const activeBase = savedBase ?? bases[0]
  const activeBaseChanged = Boolean(savedBaseId && !savedBase && activeBase)

  if (!activeBase) {
    return {
      target: input.target,
      entries: targetEntries,
      bases,
      modifiers,
      enabledModifiers,
      disabledEntries,
      activeBase: undefined,
      activeBaseChanged: false,
      unknownBase: true,
      otherAdjustments,
      otherTotal,
      calculatedFinalTotal: undefined,
      unattributedDelta: undefined,
    }
  }

  const referenceTotal = entryValue(activeBase) + enabledModifiers.reduce((sum, entry) => sum + entryValue(entry), 0)
  const calculatedFinalTotal = referenceTotal + otherTotal
  const finalValue = tryParseNumber(readTargetValue(input.sheetData, input.target))

  return {
    target: input.target,
    entries: targetEntries,
    bases,
    modifiers,
    enabledModifiers,
    disabledEntries,
    activeBase,
    activeBaseChanged,
    unknownBase: false,
    referenceTotal,
    otherAdjustments,
    otherTotal,
    calculatedFinalTotal,
    unattributedDelta: finalValue === undefined ? undefined : finalValue - calculatedFinalTotal,
  }
}
