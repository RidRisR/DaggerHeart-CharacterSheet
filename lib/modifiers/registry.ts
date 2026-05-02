import type { SheetData } from "@/lib/sheet-data"
import { calculateReferenceSummary } from "./reference-calculator"
import { collectSystemModifierEntries } from "./source-definitions"
import type { ModifierEntry, ModifierTargetId } from "./types"

export function collectModifierEntries(sheetData: SheetData, target?: ModifierTargetId): ModifierEntry[] {
  const systemEntries = collectSystemModifierEntries(sheetData)
  const userEntries = Object.values(sheetData.modifierState?.byTarget ?? {})
    .flatMap(state => state?.userEntries ?? [])
  const entries = [...systemEntries, ...userEntries]

  return target ? entries.filter(entry => entry.target === target) : entries
}

export function getReferenceSummary(sheetData: SheetData, target: ModifierTargetId) {
  return calculateReferenceSummary({
    sheetData,
    target,
    entries: collectModifierEntries(sheetData, target),
    targetState: sheetData.modifierState?.byTarget?.[target],
  })
}
