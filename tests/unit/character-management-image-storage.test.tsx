import 'fake-indexeddb/auto'
import { act, renderHook, waitFor } from '@testing-library/react'
import { Blob as NodeBlob } from 'node:buffer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultSheetData } from '@/lib/default-sheet-data'
import type { SheetData } from '@/lib/sheet-data'
import { CURRENT_SCHEMA_VERSION } from '@/lib/sheet-schema-version'
import { useSheetStore } from '@/lib/sheet-store'
import { useCharacterManagement } from '@/hooks/use-character-management'
import {
  ACTIVE_CHARACTER_ID_KEY,
  addCharacterToMetadataList,
  CHARACTER_DATA_PREFIX,
  CHARACTER_LIST_KEY,
  createNewCharacter,
  saveCharacterById,
  setActiveCharacterId,
} from '@/lib/multi-character-storage'
import {
  clearAllCharacterImages,
  listCharacterImages,
  saveCharacterImage,
} from '@/character/storage/character-image-repository'
import { saveCharacterSheet } from '@/character/storage/character-save-storage'
import {
  CHARACTER_IMAGE_ASSET_MIGRATION_KEY,
  CHARACTER_IMAGE_ASSET_MIGRATION_VERSION,
} from '@/character/storage/character-image-migration'

const png = 'data:image/png;base64,aGVsbG8='

function storedCharacterList() {
  return JSON.parse(localStorage.getItem(CHARACTER_LIST_KEY) || '{}')
}

function currentSheet(overrides: Partial<SheetData> = {}): SheetData {
  const sheet = {
    ...structuredClone(defaultSheetData),
    ...overrides,
    schemaVersion: CURRENT_SCHEMA_VERSION,
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
  const rendered = renderHook(() =>
    useCharacterManagement({ isClient: true, setCurrentTabValue: vi.fn() }),
  )

  await waitFor(() => expect(rendered.result.current.isLoading).toBe(false))
  return rendered
}

describe('character management image storage', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const dataUrl = String(input)
      const [metadata, base64] = dataUrl.split(',')
      const mimeType = metadata.match(/^data:([^;]+)/)?.[1] ?? ''

      return {
        blob: async () => new NodeBlob([Buffer.from(base64, 'base64')], { type: mimeType }),
      } as Response
    })
    localStorage.clear()
    await clearAllCharacterImages()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    useSheetStore.setState({ sheetData: { ...defaultSheetData } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('imports base64 images into image assets and stores no embedded image payload', async () => {
    const { result } = await renderManagementHook()

    let success = false
    await act(async () => {
      success = await result.current.createImportedCharacterHandler('Image Import', currentSheet({
        name: 'Image Import Hero',
        characterImage: png,
        imageAssets: {
          characterImage: { key: 'foreign', mimeType: 'image/png' },
        },
      }))
    })

    expect(success).toBe(true)
    const list = JSON.parse(localStorage.getItem(CHARACTER_LIST_KEY) || '{}')
    const imported = list.characters.find((character: any) => character.saveName === 'Image Import')
    const raw = localStorage.getItem(`${CHARACTER_DATA_PREFIX}${imported.id}`) || ''
    expect(raw).not.toContain('data:image/')
    expect(raw).not.toContain('foreign')
    expect(await listCharacterImages(imported.id)).toHaveLength(1)
    expect(useSheetStore.getState().sheetData.characterImage).toMatch(/^data:image\/png;base64,/)
  })

  it('runs startup image migration before loading the active character', async () => {
    localStorage.clear()
    await clearAllCharacterImages()

    const metadata = addCharacterToMetadataList('Legacy Image Save')
    expect(metadata).not.toBeNull()
    localStorage.setItem(`${CHARACTER_DATA_PREFIX}${metadata!.id}`, JSON.stringify({
      ...structuredClone(defaultSheetData),
      name: 'Legacy Image Hero',
      characterImage: png,
    }))
    setActiveCharacterId(metadata!.id)

    const rendered = renderHook(() => useCharacterManagement({
      isClient: true,
      setCurrentTabValue: vi.fn(),
    }))

    await waitFor(() => expect(rendered.result.current.isLoading).toBe(false))

    const raw = localStorage.getItem(`${CHARACTER_DATA_PREFIX}${metadata!.id}`) || ''
    expect(raw).not.toContain('data:image/')
    expect(localStorage.getItem(CHARACTER_IMAGE_ASSET_MIGRATION_KEY)).toBe(CHARACTER_IMAGE_ASSET_MIGRATION_VERSION)
    expect(useSheetStore.getState().sheetData.characterImage).toMatch(/^data:image\/png;base64,/)
  })

  it('keeps character management blocked when startup image migration fails', async () => {
    localStorage.clear()
    await clearAllCharacterImages()

    const metadata = addCharacterToMetadataList('Broken Legacy Image Save')
    expect(metadata).not.toBeNull()
    const storageKey = `${CHARACTER_DATA_PREFIX}${metadata!.id}`
    const previousRaw = JSON.stringify({
      ...structuredClone(defaultSheetData),
      name: 'Broken Legacy Image Hero',
      characterImage: png,
    })
    localStorage.setItem(storageKey, previousRaw)

    const storage = localStorage
    vi.stubGlobal('localStorage', {
      get length() {
        return storage.length
      },
      clear: () => storage.clear(),
      getItem: (key: string) => storage.getItem(key),
      key: (index: number) => storage.key(index),
      removeItem: (key: string) => storage.removeItem(key),
      setItem: (key: string, value: string) => {
        if (key === storageKey && value !== previousRaw) {
          throw new Error('forced startup migration failure')
        }
        storage.setItem(key, value)
      },
    })

    const rendered = renderHook(() => useCharacterManagement({
      isClient: true,
      setCurrentTabValue: vi.fn(),
    }))

    await waitFor(() => expect(rendered.result.current.migrationError?.message).toContain('forced startup migration failure'))

    expect(rendered.result.current.isLoading).toBe(false)
    expect(rendered.result.current.characterList).toEqual([])
    expect(localStorage.getItem(CHARACTER_IMAGE_ASSET_MIGRATION_KEY)).toBeNull()
    expect(localStorage.getItem(storageKey)).toBe(previousRaw)
  })

  it('duplicates images as independent target character assets', async () => {
    const { result } = await renderManagementHook()
    await act(async () => {
      await result.current.createImportedCharacterHandler('Source Save', currentSheet({ characterImage: png }))
    })

    const listBefore = JSON.parse(localStorage.getItem(CHARACTER_LIST_KEY) || '{}')
    const source = listBefore.characters.find((character: any) => character.saveName === 'Source Save')

    let success = false
    await act(async () => {
      success = await result.current.duplicateCharacterHandler(source.id, 'Duplicate Save')
    })

    expect(success).toBe(true)
    const listAfter = JSON.parse(localStorage.getItem(CHARACTER_LIST_KEY) || '{}')
    const duplicate = listAfter.characters.find((character: any) => character.saveName === 'Duplicate Save')
    expect(await listCharacterImages(source.id)).toHaveLength(1)
    expect(await listCharacterImages(duplicate.id)).toHaveLength(1)
  })

  it('rolls back duplicate data and images when duplicate activation fails', async () => {
    const source = addCharacterToMetadataList('Source Save')
    expect(source).not.toBeNull()
    await saveCharacterSheet(source!.id, currentSheet({
      name: 'Source Hero',
      characterImage: png,
    }))
    setActiveCharacterId(source!.id)
    const { result } = await renderManagementHook()
    const originalSetItem = localStorage.setItem.bind(localStorage)
    vi.spyOn(localStorage, 'setItem').mockImplementation((key: string, value: string) => {
      if (key === ACTIVE_CHARACTER_ID_KEY && value !== source!.id) {
        throw new Error('forced duplicate activation failure')
      }
      return originalSetItem(key, value)
    })

    let success = true
    await act(async () => {
      success = await result.current.duplicateCharacterHandler(source!.id, 'Broken Duplicate')
    })

    expect(success).toBe(false)
    const duplicate = storedCharacterList().characters.find(
      (character: any) => character.saveName === 'Broken Duplicate',
    )
    expect(duplicate).toBeUndefined()
    expect(result.current.characterList.some(character => character.saveName === 'Broken Duplicate')).toBe(false)
    expect(await listCharacterImages(source!.id)).toHaveLength(1)
    const allImages = await listCharacterImages()
    expect(allImages.filter(record => record.characterId !== source!.id)).toHaveLength(0)
    expect(localStorage.getItem(ACTIVE_CHARACTER_ID_KEY)).toBe(source!.id)
  })

  it('switches characters through hydrated sheet storage', async () => {
    const source = addCharacterToMetadataList('Hydrated Source')
    const other = addCharacterToMetadataList('Other Save')
    expect(source).not.toBeNull()
    expect(other).not.toBeNull()
    await saveCharacterSheet(source!.id, currentSheet({
      name: 'Hydrated Hero',
      characterImage: png,
    }))
    saveCharacterById(other!.id, createNewCharacter('Other Hero'))
    setActiveCharacterId(other!.id)
    const { result } = await renderManagementHook()

    let success = false
    await act(async () => {
      success = await result.current.switchToCharacter(source!.id)
    })

    expect(success).toBe(true)
    expect(useSheetStore.getState().sheetData.name).toBe('Hydrated Hero')
    expect(useSheetStore.getState().sheetData.characterImage).toMatch(/^data:image\/png;base64,/)
  })

  it('deletes character image records when deleting a save', async () => {
    const source = addCharacterToMetadataList('Image Save')
    const other = addCharacterToMetadataList('Other Save')
    expect(source).not.toBeNull()
    expect(other).not.toBeNull()
    await saveCharacterSheet(source!.id, currentSheet({ characterImage: png }))
    saveCharacterById(other!.id, createNewCharacter('Other Hero'))
    setActiveCharacterId(other!.id)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { result } = await renderManagementHook()

    let success = false
    await act(async () => {
      success = await result.current.deleteCharacterHandler(source!.id)
    })

    expect(success).toBe(true)
    expect(await listCharacterImages(source!.id)).toHaveLength(0)
  })

  it('deleting the active save skips a failed remaining candidate and activates another save', async () => {
    const deleted = addCharacterToMetadataList('Deleted Save')
    const broken = addCharacterToMetadataList('Broken Save')
    const fallback = addCharacterToMetadataList('Fallback Save')
    expect(deleted).not.toBeNull()
    expect(broken).not.toBeNull()
    expect(fallback).not.toBeNull()
    saveCharacterById(deleted!.id, createNewCharacter('Deleted Hero'))
    saveCharacterById(broken!.id, currentSheet({
      name: 'Broken Hero',
      imageAssets: {
        characterImage: { key: 'missing-image-key', mimeType: 'image/png' },
      },
    }))
    saveCharacterById(fallback!.id, createNewCharacter('Fallback Hero'))
    setActiveCharacterId(deleted!.id)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { result } = await renderManagementHook()

    let success = false
    await act(async () => {
      success = await result.current.deleteCharacterHandler(deleted!.id)
    })

    expect(success).toBe(true)
    expect(result.current.currentCharacterId).toBe(fallback!.id)
    expect(localStorage.getItem(ACTIVE_CHARACTER_ID_KEY)).toBe(fallback!.id)
    expect(useSheetStore.getState().sheetData.name).toBe('Fallback Hero')
  })

  it('does not leave the deleted save active when no remaining save can be activated', async () => {
    const deleted = addCharacterToMetadataList('Deleted Save')
    const broken = addCharacterToMetadataList('Broken Save')
    expect(deleted).not.toBeNull()
    expect(broken).not.toBeNull()
    saveCharacterById(deleted!.id, createNewCharacter('Deleted Hero'))
    saveCharacterById(broken!.id, currentSheet({
      name: 'Broken Hero',
      imageAssets: {
        characterImage: { key: 'missing-image-key', mimeType: 'image/png' },
      },
    }))
    setActiveCharacterId(deleted!.id)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { result } = await renderManagementHook()

    let success = false
    await act(async () => {
      success = await result.current.deleteCharacterHandler(deleted!.id)
    })

    expect(success).toBe(true)
    expect(result.current.currentCharacterId).toBeNull()
    expect(localStorage.getItem(ACTIVE_CHARACTER_ID_KEY)).toBeNull()
    expect(useSheetStore.getState().sheetData.name).toBe(defaultSheetData.name)
  })

  it('cleans up orphaned character images on startup', async () => {
    const existing = addCharacterToMetadataList('Existing Save')
    expect(existing).not.toBeNull()
    saveCharacterById(existing!.id, createNewCharacter('Existing Hero'))
    setActiveCharacterId(existing!.id)
    await saveCharacterImage({
      characterId: 'orphaned-character',
      role: 'portrait',
      blob: new Blob(['orphaned'], { type: 'image/png' }),
      mimeType: 'image/png',
    })

    await renderManagementHook()

    expect(await listCharacterImages('orphaned-character')).toHaveLength(0)
  })

  it('falls back to another loadable character when startup active load fails', async () => {
    const broken = addCharacterToMetadataList('Broken Active')
    const fallback = addCharacterToMetadataList('Fallback Save')
    expect(broken).not.toBeNull()
    expect(fallback).not.toBeNull()
    saveCharacterById(broken!.id, currentSheet({
      name: 'Broken Active Hero',
      imageAssets: {
        characterImage: { key: 'missing-image-key', mimeType: 'image/png' },
      },
    }))
    saveCharacterById(fallback!.id, createNewCharacter('Fallback Hero'))
    setActiveCharacterId(broken!.id)

    const { result } = await renderManagementHook()

    expect(result.current.currentCharacterId).toBe(fallback!.id)
    expect(localStorage.getItem(ACTIVE_CHARACTER_ID_KEY)).toBe(fallback!.id)
    expect(useSheetStore.getState().sheetData.name).toBe('Fallback Hero')
  })
})
