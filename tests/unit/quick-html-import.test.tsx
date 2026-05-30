import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Home from '@/app/page'
import { CURRENT_SCHEMA_VERSION } from '@/lib/sheet-schema-version'
import { defaultSheetData } from '@/lib/default-sheet-data'

const mockFns = vi.hoisted(() => ({
  createImportedCharacterHandler: vi.fn(() => true),
  handleQuickCreateArchive: vi.fn(),
  importCharacterFromHTMLFile: vi.fn(),
}))

vi.mock('@/lib/html-importer', () => ({
  importCharacterFromHTMLFile: mockFns.importCharacterFromHTMLFile,
}))

vi.mock('@/hooks/use-character-management', () => ({
  useCharacterManagement: () => ({
    currentCharacterId: 'current-character',
    characterList: [{ id: 'current-character', saveName: 'Current' }],
    isLoading: false,
    switchToCharacter: vi.fn(),
    createNewCharacterHandler: vi.fn(),
    createImportedCharacterHandler: mockFns.createImportedCharacterHandler,
    deleteCharacterHandler: vi.fn(),
    duplicateCharacterHandler: vi.fn(),
    renameCharacterHandler: vi.fn(),
    handleQuickCreateArchive: mockFns.handleQuickCreateArchive,
  }),
}))

vi.mock('@/components/layout/bottom-dock', () => ({
  BottomDock: (props: any) => props.mode === 'main'
    ? <button onClick={props.onQuickImportFromHTML}>trigger quick html import</button>
    : null,
}))

vi.mock('@/lib/sheet-store', () => ({
  useSheetStore: () => ({
    sheetData: {
      name: 'Current Hero',
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

vi.mock('@/lib/pinned-cards-store', () => ({
  usePinnedCardsStore: () => ({ pinnedCards: [] }),
}))

vi.mock('@/lib/text-mode-store', () => ({
  useTextModeStore: () => ({ isTextMode: false, toggleTextMode: vi.fn() }),
}))

vi.mock('@/lib/dual-page-store', () => ({
  useDualPageStore: () => ({
    isDualPageMode: false,
    leftPageId: 'page1',
    rightPageId: 'page2',
    leftTabValue: 'page1',
    rightTabValue: 'page2',
    setLeftTab: vi.fn(),
    setRightTab: vi.fn(),
  }),
}))

vi.mock('@/lib/page-registry', () => ({
  registerPages: vi.fn(),
  getTabPages: () => [{ id: 'page1', tabValue: 'page1' }],
}))

vi.mock('@/hooks/use-export-handlers', () => ({
  useExportHandlers: () => ({
    handlePrintAll: vi.fn(),
    handleExportHTML: vi.fn(),
    handleExportJSON: vi.fn(),
    handleQuickExportPDF: vi.fn(),
    handleQuickExportHTML: vi.fn(),
    handleQuickExportJSON: vi.fn(),
  }),
}))

vi.mock('@/components/character-sheet', () => ({ default: () => null }))
vi.mock('@/components/character-sheet-page-two', () => ({ default: () => null }))
vi.mock('@/components/character-sheet-page-ranger-companion', () => ({ default: () => null }))
vi.mock('@/components/character-sheet-page-adventure-notes', () => ({ default: () => null }))
vi.mock('@/components/character-sheet-page-iknis', () => ({ default: () => null }))
vi.mock('@/components/character-sheet-page-card-print', () => ({
  CharacterSheetPageFour: () => null,
  CharacterSheetPageFive: () => null,
}))
vi.mock('@/components/card-drawer', () => ({ CardDrawer: () => null }))
vi.mock('@/components/modals/card-selection-modal', () => ({ CardSelectionModal: () => null }))
vi.mock('@/components/guide/character-creation-guide', () => ({ CharacterCreationGuide: () => null }))
vi.mock('@/components/modals/character-management-modal', () => ({ CharacterManagementModal: () => null }))
vi.mock('@/components/modals/seal-dice-export-modal', () => ({ SealDiceExportModal: () => null }))
vi.mock('@/components/print/print-ready-checker', () => ({ PrintReadyChecker: ({ children }: any) => children }))
vi.mock('@/contexts/print-context', () => ({ PrintProvider: ({ children }: any) => children }))
vi.mock('@/components/ui/pinned-card-window', () => ({ PinnedCardWindow: () => null }))
vi.mock('@/components/notebook', () => ({ FloatingNotebook: () => null }))
vi.mock('@/components/layout/page-display', () => ({ PageDisplay: () => null }))
vi.mock('@/components/print/print-page-renderer', () => ({ PrintPageRenderer: () => null }))
vi.mock('@/components/ui/save-switcher', () => ({ SaveSwitcher: () => null }))
vi.mock('@/components/memory-alert', () => ({ MemoryAlert: () => null }))
vi.mock('@/components/ui/fade-notification', () => ({ showFadeNotification: vi.fn() }))
vi.mock('@/lib/memory-monitor', () => ({
  memoryMonitor: {
    start: vi.fn(),
    stop: vi.fn(),
    logAction: vi.fn(),
  },
}))

function installFileInputClick(file: File) {
  const originalCreateElement = document.createElement.bind(document)
  const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: any, options?: any) => {
    const element = originalCreateElement(tagName, options)
    if (String(tagName).toLowerCase() === 'input') {
      Object.defineProperty(element, 'files', {
        configurable: true,
        value: [file],
      })
      vi.spyOn(element, 'click').mockImplementation(() => {
        element.onchange?.({ target: element } as any)
      })
    }
    return element
  })
  return createElementSpy
}

describe('quick HTML import routing', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.spyOn(window, 'prompt').mockReturnValue('Quick Imported Save')
  })

  it('routes BottomDock quick HTML import through imported save creation', async () => {
    const importedSheet = {
      ...structuredClone(defaultSheetData),
      schemaVersion: CURRENT_SCHEMA_VERSION,
      name: 'Quick Html Hero',
    }
    delete (importedSheet as any).includePageThreeInExport
    mockFns.importCharacterFromHTMLFile.mockResolvedValue({
      success: true,
      data: importedSheet,
      warnings: [],
    })
    const fileInputSpy = installFileInputClick(new File(['<html></html>'], 'quick.html', { type: 'text/html' }))

    render(<Home />)
    fireEvent.click(screen.getByRole('button', { name: /trigger quick html import/ }))

    await waitFor(() => {
      expect(mockFns.createImportedCharacterHandler).toHaveBeenCalledWith('Quick Imported Save', importedSheet)
    })
    expect(window.prompt).toHaveBeenCalledWith('请输入新存档的名称:', 'Quick Html Hero (导入)')
    expect(mockFns.handleQuickCreateArchive).not.toHaveBeenCalled()
    fileInputSpy.mockRestore()
  })
})
