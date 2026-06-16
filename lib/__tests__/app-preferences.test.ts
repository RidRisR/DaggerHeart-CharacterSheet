import { describe, expect, it, vi } from "vitest"
import {
  APP_PREFERENCES_STORAGE_KEY,
  getAppPreferences,
  getCardDisplayMode,
  getDualPagePreferences,
  getEquipmentDisabledSourceIds,
  isLatestAnnouncementRead,
  LEGACY_ANNOUNCEMENT_READ_STORAGE_KEY,
  LEGACY_DUAL_PAGE_STORAGE_KEY,
  LEGACY_TEXT_MODE_STORAGE_KEY,
  markAnnouncementRead,
  setCardDisplayMode,
  setDualPagePreferences,
  setEquipmentSourceDisabled,
  type AppPreferencesStorage,
} from "../app-preferences"

interface MemoryStorage extends AppPreferencesStorage {
  getItem: ReturnType<typeof vi.fn>
  setItem: ReturnType<typeof vi.fn>
  removeItem: ReturnType<typeof vi.fn>
}

function createMemoryStorage(
  initial: Record<string, string> = {},
  options: { failWritesFor?: string[]; failRemoveFor?: string[] } = {},
): MemoryStorage {
  const values = new Map(Object.entries(initial))
  const failWrites = new Set(options.failWritesFor ?? [])
  const failRemoves = new Set(options.failRemoveFor ?? [])

  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      if (failWrites.has(key)) throw new Error(`failed write ${key}`)
      values.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
      if (failRemoves.has(key)) throw new Error(`failed remove ${key}`)
      values.delete(key)
    }),
  }
}

describe("app preferences", () => {
  it("returns defaults when storage is empty", () => {
    const storage = createMemoryStorage()

    expect(getAppPreferences(storage)).toEqual({
      format: "dhsheet.app-preferences.v1",
      ui: {
        cardDisplayMode: "image",
        dualPage: {
          enabled: false,
          leftPageId: "page1",
          rightPageId: "page2",
          leftTabValue: "page1",
          rightTabValue: "page2",
        },
      },
      announcements: {},
      contentSources: { equipmentDisabledSourceIds: [] },
    })
  })

  it("reads and normalizes the new preferences key", () => {
    const storage = createMemoryStorage({
      [APP_PREFERENCES_STORAGE_KEY]: JSON.stringify({
        format: "dhsheet.app-preferences.v1",
        ui: { cardDisplayMode: "text", dualPage: { enabled: true, leftPageId: "page3" } },
        announcements: { lastReadAnnouncementId: "latest" },
        contentSources: { equipmentDisabledSourceIds: ["builtin", "pack_custom", "builtin"] },
      }),
    })

    expect(getAppPreferences(storage)).toEqual({
      format: "dhsheet.app-preferences.v1",
      ui: {
        cardDisplayMode: "text",
        dualPage: {
          enabled: true,
          leftPageId: "page3",
          rightPageId: "page2",
          leftTabValue: "page1",
          rightTabValue: "page2",
        },
      },
      announcements: { lastReadAnnouncementId: "latest" },
      contentSources: { equipmentDisabledSourceIds: ["builtin"] },
    })
  })

  it("migrates legacy preference keys and deletes them after writing the new key", () => {
    const storage = createMemoryStorage({
      [LEGACY_TEXT_MODE_STORAGE_KEY]: JSON.stringify({ state: { isTextMode: true }, version: 0 }),
      [LEGACY_DUAL_PAGE_STORAGE_KEY]: JSON.stringify({
        state: {
          isDualPageMode: true,
          leftPageId: "page3",
          rightPageId: "page4",
          leftTabValue: "page3",
          rightTabValue: "page4",
        },
        version: 0,
      }),
      [LEGACY_ANNOUNCEMENT_READ_STORAGE_KEY]: "announcement-1",
    })

    expect(getAppPreferences(storage)).toMatchObject({
      ui: {
        cardDisplayMode: "text",
        dualPage: {
          enabled: true,
          leftPageId: "page3",
          rightPageId: "page4",
          leftTabValue: "page3",
          rightTabValue: "page4",
        },
      },
      announcements: { lastReadAnnouncementId: "announcement-1" },
    })
    expect(storage.getItem(LEGACY_TEXT_MODE_STORAGE_KEY)).toBeNull()
    expect(storage.getItem(LEGACY_DUAL_PAGE_STORAGE_KEY)).toBeNull()
    expect(storage.getItem(LEGACY_ANNOUNCEMENT_READ_STORAGE_KEY)).toBeNull()
    expect(storage.getItem(APP_PREFERENCES_STORAGE_KEY)).not.toBeNull()
  })

  it("does not delete legacy keys when writing the new key fails", () => {
    const storage = createMemoryStorage(
      { [LEGACY_TEXT_MODE_STORAGE_KEY]: JSON.stringify({ state: { isTextMode: true }, version: 0 }) },
      { failWritesFor: [APP_PREFERENCES_STORAGE_KEY] },
    )

    expect(getAppPreferences(storage).ui.cardDisplayMode).toBe("text")
    expect(storage.getItem(LEGACY_TEXT_MODE_STORAGE_KEY)).not.toBeNull()
  })

  it("ignores legacy keys when a valid new preferences key exists", () => {
    const storage = createMemoryStorage({
      [APP_PREFERENCES_STORAGE_KEY]: JSON.stringify({
        format: "dhsheet.app-preferences.v1",
        ui: {
          cardDisplayMode: "image",
          dualPage: {
            enabled: false,
            leftPageId: "page1",
            rightPageId: "page2",
            leftTabValue: "page1",
            rightTabValue: "page2",
          },
        },
        announcements: { lastReadAnnouncementId: "new" },
        contentSources: { equipmentDisabledSourceIds: [] },
      }),
      [LEGACY_TEXT_MODE_STORAGE_KEY]: JSON.stringify({ state: { isTextMode: true }, version: 0 }),
      [LEGACY_ANNOUNCEMENT_READ_STORAGE_KEY]: "legacy",
    })

    expect(getAppPreferences(storage).ui.cardDisplayMode).toBe("image")
    expect(getAppPreferences(storage).announcements.lastReadAnnouncementId).toBe("new")
    expect(storage.removeItem).not.toHaveBeenCalled()
  })

  it("semantic helpers read and write the new preferences key", () => {
    const storage = createMemoryStorage()

    setCardDisplayMode("text", storage)
    setDualPagePreferences({ enabled: true, leftPageId: "page4", leftTabValue: "page4" }, storage)
    markAnnouncementRead("announcement-2", storage)
    expect(setEquipmentSourceDisabled("builtin", true, storage)).toBe(true)
    expect(setEquipmentSourceDisabled("pack_custom", true, storage)).toBe(false)

    expect(getCardDisplayMode(storage)).toBe("text")
    expect(getDualPagePreferences(storage)).toMatchObject({
      enabled: true,
      leftPageId: "page4",
      leftTabValue: "page4",
    })
    expect(isLatestAnnouncementRead("announcement-2", storage)).toBe(true)
    expect(getEquipmentDisabledSourceIds(storage)).toEqual(["builtin"])
  })

  it("reports equipment source preference write failures", () => {
    const storage = createMemoryStorage({}, { failWritesFor: [APP_PREFERENCES_STORAGE_KEY] })

    expect(setEquipmentSourceDisabled("builtin", true, storage)).toBe(false)
    expect(getEquipmentDisabledSourceIds(storage)).toEqual([])
  })
})
