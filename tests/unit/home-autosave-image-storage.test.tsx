import 'fake-indexeddb/auto'
import { render, waitFor } from '@testing-library/react'
import { Blob as NodeBlob } from 'node:buffer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HomeClientApp from '@/components/home-client-app'
import { clearAllCharacterImages } from '@/character/storage/character-image-repository'
import { CHARACTER_DATA_PREFIX } from '@/lib/multi-character-storage'

const sheetData = {
  name: 'Current Hero',
  characterImage: 'data:image/png;base64,aGVsbG8=',
  companionImage: '',
  cards: [],
  inventory_cards: [],
  pageVisibility: {
    rangerCompanion: true,
    armorTemplate: false,
    adventureNotes: false,
  },
}

const sheetStoreState = {
  sheetData,
  setSheetData: vi.fn(),
  replaceSheetData: vi.fn(),
  selectCardForSlot: vi.fn(() => ({ kind: 'success', effects: [] })),
  setCardAbilityChoiceValuesForInstance: vi.fn(),
  auditCardInstancesOnLoad: vi.fn(() => ({ items: [] })),
  overwriteCardInstancesFromAudit: vi.fn(() => ({ kind: 'success' })),
}

vi.mock('@/components/layout/bottom-dock', () => ({
  BottomDock: () => null,
}))

vi.mock('@/components/layout/mobile-sheet-header', () => ({
  MobileSheetHeader: () => null,
}))

vi.mock('@/components/layout/mobile-view-config-sheet', () => ({
  MobileViewConfigSheet: () => null,
}))

vi.mock('@/hooks/use-character-management', () => ({
  useCharacterManagement: () => ({
    currentCharacterId: 'current-character',
    characterList: [{ id: 'current-character', saveName: 'Current' }],
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

vi.mock('@/lib/sheet-store', () => ({
  useSheetStore: (selector?: any) => selector ? selector(sheetStoreState) : sheetStoreState,
  useCardActions: () => ({
    deleteCard: vi.fn(),
    moveCard: vi.fn(),
    updateCard: vi.fn(),
  }),
}))

vi.mock('@/card/stores/unified-card-store', () => ({
  useCardStore: (selector?: any) => {
    const state = {
      initialized: true,
      loading: false,
      getCardById: vi.fn(),
    }
    return selector ? selector(state) : state
  },
}))

vi.mock('@/components/card-automation-setup', () => ({
  useCardAutomationSetupPrompt: () => ({
    handleSelectionResult: vi.fn(),
    dialog: null,
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

vi.mock('@/hooks/use-mobile', () => ({
  useResponsiveEnvironment: () => ({
    isCompactLayout: false,
    hasTouchCapability: false,
    compactSheetScale: 1,
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
vi.mock('@/components/modals/announcements-modal', () => ({ AnnouncementsModal: () => null }))
vi.mock('@/components/modals/seal-dice-export-modal', () => ({ SealDiceExportModal: () => null }))
vi.mock('@/components/print/print-ready-checker', () => ({ PrintReadyChecker: ({ children }: any) => children }))
vi.mock('@/contexts/print-context', () => ({ PrintProvider: ({ children }: any) => children }))
vi.mock('@/components/ui/pinned-card-window', () => ({ PinnedCardWindow: () => null }))
vi.mock('@/components/notebook', () => ({ FloatingNotebook: () => null }))
vi.mock('@/components/layout/page-display', () => ({ PageDisplay: () => null }))
vi.mock('@/components/print/print-page-renderer', () => ({ PrintPageRenderer: () => null }))
vi.mock('@/components/ui/save-switcher', () => ({ SaveSwitcher: () => null }))
vi.mock('@/components/memory-alert', () => ({ MemoryAlert: () => null }))
vi.mock('@/components/ui/sheet-display-mode-toggle', () => ({ SheetDisplayModeToggle: () => null }))
vi.mock('@/components/ui/fade-notification', () => ({ showFadeNotification: vi.fn() }))
vi.mock('@/lib/memory-monitor', () => ({
  memoryMonitor: {
    start: vi.fn(),
    stop: vi.fn(),
    logAction: vi.fn(),
  },
}))

describe('home autosave image storage', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const dataUrl = String(input)
      const [metadata, base64] = dataUrl.split(',')
      const mimeType = metadata.match(/^data:([^;]+)/)?.[1] ?? ''

      return {
        blob: async () => new NodeBlob([Buffer.from(base64, 'base64')], { type: mimeType }),
      } as unknown as Response
    })
    localStorage.clear()
    await clearAllCharacterImages()
  })

  it('does not autosave embedded data URLs directly into character localStorage', async () => {
    render(<HomeClientApp />)

    await waitFor(() => {
      const characterKeys: string[] = []
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index)
        if (key?.startsWith(CHARACTER_DATA_PREFIX) && key !== 'dh_character_list') {
          characterKeys.push(key)
        }
      }
      expect(characterKeys.length).toBeGreaterThan(0)
    })

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key?.startsWith(CHARACTER_DATA_PREFIX) && key !== 'dh_character_list') {
        expect(localStorage.getItem(key) || '').not.toContain('data:image/')
      }
    }
  })
})
