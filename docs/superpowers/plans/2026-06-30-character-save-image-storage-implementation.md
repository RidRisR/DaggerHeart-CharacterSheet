# Character Save Image Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move character portrait and companion image payloads out of character localStorage records into IndexedDB, raise the save limit to 15, and keep import/export contracts portable.

**Architecture:** Add a narrow **Character Save Storage Boundary** under `character/storage/` that owns image IndexedDB access, storage projection, hydration, import preparation, duplicate preparation, export preparation, migration, and cleanup. Existing UI and save-management code should call this boundary instead of directly writing `dh_character_*`; do not rewrite unrelated storage domains.

**Tech Stack:** Next.js, React, TypeScript, Dexie, Vitest, Testing Library, browser `localStorage`, IndexedDB `Blob` storage.

---

## File Structure

- Create `character/storage/character-image-types.ts`: shared image role, sheet image field, image asset ref, and image record types.
- Create `character/storage/character-image-database.ts`: Dexie database for character image records.
- Create `character/storage/character-image-repository.ts`: low-level async image CRUD, copy, cleanup, and clear helpers.
- Create `character/storage/data-url.ts`: data URL detection and conversion helpers.
- Create `character/storage/sheet-image-projection.ts`: pure-ish projection/hydration/export/import/duplicate helpers.
- Create `character/storage/character-save-storage.ts`: high-level async character save commands that combine localStorage metadata helpers with image projection.
- Create `character/storage/character-image-actions.ts`: upload/delete image actions used by page-level image flows.
- Modify `lib/sheet-data.ts`: add local-only `imageAssets` type on `SheetData`, update `CharacterList` comment to 20.
- Modify `lib/default-sheet-data.ts`: default `imageAssets` to `{}`.
- Modify `lib/sheet-data-migration.ts`: add synchronous shape migration for `imageAssets` only; no IndexedDB writes.
- Modify `lib/character-data-validator.ts`: strip inbound external `imageAssets`; keep portable image strings.
- Modify `lib/multi-character-storage.ts`: raise `MAX_CHARACTERS` to 15; keep legacy sync helpers for existing low-risk paths, but delegate image-aware save/load/delete/migration cleanup through new async commands where normal workflows need images.
- Modify `hooks/use-character-management.ts`: make switch/create/import/delete/duplicate paths use async character save commands.
- Modify `components/home-client-app.tsx`: route autosave through the character save storage boundary and remove direct `localStorage.setItem("dh_character_*")`.
- Modify `components/character-sheet.tsx`, `components/character-sheet-page-adventure-notes.tsx`, `components/character-sheet-page-ranger-companion.tsx`: route image upload/delete through explicit character image actions.
- Modify `components/modals/character-management-modal.tsx`: stop calling `loadCharacterById()` during JSX render.
- Modify `lib/storage.ts`, `hooks/use-export-handlers.ts`, `lib/html-exporter.ts`: run export preparation before JSON/HTML payload generation.
- Modify `components/layout/bottom-dock.tsx`, `components/ui/archive-manager-dropdown.tsx`: use shared limit and clarify shortcut copy.
- Modify `app/card-manager/page.tsx`: clear character image IndexedDB records during full local data reset.
- Modify `lib/memory-monitor.ts`: add character save image-size/invariant diagnostics.
- Add/update tests under `tests/unit/` for projection, repository, storage commands, import, export, shortcuts, reset, and invariant coverage.

## Task 1: Character Image Repository Primitives

**Files:**
- Create: `character/storage/character-image-types.ts`
- Create: `character/storage/character-image-database.ts`
- Create: `character/storage/character-image-repository.ts`
- Create: `character/storage/data-url.ts`
- Test: `tests/unit/character-image-repository.test.ts`

- [ ] **Step 1: Write failing repository and data URL tests**

Create `tests/unit/character-image-repository.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```bash
pnpm vitest run tests/unit/character-image-repository.test.ts
```

Expected: FAIL because `@/character/storage/*` modules do not exist.

- [ ] **Step 3: Add shared types**

Create `character/storage/character-image-types.ts`:

```ts
export type CharacterImageRole = 'portrait' | 'companion'

export type CharacterSheetImageField = 'characterImage' | 'companionImage'

export interface CharacterImageAssetRef {
  key: string
  mimeType: string
}

export type CharacterImageAssetMap = Partial<Record<CharacterSheetImageField, CharacterImageAssetRef>>

export interface CharacterImageRecord {
  key: string
  characterId: string
  role: CharacterImageRole
  blob: Blob
  mimeType: string
  size: number
  updatedAt: number
}
```

- [ ] **Step 4: Add Dexie database**

Create `character/storage/character-image-database.ts`:

```ts
import Dexie, { type Table } from 'dexie'
import type { CharacterImageRecord } from './character-image-types'

export class CharacterImageDB extends Dexie {
  characterImages!: Table<CharacterImageRecord, string>

  constructor() {
    super('DaggerHeartCharacterImages')
    this.version(1).stores({
      characterImages: 'key, characterId, role, updatedAt',
    })
  }
}

export const characterImageDb = new CharacterImageDB()

export function isCharacterImageIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}
```

- [ ] **Step 5: Add data URL helpers**

Create `character/storage/data-url.ts`:

```ts
const IMAGE_DATA_URL_PATTERN = /^data:image\/[a-zA-Z0-9.+-]+;base64,/

export function isImageDataUrl(value: unknown): value is string {
  return typeof value === 'string' && IMAGE_DATA_URL_PATTERN.test(value)
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  if (!isImageDataUrl(dataUrl)) {
    throw new Error('Expected an image data URL')
  }

  const response = await fetch(dataUrl)
  return await response.blob()
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob as data URL'))
    reader.readAsDataURL(blob)
  })
}
```

- [ ] **Step 6: Add repository helpers**

Create `character/storage/character-image-repository.ts`:

```ts
import { characterImageDb, isCharacterImageIndexedDBAvailable } from './character-image-database'
import type { CharacterImageRecord, CharacterImageRole } from './character-image-types'

export function characterImageKey(characterId: string, role: CharacterImageRole): string {
  return `character:${characterId}:${role}`
}

export async function saveCharacterImage(input: {
  characterId: string
  role: CharacterImageRole
  blob: Blob
  mimeType: string
}): Promise<CharacterImageRecord> {
  if (!isCharacterImageIndexedDBAvailable()) {
    throw new Error('IndexedDB is not available for character images')
  }

  const record: CharacterImageRecord = {
    key: characterImageKey(input.characterId, input.role),
    characterId: input.characterId,
    role: input.role,
    blob: input.blob,
    mimeType: input.mimeType || input.blob.type || 'application/octet-stream',
    size: input.blob.size,
    updatedAt: Date.now(),
  }

  await characterImageDb.characterImages.put(record)
  return record
}

export async function getCharacterImage(key: string): Promise<CharacterImageRecord | null> {
  if (!isCharacterImageIndexedDBAvailable()) return null
  return (await characterImageDb.characterImages.get(key)) ?? null
}

export async function listCharacterImages(characterId?: string): Promise<CharacterImageRecord[]> {
  if (!isCharacterImageIndexedDBAvailable()) return []
  if (!characterId) return await characterImageDb.characterImages.toArray()
  return await characterImageDb.characterImages.where('characterId').equals(characterId).toArray()
}

export async function deleteCharacterImage(key: string): Promise<void> {
  if (!isCharacterImageIndexedDBAvailable()) return
  await characterImageDb.characterImages.delete(key)
}

export async function deleteCharacterImagesByCharacterId(characterId: string): Promise<void> {
  if (!isCharacterImageIndexedDBAvailable()) return
  await characterImageDb.characterImages.where('characterId').equals(characterId).delete()
}

export async function clearAllCharacterImages(): Promise<void> {
  if (!isCharacterImageIndexedDBAvailable()) return
  await characterImageDb.characterImages.clear()
}
```

- [ ] **Step 7: Run repository tests**

Run:

```bash
pnpm vitest run tests/unit/character-image-repository.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add character/storage/character-image-types.ts character/storage/character-image-database.ts character/storage/character-image-repository.ts character/storage/data-url.ts tests/unit/character-image-repository.test.ts
git commit -m "feat: add character image repository"
```

## Task 2: Sheet Image Projection And Export Preparation

**Files:**
- Modify: `lib/sheet-data.ts`
- Modify: `lib/default-sheet-data.ts`
- Modify: `lib/sheet-data-migration.ts`
- Create: `character/storage/sheet-image-projection.ts`
- Test: `tests/unit/sheet-image-projection.test.ts`
- Test: `tests/unit/character-data-validator.test.ts`

- [ ] **Step 1: Write failing projection tests**

Create `tests/unit/sheet-image-projection.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { defaultSheetData } from '@/lib/default-sheet-data'
import type { SheetData } from '@/lib/sheet-data'
import { characterImageKey, clearAllCharacterImages, getCharacterImage } from '@/character/storage/character-image-repository'
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
    await clearAllCharacterImages()
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
    expect(await getCharacterImage(characterImageKey('character-a', 'portrait'))).not.toBeNull()
    expect(await getCharacterImage(characterImageKey('character-a', 'companion'))).not.toBeNull()
  })

  it('hydrates image asset references back to runtime data URLs', async () => {
    const projected = await projectSheetForStorage('character-a', sheet({ characterImage: png }))
    const runtime = await hydrateSheetForRuntime(projected.storedSheet)

    expect(runtime.characterImage).toMatch(/^data:image\/png;base64,/)
    expect(runtime.imageAssets?.characterImage?.key).toBe(characterImageKey('character-a', 'portrait'))
  })

  it('prepares export by restoring base64 and stripping imageAssets', async () => {
    const projected = await projectSheetForStorage('character-a', sheet({ characterImage: png }))
    const exported = await prepareSheetForExport(projected.storedSheet)

    expect(exported.characterImage).toMatch(/^data:image\/png;base64,/)
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
  })

  it('duplicates image assets to the target character id', async () => {
    const source = await projectSheetForStorage('source-id', sheet({ characterImage: png }))
    const duplicated = await prepareDuplicatedSheetForStorage('source-id', 'target-id', source.storedSheet)

    expect(duplicated.storedSheet.imageAssets?.characterImage?.key).toBe(characterImageKey('target-id', 'portrait'))
    expect(await getCharacterImage(characterImageKey('source-id', 'portrait'))).not.toBeNull()
    expect(await getCharacterImage(characterImageKey('target-id', 'portrait'))).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run the projection tests and verify they fail**

Run:

```bash
pnpm vitest run tests/unit/sheet-image-projection.test.ts
```

Expected: FAIL because `sheet-image-projection.ts` and `SheetData.imageAssets` do not exist.

- [ ] **Step 3: Extend `SheetData` with local-only image metadata**

Modify `lib/sheet-data.ts` near the imports and `SheetData` image fields:

```ts
import type { CharacterImageAssetMap } from '@/character/storage/character-image-types'
```

Add to `SheetData`:

```ts
  characterImage?: string
  companionImage?: string
  imageAssets?: CharacterImageAssetMap
```

Update `CharacterList` comment:

```ts
  characters: CharacterMetadata[]  // 最多15个
```

- [ ] **Step 4: Add default imageAssets**

Modify `lib/default-sheet-data.ts`:

```ts
export const defaultSheetData: SheetData = {
  characterImage: "",
  imageAssets: {},
  companionImage: "",
}
```

Insert `imageAssets: {}` beside the existing image defaults and leave all other default values unchanged.

- [ ] **Step 5: Add projection helpers**

Create `character/storage/sheet-image-projection.ts`:

```ts
import type { SheetData } from '@/lib/sheet-data'
import {
  characterImageKey,
  deleteCharacterImage,
  getCharacterImage,
  saveCharacterImage,
} from './character-image-repository'
import type { CharacterImageAssetMap, CharacterImageRole, CharacterSheetImageField } from './character-image-types'
import { blobToDataUrl, dataUrlToBlob, isImageDataUrl } from './data-url'

const IMAGE_FIELDS: Array<{ field: CharacterSheetImageField; role: CharacterImageRole }> = [
  { field: 'characterImage', role: 'portrait' },
  { field: 'companionImage', role: 'companion' },
]

export interface SheetStorageProjectionResult {
  storedSheet: SheetData
  runtimeSheet: SheetData
  writtenImageKeys: string[]
}

function withoutExternalImageAssets(sheet: SheetData): SheetData {
  const copy = structuredClone(sheet)
  delete (copy as SheetData).imageAssets
  return copy
}

export async function projectSheetForStorage(
  characterId: string,
  sheetData: SheetData,
): Promise<SheetStorageProjectionResult> {
  const storedSheet: SheetData = structuredClone(sheetData)
  const runtimeSheet: SheetData = structuredClone(sheetData)
  const imageAssets: CharacterImageAssetMap = { ...(storedSheet.imageAssets ?? {}) }
  const writtenImageKeys: string[] = []

  for (const { field, role } of IMAGE_FIELDS) {
    const value = storedSheet[field]
    if (!isImageDataUrl(value)) continue

    const blob = await dataUrlToBlob(value)
    const record = await saveCharacterImage({
      characterId,
      role,
      blob,
      mimeType: blob.type,
    })

    imageAssets[field] = {
      key: record.key,
      mimeType: record.mimeType,
    }
    storedSheet[field] = ''
    writtenImageKeys.push(record.key)
  }

  storedSheet.imageAssets = imageAssets
  return { storedSheet, runtimeSheet, writtenImageKeys }
}

export async function hydrateSheetForRuntime(storedSheet: SheetData): Promise<SheetData> {
  const runtimeSheet: SheetData = structuredClone(storedSheet)

  for (const { field } of IMAGE_FIELDS) {
    const ref = storedSheet.imageAssets?.[field]
    if (!ref) continue

    const record = await getCharacterImage(ref.key)
    if (!record) {
      throw new Error(`Missing character image asset: ${ref.key}`)
    }

    runtimeSheet[field] = await blobToDataUrl(record.blob)
  }

  return runtimeSheet
}

export async function prepareImportedSheetForStorage(
  characterId: string,
  importedData: SheetData,
): Promise<SheetStorageProjectionResult> {
  return await projectSheetForStorage(characterId, withoutExternalImageAssets(importedData))
}

export async function prepareDuplicatedSheetForStorage(
  _sourceCharacterId: string,
  targetCharacterId: string,
  sourceData: SheetData,
): Promise<SheetStorageProjectionResult> {
  const hydratedSource = await hydrateSheetForRuntime(sourceData)
  return await projectSheetForStorage(targetCharacterId, hydratedSource)
}

export async function prepareSheetForExport(sheetData: SheetData): Promise<SheetData> {
  const exported = await hydrateSheetForRuntime(sheetData)
  delete exported.imageAssets
  return exported
}

export async function rollbackWrittenCharacterImages(imageKeys: string[]): Promise<void> {
  await Promise.all(imageKeys.map(key => deleteCharacterImage(key)))
}
```

- [ ] **Step 6: Add synchronous shape migration**

Modify `lib/sheet-data-migration.ts` in the final normalization path so migrated data always has an object `imageAssets`:

```ts
const normalized = {
  ...defaultSheetData,
  ...data,
  imageAssets: data && typeof data.imageAssets === 'object' && !Array.isArray(data.imageAssets)
    ? data.imageAssets
    : {},
}
```

Do not call IndexedDB or projection helpers from `migrateSheetData()`.

- [ ] **Step 7: Strip external imageAssets in import validation**

Modify `lib/character-data-validator.ts` where validated `SheetData` is assembled:

```ts
const normalizedData: SheetData = {
  // existing normalized fields
  characterImage: data.characterImage ? String(data.characterImage) : undefined,
  companionImage: data.companionImage ? String(data.companionImage) : undefined,
}

delete normalizedData.imageAssets
```

If the file currently returns a large object literal, include `imageAssets: undefined` only temporarily inside the function and delete it before returning. External imports must not preserve local `imageAssets`.

- [ ] **Step 8: Run projection and validation tests**

Run:

```bash
pnpm vitest run tests/unit/sheet-image-projection.test.ts tests/unit/character-data-validator.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/sheet-data.ts lib/default-sheet-data.ts lib/sheet-data-migration.ts lib/character-data-validator.ts character/storage/sheet-image-projection.ts tests/unit/sheet-image-projection.test.ts tests/unit/character-data-validator.test.ts
git commit -m "feat: project character sheet images"
```

## Task 3: Character Save Storage Boundary

**Files:**
- Create: `character/storage/character-save-storage.ts`
- Modify: `lib/multi-character-storage.ts`
- Test: `tests/unit/character-save-storage.test.ts`
- Test: `tests/unit/storage-migration.test.ts`

- [ ] **Step 1: Write failing storage boundary tests**

Create `tests/unit/character-save-storage.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
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
import { characterImageKey, clearAllCharacterImages, getCharacterImage } from '@/character/storage/character-image-repository'

const png = 'data:image/png;base64,aGVsbG8='

function sheet(overrides: Partial<SheetData> = {}): SheetData {
  return { ...structuredClone(defaultSheetData), name: 'Storage Hero', ...overrides }
}

describe('character save storage boundary', () => {
  beforeEach(async () => {
    localStorage.clear()
    await clearAllCharacterImages()
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

  it('deletes localStorage data and image records', async () => {
    addCharacterToMetadataList('Delete Save')
    const characterId = loadCharacterList().characters[0].id
    await saveCharacterSheet(characterId, sheet({ characterImage: png }))

    await deleteCharacterSave(characterId)

    expect(localStorage.getItem(`${CHARACTER_DATA_PREFIX}${characterId}`)).toBeNull()
    expect(await getCharacterImage(characterImageKey(characterId, 'portrait'))).toBeNull()
  })

  it('cleans images whose character id is no longer in the character list', async () => {
    addCharacterToMetadataList('Orphan Save')
    const characterId = loadCharacterList().characters[0].id
    await saveCharacterSheet(characterId, sheet({ characterImage: png }))
    localStorage.setItem(CHARACTER_LIST_KEY, JSON.stringify({ characters: [], activeCharacterId: null, lastUpdated: new Date().toISOString() }))

    const count = await cleanupOrphanedCharacterImages()

    expect(count).toBe(1)
    expect(await getCharacterImage(characterImageKey(characterId, 'portrait'))).toBeNull()
  })
})
```

- [ ] **Step 2: Run storage boundary tests and verify they fail**

Run:

```bash
pnpm vitest run tests/unit/character-save-storage.test.ts
```

Expected: FAIL because `character-save-storage.ts` does not exist.

- [ ] **Step 3: Add high-level storage commands**

Create `character/storage/character-save-storage.ts`:

```ts
import type { SheetData } from '@/lib/sheet-data'
import {
  CHARACTER_DATA_PREFIX,
  loadCharacterList,
  saveCharacterById,
  deleteCharacterById,
} from '@/lib/multi-character-storage'
import { migrateSheetData } from '@/lib/sheet-data-migration'
import {
  hydrateSheetForRuntime,
  projectSheetForStorage,
  rollbackWrittenCharacterImages,
} from './sheet-image-projection'
import {
  deleteCharacterImagesByCharacterId,
  listCharacterImages,
} from './character-image-repository'

export async function saveCharacterSheet(characterId: string, sheetData: SheetData): Promise<SheetData> {
  const projection = await projectSheetForStorage(characterId, sheetData)
  saveCharacterById(characterId, projection.storedSheet)
  return projection.runtimeSheet
}

export async function loadCharacterSheet(characterId: string): Promise<SheetData | null> {
  const raw = localStorage.getItem(`${CHARACTER_DATA_PREFIX}${characterId}`)
  if (!raw) return null

  const parsed = JSON.parse(raw)
  const migrated = migrateSheetData(parsed)
  const projection = await projectSheetForStorage(characterId, migrated)
  saveCharacterById(characterId, projection.storedSheet)
  return await hydrateSheetForRuntime(projection.storedSheet)
}

export async function deleteCharacterSave(characterId: string): Promise<boolean> {
  const deleted = deleteCharacterById(characterId)

  try {
    await deleteCharacterImagesByCharacterId(characterId)
  } catch (error) {
    console.error(`[CharacterImage] Failed to delete images for ${characterId}:`, error)
  }

  return deleted
}

export async function cleanupOrphanedCharacterImages(): Promise<number> {
  const list = loadCharacterList()
  const validCharacterIds = new Set(list.characters.map(character => character.id))
  const records = await listCharacterImages()
  const orphanCharacterIds = new Set(
    records
      .filter(record => !validCharacterIds.has(record.characterId))
      .map(record => record.characterId),
  )

  for (const characterId of orphanCharacterIds) {
    await deleteCharacterImagesByCharacterId(characterId)
  }

  return records.filter(record => !validCharacterIds.has(record.characterId)).length
}

export async function rollbackCharacterImageKeys(keys: string[]): Promise<void> {
  await rollbackWrittenCharacterImages(keys)
}
```

- [ ] **Step 4: Raise save limit and update sync delete cleanup**

Modify `lib/multi-character-storage.ts`:

```ts
export const MAX_CHARACTERS = 15;
```

Keep `deleteCharacterById()` sync. Do not import async repository helpers into it. Higher-level delete flows will call `deleteCharacterSave()` from the new boundary.

- [ ] **Step 5: Run storage tests**

Run:

```bash
pnpm vitest run tests/unit/character-save-storage.test.ts tests/unit/storage-migration.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add character/storage/character-save-storage.ts lib/multi-character-storage.ts tests/unit/character-save-storage.test.ts tests/unit/storage-migration.test.ts
git commit -m "feat: add character save storage boundary"
```

## Task 4: Use Storage Boundary In Character Management

**Files:**
- Modify: `hooks/use-character-management.ts`
- Modify: `tests/unit/imported-save-creation.test.tsx`
- Add: `tests/unit/character-management-image-storage.test.tsx`

- [ ] **Step 1: Write failing hook tests for image-aware import and duplicate**

Create `tests/unit/character-management-image-storage.test.tsx`:

```ts
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultSheetData } from '@/lib/default-sheet-data'
import type { SheetData } from '@/lib/sheet-data'
import { CURRENT_SCHEMA_VERSION } from '@/lib/sheet-schema-version'
import { useSheetStore } from '@/lib/sheet-store'
import { useCharacterManagement } from '@/hooks/use-character-management'
import { CHARACTER_DATA_PREFIX, CHARACTER_LIST_KEY } from '@/lib/multi-character-storage'
import { clearAllCharacterImages, listCharacterImages } from '@/character/storage/character-image-repository'

const png = 'data:image/png;base64,aGVsbG8='

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
    localStorage.clear()
    await clearAllCharacterImages()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    useSheetStore.setState({ sheetData: { ...defaultSheetData } })
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
})
```

- [ ] **Step 2: Run the hook image tests and verify they fail**

Run:

```bash
pnpm vitest run tests/unit/character-management-image-storage.test.tsx
```

Expected: FAIL because `createImportedCharacterHandler` and `duplicateCharacterHandler` are sync and still use raw save/load helpers.

- [ ] **Step 3: Convert image-bearing character management flows to async**

Modify `hooks/use-character-management.ts` imports:

```ts
import {
  cleanupOrphanedCharacterImages,
  deleteCharacterSave,
  loadCharacterSheet,
  saveCharacterSheet,
} from '@/character/storage/character-save-storage'
import {
  prepareDuplicatedSheetForStorage,
  prepareImportedSheetForStorage,
  rollbackWrittenCharacterImages,
} from '@/character/storage/sheet-image-projection'
```

Change `activateCharacterData` to remain sync; change callers to await storage work before activation.

Change `switchToCharacter`:

```ts
const switchToCharacter = useCallback(async (characterId: string) => {
  try {
    const characterData = await loadCharacterSheet(characterId)
    if (characterData) {
      activateCharacterData(characterId, characterData)
      return true
    }
    alert('角色数据加载失败')
    return false
  } catch (error) {
    console.error(`[CharacterManagement] Error switching to character ${characterId}:`, error)
    alert('切换角色失败')
    return false
  }
}, [activateCharacterData])
```

Change `createImportedCharacterHandler` signature:

```ts
const createImportedCharacterHandler = useCallback(async (
  saveName: string,
  importedData: SheetData,
): Promise<boolean> => {
  assertCurrentSchemaImportedSheet(importedData)

  if (characterList.length >= MAX_CHARACTERS) {
    alert(`最多只能创建${MAX_CHARACTERS}个角色`)
    return false
  }

  const previousCharacterId = currentCharacterId
  const previousSheetData = useSheetStore.getState().sheetData
  let metadata: CharacterMetadata | null = null
  let writtenImageKeys: string[] = []

  try {
    metadata = addCharacterToMetadataList(saveName)
    if (!metadata) {
      alert('创建存档失败')
      return false
    }

    const prepared = await prepareImportedSheetForStorage(metadata.id, importedData)
    writtenImageKeys = prepared.writtenImageKeys
    saveCharacterById(metadata.id, prepared.storedSheet)
    activateCharacterData(metadata.id, prepared.runtimeSheet)
    setCharacterList(prev => [...prev, metadata as CharacterMetadata])
    return true
  } catch (error) {
    console.error(`[CharacterManagement] Error creating imported save:`, error)
    alert('创建存档失败')
    await rollbackWrittenCharacterImages(writtenImageKeys)
    if (metadata) removeCharacterFromMetadataList(metadata.id)
    setCurrentCharacterId(previousCharacterId)
    setActiveCharacterId(previousCharacterId)
    replaceSheetData(previousSheetData)
    return false
  }
}, [activateCharacterData, characterList.length, currentCharacterId, replaceSheetData])
```

Change `duplicateCharacterHandler` signature:

```ts
const duplicateCharacterHandler = useCallback(async (
  characterId: string,
  newSaveName: string,
): Promise<boolean> => {
  if (characterList.length >= MAX_CHARACTERS) {
    alert(`最多只能创建${MAX_CHARACTERS}个角色`)
    return false
  }

  let metadata: CharacterMetadata | null = null
  let writtenImageKeys: string[] = []

  try {
    const sourceData = await loadCharacterSheet(characterId)
    if (!sourceData) {
      alert('源角色数据不存在')
      return false
    }

    metadata = addCharacterToMetadataList(newSaveName)
    if (!metadata) {
      alert('复制角色失败')
      return false
    }

    const prepared = await prepareDuplicatedSheetForStorage(characterId, metadata.id, sourceData)
    writtenImageKeys = prepared.writtenImageKeys
    saveCharacterById(metadata.id, prepared.storedSheet)
    setCharacterList(prev => [...prev, metadata as CharacterMetadata])
    await switchToCharacter(metadata.id)
    return true
  } catch (error) {
    console.error(`[CharacterManagement] Error duplicating character:`, error)
    alert('复制角色失败')
    await rollbackWrittenCharacterImages(writtenImageKeys)
    if (metadata) removeCharacterFromMetadataList(metadata.id)
    return false
  }
}, [characterList.length, switchToCharacter])
```

Change `deleteCharacterHandler`:

```ts
await deleteCharacterSave(characterId)
```

Call this after metadata removal succeeds. Cleanup failure must log and not block deletion.

In the startup effect, await orphan image cleanup:

```ts
await cleanupOrphanedCharacterImages()
```

- [ ] **Step 4: Update callers that expect sync booleans**

Modify quick create/import call sites in `components/home-client-app.tsx` and `components/modals/character-management-modal.tsx` to `await` handler results. Example:

```ts
const success = await onCreateImportedCharacter(saveName, validation.data)
```

Update prop type:

```ts
onCreateImportedCharacter: (saveName: string, importedData: SheetData) => boolean | Promise<boolean>
```

- [ ] **Step 5: Run character management tests**

Run:

```bash
pnpm vitest run tests/unit/imported-save-creation.test.tsx tests/unit/character-management-image-storage.test.tsx tests/unit/quick-html-import.test.tsx tests/unit/character-management-modal-import.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add hooks/use-character-management.ts components/home-client-app.tsx components/modals/character-management-modal.tsx tests/unit/imported-save-creation.test.tsx tests/unit/character-management-image-storage.test.tsx tests/unit/quick-html-import.test.tsx tests/unit/character-management-modal-import.test.tsx
git commit -m "feat: route character management through image storage"
```

## Task 5: Autosave And Explicit Image Write Actions

**Files:**
- Create: `character/storage/character-image-actions.ts`
- Modify: `components/home-client-app.tsx`
- Modify: `components/character-sheet.tsx`
- Modify: `components/character-sheet-page-adventure-notes.tsx`
- Modify: `components/character-sheet-page-ranger-companion.tsx`
- Test: `tests/unit/home-autosave-image-storage.test.tsx`

- [ ] **Step 1: Write failing autosave invariant test**

Create `tests/unit/home-autosave-image-storage.test.tsx` using the existing home test mocking pattern:

```ts
import { describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import HomeClientApp from '@/components/home-client-app'
import { CHARACTER_DATA_PREFIX } from '@/lib/multi-character-storage'

vi.mock('@/lib/memory-monitor', () => ({
  memoryMonitor: {
    record: vi.fn(),
    getReport: vi.fn(() => ({ localStorageSizeKB: 0 })),
  },
}))

describe('home autosave image storage', () => {
  it('does not autosave embedded data URLs directly into character localStorage', async () => {
    localStorage.clear()
    render(<HomeClientApp />)

    await waitFor(() => {
      const characterKeys: string[] = []
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index)
        if (key?.startsWith(CHARACTER_DATA_PREFIX) && key !== 'dh_character_list') {
          characterKeys.push(key)
        }
      }
      expect(characterKeys.length).toBeGreaterThan(0)
    })

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key?.startsWith(CHARACTER_DATA_PREFIX) && key !== 'dh_character_list') {
        expect(localStorage.getItem(key) || '').not.toContain('data:image/')
      }
    }
  })
})
```

- [ ] **Step 2: Run the autosave test and verify current direct write is exposed**

Run:

```bash
pnpm vitest run tests/unit/home-autosave-image-storage.test.tsx
```

Expected before implementation: FAIL while autosave writes runtime `formData` directly. If this test needs existing home mocks, copy the mock setup from `tests/unit/home-announcements.test.tsx` and keep the invariant assertion unchanged: no `dh_character_*` payload may contain `data:image/`.

- [ ] **Step 3: Add explicit image actions**

Create `character/storage/character-image-actions.ts`:

```ts
import type { SheetData } from '@/lib/sheet-data'
import type { CharacterImageRole, CharacterSheetImageField } from './character-image-types'
import { characterImageKey, deleteCharacterImage, saveCharacterImage } from './character-image-repository'
import { dataUrlToBlob, isImageDataUrl } from './data-url'

const ROLE_TO_FIELD: Record<CharacterImageRole, CharacterSheetImageField> = {
  portrait: 'characterImage',
  companion: 'companionImage',
}

export async function setCharacterImageAsset(
  characterId: string,
  role: CharacterImageRole,
  imageDataUrl: string,
  sheetData: SheetData,
): Promise<SheetData> {
  if (!isImageDataUrl(imageDataUrl)) {
    throw new Error('Expected image data URL for character image write')
  }

  const blob = await dataUrlToBlob(imageDataUrl)
  const record = await saveCharacterImage({
    characterId,
    role,
    blob,
    mimeType: blob.type,
  })
  const field = ROLE_TO_FIELD[role]

  return {
    ...sheetData,
    [field]: imageDataUrl,
    imageAssets: {
      ...(sheetData.imageAssets ?? {}),
      [field]: {
        key: record.key,
        mimeType: record.mimeType,
      },
    },
  }
}

export async function deleteCharacterImageAsset(
  characterId: string,
  role: CharacterImageRole,
  sheetData: SheetData,
): Promise<SheetData> {
  const field = ROLE_TO_FIELD[role]
  await deleteCharacterImage(characterImageKey(characterId, role))

  const imageAssets = { ...(sheetData.imageAssets ?? {}) }
  delete imageAssets[field]

  return {
    ...sheetData,
    [field]: '',
    imageAssets,
  }
}
```

- [ ] **Step 4: Replace autosave direct localStorage write**

Modify `components/home-client-app.tsx` autosave effect:

```ts
useEffect(() => {
  if (!isLoading && currentCharacterId && formData) {
    const saveTimeout = setTimeout(() => {
      void saveCharacterSheet(currentCharacterId, formData)
        .then(() => {
          console.log(`[App] Auto-saved character: ${currentCharacterId}`)
        })
        .catch((error) => {
          console.error(`[App] Error auto-saving character ${currentCharacterId}:`, error)
          alert('自动保存失败')
        })
    }, 300)

    return () => clearTimeout(saveTimeout)
  }
}, [formData, currentCharacterId, isLoading])
```

Import:

```ts
import { saveCharacterSheet } from '@/character/storage/character-save-storage'
```

- [ ] **Step 5: Route page-level image uploads through actions**

For `components/character-sheet.tsx` and `components/character-sheet-page-adventure-notes.tsx`, pass `currentCharacterId` or a page-level `onCharacterImageChange` callback from `home-client-app.tsx`. The page handler must call:

```ts
const nextSheet = await setCharacterImageAsset(currentCharacterId, 'portrait', imageBase64, useSheetStore.getState().sheetData)
replaceSheetData(nextSheet)
```

For delete/empty image:

```ts
const nextSheet = await deleteCharacterImageAsset(currentCharacterId, 'portrait', useSheetStore.getState().sheetData)
replaceSheetData(nextSheet)
```

For `components/character-sheet-page-ranger-companion.tsx`, use role `companion`.

- [ ] **Step 6: Run autosave and image upload tests**

Run:

```bash
pnpm vitest run tests/unit/home-autosave-image-storage.test.tsx tests/unit/character-management-image-storage.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add character/storage/character-image-actions.ts components/home-client-app.tsx components/character-sheet.tsx components/character-sheet-page-adventure-notes.tsx components/character-sheet-page-ranger-companion.tsx tests/unit/home-autosave-image-storage.test.tsx
git commit -m "feat: save character images through explicit actions"
```

## Task 6: Export Preparation For JSON And HTML

**Files:**
- Modify: `lib/storage.ts`
- Modify: `hooks/use-export-handlers.ts`
- Modify: `lib/html-exporter.ts`
- Test: `tests/unit/character-export-image-preparation.test.ts`

- [ ] **Step 1: Write failing export tests**

Create `tests/unit/character-export-image-preparation.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultSheetData } from '@/lib/default-sheet-data'
import { exportCharacterData } from '@/lib/storage'
import { prepareSheetForExport, projectSheetForStorage } from '@/character/storage/sheet-image-projection'
import { clearAllCharacterImages } from '@/character/storage/character-image-repository'

const png = 'data:image/png;base64,aGVsbG8='

describe('character export image preparation', () => {
  beforeEach(async () => {
    await clearAllCharacterImages()
  })

  it('prepareSheetForExport restores base64 and strips imageAssets', async () => {
    const projected = await projectSheetForStorage('export-id', {
      ...structuredClone(defaultSheetData),
      characterImage: png,
    })

    const exported = await prepareSheetForExport(projected.storedSheet)

    expect(exported.characterImage).toMatch(/^data:image\/png;base64,/)
    expect((exported as any).imageAssets).toBeUndefined()
  })

  it('JSON export downloads portable sheet data', async () => {
    const projected = await projectSheetForStorage('export-id', {
      ...structuredClone(defaultSheetData),
      name: 'Export Hero',
      characterImage: png,
    })
    const createdUrls: Blob[] = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      createdUrls.push(blob as Blob)
      return 'blob:export'
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)

    await exportCharacterData(projected.storedSheet)

    const text = await createdUrls[0].text()
    expect(text).toContain('data:image/png;base64')
    expect(text).not.toContain('imageAssets')
  })
})
```

- [ ] **Step 2: Run export tests and verify they fail**

Run:

```bash
pnpm vitest run tests/unit/character-export-image-preparation.test.ts
```

Expected: FAIL because `exportCharacterData()` still stringifies raw form data.

- [ ] **Step 3: Update JSON export**

Modify `lib/storage.ts`:

```ts
import { prepareSheetForExport } from '@/character/storage/sheet-image-projection'
```

Inside `exportCharacterData`:

```ts
const portableData = await prepareSheetForExport(formData)
const dataStr = JSON.stringify(portableData, null, 2)
```

- [ ] **Step 4: Update HTML export payload**

Modify `lib/html-exporter.ts` so public export entrypoints prepare once before calling `generateFullHTML`:

```ts
import { prepareSheetForExport } from '@/character/storage/sheet-image-projection'
```

In `exportToHTML(formData, options)`:

```ts
const portableFormData = await prepareSheetForExport(formData)
const html = await generateFullHTML(portableFormData, options, progressCallback)
```

Make sure the embedded payload remains:

```ts
window.characterData = ${JSON.stringify(portableFormData, null, 2)};
```

Do not rely only on DOM image conversion.

- [ ] **Step 5: Run export tests**

Run:

```bash
pnpm vitest run tests/unit/character-export-image-preparation.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/storage.ts hooks/use-export-handlers.ts lib/html-exporter.ts tests/unit/character-export-image-preparation.test.ts
git commit -m "feat: export portable character images"
```

## Task 7: Limits, Render Safety, Reset, And Diagnostics

**Files:**
- Modify: `components/layout/bottom-dock.tsx`
- Modify: `components/ui/archive-manager-dropdown.tsx`
- Modify: `components/home-client-app.tsx`
- Modify: `components/modals/character-management-modal.tsx`
- Modify: `app/card-manager/page.tsx`
- Modify: `lib/memory-monitor.ts`
- Test: `tests/unit/character-save-limit-shortcuts.test.tsx`
- Test: `tests/unit/memory-monitor.test.ts`

- [ ] **Step 1: Write failing tests for limit/copy/invariant diagnostics**

Add to `tests/unit/memory-monitor.test.ts`:

```ts
import { memoryMonitor } from '@/lib/memory-monitor'

it('reports character save image payload violations without exposing content', () => {
  localStorage.clear()
  localStorage.setItem('dh_character_list', JSON.stringify({ characters: [], activeCharacterId: null }))
  localStorage.setItem('dh_character_bad', JSON.stringify({
    name: 'Secret Name',
    characterImage: 'data:image/png;base64,SECRET',
  }))

  const report = memoryMonitor.getReport()

  expect(report.characterStorage?.violations).toEqual([
    expect.objectContaining({
      key: 'dh_character_bad',
      containsEmbeddedImage: true,
    }),
  ])
  expect(JSON.stringify(report)).not.toContain('SECRET')
})
```

Create `tests/unit/character-save-limit-shortcuts.test.tsx`:

```ts
import { describe, expect, it } from 'vitest'
import { MAX_CHARACTERS } from '@/lib/multi-character-storage'

describe('character save limit and shortcuts', () => {
  it('sets the save limit to 15', () => {
    expect(MAX_CHARACTERS).toBe(15)
  })
})
```

- [ ] **Step 2: Run tests and verify failures**

Run:

```bash
pnpm vitest run tests/unit/memory-monitor.test.ts tests/unit/character-save-limit-shortcuts.test.tsx
```

Expected: FAIL until diagnostics shape and limit changes are complete.

- [ ] **Step 3: Remove hard-coded dock limits**

Modify `components/layout/bottom-dock.tsx`:

```ts
import { MAX_CHARACTERS } from '@/lib/multi-character-storage'
```

Delete local:

```ts
const MAX_CHARACTERS = 10
```

- [ ] **Step 4: Clarify shortcut copy**

Modify `components/home-client-app.tsx` and `components/ui/archive-manager-dropdown.tsx` visible helper text:

```tsx
Ctrl+1-9/0 切换前 10 个存档
```

Keep current shortcut behavior unchanged.

- [ ] **Step 5: Remove render-time storage load in character management modal**

Modify `components/modals/character-management-modal.tsx`:

```ts
import { MAX_CHARACTERS } from '@/lib/multi-character-storage'
```

Remove `loadCharacterById` import and render-time calls. In row rendering, use metadata fields:

```tsx
<div className="text-sm text-muted-foreground">
  {character.saveName}
</div>
```

Do not add a character-name preview migration in this task. Do not call storage-loading functions from JSX render.

- [ ] **Step 6: Clear character images during full reset**

Modify `app/card-manager/page.tsx` imports:

```ts
import { clearAllCharacterImages } from '@/character/storage/character-image-repository'
```

In the full local data reset flow:

```ts
await cardStore.resetSystem()
await clearAllCharacterImages()
localStorage.clear()
```

- [ ] **Step 7: Add memory monitor character diagnostics**

Modify `lib/memory-monitor.ts` report type:

```ts
characterStorage?: {
  totalKB: number
  saves: Array<{
    key: string
    totalKB: number
    imageKB: number
    largestFields: Array<{ field: string; kb: number }>
  }>
  violations: Array<{
    key: string
    containsEmbeddedImage: boolean
  }>
}
```

Implementation rule: compute sizes from serialized JSON and top-level field lengths only. Never include field values in the report.

- [ ] **Step 8: Run tests**

Run:

```bash
pnpm vitest run tests/unit/memory-monitor.test.ts tests/unit/character-save-limit-shortcuts.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add components/layout/bottom-dock.tsx components/ui/archive-manager-dropdown.tsx components/home-client-app.tsx components/modals/character-management-modal.tsx app/card-manager/page.tsx lib/memory-monitor.ts tests/unit/memory-monitor.test.ts tests/unit/character-save-limit-shortcuts.test.tsx
git commit -m "feat: align character save limit and cleanup"
```

## Task 8: Final Invariant And Regression Suite

**Files:**
- Add: `tests/unit/character-save-storage-invariant.test.ts`
- Modify: any tests broken by async handler signatures.

- [ ] **Step 1: Add localStorage invariant test**

Create `tests/unit/character-save-storage-invariant.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { defaultSheetData } from '@/lib/default-sheet-data'
import { CHARACTER_DATA_PREFIX, CHARACTER_LIST_KEY, addCharacterToMetadataList, loadCharacterList } from '@/lib/multi-character-storage'
import { saveCharacterSheet } from '@/character/storage/character-save-storage'
import { clearAllCharacterImages } from '@/character/storage/character-image-repository'

const png = 'data:image/png;base64,aGVsbG8='

function characterStorageValues(): string[] {
  const values: string[] = []
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key?.startsWith(CHARACTER_DATA_PREFIX) && key !== CHARACTER_LIST_KEY) {
      values.push(localStorage.getItem(key) || '')
    }
  }
  return values
}

describe('character save storage invariant', () => {
  beforeEach(async () => {
    localStorage.clear()
    await clearAllCharacterImages()
  })

  it('does not store data image payloads in character localStorage records', async () => {
    addCharacterToMetadataList('Invariant Save')
    const characterId = loadCharacterList().characters[0].id

    await saveCharacterSheet(characterId, {
      ...structuredClone(defaultSheetData),
      characterImage: png,
      companionImage: png,
    })

    expect(characterStorageValues()).not.toHaveLength(0)
    for (const value of characterStorageValues()) {
      expect(value).not.toContain('data:image/')
    }
  })
})
```

- [ ] **Step 2: Run focused regression suite**

Run:

```bash
pnpm vitest run tests/unit/character-image-repository.test.ts tests/unit/sheet-image-projection.test.ts tests/unit/character-save-storage.test.ts tests/unit/character-management-image-storage.test.tsx tests/unit/imported-save-creation.test.tsx tests/unit/character-export-image-preparation.test.ts tests/unit/character-save-storage-invariant.test.ts tests/unit/memory-monitor.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run full unit suite**

Run:

```bash
pnpm test:unit
```

Expected: PASS.

- [ ] **Step 4: Run build**

Run:

```bash
pnpm build
```

Expected: PASS. Do not start `pnpm dev`.

- [ ] **Step 5: Search for remaining direct character storage writes**

Run:

```bash
rg -n "localStorage\\.setItem\\(`dh_character_|localStorage\\.setItem\\('dh_character_|localStorage\\.setItem\\(\"dh_character_" app components hooks lib character tests
```

Expected: no production direct writes outside `lib/multi-character-storage.ts` and test setup.

- [ ] **Step 6: Search for unprepared export payloads**

Run:

```bash
rg -n "JSON\\.stringify\\(formData|window\\.characterData = \\$\\{JSON\\.stringify\\(formData" lib hooks components app
```

Expected: no matches that bypass `prepareSheetForExport`.

- [ ] **Step 7: Commit final invariant coverage**

```bash
git add tests/unit/character-save-storage-invariant.test.ts
git commit -m "test: cover character save storage invariant"
```

## Final Review Checklist

- [ ] Every normal `dh_character_*` stored payload except `dh_character_list` lacks `data:image/`.
- [ ] Exported JSON and HTML still contain portable base64 image data when images exist.
- [ ] Imported `imageAssets` is ignored.
- [ ] Duplicate image records use the target character id.
- [ ] Delete and full reset attempt character image cleanup.
- [ ] `MAX_CHARACTERS` is 15 everywhere.
- [ ] `Ctrl+1..9/0` still targets only the first 10 saves.
- [ ] No component calls a write-capable storage load from JSX render.
- [ ] No dev server was started.
