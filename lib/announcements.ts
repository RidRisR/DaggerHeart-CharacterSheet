import {
  isLatestAnnouncementRead as isLatestAnnouncementReadPreference,
  markAnnouncementRead,
} from "@/lib/app-preferences"

export interface Announcement {
  id: string
  date: string
  title: string
  content: string
}

export const announcements: Announcement[] = [
  {
    id: "2026-06-24-card-automation-preview",
    date: "2026-06-24",
    title: "V4.2.0 Preview",
    content: `
## 主要内容

这次预览版开始接入“卡牌自动化”。部分卡牌能力现在可以在加入角色后引导你完成选项配置，并把卡牌带来的属性、经历、生命、压力等修正自动加入计算来源。

## 卡牌自动化

- 卡牌现在可以携带自动化配置，用来描述能力选项、目标选择、条件分支和修正项。
- 添加带自动化能力的卡牌时，会出现配置流程，引导选择能力模式、经历目标或奖励选项。
- 自动化生成的修正项会显示为卡牌来源，方便在修正项面板里追踪它来自哪张卡。
- 如果经历栏为空，配置流程会阻止选择空目标；已经保存过的修正项不会因为之后清空经历名称而丢失。

## 卡牌来源和更新

- 在卡组界面添加卡牌不一致检查。已添加到角色上的卡牌如果和当前卡包模板不一致，会通过卡牌更新提示展示可更新项。
- 更新弹窗支持逐项选择和预览，避免一次性覆盖不想更新的卡牌。
- 重整了卡牌运行时来源，内置卡牌和自定义卡包现在走统一的来源装配流程。

## 自定义卡包

- 自定义卡包导入现在支持新的卡牌自动化定义。
- 导入和校验会给出更明确的诊断，方便定位卡包格式或自动化配置问题。
- 新增了连续单选/多选的测试卡包示例，方便验证复杂能力流程。

## 注意

卡牌自动化仍是预览功能，目前会优先覆盖适合结构化表达的卡牌能力。旧卡包仍然可以继续使用，不需要因为这次更新立即迁移。

如果你在使用卡牌自动化或自定义卡包时遇到异常，可以通过 QQ 联系我：2839705644。
`.trim(),
  },
  {
    id: "2026-06-12-home-more-menu-announcements",
    date: "2026-06-12",
    title: "V4.1.0",
    content: `
## 主要内容

- 这次更新把原来的卡包入口升级成了“扩展”，并补上了更完整的内容包管理和编辑能力。现在你可以像管理卡牌包一样管理装备包，也可以在选择武器或护甲时使用自定义装备。

## 装备与内容包

- 底部 dock 原来的“卡包”入口已调整为“扩展”，现在装备也可以像卡牌一样自定义和导入了。
- 内容包管理现在同时支持卡牌包和装备包：可以查看已安装内容包，导入新内容包，并随时启用、禁用或删除。
- 武器 / 护甲选择窗口新增筛选能力：可以按来源、等级、属性、伤害类型、范围等条件快速找到装备。

## 装备包创作和编辑

- 临时自定义武器/护甲的创作界面更新，现在支持从已有的模板生成新的自定义武器和护甲。
- “卡包编辑器”更名为“内容包编辑器”，现在可以像创作卡牌包一样创作和管理内容包。
- 重新制作了创作指南页面，现在加上了装备包的创作指南和AI提示词，方便AI辅助创作。

## 使用体验

- 底部 dock 新增“更多”菜单，集中放置更新公告、关于本站、GitHub 项目和下载入口。
- 新增更新公告弹窗，新公告会通过红点提示。
- 优化卡牌悬浮预览、移动端显示、打印预览间距和底部 dock 交互。
- JSON / HTML 导入创建存档的流程更稳定，导入失败时的校验和提示更可靠。

## 修复

- 修复卡包指南锚点跳转问题。
- 修复装备选择写入角色卡、装备包元数据校验等问题。
- 修复属性、武器、护甲等自动计算来源和最终数值中的若干不一致。
- 修复打印预览、移动端布局和卡牌预览位置相关问题。

## 反馈

自定义装备和装备包相关功能刚上线，可能还会有一些问题。如果你在使用时遇到异常，或者对新功能有建议，可以通过 QQ 联系我：2839705644。
`.trim(),
  },
  {
    id: "2026-06-12-pre-v4-release-history",
    date: "2026-06-12",
    title: "V4.0.0 及历史版本",
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

export function isLatestAnnouncementRead(storage?: Storage) {
  return isLatestAnnouncementReadPreference(latestAnnouncementId, storage)
}

export function markLatestAnnouncementRead(storage?: Storage) {
  markAnnouncementRead(latestAnnouncementId, storage)
}
