import type { CardEditorAncestryCard, CardEditorSubclassCard, CardPackageState } from '../types'
import { repairCardEditorDraft } from '../services/card-draft-repair'

export function ensureAncestryPairs(
  ancestryCards: CardEditorAncestryCard[],
  packageData: CardPackageState,
): CardEditorAncestryCard[] {
  return repairCardEditorDraft({ ...packageData, ancestry: ancestryCards }).draft.ancestry ?? []
}

export function ensureSubclassTriples(
  subclassCards: CardEditorSubclassCard[],
  packageData: CardPackageState,
): CardEditorSubclassCard[] {
  return repairCardEditorDraft({ ...packageData, subclass: subclassCards }).draft.subclass ?? []
}
