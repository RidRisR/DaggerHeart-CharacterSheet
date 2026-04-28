import { describe, expect, it } from 'vitest'
import { defaultSheetData } from '@/lib/default-sheet-data'
import { exportToSealDice } from '@/lib/seal-dice-exporter'

describe('exportToSealDice', () => {
  it('does not put a negative attribute first in the exported command', () => {
    const result = exportToSealDice({
      ...defaultSheetData,
      agility: { checked: false, value: '-1', spellcasting: false },
      strength: { checked: false, value: '0', spellcasting: false },
      instinct: { checked: false, value: '0', spellcasting: false },
      knowledge: { checked: false, value: '0', spellcasting: false },
      presence: { checked: false, value: '0', spellcasting: false },
      finesse: { checked: false, value: '0', spellcasting: false },
    })

    expect(result.startsWith('.st 力量0')).toBe(true)
    expect(result).toContain('敏捷-1')
  })
})
