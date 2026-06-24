import type { ModifierEntry } from "@/automation/core/types"
import { buildCardAutomationSnapshot } from "@/card/automation/snapshot"
import { resolveCardAutomation } from "@/card/automation/resolve"
import { projectCardAutomationContributions } from "@/card/automation/project-contributions"
import type { SheetData } from "@/lib/sheet-data"
import { cardContributionToEntry } from "./contribution-utils"

export function collectCardModifierEntries(sheetData: SheetData): ModifierEntry[] {
  const snapshot = buildCardAutomationSnapshot(sheetData)
  const resolved = resolveCardAutomation(snapshot)
  const contributions = projectCardAutomationContributions(resolved)

  return contributions.flatMap(cardContributionToEntry)
}
