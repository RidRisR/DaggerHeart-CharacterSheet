'use client'

import { createContext } from 'react'

export type SheetPageSlot = 'single' | 'left' | 'right'
export const SheetPageSlotContext = createContext<SheetPageSlot>('single')
