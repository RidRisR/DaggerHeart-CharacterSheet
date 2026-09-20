'use client'

import { useMemo } from 'react'
import { readBuiltinBeastForms } from '@/card/beast-forms/read-model'
import { CARD_BUILTIN_SOURCE_ID } from '@/card/runtime/source-types'
import { useCardStore } from '@/card/stores/unified-card-store'
import { buildBeastFormPages, type BeastFormPage } from './page-layout'

export type BeastFormPagesState =
  | { status: 'loading' | 'empty' }
  | { status: 'error'; message: string }
  | { status: 'ready'; pages: BeastFormPage[] }

export function useBeastFormPages(): BeastFormPagesState {
  const cards = useCardStore(state => state.cards)
  const batches = useCardStore(state => state.batches)
  const initialized = useCardStore(state => state.initialized)
  const loading = useCardStore(state => state.loading)
  const error = useCardStore(state => state.error)
  return useMemo(() => {
    if (error) return { status: 'error', message: error }
    if (!initialized || loading) return { status: 'loading' }
    const batch = batches.get(CARD_BUILTIN_SOURCE_ID)
    if (batch?.disabled) return { status: 'empty' }
    try {
      if (!batch) throw new Error('Built-in card source is unavailable')
      return { status: 'ready', pages: buildBeastFormPages(readBuiltinBeastForms(cards.values())) }
    } catch (cause) {
      return { status: 'error', message: cause instanceof Error ? cause.message : String(cause) }
    }
  }, [cards, batches, initialized, loading, error])
}
