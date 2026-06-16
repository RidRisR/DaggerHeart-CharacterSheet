import { create } from 'zustand'
import { getCardDisplayMode, setCardDisplayMode } from "@/lib/app-preferences"

interface TextModeStore {
  isTextMode: boolean
  toggleTextMode: () => void
  setTextMode: (enabled: boolean) => void
}

export const useTextModeStore = create<TextModeStore>()((set) => ({
  isTextMode: getCardDisplayMode() === "text",

  toggleTextMode: () =>
    set((state) => {
      const next = !state.isTextMode
      setCardDisplayMode(next ? "text" : "image")
      return { isTextMode: next }
    }),

  setTextMode: (enabled: boolean) => {
    setCardDisplayMode(enabled ? "text" : "image")
    set({ isTextMode: enabled })
  },
}))
