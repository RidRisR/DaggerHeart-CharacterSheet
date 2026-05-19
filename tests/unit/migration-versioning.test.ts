import { describe, expect, it } from 'vitest'
import { defaultSheetData } from '@/lib/default-sheet-data'
import { migrateSheetData } from '@/lib/sheet-data-migration'
import {
  CURRENT_SCHEMA_VERSION,
  assertSupportedSchemaVersion,
  detectSchemaVersion,
} from '@/lib/sheet-schema-version'

const validCard = {
  id: 'card-domain-1',
  name: 'Valid Domain Card',
  type: 'domain',
}

function v0Sheet(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Kaka',
    level: '1',
    gold: [false],
    experience: ['Scout', '', '', '', ''],
    hope: [true, false, true, false],
    inventory: ['rope', '', '', '', ''],
    cards: [validCard],
    ...overrides,
  } as any
}

describe('sheet schema version', () => {
  it('starts main versioning at schema version 1', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(1)
    expect(defaultSheetData.schemaVersion).toBe(1)
  })

  it('treats missing, invalid, or non-integer schema versions as v0', () => {
    expect(detectSchemaVersion({})).toBe(0)
    expect(detectSchemaVersion({ schemaVersion: '1' })).toBe(0)
    expect(detectSchemaVersion({ schemaVersion: Number.NaN })).toBe(0)
    expect(detectSchemaVersion({ schemaVersion: 1.5 })).toBe(0)
  })

  it('detects supported numeric schema versions', () => {
    expect(detectSchemaVersion({ schemaVersion: 0 })).toBe(0)
    expect(detectSchemaVersion({ schemaVersion: 1 })).toBe(1)
  })

  it('rejects saves from newer schema versions', () => {
    expect(() => assertSupportedSchemaVersion(2)).toThrow(/newer schema version/i)
  })
})

describe('sheet data version migration', () => {
  it('migrates v0 data to v1 and writes schemaVersion', () => {
    const migrated = migrateSheetData(v0Sheet())

    expect(migrated.schemaVersion).toBe(1)
    expect(migrated.hope).toBe(3)
    expect(migrated.hopeMax).toBe(4)
    expect(migrated.inventory_cards).toHaveLength(20)
    expect(migrated.notebook?.pages).toHaveLength(1)
  })

  it('keeps v1 data stable and idempotent', () => {
    const once = migrateSheetData(v0Sheet())
    const twice = migrateSheetData(once)

    expect(twice).toEqual(once)
  })

  it('uses raw legacy fields before defaults can mask them', () => {
    const migrated = migrateSheetData(v0Sheet({
      includePageThreeInExport: true,
    }))

    expect(migrated.pageVisibility).toEqual({
      rangerCompanion: true,
      armorTemplate: false,
      adventureNotes: false,
    })
    expect('includePageThreeInExport' in migrated).toBe(false)
  })

  it('throws for newer schema versions', () => {
    expect(() => migrateSheetData(v0Sheet({ schemaVersion: 2 }))).toThrow(/newer schema version/i)
  })
})
