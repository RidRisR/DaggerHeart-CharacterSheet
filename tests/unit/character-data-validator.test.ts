import { describe, expect, it } from 'vitest'
import {
  validateAndProcessCharacterData,
  validateJSONCharacterData,
} from '@/lib/character-data-validator'
import { defaultSheetData } from '@/lib/default-sheet-data'

const validCard = {
  id: 'card-domain-1',
  name: 'Valid Domain Card',
  type: 'domain',
}

function rawImport(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Kaka',
    level: '1',
    gold: [false],
    experience: ['Scout', '', '', '', ''],
    hope: [true, false, true, false],
    inventory: ['rope', '', '', '', ''],
    cards: [validCard, { id: 'invalid' }],
    unknownFutureField: { keep: true },
    ...overrides,
  } as any
}

describe('character data import validation', () => {
  it('migrates JSON imports to v1 and preserves unknown fields through migration', () => {
    const result = validateJSONCharacterData(JSON.stringify(rawImport()))

    expect(result.valid).toBe(true)
    expect(result.data?.schemaVersion).toBe(1)
    expect(result.data?.hope).toBe(3)
    expect((result.data as any).unknownFutureField).toEqual({ keep: true })
  })

  it('keeps HTML and JSON on the same import processing path', () => {
    const raw = rawImport({ focused_card_ids: ['card-domain-1'] })
    const json = validateJSONCharacterData(JSON.stringify(raw))
    const html = validateAndProcessCharacterData(structuredClone(raw), 'html')

    expect(json.valid).toBe(true)
    expect(html.valid).toBe(true)
    expect(json.data?.schemaVersion).toBe(1)
    expect(html.data?.schemaVersion).toBe(1)
    expect(json.data?.hope).toBe(html.data?.hope)
    expect(json.data?.cards).toEqual(html.data?.cards)
    expect((json.data as any).focused_card_ids).toEqual(['card-domain-1'])
    expect((html.data as any).focused_card_ids).toEqual(['card-domain-1'])
  })

  it('rejects non-object imports without mutating them', () => {
    const result = validateAndProcessCharacterData(null)

    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/JSON对象/)
  })

  it('keeps current invalid card filtering behavior', () => {
    const result = validateJSONCharacterData(JSON.stringify(rawImport()))

    expect(result.valid).toBe(true)
    expect(result.data?.cards).toEqual([validCard])
  })

  it('preserves persisted modifier fields through JSON import validation', () => {
    const payload = {
      ...defaultSheetData,
      name: 'Modifier Import',
      evasion: '12',
      cards: [],
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: 'user:evasion-base' },
        },
        entryStates: {
          'user:evasion-mod': { enabled: false },
        },
      },
      userModifierContributions: [
        {
          id: 'user:evasion-base',
          definition: { target: 'evasion', kind: 'base' },
          editable: { label: 'Manual evasion base', value: 12 },
        },
        {
          id: 'user:evasion-mod',
          definition: { target: 'evasion', kind: 'modifier' },
          editable: { label: 'Manual evasion modifier', value: 2 },
        },
      ],
      automationSelections: {
        'upgrade:tier1-5-0': {
          selected: true,
          params: { target: 'evasion' },
        },
      },
    }

    const result = validateJSONCharacterData(JSON.stringify(payload))

    expect(result.valid).toBe(true)
    expect(result.data?.modifierState?.targetStates.evasion?.activeBaseId).toBe('user:evasion-base')
    expect(result.data?.modifierState?.entryStates['user:evasion-mod']).toEqual({ enabled: false })
    expect(result.data?.userModifierContributions).toEqual(payload.userModifierContributions)
    expect(result.data?.automationSelections?.['upgrade:tier1-5-0']).toEqual({
      selected: true,
      params: { target: 'evasion' },
    })
  })
})
