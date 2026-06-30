# Unified Character Image Startup Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace legacy lazy image migration with one startup-only migration that moves all embedded character save images into IndexedDB before users can create, import, load, or switch saves.

**Architecture:** Add a startup-only migration command in the Character Save Storage Boundary and remove lazy embedded-image repair from the normal load path. The command scans every `Character Save`, projects embedded image fields into `Character Image Assets`, rewrites each stored sheet without embedded image payloads, and writes a marker only after the full scan succeeds. `useCharacterManagement` blocks normal loading until this migration succeeds; after startup, `loadCharacterSheet()` treats leftover embedded image payloads as an invariant violation instead of silently migrating them.

**Tech Stack:** Next.js, React hooks, TypeScript, localStorage, Dexie/fake-indexeddb, Vitest, React Testing Library.

---

## Scope

This is a medium-small change in file count, but it touches a sensitive startup boundary.

The expected production write set is:

- Create: `character/storage/character-image-migration.ts`
- Modify: `character/storage/character-save-storage.ts`
- Modify: `hooks/use-character-management.ts`
- Modify: `components/home-client-app.tsx`

The expected test write set is:

- Create: `tests/unit/character-image-startup-migration.test.ts`
- Modify: `tests/unit/character-save-storage.test.ts`
- Modify: `tests/unit/character-management-image-storage.test.tsx`
- Modify: any existing HomeClientApp hook mocks that need the new `migrationError` return value.

Out of scope:

- Moving all character saves to IndexedDB.
- Changing shortcut behavior beyond existing first-10 behavior.
- Changing JSON/HTML export contracts.
- Retrying migration in the background after the app opens.
- Keeping a lazy migration fallback in `loadCharacterSheet()`.

---

## File Structure

### `character/storage/character-image-migration.ts`

Owns startup image asset migration for all Character Saves. This file may read and write `dh_character_*` records because it is inside the Character Save Storage Boundary.

Migration atomicity is per Character Save, not a browser-wide transaction. If one save fails after earlier saves were already migrated, the completion marker is not written; the next startup reruns and skips already-migrated saves. Within a single save, the command must restore previous image records and the previous stored sheet when projection or sheet rewrite fails.

Public API:

```ts
export const CHARACTER_IMAGE_ASSET_MIGRATION_KEY = 'dh_character-image-asset-migration-version'
export const CHARACTER_IMAGE_ASSET_MIGRATION_VERSION = '1'

export interface CharacterImageStartupMigrationResult {
  scannedCount: number
  migratedCount: number
  skippedCount: number
}

export async function migrateCharacterSaveImagesToAssets(): Promise<CharacterImageStartupMigrationResult>
```

### `character/storage/character-save-storage.ts`

Keeps normal load and switch behavior image-aware, but no longer performs legacy embedded-image migration. `loadCharacterSheet()` still applies synchronous `SheetData` schema migration and runtime hydration, but if the stored sheet still contains `data:image/` after startup migration should have run, it throws a clear invariant error instead of calling `projectSheetForStorage()`.

### `hooks/use-character-management.ts`

Runs startup migration in this order:

1. `migrateToMultiCharacterStorage()`
2. `await migrateCharacterSaveImagesToAssets()`
3. mark migration completed
4. load list, cleanup orphans, activate character

Adds a blocking error return:

```ts
migrationError: Error | null
```

### `components/home-client-app.tsx`

Shows a blocking migration failure screen when `migrationError` exists. It must not render the normal sheet/dock/actions while startup migration failed.

### `tests/unit/character-image-startup-migration.test.ts`

Tests the migration command directly.

### `tests/unit/character-management-image-storage.test.tsx`

Adds startup integration tests that prove legacy embedded images are migrated before the active character is loaded and before `isLoading` becomes false.

---

## Task 1: Startup Migration Command

**Files:**
- Create: `character/storage/character-image-migration.ts`
- Test: `tests/unit/character-image-startup-migration.test.ts`

- [ ] **Step 1: Write failing tests for full startup migration**

Create `tests/unit/character-image-startup-migration.test.ts`:

```ts
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
    if (key?.startsWith(CHARACTER_DATA_PREFIX) && key !== CHARACTER_LIST_KEY) {
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

  it('migrates embedded images for every character save before writing the completion marker', async () => {
    const firstId = createStoredCharacter('First', { name: 'First Hero', characterImage: png })
    const secondId = createStoredCharacter('Second', { name: 'Second Hero', companionImage: png })

    const result = await migrateCharacterSaveImagesToAssets()

    expect(result).toEqual({
      scannedCount: 2,
      migratedCount: 2,
      skippedCount: 0,
    })
    expect(localStorage.getItem(CHARACTER_IMAGE_ASSET_MIGRATION_KEY)).toBe(CHARACTER_IMAGE_ASSET_MIGRATION_VERSION)
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
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm vitest run tests/unit/character-image-startup-migration.test.ts
```

Expected: FAIL because `character/storage/character-image-migration.ts` does not exist.

- [ ] **Step 3: Implement migration command**

Create `character/storage/character-image-migration.ts`:

```ts
import type { SheetData } from '@/lib/sheet-data'
import {
  CHARACTER_DATA_PREFIX,
  loadCharacterList,
} from '@/lib/multi-character-storage'
import { migrateSheetData } from '@/lib/sheet-data-migration'
import { projectSheetForStorage } from './sheet-image-projection'
import {
  characterImageKey,
  deleteCharacterImage,
  getCharacterImage,
  saveCharacterImage,
} from './character-image-repository'
import type { CharacterImageRecord, CharacterImageRole, CharacterSheetImageField } from './character-image-types'
import { isImageDataUrl } from './data-url'

export const CHARACTER_IMAGE_ASSET_MIGRATION_KEY = 'dh_character-image-asset-migration-version'
export const CHARACTER_IMAGE_ASSET_MIGRATION_VERSION = '1'

const IMAGE_FIELDS: Array<{ field: CharacterSheetImageField; role: CharacterImageRole }> = [
  { field: 'characterImage', role: 'portrait' },
  { field: 'companionImage', role: 'companion' },
]

export interface CharacterImageStartupMigrationResult {
  scannedCount: number
  migratedCount: number
  skippedCount: number
}

function characterStorageKey(characterId: string): string {
  return `${CHARACTER_DATA_PREFIX}${characterId}`
}

function hasEmbeddedCharacterImage(sheetData: SheetData): boolean {
  return IMAGE_FIELDS.some(({ field }) => isImageDataUrl(sheetData[field]))
}

function hasAnyEmbeddedCharacterImagePayload(): boolean {
  const list = loadCharacterList()

  for (const character of list.characters) {
    const raw = localStorage.getItem(characterStorageKey(character.id))
    if (raw?.includes('data:image/')) return true
  }

  return false
}

function writeStoredCharacterSheet(characterId: string, sheetData: SheetData): void {
  localStorage.setItem(characterStorageKey(characterId), JSON.stringify(sheetData))
}

async function snapshotWritableImageRecords(
  characterId: string,
  sheetData: SheetData,
): Promise<Map<string, CharacterImageRecord | null>> {
  const snapshots = new Map<string, CharacterImageRecord | null>()

  for (const { field, role } of IMAGE_FIELDS) {
    if (!isImageDataUrl(sheetData[field])) continue
    const key = characterImageKey(characterId, role)
    snapshots.set(key, await getCharacterImage(key))
  }

  return snapshots
}

async function restoreImageSnapshots(snapshots: Map<string, CharacterImageRecord | null>): Promise<void> {
  await Promise.all([...snapshots.entries()].map(async ([key, previous]) => {
    if (!previous) {
      await deleteCharacterImage(key)
      return
    }

    await saveCharacterImage({
      characterId: previous.characterId,
      role: previous.role,
      blob: previous.blob,
      mimeType: previous.mimeType,
    })
  }))
}

export async function migrateCharacterSaveImagesToAssets(): Promise<CharacterImageStartupMigrationResult> {
  const marker = localStorage.getItem(CHARACTER_IMAGE_ASSET_MIGRATION_KEY)
  if (marker === CHARACTER_IMAGE_ASSET_MIGRATION_VERSION && !hasAnyEmbeddedCharacterImagePayload()) {
    return { scannedCount: 0, migratedCount: 0, skippedCount: 0 }
  }

  const list = loadCharacterList()
  let migratedCount = 0
  let skippedCount = 0

  for (const character of list.characters) {
    const storageKey = characterStorageKey(character.id)
    const previousRaw = localStorage.getItem(storageKey)

    if (!previousRaw) {
      skippedCount += 1
      continue
    }

    const parsed = JSON.parse(previousRaw)
    const migrated = migrateSheetData(parsed)

    if (!hasEmbeddedCharacterImage(migrated)) {
      skippedCount += 1
      continue
    }

    const snapshots = await snapshotWritableImageRecords(character.id, migrated)
    let projection: Awaited<ReturnType<typeof projectSheetForStorage>>

    try {
      projection = await projectSheetForStorage(character.id, migrated)
    } catch (error) {
      try {
        await restoreImageSnapshots(snapshots)
      } catch (rollbackError) {
        console.error(`[CharacterImageMigration] Failed to rollback images for ${character.id}:`, rollbackError)
      }

      throw error
    }

    try {
      writeStoredCharacterSheet(character.id, projection.storedSheet)
      migratedCount += 1
    } catch (error) {
      try {
        localStorage.setItem(storageKey, previousRaw)
      } catch (rollbackError) {
        console.error(`[CharacterImageMigration] Failed to restore character ${character.id}:`, rollbackError)
      }

      try {
        await restoreImageSnapshots(snapshots)
      } catch (rollbackError) {
        console.error(`[CharacterImageMigration] Failed to rollback images for ${character.id}:`, rollbackError)
      }

      throw error
    }
  }

  localStorage.setItem(CHARACTER_IMAGE_ASSET_MIGRATION_KEY, CHARACTER_IMAGE_ASSET_MIGRATION_VERSION)

  return {
    scannedCount: list.characters.length,
    migratedCount,
    skippedCount,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm vitest run tests/unit/character-image-startup-migration.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add character/storage/character-image-migration.ts tests/unit/character-image-startup-migration.test.ts
git commit -m "feat: add startup character image migration"
```

---

## Task 2: Migration Failure And Idempotency Coverage

**Files:**
- Modify: `tests/unit/character-image-startup-migration.test.ts`
- Modify: `character/storage/character-image-migration.ts` only if tests expose defects.

- [ ] **Step 1: Add failing rollback and marker tests**

Append to `tests/unit/character-image-startup-migration.test.ts`:

```ts
  it('does not write the completion marker and rolls back image assets when a stored sheet rewrite fails', async () => {
    const characterId = createStoredCharacter('Rollback', {
      name: 'Rollback Hero',
      characterImage: png,
    })
    const storageKey = `${CHARACTER_DATA_PREFIX}${characterId}`
    const previousRaw = localStorage.getItem(storageKey)
    const originalSetItem = Storage.prototype.setItem

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(key: string, value: string) {
      if (key === storageKey && value !== previousRaw) {
        throw new Error('forced storage failure')
      }
      return originalSetItem.call(this, key, value)
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
```

- [ ] **Step 2: Run tests**

Run:

```bash
pnpm vitest run tests/unit/character-image-startup-migration.test.ts
```

Expected: PASS. If rollback fails, fix `migrateCharacterSaveImagesToAssets()` before continuing.

- [ ] **Step 3: Commit**

```bash
git add character/storage/character-image-migration.ts tests/unit/character-image-startup-migration.test.ts
git commit -m "test: cover startup image migration retry behavior"
```

---

## Task 3: Remove Lazy Load Migration

**Files:**
- Modify: `character/storage/character-save-storage.ts`
- Test: `tests/unit/character-save-storage.test.ts`

- [ ] **Step 1: Add failing load guard test**

Add this test to `tests/unit/character-save-storage.test.ts` after `loads and hydrates saved image references`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm vitest run tests/unit/character-save-storage.test.ts
```

Expected: FAIL because `loadCharacterSheet()` still projects embedded image payloads and writes image assets.

- [ ] **Step 3: Remove lazy projection from load**

Modify `character/storage/character-save-storage.ts`.

Add this helper near the existing `IMAGE_FIELDS` helpers:

```ts
function assertNoEmbeddedCharacterImages(characterId: string, sheetData: SheetData): void {
  const embeddedField = IMAGE_FIELDS.find(({ field }) => isImageDataUrl(sheetData[field]))?.field
  if (!embeddedField) return

  throw new Error(
    `Embedded character images must be migrated at startup before loading character ${characterId}: ${embeddedField}`,
  )
}
```

Replace `loadCharacterSheet()` with:

```ts
export async function loadCharacterSheet(characterId: string): Promise<SheetData | null> {
  const raw = localStorage.getItem(`${CHARACTER_DATA_PREFIX}${characterId}`)
  if (!raw) return null

  const parsed = JSON.parse(raw)
  const migrated = migrateSheetData(parsed)
  assertNoEmbeddedCharacterImages(characterId, migrated)
  return await hydrateSheetForRuntime(migrated)
}
```

This intentionally keeps synchronous `SheetData` schema migration in the load path, but removes the async Image Asset Migration fallback. Startup migration is now the only normal path that moves legacy embedded image payloads into IndexedDB.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm vitest run tests/unit/character-save-storage.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add character/storage/character-save-storage.ts tests/unit/character-save-storage.test.ts
git commit -m "refactor: remove lazy character image migration"
```

---

## Task 4: Startup Integration And Blocking Failure UI

**Files:**
- Modify: `hooks/use-character-management.ts`
- Modify: `components/home-client-app.tsx`
- Modify: existing HomeClientApp hook mocks if TypeScript or tests require `migrationError`.
- Test: `tests/unit/character-management-image-storage.test.tsx`

- [ ] **Step 1: Add failing startup integration tests**

Add imports to `tests/unit/character-management-image-storage.test.tsx`:

```ts
import {
  CHARACTER_IMAGE_ASSET_MIGRATION_KEY,
  CHARACTER_IMAGE_ASSET_MIGRATION_VERSION,
} from '@/character/storage/character-image-migration'
import { CHARACTER_DATA_PREFIX } from '@/lib/multi-character-storage'
```

Add this test:

```ts
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
```

- [ ] **Step 2: Add failing migration failure test**

Add this test to `tests/unit/character-management-image-storage.test.tsx`:

```ts
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

  const originalSetItem = Storage.prototype.setItem
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(key: string, value: string) {
    if (key === storageKey && value !== previousRaw) {
      throw new Error('forced startup migration failure')
    }
    return originalSetItem.call(this, key, value)
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
pnpm vitest run tests/unit/character-management-image-storage.test.tsx
```

Expected: FAIL because startup image migration is not integrated and `migrationError` does not exist.

- [ ] **Step 4: Integrate startup migration in hook**

Modify `hooks/use-character-management.ts`.

Add import:

```ts
import { migrateCharacterSaveImagesToAssets } from '@/character/storage/character-image-migration'
```

Add state after `isMigrationCompleted`:

```ts
const [migrationError, setMigrationError] = useState<Error | null>(null)
```

Replace the migration effect body with:

```ts
useEffect(() => {
  if (!isClient) return

  const performMigration = async () => {
    try {
      console.log('[CharacterManagement] Starting data migration check...')
      migrateToMultiCharacterStorage()
      const imageMigrationResult = await migrateCharacterSaveImagesToAssets()
      if (imageMigrationResult.migratedCount > 0) {
        console.log(`[CharacterManagement] Migrated ${imageMigrationResult.migratedCount} character image saves`)
      }
      setMigrationError(null)
      setIsMigrationCompleted(true)
      console.log('[CharacterManagement] Migration completed successfully')
    } catch (error) {
      console.error('[CharacterManagement] Migration failed:', error)
      setMigrationError(error instanceof Error ? error : new Error(String(error)))
      setIsMigrationCompleted(false)
      setIsLoading(false)
    }
  }

  void performMigration()
}, [isClient])
```

In the hook return object, include:

```ts
migrationError,
```

- [ ] **Step 5: Add blocking migration error UI**

Modify `components/home-client-app.tsx`.

Destructure the hook return:

```ts
const {
  currentCharacterId,
  characterList,
  isLoading,
  migrationError,
  ...
} = useCharacterManagement(...)
```

Add this block after the `!isClient` loading block and before the existing `isLoading` block:

```tsx
if (migrationError) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="max-w-lg rounded-lg border border-red-200 bg-red-50 p-6 text-red-900">
        <h1 className="text-xl font-semibold">存档图片迁移失败</h1>
        <p className="mt-3 text-sm leading-6">
          为了避免旧图片继续占用 localStorage，应用需要先完成一次存档图片迁移。当前迁移失败，已停止加载角色存档。
        </p>
        <p className="mt-3 break-words rounded bg-white/70 p-3 text-left text-xs">
          {migrationError.message}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
        >
          重新加载并重试
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Run integration tests**

Run:

```bash
pnpm vitest run tests/unit/character-management-image-storage.test.tsx tests/unit/home-autosave-image-storage.test.tsx tests/unit/imported-save-creation.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add hooks/use-character-management.ts components/home-client-app.tsx tests/unit/character-management-image-storage.test.tsx
git commit -m "feat: run character image migration at startup"
```

---

## Task 5: Final Invariants And Regression

**Files:**
- Modify tests only if async hook return shape causes mock compile failures.

- [ ] **Step 1: Run focused image storage suite**

Run:

```bash
pnpm vitest run tests/unit/character-image-startup-migration.test.ts tests/unit/character-image-repository.test.ts tests/unit/sheet-image-projection.test.ts tests/unit/character-save-storage.test.ts tests/unit/character-management-image-storage.test.tsx tests/unit/home-autosave-image-storage.test.tsx tests/unit/imported-save-creation.test.tsx tests/unit/character-export-image-preparation.test.ts tests/unit/character-save-storage-invariant.test.ts tests/unit/memory-monitor.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full unit suite**

Run:

```bash
pnpm test:unit
```

Expected: PASS.

- [ ] **Step 3: Run build**

Run:

```bash
pnpm build
```

Expected: PASS. Do not run `pnpm dev`.

If `pnpm build` regenerates `lib/embedded-styles.ts` with timestamp/CSS artifact churn unrelated to this migration, restore that file before committing any follow-up:

```bash
git restore lib/embedded-styles.ts
```

- [ ] **Step 4: Search for remaining lazy-only migration assumptions**

Run:

```bash
rg -n "projectSheetForStorage\\(|loadCharacterSheet\\(|migrateCharacterSaveImagesToAssets|CHARACTER_IMAGE_ASSET_MIGRATION" character hooks components lib tests
```

Expected:

- `migrateCharacterSaveImagesToAssets()` is the only production path that migrates legacy embedded character image payloads into IndexedDB.
- `loadCharacterSheet()` does not call `projectSheetForStorage()` and does not write IndexedDB or localStorage as an embedded-image repair path.
- Startup migration is called from `use-character-management.ts` before character list loading and activation.
- Tests cover startup migration, blocking failure, stale marker retry, projection rollback, and load-time fast failure for leftover embedded image payloads.

- [ ] **Step 5: Search for embedded image storage invariant**

Run:

```bash
rg -n 'localStorage\\.setItem\\(`dh_character_|localStorage\\.setItem\\('\''dh_character_|localStorage\\.setItem\\("dh_character_' app components hooks lib character tests
```

Expected: no production direct writes outside storage boundary/helper modules; test setup matches are acceptable.

- [ ] **Step 6: Commit any test-only mock fixes**

If Step 1-5 required only mock/type updates, commit them:

```bash
git add tests components hooks character lib
git commit -m "test: verify startup image migration invariants"
```

If there were no changes, do not create an empty commit.

---

## Risks And Mitigations

- **Startup blocking risk:** Migration failure must not open the app. Mitigation: `migrationError` blocks HomeClientApp before normal sheet UI renders.
- **Partial migration risk:** Do not write marker until every listed save is scanned. Per-save failure restores the original stored payload and restores or deletes image records touched by that save. Earlier successfully migrated saves remain migrated; the missing marker makes the next startup retry and skip them.
- **Stale marker risk:** Marker alone is not trusted. If marker exists but any listed save still contains `data:image/`, migration reruns.
- **Metadata churn risk:** The migration writes only the stored sheet payload and does not call `saveCharacterById()`, so `lastModified` is not changed by background migration.
- **Performance risk:** Maximum normal scope is 20 saves and two image fields per save. Startup blocking is acceptable because it prevents localStorage quota failure before users can create/import more saves.

---

## Self-Review

- Spec coverage: The plan moves legacy embedded image payloads for all saves at startup, blocks user actions until completion, removes load-time lazy migration, and covers marker/retry/failure behavior.
- Placeholder scan: No TBD/TODO placeholders remain.
- Type consistency: The migration API is `migrateCharacterSaveImagesToAssets(): Promise<CharacterImageStartupMigrationResult>` and the hook returns `migrationError: Error | null`.
- Scope check: This is one focused storage-boundary migration. It does not include whole-save IndexedDB migration or shortcut expansion.
