import { describe, expect, it } from 'vitest'
import { defaultSheetData } from '@/lib/default-sheet-data'
import {
  CURRENT_SCHEMA_VERSION,
  assertSupportedSchemaVersion,
  detectSchemaVersion,
} from '@/lib/sheet-schema-version'

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
