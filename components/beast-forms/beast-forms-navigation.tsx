'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { SheetPageSlotContext, type SheetPageSlot } from '@/components/layout/sheet-page-slot-context'

const NavigationContext = createContext<{
  pages: Record<SheetPageSlot, number>
  setPage: (slot: SheetPageSlot, page: number) => void
} | null>(null)

/** Mounted above the reading/print branches; keyed by character to reset on character changes. */
export function BeastFormsNavigationProvider({ children }: { children: ReactNode }) {
  const [pages, setPages] = useState<Record<SheetPageSlot, number>>({ single: 0, left: 0, right: 0 })
  return <NavigationContext.Provider value={{ pages, setPage: (slot, page) => setPages(previous => ({ ...previous, [slot]: page })) }}>{children}</NavigationContext.Provider>
}

export function useBeastFormsNavigation() {
  const state = useContext(NavigationContext)
  const slot = useContext(SheetPageSlotContext)
  if (!state) throw new Error('Beast forms require a navigation provider')
  return { pageIndex: state.pages[slot], setPageIndex: (page: number) => state.setPage(slot, page) }
}
