# Migration Versioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add schema-versioned migration to main current data shape, upgrading legacy v0 saves to v1 without introducing modifier/equipment v2 changes.

**Architecture:** Keep public `migrateSheetData(data, options?)`, but refactor internals into version detection, `migrateV0ToV1()`, `normalizeCurrentSheetData()`, and import-boundary validation. File imports use raw validation plus migration; internal storage loads call migration directly. `CURRENT_SCHEMA_VERSION` is `1`.

**Tech Stack:** TypeScript, Vitest, Next.js, existing `happy-dom` test setup.

---

## Scope

This plan implements only Phase A:

```text
v0 -> v1
CURRENT_SCHEMA_VERSION = 1
```

Do not implement:

- `v1 -> v2`
- equipment migration
- modifier state migration
- target sync automation migration
- legacy base inference

Those belong to the modifier branch after it rebases onto updated main.

## File Structure

- Create: `lib/sheet-schema-version.ts`  
  Owns `CURRENT_SCHEMA_VERSION`, schema version parsing, and high-version guard.
- Modify: `lib/sheet-data.ts`  
  Adds `schemaVersion: number` to `SheetData`.
- Modify: `lib/default-sheet-data.ts`  
  Adds `schemaVersion: CURRENT_SCHEMA_VERSION`.
- Modify: `lib/sheet-data-migration.ts`  
  Refactors existing migration into raw-first `v0 -> v1` pipeline and current-schema normalization.
- Modify: `lib/character-data-validator.ts`  
  Splits raw import candidate validation from current-schema validation; removes destructive pre-migration normalization from import flow.
- Modify: `lib/multi-character-storage.ts`  
  Ensures localStorage load, duplicate, and legacy single-character migration save v1 data.
- Modify: `lib/storage.ts`  
  Removes or deprecates unused old localStorage/import helpers while retaining `exportCharacterData()`.
- Create: `tests/unit/migration-regression-baseline.test.ts`  
  Brings in main characterization tests from `regression/main-migration-baseline-tests`.
- Create: `tests/unit/import-regression-baseline.test.ts`  
  Brings in import/normalize characterization tests from `regression/main-migration-baseline-tests`.
- Create: `tests/unit/migration-versioning.test.ts`  
  Covers schema version detection, idempotence, high-version errors, and raw-first legacy behavior.
- Modify/Create: `tests/unit/character-data-validator.test.ts`  
  Covers JSON/HTML import pipeline and non-mutating raw validation.
- Create: `tests/unit/storage-migration.test.ts`  
  Covers localStorage load / duplicate migration behavior.

---

### Task 1: Bring Main Baseline Tests Into This Branch

**Files:**
- Create: `tests/unit/migration-regression-baseline.test.ts`
- Create: `tests/unit/import-regression-baseline.test.ts`

- [ ] **Step 1: Restore baseline tests from the proven regression branch**

Run:

```bash
git restore --source=regression/main-migration-baseline-tests -- \
  tests/unit/migration-regression-baseline.test.ts \
  tests/unit/import-regression-baseline.test.ts
```

Expected: both test files appear in `git status`.

- [ ] **Step 2: Run restored baseline tests**

Run:

```bash
node_modules/.bin/vitest run \
  tests/unit/migration-regression-baseline.test.ts \
  tests/unit/import-regression-baseline.test.ts
```

Expected: PASS before implementation begins.

- [ ] **Step 3: Commit baseline tests**

Run:

```bash
git add tests/unit/migration-regression-baseline.test.ts tests/unit/import-regression-baseline.test.ts
git commit -m "test: add migration regression baseline"
```

Expected: commit contains only the two baseline tests.

---

### Task 2: Add Schema Version Field And Constants

**Files:**
- Create: `lib/sheet-schema-version.ts`
- Modify: `lib/sheet-data.ts`
- Modify: `lib/default-sheet-data.ts`
- Test: `tests/unit/migration-versioning.test.ts`

- [ ] **Step 1: Write failing schema version tests**

Create `tests/unit/migration-versioning.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { defaultSheetData } from '@/lib/default-sheet-data'
import {
  CURRENT_SCHEMA_VERSION,
  detectSchemaVersion,
  assertSupportedSchemaVersion,
} from '@/lib/sheet-schema-version'

describe('sheet schema version', () => {
  it('starts main versioning at schema version 1', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(1)
    expect(defaultSheetData.schemaVersion).toBe(1)
  })

  it('treats missing, invalid, or non-integer schema versions as v0', () => {
    expect(detectSchemaVersion({})).toBe(0)
    expect(detectSchemaVersion({ schemaVersion: '1' })).toBe(0)
    expect(detectSchemaVersion({ schemaVersion: NaN })).toBe(0)
    expect(detectSchemaVersion({ schemaVersion: 1.5 })).toBe(0)
  })

  it('detects supported numeric schema versions', () => {
    expect(detectSchemaVersion({ schemaVersion: 0 })).toBe(0)
    expect(detectSchemaVersion({ schemaVersion: 1 })).toBe(1)
  })

  it('rejects saves from newer schema versions', () => {
    expect(() => assertSupportedSchemaVersion(2)).toThrow(/newer schema version/i)
  })
})
```

- [ ] **Step 2: Run schema tests to verify failure**

Run:

```bash
node_modules/.bin/vitest run tests/unit/migration-versioning.test.ts
```

Expected: FAIL because `lib/sheet-schema-version.ts` and `schemaVersion` do not exist yet.

- [ ] **Step 3: Add schema version helpers**

Create `lib/sheet-schema-version.ts`:

```ts
export const CURRENT_SCHEMA_VERSION = 1

export function detectSchemaVersion(data: unknown): number {
  if (!data || typeof data !== 'object') {
    return 0
  }

  const version = (data as { schemaVersion?: unknown }).schemaVersion
  if (!Number.isInteger(version)) {
    return 0
  }

  return version as number
}

export function assertSupportedSchemaVersion(version: number): void {
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new Error(`Cannot load save from newer schema version ${version}; current schema version is ${CURRENT_SCHEMA_VERSION}.`)
  }
}
```

- [ ] **Step 4: Add `schemaVersion` to runtime data**

Modify `lib/sheet-data.ts`:

```ts
export interface SheetData {
  schemaVersion: number
  // existing fields remain unchanged
}
```

Modify `lib/default-sheet-data.ts`:

```ts
import { CURRENT_SCHEMA_VERSION } from './sheet-schema-version'

export const defaultSheetData: SheetData = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  // existing defaults remain unchanged
}
```

- [ ] **Step 5: Run schema tests to verify pass**

Run:

```bash
node_modules/.bin/vitest run tests/unit/migration-versioning.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit schema version primitives**

Run:

```bash
git add lib/sheet-schema-version.ts lib/sheet-data.ts lib/default-sheet-data.ts tests/unit/migration-versioning.test.ts
git commit -m "feat: add sheet schema version"
```

---

### Task 3: Refactor `migrateSheetData()` Into v0 -> v1 Pipeline

**Files:**
- Modify: `lib/sheet-data-migration.ts`
- Modify: `tests/unit/migration-versioning.test.ts`
- Modify: `tests/unit/migration-regression-baseline.test.ts`

- [ ] **Step 1: Add failing v0 -> v1 migration tests**

Append to `tests/unit/migration-versioning.test.ts`:

```ts
import { migrateSheetData } from '@/lib/sheet-data-migration'

const validCard = {
  id: 'card-domain-1',
  name: 'Valid Domain Card',
  type: 'domain',
}

function v0Sheet(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Kaka',
    level: '1',
    gold: [false],
    experience: ['Scout', '', '', '', ''],
    hope: [true, false, true, false],
    inventory: ['rope', '', '', '', ''],
    cards: [validCard],
    ...overrides,
  } as any
}

describe('sheet data version migration', () => {
  it('migrates v0 data to v1 and writes schemaVersion', () => {
    const migrated = migrateSheetData(v0Sheet())

    expect(migrated.schemaVersion).toBe(1)
    expect(migrated.hope).toBe(3)
    expect(migrated.hopeMax).toBe(4)
    expect(migrated.inventory_cards).toHaveLength(20)
    expect(migrated.notebook?.pages).toHaveLength(1)
  })

  it('keeps v1 data stable and idempotent', () => {
    const once = migrateSheetData(v0Sheet())
    const twice = migrateSheetData(once)

    expect(twice).toEqual(once)
  })

  it('uses raw legacy fields before defaults can mask them', () => {
    const migrated = migrateSheetData(v0Sheet({
      includePageThreeInExport: true,
    }))

    expect(migrated.pageVisibility).toEqual({
      rangerCompanion: true,
      armorTemplate: false,
      adventureNotes: false,
    })
    expect('includePageThreeInExport' in migrated).toBe(false)
  })

  it('throws for newer schema versions', () => {
    expect(() => migrateSheetData(v0Sheet({ schemaVersion: 2 }))).toThrow(/newer schema version/i)
  })
})
```

- [ ] **Step 2: Run migration versioning tests to verify failure**

Run:

```bash
node_modules/.bin/vitest run tests/unit/migration-versioning.test.ts
```

Expected: FAIL because `migrateSheetData()` does not write `schemaVersion`, does not reject high versions, and direct legacy page visibility is still masked.

- [ ] **Step 3: Refactor migration pipeline**

In `lib/sheet-data-migration.ts`, import helpers:

```ts
import {
  assertSupportedSchemaVersion,
  CURRENT_SCHEMA_VERSION,
  detectSchemaVersion,
} from './sheet-schema-version'
```

Add:

```ts
function isValidStandardCard(card: any): card is StandardCard {
  return card &&
    typeof card === 'object' &&
    typeof card.id === 'string' &&
    typeof card.name === 'string' &&
    card.type !== undefined
}

function normalizeCurrentSheetData(data: Partial<SheetData> | any): SheetData {
  const normalized: SheetData = {
    ...defaultSheetData,
    ...data,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  }

  normalized.cards = Array.isArray(data.cards)
    ? data.cards.filter(isValidStandardCard)
    : defaultSheetData.cards

  normalized.inventory_cards = Array.isArray(data.inventory_cards)
    ? data.inventory_cards.filter(isValidStandardCard)
    : defaultSheetData.inventory_cards

  return cleanupDeprecatedFields(normalized)
}

function migrateV0ToV1(raw: Partial<SheetData> | any): Partial<SheetData> {
  let migrated = { ...raw } as SheetData

  migrated = migratePageVisibility(migrated)
  migrated = migrateInventoryCards(migrated)
  migrated = migrateAttributeSpellcasting(migrated)
  migrated = migratePageVisibilityRename(migrated)
  migrated = migratePageVisibilityFields(migrated)
  migrated = migrateArmorTemplate(migrated)
  migrated = migrateAdventureNotes(migrated)
  migrated = migrateWeaponCheckboxes(migrated)
  migrated = migrateHopeToNumber(migrated)
  migrated = migrateNotebook(migrated)
  migrated = cleanupDeprecatedFields(migrated)

  return {
    ...migrated,
    schemaVersion: 1,
  }
}
```

Replace `migrateSheetData()` with:

```ts
export function migrateSheetData(
  data: Partial<SheetData> | any,
  _options: MigrationOptions = {}
): SheetData {
  const schemaVersion = detectSchemaVersion(data)
  assertSupportedSchemaVersion(schemaVersion)

  let migrated = data
  if (schemaVersion === 0) {
    migrated = migrateV0ToV1(migrated)
  }

  return normalizeCurrentSheetData(migrated)
}
```

Export `normalizeCurrentSheetData` if needed by `character-data-validator.ts` in later tasks.

- [ ] **Step 4: Update direct migration baseline expectation**

In `tests/unit/migration-regression-baseline.test.ts`, change the direct legacy `includePageThreeInExport` expectation from the old masked behavior to the raw-first v1 behavior:

```ts
expect(migrated.pageVisibility).toEqual({
  rangerCompanion: true,
  armorTemplate: false,
  adventureNotes: false,
})
```

- [ ] **Step 5: Run migration tests**

Run:

```bash
node_modules/.bin/vitest run \
  tests/unit/migration-versioning.test.ts \
  tests/unit/migration-regression-baseline.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit migration pipeline**

Run:

```bash
git add lib/sheet-data-migration.ts tests/unit/migration-versioning.test.ts tests/unit/migration-regression-baseline.test.ts
git commit -m "refactor: version sheet data migration"
```

---

### Task 4: Split Import Validation From Migration

**Files:**
- Modify: `lib/character-data-validator.ts`
- Modify: `tests/unit/import-regression-baseline.test.ts`
- Create/Modify: `tests/unit/character-data-validator.test.ts`

- [ ] **Step 1: Add failing import-boundary tests**

Create `tests/unit/character-data-validator.test.ts` if it does not exist:

```ts
import { describe, expect, it } from 'vitest'
import {
  validateAndProcessCharacterData,
  validateJSONCharacterData,
} from '@/lib/character-data-validator'

const validCard = {
  id: 'card-domain-1',
  name: 'Valid Domain Card',
  type: 'domain',
}

function rawImport(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Kaka',
    level: '1',
    gold: [false],
    experience: ['Scout', '', '', '', ''],
    hope: [true, false, true, false],
    inventory: ['rope', '', '', '', ''],
    cards: [validCard, { id: 'invalid' }],
    unknownFutureField: { keep: true },
    ...overrides,
  } as any
}

describe('character data import validation', () => {
  it('migrates JSON imports to v1 and preserves unknown fields through migration', () => {
    const result = validateJSONCharacterData(JSON.stringify(rawImport()))

    expect(result.valid).toBe(true)
    expect(result.data?.schemaVersion).toBe(1)
    expect(result.data?.hope).toBe(3)
    expect((result.data as any).unknownFutureField).toEqual({ keep: true })
  })

  it('keeps HTML and JSON on the same import processing path', () => {
    const raw = rawImport({ focused_card_ids: ['card-domain-1'] })
    const json = validateJSONCharacterData(JSON.stringify(raw))
    const html = validateAndProcessCharacterData(structuredClone(raw), 'html')

    expect(json.valid).toBe(true)
    expect(html.valid).toBe(true)
    expect(json.data).toEqual(html.data)
  })

  it('rejects non-object imports without mutating them', () => {
    const result = validateAndProcessCharacterData(null)

    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/JSON对象/)
  })

  it('keeps current invalid card filtering behavior', () => {
    const result = validateJSONCharacterData(JSON.stringify(rawImport()))

    expect(result.valid).toBe(true)
    expect(result.data?.cards).toEqual([validCard])
  })
})
```

- [ ] **Step 2: Run import tests to verify failure**

Run:

```bash
node_modules/.bin/vitest run tests/unit/character-data-validator.test.ts tests/unit/import-regression-baseline.test.ts
```

Expected: FAIL because current `cleanAndNormalizeData()` rebuilds a whitelist object and drops `unknownFutureField`.

- [ ] **Step 3: Add raw/current validation helpers**

In `lib/character-data-validator.ts`, add:

```ts
function validateRawImportCandidate(data: any): data is Record<string, unknown> {
  if (!data || typeof data !== 'object') {
    return false
  }

  const requiredFields = ['name', 'level', 'gold', 'experience', 'hope', 'inventory', 'cards']
  return requiredFields.every(field => field in data)
}

function validateCurrentSheetData(data: any): data is SheetData {
  return validateSheetData(data) && typeof data.schemaVersion === 'number'
}
```

Update `validateAndProcessCharacterData()`:

```ts
export function validateAndProcessCharacterData(rawData: any, source: 'json' | 'html' = 'json'): ValidationResult {
  try {
    console.log(`[Data Validation] 开始验证${source.toUpperCase()}数据...`)

    if (!validateRawImportCandidate(rawData)) {
      return {
        valid: false,
        error: '数据格式无效，必须是JSON对象且包含角色数据必需字段',
        warnings: [],
      }
    }

    let migratedData = migrateSheetData(rawData)

    if (!validateCurrentSheetData(migratedData)) {
      return {
        valid: false,
        error: '角色数据结构验证失败，缺少必需字段或字段类型不正确',
        warnings: [],
      }
    }

    const compatibility = validateCompatibility(migratedData)

    return {
      valid: true,
      data: migratedData,
      warnings: compatibility.warnings,
    }
  } catch (error) {
    return {
      valid: false,
      error: `数据验证失败: ${error instanceof Error ? error.message : '未知错误'}`,
      warnings: [],
    }
  }
}
```

Keep `cleanAndNormalizeData()` exported only as a compatibility wrapper if needed by old tests, but do not call it from import processing.

- [ ] **Step 4: Update import regression baseline**

The old `cleanAndNormalizeData()` coercion test is no longer the import source of truth. Replace it with assertions against `validateJSONCharacterData()` or remove direct dependency on `cleanAndNormalizeData()` if the function is deleted.

Keep these expectations:

- JSON and HTML import paths produce equivalent migrated data.
- invalid cards are filtered.
- `focused_card_ids` remains preserved.
- `schemaVersion` is `1`.

- [ ] **Step 5: Run import tests**

Run:

```bash
node_modules/.bin/vitest run tests/unit/character-data-validator.test.ts tests/unit/import-regression-baseline.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit import boundary refactor**

Run:

```bash
git add lib/character-data-validator.ts tests/unit/character-data-validator.test.ts tests/unit/import-regression-baseline.test.ts
git commit -m "refactor: split import validation from migration"
```

---

### Task 5: Update Internal Storage Migration Entrypoints

**Files:**
- Modify: `lib/multi-character-storage.ts`
- Modify: `lib/storage.ts`
- Create: `tests/unit/storage-migration.test.ts`

- [ ] **Step 1: Write failing storage migration tests**

Create `tests/unit/storage-migration.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import {
  ACTIVE_CHARACTER_ID_KEY,
  CHARACTER_DATA_PREFIX,
  duplicateCharacter,
  migrateToMultiCharacterStorage,
  loadCharacterById,
  saveCharacterById,
} from '@/lib/multi-character-storage'

const validCard = {
  id: 'card-domain-1',
  name: 'Valid Domain Card',
  type: 'domain',
}

function v0Sheet(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Stored Kaka',
    level: '1',
    gold: [false],
    experience: ['Scout', '', '', '', ''],
    hope: [true, false, true, false],
    inventory: ['rope', '', '', '', ''],
    cards: [validCard],
    ...overrides,
  } as any
}

describe('storage migration entrypoints', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loads and persists v1 data from stored v0 character data', () => {
    localStorage.setItem('dh_character_test-id', JSON.stringify(v0Sheet()))

    const loaded = loadCharacterById('test-id')
    const stored = JSON.parse(localStorage.getItem('dh_character_test-id') || '{}')

    expect(loaded?.schemaVersion).toBe(1)
    expect(loaded?.hope).toBe(3)
    expect(stored.schemaVersion).toBe(1)
    expect(stored.hope).toBe(3)
  })

  it('duplicates characters as current schema data', () => {
    saveCharacterById('source-id', v0Sheet())

    const duplicate = duplicateCharacter('source-id', 'Copy')

    expect(duplicate?.schemaVersion).toBe(1)
    expect(duplicate?.name).toBe('Copy')
    expect(duplicate?.hope).toBe(3)
  })

  it('saves legacy single-character migration output as current schema data', () => {
    localStorage.setItem('charactersheet_data', JSON.stringify(v0Sheet({
      includePageThreeInExport: true,
    })))
    localStorage.setItem('focused_card_ids', JSON.stringify(['card-domain-1']))

    migrateToMultiCharacterStorage()

    const activeId = localStorage.getItem(ACTIVE_CHARACTER_ID_KEY)
    expect(activeId).toBeTruthy()

    const stored = JSON.parse(localStorage.getItem(`${CHARACTER_DATA_PREFIX}${activeId}`) || '{}')
    expect(stored.schemaVersion).toBe(1)
    expect(stored.hope).toBe(3)
    expect(stored.focused_card_ids).toEqual(['card-domain-1'])
    expect(stored.pageVisibility).toEqual({
      rangerCompanion: true,
      armorTemplate: false,
      adventureNotes: false,
    })
  })
})
```

- [ ] **Step 2: Run storage tests to verify failure or current behavior**

Run:

```bash
node_modules/.bin/vitest run tests/unit/storage-migration.test.ts
```

Expected before implementation: the legacy single-character migration test fails because `migrateToMultiCharacterStorage()` saves the assembled legacy data before applying `migrateSheetData()`.

- [ ] **Step 3: Update multi-character storage**

Ensure `loadCharacterById()` still does:

```ts
const migratedData = migrateSheetData(parsed)
saveCharacterById(id, migratedData)
return migratedData
```

Ensure `duplicateCharacter()` still wraps copied data in `migrateSheetData()`:

```ts
const duplicatedData = migrateSheetData({
  ...originalData,
  name: newName || `${originalData.name} (副本)`,
})
```

Update `migrateToMultiCharacterStorage()` so the first saved migrated character is already current schema:

```ts
const normalizedCharacterData = migrateSheetData(migratedCharacterData)
saveCharacterById(newCharacterId, normalizedCharacterData)
```

- [ ] **Step 4: Clean old storage helpers**

In `lib/storage.ts`, keep:

- `exportCharacterData()`
- `exportCharacterDataForMultiCharacter()`
- `generatePrintableName()`
- helpers needed by those functions

Remove or mark deprecated if removal causes import errors:

- `saveCharacterData()`
- `loadCharacterData()`
- `mergeAndSaveCharacterData()`
- `clearCharacterData()`
- `importCharacterData()`
- `importCharacterDataForMultiCharacter()` if no callers remain

Use `rg` before deletion:

```bash
rg -n "saveCharacterData|loadCharacterData|mergeAndSaveCharacterData|clearCharacterData|importCharacterData\\(" app components hooks lib tests
```

- [ ] **Step 5: Run storage tests**

Run:

```bash
node_modules/.bin/vitest run tests/unit/storage-migration.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit storage cleanup**

Run:

```bash
git add lib/multi-character-storage.ts lib/storage.ts tests/unit/storage-migration.test.ts
git commit -m "refactor: migrate stored character data by schema version"
```

---

### Task 6: Final Verification

**Files:**
- All modified files.

- [ ] **Step 1: Run all unit tests**

Run:

```bash
node_modules/.bin/vitest run tests/unit
```

Expected: all unit tests pass.

- [ ] **Step 2: Run full test command**

Run:

```bash
npm run test:run
```

Expected: all test suites pass.

- [ ] **Step 3: Inspect final diff**

Run:

```bash
git status --short
git log --oneline --decorate -6
```

Expected: only intended committed changes, no untracked implementation files.

- [ ] **Step 4: Stop for review**

Do not merge into main yet. Report:

- Commits created.
- Test commands and results.
- Any behavior intentionally changed from the baseline, especially raw-first `includePageThreeInExport`.
