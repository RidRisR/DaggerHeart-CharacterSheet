import type { AncestryCard } from '@/card/ancestry-card/convert'
import type { SubClassCard } from '@/card/subclass-card/convert'
import type { CardPackageState } from '../types'
import { repairCardEditorDraft } from '../services/card-draft-repair'

export function ensureAncestryPairs(ancestryCards: AncestryCard[], packageData: CardPackageState): AncestryCard[] {
  return repairCardEditorDraft({ ...packageData, ancestry: ancestryCards }).draft.ancestry ?? []
}

export function ensureSubclassTriples(subclassCards: SubClassCard[], packageData: CardPackageState): SubClassCard[] {
  return repairCardEditorDraft({ ...packageData, subclass: subclassCards }).draft.subclass ?? []
}
