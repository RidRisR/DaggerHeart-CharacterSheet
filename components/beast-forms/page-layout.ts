import type { BeastForm, BeastFormTier } from '@/card/beast-forms/read-model'

export interface BeastFormPage {
  id: string
  tier: BeastFormTier
  forms: readonly BeastForm[]
}

// Legacy card IDs are stable contracts. Split a tier into additional pages here if needed.
export const BEAST_FORM_PAGE_LAYOUT: ReadonlyArray<{ id: string; tier: BeastFormTier; formIds: readonly string[] }> = [
  { id: 'tier-1', tier: 1, formIds: ['breast-transform-001', 'breast-transform-002', 'breast-transform-003', 'breast-transform-004', 'breast-transform-005', 'breast-transform-006'] },
  { id: 'tier-2', tier: 2, formIds: ['breast-transform-007', 'breast-transform-008', 'breast-transform-009', 'breast-transform-010', 'breast-transform-011', 'breast-transform-012'] },
  { id: 'tier-3', tier: 3, formIds: ['breast-transform-013', 'breast-transform-014', 'breast-transform-015', 'breast-transform-016', 'breast-transform-017', 'breast-transform-018'] },
  { id: 'tier-4', tier: 4, formIds: ['breast-transform-019', 'breast-transform-020', 'breast-transform-021', 'breast-transform-022', 'breast-transform-023', 'breast-transform-024'] },
]

export function buildBeastFormPages(forms: readonly BeastForm[]): BeastFormPage[] {
  const byId = new Map(forms.map(form => [form.id, form]))
  const consumed = new Set<string>()
  const pages = BEAST_FORM_PAGE_LAYOUT.map(page => ({
    id: page.id,
    tier: page.tier,
    forms: page.formIds.map(id => {
      const form = byId.get(id)
      if (!form || form.tier !== page.tier || consumed.has(id)) throw new Error(`Invalid beast form pagination: ${id}`)
      consumed.add(id)
      return form
    }),
  }))
  if (consumed.size !== forms.length) throw new Error('Beast form pagination does not cover every form exactly once')
  return pages
}
