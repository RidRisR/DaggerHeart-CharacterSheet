import type { SheetData } from "@/lib/sheet-data"
import { entryKind, entryTarget } from "./entry-utils"
import { collectModifierEntries } from "./registry"
import type { ModifierEntryId, ModifierState, ModifierTargetId } from "./types"

const EMPTY_STATE: ModifierState = {
  targetStates: {},
  entryStates: {},
}

export function reconcileModifierState(sheetData: SheetData): SheetData {
  const entries = collectModifierEntries(sheetData)
  const entryIds = new Set(entries.map(entry => entry.id))
  const baseIdsByTarget = new Map<ModifierTargetId, Set<ModifierEntryId>>()

  entries.forEach(entry => {
    if (entryKind(entry) !== "base") return

    const target = entryTarget(entry)
    const ids = baseIdsByTarget.get(target) ?? new Set<ModifierEntryId>()
    ids.add(entry.id)
    baseIdsByTarget.set(target, ids)
  })

  const currentState = sheetData.modifierState ?? EMPTY_STATE
  const nextEntryStates: ModifierState["entryStates"] = {}
  Object.entries(currentState.entryStates ?? {}).forEach(([entryId, state]) => {
    if (!entryIds.has(entryId)) return
    nextEntryStates[entryId] = state
  })

  const nextTargetStates: ModifierState["targetStates"] = {}
  Object.entries(currentState.targetStates ?? {}).forEach(([target, state]) => {
    const activeBaseId = state?.activeBaseId
    if (!activeBaseId) return
    if (!baseIdsByTarget.get(target as ModifierTargetId)?.has(activeBaseId)) return

    nextTargetStates[target as ModifierTargetId] = { activeBaseId }
  })

  return {
    ...sheetData,
    modifierState: {
      targetStates: nextTargetStates,
      entryStates: nextEntryStates,
    },
  }
}
