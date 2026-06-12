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

    expect(extensionButton.compareDocumentPosition(moreButton) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy()
  })

  it("opens update announcements from the more menu", () => {
    const onOpenAnnouncements = vi.fn()
    render(<BottomDock {...mainProps} onOpenAnnouncements={onOpenAnnouncements} />)

    fireEvent.pointerDown(screen.getByRole("button", { name: "更多" }))
    fireEvent.click(screen.getByRole("menuitem", { name: "更新公告" }))

    expect(onOpenAnnouncements).toHaveBeenCalledTimes(1)
  })

  it("shows unread affordances when announcements are unread", () => {
    render(<BottomDock {...mainProps} hasUnreadAnnouncements />)

    const unreadDot = screen.getByLabelText("有新的更新公告")
    expect(unreadDot).toBeTruthy()
    expect(unreadDot.className).not.toContain("ring-gray-900")
    fireEvent.pointerDown(screen.getByRole("button", { name: "更多" }))
    expect(screen.getByText("NEW")).toBeTruthy()
  })

  it("links to About and GitHub from the more menu", () => {
    render(<BottomDock {...mainProps} />)

    fireEvent.pointerDown(screen.getByRole("button", { name: "更多" }))

    expect(screen.getByRole("menuitem", { name: "关于本站" })).toBeTruthy()
    expect(screen.getByRole("menuitem", { name: "GitHub 项目 / 下载" })).toBeTruthy()
  })
})
