import { describe, expect, it } from 'vitest'
import { migrateSheetData } from '@/lib/sheet-data-migration'

const validCard = {
  id: 'card-domain-1',
  name: 'Valid Domain Card',
  type: 'domain',
}

function legacySheet(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Kaka',
    level: '1',
    gold: [false, true],
    experience: ['Brave', '', '', '', ''],
    hope: [true, true, false, false, false, false],
    inventory: ['rope', '', '', '', ''],
    cards: [validCard],
    ...overrides,
  } as any
}

describe('main migration regression baseline', () => {
  it('migrates old page visibility, cards, attributes, hope, notebook, and cleanup behavior', () => {
    const migrated = migrateSheetData(legacySheet({
      includePageThreeInExport: true,
      inventory_cards: undefined,
      agility: { checked: true, value: '+2' },
      strength: { checked: false, value: '0', spellcasting: true },
    }))

    expect(migrated.pageVisibility).toEqual({
      rangerCompanion: false,
      armorTemplate: false,
      adventureNotes: false,
    })
    expect('includePageThreeInExport' in migrated).toBe(false)
    expect(migrated.inventory_cards).toHaveLength(20)
    expect(migrated.agility).toEqual({ checked: true, value: '+2', spellcasting: false })
    expect(migrated.strength).toEqual({ checked: false, value: '0', spellcasting: true })
    expect(migrated.hope).toBe(2)
    expect(migrated.hopeMax).toBe(6)
    expect(migrated.notebook).toEqual({
      pages: [{ id: 'page-1', lines: [] }],
      currentPageIndex: 0,
      isOpen: false,
    })
    expect(migrated.armorTemplate?.upgradeSlots).toHaveLength(5)
    expect(migrated.adventureNotes?.adventureLog).toHaveLength(8)
  })

  it('renames pageVisibility.page3 and fills missing page visibility fields', () => {
    const migrated = migrateSheetData(legacySheet({
      pageVisibility: {
        page3: true,
        armorTemplate: true,
      },
    }))

    expect(migrated.pageVisibility).toEqual({
      rangerCompanion: true,
      armorTemplate: true,
      adventureNotes: false,
    })
    expect('page3' in (migrated.pageVisibility as any)).toBe(false)
  })

  it('preserves legacy weapon checkbox state during main migration', () => {
    const migrated = migrateSheetData(legacySheet({
      inventoryWeapon1Primary: true,
      inventoryWeapon1Secondary: false,
      inventoryWeapon2Secondary: true,
    }))

    expect(migrated.inventoryWeapon1Primary).toBe(true)
    expect(migrated.inventoryWeapon1Secondary).toBe(false)
    expect(migrated.inventoryWeapon2Secondary).toBe(true)
  })
})
