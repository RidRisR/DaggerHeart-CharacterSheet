import { describe, expect, it, vi } from "vitest"
import {
  announcements,
  getSortedAnnouncements,
  isLatestAnnouncementRead,
  latestAnnouncementId,
  markLatestAnnouncementRead,
} from "@/lib/announcements"
import { APP_PREFERENCES_STORAGE_KEY, getAppPreferences } from "@/lib/app-preferences"

function createStorage(initialValue?: string): Storage {
  const data = new Map<string, string>()
  if (initialValue !== undefined) {
    data.set(
      APP_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
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
        announcements: { lastReadAnnouncementId: initialValue },
        contentSources: { equipmentDisabledSourceIds: [] },
      }),
    )
  }

  return {
    get length() {
      return data.size
    },
    clear: vi.fn(() => data.clear()),
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(data.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => data.delete(key)),
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, value)
    }),
  }
}

describe("announcements", () => {
  it("sorts announcements newest first", () => {
    const sorted = getSortedAnnouncements([
      { id: "old", date: "2026-01-01", title: "Old", content: "old" },
      { id: "new", date: "2026-06-12", title: "New", content: "new" },
    ])

    expect(sorted.map((announcement) => announcement.id)).toEqual(["new", "old"])
  })

  it("exposes the latest announcement id from the sorted announcement list", () => {
    expect(announcements.length).toBeGreaterThan(0)
    expect(latestAnnouncementId).toBe(getSortedAnnouncements(announcements)[0]?.id)
  })

  it("reports the latest announcement as read when storage contains the latest id", () => {
    expect(isLatestAnnouncementRead(createStorage(latestAnnouncementId ?? ""))).toBe(true)
  })

  it("marks the latest announcement as read", () => {
    const storage = createStorage()

    markLatestAnnouncementRead(storage)

    expect(getAppPreferences(storage).announcements.lastReadAnnouncementId).toBe(latestAnnouncementId)
    expect(isLatestAnnouncementRead(storage)).toBe(true)
  })

  it("does not throw when storage read or write fails", () => {
    const failingStorage = {
      getItem: vi.fn(() => {
        throw new Error("blocked")
      }),
      setItem: vi.fn(() => {
        throw new Error("blocked")
      }),
    } as unknown as Storage

    expect(() => isLatestAnnouncementRead(failingStorage)).not.toThrow()
    expect(isLatestAnnouncementRead(failingStorage)).toBe(false)
    expect(() => markLatestAnnouncementRead(failingStorage)).not.toThrow()
  })

  it("does not throw when default localStorage access is blocked", () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage")

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("blocked")
      },
    })

    try {
      expect(() => isLatestAnnouncementRead()).not.toThrow()
      expect(isLatestAnnouncementRead()).toBe(false)
      expect(() => markLatestAnnouncementRead()).not.toThrow()
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, "localStorage", descriptor)
      }
    }
  })
})
