import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Blob as NodeBlob } from 'node:buffer'
import {
  characterImageKey,
  clearAllCharacterImages,
  getCharacterImage,
} from '@/character/storage/character-image-repository'
import {
  CHARACTER_IMAGE_ASSET_MIGRATION_KEY,
  CHARACTER_IMAGE_ASSET_MIGRATION_VERSION,
  migrateCharacterSaveImagesToAssets,
} from '@/character/storage/character-image-migration'
import { defaultSheetData } from '@/lib/default-sheet-data'
import {
  CHARACTER_DATA_PREFIX,
  CHARACTER_LIST_KEY,
  addCharacterToMetadataList,
} from '@/lib/multi-character-storage'

const png = 'data:image/png;base64,aGVsbG8='

function installDataUrlFetch() {
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
    const dataUrl = String(input)
    const [metadata, base64] = dataUrl.split(',')
    const mimeType = metadata.match(/^data:([^;]+)/)?.[1] ?? ''

    return {
      blob: async () => new NodeBlob([Buffer.from(base64, 'base64')], { type: mimeType }),
    } as Response
  })
}

function createStoredCharacter(saveName: string, data: Record<string, unknown>) {
  const metadata = addCharacterToMetadataList(saveName)
  if (!metadata) throw new Error('failed to create metadata')

  localStorage.setItem(`${CHARACTER_DATA_PREFIX}${metadata.id}`, JSON.stringify({
    ...structuredClone(defaultSheetData),
    ...data,
  }))

  return metadata.id
}

function characterStorageValues(): string[] {
  const values: string[] = []

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (
      key?.startsWith(CHARACTER_DATA_PREFIX) &&
      key !== CHARACTER_LIST_KEY
    ) {
      values.push(localStorage.getItem(key) || '')
    }
  }

  return values
}

describe('character image startup migration', () => {
  beforeEach(async () => {
    localStorage.clear()
    installDataUrlFetch()
    await clearAllCharacterImages()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('migrates embedded images for every character save before writing the completion marker', async () => {
    const firstId = createStoredCharacter('First', { name: 'First Hero', characterImage: png })
    const secondId = createStoredCharacter('Second', { name: 'Second Hero', companionImage: png })
    const storage = localStorage
    const markerWriteSnapshots: string[][] = []

    vi.stubGlobal('localStorage', {
      get length() {
        return storage.length
      },
      clear: () => storage.clear(),
      getItem: (key: string) => storage.getItem(key),
      key: (index: number) => storage.key(index),
      removeItem: (key: string) => storage.removeItem(key),
      setItem: (key: string, value: string) => {
        if (key === CHARACTER_IMAGE_ASSET_MIGRATION_KEY) {
          markerWriteSnapshots.push(characterStorageValues())
        }

        storage.setItem(key, value)
      },
    })

    const result = await migrateCharacterSaveImagesToAssets()

    expect(CHARACTER_IMAGE_ASSET_MIGRATION_KEY.startsWith(CHARACTER_DATA_PREFIX)).toBe(false)
    expect(result).toEqual({
      scannedCount: 2,
      migratedCount: 2,
      skippedCount: 0,
    })
    expect(localStorage.getItem(CHARACTER_IMAGE_ASSET_MIGRATION_KEY)).toBe(CHARACTER_IMAGE_ASSET_MIGRATION_VERSION)
    expect(markerWriteSnapshots).toHaveLength(1)
    expect(markerWriteSnapshots[0]).toHaveLength(2)
    for (const value of markerWriteSnapshots[0]) {
      expect(value).not.toContain('data:image/')
    }
    expect(characterStorageValues()).toHaveLength(2)
    for (const value of characterStorageValues()) {
      expect(value).not.toContain('data:image/')
    }

    const firstImageKey = characterImageKey(firstId, 'portrait')
    const secondImageKey = characterImageKey(secondId, 'companion')
    const firstStored = JSON.parse(localStorage.getItem(`${CHARACTER_DATA_PREFIX}${firstId}`) || '{}')
    const secondStored = JSON.parse(localStorage.getItem(`${CHARACTER_DATA_PREFIX}${secondId}`) || '{}')
    expect(firstStored.imageAssets.characterImage.key).toBe(firstImageKey)
    expect(secondStored.imageAssets.companionImage.key).toBe(secondImageKey)
    expect(await getCharacterImage(firstImageKey)).not.toBeNull()
    expect(await getCharacterImage(secondImageKey)).not.toBeNull()
  })

  it('does not write the completion marker and rolls back image assets when a stored sheet rewrite fails', async () => {
    const characterId = createStoredCharacter('Rollback', {
      name: 'Rollback Hero',
      characterImage: png,
    })
    const storageKey = `${CHARACTER_DATA_PREFIX}${characterId}`
    const previousRaw = localStorage.getItem(storageKey)
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
          throw new Error('forced storage failure')
        }
        storage.setItem(key, value)
      },
    })

    await expect(migrateCharacterSaveImagesToAssets()).rejects.toThrow('forced storage failure')

    expect(localStorage.getItem(CHARACTER_IMAGE_ASSET_MIGRATION_KEY)).toBeNull()
    expect(localStorage.getItem(storageKey)).toBe(previousRaw)
    expect(await getCharacterImage(characterImageKey(characterId, 'portrait'))).toBeNull()
  })

  it('does not leave partially written image assets when projection fails after one image write', async () => {
    const characterId = createStoredCharacter('Projection Rollback', {
      name: 'Projection Rollback Hero',
      characterImage: png,
      companionImage: 'data:image/png;base64,broken',
    })
    const storageKey = `${CHARACTER_DATA_PREFIX}${characterId}`
    const previousRaw = localStorage.getItem(storageKey)
    const originalFetch = globalThis.fetch

    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      if (String(input).includes('broken')) {
        throw new Error('forced projection failure')
      }
      return await originalFetch(input)
    })

    await expect(migrateCharacterSaveImagesToAssets()).rejects.toThrow('forced projection failure')

    expect(localStorage.getItem(CHARACTER_IMAGE_ASSET_MIGRATION_KEY)).toBeNull()
    expect(localStorage.getItem(storageKey)).toBe(previousRaw)
    expect(await getCharacterImage(characterImageKey(characterId, 'portrait'))).toBeNull()
    expect(await getCharacterImage(characterImageKey(characterId, 'companion'))).toBeNull()
  })

  it('reruns when marker exists but an embedded image payload is still present', async () => {
    const characterId = createStoredCharacter('Stale Marker', {
      name: 'Stale Marker Hero',
      characterImage: png,
    })
    localStorage.setItem(CHARACTER_IMAGE_ASSET_MIGRATION_KEY, CHARACTER_IMAGE_ASSET_MIGRATION_VERSION)

    const result = await migrateCharacterSaveImagesToAssets()

    expect(result.migratedCount).toBe(1)
    expect(localStorage.getItem(`${CHARACTER_DATA_PREFIX}${characterId}`)).not.toContain('data:image/')
    expect(await getCharacterImage(characterImageKey(characterId, 'portrait'))).not.toBeNull()
  })

  it('skips when marker exists and no embedded image payload remains', async () => {
    createStoredCharacter('No Image', {
      name: 'No Image Hero',
      characterImage: '',
      companionImage: '',
    })
    localStorage.setItem(CHARACTER_IMAGE_ASSET_MIGRATION_KEY, CHARACTER_IMAGE_ASSET_MIGRATION_VERSION)

    await expect(migrateCharacterSaveImagesToAssets()).resolves.toEqual({
      scannedCount: 0,
      migratedCount: 0,
      skippedCount: 0,
    })
  })
})
