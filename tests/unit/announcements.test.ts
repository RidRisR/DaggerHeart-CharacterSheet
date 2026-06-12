import { describe, expect, it, vi } from "vitest"
import {
  ANNOUNCEMENTS_READ_STORAGE_KEY,
  announcements,
  getSortedAnnouncements,
  isLatestAnnouncementRead,
  latestAnnouncementId,
  markLatestAnnouncementRead,
} from "@/lib/announcements"

function createStorage(initialValue?: string): Storage {
  const data = new Map<string, string>()
  if (initialValue !== undefined) {
    data.set(ANNOUNCEMENTS_READ_STORAGE_KEY, initialValue)
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

  it("includes a pre-v4 release history pointer to GitHub Releases", () => {
    const historyAnnouncement = announcements.find(
      (announcement) => announcement.id === "2026-06-12-pre-v4-release-history",
    )

    expect(historyAnnouncement?.title).toBe("V4.0.0 之前版本更新记录")
    expect(historyAnnouncement?.content).toContain(
      "https://github.com/RidRisR/DaggerHeart-CharacterSheet/releases",
    )
  })

  it("reports the latest announcement as read when storage contains the latest id", () => {
    expect(isLatestAnnouncementRead(createStorage(latestAnnouncementId ?? ""))).toBe(true)
  })

  it("marks the latest announcement as read", () => {
    const storage = createStorage()

    markLatestAnnouncementRead(storage)

    expect(storage.setItem).toHaveBeenCalledWith(
      ANNOUNCEMENTS_READ_STORAGE_KEY,
      latestAnnouncementId,
    )
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
})
