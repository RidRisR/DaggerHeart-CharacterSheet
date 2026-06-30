import 'fake-indexeddb/auto'
import { Blob as NodeBlob } from 'node:buffer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAllCharacterImages } from '@/character/storage/character-image-repository'
import {
  prepareSheetForExport,
  projectSheetForStorage,
} from '@/character/storage/sheet-image-projection'
import { defaultSheetData } from '@/lib/default-sheet-data'
import { getHTMLContent } from '@/lib/html-exporter'
import type { SheetData } from '@/lib/sheet-data'
import { exportCharacterData } from '@/lib/storage'

const png = 'data:image/png;base64,aGVsbG8='

function sheet(overrides: Partial<SheetData> = {}): SheetData {
  return {
    ...structuredClone(defaultSheetData),
    name: 'Export Hero',
    ...overrides,
  }
}

describe('character export image preparation', () => {
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
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('prepareSheetForExport restores base64 and strips imageAssets', async () => {
    const projected = await projectSheetForStorage('export-id', sheet({
      characterImage: png,
    }))

    const exported = await prepareSheetForExport(projected.storedSheet)

    expect(exported.characterImage).toMatch(/^data:image\/png;base64,/)
    expect((exported as { imageAssets?: unknown }).imageAssets).toBeUndefined()
  })

  it('JSON export downloads portable sheet data', async () => {
    const projected = await projectSheetForStorage('export-id', sheet({
      characterImage: png,
    }))
    const anchor = document.createElement('a')
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(anchor, 'click').mockImplementation(() => undefined)
    vi.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
      if (tagName === 'a') return anchor
      return originalCreateElement(tagName, options)
    })

    await exportCharacterData(projected.storedSheet)

    const href = anchor.getAttribute('href') ?? ''
    const payload = decodeURIComponent(href.replace('data:application/json;charset=utf-8,', ''))
    expect(payload).toContain('data:image/png;base64')
    expect(payload).not.toContain('imageAssets')
  })

  it('HTML content embeds portable sheet data', async () => {
    const projected = await projectSheetForStorage('export-id', sheet({
      characterImage: png,
    }))
    document.body.innerHTML = '<div class="print-all-pages"><div>sheet preview</div></div>'

    const html = await getHTMLContent(projected.storedSheet, { includeStyles: false })
    const embeddedPayload = html.match(/window\.characterData = ([\s\S]*?);\s*function printCharacterSheet/)?.[1]

    expect(embeddedPayload).toBeDefined()
    const embeddedData = JSON.parse(embeddedPayload ?? '{}') as SheetData
    expect(embeddedData.characterImage).toMatch(/^data:image\/png;base64,/)
    expect((embeddedData as { imageAssets?: unknown }).imageAssets).toBeUndefined()
  })
})
