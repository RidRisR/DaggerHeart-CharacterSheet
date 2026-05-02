import { isValidNumber, parseToNumber } from "@/lib/number-utils"
import type { SheetData } from "@/lib/sheet-data"
import { readTargetValue } from "./target-accessors"
import type { ModifierEntry, ModifierTargetId, TargetModifierState } from "./types"

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
  targetState?: TargetModifierState
}

function sortEntries(a: ModifierEntry, b: ModifierEntry): number {
  if (a.priority !== b.priority) return a.priority - b.priority
  return a.id.localeCompare(b.id)
}

function parseFinalValue(sheetData: SheetData, target: ModifierTargetId): number | undefined {
  const value = readTargetValue(sheetData, target)
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && isValidNumber(value)) return parseToNumber(value, 0)
  return undefined
}

export function calculateReferenceSummary(input: CalculateReferenceSummaryInput): ReferenceSummary {
  const targetEntries = input.entries
    .filter(entry => entry.target === input.target)
    .sort(sortEntries)
  const disabledIds = new Set(input.targetState?.disabledEntryIds ?? [])
  const disabledEntries = targetEntries.filter(entry => disabledIds.has(entry.id))
  const enabledEntries = targetEntries.filter(entry => !disabledIds.has(entry.id))
  const bases = enabledEntries.filter(entry => entry.kind === "base")
  const modifiers = targetEntries.filter(entry => entry.kind === "modifier")
  const enabledModifiers = enabledEntries.filter(entry => entry.kind === "modifier")

  const savedBaseId = input.targetState?.activeBaseId
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

  const referenceTotal = activeBase.value + enabledModifiers.reduce((sum, entry) => sum + entry.value, 0)
  const finalValue = parseFinalValue(input.sheetData, input.target)

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
