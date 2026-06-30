import 'fake-indexeddb/auto'
import { Blob as NodeBlob } from 'node:buffer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultSheetData } from '@/lib/default-sheet-data'
import type { SheetData } from '@/lib/sheet-data'
import {
  CHARACTER_DATA_PREFIX,
  CHARACTER_LIST_KEY,
  addCharacterToMetadataList,
  loadCharacterList,
} from '@/lib/multi-character-storage'
import {
  cleanupOrphanedCharacterImages,
  deleteCharacterSave,
  loadCharacterSheet,
  saveCharacterSheet,
} from '@/character/storage/character-save-storage'
import {
  characterImageKey,
  clearAllCharacterImages,
  getCharacterImage,
} from '@/character/storage/character-image-repository'

const png = 'data:image/png;base64,aGVsbG8='
const jpeg = 'data:image/jpeg;base64,aGVsbG8gd29ybGQ='
const failingPng = 'data:image/png;base64,ZmFpbA=='

function sheet(overrides: Partial<SheetData> = {}): SheetData {
  return { ...structuredClone(defaultSheetData), name: 'Storage Hero', ...overrides }
}

describe('character save storage boundary', () => {
  beforeEach(async () => {
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
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('saves projected character data without embedded image payloads', async () => {
    addCharacterToMetadataList('Storage Save')
    const characterId = loadCharacterList().characters[0].id

    await saveCharacterSheet(characterId, sheet({ characterImage: png }))

    const raw = localStorage.getItem(`${CHARACTER_DATA_PREFIX}${characterId}`) || ''
    expect(raw).not.toContain('data:image/')
    const stored = JSON.parse(raw)
    expect(stored.imageAssets.characterImage.key).toBe(characterImageKey(characterId, 'portrait'))
    expect(await getCharacterImage(characterImageKey(characterId, 'portrait'))).not.toBeNull()
  })

  it('loads and hydrates saved image references', async () => {
    addCharacterToMetadataList('Hydrate Save')
    const characterId = loadCharacterList().characters[0].id
    await saveCharacterSheet(characterId, sheet({ characterImage: png }))

    const loaded = await loadCharacterSheet(characterId)

    expect(loaded?.characterImage).toMatch(/^data:image\/png;base64,/)
  })

  it('does not lazily migrate embedded image payloads during load', async () => {
    addCharacterToMetadataList('Legacy Embedded Image Save')
    const characterId = loadCharacterList().characters[0].id
    const storageKey = `${CHARACTER_DATA_PREFIX}${characterId}`
    const previousRaw = JSON.stringify(sheet({ characterImage: png }))
    localStorage.setItem(storageKey, previousRaw)

    await expect(loadCharacterSheet(characterId)).rejects.toThrow(
      `Embedded character images must be migrated at startup before loading character ${characterId}`,
    )

    expect(localStorage.getItem(storageKey)).toBe(previousRaw)
    expect(await getCharacterImage(characterImageKey(characterId, 'portrait'))).toBeNull()
  })

  it('removes newly-written image records when localStorage save fails', async () => {
    addCharacterToMetadataList('Failed New Image Save')
    const characterId = loadCharacterList().characters[0].id
    const key = characterImageKey(characterId, 'portrait')
    const saveError = new Error('localStorage is full')
    const originalSetItem = localStorage.setItem.bind(localStorage)
    const setItem = vi.spyOn(localStorage, 'setItem')
    setItem.mockImplementation((storageKey: string, value: string) => {
      if (storageKey === `${CHARACTER_DATA_PREFIX}${characterId}`) throw saveError
      return originalSetItem(storageKey, value)
    })

    await expect(saveCharacterSheet(characterId, sheet({ characterImage: png }))).rejects.toThrow(saveError)

    expect(await getCharacterImage(key)).toBeNull()
  })

  it('restores overwritten image records when localStorage save fails', async () => {
    addCharacterToMetadataList('Failed Existing Image Save')
    const characterId = loadCharacterList().characters[0].id
    const key = characterImageKey(characterId, 'portrait')
    await saveCharacterSheet(characterId, sheet({ characterImage: png }))
    const original = await getCharacterImage(key)
    expect(original).not.toBeNull()

    const saveError = new Error('localStorage is full')
    const originalSetItem = localStorage.setItem.bind(localStorage)
    const setItem = vi.spyOn(localStorage, 'setItem')
    setItem.mockImplementation((storageKey: string, value: string) => {
      if (storageKey === `${CHARACTER_DATA_PREFIX}${characterId}`) throw saveError
      return originalSetItem(storageKey, value)
    })

    await expect(saveCharacterSheet(characterId, sheet({ characterImage: jpeg }))).rejects.toThrow(saveError)

    const restored = await getCharacterImage(key)
    expect(restored?.mimeType).toBe('image/png')
    expect(restored?.size).toBe(original?.size)
  })

  it('restores the previous character payload when metadata update fails after data write', async () => {
    addCharacterToMetadataList('Failed Metadata Save')
    const characterId = loadCharacterList().characters[0].id
    const characterKey = `${CHARACTER_DATA_PREFIX}${characterId}`
    const imageKey = characterImageKey(characterId, 'portrait')
    await saveCharacterSheet(characterId, sheet({ characterImage: png }))
    const previousRaw = localStorage.getItem(characterKey)
    const previousImage = await getCharacterImage(imageKey)
    expect(previousRaw).not.toBeNull()
    expect(previousImage).not.toBeNull()

    const saveError = new Error('metadata update failed')
    const originalSetItem = localStorage.setItem.bind(localStorage)
    const setItem = vi.spyOn(localStorage, 'setItem')
    let characterDataWriteAllowed = false
    setItem.mockImplementation((storageKey: string, value: string) => {
      if (storageKey === characterKey) {
        characterDataWriteAllowed = true
        return originalSetItem(storageKey, value)
      }
      if (characterDataWriteAllowed && storageKey === CHARACTER_LIST_KEY) throw saveError
      return originalSetItem(storageKey, value)
    })

    await expect(saveCharacterSheet(characterId, sheet({ characterImage: jpeg }))).rejects.toThrow(saveError)

    expect(localStorage.getItem(characterKey)).toBe(previousRaw)
    const restoredImage = await getCharacterImage(imageKey)
    expect(restoredImage?.mimeType).toBe(previousImage?.mimeType)
    expect(restoredImage?.size).toBe(previousImage?.size)
  })

  it('rolls back image records when projection fails after a partial image write', async () => {
    addCharacterToMetadataList('Failed Projection Save')
    const characterId = loadCharacterList().characters[0].id
    const characterKey = characterImageKey(characterId, 'portrait')
    const projectionError = new Error('projection image failed')
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const dataUrl = String(input)
      if (dataUrl === failingPng) throw projectionError

      const [metadata, base64] = dataUrl.split(',')
      const mimeType = metadata.match(/^data:([^;]+)/)?.[1] ?? ''

      return {
        blob: async () => new NodeBlob([Buffer.from(base64, 'base64')], { type: mimeType }),
      } as Response
    })
    vi.stubGlobal('fetch', fetch)

    await expect(saveCharacterSheet(characterId, sheet({
      characterImage: png,
      companionImage: failingPng,
    }))).rejects.toThrow(projectionError)

    expect(localStorage.getItem(`${CHARACTER_DATA_PREFIX}${characterId}`)).toBeNull()
    expect(await getCharacterImage(characterKey)).toBeNull()
  })

  it('deletes localStorage data and image records', async () => {
    addCharacterToMetadataList('Delete Save')
    const characterId = loadCharacterList().characters[0].id
    await saveCharacterSheet(characterId, sheet({ characterImage: png }))

    await deleteCharacterSave(characterId)

    expect(localStorage.getItem(`${CHARACTER_DATA_PREFIX}${characterId}`)).toBeNull()
    expect(await getCharacterImage(characterImageKey(characterId, 'portrait'))).toBeNull()
  })

  it('leaves image records intact when localStorage deletion fails', async () => {
    addCharacterToMetadataList('Failed Delete Save')
    const characterId = loadCharacterList().characters[0].id
    await saveCharacterSheet(characterId, sheet({ characterImage: png }))
    const key = characterImageKey(characterId, 'portrait')
    const originalRemoveItem = localStorage.removeItem.bind(localStorage)
    const removeItem = vi.spyOn(localStorage, 'removeItem')
    removeItem.mockImplementation((storageKey: string) => {
      if (storageKey === `${CHARACTER_DATA_PREFIX}${characterId}`) throw new Error('remove failed')
      return originalRemoveItem(storageKey)
    })

    const deleted = await deleteCharacterSave(characterId)

    expect(deleted).toBe(false)
    expect(localStorage.getItem(`${CHARACTER_DATA_PREFIX}${characterId}`)).not.toBeNull()
    expect(await getCharacterImage(key)).not.toBeNull()
  })

  it('cleans images whose character id is no longer in the character list', async () => {
    addCharacterToMetadataList('Orphan Save')
    const characterId = loadCharacterList().characters[0].id
    await saveCharacterSheet(characterId, sheet({ characterImage: png }))
    localStorage.setItem(
      CHARACTER_LIST_KEY,
      JSON.stringify({ characters: [], activeCharacterId: null, lastUpdated: new Date().toISOString() }),
    )

    const count = await cleanupOrphanedCharacterImages()

    expect(count).toBe(1)
    expect(await getCharacterImage(characterImageKey(characterId, 'portrait'))).toBeNull()
  })
})
