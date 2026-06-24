import { describe, expect, it } from 'vitest'
import { defaultSheetData } from '@/lib/default-sheet-data'
import { createUnknownMigrationDifference } from '@/automation/core/other-adjustments'
import {
  createEstimatedBaseContribution,
  getEstimatedBaseId,
} from '@/automation/core/special-contributions'
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

function v1Sheet(overrides: Record<string, unknown> = {}) {
  return {
    ...v0Sheet(),
    schemaVersion: 1,
    hope: 3,
    hopeMax: 4,
    pageVisibility: {
      rangerCompanion: false,
      armorTemplate: false,
      adventureNotes: false,
    },
    inventory_cards: Array(20).fill(0).map((_, index) => ({
      id: `inventory-card-${index}`,
      name: `Inventory Card ${index}`,
      type: 'domain',
    })),
    notebook: {
      pages: [{ id: 'page-1', lines: [] }],
      currentPageIndex: 0,
      isOpen: false,
    },
    ...overrides,
  } as any
}

describe('sheet schema version', () => {
  it('uses schema version 3 for card automation instance identity', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(3)
    expect(defaultSheetData.schemaVersion).toBe(3)
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
    expect(detectSchemaVersion({ schemaVersion: 2 })).toBe(2)
    expect(detectSchemaVersion({ schemaVersion: 3 })).toBe(3)
  })

  it('rejects saves from newer schema versions', () => {
    expect(() => assertSupportedSchemaVersion(4)).toThrow(/newer schema version/i)
  })
})

describe('sheet data version migration', () => {
  it('migrates v0 data to v3 through the full version chain', () => {
    const migrated = migrateSheetData(v0Sheet())

    expect(migrated.schemaVersion).toBe(3)
    expect(migrated.hope).toBe(3)
    expect(migrated.hopeMax).toBe(4)
    expect(migrated.inventory_cards).toHaveLength(20)
    expect(migrated.notebook?.pages).toHaveLength(1)
  })

  it('migrates v1 data to v3 and moves legacy equipment fields', () => {
    const migrated = migrateSheetData(v1Sheet({
      primaryWeaponName: '阔剑',
      primaryWeaponTrait: '物理/单手/近战',
      primaryWeaponDamage: '敏捷: d8',
      primaryWeaponFeature: '可靠',
      armorName: '链甲',
      armorBaseScore: '4',
      armorThreshold: '7/15',
      armorFeature: '重型',
    }))

    expect(migrated.schemaVersion).toBe(3)
    expect(migrated.equipment.weaponSlots.primary).toMatchObject({
      name: '阔剑',
      trait: '物理/单手/近战',
      damage: '敏捷: d8',
      feature: '可靠',
    })
    expect(migrated.equipment.armorSlot).toMatchObject({
      name: '链甲',
      baseArmorMax: 4,
      baseThresholds: { minor: 7, major: 15 },
      feature: '重型',
    })
    expect('primaryWeaponName' in (migrated as any)).toBe(false)
    expect('armorName' in (migrated as any)).toBe(false)
  })

  it('migrates v1 modifier byTarget state to v2 state maps', () => {
    const migrated = migrateSheetData(v1Sheet({
      modifierState: {
        byTarget: {
          evasion: {
            activeBaseId: 'user:evasion-base',
            disabledEntryIds: ['upgrade:evasion'],
            userEntries: [{
              id: 'user:evasion-base',
              target: 'evasion',
              kind: 'base',
              label: '手动基础闪避',
              value: 12,
            }],
          },
        },
      },
    }))

    expect(migrated.schemaVersion).toBe(3)
    expect(migrated.modifierState?.targetStates.evasion?.activeBaseId).toBe('user:evasion-base')
    expect(migrated.userModifierContributions).toEqual([{
      id: 'user:evasion-base',
      definition: { target: 'evasion', kind: 'base' },
      editable: { label: '手动基础闪避', value: 12 },
    }])
  })

  it('preserves v1 legacy finals with v2 special modifier contributions', () => {
    const migrated = migrateSheetData(v1Sheet({
      evasion: '15',
      userModifierContributions: [{
        id: 'user:evasion-mod',
        definition: { target: 'evasion', kind: 'modifier' },
        editable: { label: '旧加值', value: 2 },
      }],
    }))

    expect(migrated.schemaVersion).toBe(3)
    expect(migrated.evasion).toBe('15')
    expect(migrated.modifierState?.targetStates.evasion).toEqual({
      activeBaseId: getEstimatedBaseId('evasion'),
    })
    expect(migrated.userModifierContributions).toEqual(expect.arrayContaining([
      {
        id: 'user:evasion-mod',
        definition: { target: 'evasion', kind: 'modifier' },
        editable: { label: '旧加值', value: 2 },
      },
      createEstimatedBaseContribution('evasion', 13),
    ]))
  })

  it('keeps v3 unknown migration differences idempotent', () => {
    const once = migrateSheetData(v1Sheet({
      evasion: '15',
      cards: [{
        id: 'profession-warrior',
        type: 'profession',
        name: '战士',
        professionSpecial: { 起始闪避: 12 },
      }],
    }))
    const twice = migrateSheetData(once)

    expect(twice).toEqual(once)
    expect(once.otherAdjustments).toContainEqual(
      createUnknownMigrationDifference('evasion', 3),
    )
  })

  it('keeps v3 data stable and idempotent', () => {
    const once = migrateSheetData(v0Sheet())
    const twice = migrateSheetData(once)

    expect(once.schemaVersion).toBe(3)
    expect(twice).toEqual(once)
  })

  it('normalizes v2 legacy checked upgrades with fixed target params during v3 migration', () => {
    const migrated = migrateSheetData(v1Sheet({
      schemaVersion: 2,
      checkedUpgrades: {
        'tier1-1-0': { 1: true },
      },
    }))

    expect(migrated.schemaVersion).toBe(3)
    expect(migrated.upgradeStates).toEqual({
      'tier1-1-0': { checked: true, params: { target: 'hpMax' } },
    })
    expect('checkedUpgrades' in (migrated as any)).toBe(false)
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
    expect(() => migrateSheetData(v0Sheet({ schemaVersion: 4 }))).toThrow(/newer schema version/i)
  })
})
