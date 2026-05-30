import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CURRENT_SCHEMA_VERSION } from '@/lib/sheet-schema-version'
import { defaultSheetData } from '@/lib/default-sheet-data'
import { useSheetStore } from '@/lib/sheet-store'
import type { SheetData } from '@/lib/sheet-data'
import { useCharacterManagement } from '@/hooks/use-character-management'
import {
  ACTIVE_CHARACTER_ID_KEY,
  CHARACTER_DATA_PREFIX,
  CHARACTER_LIST_KEY,
  MAX_CHARACTERS,
} from '@/lib/multi-character-storage'

function currentSheet(overrides: Partial<SheetData> = {}): SheetData {
  const sheet = {
    ...structuredClone(defaultSheetData),
    ...overrides,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    name: overrides.name ?? 'Imported Kaka',
    pageVisibility: overrides.pageVisibility ?? {
      rangerCompanion: true,
      armorTemplate: false,
      adventureNotes: false,
    },
    inventory_cards: overrides.inventory_cards ?? structuredClone(defaultSheetData.inventory_cards),
  }
  delete (sheet as any).includePageThreeInExport
  return sheet
}

async function renderManagementHook() {
  const setCurrentTabValue = vi.fn()
  const rendered = renderHook(() =>
    useCharacterManagement({ isClient: true, setCurrentTabValue }),
  )

  await waitFor(() => {
    expect(rendered.result.current.isLoading).toBe(false)
  })

  return { ...rendered, setCurrentTabValue }
}

describe('imported save creation', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    useSheetStore.setState({ sheetData: { ...defaultSheetData } })
  })

  it('creates a save from current-schema imported data and activates it without restoring deprecated fields', async () => {
    const { result, setCurrentTabValue } = await renderManagementHook()
    const imported = currentSheet({
      name: 'Imported Hero',
      notebook: {
        pages: [{ id: 'imported-page', lines: [] }],
        currentPageIndex: 0,
        isOpen: true,
      },
    })

    act(() => {
      useSheetStore.getState().replaceSheetData({
        ...defaultSheetData,
        name: 'Previous Hero',
        notebook: {
          pages: [{ id: 'previous-page', lines: [] }],
          currentPageIndex: 0,
          isOpen: false,
        },
      })
    })

    let success = false
    act(() => {
      success = result.current.createImportedCharacterHandler('Imported Save', imported)
    })

    expect(success).toBe(true)

    const list = JSON.parse(localStorage.getItem(CHARACTER_LIST_KEY) || '{}')
    expect(list.characters).toHaveLength(2)
    const importedMetadata = list.characters.find((character: any) => character.saveName === 'Imported Save')
    expect(importedMetadata?.id).toBeTruthy()
    expect(list.activeCharacterId).toBe(importedMetadata.id)
    expect(localStorage.getItem(ACTIVE_CHARACTER_ID_KEY)).toBe(importedMetadata.id)

    const stored = JSON.parse(localStorage.getItem(`${CHARACTER_DATA_PREFIX}${importedMetadata.id}`) || '{}')
    expect(stored.name).toBe('Imported Hero')
    expect(stored.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(stored.inventory_cards).toHaveLength(20)
    expect(stored.pageVisibility).toEqual({
      rangerCompanion: true,
      armorTemplate: false,
      adventureNotes: false,
    })
    expect('includePageThreeInExport' in stored).toBe(false)

    const activeSheet = useSheetStore.getState().sheetData
    expect(activeSheet.name).toBe('Imported Hero')
    expect(activeSheet.notebook?.pages[0]?.id).toBe('imported-page')
    expect('includePageThreeInExport' in (activeSheet as any)).toBe(false)
    expect(setCurrentTabValue).not.toHaveBeenCalled()
  })

  it.each([
    ['legacy schema version', (sheet: any) => { sheet.schemaVersion = 1 }],
    ['legacy hope shape', (sheet: any) => { sheet.hope = [true, false] }],
    ['missing inventory_cards', (sheet: any) => { delete sheet.inventory_cards }],
    ['missing pageVisibility', (sheet: any) => { delete sheet.pageVisibility }],
    ['empty pageVisibility', (sheet: any) => { sheet.pageVisibility = {} }],
    ['missing equipment', (sheet: any) => { delete sheet.equipment }],
    ['missing armorTemplate', (sheet: any) => { delete sheet.armorTemplate }],
    ['missing adventureNotes', (sheet: any) => { delete sheet.adventureNotes }],
    ['missing notebook', (sheet: any) => { delete sheet.notebook }],
    ['deprecated includePageThreeInExport', (sheet: any) => { sheet.includePageThreeInExport = true }],
  ])('throws before creating metadata when imported data has %s', async (_label, mutate) => {
    const { result } = await renderManagementHook()
    const beforeList = JSON.parse(localStorage.getItem(CHARACTER_LIST_KEY) || '{}')
    const invalidData = currentSheet() as any
    mutate(invalidData)

    expect(() => {
      act(() => {
        result.current.createImportedCharacterHandler('Bad Import', invalidData)
      })
    }).toThrow(/current-schema/i)

    const afterList = JSON.parse(localStorage.getItem(CHARACTER_LIST_KEY) || '{}')
    expect(afterList.characters).toHaveLength(beforeList.characters.length)
    expect(afterList.characters.some((character: any) => character.saveName === 'Bad Import')).toBe(false)
  })

  it('returns false at the save limit and does not create an imported save', async () => {
    const { result } = await renderManagementHook()

    for (let index = 1; index < MAX_CHARACTERS; index += 1) {
      act(() => {
        result.current.createNewCharacterHandler(`Existing ${index}`)
      })
    }

    const beforeList = JSON.parse(localStorage.getItem(CHARACTER_LIST_KEY) || '{}')
    expect(beforeList.characters).toHaveLength(MAX_CHARACTERS)

    let success = true
    act(() => {
      success = result.current.createImportedCharacterHandler('Overflow Import', currentSheet())
    })

    expect(success).toBe(false)
    const afterList = JSON.parse(localStorage.getItem(CHARACTER_LIST_KEY) || '{}')
    expect(afterList.characters).toHaveLength(MAX_CHARACTERS)
    expect(afterList.characters.some((character: any) => character.saveName === 'Overflow Import')).toBe(false)
  })

  it('cleans up newly-created metadata if saving imported data fails', async () => {
    const { result } = await renderManagementHook()
    const previousCharacterId = result.current.currentCharacterId
    const originalSetItem = Storage.prototype.setItem
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key.startsWith(CHARACTER_DATA_PREFIX) && value.includes('Save Failure Hero')) {
        throw new Error('forced save failure')
      }
      return originalSetItem.call(this, key, value)
    })

    try {
      let success = true
      act(() => {
        success = result.current.createImportedCharacterHandler(
          'Broken Import',
          currentSheet({ name: 'Save Failure Hero' }),
        )
      })

      expect(success).toBe(false)
      const list = JSON.parse(localStorage.getItem(CHARACTER_LIST_KEY) || '{}')
      expect(list.characters.some((character: any) => character.saveName === 'Broken Import')).toBe(false)
      expect(list.activeCharacterId).toBe(previousCharacterId)
      expect(localStorage.getItem(ACTIVE_CHARACTER_ID_KEY)).toBe(previousCharacterId)
      expect(result.current.currentCharacterId).toBe(previousCharacterId)
      expect(result.current.characterList.some(character => character.saveName === 'Broken Import')).toBe(false)
      const storedValues: string[] = []
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index)
        if (key) storedValues.push(localStorage.getItem(key) || '')
      }
      expect(storedValues.some(value => value.includes('Save Failure Hero'))).toBe(false)
    } finally {
      setItemSpy.mockRestore()
    }
  })

  it('rolls back metadata and active state if activation fails after saving imported data', async () => {
    const { result } = await renderManagementHook()
    const previousCharacterId = result.current.currentCharacterId
    const originalSetItem = Storage.prototype.setItem
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === ACTIVE_CHARACTER_ID_KEY && value !== previousCharacterId) {
        throw new Error('forced active-id failure')
      }
      return originalSetItem.call(this, key, value)
    })

    try {
      let success = true
      act(() => {
        success = result.current.createImportedCharacterHandler(
          'Activation Failure Import',
          currentSheet({ name: 'Activation Failure Hero' }),
        )
      })

      expect(success).toBe(false)
      const list = JSON.parse(localStorage.getItem(CHARACTER_LIST_KEY) || '{}')
      expect(list.characters.some((character: any) => character.saveName === 'Activation Failure Import')).toBe(false)
      expect(list.activeCharacterId).toBe(previousCharacterId)
      expect(localStorage.getItem(ACTIVE_CHARACTER_ID_KEY)).toBe(previousCharacterId)
      expect(result.current.currentCharacterId).toBe(previousCharacterId)
      expect(result.current.characterList.some(character => character.saveName === 'Activation Failure Import')).toBe(false)
    } finally {
      setItemSpy.mockRestore()
    }
  })
})
