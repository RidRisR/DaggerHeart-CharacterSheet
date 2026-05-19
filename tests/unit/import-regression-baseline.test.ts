import { describe, expect, it } from 'vitest'
import {
  validateAndProcessCharacterData,
  validateJSONCharacterData,
} from '@/lib/character-data-validator'

const validCard = {
  id: 'card-domain-1',
  name: 'Valid Domain Card',
  type: 'domain',
}

function importCandidate(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Kaka',
    level: '1',
    gold: [false, true],
    experience: ['Brave', '', '', '', ''],
    hope: [true, false, true, false],
    inventory: ['rope', '', '', '', ''],
    cards: [validCard],
    ...overrides,
  } as any
}

describe('main import and normalize regression baseline', () => {
  it('keeps JSON and HTML imports on the same processing path', () => {
    const raw = importCandidate({
      focused_card_ids: ['card-domain-1'],
      agility: { checked: true, value: '+1' },
      inventory_cards: undefined,
    })

    const jsonResult = validateJSONCharacterData(JSON.stringify(raw))
    const htmlResult = validateAndProcessCharacterData(structuredClone(raw), 'html')

    expect(jsonResult.valid).toBe(true)
    expect(htmlResult.valid).toBe(true)
    expect(jsonResult.data?.name).toBe('Kaka')
    expect(htmlResult.data?.name).toBe('Kaka')
    expect(jsonResult.data?.hope).toBe(3)
    expect(htmlResult.data?.hope).toBe(3)
    expect((jsonResult.data as any).focused_card_ids).toEqual(['card-domain-1'])
    expect((htmlResult.data as any).focused_card_ids).toEqual(['card-domain-1'])
    expect(jsonResult.data?.agility).toEqual({ checked: true, value: '1', spellcasting: false })
    expect(htmlResult.data?.agility).toEqual({ checked: true, value: '1', spellcasting: false })
    expect(jsonResult.data?.pageVisibility).toEqual({
      rangerCompanion: false,
      armorTemplate: false,
      adventureNotes: false,
    })
    expect(htmlResult.data?.pageVisibility).toEqual({
      rangerCompanion: false,
      armorTemplate: false,
      adventureNotes: false,
    })
    expect(jsonResult.data?.schemaVersion).toBe(2)
    expect(htmlResult.data?.schemaVersion).toBe(2)
  })

  it('captures current import invalid card filtering behavior', () => {
    const result = validateJSONCharacterData(JSON.stringify(importCandidate({
      cards: [
        validCard,
        { id: 'missing-name-and-type' },
      ],
    })))

    expect(result.valid).toBe(true)
    expect(result.data?.cards).toEqual([validCard])
    expect(result.data?.schemaVersion).toBe(2)
  })
})
