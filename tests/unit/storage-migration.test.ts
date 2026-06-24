import { beforeEach, describe, expect, it } from 'vitest'
import {
  ACTIVE_CHARACTER_ID_KEY,
  CHARACTER_DATA_PREFIX,
  duplicateCharacter,
  loadCharacterById,
  migrateToMultiCharacterStorage,
  saveCharacterById,
} from '@/lib/multi-character-storage'

const validCard = {
  id: 'card-domain-1',
  name: 'Valid Domain Card',
  type: 'domain',
}

function v0Sheet(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Stored Kaka',
    level: '1',
    gold: [false],
    experience: ['Scout', '', '', '', ''],
    hope: [true, false, true, false],
    inventory: ['rope', '', '', '', ''],
    cards: [validCard],
    ...overrides,
  } as any
}

describe('storage migration entrypoints', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loads and persists v3 data from stored v0 character data', () => {
    localStorage.setItem('dh_character_test-id', JSON.stringify(v0Sheet()))

    const loaded = loadCharacterById('test-id')
    const stored = JSON.parse(localStorage.getItem('dh_character_test-id') || '{}')

    expect(loaded?.schemaVersion).toBe(3)
    expect(loaded?.hope).toBe(3)
    expect(stored.schemaVersion).toBe(3)
    expect(stored.hope).toBe(3)
  })

  it('duplicates characters as current schema data', () => {
    saveCharacterById('source-id', v0Sheet())

    const duplicate = duplicateCharacter('source-id', 'Copy')

    expect(duplicate?.schemaVersion).toBe(3)
    expect(duplicate?.name).toBe('Copy')
    expect(duplicate?.hope).toBe(3)
  })

  it('saves legacy single-character migration output as current schema data', () => {
    localStorage.setItem('charactersheet_data', JSON.stringify(v0Sheet({
      includePageThreeInExport: true,
    })))
    localStorage.setItem('focused_card_ids', JSON.stringify(['card-domain-1']))

    migrateToMultiCharacterStorage()

    const activeId = localStorage.getItem(ACTIVE_CHARACTER_ID_KEY)
    expect(activeId).toBeTruthy()

    const stored = JSON.parse(localStorage.getItem(`${CHARACTER_DATA_PREFIX}${activeId}`) || '{}')
    expect(stored.schemaVersion).toBe(3)
    expect(stored.hope).toBe(3)
    expect(stored.focused_card_ids).toEqual(['card-domain-1'])
    expect(stored.pageVisibility).toEqual({
      rangerCompanion: true,
      armorTemplate: false,
      adventureNotes: false,
    })
  })
})
