export interface Announcement {
  id: string
  date: string
  title: string
  content: string
}

export const ANNOUNCEMENTS_READ_STORAGE_KEY = "dhsheet:last-read-announcement-id"

export const announcements: Announcement[] = [
  {
    id: "2026-06-12-home-more-menu-announcements",
    date: "2026-06-12",
    title: "更多菜单与更新公告",
    content: `
## 更新内容

- 底部 dock 新增“更多”入口，承载低频站点功能。
- GitHub 项目与关于本站入口从水印迁移到“更多”菜单。
- 新增更新公告弹窗，并支持未读提示。
`.trim(),
  },
]

export function getSortedAnnouncements(
  source: readonly Announcement[] = announcements,
): Announcement[] {
  return source
    .map((announcement, index) => ({ announcement, index }))
    .sort((left, right) => {
      const dateComparison = right.announcement.date.localeCompare(left.announcement.date)
      if (dateComparison !== 0) return dateComparison
      return left.index - right.index
    })
    .map(({ announcement }) => announcement)
}

export const latestAnnouncement = getSortedAnnouncements()[0] ?? null
export const latestAnnouncementId = latestAnnouncement?.id ?? null

export function isLatestAnnouncementRead(storage: Storage | undefined = globalThis.localStorage) {
  if (!latestAnnouncementId || !storage) {
    return true
  }

  try {
    return storage.getItem(ANNOUNCEMENTS_READ_STORAGE_KEY) === latestAnnouncementId
  } catch {
    return false
  }
}

export function markLatestAnnouncementRead(storage: Storage | undefined = globalThis.localStorage) {
  if (!latestAnnouncementId || !storage) {
    return
  }

  try {
    storage.setItem(ANNOUNCEMENTS_READ_STORAGE_KEY, latestAnnouncementId)
  } catch {
    // Reading announcements should remain usable when storage is unavailable.
  }
}
