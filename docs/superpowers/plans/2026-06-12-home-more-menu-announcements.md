# Home More Menu Announcements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lightweight `更多` bottom-dock menu with update announcements, unread state, About/GitHub links, and remove the old watermark links.

**Architecture:** Static announcement content and safe localStorage helpers live in `lib/announcements.ts`. `BottomDock` renders the presentational menu and unread affordance through props. `HomeClientApp` owns client-only unread state and the announcement modal open state, while `AnnouncementsModal` renders sorted Markdown announcements.

**Tech Stack:** Next.js app router, React client components, Vitest, Testing Library, Radix/shadcn `DropdownMenu` and `Dialog`, `react-markdown` through the existing `MarkdownGuide`.

---

## File Structure

- Create `lib/announcements.ts`
  - Owns static announcement records, sorted accessors, latest id derivation, and safe localStorage read/write helpers.
- Create `tests/unit/announcements.test.ts`
  - Covers sorting, latest id, read/write behavior, and storage failure resilience.
- Create `components/modals/announcements-modal.tsx`
  - Renders all announcements in a scrollable dialog using existing dialog and Markdown components.
- Create `tests/unit/announcements-modal.test.tsx`
  - Covers modal rendering, empty state, and newest-first ordering.
- Modify `components/layout/bottom-dock.tsx`
  - Adds `更多` menu in main mode after `扩展`, with unread dot and `NEW` marker.
- Create `tests/unit/bottom-dock-more-menu.test.tsx`
  - Covers menu visibility, menu items, unread affordance, and callback/link behavior.
- Modify `components/home-client-app.tsx`
  - Owns announcement modal state and read state, passes props to `BottomDock`, and renders `AnnouncementsModal`.
- Create `tests/unit/home-announcements.test.tsx`
  - Covers Home-level localStorage state flow using a mocked `BottomDock`.
- Modify `app/layout.tsx`
  - Removes clickable GitHub/About row from the visible watermark while keeping attribution text and SEO structured data.

---

### Task 1: Announcement Data and Storage Helpers

**Files:**
- Create: `tests/unit/announcements.test.ts`
- Create: `lib/announcements.ts`

- [ ] **Step 1: Write the failing helper tests**

Create `tests/unit/announcements.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the helper tests and verify RED**

Run:

```bash
pnpm vitest run tests/unit/announcements.test.ts
```

Expected: FAIL because `@/lib/announcements` does not exist.

- [ ] **Step 3: Add the helper implementation**

Create `lib/announcements.ts`:

```ts
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
```

- [ ] **Step 4: Run the helper tests and verify GREEN**

Run:

```bash
pnpm vitest run tests/unit/announcements.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add lib/announcements.ts tests/unit/announcements.test.ts
git commit -m "feat: add announcement data helpers"
```

---

### Task 2: Announcement Modal

**Files:**
- Create: `tests/unit/announcements-modal.test.tsx`
- Create: `components/modals/announcements-modal.tsx`

- [ ] **Step 1: Write the failing modal tests**

Create `tests/unit/announcements-modal.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { AnnouncementsModal } from "@/components/modals/announcements-modal"

describe("AnnouncementsModal", () => {
  it("renders announcements newest first", () => {
    render(
      <AnnouncementsModal
        isOpen
        onClose={() => {}}
        announcements={[
          { id: "old", date: "2026-01-01", title: "Old update", content: "Old body" },
          { id: "new", date: "2026-06-12", title: "New update", content: "New body" },
        ]}
      />,
    )

    const articleTitles = screen.getAllByRole("heading", { level: 3 })
    expect(articleTitles.map((heading) => heading.textContent)).toEqual([
      "2026-06-12 · New update",
      "2026-01-01 · Old update",
    ])
    expect(screen.getByText("New body")).toBeInTheDocument()
    expect(screen.getByText("Old body")).toBeInTheDocument()
  })

  it("renders an empty state when there are no announcements", () => {
    render(<AnnouncementsModal isOpen onClose={() => {}} announcements={[]} />)

    expect(screen.getByRole("heading", { name: "更新公告" })).toBeInTheDocument()
    expect(screen.getByText("暂无更新公告")).toBeInTheDocument()
  })

  it("does not render dialog content while closed", () => {
    render(
      <AnnouncementsModal
        isOpen={false}
        onClose={() => {}}
        announcements={[{ id: "new", date: "2026-06-12", title: "New update", content: "New body" }]}
      />,
    )

    expect(screen.queryByRole("heading", { name: "更新公告" })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the modal tests and verify RED**

Run:

```bash
pnpm vitest run tests/unit/announcements-modal.test.tsx
```

Expected: FAIL because `@/components/modals/announcements-modal` does not exist.

- [ ] **Step 3: Add the modal component**

Create `components/modals/announcements-modal.tsx`:

```tsx
"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MarkdownGuide } from "@/components/guides/markdown-guide"
import { getSortedAnnouncements, type Announcement } from "@/lib/announcements"

interface AnnouncementsModalProps {
  isOpen: boolean
  onClose: () => void
  announcements: readonly Announcement[]
}

export function AnnouncementsModal({
  isOpen,
  onClose,
  announcements,
}: AnnouncementsModalProps) {
  const sortedAnnouncements = getSortedAnnouncements(announcements)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose()
    }}>
      <DialogContent className="max-h-[85vh] max-w-[calc(100vw-2rem)] overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>更新公告</DialogTitle>
          <DialogDescription>按发布时间倒序排列，最近更新在最上方。</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto pr-1">
          {sortedAnnouncements.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">暂无更新公告</p>
          ) : (
            <div className="space-y-8">
              {sortedAnnouncements.map((announcement) => (
                <article key={announcement.id} className="border-l-4 border-blue-500 pl-4">
                  <h3 className="mb-3 text-base font-semibold tracking-normal text-gray-950">
                    {announcement.date} · {announcement.title}
                  </h3>
                  <MarkdownGuide
                    content={announcement.content}
                    headingIdPrefix={`announcement-${announcement.id}`}
                  />
                </article>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Run the modal tests and verify GREEN**

Run:

```bash
pnpm vitest run tests/unit/announcements-modal.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add components/modals/announcements-modal.tsx tests/unit/announcements-modal.test.tsx
git commit -m "feat: add announcements modal"
```

---

### Task 3: Bottom Dock More Menu

**Files:**
- Create: `tests/unit/bottom-dock-more-menu.test.tsx`
- Modify: `components/layout/bottom-dock.tsx`

- [ ] **Step 1: Write the failing dock tests**

Create `tests/unit/bottom-dock-more-menu.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { BottomDock } from "@/components/layout/bottom-dock"

const mainProps = {
  mode: "main" as const,
  isMobile: false,
  isCardDrawerOpen: false,
  characterCount: 1,
  hasUnreadAnnouncements: false,
  onToggleCardDrawer: vi.fn(),
  onToggleGuide: vi.fn(),
  onToggleNotebook: vi.fn(),
  onPrintAll: vi.fn(),
  onOpenSealDiceExport: vi.fn(),
  onQuickExportJSON: vi.fn(),
  onQuickExportPDF: vi.fn(),
  onQuickExportHTML: vi.fn(),
  onOpenCharacterManagement: vi.fn(),
  onQuickCreateArchive: vi.fn(),
  onQuickImportFromHTML: vi.fn(),
  onOpenAnnouncements: vi.fn(),
}

describe("BottomDock more menu", () => {
  it("renders the more menu after the extension button", () => {
    render(<BottomDock {...mainProps} />)

    const extensionButton = screen.getByRole("button", { name: "扩展" })
    const moreButton = screen.getByRole("button", { name: "更多" })

    expect(extensionButton.compareDocumentPosition(moreButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("opens update announcements from the more menu", () => {
    const onOpenAnnouncements = vi.fn()
    render(<BottomDock {...mainProps} onOpenAnnouncements={onOpenAnnouncements} />)

    fireEvent.click(screen.getByRole("button", { name: "更多" }))
    fireEvent.click(screen.getByRole("menuitem", { name: "更新公告" }))

    expect(onOpenAnnouncements).toHaveBeenCalledTimes(1)
  })

  it("shows unread affordances when announcements are unread", () => {
    render(<BottomDock {...mainProps} hasUnreadAnnouncements />)

    expect(screen.getByLabelText("有新的更新公告")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "更多" }))
    expect(screen.getByText("NEW")).toBeInTheDocument()
  })

  it("links to About and GitHub from the more menu", () => {
    render(<BottomDock {...mainProps} />)

    fireEvent.click(screen.getByRole("button", { name: "更多" }))

    expect(screen.getByRole("menuitem", { name: "关于本站" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "GitHub 项目 / 下载" })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the dock tests and verify RED**

Run:

```bash
pnpm vitest run tests/unit/bottom-dock-more-menu.test.tsx
```

Expected: FAIL because `BottomDock` does not accept `hasUnreadAnnouncements` / `onOpenAnnouncements` and does not render `更多`.

- [ ] **Step 3: Add the menu props and UI**

Modify `components/layout/bottom-dock.tsx`:

```tsx
import {
  Download,
  FolderOpen,
  Package,
  Sparkles,
  FileText,
  FileJson,
  FileType,
  Code,
  Dice5,
  Plus,
  Upload,
  BookOpen,
  Layers,
  MoreHorizontal,
  Megaphone,
  Info,
  Github,
} from "lucide-react"
```

Add props to `MainModeProps`:

```ts
  // 站点信息
  hasUnreadAnnouncements: boolean
  onOpenAnnouncements: () => void
```

Add the `更多` dropdown immediately after the existing `扩展` tooltip/button and before `DualPageToggle`:

```tsx
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  className={cn(
                    "bg-gray-800 hover:bg-gray-700 text-white gap-1.5 text-sm relative",
                    isMobile ? "px-4 py-2.5" : "px-3 py-1.5",
                  )}
                  aria-label="更多"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                  更多
                  {props.hasUnreadAnnouncements && (
                    <span
                      aria-label="有新的更新公告"
                      className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-gray-900"
                    />
                  )}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>更多</p>
              <p className="text-xs text-muted-foreground mt-1">
                查看公告、关于本站和项目链接
              </p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" side="top" className={cn("w-56", isMobile && "text-base")}>
            <DropdownMenuItem onClick={props.onOpenAnnouncements} className={cn(isMobile && "py-3 px-4")}>
              <Megaphone className={cn("mr-2", isMobile ? "h-5 w-5" : "h-4 w-4")} />
              <span>更新公告</span>
              {props.hasUnreadAnnouncements && (
                <span className="ml-auto text-xs font-semibold text-red-600">NEW</span>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigateToPage("/about")} className={cn(isMobile && "py-3 px-4")}>
              <Info className={cn("mr-2", isMobile ? "h-5 w-5" : "h-4 w-4")} />
              关于本站
            </DropdownMenuItem>
            <DropdownMenuItem asChild className={cn(isMobile && "py-3 px-4")}>
              <a
                href="https://github.com/RidRisR/DaggerHeart-CharacterSheet"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className={cn("mr-2", isMobile ? "h-5 w-5" : "h-4 w-4")} />
                GitHub 项目 / 下载
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
```

- [ ] **Step 4: Run the dock tests and verify GREEN**

Run:

```bash
pnpm vitest run tests/unit/bottom-dock-more-menu.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add components/layout/bottom-dock.tsx tests/unit/bottom-dock-more-menu.test.tsx
git commit -m "feat: add more menu to bottom dock"
```

---

### Task 4: Home Integration and Watermark Link Removal

**Files:**
- Create: `tests/unit/home-announcements.test.tsx`
- Modify: `components/home-client-app.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write the failing home integration tests**

Create `tests/unit/home-announcements.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import Home from "@/app/page"
import {
  ANNOUNCEMENTS_READ_STORAGE_KEY,
  latestAnnouncementId,
} from "@/lib/announcements"

vi.mock("@/components/layout/bottom-dock", () => ({
  BottomDock: (props: any) => props.mode === "main" ? (
    <div>
      <div data-testid="unread">{String(props.hasUnreadAnnouncements)}</div>
      <button onClick={props.onOpenAnnouncements}>open announcements</button>
    </div>
  ) : null,
}))

vi.mock("@/hooks/use-character-management", () => ({
  useCharacterManagement: () => ({
    currentCharacterId: "current-character",
    characterList: [{ id: "current-character", saveName: "Current" }],
    isLoading: false,
    switchToCharacter: vi.fn(),
    createNewCharacterHandler: vi.fn(),
    createImportedCharacterHandler: vi.fn(),
    deleteCharacterHandler: vi.fn(),
    duplicateCharacterHandler: vi.fn(),
    renameCharacterHandler: vi.fn(),
    handleQuickCreateArchive: vi.fn(),
  }),
}))

vi.mock("@/lib/sheet-store", () => ({
  useSheetStore: () => ({
    sheetData: {
      name: "Current Hero",
      cards: [],
      inventory_cards: [],
      pageVisibility: {
        rangerCompanion: true,
        armorTemplate: false,
        adventureNotes: false,
      },
    },
    setSheetData: vi.fn(),
  }),
  useCardActions: () => ({
    deleteCard: vi.fn(),
    moveCard: vi.fn(),
    updateCard: vi.fn(),
  }),
}))

vi.mock("@/lib/pinned-cards-store", () => ({
  usePinnedCardsStore: () => ({ pinnedCards: [] }),
}))

vi.mock("@/lib/text-mode-store", () => ({
  useTextModeStore: () => ({ isTextMode: false, toggleTextMode: vi.fn() }),
}))

vi.mock("@/lib/dual-page-store", () => ({
  useDualPageStore: () => ({
    isDualPageMode: false,
    leftPageId: "page1",
    rightPageId: "page2",
    leftTabValue: "page1",
    rightTabValue: "page2",
    setLeftTab: vi.fn(),
    setRightTab: vi.fn(),
  }),
}))

vi.mock("@/lib/page-registry", () => ({
  registerPages: vi.fn(),
  getTabPages: () => [{ id: "page1", tabValue: "page1" }],
}))

vi.mock("@/hooks/use-export-handlers", () => ({
  useExportHandlers: () => ({
    handlePrintAll: vi.fn(),
    handleExportHTML: vi.fn(),
    handleExportJSON: vi.fn(),
    handleQuickExportPDF: vi.fn(),
    handleQuickExportHTML: vi.fn(),
    handleQuickExportJSON: vi.fn(),
  }),
}))

vi.mock("@/components/character-sheet", () => ({ default: () => null }))
vi.mock("@/components/character-sheet-page-two", () => ({ default: () => null }))
vi.mock("@/components/character-sheet-page-ranger-companion", () => ({ default: () => null }))
vi.mock("@/components/character-sheet-page-adventure-notes", () => ({ default: () => null }))
vi.mock("@/components/character-sheet-page-iknis", () => ({ default: () => null }))
vi.mock("@/components/character-sheet-page-card-print", () => ({
  CharacterSheetPageFour: () => null,
  CharacterSheetPageFive: () => null,
}))
vi.mock("@/components/card-drawer", () => ({ CardDrawer: () => null }))
vi.mock("@/components/modals/card-selection-modal", () => ({ CardSelectionModal: () => null }))
vi.mock("@/components/guide/character-creation-guide", () => ({ CharacterCreationGuide: () => null }))
vi.mock("@/components/modals/character-management-modal", () => ({ CharacterManagementModal: () => null }))
vi.mock("@/components/modals/seal-dice-export-modal", () => ({ SealDiceExportModal: () => null }))
vi.mock("@/components/print/print-ready-checker", () => ({ PrintReadyChecker: ({ children }: any) => children }))
vi.mock("@/contexts/print-context", () => ({ PrintProvider: ({ children }: any) => children }))
vi.mock("@/components/ui/pinned-card-window", () => ({ PinnedCardWindow: () => null }))
vi.mock("@/components/notebook", () => ({ FloatingNotebook: () => null }))
vi.mock("@/components/layout/page-display", () => ({ PageDisplay: () => null }))
vi.mock("@/components/print/print-page-renderer", () => ({ PrintPageRenderer: () => null }))
vi.mock("@/components/ui/save-switcher", () => ({ SaveSwitcher: () => null }))
vi.mock("@/components/memory-alert", () => ({ MemoryAlert: () => null }))
vi.mock("@/components/ui/fade-notification", () => ({ showFadeNotification: vi.fn() }))
vi.mock("@/lib/memory-monitor", () => ({
  memoryMonitor: {
    start: vi.fn(),
    stop: vi.fn(),
    logAction: vi.fn(),
  },
}))

describe("home announcements", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("starts unread and marks the latest announcement read when opened", async () => {
    render(<Home />)

    await waitFor(() => {
      expect(screen.getByTestId("unread")).toHaveTextContent("true")
    })

    fireEvent.click(screen.getByRole("button", { name: "open announcements" }))

    expect(localStorage.getItem(ANNOUNCEMENTS_READ_STORAGE_KEY)).toBe(latestAnnouncementId)
    await waitFor(() => {
      expect(screen.getByTestId("unread")).toHaveTextContent("false")
    })
    expect(screen.getByRole("heading", { name: "更新公告" })).toBeInTheDocument()
  })

  it("starts read when localStorage already contains the latest announcement id", async () => {
    localStorage.setItem(ANNOUNCEMENTS_READ_STORAGE_KEY, latestAnnouncementId ?? "")

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByTestId("unread")).toHaveTextContent("false")
    })
  })
})
```

- [ ] **Step 2: Run the home tests and verify RED**

Run:

```bash
pnpm vitest run tests/unit/home-announcements.test.tsx
```

Expected: FAIL because `HomeClientApp` does not pass announcement props and does not render `AnnouncementsModal`.

- [ ] **Step 3: Integrate announcement state in `HomeClientApp`**

Modify `components/home-client-app.tsx` imports:

```tsx
import { AnnouncementsModal } from "@/components/modals/announcements-modal"
import {
  announcements,
  isLatestAnnouncementRead,
  markLatestAnnouncementRead,
} from "@/lib/announcements"
```

Add state near the other UI state:

```tsx
  const [announcementsModalOpen, setAnnouncementsModalOpen] = useState(false)
  const [hasUnreadAnnouncements, setHasUnreadAnnouncements] = useState(false)
```

Add an effect after client mount logic:

```tsx
  useEffect(() => {
    if (!isClient) return
    setHasUnreadAnnouncements(!isLatestAnnouncementRead())
  }, [isClient])
```

Add an open handler:

```tsx
  const openAnnouncementsModal = () => {
    markLatestAnnouncementRead()
    setHasUnreadAnnouncements(false)
    setAnnouncementsModalOpen(true)
  }
```

Pass the new props into the main `BottomDock`:

```tsx
        hasUnreadAnnouncements={hasUnreadAnnouncements}
        onOpenAnnouncements={openAnnouncementsModal}
```

Render the modal near the other modals:

```tsx
      <AnnouncementsModal
        isOpen={announcementsModalOpen}
        onClose={() => setAnnouncementsModalOpen(false)}
        announcements={announcements}
      />
```

- [ ] **Step 4: Remove the old watermark links**

Modify `app/layout.tsx` watermark block so it keeps attribution text but removes the GitHub/About anchor row:

```tsx
            <div className="fixed bottom-2 left-2 text-gray-500 text-xs opacity-75 pointer-events-none">
              本作品完全开源且免费
              <br />
              作者：RidRisR
              <br />
              翻译及校对：PolearmMaster, 末楔, 里予, 一得, RisRisR
            </div>
```

Do not remove `githubUrl` or structured data usage.

- [ ] **Step 5: Run the home tests and verify GREEN**

Run:

```bash
pnpm vitest run tests/unit/home-announcements.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit Task 4**

```bash
git add components/home-client-app.tsx app/layout.tsx tests/unit/home-announcements.test.tsx
git commit -m "feat: integrate home announcements"
```

---

### Task 5: Final Verification

**Files:**
- Verify all modified files.

- [ ] **Step 1: Run focused announcement and dock tests**

Run:

```bash
pnpm vitest run tests/unit/announcements.test.ts tests/unit/announcements-modal.test.tsx tests/unit/bottom-dock-more-menu.test.tsx tests/unit/home-announcements.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run related existing home import test**

Run:

```bash
pnpm vitest run tests/unit/quick-html-import.test.tsx
```

Expected: PASS. This catches accidental prop breakage in tests that mock `BottomDock`.

- [ ] **Step 3: Run type-aware build-adjacent verification if time permits**

Run:

```bash
pnpm vitest run tests/unit
```

Expected: PASS. If this is too slow for the session, run the focused tests above and record that the full unit suite was not run.

- [ ] **Step 4: Inspect final diff**

Run:

```bash
git diff --stat
git diff -- components/layout/bottom-dock.tsx components/home-client-app.tsx app/layout.tsx lib/announcements.ts components/modals/announcements-modal.tsx
```

Expected: Diff only contains announcement/menu changes described in the spec.

---

## Self-Review

Spec coverage:

- `更多` button after `扩展`: Task 3.
- Flat menu with `更新公告`, `关于本站`, GitHub: Task 3.
- A+C unread indicator and localStorage read marker: Tasks 1, 3, 4.
- Markdown-maintained announcements: Tasks 1, 2.
- Modal with all announcements newest first: Task 2.
- Home owns client state, dock stays presentational: Tasks 3, 4.
- Watermark link removal: Task 4.
- Tests for helpers and UI flow: Tasks 1-5.

Placeholder scan:

- No unresolved marker text or unspecified implementation steps.
- Empty state behavior is explicit: menu item opens modal and shows `暂无更新公告`.

Type consistency:

- `Announcement`, `announcements`, `getSortedAnnouncements`, `latestAnnouncementId`, `isLatestAnnouncementRead`, and `markLatestAnnouncementRead` are defined in Task 1 and reused consistently.
- `hasUnreadAnnouncements` and `onOpenAnnouncements` are added to `MainModeProps` and passed from `HomeClientApp`.
