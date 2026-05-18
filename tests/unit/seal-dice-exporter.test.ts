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

  it('exports zero armor values when armorMax is not numeric', () => {
    const result = exportToSealDice({
      ...defaultSheetData,
      armorMax: '四',
    })

    expect(result).toContain('护甲0')
    expect(result).toContain('护甲上限0')
    expect(result).not.toContain('护甲NaN')
    expect(result).not.toContain('护甲上限四')
    expect(result).not.toContain('护甲上限12')
  })

  it('keeps numeric armorMax export behavior', () => {
    const result = exportToSealDice({
      ...defaultSheetData,
      armorMax: 4,
      armorBoxes: [true, false, false, false],
    })

    expect(result).toContain('护甲3')
    expect(result).toContain('护甲上限4')
  })

  it('does not export negative current armor when armor damage exceeds armorMax', () => {
    const result = exportToSealDice({
      ...defaultSheetData,
      armorMax: 1,
      armorBoxes: [true, true],
    })

    expect(result).toContain('护甲0')
    expect(result).toContain('护甲上限1')
    expect(result).not.toContain('护甲-1')
  })
})
