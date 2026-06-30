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

describe('migration regression baseline through v3', () => {
  it('migrates old page visibility, cards, attributes, hope, notebook, and cleanup behavior', () => {
    const migrated = migrateSheetData(legacySheet({
      includePageThreeInExport: true,
      inventory_cards: undefined,
      agility: { checked: true, value: '+2' },
      strength: { checked: false, value: '0', spellcasting: true },
    }))

    expect(migrated.schemaVersion).toBe(3)
    expect(migrated.cards[0].instanceId).toBe('cardinst_loadout_0_card-domain-1')
    expect(migrated.pageVisibility).toEqual({
      rangerCompanion: true,
      armorTemplate: false,
      adventureNotes: false,
    })
    expect('includePageThreeInExport' in migrated).toBe(false)
    expect(migrated.inventory_cards).toHaveLength(20)
    expect(migrated.agility).toEqual({ checked: true, value: '2', spellcasting: false })
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

  it('removes legacy weapon checkbox fields after equipment migration', () => {
    const migrated = migrateSheetData(legacySheet({
      inventoryWeapon1Primary: true,
      inventoryWeapon1Secondary: false,
      inventoryWeapon2Secondary: true,
    }))

    expect('inventoryWeapon1Primary' in (migrated as any)).toBe(false)
    expect('inventoryWeapon1Secondary' in (migrated as any)).toBe(false)
    expect('inventoryWeapon2Secondary' in (migrated as any)).toBe(false)
    expect(migrated.equipment.weaponSlots.inventory).toHaveLength(2)
  })

  it('sanitizes local image asset refs during synchronous shape migration', () => {
    const migrated = migrateSheetData(legacySheet({
      imageAssets: {
        characterImage: { key: 'character:one:portrait', mimeType: 'image/png' },
        companionImage: { key: 123, mimeType: 'image/jpeg' },
        extraImage: { key: 'character:one:extra', mimeType: 'image/png' },
      },
    }))

    expect(migrated.imageAssets).toEqual({
      characterImage: { key: 'character:one:portrait', mimeType: 'image/png' },
    })
  })
})
