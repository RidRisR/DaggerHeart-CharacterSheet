# Final Input Automation Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace sync-mode based target automation with automatic calculation and final-input reconciliation, so user edits are represented as target-owned special contributions while legacy final values are preserved during migration.

**Architecture:** Keep schema version 2 and treat this as part of the modifier branch v2 migration. Add focused modifier helpers for special contribution identity, final-input reconciliation, and auto-calculation. Rewire store actions and modifier UI to use `autoCalculation?: true`, remove entry-level disable UI, and update v1 -> v2 migration to create `未归因差额` / `估算基础值` while preserving legacy final values.

**Compatibility Boundary:** Only preserve behavior for save data from the published `main` branch and earlier unversioned saves that migrate through the main v0 -> v1 path. Modifier-branch intermediate save shapes were never released and do not need compatibility branches. Current modifier-branch migration code may be rewritten into the v1 -> v2 path as long as published main saves migrate safely and final v2 saves are idempotent on reload.

**Tech Stack:** TypeScript, React, Zustand store, Vitest, React Testing Library, existing modifier registry/reference helpers.

---

## File Map

- Create: `lib/modifiers/special-contributions.ts`  
  Owns target-owned special ids, labels, predicates, and contribution constructors.

- Create: `tests/unit/modifiers/special-contributions.test.ts`  
  Locks special id format, label constants, target-owned detection, and same-label user collision behavior.

- Create: `lib/modifiers/final-input-reconciliation.ts`  
  Owns final input reconciliation, auto-calculation target application, special base deletion behavior, and v2 migration-preservation helpers.

- Create: `tests/unit/modifiers/final-input-reconciliation.test.ts`  
  Locks user-final commit behavior, enable-auto behavior, special base deletion, non-numeric pause, fallback handling, and disabled-entry cleanup assumptions.

- Modify: `lib/modifiers/types.ts`  
  Replace `TargetSyncMode` / `syncMode` with `autoCalculation?: true` in `TargetModifierState`. Keep no public sync mode type.

- Modify: `lib/modifiers/reference-calculator.ts`  
  Stop exposing entry-level enabled/disabled semantics as a user feature; compute summaries from current entries and active base. Keep only the fields still used by UI/tests.

- Modify: `lib/modifiers/target-sync.ts`  
  Keep the file path for compatibility, but replace its exports with auto-calculation helpers. Remove one-shot sync behavior from UI-facing API.

- Modify: `lib/modifiers/reconcile.ts`  
  Preserve active-base reconciliation and migrate `syncMode: "continuous"` to `autoCalculation: true` where current data still contains sync mode.

- Modify: `lib/modifiers/registry.ts`  
  Make special contributions flow through existing `userModifierContributions` collection while preserving special identity.

- Modify: `lib/sheet-store.ts`  
  Replace `setTargetSyncMode`, `syncModifierTargetOnce`, and `setModifierEntryEnabled` with auto-calculation and final-input reconciliation actions. Route target final updates through reconciliation where applicable.

- Modify: `components/modifiers/modifier-popover.tsx`  
  Remove sync button, continuous checkbox, and entry checkboxes. Add auto-calculation toggle/action UI, source ownership display, and delete-only controls for user-owned / target-owned special entries.

- Modify: final-value update call sites:
  - `components/character-sheet-sections/attributes-section.tsx`
  - `components/character-sheet-sections/experience-section.tsx`
  - `components/character-sheet.tsx`
  - `components/upgrade-popover/hp-max-editor.tsx`
  - `components/upgrade-popover/stress-max-editor.tsx`
  - `components/upgrade-popover/proficiency-editor.tsx`
  - `components/character-sheet-sections/armor-section.tsx`
  Use store actions that route committed final target changes through reconciliation.

- Modify: `lib/sheet-data-migration.ts`  
  Update v1 -> v2 modifier migration to set auto-calculation, clear/ignore old disabled entry states, create estimated bases / unattributed deltas, and preserve explicit legacy final values.

- Modify tests:
  - `tests/unit/modifiers/target-sync.test.ts`
  - `tests/unit/modifiers/reference-calculator.test.ts`
  - `tests/unit/modifiers/reconcile.test.ts`
  - `tests/unit/modifiers/store-actions.test.ts`
  - `tests/unit/modifiers/modifier-popover.test.tsx`
  - `tests/unit/modifiers/migration.test.ts`
  - `tests/unit/migration-versioning.test.ts`
  Update old sync/disable expectations to new auto-calculation/reconciliation expectations.

---

### Task 1: Add Special Contribution Identity Helpers

**Files:**
- Create: `lib/modifiers/special-contributions.ts`
- Create: `tests/unit/modifiers/special-contributions.test.ts`

- [ ] **Step 1: Write failing tests for special contribution identity**

Create `tests/unit/modifiers/special-contributions.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
  ESTIMATED_BASE_LABEL,
  MANUAL_BASE_LABEL,
  UNATTRIBUTED_DELTA_LABEL,
  createEstimatedBaseContribution,
  createManualBaseContribution,
  createUnattributedDeltaContribution,
  getEstimatedBaseId,
  getManualBaseId,
  getUnattributedDeltaId,
  isTargetOwnedSpecialContribution,
  isUnattributedDeltaContribution,
} from "@/lib/modifiers/special-contributions"

describe("special contributions", () => {
  it("uses stable user-prefixed ids while modeling target-owned entries", () => {
    expect(getManualBaseId("evasion")).toBe("user:evasion:manual-base")
    expect(getEstimatedBaseId("evasion")).toBe("user:evasion:estimated-base")
    expect(getUnattributedDeltaId("evasion")).toBe("user:evasion:unattributed-delta")
  })

  it("creates fixed-label target-owned special contributions", () => {
    expect(createManualBaseContribution("evasion", 12)).toEqual({
      id: "user:evasion:manual-base",
      definition: { target: "evasion", kind: "base" },
      editable: { label: MANUAL_BASE_LABEL, value: 12 },
    })
    expect(createEstimatedBaseContribution("evasion", 11)).toEqual({
      id: "user:evasion:estimated-base",
      definition: { target: "evasion", kind: "base" },
      editable: { label: ESTIMATED_BASE_LABEL, value: 11 },
    })
    expect(createUnattributedDeltaContribution("evasion", 3)).toEqual({
      id: "user:evasion:unattributed-delta",
      definition: { target: "evasion", kind: "modifier" },
      editable: { label: UNATTRIBUTED_DELTA_LABEL, value: 3 },
    })
  })

  it("detects special entries by id and target, not label", () => {
    const special = createUnattributedDeltaContribution("evasion", 3)
    const normalSameLabel = {
      id: "user:evasion:custom-1",
      definition: { target: "evasion", kind: "modifier" as const },
      editable: { label: UNATTRIBUTED_DELTA_LABEL, value: 3 },
    }

    expect(isTargetOwnedSpecialContribution(special)).toBe(true)
    expect(isUnattributedDeltaContribution(special)).toBe(true)
    expect(isTargetOwnedSpecialContribution(normalSameLabel)).toBe(false)
    expect(isUnattributedDeltaContribution(normalSameLabel)).toBe(false)
  })
})
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
npm run test:run -- tests/unit/modifiers/special-contributions.test.ts
```

Expected: FAIL because `@/lib/modifiers/special-contributions` does not exist.

- [ ] **Step 3: Implement `special-contributions.ts`**

Create `lib/modifiers/special-contributions.ts`:

```ts
import type { ModifierContribution, ModifierTargetId } from "./types"

export const MANUAL_BASE_LABEL = "手动基础值"
export const ESTIMATED_BASE_LABEL = "估算基础值"
export const UNATTRIBUTED_DELTA_LABEL = "未归因差额"

export function getManualBaseId(target: ModifierTargetId): string {
  return `user:${target}:manual-base`
}

export function getEstimatedBaseId(target: ModifierTargetId): string {
  return `user:${target}:estimated-base`
}

export function getUnattributedDeltaId(target: ModifierTargetId): string {
  return `user:${target}:unattributed-delta`
}

export function createManualBaseContribution(target: ModifierTargetId, value: number): ModifierContribution {
  return {
    id: getManualBaseId(target),
    definition: { target, kind: "base" },
    editable: { label: MANUAL_BASE_LABEL, value },
  }
}

export function createEstimatedBaseContribution(target: ModifierTargetId, value: number): ModifierContribution {
  return {
    id: getEstimatedBaseId(target),
    definition: { target, kind: "base" },
    editable: { label: ESTIMATED_BASE_LABEL, value },
  }
}

export function createUnattributedDeltaContribution(target: ModifierTargetId, value: number): ModifierContribution {
  return {
    id: getUnattributedDeltaId(target),
    definition: { target, kind: "modifier" },
    editable: { label: UNATTRIBUTED_DELTA_LABEL, value },
  }
}

export function isManualBaseContribution(contribution: Pick<ModifierContribution, "id" | "definition">): boolean {
  return contribution.id === getManualBaseId(contribution.definition.target)
}

export function isEstimatedBaseContribution(contribution: Pick<ModifierContribution, "id" | "definition">): boolean {
  return contribution.id === getEstimatedBaseId(contribution.definition.target)
}

export function isUnattributedDeltaContribution(contribution: Pick<ModifierContribution, "id" | "definition">): boolean {
  return contribution.id === getUnattributedDeltaId(contribution.definition.target)
}

export function isTargetOwnedSpecialContribution(contribution: Pick<ModifierContribution, "id" | "definition">): boolean {
  return (
    isManualBaseContribution(contribution) ||
    isEstimatedBaseContribution(contribution) ||
    isUnattributedDeltaContribution(contribution)
  )
}
```

- [ ] **Step 4: Run the test**

Run:

```bash
npm run test:run -- tests/unit/modifiers/special-contributions.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/modifiers/special-contributions.ts tests/unit/modifiers/special-contributions.test.ts
git commit -m "feat: add special modifier contribution helpers"
```

---

### Task 2: Replace Sync Mode State With Auto Calculation State

**Files:**
- Modify: `lib/modifiers/types.ts`
- Modify: `lib/modifiers/reconcile.ts`
- Modify: `tests/unit/modifiers/reconcile.test.ts`
- Modify: `tests/unit/modifiers/store-actions.test.ts`

- [ ] **Step 1: Update type tests / compile expectations**

In `tests/unit/modifiers/reconcile.test.ts`, replace sync-mode preservation cases with auto-calculation preservation:

```ts
it("preserves auto calculation when active base is still valid", () => {
  const data = reconcileModifierState({
    modifierState: {
      targetStates: {
        evasion: {
          activeBaseId: "user:evasion-base",
          autoCalculation: true,
        },
      },
      entryStates: {},
    },
    userModifierContributions: [{
      id: "user:evasion-base",
      definition: { target: "evasion", kind: "base" },
      editable: { label: "Base", value: 12 },
    }],
  } as any)

  expect(data.modifierState?.targetStates.evasion).toEqual({
    activeBaseId: "user:evasion-base",
    autoCalculation: true,
  })
})
```

Also add legacy sync migration compatibility:

```ts
it("normalizes legacy continuous sync mode to auto calculation", () => {
  const data = reconcileModifierState({
    modifierState: {
      targetStates: {
        evasion: {
          activeBaseId: "user:evasion-base",
          syncMode: "continuous",
        },
      },
      entryStates: {},
    },
    userModifierContributions: [{
      id: "user:evasion-base",
      definition: { target: "evasion", kind: "base" },
      editable: { label: "Base", value: 12 },
    }],
  } as any)

  expect(data.modifierState?.targetStates.evasion).toEqual({
    activeBaseId: "user:evasion-base",
    autoCalculation: true,
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm run test:run -- tests/unit/modifiers/reconcile.test.ts tests/unit/modifiers/store-actions.test.ts
```

Expected: FAIL because `autoCalculation` is not typed/normalized yet and old store tests still refer to sync mode.

- [ ] **Step 3: Update `types.ts`**

Change `TargetModifierState` in `lib/modifiers/types.ts`:

```ts
export interface TargetModifierState {
  activeBaseId?: ModifierEntryId
  autoCalculation?: true
}
```

Remove:

```ts
export type TargetSyncMode = "manual" | "continuous"
```

- [ ] **Step 4: Update reconcile target state cleanup**

In `lib/modifiers/reconcile.ts`, normalize target state shape with this logic:

```ts
function shouldEnableAutoCalculation(state: { autoCalculation?: unknown; syncMode?: unknown }): boolean {
  return state.autoCalculation === true || state.syncMode === "continuous"
}
```

When writing target state:

```ts
const nextState: TargetModifierState = {}
if (activeBaseIdStillValid) {
  nextState.activeBaseId = activeBaseId
}
if (shouldEnableAutoCalculation(state as any)) {
  nextState.autoCalculation = true
}
```

Do not write `syncMode`.

- [ ] **Step 5: Update `sheet-store.ts` signatures only enough to compile**

Replace interface methods:

```ts
setTargetAutoCalculation: (target: ModifierTargetId, enabled: boolean) => void;
```

Remove:

```ts
setTargetSyncMode: (target: ModifierTargetId, syncMode: TargetSyncMode) => void;
syncModifierTargetOnce: (target: ModifierTargetId) => void;
setModifierEntryEnabled: (entryId: ModifierEntryId, enabled: boolean) => void;
```

Implement `setTargetAutoCalculation` by setting `autoCalculation: true` when enabled and deleting `autoCalculation` when disabled. Do not call final-input reconciliation in this task; Task 4 replaces this minimal implementation with the full reconciliation behavior.

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/reconcile.test.ts tests/unit/modifiers/store-actions.test.ts
```

Expected: PASS. Remove or rewrite any store tests that still assert `syncMode`, `setTargetSyncMode`, `syncModifierTargetOnce`, or `setModifierEntryEnabled`.

- [ ] **Step 7: Commit**

```bash
git add lib/modifiers/types.ts lib/modifiers/reconcile.ts lib/sheet-store.ts tests/unit/modifiers/reconcile.test.ts tests/unit/modifiers/store-actions.test.ts
git commit -m "refactor: replace target sync mode with auto calculation state"
```

---

### Task 3: Implement Final Input Reconciliation Core

**Files:**
- Create: `lib/modifiers/final-input-reconciliation.ts`
- Create: `tests/unit/modifiers/final-input-reconciliation.test.ts`
- Modify: `lib/modifiers/registry.ts`
- Modify: `lib/modifiers/reference-calculator.ts`

- [ ] **Step 1: Write reconciliation tests**

Create `tests/unit/modifiers/final-input-reconciliation.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { defaultSheetData } from "@/lib/default-sheet-data"
import {
  reconcileFinalInput,
  enableAutoCalculationForTarget,
  deleteSpecialBase,
} from "@/lib/modifiers/final-input-reconciliation"
import type { SheetData } from "@/lib/sheet-data"

function sheet(overrides: Partial<SheetData> = {}): SheetData {
  return { ...defaultSheetData, ...overrides }
}

describe("final input reconciliation", () => {
  it("creates a manual base from user input when no base exists", () => {
    const result = reconcileFinalInput(sheet({ evasion: "" }), "evasion", "12")

    expect(result.evasion).toBe("12")
    expect(result.userModifierContributions).toContainEqual({
      id: "user:evasion:manual-base",
      definition: { target: "evasion", kind: "base" },
      editable: { label: "手动基础值", value: 12 },
    })
    expect(result.modifierState?.targetStates.evasion).toMatchObject({
      activeBaseId: "user:evasion:manual-base",
      autoCalculation: true,
    })
  })

  it("updates unattributed delta when active base exists", () => {
    const result = reconcileFinalInput(sheet({
      evasion: "10",
      userModifierContributions: [{
        id: "user:evasion-base",
        definition: { target: "evasion", kind: "base" },
        editable: { label: "Base", value: 12 },
      }],
      modifierState: {
        targetStates: { evasion: { activeBaseId: "user:evasion-base", autoCalculation: true } },
        entryStates: {},
      },
    }), "evasion", "15")

    expect(result.evasion).toBe("15")
    expect(result.userModifierContributions).toContainEqual({
      id: "user:evasion:unattributed-delta",
      definition: { target: "evasion", kind: "modifier" },
      editable: { label: "未归因差额", value: 3 },
    })
  })

  it("deletes unattributed delta when user input matches reference without it", () => {
    const result = reconcileFinalInput(sheet({
      evasion: "15",
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Base", value: 12 },
        },
        {
          id: "user:evasion:unattributed-delta",
          definition: { target: "evasion", kind: "modifier" },
          editable: { label: "未归因差额", value: 3 },
        },
      ],
      modifierState: {
        targetStates: { evasion: { activeBaseId: "user:evasion-base", autoCalculation: true } },
        entryStates: {},
      },
    }), "evasion", "12")

    expect(result.evasion).toBe("12")
    expect(result.userModifierContributions?.some(entry => entry.id === "user:evasion:unattributed-delta")).toBe(false)
  })

  it("pauses reconciliation for non numeric final input", () => {
    const input = sheet({ evasion: "12+敏捷" })
    const result = reconcileFinalInput(input, "evasion", "12+敏捷")

    expect(result).toBe(input)
  })

  it("materializes current delta when enabling auto calculation", () => {
    const result = enableAutoCalculationForTarget(sheet({
      evasion: "15",
      userModifierContributions: [{
        id: "user:evasion-base",
        definition: { target: "evasion", kind: "base" },
        editable: { label: "Base", value: 12 },
      }],
      modifierState: {
        targetStates: { evasion: { activeBaseId: "user:evasion-base" } },
        entryStates: {},
      },
    }), "evasion")

    expect(result.modifierState?.targetStates.evasion?.autoCalculation).toBe(true)
    expect(result.userModifierContributions).toContainEqual({
      id: "user:evasion:unattributed-delta",
      definition: { target: "evasion", kind: "modifier" },
      editable: { label: "未归因差额", value: 3 },
    })
    expect(result.evasion).toBe("15")
  })

  it("delete special active base falls forward to another base and preserves final with delta", () => {
    const result = deleteSpecialBase(sheet({
      evasion: "15",
      userModifierContributions: [
        {
          id: "user:evasion:manual-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "手动基础值", value: 12 },
        },
        {
          id: "user:evasion-other-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Other", value: 14 },
        },
      ],
      modifierState: {
        targetStates: { evasion: { activeBaseId: "user:evasion:manual-base", autoCalculation: true } },
        entryStates: {},
      },
    }), "evasion", "user:evasion:manual-base")

    expect(result.modifierState?.targetStates.evasion?.activeBaseId).toBe("user:evasion-other-base")
    expect(result.userModifierContributions).toContainEqual({
      id: "user:evasion:unattributed-delta",
      definition: { target: "evasion", kind: "modifier" },
      editable: { label: "未归因差额", value: 1 },
    })
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
npm run test:run -- tests/unit/modifiers/final-input-reconciliation.test.ts
```

Expected: FAIL because `final-input-reconciliation.ts` does not exist.

- [ ] **Step 3: Implement `final-input-reconciliation.ts`**

Create `lib/modifiers/final-input-reconciliation.ts` with these public functions:

```ts
import { tryParseNumber } from "@/lib/number-utils"
import type { SheetData } from "@/lib/sheet-data"
import { getReferenceSummary } from "./registry"
import {
  createManualBaseContribution,
  createUnattributedDeltaContribution,
  getUnattributedDeltaId,
  isTargetOwnedSpecialContribution,
} from "./special-contributions"
import { readTargetValue, writeTargetValue } from "./target-accessors"
import type { ModifierContribution, ModifierEntry, ModifierTargetId } from "./types"

function upsertContribution(sheetData: SheetData, contribution: ModifierContribution): SheetData {
  const contributions = sheetData.userModifierContributions ?? []
  const next = contributions.some(existing => existing.id === contribution.id)
    ? contributions.map(existing => existing.id === contribution.id ? contribution : existing)
    : [...contributions, contribution]
  return { ...sheetData, userModifierContributions: next }
}

function removeContribution(sheetData: SheetData, entryId: string): SheetData {
  return {
    ...sheetData,
    userModifierContributions: (sheetData.userModifierContributions ?? []).filter(entry => entry.id !== entryId),
  }
}

function setTargetState(sheetData: SheetData, target: ModifierTargetId, state: { activeBaseId?: string; autoCalculation?: true }): SheetData {
  return {
    ...sheetData,
    modifierState: {
      targetStates: {
        ...(sheetData.modifierState?.targetStates ?? {}),
        [target]: state,
      },
      entryStates: {
        ...(sheetData.modifierState?.entryStates ?? {}),
      },
    },
  }
}

function referenceExcludingUnattributedDelta(sheetData: SheetData, target: ModifierTargetId): number | undefined {
  const deltaId = getUnattributedDeltaId(target)
  const withoutDelta = {
    ...sheetData,
    userModifierContributions: (sheetData.userModifierContributions ?? []).filter(entry => entry.id !== deltaId),
  }
  return getReferenceSummary(withoutDelta, target).referenceTotal
}

export function reconcileFinalInput(sheetData: SheetData, target: ModifierTargetId, rawValue: unknown): SheetData {
  const parsed = tryParseNumber(rawValue)
  if (parsed === undefined) return sheetData

  const summary = getReferenceSummary(sheetData, target)
  let next = writeTargetValue(sheetData, target, parsed)

  if (!summary.activeBase && summary.bases.length === 0) {
    const manualBase = createManualBaseContribution(target, parsed)
    next = upsertContribution(next, manualBase)
    next = setTargetState(next, target, {
      ...(next.modifierState?.targetStates?.[target] ?? {}),
      activeBaseId: manualBase.id,
      autoCalculation: true,
    })
    return next
  }

  const activeBaseId = summary.activeBase?.id ?? summary.bases[0]?.id
  if (activeBaseId) {
    next = setTargetState(next, target, {
      ...(next.modifierState?.targetStates?.[target] ?? {}),
      activeBaseId,
      autoCalculation: true,
    })
  }

  const reference = referenceExcludingUnattributedDelta(next, target)
  if (reference === undefined) return next

  const delta = parsed - reference
  const deltaId = getUnattributedDeltaId(target)
  if (delta === 0) {
    return removeContribution(next, deltaId)
  }

  return upsertContribution(next, createUnattributedDeltaContribution(target, delta))
}

export function enableAutoCalculationForTarget(sheetData: SheetData, target: ModifierTargetId): SheetData {
  const currentValue = readTargetValue(sheetData, target)
  const parsed = tryParseNumber(currentValue)
  if (parsed === undefined) {
    return setTargetState(sheetData, target, {
      ...(sheetData.modifierState?.targetStates?.[target] ?? {}),
      autoCalculation: true,
    })
  }
  return reconcileFinalInput(setTargetState(sheetData, target, {
    ...(sheetData.modifierState?.targetStates?.[target] ?? {}),
    autoCalculation: true,
  }), target, parsed)
}

export function deleteSpecialBase(sheetData: SheetData, target: ModifierTargetId, entryId: string): SheetData {
  let next = removeContribution(sheetData, entryId)
  const summary = getReferenceSummary(next, target)
  const currentFinal = tryParseNumber(readTargetValue(next, target))

  if (summary.bases[0]) {
    next = setTargetState(next, target, {
      ...(next.modifierState?.targetStates?.[target] ?? {}),
      activeBaseId: summary.bases[0].id,
      autoCalculation: next.modifierState?.targetStates?.[target]?.autoCalculation,
    })
    if (currentFinal !== undefined) {
      next = reconcileFinalInput(next, target, currentFinal)
    }
    return next
  }

  next = setTargetState(next, target, {
    ...(next.modifierState?.targetStates?.[target] ?? {}),
    activeBaseId: undefined,
    autoCalculation: next.modifierState?.targetStates?.[target]?.autoCalculation,
  })
  return next
}
```

After implementation, run the TypeScript-aware tests in Step 5. If TypeScript reports unused imports from the copied snippet, delete those imports without changing the public function names shown above.

- [ ] **Step 4: Update reference calculator to ignore removed disabled semantics**

In `lib/modifiers/reference-calculator.ts`, replace enabled/disabled filtering with direct target entry filtering:

```ts
const bases = targetEntries.filter(entry => entryKind(entry) === "base")
const modifiers = targetEntries.filter(entry => entryKind(entry) === "modifier")
const enabledModifiers = modifiers
const disabledEntries: ModifierEntry[] = []
```

Keep `enabledModifiers` and `disabledEntries` fields for minimal compatibility if tests/components still read them.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/special-contributions.test.ts tests/unit/modifiers/final-input-reconciliation.test.ts tests/unit/modifiers/reference-calculator.test.ts
```

Expected: PASS after updating old reference-calculator expectations that asserted disabled behavior.

- [ ] **Step 6: Commit**

```bash
git add lib/modifiers/final-input-reconciliation.ts lib/modifiers/reference-calculator.ts tests/unit/modifiers/final-input-reconciliation.test.ts tests/unit/modifiers/reference-calculator.test.ts
git commit -m "feat: reconcile final inputs through modifier sources"
```

---

### Task 4: Route Store Actions Through Reconciliation

**Files:**
- Modify: `lib/sheet-store.ts`
- Modify: `lib/modifiers/target-sync.ts`
- Modify: `tests/unit/modifiers/store-actions.test.ts`
- Modify: `tests/unit/modifiers/target-sync.test.ts`

- [ ] **Step 1: Replace sync helper tests with auto-calculation tests**

In `tests/unit/modifiers/target-sync.test.ts`, replace current contents with:

```ts
import { describe, expect, it } from "vitest"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { applyAutoCalculationForTargets } from "@/lib/modifiers/target-sync"
import type { SheetData } from "@/lib/sheet-data"

function sheet(overrides: Partial<SheetData> = {}): SheetData {
  return { ...defaultSheetData, ...overrides }
}

describe("target auto calculation helper", () => {
  it("applies reference total for auto-calculated targets", () => {
    const result = applyAutoCalculationForTargets(sheet({
      evasion: "10",
      hpMax: 6,
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Base", value: 12 },
        },
        {
          id: "user:hp-base",
          definition: { target: "hpMax", kind: "base" },
          editable: { label: "HP", value: 7 },
        },
      ],
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: "user:evasion-base", autoCalculation: true },
          hpMax: { activeBaseId: "user:hp-base" },
        },
        entryStates: {},
      },
    }))

    expect(result.evasion).toBe("12")
    expect(result.hpMax).toBe(6)
  })

  it("does not overwrite non numeric paused finals", () => {
    const result = applyAutoCalculationForTargets(sheet({
      evasion: "12+敏捷",
      userModifierContributions: [{
        id: "user:evasion-base",
        definition: { target: "evasion", kind: "base" },
        editable: { label: "Base", value: 12 },
      }],
      modifierState: {
        targetStates: { evasion: { activeBaseId: "user:evasion-base", autoCalculation: true } },
        entryStates: {},
      },
    }))

    expect(result.evasion).toBe("12+敏捷")
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm run test:run -- tests/unit/modifiers/target-sync.test.ts tests/unit/modifiers/store-actions.test.ts
```

Expected: FAIL because store/helper APIs still use sync mode.

- [ ] **Step 3: Implement `applyAutoCalculationForTargets`**

In `lib/modifiers/target-sync.ts`, replace public API with:

```ts
import { tryParseNumber } from "@/lib/number-utils"
import type { SheetData } from "@/lib/sheet-data"
import { getReferenceSummary } from "./registry"
import { readTargetValue, writeTargetValue } from "./target-accessors"
import type { ModifierTargetId } from "./types"

function autoCalculationTargets(sheetData: SheetData): ModifierTargetId[] {
  return Object.entries(sheetData.modifierState?.targetStates ?? {})
    .filter(([, state]) => state?.autoCalculation === true)
    .map(([target]) => target as ModifierTargetId)
}

function shouldPauseForNonNumericFinal(sheetData: SheetData, target: ModifierTargetId): boolean {
  const current = readTargetValue(sheetData, target)
  return current !== "" && current !== undefined && tryParseNumber(current) === undefined
}

export function applyAutoCalculationForTargets(sheetData: SheetData): SheetData {
  let next = sheetData
  let changed = false

  autoCalculationTargets(sheetData).forEach(target => {
    if (shouldPauseForNonNumericFinal(next, target)) return
    const summary = getReferenceSummary(next, target)
    if (summary.referenceTotal === undefined) return
    if (tryParseNumber(readTargetValue(next, target)) === summary.referenceTotal) return
    next = writeTargetValue(next, target, summary.referenceTotal)
    changed = true
  })

  return changed ? next : sheetData
}
```

- [ ] **Step 4: Update store actions**

In `lib/sheet-store.ts`:

1. Import:

```ts
import { enableAutoCalculationForTarget, reconcileFinalInput } from "@/lib/modifiers/final-input-reconciliation"
import { applyAutoCalculationForTargets } from "@/lib/modifiers/target-sync"
```

2. Replace every `applyContinuousTargetSync(...)` call with `applyAutoCalculationForTargets(...)`.

3. Add action:

```ts
setTargetAutoCalculation: (target, enabled) => set((state) => {
  if (enabled) {
    return { sheetData: enableAutoCalculationForTarget(state.sheetData, target) }
  }

  const modifierState = ensureModifierState(state.sheetData)
  const targetStates = { ...modifierState.targetStates }
  const currentTargetState = { ...(targetStates[target] ?? {}) }
  delete currentTargetState.autoCalculation
  setTargetState(targetStates, target, currentTargetState)

  return {
    sheetData: {
      ...state.sheetData,
      modifierState: {
        ...modifierState,
        targetStates,
      },
    },
  }
})
```

4. Add action:

```ts
commitModifierTargetValue: (target, value) => set((state) => {
  const targetState = state.sheetData.modifierState?.targetStates?.[target]
  if (targetState?.autoCalculation) {
    return { sheetData: applyAutoCalculationForTargets(reconcileFinalInput(state.sheetData, target, value)) }
  }
  return { sheetData: writeTargetValue(state.sheetData, target, value as number | string) }
})
```

5. Remove `setModifierEntryEnabled`, `setTargetSyncMode`, and `syncModifierTargetOnce` from the public interface and implementation.

- [ ] **Step 5: Update store action tests**

In `tests/unit/modifiers/store-actions.test.ts`, replace sync/disable tests with:

```ts
it("enables auto calculation and materializes the current unattributed delta", () => {
  resetSheetStore({
    evasion: "15",
    userModifierContributions: [{
      id: "user:evasion-base",
      definition: { target: "evasion", kind: "base" },
      editable: { label: "Base", value: 12 },
    }],
    modifierState: {
      targetStates: { evasion: { activeBaseId: "user:evasion-base" } },
      entryStates: {},
    },
  })

  useSheetStore.getState().setTargetAutoCalculation("evasion", true)

  expect(sheet().modifierState?.targetStates.evasion?.autoCalculation).toBe(true)
  expect(sheet().userModifierContributions).toContainEqual({
    id: "user:evasion:unattributed-delta",
    definition: { target: "evasion", kind: "modifier" },
    editable: { label: "未归因差额", value: 3 },
  })
  expect(sheet().evasion).toBe("15")
})
```

Also add:

```ts
it("commit target value updates delta while auto calculation is enabled", () => {
  resetSheetStore({
    evasion: "15",
    userModifierContributions: [{
      id: "user:evasion-base",
      definition: { target: "evasion", kind: "base" },
      editable: { label: "Base", value: 12 },
    }],
    modifierState: {
      targetStates: { evasion: { activeBaseId: "user:evasion-base", autoCalculation: true } },
      entryStates: {},
    },
  })

  useSheetStore.getState().commitModifierTargetValue("evasion", "16")

  expect(sheet().userModifierContributions).toContainEqual({
    id: "user:evasion:unattributed-delta",
    definition: { target: "evasion", kind: "modifier" },
    editable: { label: "未归因差额", value: 4 },
  })
  expect(sheet().evasion).toBe("16")
})
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/target-sync.test.ts tests/unit/modifiers/store-actions.test.ts tests/unit/modifiers/final-input-reconciliation.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/sheet-store.ts lib/modifiers/target-sync.ts tests/unit/modifiers/target-sync.test.ts tests/unit/modifiers/store-actions.test.ts
git commit -m "feat: route target updates through auto calculation"
```

---

### Task 5: Update Modifier Popover UI

**Files:**
- Modify: `components/modifiers/modifier-popover.tsx`
- Modify: `tests/unit/modifiers/modifier-popover.test.tsx`

- [ ] **Step 1: Replace UI tests for sync and disable behavior**

In `tests/unit/modifiers/modifier-popover.test.tsx`:

1. Remove tests named:
   - `"lets the user disable and re-enable a modifier"`
   - `"keeps disabled modifiers visible but removes them from active addends"`
   - `"syncs the final value once from the popover"`
   - `"disables one-shot sync when base is unknown"`
   - `"toggles continuous sync from the popover"`

2. Add:

```ts
it("shows auto calculation action and no sync or entry disable controls", async () => {
  resetSheetStore({
    evasion: "15",
    userModifierContributions: [
      userContribution("user:evasion-base", "evasion", "base", "基础", 12),
      userContribution("user:evasion-mod", "evasion", "modifier", "加值", 1),
    ],
    modifierState: {
      targetStates: { evasion: { activeBaseId: "user:evasion-base" } },
      entryStates: {},
    },
  })

  render(<ModifierFieldAnchor target="evasion" label="闪避" />)
  await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

  expect(screen.getByRole("button", { name: "开启自动计算" })).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "同步" })).not.toBeInTheDocument()
  expect(screen.queryByRole("checkbox", { name: "持续同步" })).not.toBeInTheDocument()
  expect(screen.queryByRole("checkbox", { name: /加值/ })).not.toBeInTheDocument()
})
```

3. Add:

```ts
it("enables auto calculation and turns the visible delta into a special modifier", async () => {
  resetSheetStore({
    evasion: "15",
    userModifierContributions: [
      userContribution("user:evasion-base", "evasion", "base", "基础", 12),
    ],
    modifierState: {
      targetStates: { evasion: { activeBaseId: "user:evasion-base" } },
      entryStates: {},
    },
  })

  render(<ModifierFieldAnchor target="evasion" label="闪避" />)
  await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))
  expect(screen.getByText("未归因差额 +3")).toBeInTheDocument()

  await userEvent.click(screen.getByRole("button", { name: "开启自动计算" }))

  expect(screen.getByRole("button", { name: "关闭自动计算" })).toBeInTheDocument()
  expect(screen.getByRole("spinbutton", { name: "编辑未归因差额数值" })).toHaveValue(3)
  expect(screen.queryByText("未归因差额 +3")).not.toBeInTheDocument()
  expect(sheet().userModifierContributions).toContainEqual({
    id: "user:evasion:unattributed-delta",
    definition: { target: "evasion", kind: "modifier" },
    editable: { label: "未归因差额", value: 3 },
  })
})
```

4. Add:

```ts
it("keeps system entries readonly and deletes user entries from the same action position", async () => {
  resetSheetStore({
    evasion: "15",
    professionRef: { id: "warrior", name: "战士" },
    cards: [{
      id: "warrior",
      type: "profession",
      name: "战士",
      professionSpecial: { 起始闪避: 12 },
    } as any],
    userModifierContributions: [
      userContribution("user:evasion-mod", "evasion", "modifier", "临时加值", 1),
    ],
    modifierState: {
      targetStates: { evasion: { activeBaseId: "profession:current:evasion" } },
      entryStates: {},
    },
  })

  render(<ModifierFieldAnchor target="evasion" label="闪避" />)
  await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

  expect(screen.queryByRole("button", { name: /删除战士/ })).not.toBeInTheDocument()
  expect(screen.getByRole("button", { name: "删除临时加值" })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm run test:run -- tests/unit/modifiers/modifier-popover.test.tsx
```

Expected: FAIL because UI still renders sync/disable controls.

- [ ] **Step 3: Update popover store bindings**

In `components/modifiers/modifier-popover.tsx`:

1. Import `Trash2`:

```ts
import { Trash2 } from "lucide-react"
```

2. Replace old store selectors:

```ts
const setTargetAutoCalculation = useSheetStore(state => state.setTargetAutoCalculation)
```

Remove:

```ts
const setTargetSyncMode = useSheetStore(...)
const syncModifierTargetOnce = useSheetStore(...)
const setModifierEntryEnabled = useSheetStore(...)
```

3. Compute:

```ts
const autoCalculation = targetState?.autoCalculation === true
```

- [ ] **Step 4: Remove entry checkboxes and sync controls**

In base/modifier row rendering:

- Do not render modifier checkbox.
- Do not line-through disabled rows.
- Do not render bottom sync button or continuous checkbox.
- Render auto-calculation action:

```tsx
<button
  type="button"
  className="h-7 rounded border border-gray-300 px-3 text-[11px] text-gray-700 hover:bg-gray-50"
  onClick={() => setTargetAutoCalculation(target, !autoCalculation)}
>
  {autoCalculation ? "关闭自动计算" : "开启自动计算"}
</button>
```

- [ ] **Step 5: Make user/special rows deletable and system rows readonly**

Add helper:

```ts
const isUserEntry = entry.source.type === "user"
const canDeleteEntry = isUserEntry
```

Special entries are stored as user contributions in this phase, so this permits deletion for both ordinary user entries and target-owned special entries.

For deletable rows, render icon button in the same left/action position:

```tsx
<button
  type="button"
  aria-label={`删除${currentLabel}`}
  className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600"
  onClick={() => deleteUserContribution(entry)}
>
  <Trash2 className="h-3.5 w-3.5" />
</button>
```

For system rows, render a same-sized spacer:

```tsx
<span className="h-5 w-5" aria-hidden="true" />
```

- [ ] **Step 6: Keep labels fixed for special entries**

Import:

```ts
import { isTargetOwnedSpecialContribution } from "@/lib/modifiers/special-contributions"
```

When rendering user entries, if special:

```tsx
{isSpecial ? (
  <span className="truncate">{currentLabel}</span>
) : (
  <EditableLabelInput entry={entry} onCommit={updateUserContributionLabel} />
)}
```

To call predicate, adapt `ModifierEntry` to contribution-like shape:

```ts
const isSpecial = isUserEntry && isTargetOwnedSpecialContribution({
  id: entry.id,
  definition: entry.definition,
})
```

- [ ] **Step 7: Run focused popover tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/modifier-popover.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/modifiers/modifier-popover.tsx tests/unit/modifiers/modifier-popover.test.tsx
git commit -m "feat: update modifier popover for auto calculation"
```

---

### Task 6: Route Final Target Edits From Sheet UI

**Files:**
- Modify: `lib/sheet-store.ts`
- Modify: `components/character-sheet-sections/attributes-section.tsx`
- Modify: `components/character-sheet-sections/experience-section.tsx`
- Modify: `components/character-sheet.tsx`
- Modify: `components/upgrade-popover/hp-max-editor.tsx`
- Modify: `components/upgrade-popover/stress-max-editor.tsx`
- Modify: `components/upgrade-popover/proficiency-editor.tsx`
- Modify: `tests/unit/modifiers/attribute-auto-base-section.test.tsx`
- Create or modify: `tests/unit/modifiers/final-input-section-routing.test.tsx`

- [ ] **Step 1: Write section routing tests**

Create `tests/unit/modifiers/final-input-section-routing.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { AttributesSection } from "@/components/character-sheet-sections/attributes-section"
import { ExperienceSection } from "@/components/character-sheet-sections/experience-section"
import { resetSheetStore, sheet } from "../automation/test-helpers"

describe("final input section routing", () => {
  it("attribute blur creates manual base when auto calculation is enabled and no base exists", async () => {
    resetSheetStore({
      agility: { checked: false, value: "" },
      modifierState: {
        targetStates: { "agility.value": { autoCalculation: true } },
        entryStates: {},
      },
    })

    render(<AttributesSection />)

    const agility = screen.getByDisplayValue("")
    await userEvent.type(agility, "2")
    await userEvent.tab()

    expect(sheet().userModifierContributions).toContainEqual({
      id: "user:agility.value:manual-base",
      definition: { target: "agility.value", kind: "base" },
      editable: { label: "手动基础值", value: 2 },
    })
  })

  it("experience blur updates unattributed delta when auto calculation is enabled", async () => {
    resetSheetStore({
      experienceValues: ["5", "", "", "", ""],
      userModifierContributions: [{
        id: "user:experienceValues.0:manual-base",
        definition: { target: "experienceValues.0", kind: "base" },
        editable: { label: "手动基础值", value: 3 },
      }],
      modifierState: {
        targetStates: { "experienceValues.0": { activeBaseId: "user:experienceValues.0:manual-base", autoCalculation: true } },
        entryStates: {},
      },
    })

    render(<ExperienceSection />)

    const inputs = screen.getAllByDisplayValue("5")
    await userEvent.clear(inputs[0])
    await userEvent.type(inputs[0], "7")
    await userEvent.tab()

    expect(sheet().userModifierContributions).toContainEqual({
      id: "user:experienceValues.0:unattributed-delta",
      definition: { target: "experienceValues.0", kind: "modifier" },
      editable: { label: "未归因差额", value: 4 },
    })
  })
})
```

If selectors are ambiguous, add explicit `aria-label` text to the target input in the component and use that label in this test. Use labels in the form `敏捷数值` and `经历 1 数值`.

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm run test:run -- tests/unit/modifiers/final-input-section-routing.test.tsx
```

Expected: FAIL because current sections call direct update actions.

- [ ] **Step 3: Verify `commitModifierTargetValue` store action**

Task 4 must have added this action in `lib/sheet-store.ts`. Verify the interface contains:

```ts
commitModifierTargetValue: (target: ModifierTargetId, value: string | number) => void;
```

Verify the implementation is:

```ts
commitModifierTargetValue: (target, value) => set((state) => {
  const targetState = state.sheetData.modifierState?.targetStates?.[target]
  if (targetState?.autoCalculation) {
    return { sheetData: applyAutoCalculationForTargets(reconcileFinalInput(state.sheetData, target, value)) }
  }
  return { sheetData: writeTargetValue(state.sheetData, target, value) }
})
```

- [ ] **Step 4: Route text input blur handlers**

In `components/character-sheet-sections/attributes-section.tsx`, keep local editing behavior if present, but on committed blur call:

```ts
commitModifierTargetValue(`${attribute}.value` as ModifierTargetId, value)
```

In `components/character-sheet-sections/experience-section.tsx`, on committed blur/change for final value call:

```ts
commitModifierTargetValue(`experienceValues.${i}` as ModifierTargetId, value)
```

- [ ] **Step 5: Route non-text / grid interactions**

In `components/character-sheet.tsx`, replace direct final updates for:

- armorMax boxes -> `commitModifierTargetValue("armorMax", nextValue)`
- proficiency boxes -> `commitModifierTargetValue("proficiency", nextValue)`

For hp/stress max editors, update:

```ts
commitModifierTargetValue("hpMax", finalValue)
commitModifierTargetValue("stressMax", finalValue)
```

For thresholds / armor template final targets, route committed numeric values with these exact calls:

```ts
commitModifierTargetValue("minorThreshold", value)
commitModifierTargetValue("majorThreshold", value)
```

- [ ] **Step 6: Run routing tests and existing modifier UI tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/final-input-section-routing.test.tsx tests/unit/modifiers/attribute-auto-base-section.test.tsx tests/unit/modifiers/modifier-popover.test.tsx
```

Expected: PASS. Update old auto-base expectations to the new ids exactly: `user:${target}:manual-base`.

- [ ] **Step 7: Commit**

```bash
git add lib/sheet-store.ts components/character-sheet-sections/attributes-section.tsx components/character-sheet-sections/experience-section.tsx components/character-sheet.tsx components/upgrade-popover/hp-max-editor.tsx components/upgrade-popover/stress-max-editor.tsx components/upgrade-popover/proficiency-editor.tsx tests/unit/modifiers/final-input-section-routing.test.tsx tests/unit/modifiers/attribute-auto-base-section.test.tsx
git commit -m "feat: reconcile committed final target edits"
```

---

### Task 7: Update V1 -> V2 Migration For Auto Calculation

**Files:**
- Modify: `lib/sheet-data-migration.ts`
- Modify: `tests/unit/modifiers/migration.test.ts`
- Modify: `tests/unit/migration-versioning.test.ts`

- [ ] **Step 1: Add migration tests for final preservation**

In `tests/unit/modifiers/migration.test.ts`, add:

```ts
it("migrates numeric legacy final with a base into auto calculation and unattributed delta", () => {
  const migrated = migrateSheetData(v1ModifierInput({
    evasion: "15",
    userModifierContributions: [{
      id: "user:evasion-base",
      definition: { target: "evasion", kind: "base" },
      editable: { label: "Base", value: 12 },
    }],
    modifierState: {
      targetStates: { evasion: { activeBaseId: "user:evasion-base" } },
      entryStates: {},
    },
  }))

  expect(migrated.evasion).toBe("15")
  expect(migrated.modifierState?.targetStates.evasion).toMatchObject({
    activeBaseId: "user:evasion-base",
    autoCalculation: true,
  })
  expect(migrated.userModifierContributions).toContainEqual({
    id: "user:evasion:unattributed-delta",
    definition: { target: "evasion", kind: "modifier" },
    editable: { label: "未归因差额", value: 3 },
  })
})

it("migrates numeric legacy final without a base into estimated base", () => {
  const migrated = migrateSheetData(v1ModifierInput({
    evasion: "15",
    userModifierContributions: [{
      id: "user:evasion-mod",
      definition: { target: "evasion", kind: "modifier" },
      editable: { label: "Mod", value: 2 },
    }],
    modifierState: { targetStates: {}, entryStates: {} },
  }))

  expect(migrated.evasion).toBe("15")
  expect(migrated.modifierState?.targetStates.evasion).toMatchObject({
    activeBaseId: "user:evasion:estimated-base",
    autoCalculation: true,
  })
  expect(migrated.userModifierContributions).toContainEqual({
    id: "user:evasion:estimated-base",
    definition: { target: "evasion", kind: "base" },
    editable: { label: "估算基础值", value: 13 },
  })
})

it("does not create estimated base from hp or stress fallback values", () => {
  const migrated = migrateSheetData(v1ModifierInput({
    hpMax: undefined,
    stressMax: undefined,
  }))

  expect(migrated.userModifierContributions?.some(entry => entry.id === "user:hpMax:estimated-base")).toBe(false)
  expect(migrated.userModifierContributions?.some(entry => entry.id === "user:stressMax:estimated-base")).toBe(false)
})

it("does not preserve legacy disabled entry states", () => {
  const migrated = migrateSheetData(v1ModifierInput({
    evasion: "15",
    modifierState: {
      byTarget: {
        evasion: {
          disabledEntryIds: ["upgrade:evasion"],
        },
      },
      entryStates: {
        "user:evasion-mod": { enabled: false },
      },
    },
  }))

  expect(migrated.modifierState?.entryStates).toEqual({})
})
```

- [ ] **Step 2: Run migration tests to verify failure**

Run:

```bash
npm run test:run -- tests/unit/modifiers/migration.test.ts tests/unit/migration-versioning.test.ts
```

Expected: FAIL because migration still writes syncMode/entryStates and does not create special contributions.

- [ ] **Step 3: Add migration helper for modifier targets**

In `lib/sheet-data-migration.ts`, import:

```ts
import {
  createEstimatedBaseContribution,
  createUnattributedDeltaContribution,
  getEstimatedBaseId,
  getUnattributedDeltaId,
} from "@/lib/modifiers/special-contributions"
import { getReferenceSummary } from "@/lib/modifiers/registry"
import { readTargetValue } from "@/lib/modifiers/target-accessors"
import { tryParseNumber } from "@/lib/number-utils"
```

Add helper:

```ts
function upsertMigratedContribution(contributions: ModifierContribution[], contribution: ModifierContribution) {
  const index = contributions.findIndex(existing => existing.id === contribution.id)
  if (index >= 0) {
    contributions[index] = contribution
  } else {
    contributions.push(contribution)
  }
}
```

Add helper:

```ts
function preserveLegacyFinalForTarget(data: SheetData, target: ModifierTargetId): SheetData {
  const finalValue = tryParseNumber(readTargetValue(data, target))
  if (finalValue === undefined) return data

  const contributions = [...(data.userModifierContributions ?? [])]
  let next: SheetData = { ...data, userModifierContributions: contributions }
  const summary = getReferenceSummary(next, target)
  const targetState = {
    ...(next.modifierState?.targetStates?.[target] ?? {}),
    autoCalculation: true as const,
  }

  if (summary.activeBase || summary.bases[0]) {
    const activeBaseId = summary.activeBase?.id ?? summary.bases[0].id
    targetState.activeBaseId = activeBaseId
    const withoutDelta = {
      ...next,
      userModifierContributions: contributions.filter(entry => entry.id !== getUnattributedDeltaId(target)),
    }
    const reference = getReferenceSummary(withoutDelta, target).referenceTotal
    if (reference !== undefined) {
      const delta = finalValue - reference
      if (delta !== 0) {
        upsertMigratedContribution(contributions, createUnattributedDeltaContribution(target, delta))
      }
    }
  } else {
    const modifierTotal = summary.modifiers.reduce((sum, entry) => sum + entry.presentation.value, 0)
    const estimatedBase = createEstimatedBaseContribution(target, finalValue - modifierTotal)
    upsertMigratedContribution(contributions, estimatedBase)
    targetState.activeBaseId = estimatedBase.id
  }

  return {
    ...next,
    modifierState: {
      targetStates: {
        ...(next.modifierState?.targetStates ?? {}),
        [target]: targetState,
      },
      entryStates: {},
    },
    userModifierContributions: contributions,
  }
}
```

- [ ] **Step 4: Apply helper in v1 -> v2 migration**

After `migrateModifierState(migrated)` in `migrateV1ToV2`, iterate all supported targets with explicit legacy final values. Use a list:

```ts
const MIGRATED_AUTO_TARGETS: ModifierTargetId[] = [
  "evasion",
  "armorMax",
  "minorThreshold",
  "majorThreshold",
  "hpMax",
  "stressMax",
  "proficiency",
  "agility.value",
  "strength.value",
  "finesse.value",
  "instinct.value",
  "presence.value",
  "knowledge.value",
  "experienceValues.0",
  "experienceValues.1",
  "experienceValues.2",
  "experienceValues.3",
  "experienceValues.4",
]
```

For `hpMax` / `stressMax`, only call preservation when the raw v1 object owns the field:

```ts
if ((target === "hpMax" || target === "stressMax") && !hasOwn(raw, target)) return
```

For experience targets, only call preservation when `raw.experienceValues?.[index]` is present and non-empty.

Clear `entryStates` at the end of v1 -> v2 migration:

```ts
migrated.modifierState = {
  targetStates: migrated.modifierState?.targetStates ?? {},
  entryStates: {},
}
```

- [ ] **Step 5: Update existing migration tests**

Update old tests that expected disabled states:

```ts
expect(migrated.modifierState?.entryStates).toEqual({})
```

Update old test `"adds empty modifier state without changing existing final values"` so it expects auto-calculation target states and special contributions for numeric fields, while non-numeric `evasion: "12+敏捷"` remains unclaimed.

- [ ] **Step 6: Run migration tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/migration.test.ts tests/unit/migration-versioning.test.ts tests/unit/storage-migration.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/sheet-data-migration.ts tests/unit/modifiers/migration.test.ts tests/unit/migration-versioning.test.ts tests/unit/storage-migration.test.ts
git commit -m "feat: migrate final values into auto calculation"
```

---

### Task 8: Final Verification And Cleanup

**Files:**
- Modify only if verification finds stale references.

- [ ] **Step 1: Search for removed APIs and stale UI text**

Run:

```bash
rg -n "syncMode|TargetSyncMode|setTargetSyncMode|syncModifierTargetOnce|setModifierEntryEnabled|持续同步|同步\"|entryStates\\[.*enabled|enabled: false" lib components tests docs/superpowers/specs/2026-05-17-final-input-automation-reconciliation-design.md
```

Expected: No runtime references except migration compatibility notes/tests that intentionally mention old input.

- [ ] **Step 2: Run modifier test suite**

Run:

```bash
npm run test:run -- tests/unit/modifiers
```

Expected: PASS.

- [ ] **Step 3: Run migration/storage test suite**

Run:

```bash
npm run test:run -- tests/unit/migration-versioning.test.ts tests/unit/storage-migration.test.ts tests/unit/equipment tests/unit/character-data-validator.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run full unit suite**

Run:

```bash
npm run test:unit
```

Expected: PASS. Existing non-failing stderr warnings are acceptable only if already known and unrelated.

- [ ] **Step 5: Manual app smoke check**

Run dev server:

```bash
npm run dev
```

Open the local URL and smoke test:

- Open modifier popover for `evasion`.
- Confirm no `同步` button and no `持续同步` checkbox.
- Click `开启自动计算` with visible `未归因差额`.
- Confirm final value stays unchanged and `未归因差额` appears in addends.
- Change profession / equipment source and confirm auto-calculated final updates.
- Edit final value and confirm `未归因差额` updates.
- Delete `未归因差额` and confirm final returns to reference total.

- [ ] **Step 6: Commit cleanup**

If Step 1 found stale references or manual smoke required small fixes:

```bash
git add <changed-files>
git commit -m "chore: clean up final input automation references"
```

If no changes:

```bash
git status --short
```

Expected: clean worktree.
