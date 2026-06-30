import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  characterImageKey,
  clearAllCharacterImages,
  deleteCharacterImagesByCharacterId,
  getCharacterImage,
  listCharacterImages,
  saveCharacterImage,
} from '@/character/storage/character-image-repository'
import {
  dataUrlToBlob,
  isImageDataUrl,
} from '@/character/storage/data-url'

const tinyPng = 'data:image/png;base64,aGVsbG8='

describe('character image repository', () => {
  beforeEach(async () => {
    await clearAllCharacterImages()
  })

  it('detects and converts image data URLs', async () => {
    expect(isImageDataUrl(tinyPng)).toBe(true)
    expect(isImageDataUrl('')).toBe(false)
    expect(isImageDataUrl('https://example.test/image.png')).toBe(false)

    const blob = await dataUrlToBlob(tinyPng)
    expect(blob.type).toBe('image/png')
    expect(blob.size).toBeGreaterThan(0)
  })

  it('stores image records with character ownership metadata', async () => {
    const blob = await dataUrlToBlob(tinyPng)
    const key = characterImageKey('character-a', 'portrait')

    await saveCharacterImage({
      characterId: 'character-a',
      role: 'portrait',
      blob,
      mimeType: blob.type,
    })

    const record = await getCharacterImage(key)
    expect(record).toEqual(expect.objectContaining({
      key,
      characterId: 'character-a',
      role: 'portrait',
      mimeType: 'image/png',
      size: blob.size,
    }))
  })

  it('deletes all images for one character without touching another character', async () => {
    const blob = await dataUrlToBlob(tinyPng)
    await saveCharacterImage({ characterId: 'character-a', role: 'portrait', blob, mimeType: blob.type })
    await saveCharacterImage({ characterId: 'character-b', role: 'portrait', blob, mimeType: blob.type })

    await deleteCharacterImagesByCharacterId('character-a')

    expect(await getCharacterImage(characterImageKey('character-a', 'portrait'))).toBeNull()
    expect(await getCharacterImage(characterImageKey('character-b', 'portrait'))).not.toBeNull()
  })

  it('lists records by character id for orphan cleanup', async () => {
    const blob = await dataUrlToBlob(tinyPng)
    await saveCharacterImage({ characterId: 'character-a', role: 'portrait', blob, mimeType: blob.type })
    await saveCharacterImage({ characterId: 'character-a', role: 'companion', blob, mimeType: blob.type })

    const records = await listCharacterImages('character-a')
    expect(records.map(record => record.role).sort()).toEqual(['companion', 'portrait'])
  })
})
