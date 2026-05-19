# Stress Base Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a system-provided base pressure max of 6 and merge matching imported estimated stress bases into that system base.

**Architecture:** The system base belongs in `collectSystemModifierEntries`, beside the existing level-derived proficiency base. Migration preservation should prefer the system base when legacy `stressMax` has a numeric final, and normalization should remove only the duplicate `user:stressMax:estimated-base` with value 6 so non-6 legacy estimates remain intact.

**Tech Stack:** TypeScript, Vitest, Zustand-backed sheet data model, modifier registry and migration helpers.

---

### Task 1: System Stress Base

**Files:**
- Modify: `tests/unit/modifiers/source-definitions.test.ts`
- Modify: `tests/unit/modifiers/target-sync.test.ts`
- Modify: `lib/modifiers/source-definitions.ts`

- [ ] **Step 1: Write failing source definition test**

Add this test after the existing proficiency source-definition test in `tests/unit/modifiers/source-definitions.test.ts`:

```ts
  it("derives stress max base and upgrade modifiers from current level", () => {
    const sheetData = {
      ...defaultSheetData,
      level: "1",
      upgradeStates: {
        "tier1-2-0": { checked: true, params: { target: "stressMax" } },
      },
    } as SheetData

    const entries = collectSystemModifierEntries(sheetData)

    expect(entries).toContainEqual(expect.objectContaining({
      id: "level:base:stressMax",
      definition: { target: "stressMax", kind: "base" },
      presentation: { label: "基础压力上限", value: 6 },
      source: { type: "level", id: "level:base" },
    }))
    expect(entries).toContainEqual(expect.objectContaining({
      id: "upgrade:tier1-2-0:stressMax",
      definition: { target: "stressMax", kind: "modifier" },
      presentation: { label: "升级：压力上限 +1", value: 1 },
    }))

    const stressTotal = entries
      .filter(entry => entry.definition.target === "stressMax")
      .reduce((total, entry) => total + entry.presentation.value, 0)
    expect(stressTotal).toBe(7)
  })
```

- [ ] **Step 2: Write failing target-sync test**

Replace the first test in `tests/unit/modifiers/target-sync.test.ts` with:

```ts
  it("starts hp max blank while stress max syncs from the system base", () => {
    expect(defaultSheetData.hpMax).toBe("")
    expect(defaultSheetData.stressMax).toBe("")

    const result = applyAutoCalculationForTargets(defaultSheetData)

    expect(result.hpMax).toBe("")
    expect(result.stressMax).toBe(6)
    expect(result.modifierState?.targetStates.stressMax).toEqual({
      activeBaseId: "level:base:stressMax",
    })
  })
```

- [ ] **Step 3: Run tests to verify RED**

Run:

```bash
npm test -- tests/unit/modifiers/source-definitions.test.ts tests/unit/modifiers/target-sync.test.ts --run
```

Expected: FAIL because `level:base:stressMax` is not emitted and `stressMax` remains blank.

- [ ] **Step 4: Implement system stress base**

In `lib/modifiers/source-definitions.ts`, inside the valid level block immediately before the existing `level:base:proficiency` entry, add:

```ts
    entries.push(createModifierEntry({
      id: "level:base:stressMax",
      sourceId: "level:base",
      target: "stressMax",
      kind: "base",
      label: "基础压力上限",
      value: 6,
      sourceType: "level",
      priority: 100,
    }))
```

- [ ] **Step 5: Run tests to verify GREEN**

Run:

```bash
npm test -- tests/unit/modifiers/source-definitions.test.ts tests/unit/modifiers/target-sync.test.ts --run
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/unit/modifiers/source-definitions.test.ts tests/unit/modifiers/target-sync.test.ts lib/modifiers/source-definitions.ts
git commit -m "feat: add system stress base"
```

### Task 2: Migration Uses System Stress Base

**Files:**
- Modify: `tests/unit/modifiers/migration.test.ts`
- Modify: `lib/sheet-data-migration.ts`

- [ ] **Step 1: Write failing migration tests**

Replace the test named `uses legacy stressMax final as estimated base without hidden baseline` in `tests/unit/modifiers/migration.test.ts` with:

```ts
  it("uses the system stress base for legacy stressMax 6 without creating an estimated base", () => {
    const migrated = migrateSheetData(v1ModifierInput({ stressMax: 6 }))

    expect(migrated.stressMax).toBe(6)
    expect(migrated.userModifierContributions).not.toContainEqual(
      createEstimatedBaseContribution("stressMax", 6),
    )
    expect(migrated.modifierState?.targetStates.stressMax).toEqual({
      activeBaseId: "level:base:stressMax",
      autoCalculation: true,
    })
    expect(migrated.otherAdjustments).toEqual([])
  })

  it("preserves legacy stressMax differences relative to the system stress base", () => {
    const migrated = migrateSheetData(v1ModifierInput({ stressMax: 8 }))

    expect(migrated.stressMax).toBe(8)
    expect(migrated.userModifierContributions).not.toContainEqual(
      createEstimatedBaseContribution("stressMax", 8),
    )
    expect(migrated.modifierState?.targetStates.stressMax).toEqual({
      activeBaseId: "level:base:stressMax",
      autoCalculation: true,
    })
    expect(migrated.otherAdjustments).toContainEqual(
      createUnknownMigrationDifference("stressMax", 2),
    )
  })
```

- [ ] **Step 2: Run migration tests to verify RED**

Run:

```bash
npm test -- tests/unit/modifiers/migration.test.ts --run
```

Expected: FAIL because the old migration creates an estimated base for legacy stress max.

- [ ] **Step 3: Add stress migration baseline**

Change `legacyMigrationBaseline` in `lib/sheet-data-migration.ts` to:

```ts
function legacyMigrationBaseline(target: ModifierTargetId): number | undefined {
  if (target === "stressMax") return 6
  if (target.startsWith("experienceValues.")) return 2
  return undefined
}
```

This makes `preserveLegacyNumericFinal` use the existing system base when one is available and create an `unknownMigrationDifference` only for deltas from 6.

- [ ] **Step 4: Run migration tests to verify GREEN**

Run:

```bash
npm test -- tests/unit/modifiers/migration.test.ts --run
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/modifiers/migration.test.ts lib/sheet-data-migration.ts
git commit -m "fix: merge legacy stress base with system base"
```

### Task 3: Normalize Duplicate Estimated Stress Base

**Files:**
- Modify: `tests/unit/modifiers/migration.test.ts`
- Modify: `lib/sheet-data-migration.ts`

- [ ] **Step 1: Write failing normalization test**

Add this import to `tests/unit/modifiers/migration.test.ts`:

```ts
import { defaultSheetData } from "@/lib/default-sheet-data"
```

Add this test near the other migration tests in `tests/unit/modifiers/migration.test.ts`:

```ts
  it("removes duplicate estimated stress base 6 from current data", () => {
    const migrated = migrateSheetData({
      ...defaultSheetData,
      userModifierContributions: [
        createEstimatedBaseContribution("stressMax", 6),
      ],
      modifierState: {
        targetStates: {
          stressMax: {
            activeBaseId: getEstimatedBaseId("stressMax"),
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
      stressMax: 6,
    })

    expect(migrated.userModifierContributions).not.toContainEqual(
      createEstimatedBaseContribution("stressMax", 6),
    )
    expect(migrated.modifierState?.targetStates.stressMax).toEqual({
      activeBaseId: "level:base:stressMax",
      autoCalculation: true,
    })
    expect(migrated.stressMax).toBe(6)
  })
```

- [ ] **Step 2: Run migration tests to verify RED**

Run:

```bash
npm test -- tests/unit/modifiers/migration.test.ts --run
```

Expected: FAIL because the duplicate estimated base is still retained.

- [ ] **Step 3: Implement duplicate removal helper**

In `lib/sheet-data-migration.ts`, add `isEstimatedBaseContribution` to the import from `special-contributions`:

```ts
  isEstimatedBaseContribution,
```

Then add this helper near `normalizeCurrentModifierCollections`:

```ts
function isDuplicateSystemStressBase(contribution: ModifierContribution): boolean {
  return (
    isEstimatedBaseContribution(contribution) &&
    contribution.definition.target === "stressMax" &&
    contribution.definition.kind === "base" &&
    contribution.editable.value === 6
  )
}
```

Inside `normalizeCurrentModifierCollections`, before the existing `isUnattributedDeltaContribution` branch keeps normal contributions, add:

```ts
    if (isDuplicateSystemStressBase(contribution)) {
      return
    }
```

The existing final `reconcileModifierState(migrated)` call will remove the stale active base and let `level:base:stressMax` become active.

- [ ] **Step 4: Run migration tests to verify GREEN**

Run:

```bash
npm test -- tests/unit/modifiers/migration.test.ts --run
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/modifiers/migration.test.ts lib/sheet-data-migration.ts
git commit -m "fix: drop duplicate estimated stress base"
```

### Task 4: Final Verification

**Files:**
- No code changes expected.

- [ ] **Step 1: Run focused modifier tests**

```bash
npm test -- tests/unit/modifiers/source-definitions.test.ts tests/unit/modifiers/target-sync.test.ts tests/unit/modifiers/migration.test.ts --run
```

Expected: PASS.

- [ ] **Step 2: Run full unit tests**

```bash
npm run test:unit
```

Expected: PASS.

- [ ] **Step 3: Check worktree**

```bash
git status --short
```

Expected: no uncommitted source or test changes.
