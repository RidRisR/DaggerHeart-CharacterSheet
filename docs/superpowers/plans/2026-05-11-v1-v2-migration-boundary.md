# V1 To V2 Migration Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Promote the modifier branch save schema to v2 and move existing equipment / modifier structural migrations behind an explicit v1 -> v2 boundary without changing user-visible behavior.

**Architecture:** Keep `migrateSheetData(data, options?)` as the single public migration entry. `migrateV0ToV1()` preserves main-branch published migration behavior and writes `schemaVersion: 1`; `migrateV1ToV2()` performs the modifier-branch structural migrations and writes `schemaVersion: 2`; `normalizeCurrentSheetData()` fills current-schema defaults and performs current-shape normalization without interpreting legacy fields.

**Tech Stack:** TypeScript, React app data model, Vitest unit tests, existing migration helpers in `lib/sheet-data-migration.ts`.

---

## File Map

- Modify: `lib/sheet-schema-version.ts`
  Owns `CURRENT_SCHEMA_VERSION`, version detection, and high-version guard.

- Modify: `lib/sheet-data-migration.ts`
  Splits current modifier-branch structural migrations into `migrateV1ToV2()`, keeps v0 -> v1 stable, and narrows `normalizeCurrentSheetData()`.

- Modify: `tests/unit/migration-versioning.test.ts`
  Locks v2 current version, v0 -> v2, v1 -> v2, v2 idempotence, and v3 rejection.

- Modify: `tests/unit/equipment/equipment-migration.test.ts`
  Keeps equipment migration behavior, but makes the tested input explicitly v1 where the behavior is v1 -> v2.

- Modify: `tests/unit/modifiers/migration.test.ts`
  Keeps modifier state migration behavior, but makes legacy modifier-state inputs explicitly v1 where the behavior is v1 -> v2.

- Modify: `tests/unit/storage-migration.test.ts`
  Updates storage migration expectations from v1 to v2.

- Modify: `tests/unit/character-data-validator.test.ts`
  Updates JSON / HTML import expectations from v1 to v2.

- Modify: `tests/unit/import-regression-baseline.test.ts`
  Updates import baseline expectations from v1 to v2.

- Modify: `tests/unit/migration-regression-baseline.test.ts`
  Adds or adjusts assertions to confirm v0 main behavior still survives the v0 -> v1 -> v2 path.

---

### Task 1: Update Versioning Tests For V2

**Files:**
- Modify: `tests/unit/migration-versioning.test.ts`

- [x] **Step 1: Replace the current version expectations**

Change:

```ts
it('starts main versioning at schema version 1', () => {
  expect(CURRENT_SCHEMA_VERSION).toBe(1)
  expect(defaultSheetData.schemaVersion).toBe(1)
})
```

to:

```ts
it('uses schema version 2 on the modifier branch', () => {
  expect(CURRENT_SCHEMA_VERSION).toBe(2)
  expect(defaultSheetData.schemaVersion).toBe(2)
})
```

- [x] **Step 2: Update supported version detection test**

Change:

```ts
expect(detectSchemaVersion({ schemaVersion: 1 })).toBe(1)
```

to:

```ts
expect(detectSchemaVersion({ schemaVersion: 1 })).toBe(1)
expect(detectSchemaVersion({ schemaVersion: 2 })).toBe(2)
```

- [x] **Step 3: Update high-version rejection test**

Change:

```ts
expect(() => assertSupportedSchemaVersion(2)).toThrow(/newer schema version/i)
```

to:

```ts
expect(() => assertSupportedSchemaVersion(3)).toThrow(/newer schema version/i)
```

- [x] **Step 4: Add a v1 fixture helper**

Add below `v0Sheet()`:

```ts
function v1Sheet(overrides: Record<string, unknown> = {}) {
  return {
    ...v0Sheet(),
    schemaVersion: 1,
    hope: 3,
    hopeMax: 4,
    pageVisibility: {
      rangerCompanion: false,
      armorTemplate: false,
      adventureNotes: false,
    },
    inventory_cards: Array(20).fill(0).map((_, index) => ({
      id: `inventory-card-${index}`,
      name: `Inventory Card ${index}`,
      type: 'domain',
    })),
    notebook: {
      pages: [{ id: 'page-1', lines: [] }],
      currentPageIndex: 0,
      isOpen: false,
    },
    ...overrides,
  } as any
}
```

- [x] **Step 5: Update v0 migration test to expect v2**

Change test name and schema assertion:

```ts
it('migrates v0 data to v2 through the full version chain', () => {
  const migrated = migrateSheetData(v0Sheet())

  expect(migrated.schemaVersion).toBe(2)
  expect(migrated.hope).toBe(3)
  expect(migrated.hopeMax).toBe(4)
  expect(migrated.inventory_cards).toHaveLength(20)
  expect(migrated.notebook?.pages).toHaveLength(1)
})
```

- [x] **Step 6: Add v1 -> v2 equipment migration test**

Add:

```ts
it('migrates v1 data to v2 and moves legacy equipment fields', () => {
  const migrated = migrateSheetData(v1Sheet({
    primaryWeaponName: '阔剑',
    primaryWeaponTrait: '物理/单手/近战',
    primaryWeaponDamage: '敏捷: d8',
    primaryWeaponFeature: '可靠',
    armorName: '链甲',
    armorBaseScore: '4',
    armorThreshold: '7/15',
    armorFeature: '重型',
  }))

  expect(migrated.schemaVersion).toBe(2)
  expect(migrated.equipment.weaponSlots.primary).toMatchObject({
    name: '阔剑',
    trait: '物理/单手/近战',
    damage: '敏捷: d8',
    feature: '可靠',
  })
  expect(migrated.equipment.armorSlot).toMatchObject({
    name: '链甲',
    baseArmorMax: 4,
    baseThresholds: { minor: 7, major: 15 },
    feature: '重型',
  })
  expect('primaryWeaponName' in (migrated as any)).toBe(false)
  expect('armorName' in (migrated as any)).toBe(false)
})
```

- [x] **Step 7: Add v1 -> v2 modifier state migration test**

Add:

```ts
it('migrates v1 modifier byTarget state to v2 state maps', () => {
  const migrated = migrateSheetData(v1Sheet({
    modifierState: {
      byTarget: {
        evasion: {
          activeBaseId: 'user:evasion-base',
          disabledEntryIds: ['upgrade:evasion'],
          userEntries: [{
            id: 'user:evasion-base',
            target: 'evasion',
            kind: 'base',
            label: '手动基础闪避',
            value: 12,
          }],
        },
      },
    },
  }))

  expect(migrated.schemaVersion).toBe(2)
  expect(migrated.modifierState?.targetStates.evasion?.activeBaseId).toBe('user:evasion-base')
  expect(migrated.userModifierContributions).toEqual([{
    id: 'user:evasion-base',
    definition: { target: 'evasion', kind: 'base' },
    editable: { label: '手动基础闪避', value: 12 },
  }])
})
```

- [x] **Step 8: Update idempotence and high-version tests**

Change:

```ts
it('keeps v1 data stable and idempotent', () => {
  const once = migrateSheetData(v0Sheet())
  const twice = migrateSheetData(once)

  expect(twice).toEqual(once)
})
```

to:

```ts
it('keeps v2 data stable and idempotent', () => {
  const once = migrateSheetData(v0Sheet())
  const twice = migrateSheetData(once)

  expect(once.schemaVersion).toBe(2)
  expect(twice).toEqual(once)
})
```

Change:

```ts
expect(() => migrateSheetData(v0Sheet({ schemaVersion: 2 }))).toThrow(/newer schema version/i)
```

to:

```ts
expect(() => migrateSheetData(v0Sheet({ schemaVersion: 3 }))).toThrow(/newer schema version/i)
```

- [x] **Step 9: Run the focused test and verify failure**

Run:

```bash
npm run test:run -- tests/unit/migration-versioning.test.ts
```

Expected before implementation: FAIL because `CURRENT_SCHEMA_VERSION` is still `1`, v1 data does not explicitly pass through `migrateV1ToV2()`, and v3 is not the current high-version boundary yet.

---

### Task 2: Update Existing Version Expectations In Tests

**Files:**
- Modify: `tests/unit/storage-migration.test.ts`
- Modify: `tests/unit/character-data-validator.test.ts`
- Modify: `tests/unit/import-regression-baseline.test.ts`

- [x] **Step 1: Update storage tests from v1 to v2**

In `tests/unit/storage-migration.test.ts`, replace these assertions:

```ts
expect(loaded?.schemaVersion).toBe(1)
expect(stored.schemaVersion).toBe(1)
expect(duplicate?.schemaVersion).toBe(1)
```

with:

```ts
expect(loaded?.schemaVersion).toBe(2)
expect(stored.schemaVersion).toBe(2)
expect(duplicate?.schemaVersion).toBe(2)
```

Also replace the final legacy storage assertion:

```ts
expect(stored.schemaVersion).toBe(1)
```

with:

```ts
expect(stored.schemaVersion).toBe(2)
```

- [x] **Step 2: Update character import tests from v1 to v2**

In `tests/unit/character-data-validator.test.ts`, replace:

```ts
expect(result.data?.schemaVersion).toBe(1)
expect(json.data?.schemaVersion).toBe(1)
expect(html.data?.schemaVersion).toBe(1)
```

with:

```ts
expect(result.data?.schemaVersion).toBe(2)
expect(json.data?.schemaVersion).toBe(2)
expect(html.data?.schemaVersion).toBe(2)
```

- [x] **Step 3: Update import regression baseline from v1 to v2**

In `tests/unit/import-regression-baseline.test.ts`, replace:

```ts
expect(jsonResult.data?.schemaVersion).toBe(1)
expect(htmlResult.data?.schemaVersion).toBe(1)
expect(result.data?.schemaVersion).toBe(1)
```

with:

```ts
expect(jsonResult.data?.schemaVersion).toBe(2)
expect(htmlResult.data?.schemaVersion).toBe(2)
expect(result.data?.schemaVersion).toBe(2)
```

- [x] **Step 4: Run affected tests and verify failure**

Run:

```bash
npm run test:run -- tests/unit/storage-migration.test.ts tests/unit/character-data-validator.test.ts tests/unit/import-regression-baseline.test.ts
```

Expected before implementation: FAIL because migration still returns schema version `1`.

---

### Task 3: Make Current Schema Version 2

**Files:**
- Modify: `lib/sheet-schema-version.ts`

- [x] **Step 1: Change the current schema version**

Replace:

```ts
export const CURRENT_SCHEMA_VERSION = 1
```

with:

```ts
export const CURRENT_SCHEMA_VERSION = 2
```

- [x] **Step 2: Run versioning test**

Run:

```bash
npm run test:run -- tests/unit/migration-versioning.test.ts
```

Expected after this task: some version assertions pass, but migration behavior still needs explicit v1 -> v2 structure. Failures in v1 fixture tests are expected until Task 4.

---

### Task 4: Split Migration Helpers Into V0 -> V1 And V1 -> V2

**Files:**
- Modify: `lib/sheet-data-migration.ts`

- [x] **Step 1: Add explicit schema constants near imports**

Add below imports:

```ts
const V1_SCHEMA_VERSION = 1
const V2_SCHEMA_VERSION = 2
```

Use `V1_SCHEMA_VERSION` inside `migrateV0ToV1()` and `V2_SCHEMA_VERSION` inside `migrateV1ToV2()`.

- [x] **Step 2: Split legacy-aware equipment migration from current equipment normalization**

Replace the current `normalizeEquipment()` helper with two explicit helpers:

```ts
function normalizeEquipmentFromLegacy(data: SheetData | LegacyEquipmentInput, useExistingEquipment: boolean) {
  const legacy = data as LegacyEquipmentInput
  const equipment = useExistingEquipment && isRecord((data as any).equipment) ? (data as any).equipment : {}
  const weaponSlots = isRecord(equipment.weaponSlots) ? equipment.weaponSlots : {}
  const inventorySlots = Array.isArray(weaponSlots.inventory) ? weaponSlots.inventory : []

  return {
    weaponSlots: {
      primary: normalizeWeaponSlot(weaponSlots.primary, legacyWeaponSlot(legacy, "primaryWeapon")),
      secondary: normalizeWeaponSlot(weaponSlots.secondary, legacyWeaponSlot(legacy, "secondaryWeapon")),
      inventory: [
        normalizeWeaponSlot(inventorySlots[0], legacyWeaponSlot(legacy, "inventoryWeapon1")),
        normalizeWeaponSlot(inventorySlots[1], legacyWeaponSlot(legacy, "inventoryWeapon2")),
      ],
    },
    armorSlot: normalizeArmorSlot(equipment.armorSlot, legacyArmorSlot(legacy)),
  }
}

function normalizeCurrentEquipment(value: unknown) {
  const emptyEquipment = createEmptyEquipmentData()
  const equipment = isRecord(value) ? value : {}
  const weaponSlots = isRecord(equipment.weaponSlots) ? equipment.weaponSlots : {}
  const inventorySlots = Array.isArray(weaponSlots.inventory) ? weaponSlots.inventory : []

  return {
    weaponSlots: {
      primary: normalizeWeaponSlot(weaponSlots.primary, emptyEquipment.weaponSlots.primary),
      secondary: normalizeWeaponSlot(weaponSlots.secondary, emptyEquipment.weaponSlots.secondary),
      inventory: [
        normalizeWeaponSlot(inventorySlots[0], emptyEquipment.weaponSlots.inventory[0]),
        normalizeWeaponSlot(inventorySlots[1], emptyEquipment.weaponSlots.inventory[1]),
      ],
    },
    armorSlot: normalizeArmorSlot(equipment.armorSlot, emptyEquipment.armorSlot),
  }
}
```

Keep `migrateEquipment()` but make it use legacy fallback only:

```ts
function migrateEquipment(data: SheetData | LegacyEquipmentInput, useExistingEquipment: boolean): SheetData {
  const migrated: any = {
    ...data,
    equipment: normalizeEquipmentFromLegacy(data, useExistingEquipment),
  }

  return migrated as SheetData
}
```

- [x] **Step 3: Add a current-shape modifier state normalizer**

Add:

```ts
function normalizeCurrentModifierCollections(data: SheetData): SheetData {
  const migrated = { ...data }

  migrated.userModifierContributions = sanitizeModifierContributions(migrated.userModifierContributions)

  if (!migrated.modifierState || typeof migrated.modifierState !== "object" || Array.isArray(migrated.modifierState)) {
    migrated.modifierState = { targetStates: {}, entryStates: {} }
  } else {
    migrated.modifierState = {
      targetStates: isRecord(migrated.modifierState.targetStates) ? migrated.modifierState.targetStates : {},
      entryStates: isRecord(migrated.modifierState.entryStates) ? migrated.modifierState.entryStates : {},
    }
  }

  if (!migrated.automationSelections || typeof migrated.automationSelections !== "object" || Array.isArray(migrated.automationSelections)) {
    migrated.automationSelections = {}
  }

  return migrated
}
```

This helper must not read `modifierState.byTarget`.

- [x] **Step 4: Make `migrateV0ToV1()` write schema version 1**

Change:

```ts
return {
  ...migrated,
  schemaVersion: CURRENT_SCHEMA_VERSION,
}
```

to:

```ts
return {
  ...migrated,
  schemaVersion: V1_SCHEMA_VERSION,
}
```

- [x] **Step 5: Add `migrateV1ToV2()`**

Add below `migrateV0ToV1()`:

```ts
function migrateV1ToV2(raw: Partial<SheetData> | any): Partial<SheetData> {
  const hasInputEquipment = isRecord(raw?.equipment)
  let migrated = { ...raw } as SheetData

  migrated = migrateEquipment(migrated, hasInputEquipment)
  migrated = migrateModifierState(migrated)
  migrated = stripLegacyEquipmentFields(migrated)
  migrated = cleanupDeprecatedFields(migrated)

  return {
    ...migrated,
    schemaVersion: V2_SCHEMA_VERSION,
  }
}
```

`migrateModifierState()` may keep its existing internal `reconcileModifierState()` call. `normalizeCurrentSheetData()` will run current-shape normalization and reconcile again after defaults are merged. That second reconcile is intentional and keeps v2 idempotence stable.

- [x] **Step 6: Narrow `normalizeCurrentSheetData()`**

Replace the structural migration block:

```ts
normalized = migrateEquipment(normalized, hasInputEquipment)
normalized = migrateModifierState(normalized)
normalized = stripLegacyEquipmentFields(normalized)

return cleanupDeprecatedFields(normalized)
```

with current-shape normalization:

```ts
normalized.equipment = normalizeCurrentEquipment(normalized.equipment)
normalized = normalizeCurrentModifierCollections(normalized)
normalized = reconcileModifierState(normalized)

return cleanupDeprecatedFields(normalized)
```

Also remove the now-unused `hasInputEquipment` local from `normalizeCurrentSheetData()`.

- [x] **Step 7: Run focused migration tests**

Run:

```bash
npm run test:run -- tests/unit/migration-versioning.test.ts tests/unit/equipment/equipment-migration.test.ts tests/unit/modifiers/migration.test.ts
```

Expected after this task: tests should pass or fail only where fixtures still need explicit v1 schema versions. Fix fixture setup in Task 5.

---

### Task 5: Make Equipment And Modifier Migration Fixtures Explicitly V1

**Files:**
- Modify: `tests/unit/equipment/equipment-migration.test.ts`
- Modify: `tests/unit/modifiers/migration.test.ts`

- [x] **Step 1: Add helper to equipment migration test**

At the top of `tests/unit/equipment/equipment-migration.test.ts`, add:

```ts
function v1EquipmentInput(overrides: Record<string, unknown>) {
  return {
    schemaVersion: 1,
    name: "V1 Equipment",
    level: "1",
    hope: 0,
    hopeMax: 6,
    cards: [],
    inventory_cards: [],
    ...overrides,
  } as any
}
```

Wrap legacy equipment cases with `v1EquipmentInput(...)` when the test is specifically asserting v1 -> v2 behavior.

For example, change this complete shape:

```ts
const migrated = migrateSheetData({
  name: "Legacy",
  primaryWeaponName: "阔剑",
  primaryWeaponTrait: "物理/单手/近战",
  primaryWeaponDamage: "敏捷: d8",
  primaryWeaponFeature: "可靠",
} as any)
```

to:

```ts
const migrated = migrateSheetData(v1EquipmentInput({
  primaryWeaponName: "阔剑",
  primaryWeaponTrait: "物理/单手/近战",
  primaryWeaponDamage: "敏捷: d8",
  primaryWeaponFeature: "可靠",
}))
```

- [x] **Step 2: Keep current-shape equipment normalization tests as v2 or no-version as appropriate**

Use explicit v1 when legacy fallback is expected. In this file, these cases should use `v1EquipmentInput()` because they assert legacy fallback behavior:

```ts
it("preserves existing equipment over legacy fields", () => {
  const migrated = migrateSheetData(v1EquipmentInput({
    equipment: {
      weaponSlots: {
        primary: { name: "Existing", trait: "", damage: "", feature: "", modifierContributions: [] },
        secondary: { name: "", trait: "", damage: "", feature: "", modifierContributions: [] },
        inventory: [
          { name: "", trait: "", damage: "", feature: "", modifierContributions: [] },
          { name: "", trait: "", damage: "", feature: "", modifierContributions: [] },
        ],
      },
      armorSlot: {
        name: "Existing Armor",
        baseArmorMax: 9,
        baseThresholds: { minor: 1, major: 2 },
        feature: "",
        modifierContributions: [],
      },
    },
    primaryWeaponName: "Legacy",
    armorName: "Legacy Armor",
  }))

  expect(migrated.equipment.weaponSlots.primary.name).toBe("Existing")
  expect(migrated.equipment.armorSlot.name).toBe("Existing Armor")
})
```

```ts
it("normalizes malformed equipment and fills missing slots from legacy fields", () => {
  const migrated = migrateSheetData(v1EquipmentInput({
    equipment: {
      weaponSlots: {
        primary: { name: "Existing Primary" },
        inventory: [
          { name: "Existing Inventory", damage: "d6" },
        ],
      },
    },
    secondaryWeaponName: "Legacy Secondary",
    secondaryWeaponDamage: "d8",
    inventoryWeapon2Name: "Legacy Inventory 2",
    armorName: "Legacy Armor",
    armorBaseScore: "5",
    armorThreshold: "8/17",
  }))

  expect(migrated.equipment.weaponSlots.primary.name).toBe("Existing Primary")
  expect(migrated.equipment.weaponSlots.secondary.name).toBe("Legacy Secondary")
  expect(migrated.equipment.weaponSlots.inventory[1].name).toBe("Legacy Inventory 2")
  expect(migrated.equipment.armorSlot.baseArmorMax).toBe(5)
})
```

Use explicit v2 for current-shape-only normalization:

```ts
const migrated = migrateSheetData({
  schemaVersion: 2,
  equipment: {},
} as any)
```

The expected result remains complete empty equipment.

- [x] **Step 3: Add helper to modifier migration test**

At the top of `tests/unit/modifiers/migration.test.ts`, add:

```ts
function v1ModifierInput(overrides: Record<string, unknown>) {
  return {
    schemaVersion: 1,
    name: "V1 Modifier",
    level: "1",
    hope: 0,
    hopeMax: 6,
    cards: [],
    inventory_cards: [],
    ...overrides,
  } as any
}
```

Wrap tests that assert legacy `modifierState.byTarget` behavior with `v1ModifierInput(...)`.

- [x] **Step 4: Keep current malformed modifier state normalization as v2**

For current-shape tests like malformed `modifierState: []`, use:

```ts
const migrated = migrateSheetData({
  schemaVersion: 2,
  modifierState: [],
  automationSelections: [],
})
```

Expected result remains:

```ts
expect(migrated.modifierState).toEqual({ targetStates: {}, entryStates: {} })
expect(migrated.automationSelections).toEqual({})
```

- [x] **Step 5: Run focused migration tests**

Run:

```bash
npm run test:run -- tests/unit/equipment/equipment-migration.test.ts tests/unit/modifiers/migration.test.ts
```

Expected: PASS.

---

### Task 6: Update Baseline Tests And Verify Full Suite

**Files:**
- Modify: `tests/unit/migration-regression-baseline.test.ts`
- Possibly modify: any remaining test found by the search command below.

- [x] **Step 1: Update migration baseline naming if needed**

If `tests/unit/migration-regression-baseline.test.ts` still calls the suite `main migration regression baseline`, keep the name only if the assertions are intentionally checking main behavior through v2. Otherwise rename it to:

```ts
describe('migration regression baseline through v2', () => {
```

- [x] **Step 2: Add schema version assertion to first baseline test**

In the first baseline test, add:

```ts
expect(migrated.schemaVersion).toBe(2)
```

Keep the existing assertions for page visibility, hope, notebook, armor template, adventure notes, and equipment cleanup.

- [x] **Step 3: Search for stale version expectations**

Run:

```bash
rg -n "schemaVersion\\).*toBe\\(1\\)|schemaVersion.*1|CURRENT_SCHEMA_VERSION\\).toBe\\(1\\)|schemaVersion: 2.*newer" tests lib
```

Expected after updates: no stale expectations that current migrated data is v1. It is acceptable for fixtures to include `schemaVersion: 1` when they intentionally represent v1 input.

- [x] **Step 4: Run full unit test suite**

Run:

```bash
npm run test:run
```

Expected: PASS.

Note: prior full test runs printed a non-failing stderr about `Cannot find module '../card-types'` in a card store initialization path. If it appears again but Vitest exits successfully, record it in the final summary as existing non-blocking stderr.

- [x] **Step 5: Commit implementation**

Run:

```bash
git status --short
git add lib/sheet-schema-version.ts lib/sheet-data-migration.ts tests/unit/migration-versioning.test.ts tests/unit/equipment/equipment-migration.test.ts tests/unit/modifiers/migration.test.ts tests/unit/storage-migration.test.ts tests/unit/character-data-validator.test.ts tests/unit/import-regression-baseline.test.ts tests/unit/migration-regression-baseline.test.ts
git commit -m "refactor: split v1 to v2 migration boundary"
```

Expected: commit succeeds with only migration boundary implementation and tests.
