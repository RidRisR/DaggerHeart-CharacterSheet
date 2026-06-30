import 'fake-indexeddb/auto'
import { Blob as NodeBlob } from 'node:buffer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultSheetData } from '@/lib/default-sheet-data'
import type { SheetData } from '@/lib/sheet-data'
import {
  characterImageKey,
  clearAllCharacterImages,
  deleteCharacterImage,
  getCharacterImage,
} from '@/character/storage/character-image-repository'
import {
  prepareDuplicatedSheetForStorage,
  prepareImportedSheetForStorage,
  prepareSheetForExport,
  projectSheetForStorage,
  hydrateSheetForRuntime,
} from '@/character/storage/sheet-image-projection'

const png = 'data:image/png;base64,aGVsbG8='
const jpeg = 'data:image/jpeg;base64,aGVsbG8='

function sheet(overrides: Partial<SheetData> = {}): SheetData {
  return {
    ...structuredClone(defaultSheetData),
    name: 'Projection Hero',
    ...overrides,
  }
}

describe('sheet image projection', () => {
  beforeEach(async () => {
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const dataUrl = String(input)
      const [metadata, base64] = dataUrl.split(',')
      const mimeType = metadata.match(/^data:([^;]+)/)?.[1] ?? ''

      return {
        blob: async () => new NodeBlob([Buffer.from(base64, 'base64')], { type: mimeType }),
      } as Response
    })
    await clearAllCharacterImages()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('projects image data URLs into local image assets', async () => {
    const result = await projectSheetForStorage('character-a', sheet({
      characterImage: png,
      companionImage: jpeg,
    }))

    expect(result.storedSheet.characterImage).toBe('')
    expect(result.storedSheet.companionImage).toBe('')
    expect(result.storedSheet.imageAssets?.characterImage).toEqual({
      key: characterImageKey('character-a', 'portrait'),
      mimeType: 'image/png',
    })
    expect(result.storedSheet.imageAssets?.companionImage).toEqual({
      key: characterImageKey('character-a', 'companion'),
      mimeType: 'image/jpeg',
    })
    expect(result.runtimeSheet.characterImage).toBe(png)
    expect(result.runtimeSheet.companionImage).toBe(jpeg)
    expect(result.runtimeSheet.imageAssets?.characterImage).toEqual({
      key: characterImageKey('character-a', 'portrait'),
      mimeType: 'image/png',
    })
    expect(result.runtimeSheet.imageAssets?.companionImage).toEqual({
      key: characterImageKey('character-a', 'companion'),
      mimeType: 'image/jpeg',
    })
    expect(await getCharacterImage(characterImageKey('character-a', 'portrait'))).not.toBeNull()
    expect(await getCharacterImage(characterImageKey('character-a', 'companion'))).not.toBeNull()
  })

  it('hydrates image asset references back to runtime data URLs', async () => {
    const projected = await projectSheetForStorage('character-a', sheet({ characterImage: png }))
    const runtime = await hydrateSheetForRuntime(projected.storedSheet)

    expect(runtime.characterImage).toMatch(/^data:image\/png;base64,/)
    expect(runtime.imageAssets?.characterImage?.key).toBe(characterImageKey('character-a', 'portrait'))
  })

  it('preserves stored image asset refs during default projection', async () => {
    const projected = await projectSheetForStorage('character-a', sheet({ characterImage: png }))
    const reprojected = await projectSheetForStorage('character-a', projected.storedSheet)

    expect(reprojected.storedSheet.characterImage).toBe('')
    expect(reprojected.storedSheet.imageAssets?.characterImage).toEqual({
      key: characterImageKey('character-a', 'portrait'),
      mimeType: 'image/png',
    })
    expect(await hydrateSheetForRuntime(reprojected.storedSheet)).toEqual(expect.objectContaining({
      characterImage: expect.stringMatching(/^data:image\/png;base64,/),
    }))
  })

  it('clears image asset refs when empty image fields are explicitly marked for clearing', async () => {
    const projected = await projectSheetForStorage('character-a', sheet({
      characterImage: png,
      companionImage: jpeg,
    }))
    const runtime = await hydrateSheetForRuntime(projected.storedSheet)

    runtime.characterImage = ''
    const cleared = await projectSheetForStorage('character-a', runtime, {
      clearEmptyImageFields: ['characterImage'],
    })
    const hydrated = await hydrateSheetForRuntime(cleared.storedSheet)
    const exported = await prepareSheetForExport(cleared.storedSheet)

    expect(cleared.storedSheet.characterImage).toBe('')
    expect(cleared.storedSheet.imageAssets?.characterImage).toBeUndefined()
    expect(cleared.storedSheet.imageAssets?.companionImage?.key).toBe(characterImageKey('character-a', 'companion'))
    expect(hydrated.characterImage).toBe('')
    expect(exported.characterImage).toBe('')
    expect((exported as any).imageAssets).toBeUndefined()
  })

  it('prepares export by restoring base64 and stripping imageAssets', async () => {
    const projected = await projectSheetForStorage('character-a', sheet({ characterImage: png }))
    const exported = await prepareSheetForExport(projected.storedSheet)

    expect(exported.characterImage).toMatch(/^data:image\/png;base64,/)
    expect((exported as any).imageAssets).toBeUndefined()
  })

  it('prepares export without blocking when a referenced image asset is missing', async () => {
    const projected = await projectSheetForStorage('character-a', sheet({ characterImage: png }))
    await deleteCharacterImage(characterImageKey('character-a', 'portrait'))

    const exported = await prepareSheetForExport(projected.storedSheet)

    expect(exported.name).toBe('Projection Hero')
    expect(exported.characterImage).toBe('')
    expect((exported as any).imageAssets).toBeUndefined()
  })

  it('ignores inbound imageAssets during imported save preparation', async () => {
    const imported = sheet({
      characterImage: png,
      imageAssets: {
        characterImage: { key: 'foreign-key', mimeType: 'image/png' },
      },
    })

    const result = await prepareImportedSheetForStorage('character-b', imported)

    expect(result.storedSheet.imageAssets?.characterImage?.key).toBe(characterImageKey('character-b', 'portrait'))
    expect(result.storedSheet.imageAssets?.characterImage?.key).not.toBe('foreign-key')
    expect(result.runtimeSheet.characterImage).toBe(png)
    expect(result.runtimeSheet.imageAssets?.characterImage?.key).toBe(characterImageKey('character-b', 'portrait'))
  })

  it('duplicates image assets to the target character id', async () => {
    const source = await projectSheetForStorage('source-id', sheet({ characterImage: png }))
    const duplicated = await prepareDuplicatedSheetForStorage('source-id', 'target-id', source.storedSheet)

    expect(duplicated.storedSheet.imageAssets?.characterImage?.key).toBe(characterImageKey('target-id', 'portrait'))
    expect(duplicated.runtimeSheet.imageAssets?.characterImage?.key).toBe(characterImageKey('target-id', 'portrait'))
    expect(await getCharacterImage(characterImageKey('source-id', 'portrait'))).not.toBeNull()
    expect(await getCharacterImage(characterImageKey('target-id', 'portrait'))).not.toBeNull()
  })
})
