import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  APP_PREFERENCES_STORAGE_KEY,
  getAppPreferences,
  LEGACY_DUAL_PAGE_STORAGE_KEY,
  LEGACY_TEXT_MODE_STORAGE_KEY,
} from "../app-preferences"

describe("preference-backed stores", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it("text mode store hydrates from legacy preferences and writes the new key", async () => {
    localStorage.setItem(
      LEGACY_TEXT_MODE_STORAGE_KEY,
      JSON.stringify({ state: { isTextMode: true }, version: 0 }),
    )

    const { useTextModeStore } = await import("../text-mode-store")

    expect(useTextModeStore.getState().isTextMode).toBe(true)
    expect(localStorage.getItem(LEGACY_TEXT_MODE_STORAGE_KEY)).toBeNull()

    useTextModeStore.getState().toggleTextMode()

    expect(getAppPreferences(localStorage).ui.cardDisplayMode).toBe("image")
    expect(localStorage.getItem(APP_PREFERENCES_STORAGE_KEY)).not.toBeNull()
  })

  it("dual page store hydrates from legacy preferences and writes the new key", async () => {
    localStorage.setItem(
      LEGACY_DUAL_PAGE_STORAGE_KEY,
      JSON.stringify({
        state: {
          isDualPageMode: true,
          leftPageId: "page3",
          rightPageId: "page4",
          leftTabValue: "page3",
          rightTabValue: "page4",
        },
        version: 0,
      }),
    )

    const { useDualPageStore } = await import("../dual-page-store")

    expect(useDualPageStore.getState()).toMatchObject({
      isDualPageMode: true,
      leftPageId: "page3",
      rightPageId: "page4",
      leftTabValue: "page3",
      rightTabValue: "page4",
    })
    expect(localStorage.getItem(LEGACY_DUAL_PAGE_STORAGE_KEY)).toBeNull()

    useDualPageStore.getState().setLeftTab("page5")

    expect(getAppPreferences(localStorage).ui.dualPage).toMatchObject({
      enabled: true,
      leftPageId: "page5",
      leftTabValue: "page5",
      rightPageId: "page4",
      rightTabValue: "page4",
    })
  })
})
