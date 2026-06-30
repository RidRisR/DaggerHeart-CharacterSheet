import 'fake-indexeddb/auto'
import { waitFor } from '@testing-library/react'
import { Blob as NodeBlob } from 'node:buffer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ACTIVE_CHARACTER_ID_KEY,
  CHARACTER_DATA_PREFIX,
} from '@/lib/multi-character-storage'
import { defaultSheetData } from '@/lib/default-sheet-data'
import type { SheetData } from '@/lib/sheet-data'
import {
  applyCharacterImageAssetAction,
  setCharacterImageAsset,
} from '@/character/storage/character-image-actions'
import {
  loadCharacterSheet,
  saveCharacterSheet,
} from '@/character/storage/character-save-storage'
import {
  characterImageKey,
  clearAllCharacterImages,
  getCharacterImage,
} from '@/character/storage/character-image-repository'
import * as characterImageRepository from '@/character/storage/character-image-repository'

const firstPng = 'data:image/png;base64,Zmlyc3Q='
const secondPng = 'data:image/png;base64,c2Vjb25k'

function sheet(overrides: Partial<SheetData> = {}): SheetData {
  return {
    ...structuredClone(defaultSheetData),
    ...overrides,
    pageVisibility: overrides.pageVisibility ?? {
      rangerCompanion: true,
      armorTemplate: false,
      adventureNotes: false,
    },
    inventory_cards: overrides.inventory_cards ?? structuredClone(defaultSheetData.inventory_cards),
  }
}

function responseForDataUrl(dataUrl: string): Response {
  const [metadata, base64] = dataUrl.split(',')
  const mimeType = metadata.match(/^data:([^;]+)/)?.[1] ?? ''

  return {
    blob: async () => new NodeBlob([Buffer.from(base64, 'base64')], { type: mimeType }),
  } as unknown as Response
}

function createControlledFetch() {
  const resolvers: Array<(response: Response) => void> = []
  const fetchMock = vi.fn((input: RequestInfo | URL) =>
    new Promise<Response>((resolve) => {
      resolvers.push(() => resolve(responseForDataUrl(String(input))))
    }),
  )

  return {
    fetchMock,
    resolveNext: () => {
      const resolve = resolvers.shift()
      if (!resolve) throw new Error('No pending fetch')
      resolve({} as Response)
    },
  }
}

describe('character image actions', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => responseForDataUrl(String(input)))
    localStorage.clear()
    await clearAllCharacterImages()
  })

  it('does not apply a completed image action after the active character changes', async () => {
    const controlledFetch = createControlledFetch()
    vi.stubGlobal('fetch', controlledFetch.fetchMock)
    localStorage.setItem(ACTIVE_CHARACTER_ID_KEY, 'character-a')
    const replaceSheetData = vi.fn()

    const action = applyCharacterImageAssetAction({
      characterId: 'character-a',
      role: 'portrait',
      imageDataUrl: firstPng,
      sheetData: sheet({ name: 'Old Active' }),
      getCurrentCharacterId: () => localStorage.getItem(ACTIVE_CHARACTER_ID_KEY),
      replaceSheetData,
    })

    await waitFor(() => expect(controlledFetch.fetchMock).toHaveBeenCalledTimes(1))
    localStorage.setItem(ACTIVE_CHARACTER_ID_KEY, 'character-b')
    controlledFetch.resolveNext()

    await expect(action).resolves.toBe(false)
    expect(replaceSheetData).not.toHaveBeenCalled()
  })

  it('only applies the latest portrait action for the same character and role', async () => {
    const controlledFetch = createControlledFetch()
    vi.stubGlobal('fetch', controlledFetch.fetchMock)
    localStorage.setItem(ACTIVE_CHARACTER_ID_KEY, 'character-a')
    const replaceSheetData = vi.fn()

    const firstAction = applyCharacterImageAssetAction({
      characterId: 'character-a',
      role: 'portrait',
      imageDataUrl: firstPng,
      sheetData: sheet({ name: 'First Source' }),
      getCurrentCharacterId: () => localStorage.getItem(ACTIVE_CHARACTER_ID_KEY),
      replaceSheetData,
    })
    await waitFor(() => expect(controlledFetch.fetchMock).toHaveBeenCalledTimes(1))
    const secondAction = applyCharacterImageAssetAction({
      characterId: 'character-a',
      role: 'portrait',
      imageDataUrl: secondPng,
      sheetData: sheet({ name: 'Second Source' }),
      getCurrentCharacterId: () => localStorage.getItem(ACTIVE_CHARACTER_ID_KEY),
      replaceSheetData,
    })

    controlledFetch.resolveNext()
    await expect(firstAction).resolves.toBe(false)
    await waitFor(() => expect(controlledFetch.fetchMock).toHaveBeenCalledTimes(2))
    controlledFetch.resolveNext()
    await expect(secondAction).resolves.toBe(true)

    expect(replaceSheetData).toHaveBeenCalledTimes(1)
    expect(replaceSheetData).toHaveBeenCalledWith(expect.objectContaining({
      characterImage: secondPng,
      name: 'Second Source',
    }))
    const storedImage = await getCharacterImage(characterImageKey('character-a', 'portrait'))
    await expect(storedImage?.blob.text()).resolves.toBe('second')
  })

  it('restores the previous image blob when the stored sheet update fails', async () => {
    const runtimeSheet = await saveCharacterSheet('character-a', sheet({
      name: 'Rollback Source',
      characterImage: firstPng,
    }))
    const originalImage = await getCharacterImage(characterImageKey('character-a', 'portrait'))
    await expect(originalImage?.blob.text()).resolves.toBe('first')
    const originalSetItem = localStorage.setItem.bind(localStorage)
    const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation((storageKey: string, value: string) => {
      if (storageKey === `${CHARACTER_DATA_PREFIX}character-a`) {
        throw new Error('localStorage is full')
      }
      originalSetItem(storageKey, value)
    })

    await expect(setCharacterImageAsset(
      'character-a',
      'portrait',
      secondPng,
      runtimeSheet,
    )).rejects.toThrow('localStorage is full')

    expect(setItemSpy).toHaveBeenCalled()
    const restoredImage = await getCharacterImage(characterImageKey('character-a', 'portrait'))
    await expect(restoredImage?.blob.text()).resolves.toBe('first')
  })

  it('merges completed image actions into the latest runtime sheet before replacing state', async () => {
    const replaceSheetData = vi.fn()
    localStorage.setItem(ACTIVE_CHARACTER_ID_KEY, 'character-a')
    const initialSheet = sheet({ name: 'Before Edit' })
    const latestSheet = sheet({ name: 'Edited While Uploading' })

    await expect(applyCharacterImageAssetAction({
      characterId: 'character-a',
      role: 'portrait',
      imageDataUrl: firstPng,
      sheetData: initialSheet,
      getCurrentCharacterId: () => localStorage.getItem(ACTIVE_CHARACTER_ID_KEY),
      getCurrentSheetData: () => latestSheet,
      replaceSheetData,
    })).resolves.toBe(true)

    expect(replaceSheetData).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Edited While Uploading',
      characterImage: firstPng,
      imageAssets: expect.objectContaining({
        characterImage: {
          key: characterImageKey('character-a', 'portrait'),
          mimeType: 'image/png',
        },
      }),
    }))
  })

  it('persists a stale-active delete before deleting the referenced image blob', async () => {
    const replaceSheetData = vi.fn()
    const runtimeSheet = await saveCharacterSheet('character-a', sheet({
      name: 'Delete Source',
      characterImage: firstPng,
    }))
    const loadedSheet = await loadCharacterSheet('character-a')
    expect(loadedSheet?.imageAssets?.characterImage?.key).toBe(characterImageKey('character-a', 'portrait'))
    localStorage.setItem(ACTIVE_CHARACTER_ID_KEY, 'character-a')

    const action = applyCharacterImageAssetAction({
      characterId: 'character-a',
      role: 'portrait',
      imageDataUrl: '',
      sheetData: loadedSheet ?? runtimeSheet,
      getCurrentCharacterId: () => localStorage.getItem(ACTIVE_CHARACTER_ID_KEY),
      replaceSheetData,
    })
    localStorage.setItem(ACTIVE_CHARACTER_ID_KEY, 'character-b')

    await expect(action).resolves.toBe(false)
    expect(replaceSheetData).not.toHaveBeenCalled()
    const raw = localStorage.getItem(`${CHARACTER_DATA_PREFIX}character-a`)
    expect(raw).not.toBeNull()
    const storedSheet = JSON.parse(raw || '{}')
    expect(storedSheet.imageAssets?.characterImage).toBeUndefined()
    await expect(loadCharacterSheet('character-a')).resolves.toEqual(expect.objectContaining({
      characterImage: '',
    }))
  })

  it('applies an active delete when blob cleanup fails after ref-free persistence', async () => {
    const deleteError = new Error('Forced blob cleanup failure')
    vi.spyOn(characterImageRepository, 'deleteCharacterImage').mockRejectedValueOnce(deleteError)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const replaceSheetData = vi.fn()
    const runtimeSheet = await saveCharacterSheet('character-a', sheet({
      name: 'Delete Cleanup Source',
      characterImage: firstPng,
    }))
    const loadedSheet = await loadCharacterSheet('character-a')
    localStorage.setItem(ACTIVE_CHARACTER_ID_KEY, 'character-a')

    await expect(applyCharacterImageAssetAction({
      characterId: 'character-a',
      role: 'portrait',
      imageDataUrl: '',
      sheetData: loadedSheet ?? runtimeSheet,
      getCurrentCharacterId: () => localStorage.getItem(ACTIVE_CHARACTER_ID_KEY),
      replaceSheetData,
    })).resolves.toBe(true)

    expect(replaceSheetData).toHaveBeenCalledTimes(1)
    expect(replaceSheetData).toHaveBeenCalledWith(expect.objectContaining({
      characterImage: '',
    }))
    const raw = localStorage.getItem(`${CHARACTER_DATA_PREFIX}character-a`)
    expect(raw).not.toBeNull()
    const storedSheet = JSON.parse(raw || '{}')
    expect(storedSheet.imageAssets?.characterImage).toBeUndefined()
    expect(console.error).toHaveBeenCalledWith(
      'Failed to delete character image blob after removing stored sheet reference',
      expect.objectContaining({
        characterId: 'character-a',
        role: 'portrait',
        error: deleteError,
      }),
    )
  })
})
