# Imported Save Creation Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make JSON import, save-management HTML import, and quick HTML import create character saves through one Imported Save Creation path.

**Architecture:** Keep file acquisition and source parsing where they are. Keep validation and migration in `validateAndProcessCharacterData()` / `migrateSheetData()`. Add one shared imported-save creation action in `useCharacterManagement`, backed by a shared activation helper used by both loaded-save switching and imported-save creation.

**Tech Stack:** Next.js 15, React 19, Zustand, TypeScript, Vitest, happy-dom, `@testing-library/react`.

---

## File Structure

- Modify: `hooks/use-character-management.ts`
  - Add private `activateCharacterData(characterId, data)`.
  - Add private strict imported-sheet assertion.
  - Add public `createImportedCharacterHandler(saveName, importedData)`.
  - Refactor `switchToCharacter()` to call `activateCharacterData()` after `loadCharacterById()`.

- Modify: `components/modals/character-management-modal.tsx`
  - Remove local `onImportData()` and unused imports.
  - Accept `onCreateImportedCharacter` prop.
  - Use shared imported-save creation action after JSON/HTML validation succeeds.
  - Preserve success/warning messages and source-specific wording.

- Modify: `app/page.tsx`
  - Pull `createImportedCharacterHandler` from `useCharacterManagement`.
  - Use it in quick HTML import instead of `createNewCharacterHandler()` + `setFormData(result.data)`.
  - Change quick HTML default save name suffix from `(HTML导入)` to `(导入)`.

- Modify: `tests/unit/import-regression-baseline.test.ts`
  - Strengthen JSON/HTML validation path assertions around `inventory_cards` and `includePageThreeInExport`.

- Create: `tests/unit/imported-save-creation.test.tsx`
  - Hook-level orchestration tests for Imported Save Creation.

- Modify: `CLAUDE.md`
  - Replace stale import guidance mentioning `lib/storage.ts` / `importCharacterDataForMultiCharacter()`.

---

### Task 1: Strengthen Import Validation Regression Tests

**Files:**
- Modify: `tests/unit/import-regression-baseline.test.ts`

- [ ] **Step 1: Update the existing JSON/HTML same-path test fixture**

In `tests/unit/import-regression-baseline.test.ts`, update the first test's `raw` object to include legacy page visibility input:

```ts
const raw = importCandidate({
  focused_card_ids: ['card-domain-1'],
  agility: { checked: true, value: '+1' },
  inventory_cards: undefined,
  includePageThreeInExport: true,
})
```

- [ ] **Step 2: Add assertions for current-schema import output**

In the same test, after the existing `pageVisibility` expectations, add:

```ts
expect(jsonResult.data?.pageVisibility).toEqual({
  rangerCompanion: true,
  armorTemplate: false,
  adventureNotes: false,
})
expect(htmlResult.data?.pageVisibility).toEqual({
  rangerCompanion: true,
  armorTemplate: false,
  adventureNotes: false,
})
expect(jsonResult.data?.inventory_cards).toHaveLength(20)
expect(htmlResult.data?.inventory_cards).toHaveLength(20)
expect('includePageThreeInExport' in (jsonResult.data as any)).toBe(false)
expect('includePageThreeInExport' in (htmlResult.data as any)).toBe(false)
```

Remove or update any earlier expectation in that same test that expected `rangerCompanion: false`; the legacy input now deliberately expects `true`.

- [ ] **Step 3: Run the focused regression test**

Run:

```bash
npm run test:run -- tests/unit/import-regression-baseline.test.ts
```

Expected: PASS. This task documents already-supported migration behavior before the hook refactor.

- [ ] **Step 4: Commit**

```bash
git add tests/unit/import-regression-baseline.test.ts
git commit -m "test: strengthen import migration regression"
```

---

### Task 2: Add Hook-Level Imported Save Creation Failing Tests

**Files:**
- Create: `tests/unit/imported-save-creation.test.tsx`

- [ ] **Step 1: Create the hook test file**

Create `tests/unit/imported-save-creation.test.tsx` with this content:

```tsx
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
    ...defaultSheetData,
    ...overrides,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    name: overrides.name ?? 'Imported Kaka',
    pageVisibility: overrides.pageVisibility ?? {
      rangerCompanion: true,
      armorTemplate: false,
      adventureNotes: false,
    },
    inventory_cards: overrides.inventory_cards ?? defaultSheetData.inventory_cards,
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

  it('throws before creating metadata when imported data is not current schema', async () => {
    const { result } = await renderManagementHook()
    const beforeList = JSON.parse(localStorage.getItem(CHARACTER_LIST_KEY) || '{}')
    const legacyData = {
      ...defaultSheetData,
      schemaVersion: 1,
      hope: [true, false],
      includePageThreeInExport: true,
    } as any

    expect(() => {
      act(() => {
        result.current.createImportedCharacterHandler('Bad Import', legacyData)
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
    const storedValues: string[] = []
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key) storedValues.push(localStorage.getItem(key) || '')
    }
    expect(storedValues.some(value => value.includes('Save Failure Hero'))).toBe(false)
    setItemSpy.mockRestore()
  })
})
```

- [ ] **Step 2: Run the new hook test and verify it fails**

Run:

```bash
npm run test:run -- tests/unit/imported-save-creation.test.tsx
```

Expected: FAIL because `createImportedCharacterHandler` does not exist yet. If the first failure is an unrelated test-environment issue, fix only the test harness setup needed to make the missing handler the next failure.

- [ ] **Step 3: Do not commit yet**

Leave the failing test uncommitted until Task 3 implements the hook action.

---

### Task 3: Implement Shared Imported Save Creation In The Hook

**Files:**
- Modify: `hooks/use-character-management.ts`
- Test: `tests/unit/imported-save-creation.test.tsx`

- [ ] **Step 1: Update imports**

In `hooks/use-character-management.ts`, update imports to include the schema version and delete helper:

```ts
import { CURRENT_SCHEMA_VERSION } from '@/lib/sheet-schema-version'
```

Ensure the existing multi-character storage import includes `deleteCharacterById`:

```ts
import {
  migrateToMultiCharacterStorage,
  loadCharacterList,
  loadCharacterById,
  saveCharacterById,
  setActiveCharacterId,
  getActiveCharacterId,
  createNewCharacter,
  addCharacterToMetadataList,
  removeCharacterFromMetadataList,
  updateCharacterInMetadataList,
  deleteCharacterById,
  MAX_CHARACTERS,
  cleanupOrphanedCharacterData
} from '@/lib/multi-character-storage'
```

- [ ] **Step 2: Add strict imported-sheet assertion helpers**

Above `export function useCharacterManagement(...)`, add:

```ts
function assertCurrentSchemaImportedSheetData(data: SheetData): void {
  if (!data || typeof data !== 'object') {
    throw new Error('Imported Save Creation requires current-schema SheetData')
  }

  if (data.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new Error('Imported Save Creation requires current-schema SheetData')
  }

  if (typeof data.hope !== 'number') {
    throw new Error('Imported Save Creation requires current-schema numeric hope')
  }

  if (!Array.isArray(data.inventory_cards)) {
    throw new Error('Imported Save Creation requires current-schema inventory_cards')
  }

  if (!data.pageVisibility || typeof data.pageVisibility !== 'object') {
    throw new Error('Imported Save Creation requires current-schema pageVisibility')
  }

  if (!data.equipment || typeof data.equipment !== 'object') {
    throw new Error('Imported Save Creation requires current-schema equipment')
  }

  if (!data.armorTemplate || typeof data.armorTemplate !== 'object') {
    throw new Error('Imported Save Creation requires current-schema armorTemplate')
  }

  if (!data.adventureNotes || typeof data.adventureNotes !== 'object') {
    throw new Error('Imported Save Creation requires current-schema adventureNotes')
  }

  if (!data.notebook || typeof data.notebook !== 'object') {
    throw new Error('Imported Save Creation requires current-schema notebook')
  }

  if ('includePageThreeInExport' in data) {
    throw new Error('Imported Save Creation does not accept deprecated includePageThreeInExport')
  }
}
```

Use `SheetData` from the existing import:

```ts
import { CharacterMetadata, SheetData } from '@/lib/sheet-data'
```

- [ ] **Step 3: Add shared activation helper inside the hook**

Inside `useCharacterManagement`, after `createFirstCharacter` and before `switchToCharacter`, add:

```ts
  const activateCharacterData = useCallback((characterId: string, characterData: SheetData) => {
    setCurrentCharacterId(characterId)
    setActiveCharacterId(characterId)
    replaceSheetData(characterData)
  }, [replaceSheetData])
```

- [ ] **Step 4: Refactor `switchToCharacter` to use the helper**

Replace the success block in `switchToCharacter`:

```ts
      if (characterData) {
        setCurrentCharacterId(characterId)
        setActiveCharacterId(characterId)
        replaceSheetData(characterData)
        console.log(`[CharacterManagement] Successfully switched to character: ${characterId}`)
      } else {
```

with:

```ts
      if (characterData) {
        activateCharacterData(characterId, characterData)
        console.log(`[CharacterManagement] Successfully switched to character: ${characterId}`)
      } else {
```

Update the dependency array from:

```ts
  }, [replaceSheetData])
```

to:

```ts
  }, [activateCharacterData])
```

- [ ] **Step 5: Add `createImportedCharacterHandler`**

Below `createNewCharacterHandler`, add:

```ts
  const createImportedCharacterHandler = useCallback((saveName: string, importedData: SheetData) => {
    assertCurrentSchemaImportedSheetData(importedData)

    let metadata: CharacterMetadata | null = null

    try {
      if (characterList.length >= MAX_CHARACTERS) {
        alert(`最多只能创建${MAX_CHARACTERS}个角色`)
        return false
      }

      console.log(`[CharacterManagement] Creating imported save: ${saveName}`)
      metadata = addCharacterToMetadataList(saveName)

      if (!metadata) {
        console.error('[CharacterManagement] Failed to create imported character metadata')
        alert('创建存档失败')
        return false
      }

      saveCharacterById(metadata.id, importedData)
      setCharacterList(prev => [...prev, metadata as CharacterMetadata])
      activateCharacterData(metadata.id, importedData)
      console.log(`[CharacterManagement] Successfully created imported save: ${metadata.id}`)
      return true
    } catch (error) {
      if (metadata) {
        try {
          removeCharacterFromMetadataList(metadata.id)
          deleteCharacterById(metadata.id)
        } catch (cleanupError) {
          console.error(`[CharacterManagement] Failed to cleanup imported save after creation error:`, cleanupError)
        }
      }

      console.error(`[CharacterManagement] Error creating imported save:`, error)
      alert('创建存档失败')
      return false
    }
  }, [activateCharacterData, characterList.length])
```

The strict assertion is intentionally outside the `try` block so contract violations throw.

- [ ] **Step 6: Return the new handler from the hook**

In the returned object, add:

```ts
    createImportedCharacterHandler,
```

near `createNewCharacterHandler`.

- [ ] **Step 7: Run the hook test**

Run:

```bash
npm run test:run -- tests/unit/imported-save-creation.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Run existing storage and modifier-adjacent tests**

Run:

```bash
npm run test:run -- tests/unit/storage-migration.test.ts tests/unit/import-regression-baseline.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add hooks/use-character-management.ts tests/unit/imported-save-creation.test.tsx
git commit -m "feat: add imported save creation handler"
```

---

### Task 4: Route Save-Management Imports Through The Shared Handler

**Files:**
- Modify: `components/modals/character-management-modal.tsx`
- Modify: `app/page.tsx`
- Test: `tests/unit/imported-save-creation.test.tsx`

- [ ] **Step 1: Update modal props**

In `components/modals/character-management-modal.tsx`, update imports:

```ts
import { CharacterMetadata, SheetData } from "@/lib/sheet-data"
```

Remove unused imports:

```ts
import { useSheetStore } from "@/lib/sheet-store"
import { defaultSheetData } from "@/lib/default-sheet-data"
```

Add this prop to `CharacterManagementModalProps`:

```ts
    onCreateImportedCharacter: (saveName: string, importedData: SheetData) => boolean
```

Add it to destructuring:

```ts
    onCreateImportedCharacter,
```

- [ ] **Step 2: Remove modal-local `onImportData`**

Delete this block from `CharacterManagementModal`:

```ts
    const { sheetData: formData, replaceSheetData } = useSheetStore()
    
    const onImportData = (data: any) => {
        // 数据迁移：为旧存档添加缺失字段
        const mergedData = {
            ...defaultSheetData,
            ...data,
            inventory_cards: data.inventory_cards || Array(20).fill({ id: '', name: '', type: 'unknown', description: '' }),
            includePageThreeInExport: data.includePageThreeInExport ?? true // 确保第三页导出字段存在
        }
        replaceSheetData(mergedData)
    }
```

- [ ] **Step 3: Update modal HTML import success path**

Replace:

```ts
                            const success = onCreateCharacter(saveName)
                            if (success) {
                                // 创建成功后导入数据
                                onImportData(result.data)
                                if (result.warnings && result.warnings.length > 0) {
```

with:

```ts
                            const success = onCreateImportedCharacter(saveName, result.data)
                            if (success) {
                                if (result.warnings && result.warnings.length > 0) {
```

Delete the `else` block that alerts:

```ts
                            } else {
                                alert('创建新存档失败，可能已达到存档数量上限')
                            }
```

- [ ] **Step 4: Update modal JSON import success path**

Replace:

```ts
                                                            const success = onCreateCharacter(saveName)
                                                            if (success) {
                                                                // 创建成功后导入数据
                                                                onImportData(validation.data)
                                                                if (validation.warnings && validation.warnings.length > 0) {
```

with:

```ts
                                                            const success = onCreateImportedCharacter(saveName, validation.data)
                                                            if (success) {
                                                                if (validation.warnings && validation.warnings.length > 0) {
```

Delete the `else` block that alerts:

```ts
                                                            } else {
                                                                alert('创建新存档失败，可能已达到存档数量上限')
                                                            }
```

- [ ] **Step 5: Wire the new handler in `app/page.tsx`**

In the `useCharacterManagement` destructuring in `app/page.tsx`, add:

```ts
    createImportedCharacterHandler,
```

In the `CharacterManagementModal` props, add:

```tsx
        onCreateImportedCharacter={createImportedCharacterHandler}
```

- [ ] **Step 6: Run TypeScript-oriented test feedback**

Run:

```bash
npm run test:run -- tests/unit/imported-save-creation.test.tsx
```

Expected: PASS. If TypeScript errors appear due to modal prop wiring, fix only the wiring in this task.

- [ ] **Step 7: Commit**

```bash
git add components/modals/character-management-modal.tsx app/page.tsx tests/unit/imported-save-creation.test.tsx
git commit -m "refactor: route managed imports through imported save creation"
```

---

### Task 5: Route Quick HTML Import Through The Shared Handler

**Files:**
- Modify: `app/page.tsx`
- Test: `tests/unit/imported-save-creation.test.tsx`

- [ ] **Step 1: Update quick HTML default save name**

In `app/page.tsx`, change:

```ts
            const defaultSaveName = `${characterName} (HTML导入)`
```

to:

```ts
            const defaultSaveName = `${characterName} (导入)`
```

- [ ] **Step 2: Replace quick HTML create-and-set bypass**

In `handleQuickImportFromHTML`, replace:

```ts
              const success = createNewCharacterHandler(saveName.trim())
              if (success) {
                // 创建成功后导入数据
                setFormData(result.data)
                if (result.warnings && result.warnings.length > 0) {
```

with:

```ts
              const success = createImportedCharacterHandler(saveName.trim(), result.data)
              if (success) {
                if (result.warnings && result.warnings.length > 0) {
```

Delete this `else` block:

```ts
              } else {
                alert('创建新存档失败，可能已达到存档数量上限')
              }
```

Do not change success alert wording; it should still say `HTML导入成功...`.

- [ ] **Step 3: Ensure `setFormData` remains only for regular sheet edits**

Run:

```bash
rg -n "setFormData\\(result\\.data\\)|HTML导入\\)" app/page.tsx components/modals/character-management-modal.tsx
```

Expected:

- no `setFormData(result.data)` results,
- no `(HTML导入)` default save-name suffix results,
- HTML success alerts may still contain `HTML导入成功`.

- [ ] **Step 4: Run focused tests**

Run:

```bash
npm run test:run -- tests/unit/imported-save-creation.test.tsx tests/unit/import-regression-baseline.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "refactor: route quick html import through imported save creation"
```

---

### Task 6: Update Import Guidance Documentation

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Replace stale import-path section**

In `CLAUDE.md`, replace lines under `4. **JSON Import**` and `5. **HTML Import**` with:

```md
4. **Character JSON Import**
   - `components/modals/character-management-modal.tsx` reads selected JSON files
   - `lib/character-data-validator.ts` - `validateJSONCharacterData()` parses and validates JSON character data
   - `validateAndProcessCharacterData()` applies `migrateSheetData()` before imported save creation

5. **Character HTML Import**
   - `lib/html-importer.ts` - `importCharacterFromHTMLFile()` extracts embedded `window.characterData`
   - HTML import also uses `validateAndProcessCharacterData()` for validation and migration
   - Quick HTML import and save-management HTML import both create saves through `useCharacterManagement.createImportedCharacterHandler()`
```

- [ ] **Step 2: Replace stale migration pattern examples**

Replace the `### Existing Migration Patterns` subsection with:

```md
### Existing Migration Patterns

1. **Central SheetData Migration**:
   - `lib/sheet-data-migration.ts` - `migrateSheetData()` is the single entry point for schema migration and current-schema normalization
   - It adds current required fields such as `inventory_cards`, `pageVisibility`, `equipment`, `armorTemplate`, `adventureNotes`, and `notebook`
   - It removes deprecated fields such as `includePageThreeInExport`

2. **Load-time Migration**:
   - `lib/multi-character-storage.ts` - `loadCharacterById()` loads stored character data, runs `migrateSheetData()`, and persists the migrated result

3. **Import-time Validation + Migration**:
   - `lib/character-data-validator.ts` - JSON and HTML imports validate raw candidate data, then call `migrateSheetData()`
   - Imported Save Creation must receive already migrated current-schema `SheetData`; it must not perform migration itself
```

- [ ] **Step 3: Replace stale new-field migration strategy**

Replace the old strategy list that says to add migration in `loadCharacterById()` and import functions with:

```md
### Adding New Fields Migration Strategy

When adding new fields to SheetData:

1. **Update `lib/sheet-data.ts`** - Add the new field to the SheetData interface
2. **Update `lib/default-sheet-data.ts`** - Add the default value
3. **Update `lib/sheet-data-migration.ts`** - Add migration/current-schema normalization in `migrateSheetData()`
4. **Update validation tests** - Cover load-time migration and JSON/HTML import validation paths
5. **Do not add field-specific repair logic in UI import handlers** - imports should receive current-schema data from the migration pipeline
```

- [ ] **Step 4: Check stale references are gone**

Run:

```bash
rg -n "importCharacterDataForMultiCharacter|Import-time Migration|Adding inventory_cards|lib/storage.ts.*import" CLAUDE.md
```

Expected: no results.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update character import guidance"
```

---

### Task 7: Final Verification

**Files:**
- Verify only.

- [ ] **Step 1: Run focused unit tests**

Run:

```bash
npm run test:run -- tests/unit/imported-save-creation.test.tsx tests/unit/import-regression-baseline.test.ts tests/unit/migration-regression-baseline.test.ts tests/unit/storage-migration.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run broader unit tests if focused tests pass**

Run:

```bash
npm run test:unit
```

Expected: PASS.

- [ ] **Step 3: Inspect import bypasses**

Run:

```bash
rg -n "setFormData\\(result\\.data\\)|onImportData\\(|includePageThreeInExport: data\\.includePageThreeInExport|importCharacterDataForMultiCharacter" app components hooks lib CLAUDE.md
```

Expected: no results.

- [ ] **Step 4: Inspect final diff**

Run:

```bash
git status --short
git diff --stat HEAD
```

Expected: clean working tree if all tasks committed. If there are remaining intended changes, review them before final response.

---

## Self-Review

- Spec coverage: all design requirements are mapped to tasks: strict current-schema assertion, no handler migration, shared activation helper, managed JSON/HTML import wiring, quick HTML import wiring, behavior-focused hook tests, import regression tests, and `CLAUDE.md` update.
- Placeholder scan: no TBD/TODO placeholders remain.
- Type consistency: the plan consistently uses `createImportedCharacterHandler(saveName: string, importedData: SheetData): boolean`, `activateCharacterData(characterId: string, characterData: SheetData)`, `CURRENT_SCHEMA_VERSION`, and existing multi-character storage keys.
