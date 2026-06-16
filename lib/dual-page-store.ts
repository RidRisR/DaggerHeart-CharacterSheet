import { create } from 'zustand'
import { getDualPagePreferences, setDualPagePreferences } from "@/lib/app-preferences"

interface DualPageStore {
  isDualPageMode: boolean
  leftPageId: string
  rightPageId: string
  leftTabValue: string
  rightTabValue: string
  toggleDualPageMode: () => void
  setLeftPage: (pageId: string) => void
  setRightPage: (pageId: string) => void
  setLeftTab: (tabValue: string) => void
  setRightTab: (tabValue: string) => void
  setDualPageMode: (enabled: boolean) => void
}

const initialDualPage = getDualPagePreferences()

export const useDualPageStore = create<DualPageStore>()((set) => ({
  isDualPageMode: initialDualPage.enabled,
  leftPageId: initialDualPage.leftPageId,
  rightPageId: initialDualPage.rightPageId,
  leftTabValue: initialDualPage.leftTabValue,
  rightTabValue: initialDualPage.rightTabValue,

  toggleDualPageMode: () =>
    set((state) => {
      const next = !state.isDualPageMode
      setDualPagePreferences({ enabled: next })
      return { isDualPageMode: next }
    }),

  setLeftPage: (pageId: string) => {
    setDualPagePreferences({ leftPageId: pageId })
    set({ leftPageId: pageId })
  },

  setRightPage: (pageId: string) => {
    setDualPagePreferences({ rightPageId: pageId })
    set({ rightPageId: pageId })
  },

  setLeftTab: (tabValue: string) => {
    setDualPagePreferences({ leftTabValue: tabValue, leftPageId: tabValue })
    set({
      leftTabValue: tabValue,
      leftPageId: tabValue,
    })
  },

  setRightTab: (tabValue: string) => {
    setDualPagePreferences({ rightTabValue: tabValue, rightPageId: tabValue })
    set({
      rightTabValue: tabValue,
      rightPageId: tabValue,
    })
  },

  setDualPageMode: (enabled: boolean) => {
    setDualPagePreferences({ enabled })
    set({ isDualPageMode: enabled })
  },
}))
