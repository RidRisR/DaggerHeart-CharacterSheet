import { describe, expect, it } from 'vitest'
import { MARTIAL_STANCES } from '../catalog'
import { createMartialStancesState } from '../state'
import { applyMartialStanceAction, applyMartialStanceHealthInvariant, type MartialStanceAction } from '../actions'
import { defaultSheetData } from '@/lib/default-sheet-data'

function runAction(state: ReturnType<typeof createMartialStancesState>, action: MartialStanceAction, level: number) {
  return applyMartialStanceAction({ ...defaultSheetData, martialStances: state, level: String(level) }, action)
}

function act(state = createMartialStancesState(), action: MartialStanceAction, level = 1) {
  const result = runAction(state, action, level)
  if (!result.ok) throw Error(result.error)
  return result.state
}

describe('martial stance rules', () => {
  it('contains every stance once, four per tier, with complete names and effects', () => {
    expect(MARTIAL_STANCES).toHaveLength(16)
    expect(new Set(MARTIAL_STANCES.map(s => s.id)).size).toBe(16)
    for (const tier of [1, 2, 3, 4]) expect(MARTIAL_STANCES.filter(s => s.tier === tier)).toHaveLength(4)
    expect(MARTIAL_STANCES.find(s => s.id === 'vigilant')?.effect).toContain('d6')
    expect(MARTIAL_STANCES.find(s => s.id === 'grappling')?.effect).toContain('近距离范围')
  })

  it('starts with no stance, no known choices and no Focus, without shared arrays', () => {
    expect(createMartialStancesState()).toEqual({ known: [], active: null, focus: 0 })
    expect(createMartialStancesState().known).not.toBe(createMartialStancesState().known)
  })

  it('learns two tier-one stances initially and one additional stance per level', () => {
    let state = act(undefined, { type: 'learn', id: 'favored' })
    state = act(state, { type: 'learn', id: 'reliable' })
    expect(runAction(state, { type: 'learn', id: 'quick' }, 1).ok).toBe(false)
    state = act(state, { type: 'learn', id: 'anchored' }, 2)
    expect(state.known).toEqual(['favored', 'reliable', 'anchored'])
    expect(runAction(state, { type: 'learn', id: 'defensive' }, 2).ok).toBe(false)
    expect(runAction(state, { type: 'learn', id: 'grappling' }, 3).ok).toBe(false)
    expect(act(state, { type: 'learn', id: 'grappling' }, 5).known).toContain('grappling')
  })

  it('requires the initial two choices from tier one even when starting at higher level', () => {
    expect(runAction(createMartialStancesState(), { type: 'learn', id: 'honed' }, 10).ok).toBe(false)
  })

  it('spends one Focus to activate or change one known stance, with no charge for reselecting the active stance', () => {
    const original = { known: ['favored', 'quick'] as const, active: null, focus: 6 }
    const state = act({ ...original, known: [...original.known] }, { type: 'activate', id: 'favored' })
    expect(state).toMatchObject({ active: 'favored', focus: 5 })
    expect(act(state, { type: 'activate', id: 'favored' })).toBe(state)
    expect(act(state, { type: 'activate', id: 'quick' })).toMatchObject({ active: 'quick', focus: 4 })
    expect(original.focus).toBe(6)
  })

  it('blocks activation without a known stance or enough Focus and retains choices when level falls', () => {
    const state = { known: ['favored', 'honed'] as const, active: null, focus: 0 }
    expect(runAction({ ...state, known: [...state.known] }, { type: 'activate', id: 'favored' }, 10).ok).toBe(false)
    expect(runAction({ ...state, known: [...state.known], focus: 6 }, { type: 'activate', id: 'honed' }, 1).ok).toBe(false)
    expect(runAction({ ...state, known: [...state.known], focus: 6 }, { type: 'activate', id: 'reliable' }, 10).ok).toBe(false)
    expect(state.known).toContain('honed')
  })

  it('drops without refunding Focus, also when a known active stance is removed', () => {
    const state = { known: ['favored'] as const, active: 'favored' as const, focus: 2 }
    expect(act({ ...state, known: [...state.known] }, { type: 'drop' })).toMatchObject({ active: null, focus: 2 })
    expect(act({ ...state, known: [...state.known] }, { type: 'learn', id: 'favored' })).toEqual({ known: [], active: null, focus: 2 })
  })

  it.each([-1, 7, 1.5, NaN])('rejects invalid Focus %s', value => {
    expect(runAction(createMartialStancesState(), { type: 'focus', value }, 1).ok).toBe(false)
  })

  it('records Focus from zero to six without resetting an ongoing stance', () => {
    const state = { known: ['favored'] as const, active: 'favored' as const, focus: 2 }
    expect(act({ ...state, known: [...state.known] }, { type: 'focus', value: 0 })).toMatchObject({ active: 'favored', focus: 0 })
    expect(act(undefined, { type: 'focus', value: 6 }).focus).toBe(6)
  })

  it('drops when all HP slots are marked and does not restore the stance on recovery', () => {
    const sheet = { ...defaultSheetData, hpMax: 6, hp: Array(12).fill(false), martialStances: { known: ['favored' as const], active: 'favored' as const, focus: 3 } }
    expect(applyMartialStanceHealthInvariant(sheet)).toBe(sheet)
    const damaged = applyMartialStanceHealthInvariant({ ...sheet, hp: Array(12).fill(false).map((_, i) => i < 6) })
    expect(damaged.martialStances).toEqual({ known: ['favored'], active: null, focus: 3 })
    const recovered = { ...damaged, hp: Array(12).fill(false) }
    expect(applyMartialStanceHealthInvariant(recovered).martialStances.active).toBe(null)
  })
})
