import { isMartialStanceId, MAX_FOCUS, type MartialStanceId } from './catalog'

export interface MartialStancesState {
  known: MartialStanceId[]
  active: MartialStanceId | null
  focus: number
}

export function createMartialStancesState(): MartialStancesState {
  return { known: [], active: null, focus: 0 }
}

export function isCurrentMartialStancesState(value: unknown): value is MartialStancesState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const state = value as Record<string, unknown>
  return Array.isArray(state.known) && state.known.every(isMartialStanceId)
    && new Set(state.known).size === state.known.length
    && (state.active === null || (isMartialStanceId(state.active) && state.known.includes(state.active)))
    && typeof state.focus === 'number' && Number.isInteger(state.focus) && state.focus >= 0 && state.focus <= MAX_FOCUS
}

export function normalizeMartialStancesState(value: unknown): MartialStancesState {
  if (value === undefined) return createMartialStancesState()
  if (!isCurrentMartialStancesState(value)) throw new Error('Invalid martialStances: expected known stance IDs, one known active stance, and 0–6 Focus.')
  return { known: [...value.known], active: value.active, focus: value.focus }
}
