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
    title: "V4.0.0 以来更新汇总",
    content: `
## 更新

- 新增“更多”菜单，把更新公告、关于本站、GitHub 项目 / 下载集中到底部 dock。
- 新增更新公告弹窗，支持按时间倒序阅读历史公告，并通过未读红点提示新公告。
- 完善站点 SEO 外壳，补充 About 页面、站点元数据、sitemap、搜索验证与 Umami 统计。
- 统一导入存档创建流程，强化 JSON / HTML 导入验证、迁移和回归覆盖。
- 新增自定义装备包能力，包括装备包导入、运行时缓存、选择筛选、编辑器和作者指南。
- 改进卡牌包 / 装备包指南阅读体验，并补充自定义装备包示例与提示词资料。
- 优化卡牌悬浮预览、移动端视口、打印预览间距和底部 dock 交互。
- 引入内存诊断监控与提示，帮助定位长时间使用时的浏览器内存问题。
- 推进属性、护甲、武器、升级等自动化计算的 modifier provider 架构。

## 修复

- 修复卡包指南锚点跳转问题。
- 修复快速 HTML 导入、受控导入和导入存档创建链路中的类型与校验问题。
- 修复打印预览底部 dock 留白、移动端布局和卡牌预览位置问题。
- 修复装备包元数据校验、装备选择写入角色卡状态和旧兼容逻辑残留问题。
- 修复 modifier 最终值、来源侧栏和相关计算状态的若干不一致。
`.trim(),
  },
  {
    id: "2026-06-12-pre-v4-release-history",
    date: "2026-06-12",
    title: "V4.0.0 之前版本更新记录",
    content: `
## 历史版本

- V4.0.0 之前的版本更新记录请前往 [GitHub Releases](https://github.com/RidRisR/DaggerHeart-CharacterSheet/releases) 查看。
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
