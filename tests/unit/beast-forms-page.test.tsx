import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { loadBuiltinCardRuntimeSource } from '@/card/runtime/builtin-source-adapter'
import { CARD_BUILTIN_SOURCE_ID } from '@/card/runtime/source-types'
import { useCardStore } from '@/card/stores/unified-card-store'
import CharacterSheetPageBeastForms from '@/components/character-sheet-page-beast-forms'
import { BeastFormsNavigationProvider } from '@/components/beast-forms/beast-forms-navigation'
import { BeastFormsPrintPages } from '@/components/beast-forms/beast-forms-print-pages'
import { SheetPageSlotContext } from '@/components/layout/sheet-page-slot-context'

beforeEach(async () => {
  const source = await loadBuiltinCardRuntimeSource({ disabledSourceIds: [] })
  useCardStore.setState({ initialized: true, loading: false, error: null,
    cards: new Map(source.cards.map(card => [card.id, card])), batches: new Map([[source.sourceId, source.batch]]) })
})

function Reader({ character = 'one', preview = false, show = true }: { character?: string; preview?: boolean; show?: boolean }) {
  return <BeastFormsNavigationProvider key={character}>
    {preview ? <BeastFormsPrintPages /> : show ? <CharacterSheetPageBeastForms /> : <p>另一个标签</p>}
  </BeastFormsNavigationProvider>
}

describe('beast form page', () => {
  it('paginates a single reading sheet and preserves page across tab and preview changes', () => {
    const { container, rerender } = render(<Reader />)
    const reader = () => within(container.querySelector('.beast-forms-reader') as HTMLElement)
    expect(reader().getAllByRole('article')).toHaveLength(6)
    expect(reader().getByRole('button', { name: '‹ 上一页' })).toBeDisabled()
    fireEvent.click(reader().getByRole('button', { name: '位阶 2' }))
    expect(reader().getByRole('heading', { name: '甲壳哨兵' })).toBeInTheDocument()
    expect(reader().getAllByText('「中毒」')).toHaveLength(2)
    expect(reader().getByText('硬化甲壳：')).toHaveClass('text-amber-800')
    expect(reader().getByRole('button', { name: '位阶 2' })).toHaveAttribute('aria-current', 'page')
    const globalKeyHandler = vi.fn()
    document.addEventListener('keydown', globalKeyHandler)
    fireEvent.keyDown(reader().getByRole('button', { name: '位阶 2' }), { key: 'ArrowRight' })
    expect(globalKeyHandler).not.toHaveBeenCalled()
    document.removeEventListener('keydown', globalKeyHandler)
    fireEvent.click(reader().getByRole('button', { name: '下一页 ›' }))
    rerender(<Reader show={false} />)
    rerender(<Reader />)
    expect(reader().getByRole('region', { name: '野兽形态第 3 页，共 4 页' })).toBeInTheDocument()
    rerender(<Reader preview />)
    expect(screen.getAllByRole('article')).toHaveLength(24)
    expect(screen.queryByRole('navigation', { name: '野兽形态内部分页' })).not.toBeInTheDocument()
    rerender(<Reader />)
    expect(reader().getByRole('region', { name: '野兽形态第 3 页，共 4 页' })).toBeInTheDocument()
    fireEvent.click(reader().getByRole('button', { name: '位阶 4' }))
    expect(reader().getByRole('button', { name: '下一页 ›' })).toBeDisabled()
    rerender(<Reader character="two" />)
    expect(reader().getByRole('region', { name: '野兽形态第 1 页，共 4 页' })).toBeInTheDocument()
  })

  it('keeps the two reading slots independent and renders all pages for direct printing', () => {
    const { container } = render(<BeastFormsNavigationProvider>
      <SheetPageSlotContext.Provider value="left"><CharacterSheetPageBeastForms /></SheetPageSlotContext.Provider>
      <SheetPageSlotContext.Provider value="right"><CharacterSheetPageBeastForms /></SheetPageSlotContext.Provider>
    </BeastFormsNavigationProvider>)
    const readers = container.querySelectorAll('.beast-forms-reader')
    fireEvent.click(within(readers[0] as HTMLElement).getByRole('button', { name: '位阶 4' }))
    expect(within(readers[1] as HTMLElement).getByRole('region', { name: '野兽形态第 1 页，共 4 页' })).toBeInTheDocument()
    expect(container.querySelector('.beast-forms-direct-print')?.querySelectorAll('article')).toHaveLength(24)
  })

  it('distinguishes disabled content, loading and broken content and updates when the source changes', () => {
    const { container } = render(<Reader />)
    act(() => { const state = useCardStore.getState(); useCardStore.setState({ batches: new Map([[CARD_BUILTIN_SOURCE_ID, { ...state.batches.get(CARD_BUILTIN_SOURCE_ID)!, disabled: true }]]) }) })
    expect(screen.getByRole('status')).toHaveTextContent('内置卡牌包已停用')
    expect(container.querySelectorAll('article')).toHaveLength(0)
    act(() => { useCardStore.setState({ initialized: false }) })
    expect(screen.getByRole('status')).toHaveTextContent('正在加载')
    act(() => { useCardStore.setState({ initialized: true, batches: new Map() }) })
    expect(screen.getByRole('alert')).toHaveTextContent('读取失败')
  })
})
