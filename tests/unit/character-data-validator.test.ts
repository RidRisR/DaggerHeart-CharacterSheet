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

function minimalPayload(overrides: Record<string, unknown>) {
  return {
    name: 'Imported',
    level: '1',
    gold: [],
    experience: [],
    hope: 0,
    inventory: [],
    cards: [],
    ...overrides,
  }
}

function expectCompleteEquipment(data: NonNullable<ReturnType<typeof validateJSONCharacterData>['data']>) {
  expect(data.equipment.weaponSlots.primary).toMatchObject({
    name: expect.any(String),
    trait: expect.any(String),
    damage: expect.any(String),
    feature: expect.any(String),
    modifierContributions: expect.any(Array),
  })
  expect(data.equipment.weaponSlots.secondary).toMatchObject({
    name: expect.any(String),
    trait: expect.any(String),
    damage: expect.any(String),
    feature: expect.any(String),
    modifierContributions: expect.any(Array),
  })
  expect(data.equipment.weaponSlots.inventory).toHaveLength(2)
  data.equipment.weaponSlots.inventory.forEach(slot => {
    expect(slot).toMatchObject({
      name: expect.any(String),
      trait: expect.any(String),
      damage: expect.any(String),
      feature: expect.any(String),
      modifierContributions: expect.any(Array),
    })
  })
  expect(data.equipment.armorSlot).toMatchObject({
    name: expect.any(String),
    baseThresholds: expect.any(Object),
    feature: expect.any(String),
    modifierContributions: expect.any(Array),
  })
  expect(data.equipment.armorSlot).toHaveProperty('baseArmorMax')
  expect(data.equipment.armorSlot.baseThresholds).toHaveProperty('minor')
  expect(data.equipment.armorSlot.baseThresholds).toHaveProperty('major')
}

describe('character data import validation', () => {
  it('migrates JSON imports to v2 and preserves unknown fields through migration', () => {
    const result = validateJSONCharacterData(JSON.stringify(rawImport()))

    expect(result.valid).toBe(true)
    expect(result.data?.schemaVersion).toBe(2)
    expect(result.data?.hope).toBe(3)
    expect((result.data as any).unknownFutureField).toEqual({ keep: true })
  })

  it('keeps HTML and JSON on the same import processing path', () => {
    const raw = rawImport({ focused_card_ids: ['card-domain-1'] })
    const json = validateJSONCharacterData(JSON.stringify(raw))
    const html = validateAndProcessCharacterData(structuredClone(raw), 'html')

    expect(json.valid).toBe(true)
    expect(html.valid).toBe(true)
    expect(json.data?.schemaVersion).toBe(2)
    expect(html.data?.schemaVersion).toBe(2)
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

  it('preserves persisted modifier fields and drops legacy disabled entry states through JSON import validation', () => {
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
      otherAdjustments: [
        {
          id: 'stale-id',
          target: 'evasion',
          kind: 'manualFinalAdjustment',
          value: 2,
        },
      ],
      upgradeStates: {
        'tier1-5-0': {
          checked: true,
          params: { target: 'evasion' },
          extra: 'drop',
        },
        'tier1-0-2': {
          checked: true,
          params: { attributes: ['agility', 'not-real'] },
        },
        'tier1-exp-0': {
          checked: false,
          params: { experienceIndexes: [0, 1] },
        },
      },
      checkedUpgrades: {
        tier1: { 5: true },
        tier2: {},
        tier3: {},
      },
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
    expect(result.data?.modifierState?.entryStates['user:evasion-mod']).toBeUndefined()
    expect(result.data?.userModifierContributions).toEqual(payload.userModifierContributions)
    expect(result.data?.otherAdjustments).toEqual([
      {
        id: 'other:evasion:manual-final-adjustment',
        target: 'evasion',
        kind: 'manualFinalAdjustment',
        value: 2,
      },
    ])
    expect(result.data?.upgradeStates).toEqual({
      'tier1-5-0': {
        checked: true,
        params: { target: 'evasion' },
      },
      'tier1-0-2': {
        checked: true,
      },
      'tier1-exp-0': {
        checked: false,
      },
    })
    expect('checkedUpgrades' in (result.data as any)).toBe(false)
    expect('automationSelections' in (result.data as any)).toBe(false)
  })

  it('bridges legacy checkedUpgrades into upgradeStates during import validation', () => {
    const payload = minimalPayload({
      checkedUpgrades: {
        tier1: { 5: true },
        tier2: { 1: true },
        tier3: { 2: true },
        'tier1-5-0': { 5: true },
        'tier1-1-0': { 1: false },
      },
    })

    const result = validateJSONCharacterData(JSON.stringify(payload))

    expect(result.valid).toBe(true)
    expect(result.data?.upgradeStates).toEqual({
      'tier1-5-0': { checked: true },
    })
    expect('checkedUpgrades' in (result.data as any)).toBe(false)
  })

  it('keeps legacy automation params when checkedUpgrades has the same check key during import validation', () => {
    const payload = minimalPayload({
      checkedUpgrades: {
        'tier1-5-0': { 5: true },
      },
      automationSelections: {
        'upgrade:tier1-5-0': {
          selected: true,
          params: { target: 'evasion' },
        },
      },
    })

    const result = validateJSONCharacterData(JSON.stringify(payload))

    expect(result.valid).toBe(true)
    expect(result.data?.upgradeStates).toEqual({
      'tier1-5-0': { checked: true, params: { target: 'evasion' } },
    })
    expect('checkedUpgrades' in (result.data as any)).toBe(false)
    expect('automationSelections' in (result.data as any)).toBe(false)
  })

  it('bridges legacy automationSelections into upgradeStates during import validation', () => {
    const payload = minimalPayload({
      automationSelections: {
        'upgrade:tier1-5-0': {
          selected: true,
          params: { target: 'evasion' },
        },
        'upgrade:tier1-1-0': {
          selected: false,
          params: { target: 'hpMax' },
        },
      },
    })

    const result = validateJSONCharacterData(JSON.stringify(payload))

    expect(result.valid).toBe(true)
    expect(result.data?.upgradeStates).toEqual({
      'tier1-5-0': { checked: true, params: { target: 'evasion' } },
      'tier1-1-0': { checked: false },
    })
    expect('automationSelections' in (result.data as any)).toBe(false)
  })

  it('lets existing upgradeStates win while legacy fields fill missing check keys', () => {
    const payload = minimalPayload({
      upgradeStates: {
        'tier1-5-0': {
          checked: false,
          params: { target: 'evasion' },
        },
        'tier1-0-2': {
          checked: true,
          params: { attributes: ['agility', 'strength'] },
        },
      },
      checkedUpgrades: {
        tier1: {},
        tier2: {},
        tier3: {},
        'tier1-5-0': { 5: true },
        'tier1-1-0': { 1: true },
      },
      automationSelections: {
        'upgrade:tier1-0-2': {
          selected: false,
        },
        'upgrade:tier2-1': {
          selected: true,
          params: { target: 'proficiency' },
        },
      },
    })

    const result = validateJSONCharacterData(JSON.stringify(payload))

    expect(result.valid).toBe(true)
    expect(result.data?.upgradeStates).toEqual({
      'tier1-5-0': { checked: false },
      'tier1-0-2': { checked: true, params: { attributes: ['agility', 'strength'] } },
      'tier1-1-0': { checked: true },
      'tier2-1': { checked: true, params: { target: 'proficiency' } },
    })
    expect('checkedUpgrades' in (result.data as any)).toBe(false)
    expect('automationSelections' in (result.data as any)).toBe(false)
  })

  it('preserves legacy equipment fields until migration', () => {
    const payload = minimalPayload({
      primaryWeaponName: '阔剑',
      primaryWeaponTrait: '物理/单手/近战',
      primaryWeaponDamage: '敏捷: d8',
      primaryWeaponFeature: '可靠',
      armorName: '链甲',
      armorBaseScore: '4',
      armorThreshold: '7/15',
      armorFeature: '重型',
    })

    const result = validateJSONCharacterData(JSON.stringify(payload))

    expect(result.valid).toBe(true)
    expect(result.data?.equipment.weaponSlots.primary).toMatchObject({
      name: '阔剑',
      trait: '物理/单手/近战',
      damage: '敏捷: d8',
      feature: '可靠',
    })
    expect(result.data?.equipment.armorSlot).toMatchObject({
      name: '链甲',
      baseArmorMax: 4,
      baseThresholds: { minor: 7, major: 15 },
      feature: '重型',
    })
    expect('primaryWeaponName' in (result.data as any)).toBe(false)
    expect('armorName' in (result.data as any)).toBe(false)
  })

  it('normalizes imported empty equipment objects', () => {
    const result = validateJSONCharacterData(JSON.stringify(minimalPayload({
      equipment: {},
    })))

    expect(result.valid).toBe(true)
    expectCompleteEquipment(result.data!)
  })

  it('normalizes imported equipment missing inventory slots', () => {
    const result = validateJSONCharacterData(JSON.stringify(minimalPayload({
      equipment: {
        weaponSlots: {
          primary: { name: 'Existing Primary' },
          secondary: { name: 'Existing Secondary' },
        },
      },
    })))

    expect(result.valid).toBe(true)
    expectCompleteEquipment(result.data!)
    expect(result.data?.equipment.weaponSlots.primary.name).toBe('Existing Primary')
    expect(result.data?.equipment.weaponSlots.inventory).toHaveLength(2)
  })

  it('normalizes imported equipment with one inventory slot', () => {
    const result = validateJSONCharacterData(JSON.stringify(minimalPayload({
      equipment: {
        weaponSlots: {
          inventory: [{ name: 'Only Inventory' }],
        },
      },
      inventoryWeapon2Name: 'Legacy Inventory 2',
    })))

    expect(result.valid).toBe(true)
    expectCompleteEquipment(result.data!)
    expect(result.data?.equipment.weaponSlots.inventory[0].name).toBe('Only Inventory')
    expect(result.data?.equipment.weaponSlots.inventory[1].name).toBe('Legacy Inventory 2')
  })

  it('normalizes imported equipment missing armor slot from legacy armor fields', () => {
    const result = validateJSONCharacterData(JSON.stringify(minimalPayload({
      equipment: {
        weaponSlots: {},
      },
      armorName: 'Legacy Armor',
      armorBaseScore: '6',
      armorThreshold: '9/18',
    })))

    expect(result.valid).toBe(true)
    expectCompleteEquipment(result.data!)
    expect(result.data?.equipment.armorSlot).toMatchObject({
      name: 'Legacy Armor',
      baseArmorMax: 6,
      baseThresholds: { minor: 9, major: 18 },
    })
  })
})
