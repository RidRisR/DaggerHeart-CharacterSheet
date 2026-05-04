import type { SheetData } from "@/lib/sheet-data"
import { contributionToEntry, entryTarget } from "./entry-utils"
import { calculateReferenceSummary } from "./reference-calculator"
import { collectSystemModifierEntries } from "./source-definitions"
import type { ModifierEntry, ModifierTargetId } from "./types"

export function collectModifierEntries(sheetData: SheetData, target?: ModifierTargetId): ModifierEntry[] {
  const systemEntries = collectSystemModifierEntries(sheetData)
  const userEntries = (sheetData.userModifierContributions ?? [])
    .map(contribution => contributionToEntry(contribution, {
      sourceType: "user",
      sourceId: "user",
      priority: 10,
    }))
  const entries = [...systemEntries, ...userEntries]

  return target ? entries.filter(entry => entryTarget(entry) === target) : entries
}

export function getReferenceSummary(sheetData: SheetData, target: ModifierTargetId) {
  return calculateReferenceSummary({
    sheetData,
    target,
    entries: collectModifierEntries(sheetData, target),
    modifierState: sheetData.modifierState,
  })
}
