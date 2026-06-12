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
      expect(screen.getByTestId("unread").textContent).toBe("true")
    })

    fireEvent.click(screen.getByRole("button", { name: "open announcements" }))

    expect(localStorage.getItem(ANNOUNCEMENTS_READ_STORAGE_KEY)).toBe(latestAnnouncementId)
    await waitFor(() => {
      expect(screen.getByTestId("unread").textContent).toBe("false")
    })
    expect(screen.getByRole("heading", { name: "更新公告" })).toBeTruthy()
  })

  it("starts read when localStorage already contains the latest announcement id", async () => {
    localStorage.setItem(ANNOUNCEMENTS_READ_STORAGE_KEY, latestAnnouncementId ?? "")

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByTestId("unread").textContent).toBe("false")
    })
  })
})
