import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import '@/components/home-client-app'
import CharacterSheetPageMartialStances from '@/components/character-sheet-page-martial-stances'
import { PrintPageRenderer } from '@/components/print/print-page-renderer'
import { PageVisibilityDropdown } from '@/components/ui/page-visibility-dropdown'
import { getTabPages, getVisiblePages } from '@/lib/page-registry'
import { defaultSheetData } from '@/lib/default-sheet-data'
import { createEmptyCard } from '@/card/card-types'
import { useSheetStore } from '@/lib/sheet-store'
import { resetSheetStore, sheet, store } from './automation/test-helpers'

describe('martial stance page', () => {
  beforeEach(() => resetSheetStore())

  it('shows all sixteen stances and connects learning, Focus, activation, switching and dropping to character data', () => {
    render(<CharacterSheetPageMartialStances />)
    expect(screen.getAllByRole('article')).toHaveLength(16)
    fireEvent.click(screen.getByRole('checkbox', { name: '掌握应手' }))
    fireEvent.keyDown(screen.getByRole('checkbox', { name: '掌握迅捷' }), { key: ' ' })
    expect(sheet().martialStances.known).toEqual(['favored', 'quick'])
    expect(screen.getByRole('button', { name: '激活应手，花费1专注点' })).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: '专注第6点' }))
    fireEvent.click(screen.getByRole('button', { name: '激活应手，花费1专注点' }))
    expect(sheet().martialStances).toMatchObject({ active: 'favored', focus: 5 })
    fireEvent.click(screen.getByRole('button', { name: '激活迅捷，花费1专注点' }))
    expect(sheet().martialStances).toMatchObject({ active: 'quick', focus: 4 })
    expect(screen.getAllByText('当前激活')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: '退出架势' }))
    expect(sheet().martialStances).toMatchObject({ active: null, focus: 4 })
    expect(screen.getByText('无激活架势')).toBeInTheDocument()
  })

  it('drops a stance when HP is marked through the main-sheet store action', () => {
    resetSheetStore({ hpMax: 6, martialStances: { known: ['favored'], active: 'favored', focus: 2 } })
    store().setSheetData({ hp: Array(12).fill(false).map((_, i) => i < 6) })
    expect(sheet().martialStances.active).toBe(null)
    expect(sheet().martialStances.known).toEqual(['favored'])
    expect(sheet().martialStances.focus).toBe(2)
  })

  it('uses Battle Flow to change stance at zero Focus and marks exactly one available Stress slot', () => {
    const mastery = { ...createEmptyCard(), type: 'subclass', id: '希望与恐惧扩展-AlchemiZ-subc-武艺达人大师' }
    resetSheetStore({
      cards: [mastery], stressMax: 2, stress: [true, false],
      martialStances: { known: ['favored', 'quick'], active: 'favored', focus: 0 },
    })
    render(<CharacterSheetPageMartialStances />)
    expect(screen.getByRole('button', { name: '激活迅捷，花费1专注点' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '激活迅捷，标记1压力点' }))
    expect(sheet().martialStances).toMatchObject({ active: 'quick', focus: 0 })
    expect(sheet().stress).toEqual([true, true])
    expect(screen.getByRole('button', { name: '激活应手，标记1压力点' })).toBeDisabled()
    expect(store().updateMartialStances({ type: 'activate', id: 'favored', payment: 'stress' }).ok).toBe(false)
    expect(sheet().martialStances.active).toBe('quick')
  })

  it('requires the mastery card in the loadout to pay with Stress', () => {
    resetSheetStore({ stressMax: 6, martialStances: { known: ['favored'], active: null, focus: 6 } })
    const before = sheet()
    expect(store().updateMartialStances({ type: 'activate', id: 'favored', payment: 'stress' }).ok).toBe(false)
    expect(sheet()).toBe(before)
  })

  it('is off by default and can be enabled without removing other optional pages or its records', () => {
    expect(getTabPages(sheet()).some(page => page.id === 'martial-stances')).toBe(false)
    render(<PageVisibilityDropdown />)
    fireEvent.pointerDown(screen.getByRole('button', { name: '页面管理' }))
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /武术架势/ }))
    expect(sheet().pageVisibility?.martialStances).toBe(true)
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /野兽形态/ }))
    expect(sheet().pageVisibility?.martialStances).toBe(true)
    expect(sheet().pageVisibility?.beastForms).toBe(true)
    expect(getTabPages(sheet()).some(page => page.id === 'martial-stances')).toBe(true)
  })

  it.each(['quick', null] as const)('leaves a write-in line on the printed sheet when the active stance is %s', (active) => {
    resetSheetStore({ name: '架势测试', pageVisibility: { ...defaultSheetData.pageVisibility!, martialStances: true, adventureNotes: true }, martialStances: { known: ['favored', 'quick'], active, focus: 3 } })
    const visible = getVisiblePages(sheet()).map(page => page.id)
    expect(visible.indexOf('martial-stances')).toBeLessThan(visible.indexOf('adventure-notes'))
    const { container } = render(<PrintPageRenderer sheetData={sheet()} />)
    const printed = container.querySelector('.page-martial-stances')!
    expect(printed.querySelectorAll('.martial-stance-sheet')).toHaveLength(1)
    expect(within(printed as HTMLElement).getAllByRole('article')).toHaveLength(16)
    const writeIn = printed.querySelector('.martial-stance-write-in')
    expect(writeIn).toBeVisible()
    expect(writeIn).toBeEmptyDOMElement()
    expect(printed.querySelector('.martial-stance-current > strong')).not.toBeVisible()
    expect(within(printed as HTMLElement).getByText(/^已掌握 \d+ \/ /)).not.toBeVisible()
    if (active) expect(within(printed as HTMLElement).getByText('当前激活')).not.toBeVisible()
    expect(sheet().martialStances.active).toBe(active)
    expect(within(printed as HTMLElement).getByText('3 / 6')).toBeInTheDocument()
    expect(within(printed as HTMLElement).getAllByRole('checkbox', { checked: true })).toHaveLength(5)
  })

  it('keeps independent stance records when replacing the active character', () => {
    const first = { ...structuredClone(defaultSheetData), name: 'First', martialStances: { known: ['favored' as const], active: 'favored' as const, focus: 2 } }
    const second = { ...structuredClone(defaultSheetData), name: 'Second' }
    store().replaceSheetData(first)
    expect(sheet().martialStances).toEqual(first.martialStances)
    store().replaceSheetData(second)
    expect(sheet().martialStances).toEqual({ known: [], active: null, focus: 0 })
    store().replaceSheetData(first)
    expect(sheet().martialStances).toEqual(first.martialStances)
  })
})
