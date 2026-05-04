import { tryParseNumber } from "@/lib/number-utils"
import type { SheetData } from "@/lib/sheet-data"
import { entryKind, entryTarget, entryValue } from "./entry-utils"
import { readTargetValue } from "./target-accessors"
import type { ModifierEntry, ModifierState, ModifierTargetId } from "./types"

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
  const disabledEntries = targetEntries.filter(entry => input.modifierState?.entryStates?.[entry.id]?.enabled === false)
  const enabledEntries = targetEntries.filter(entry => input.modifierState?.entryStates?.[entry.id]?.enabled !== false)
  const bases = enabledEntries.filter(entry => entryKind(entry) === "base")
  const modifiers = targetEntries.filter(entry => entryKind(entry) === "modifier")
  const enabledModifiers = enabledEntries.filter(entry => entryKind(entry) === "modifier")

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
    }
  }

  const referenceTotal = entryValue(activeBase) + enabledModifiers.reduce((sum, entry) => sum + entryValue(entry), 0)
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
    unattributedDelta: finalValue === undefined ? undefined : finalValue - referenceTotal,
  }
}
