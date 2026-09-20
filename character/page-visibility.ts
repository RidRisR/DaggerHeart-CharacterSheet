export const OPTIONAL_PAGE_KEYS = ['rangerCompanion', 'armorTemplate', 'adventureNotes', 'beastForms'] as const
export type OptionalPageKey = typeof OPTIONAL_PAGE_KEYS[number]
export type CharacterPageVisibility = Record<OptionalPageKey, boolean>

export const DEFAULT_PAGE_VISIBILITY: CharacterPageVisibility = {
  rangerCompanion: false,
  armorTemplate: false,
  adventureNotes: false,
  beastForms: false,
}

/** Missing optional-page preferences in older sheets mean the page is off. */
export function normalizePageVisibility(value: unknown): CharacterPageVisibility {
  if (value === undefined) return { ...DEFAULT_PAGE_VISIBILITY }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid pageVisibility')
  }
  const result = { ...DEFAULT_PAGE_VISIBILITY }
  for (const key of OPTIONAL_PAGE_KEYS) {
    const field = (value as Record<string, unknown>)[key]
    if (field === undefined) continue
    if (typeof field !== 'boolean') throw new Error(`Invalid pageVisibility.${key}`)
    result[key] = field
  }
  return result
}

export function isCurrentPageVisibility(value: unknown): value is CharacterPageVisibility {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && OPTIONAL_PAGE_KEYS.every(key => typeof (value as Record<string, unknown>)[key] === 'boolean')
}
