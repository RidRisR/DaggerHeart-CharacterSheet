import type { SheetData } from "@/lib/sheet-data"
import { sanitizeEquipmentModifierContributions } from "@/automation/equipment/contribution-utils"
import { contributionToEntry, entryTarget } from "./entry-utils"
import { calculateReferenceSummary } from "./reference-calculator"
import { collectSystemModifierEntries } from "./source-definitions"
import type { ModifierEntry, ModifierTargetId } from "./types"

function collectEquipmentModifierEntries(sheetData: SheetData): ModifierEntry[] {
  const equipment = sheetData.equipment
  const sources = [
    { slot: equipment.weaponSlots.primary, sourceId: "weapon:primary", priority: 90 },
    { slot: equipment.weaponSlots.secondary, sourceId: "weapon:secondary", priority: 90 },
    { slot: equipment.armorSlot, sourceId: "armor:current", priority: 90 },
  ]

  return sources.flatMap(({ slot, sourceId, priority }) =>
    sanitizeEquipmentModifierContributions(slot.modifierContributions).map(contribution =>
      contributionToEntry(contribution, {
        sourceType: "equipment",
        sourceId,
        priority,
        formatLabel: label => `${slot.name || "装备"}：${label}`,
      }),
    ),
  )
}

export function collectModifierEntries(sheetData: SheetData, target?: ModifierTargetId): ModifierEntry[] {
  const systemEntries = collectSystemModifierEntries(sheetData)
  const equipmentModifierEntries = collectEquipmentModifierEntries(sheetData)
  const userModifierEntries = (sheetData.userModifierContributions ?? [])
    .map(contribution => contributionToEntry(contribution, {
      sourceType: "user",
      sourceId: "user",
      priority: 10,
    }))
  const entries = [...systemEntries, ...equipmentModifierEntries, ...userModifierEntries]

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
