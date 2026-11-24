import { describe, expect, it } from 'vitest'
import { migrateSheetData } from '@/lib/sheet-data-migration'
import { CURRENT_SCHEMA_VERSION } from '@/lib/sheet-schema-version'
import { defaultSheetData } from '@/lib/default-sheet-data'
import { validateAndProcessCharacterData, validateJSONCharacterData } from '@/lib/character-data-validator'
import { isCurrentMartialStancesState, normalizeMartialStancesState } from '../state'

const selected = { known: ['favored', 'quick'], active: 'quick', focus: 4 }

describe('martial stance character data boundary', () => {
  it.each([0, 1, 2, 3, 4])('loads version %i with the page off and empty records', schemaVersion => {
    const raw = { ...defaultSheetData, schemaVersion, martialStances: undefined, pageVisibility: { rangerCompanion: true, armorTemplate: false, adventureNotes: true, beastForms: true } }
    const migrated = migrateSheetData(raw)
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(migrated.pageVisibility).toEqual({ ...raw.pageVisibility, martialStances: false })
    expect(migrated.martialStances).toEqual({ known: [], active: null, focus: 0 })
    expect(migrateSheetData(migrated)).toEqual(migrated)
    expect(raw.martialStances).toBeUndefined()
  })

  it('preserves page visibility and the complete record through JSON and embedded-HTML character imports', () => {
    const sheet = migrateSheetData({ ...defaultSheetData, name: '武艺达人', cards: [{ id: 'brawler', name: '格斗家', type: 'profession' }], martialStances: selected, pageVisibility: { ...defaultSheetData.pageVisibility, martialStances: true } })
    for (const result of [validateJSONCharacterData(JSON.stringify(sheet)), validateAndProcessCharacterData(structuredClone(sheet), 'html')]) {
      expect(result.valid).toBe(true)
      expect(result.data?.martialStances).toEqual(selected)
      expect(result.data?.pageVisibility?.martialStances).toBe(true)
    }
  })

  it.each([
    { ...selected, focus: 7 }, { ...selected, focus: -1 }, { ...selected, focus: '3' },
    { ...selected, active: 'honed' }, { ...selected, known: ['favored', 'favored'] },
    { ...selected, known: ['unknown'] }, null,
  ])('rejects malformed records without losing or guessing saved content', value => {
    expect(isCurrentMartialStancesState(value)).toBe(false)
    expect(() => normalizeMartialStancesState(value)).toThrow(/martialStances/)
    const result = validateJSONCharacterData(JSON.stringify({ ...defaultSheetData, name: 'Bad record', cards: [{ id: 'brawler', name: '格斗家', type: 'profession' }], martialStances: value }))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/martialStances/)
  })
})
