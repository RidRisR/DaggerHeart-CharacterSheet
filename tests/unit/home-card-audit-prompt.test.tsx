import "@testing-library/jest-dom/vitest"

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import Home from "@/app/page"
import type { CardInstanceAuditItem } from "@/automation/actions/card-instance-audit"

const mockFns = vi.hoisted(() => ({
  auditCardInstancesOnLoad: vi.fn(),
  getCardById: vi.fn(),
  overwriteCardInstancesFromAudit: vi.fn(() => ({ kind: "success" as const })),
}))

const auditItem: CardInstanceAuditItem = {
  id: "loadout:2:ancestry:nimble",
  zone: "loadout",
  index: 2,
  sourceCardId: "ancestry:nimble",
  sourceInstanceId: "cardinst_stale",
  templateId: "ancestry:nimble",
  cardName: "Nimble",
  reasons: ["AUTOMATION_REVISION_DRIFT"],
  updatable: true,
}

vi.mock("@/components/card-instance-audit-dialog", () => ({
  CardInstanceAuditDialog: ({ open, items, onOpenChange }: any) =>
    open ? (
      <div role="dialog" aria-label="更新卡牌">
        <div data-testid="audit-count">{items.length}</div>
        <button type="button" onClick={() => onOpenChange(false)}>
          暂不更新
        </button>
      </div>
    ) : null,
}))

vi.mock("@/card/stores/unified-card-store", () => ({
  useCardStore: (selector: any) => {
    const state = {
      initialized: true,
      loading: false,
      getCardById: mockFns.getCardById,
    }
    return selector ? selector(state) : state
  },
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

vi.mock("@/components/layout/bottom-dock", () => ({
  BottomDock: () => null,
}))

vi.mock("@/lib/sheet-store", () => {
  const sheetState = {
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
    selectCardForSlot: vi.fn(),
    setCardAbilityChoiceValuesForInstance: vi.fn(),
    auditCardInstancesOnLoad: mockFns.auditCardInstancesOnLoad,
    overwriteCardInstancesFromAudit: mockFns.overwriteCardInstancesFromAudit,
  }

  return {
    useSheetStore: (selector?: any) => selector ? selector(sheetState) : sheetState,
    useCardActions: () => ({
      deleteCard: vi.fn(),
      moveCard: vi.fn(),
    }),
  }
})

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
vi.mock("@/components/card-automation-setup", () => ({
  useCardAutomationSetupPrompt: () => ({
    handleSelectionResult: vi.fn(),
    dialog: null,
  }),
}))
vi.mock("@/lib/memory-monitor", () => ({
  memoryMonitor: {
    start: vi.fn(),
    stop: vi.fn(),
    logAction: vi.fn(),
  },
}))

describe("home card audit prompt", () => {
  beforeEach(() => {
    localStorage.clear()
    mockFns.auditCardInstancesOnLoad.mockReset()
    mockFns.getCardById.mockReset()
    mockFns.overwriteCardInstancesFromAudit.mockClear()
    mockFns.auditCardInstancesOnLoad.mockReturnValue({ items: [auditItem] })
  })

  it("opens the card update diagnostic once for the current save in this session", async () => {
    const { unmount } = render(<Home />)

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "更新卡牌" })).toBeInTheDocument()
    })
    expect(screen.getByTestId("audit-count")).toHaveTextContent("1")

    fireEvent.click(screen.getByRole("button", { name: "暂不更新" }))
    expect(screen.queryByRole("dialog", { name: "更新卡牌" })).not.toBeInTheDocument()
    unmount()

    render(<Home />)

    await waitFor(() => {
      expect(mockFns.auditCardInstancesOnLoad).toHaveBeenCalled()
    })
    expect(screen.queryByRole("dialog", { name: "更新卡牌" })).not.toBeInTheDocument()
  })
})
