import { describe, expect, it } from 'vitest'
import { normalizePageVisibility, isCurrentPageVisibility } from '@/character/page-visibility'
import { migrateSheetData } from '@/lib/sheet-data-migration'
import { CURRENT_SCHEMA_VERSION } from '@/lib/sheet-schema-version'
import { validateAndProcessCharacterData, validateJSONCharacterData } from '@/lib/character-data-validator'

const visibility = { rangerCompanion: true, armorTemplate: false, adventureNotes: true }

describe('beast form page preference migration', () => {
  it.each([0, 1, 2, 3])('upgrades version %i with the page off and preserves existing preferences', schemaVersion => {
    const raw = { schemaVersion, pageVisibility: visibility, cards: [] }
    const result = migrateSheetData(raw)
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(result.pageVisibility).toEqual({ ...visibility, beastForms: false })
    expect(raw.pageVisibility).not.toHaveProperty('beastForms')
    expect(migrateSheetData(result)).toEqual(result)
  })

  it.each([true, false])('preserves explicit %s through save and JSON/HTML import', beastForms => {
    const sheet = migrateSheetData({ name: 'Druid', level: '1', gold: [], experience: [], hope: 2, inventory: [],
      cards: [{ id: 'druid', name: 'Druid', type: 'profession' }], pageVisibility: { ...visibility, beastForms } })
    const json = validateJSONCharacterData(JSON.stringify(sheet))
    const html = validateAndProcessCharacterData(structuredClone(sheet), 'html')
    expect(json.valid).toBe(true)
    expect(html.valid).toBe(true)
    expect(json.data?.pageVisibility).toEqual({ ...visibility, beastForms })
    expect(html.data?.pageVisibility).toEqual(json.data?.pageVisibility)
  })

  it('rejects malformed booleans and distinguishes complete current-schema preferences', () => {
    expect(() => normalizePageVisibility({ ...visibility, beastForms: 'yes' })).toThrow(/beastForms/)
    expect(isCurrentPageVisibility(visibility)).toBe(false)
    expect(isCurrentPageVisibility({ ...visibility, beastForms: false })).toBe(true)
  })
})
