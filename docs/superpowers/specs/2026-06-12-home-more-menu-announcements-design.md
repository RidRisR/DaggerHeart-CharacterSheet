# Home More Menu Announcements Design

## Context

The home page has several global utility entry points in the bottom dock. The current dock already has an `扩展` button that links to `/card-manager`. The site watermark in `app/layout.tsx` also exposes GitHub and About links, but those links are visually disconnected from the main app controls and make the watermark do more than attribution.

We want a new bottom-dock utility entry called `更多`, placed to the right of `扩展`. This menu becomes the home for low-frequency site-level actions:

- Update announcements.
- About page.
- GitHub project and download link.

The update announcements should open in a modal and be easy to maintain as Markdown-like content.

## Goal

Add a lightweight `更多` menu to the main bottom dock that:

- Appears immediately to the right of `扩展`.
- Opens a small dropdown menu.
- Contains `更新公告`, `关于本站`, and `GitHub 项目 / 下载`.
- Opens update announcements in a modal.
- Moves GitHub/About navigation out of the watermark links.
- Shows an unread indicator when the latest announcement has not been read in this browser.
- Keeps announcement maintenance simple and testable.

## Non-Goals

- No dedicated announcements route.
- No remote CMS, API, feed, or runtime fetch.
- No user account sync for read state.
- No automatic changelog generation from git history.
- No major redesign of the dock.
- No preview-mode dock changes.
- No removal of attribution text from the watermark.

## Menu Design

The `更多` button uses the existing bottom dock button language:

- Same dark button style as `扩展`.
- A compact icon from `lucide-react`, such as `MoreHorizontal` or `Ellipsis`.
- Text label `更多`.
- Tooltip title `更多`.
- Tooltip description `查看公告、关于本站和项目链接`.

The button is rendered in main mode only and is placed in Group C after `扩展`. On desktop, the existing `DualPageToggle` remains after `更多`. On mobile, the button keeps the same touch-target sizing pattern as other dock buttons.

The dropdown is intentionally flat:

1. `更新公告`
2. separator
3. `关于本站`
4. `GitHub 项目 / 下载`

This combines the selected A+C direction: a lightweight menu with an unread announcement signal, without introducing nested groups.

## Unread Indicator

Unread state is a client-only enhancement based on `localStorage`.

When the latest announcement has not been read:

- The `更多` button shows a small red dot in the upper-right area.
- The `更新公告` menu item shows a compact `NEW` marker on the right.

When the user opens the announcement modal:

- The app writes the latest announcement id to localStorage.
- The red dot and `NEW` marker disappear.

Use a stable storage key:

```ts
const ANNOUNCEMENTS_READ_STORAGE_KEY = "dhsheet:last-read-announcement-id"
```

The read marker stores only the latest announcement id. If a newer announcement is added later, its id differs and the indicator appears again.

LocalStorage failures should not break rendering. If read/write fails, treat announcements as unread for that session and continue.

## Announcement Data Model

Maintain announcements in a TypeScript module:

```ts
export interface Announcement {
  id: string
  date: string
  title: string
  content: string
}
```

Example:

```ts
export const announcements: Announcement[] = [
  {
    id: "2026-06-12-home-more-menu-announcements",
    date: "2026-06-12",
    title: "更多菜单与更新公告",
    content: `
## 更新内容

- 底部 dock 新增“更多”入口。
- GitHub 和关于本站入口迁移到“更多”菜单。
- 新增更新公告 modal。
`.trim(),
  },
]
```

This keeps announcement content Markdown-formatted while avoiding a separate file-per-announcement structure. It also gives tests direct access to the list and latest-id helper.

The module should export:

- `announcements`: all announcements.
- `latestAnnouncement`: first announcement after sorting.
- `latestAnnouncementId`: latest announcement id or `null`.
- `getSortedAnnouncements()`: date-descending, stable tie-breaker by id or source order.
- `isLatestAnnouncementRead(storage?)`: safe read helper.
- `markLatestAnnouncementRead(storage?)`: safe write helper.

The canonical display order is newest first. Authors may keep the source list newest first, but rendering should still use the sorted helper so accidental order drift is caught.

## Announcement Modal

The modal opens from `更新公告` and uses existing UI primitives:

- `Dialog`
- `DialogContent`
- `DialogHeader`
- `DialogTitle`
- `DialogDescription`
- existing Markdown rendering, preferably `MarkdownGuide` if its typography is acceptable inside a modal

Desktop layout:

- Max width around `720px`.
- Max height around `80vh`.
- Header remains visible at the top of the dialog content.
- Announcement list scrolls when content exceeds available height.

Mobile layout:

- Width around `calc(100vw - 2rem)` or existing dialog responsive width.
- Max height around `85vh`.
- Touch-friendly close behavior inherited from dialog primitive.

Each announcement shows:

- Date.
- Title.
- Markdown body.

The modal should render all announcements in descending date order. It should not hide older announcements behind tabs or filters in this first pass.

## Component Boundaries

`BottomDock` remains a presentational/control component. It should not read localStorage or own the announcements modal state.

Main-mode dock props gain:

- `hasUnreadAnnouncements: boolean`
- `onOpenAnnouncements: () => void`

`HomeClientApp` owns:

- announcement modal open state
- unread state after client mount
- calling `markLatestAnnouncementRead` when the modal opens

The announcement modal can be a focused component, such as:

```txt
components/modals/announcements-modal.tsx
```

The data/helper module lives at:

```txt
lib/announcements.ts
```

This keeps static content and browser read-state helpers out of the dock component.

## Watermark Changes

The watermark should continue to state:

- the work is open source and free
- author attribution
- translation and proofreading attribution

Remove only the clickable GitHub/About link row from the watermark. The navigation entry points move to the `更多` menu.

The structured data and SEO metadata can continue referencing GitHub where appropriate. This feature changes visible navigation, not site identity metadata.

## Navigation Behavior

`关于本站` should navigate to `/about` using the project’s existing navigation helper pattern where appropriate.

`GitHub 项目 / 下载` should open:

```txt
https://github.com/RidRisR/DaggerHeart-CharacterSheet
```

Use a normal external link behavior equivalent to `target="_blank"` and `rel="noopener noreferrer"`.

`更新公告` opens the modal and marks the latest announcement as read.

## Accessibility

- The `更多` dropdown trigger must have a clear accessible label.
- The unread dot should be hidden from screen readers or paired with text in the menu item; visual-only dots should not be announced as meaningless content.
- The `NEW` marker should be textual and visible in the menu item.
- The modal uses `DialogTitle` and `DialogDescription`.
- Keyboard users can open the menu, choose announcement/about/GitHub items, and close the modal with Escape.
- Touch targets follow existing mobile dock sizing.

## Empty State

If the announcements list is empty:

- Do not show unread indicators.
- Keep the `更新公告` menu item enabled.
- Open the modal and show `暂无更新公告`.

The initial implementation should include at least one real announcement, so the empty state is defensive.

## Testing

Add focused unit tests around the home-level behavior and data helpers.

Data/helper tests:

- Announcements sort newest first.
- Latest announcement id is derived from sorted announcements.
- `isLatestAnnouncementRead` returns true when storage has the latest id.
- Storage read/write failures do not throw.

Home/dock tests:

- The main dock renders `更多` in the utility group after `扩展`.
- Opening `更多` exposes `更新公告`, `关于本站`, and `GitHub 项目 / 下载`.
- Unread state shows the red-dot/NEW affordance.
- Clicking `更新公告` opens the modal and records the latest announcement id.
- After opening announcements, unread affordances disappear.
- The modal renders all announcements in newest-first order.

Watermark test coverage should assert that GitHub/About visible links are no longer present in the watermark area if an existing layout test makes that practical.

## Implementation Notes

This feature should be implemented as a small integration on the current home page:

- Reuse the existing dropdown menu primitives already used by `导出` and `存档`.
- Reuse existing dialog primitives.
- Prefer existing Markdown rendering instead of adding another Markdown renderer.
- Keep localStorage access inside effects or event handlers so static export and initial render are stable.
- Avoid changing preview-mode dock props.

The design intentionally avoids a separate Markdown file per announcement for now. A TS module with Markdown strings is enough for maintenance, static export, and test coverage. If announcement volume grows later, the same `Announcement` interface can become the adapter target for imported `.md` files.
