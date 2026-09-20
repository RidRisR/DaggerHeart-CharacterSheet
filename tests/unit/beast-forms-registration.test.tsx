import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import '@/components/home-client-app'
import { getTabPages, getVisiblePages, getPageDefinition } from '@/lib/page-registry'
import { defaultSheetData } from '@/lib/default-sheet-data'
import { DEFAULT_PAGE_VISIBILITY } from '@/character/page-visibility'
import { loadBuiltinCardRuntimeSource } from '@/card/runtime/builtin-source-adapter'
import { useCardStore } from '@/card/stores/unified-card-store'
import { useSheetStore } from '@/lib/sheet-store'
import { useTextModeStore } from '@/lib/text-mode-store'
import { PrintPageRenderer } from '@/components/print/print-page-renderer'

describe('beast form page registration', () => {
  it('renders the real multi-page group before adventure notes and both card decks using in-memory data', async () => {
    const source = await loadBuiltinCardRuntimeSource({ disabledSourceIds: [] })
    useCardStore.setState({ initialized: true, loading: false, error: null,
      cards: new Map(source.cards.map(card => [card.id, card])), batches: new Map([[source.sourceId, source.batch]]) })
    const card = { standarized: true, id: 'print-check', name: 'Print check', type: 'domain', class: '', cardSelectDisplay: {} }
    const sheet = { ...structuredClone(defaultSheetData), pageVisibility: {
      rangerCompanion: true, armorTemplate: true, adventureNotes: true, beastForms: true,
    }, cards: [card, card], inventory_cards: [card] }
    useSheetStore.setState({ sheetData: sheet })
    useTextModeStore.setState({ isTextMode: true })
    const { container } = render(<PrintPageRenderer sheetData={sheet} />)
    const groups = Array.from(container.firstElementChild!.children)
    expect(groups.map(group => group.classList[0])).toEqual([
      'page-one', 'page-two', 'page-three', 'page-iknis', 'page-beast-forms', 'page-adventure-notes', 'page-four', 'page-five',
    ])
    expect(groups[4].querySelectorAll('.beast-form-sheet')).toHaveLength(4)
    expect(groups[4].querySelectorAll('article')).toHaveLength(24)
    expect(groups[6]).toHaveTextContent('Print check')
    expect(groups[7]).toHaveTextContent('Print check')
    expect(groups[7]).toHaveClass('last-printed-page')
  })

  it('is an optional single tab and prints before adventure notes and both card groups', () => {
    const sheet = { ...defaultSheetData, pageVisibility: {
      rangerCompanion: true, armorTemplate: true, adventureNotes: true, beastForms: true,
    } }
    const card = { standarized: true, id: 'card', name: 'Card', type: 'domain', class: '', cardSelectDisplay: {} }
    sheet.cards = [card, card]
    sheet.inventory_cards = [card]
    expect(getVisiblePages(sheet).map(page => page.id)).toEqual([
      'page1', 'page2', 'page3', 'page4', 'beast-forms', 'adventure-notes', 'focused-cards', 'inventory-cards',
    ])
    expect(getTabPages(sheet).filter(page => page.id === 'beast-forms')).toHaveLength(1)
    expect(getPageDefinition('beast-forms')?.printComponent).toBeDefined()
    expect(getVisiblePages({ ...sheet, pageVisibility: { ...DEFAULT_PAGE_VISIBILITY } }).map(page => page.id)).not.toContain('beast-forms')
  })
})
