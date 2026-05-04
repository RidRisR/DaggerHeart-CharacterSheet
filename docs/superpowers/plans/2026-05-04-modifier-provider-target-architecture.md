# Modifier Provider Target Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the existing modifier system to provider-owned contributions, structured runtime entries, and split target/entry modifier state while preserving current popover behavior.

**Architecture:** Provider data lives in `SheetData` (`userModifierContributions` for user sources; equipment providers later). Registry remains a pure derived reader that converts current providers into structured `ModifierEntry[]`. `ModifierState` stores only consumer state: `targetStates[target].activeBaseId` and `entryStates[entryId].enabled`.

**Tech Stack:** TypeScript, React, Zustand store in `lib/sheet-store.ts`, Vitest unit/component tests.

---

## Scope

This plan implements the core modifier architecture only:

- Structured `ModifierContribution` and `ModifierEntry`.
- Root-level `SheetData.userModifierContributions`.
- `modifierState.targetStates` and `modifierState.entryStates`.
- Migration from old `modifierState.byTarget`.
- Load-time reconciliation helper.
- Existing modifier popover and attribute auto-base behavior updated to the new model.

This plan does not implement the full equipment provider UI or `SheetData.equipment`; that belongs in a separate equipment implementation plan.

## File Structure

- Modify `lib/modifiers/types.ts`: define new contribution, entry, and state shapes.
- Create `lib/modifiers/entry-utils.ts`: small helpers for building entries and reading entry fields consistently.
- Modify `lib/modifiers/source-definitions.ts`: emit structured runtime entries.
- Modify `lib/modifiers/registry.ts`: collect system entries plus `userModifierContributions`.
- Modify `lib/modifiers/reference-calculator.ts`: consume `targetStates` and `entryStates`.
- Modify `lib/modifiers/attribute-auto-base.ts`: return `ModifierContribution` instead of old `UserModifierEntry`.
- Modify `lib/sheet-data.ts`: add `userModifierContributions`.
- Modify `lib/default-sheet-data.ts`: initialize `userModifierContributions` and new `modifierState`.
- Modify `lib/sheet-data-migration.ts`: migrate old state and user entries to the new shape, then reconcile once.
- Modify `lib/sheet-store.ts`: replace old user-entry and disabled-entry store actions.
- Modify `components/modifiers/modifier-popover.tsx`: edit user contributions through provider data, consume structured entries.
- Modify `components/character-sheet-sections/attributes-section.tsx`: use root user contributions and new target state.
- Update modifier tests under `tests/unit/modifiers`.

---

### Task 1: Introduce New Modifier Types

**Files:**
- Modify: `lib/modifiers/types.ts`
- Test: `pnpm exec tsc --noEmit` if available; otherwise covered by later Vitest tasks.

- [ ] **Step 1: Replace modifier data shapes in `lib/modifiers/types.ts`**

Replace the current `ModifierEntry`, `UserModifierEntry`, `TargetModifierState`, and `ModifierState` definitions with the following:

```ts
export type ModifierEntryKind = "base" | "modifier"
export type ModifierSourceType = "profession" | "armor" | "level" | "upgrade" | "user" | "equipment"

export interface ModifierContributionDefinition {
  target: ModifierTargetId
  kind: ModifierEntryKind
}

export interface ModifierContributionEditable {
  label: string
  value: number
}

export interface ModifierContribution {
  id: ModifierEntryId
  definition: ModifierContributionDefinition
  editable: ModifierContributionEditable
}

export type UserModifierContribution = ModifierContribution

export interface ModifierEntryPresentation {
  label: string
  value: number
}

export interface ModifierEntrySource {
  type: ModifierSourceType
  id: string
}

export interface ModifierEntry {
  id: ModifierEntryId
  definition: ModifierContributionDefinition
  presentation: ModifierEntryPresentation
  source: ModifierEntrySource
  priority: number
}

export interface TargetModifierState {
  activeBaseId?: ModifierEntryId
}

export interface ModifierEntryState {
  enabled?: boolean
  order?: number
}

export interface ModifierState {
  targetStates: Partial<Record<ModifierTargetId, TargetModifierState>>
  entryStates: Partial<Record<ModifierEntryId, ModifierEntryState>>
}
```

Keep `AutomationSourceDefinition` and `AutomationContext` but update their return type to the new `ModifierEntry[]`.

- [ ] **Step 2: Run focused type check**

Run:

```bash
pnpm exec tsc --noEmit
```

Expected: this may fail because call sites still use the old flattened entry fields. Do not fix all failures in this task; use the output to confirm the type change is visible.

- [ ] **Step 3: Commit**

```bash
git add lib/modifiers/types.ts
git commit -m "refactor: define modifier provider data shapes"
```

---

### Task 2: Add Entry Utility Helpers

**Files:**
- Create: `lib/modifiers/entry-utils.ts`
- Test: `tests/unit/modifiers/entry-utils.test.ts`

- [ ] **Step 1: Write failing tests for entry helper behavior**

Create `tests/unit/modifiers/entry-utils.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
  contributionToEntry,
  createModifierEntry,
  entryKind,
  entryLabel,
  entryTarget,
  entryValue,
} from "@/lib/modifiers/entry-utils"
import type { ModifierContribution } from "@/lib/modifiers/types"

describe("modifier entry utils", () => {
  it("creates structured runtime entries", () => {
    const entry = createModifierEntry({
      id: "level:base:proficiency",
      target: "proficiency",
      kind: "base",
      label: "基础熟练度",
      value: 1,
      sourceType: "level",
      sourceId: "level:base",
      priority: 100,
    })

    expect(entry).toEqual({
      id: "level:base:proficiency",
      definition: { target: "proficiency", kind: "base" },
      presentation: { label: "基础熟练度", value: 1 },
      source: { type: "level", id: "level:base" },
      priority: 100,
    })
    expect(entryTarget(entry)).toBe("proficiency")
    expect(entryKind(entry)).toBe("base")
    expect(entryLabel(entry)).toBe("基础熟练度")
    expect(entryValue(entry)).toBe(1)
  })

  it("converts persisted contributions to runtime entries with provider context", () => {
    const contribution: ModifierContribution = {
      id: "user:evasion-mod",
      definition: { target: "evasion", kind: "modifier" },
      editable: { label: "临时加值", value: 2 },
    }

    expect(contributionToEntry(contribution, {
      sourceType: "user",
      sourceId: "user",
      priority: 10,
    })).toEqual({
      id: "user:evasion-mod",
      definition: { target: "evasion", kind: "modifier" },
      presentation: { label: "临时加值", value: 2 },
      source: { type: "user", id: "user" },
      priority: 10,
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/entry-utils.test.ts
```

Expected: FAIL because `lib/modifiers/entry-utils.ts` does not exist.

- [ ] **Step 3: Implement `lib/modifiers/entry-utils.ts`**

Create:

```ts
import type {
  AutomationSourceId,
  ModifierContribution,
  ModifierEntry,
  ModifierEntryId,
  ModifierEntryKind,
  ModifierSourceType,
  ModifierTargetId,
} from "./types"

interface CreateModifierEntryInput {
  id: ModifierEntryId
  target: ModifierTargetId
  kind: ModifierEntryKind
  label: string
  value: number
  sourceType: ModifierSourceType
  sourceId: string
  priority: number
}

interface ContributionProviderContext {
  sourceType: ModifierSourceType
  sourceId: string
  priority: number
  formatLabel?: (label: string) => string
}

export function createModifierEntry(input: CreateModifierEntryInput): ModifierEntry {
  return {
    id: input.id,
    definition: {
      target: input.target,
      kind: input.kind,
    },
    presentation: {
      label: input.label,
      value: input.value,
    },
    source: {
      type: input.sourceType,
      id: input.sourceId,
    },
    priority: input.priority,
  }
}

export function contributionToEntry(
  contribution: ModifierContribution,
  context: ContributionProviderContext,
): ModifierEntry {
  return {
    id: contribution.id,
    definition: contribution.definition,
    presentation: {
      label: context.formatLabel
        ? context.formatLabel(contribution.editable.label)
        : contribution.editable.label,
      value: contribution.editable.value,
    },
    source: {
      type: context.sourceType,
      id: context.sourceId,
    },
    priority: context.priority,
  }
}

export function entryTarget(entry: ModifierEntry): ModifierTargetId {
  return entry.definition.target
}

export function entryKind(entry: ModifierEntry): ModifierEntryKind {
  return entry.definition.kind
}

export function entryLabel(entry: ModifierEntry): string {
  return entry.presentation.label
}

export function entryValue(entry: ModifierEntry): number {
  return entry.presentation.value
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/entry-utils.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/modifiers/entry-utils.ts tests/unit/modifiers/entry-utils.test.ts
git commit -m "test: add modifier entry utilities"
```

---

### Task 3: Convert System Sources to Structured Entries

**Files:**
- Modify: `lib/modifiers/source-definitions.ts`
- Modify: `tests/unit/modifiers/source-definitions.test.ts`

- [ ] **Step 1: Update source tests to assert structured entries**

In `tests/unit/modifiers/source-definitions.test.ts`, replace assertions like:

```ts
expect(entries).toContainEqual(expect.objectContaining({
  id: "profession:profession-warrior:evasion",
  target: "evasion",
  kind: "base",
  label: "战士：起始闪避",
  value: 12,
  sourceType: "profession",
}))
```

with:

```ts
expect(entries).toContainEqual(expect.objectContaining({
  id: "profession:profession-warrior:evasion",
  definition: { target: "evasion", kind: "base" },
  presentation: { label: "战士：起始闪避", value: 12 },
  source: { type: "profession", id: "profession:profession-warrior" },
}))
```

Use this mapping throughout the file:

```ts
entry.target -> entry.definition.target
entry.kind -> entry.definition.kind
entry.label -> entry.presentation.label
entry.value -> entry.presentation.value
entry.sourceType -> entry.source.type
entry.sourceId -> entry.source.id
```

For filters, change:

```ts
entries.filter(entry => entry.sourceId === "upgrade:experience")
entries.filter(entry => entry.sourceType === "profession")
```

to:

```ts
entries.filter(entry => entry.source.id === "upgrade:experience")
entries.filter(entry => entry.source.type === "profession")
```

- [ ] **Step 2: Run source tests to verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/source-definitions.test.ts
```

Expected: FAIL because source definitions still return flattened entries.

- [ ] **Step 3: Update source definitions**

In `lib/modifiers/source-definitions.ts`, import `createModifierEntry`:

```ts
import { createModifierEntry } from "./entry-utils"
```

Replace every object literal pushed into `entries` with `createModifierEntry(...)`.

Example profession evasion entry:

```ts
entries.push(createModifierEntry({
  id: `profession:${professionId}:evasion`,
  sourceId: `profession:${professionId}`,
  target: "evasion",
  kind: "base",
  label: `${professionName}：起始闪避`,
  value: evasion,
  sourceType: "profession",
  priority: 100,
}))
```

Example upgrade entry:

```ts
return [createModifierEntry({
  id: `${sourceId}:evasion`,
  sourceId,
  target: "evasion",
  kind: "modifier",
  label: "升级：闪避 +1",
  value: 1,
  sourceType: "upgrade",
  priority: 200,
})]
```

- [ ] **Step 4: Run source tests**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/source-definitions.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/modifiers/source-definitions.ts tests/unit/modifiers/source-definitions.test.ts
git commit -m "refactor: structure system modifier entries"
```

---

### Task 4: Move User Sources to Provider Contributions

**Files:**
- Modify: `lib/sheet-data.ts`
- Modify: `lib/default-sheet-data.ts`
- Modify: `lib/modifiers/registry.ts`
- Modify: `tests/unit/modifiers/source-definitions.test.ts`

- [ ] **Step 1: Update tests for root user contributions**

In `tests/unit/modifiers/source-definitions.test.ts`, change the user-entry test input from:

```ts
modifierState: {
  byTarget: {
    evasion: {
      userEntries: [{
        id: "user:evasion",
        sourceId: "user:evasion",
        target: "evasion",
        kind: "modifier",
        label: "手动闪避调整",
        value: 2,
        sourceType: "user",
        priority: 10,
      }],
    },
  },
},
```

to:

```ts
userModifierContributions: [{
  id: "user:evasion",
  definition: { target: "evasion", kind: "modifier" },
  editable: { label: "手动闪避调整", value: 2 },
}],
```

Do not update the combined `getReferenceSummary` test in this task. That test depends on the reference calculator accepting the new `modifierState` shape, which is handled in Task 5.

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/source-definitions.test.ts
```

Expected: FAIL because `SheetData.userModifierContributions` and registry collection are not implemented.

- [ ] **Step 3: Add `userModifierContributions` to sheet data**

In `lib/sheet-data.ts`, import `UserModifierContribution` and add:

```ts
userModifierContributions?: UserModifierContribution[]
```

near `modifierState?: ModifierState`.

In `lib/default-sheet-data.ts`, add:

```ts
userModifierContributions: [],
modifierState: {
  targetStates: {},
  entryStates: {},
},
```

replacing the old default `modifierState: { byTarget: {} }`.

- [ ] **Step 4: Update registry to collect user provider contributions**

In `lib/modifiers/registry.ts`, import `contributionToEntry` and collect user entries from root contributions:

```ts
import { contributionToEntry, entryTarget } from "./entry-utils"
```

Implement:

```ts
function collectUserModifierEntries(sheetData: SheetData): ModifierEntry[] {
  return (sheetData.userModifierContributions ?? []).map(contribution =>
    contributionToEntry(contribution, {
      sourceType: "user",
      sourceId: "user",
      priority: 10,
    }),
  )
}

export function collectModifierEntries(sheetData: SheetData, target?: ModifierTargetId): ModifierEntry[] {
  const systemEntries = collectSystemModifierEntries(sheetData)
  const userEntries = collectUserModifierEntries(sheetData)
  const entries = [...systemEntries, ...userEntries]

  return target ? entries.filter(entry => entryTarget(entry) === target) : entries
}
```

- [ ] **Step 5: Run focused registry/source tests**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/source-definitions.test.ts -t "filters collected entries by target|derives selected upgrade|derives profession|derives armor|derives level|derives proficiency|malformed|invalid experience|default empty"
```

Expected: PASS for the focused source collection tests. The combined `getReferenceSummary` test is updated and run in Task 5.

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/sheet-data.ts lib/default-sheet-data.ts lib/modifiers/registry.ts tests/unit/modifiers/source-definitions.test.ts
git commit -m "refactor: collect user modifier contributions"
```

---

### Task 5: Update Reference Calculator to Split Modifier State

**Files:**
- Modify: `lib/modifiers/reference-calculator.ts`
- Modify: `lib/modifiers/registry.ts`
- Modify: `tests/unit/modifiers/reference-calculator.test.ts`

- [ ] **Step 1: Update reference calculator tests**

Change test entries in `tests/unit/modifiers/reference-calculator.test.ts` to structured entries using `createModifierEntry`:

```ts
import { createModifierEntry } from "@/lib/modifiers/entry-utils"

const entries = [
  createModifierEntry({
    id: "system:profession:evasion",
    sourceId: "profession:warrior",
    target: "evasion",
    kind: "base",
    label: "职业基础闪避",
    value: 12,
    sourceType: "profession",
    priority: 100,
  }),
  createModifierEntry({
    id: "upgrade:evasion",
    sourceId: "upgrade:tier1-5-0",
    target: "evasion",
    kind: "modifier",
    label: "升级：闪避 +1",
    value: 1,
    sourceType: "upgrade",
    priority: 200,
  }),
]
```

Replace old `targetState` inputs:

```ts
targetState: { activeBaseId: "missing:base" }
targetState: { disabledEntryIds: ["upgrade:evasion"] }
```

with full `modifierState` inputs:

```ts
modifierState: {
  targetStates: { evasion: { activeBaseId: "missing:base" } },
  entryStates: {},
}
modifierState: {
  targetStates: {},
  entryStates: { "upgrade:evasion": { enabled: false } },
}
```

Also update the combined summary test in `tests/unit/modifiers/source-definitions.test.ts` to use root user contributions and the new target state:

```ts
modifierState: {
  targetStates: {
    evasion: { activeBaseId: "user:evasion-base" },
  },
  entryStates: {},
},
userModifierContributions: [{
  id: "user:evasion-base",
  definition: { target: "evasion", kind: "base" },
  editable: { label: "手动基础闪避", value: 14 },
}],
```

- [ ] **Step 2: Run calculator tests to verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/reference-calculator.test.ts
```

Expected: FAIL because `calculateReferenceSummary` still accepts `targetState`.

- [ ] **Step 3: Update calculator input and implementation**

In `lib/modifiers/reference-calculator.ts`, replace `targetState?: TargetModifierState` with:

```ts
modifierState?: ModifierState
```

Use entry utilities:

```ts
import { entryKind, entryTarget, entryValue } from "./entry-utils"
```

Use this core implementation:

```ts
const targetEntries = input.entries
  .filter(entry => entryTarget(entry) === input.target)
  .sort(sortEntries)

const isDisabled = (entry: ModifierEntry) =>
  input.modifierState?.entryStates?.[entry.id]?.enabled === false

const disabledEntries = targetEntries.filter(isDisabled)
const enabledEntries = targetEntries.filter(entry => !isDisabled(entry))
const bases = enabledEntries.filter(entry => entryKind(entry) === "base")
const modifiers = targetEntries.filter(entry => entryKind(entry) === "modifier")
const enabledModifiers = enabledEntries.filter(entry => entryKind(entry) === "modifier")

const savedBaseId = input.modifierState?.targetStates?.[input.target]?.activeBaseId
const savedBase = savedBaseId ? bases.find(entry => entry.id === savedBaseId) : undefined
const activeBase = savedBase ?? bases[0]
const activeBaseChanged = Boolean(savedBaseId && !savedBase && activeBase)
```

Keep the existing no-base branch before calculating totals:

```ts
if (!activeBase) {
  return {
    target: input.target,
    entries: targetEntries,
    bases,
    modifiers,
    enabledModifiers,
    disabledEntries,
    activeBase: undefined,
    activeBaseChanged: false,
    unknownBase: true,
  }
}

const referenceTotal = entryValue(activeBase) + enabledModifiers.reduce((sum, entry) => sum + entryValue(entry), 0)
```

- [ ] **Step 4: Update registry summary call**

In `lib/modifiers/registry.ts`, update `getReferenceSummary`:

```ts
return calculateReferenceSummary({
  sheetData,
  target,
  entries: collectModifierEntries(sheetData, target),
  modifierState: sheetData.modifierState,
})
```

- [ ] **Step 5: Run calculator and summary tests**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/reference-calculator.test.ts tests/unit/modifiers/source-definitions.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/modifiers/reference-calculator.ts lib/modifiers/registry.ts tests/unit/modifiers/reference-calculator.test.ts
git commit -m "refactor: split modifier consumer state"
```

---

### Task 6: Migrate Old Modifier State on Load

**Files:**
- Modify: `lib/sheet-data-migration.ts`
- Create: `lib/modifiers/reconcile.ts`
- Modify: `tests/unit/modifiers/migration.test.ts`
- Create: `tests/unit/modifiers/reconcile.test.ts`

- [ ] **Step 1: Add reconciliation tests**

Create `tests/unit/modifiers/reconcile.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { reconcileModifierState } from "@/lib/modifiers/reconcile"
import type { SheetData } from "@/lib/sheet-data"

describe("modifier state reconciliation", () => {
  it("removes entry state for ids not in active registry", () => {
    const sheetData = {
      ...defaultSheetData,
      modifierState: {
        targetStates: {},
        entryStates: {
          "missing:entry": { enabled: false },
          "level:current:minorThreshold": { enabled: false },
        },
      },
      level: "1",
    } satisfies SheetData

    const reconciled = reconcileModifierState(sheetData)

    expect(reconciled.modifierState?.entryStates).toEqual({
      "level:current:minorThreshold": { enabled: false },
    })
  })

  it("removes active base ids that do not resolve to current base entries", () => {
    const sheetData = {
      ...defaultSheetData,
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: "missing:base" },
          proficiency: { activeBaseId: "level:base:proficiency" },
        },
        entryStates: {},
      },
      level: "1",
    } satisfies SheetData

    const reconciled = reconcileModifierState(sheetData)

    expect(reconciled.modifierState?.targetStates).toEqual({
      proficiency: { activeBaseId: "level:base:proficiency" },
    })
  })
})
```

- [ ] **Step 2: Run reconciliation tests to verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/reconcile.test.ts
```

Expected: FAIL because `reconcileModifierState` does not exist.

- [ ] **Step 3: Implement `lib/modifiers/reconcile.ts`**

Create:

```ts
import type { SheetData } from "@/lib/sheet-data"
import { collectModifierEntries } from "./registry"
import { entryKind, entryTarget } from "./entry-utils"
import type { ModifierEntryId, ModifierState, ModifierTargetId } from "./types"

const EMPTY_STATE: ModifierState = {
  targetStates: {},
  entryStates: {},
}

export function reconcileModifierState(sheetData: SheetData): SheetData {
  const entries = collectModifierEntries(sheetData)
  const entryIds = new Set(entries.map(entry => entry.id))
  const baseIdsByTarget = new Map<ModifierTargetId, Set<ModifierEntryId>>()

  entries.forEach(entry => {
    if (entryKind(entry) !== "base") return
    const target = entryTarget(entry)
    const ids = baseIdsByTarget.get(target) ?? new Set<ModifierEntryId>()
    ids.add(entry.id)
    baseIdsByTarget.set(target, ids)
  })

  const currentState = sheetData.modifierState ?? EMPTY_STATE
  const nextEntryStates: ModifierState["entryStates"] = {}
  Object.entries(currentState.entryStates ?? {}).forEach(([entryId, state]) => {
    if (!entryIds.has(entryId)) return
    nextEntryStates[entryId] = state
  })

  const nextTargetStates: ModifierState["targetStates"] = {}
  Object.entries(currentState.targetStates ?? {}).forEach(([target, state]) => {
    const activeBaseId = state?.activeBaseId
    if (!activeBaseId) return
    if (!baseIdsByTarget.get(target as ModifierTargetId)?.has(activeBaseId)) return
    nextTargetStates[target as ModifierTargetId] = { activeBaseId }
  })

  return {
    ...sheetData,
    modifierState: {
      targetStates: nextTargetStates,
      entryStates: nextEntryStates,
    },
  }
}
```

- [ ] **Step 4: Update migration tests for new shape**

In `tests/unit/modifiers/migration.test.ts`, update expectations:

```ts
expect(migrated.modifierState).toEqual({ targetStates: {}, entryStates: {} })
expect(migrated.userModifierContributions).toEqual([])
```

For preserving old state, expect:

```ts
expect(migrated.modifierState?.targetStates.evasion?.activeBaseId).toBe("user:evasion-base")
expect(migrated.userModifierContributions).toEqual([{
  id: "user:evasion-base",
  definition: { target: "evasion", kind: "base" },
  editable: { label: "手动基础闪避", value: 12 },
}])
```

Use an active registry id when asserting disabled state survives reconciliation. For example, with `level: "1"`:

```ts
expect(migrated.modifierState?.entryStates["level:current:minorThreshold"]).toEqual({ enabled: false })
```

If the fixture uses an id that registry cannot collect, assert that reconciliation removes it:

```ts
expect(migrated.modifierState?.entryStates["upgrade:evasion"]).toBeUndefined()
```

Add a mixed-shape migration test so new-shape state is not clobbered when legacy `byTarget` also exists:

```ts
const migrated = migrateSheetData({
  level: "1",
  modifierState: {
    targetStates: {
      proficiency: { activeBaseId: "level:base:proficiency" },
    },
    entryStates: {
      "level:current:minorThreshold": { enabled: false },
    },
    byTarget: {
      evasion: {
        activeBaseId: "user:evasion-base",
        userEntries: [{
          id: "user:evasion-base",
          sourceId: "user:evasion-base",
          target: "evasion",
          kind: "base",
          label: "手动基础闪避",
          value: 12,
          sourceType: "user",
          priority: 10,
        }],
      },
    },
  },
})

expect(migrated.modifierState?.targetStates.proficiency?.activeBaseId).toBe("level:base:proficiency")
expect(migrated.modifierState?.targetStates.evasion?.activeBaseId).toBe("user:evasion-base")
expect(migrated.modifierState?.entryStates["level:current:minorThreshold"]).toEqual({ enabled: false })
expect(migrated.userModifierContributions).toEqual(expect.arrayContaining([
  expect.objectContaining({ id: "user:evasion-base" }),
]))
```

- [ ] **Step 5: Update `migrateModifierState`**

In `lib/sheet-data-migration.ts`, import:

```ts
import { reconcileModifierState } from "@/lib/modifiers/reconcile"
import type { ModifierContribution, ModifierEntryKind, ModifierTargetId } from "@/lib/modifiers/types"
```

Replace old `migrateModifierState` logic with:

```ts
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function migrateModifierState(data: SheetData): SheetData {
  const migrated = { ...data }
  const legacyState = isRecord(migrated.modifierState) ? migrated.modifierState : {}
  const legacyByTarget = isRecord(legacyState.byTarget) ? legacyState.byTarget : {}
  const targetStates: NonNullable<SheetData["modifierState"]>["targetStates"] =
    isRecord(legacyState.targetStates)
      ? { ...(legacyState.targetStates as NonNullable<SheetData["modifierState"]>["targetStates"]) }
      : {}
  const entryStates: NonNullable<SheetData["modifierState"]>["entryStates"] =
    isRecord(legacyState.entryStates)
      ? { ...(legacyState.entryStates as NonNullable<SheetData["modifierState"]>["entryStates"]) }
      : {}
  const userModifierContributions: ModifierContribution[] = [
    ...(Array.isArray(migrated.userModifierContributions) ? migrated.userModifierContributions : []),
  ]
  const seenUserContributionIds = new Set(userModifierContributions.map(entry => entry.id))

  Object.entries(legacyByTarget).forEach(([target, rawTargetState]) => {
    if (!isRecord(rawTargetState)) return

    if (typeof rawTargetState.activeBaseId === "string") {
      targetStates[target as ModifierTargetId] = { activeBaseId: rawTargetState.activeBaseId }
    }

    if (Array.isArray(rawTargetState.disabledEntryIds)) {
      rawTargetState.disabledEntryIds.forEach(entryId => {
        if (typeof entryId === "string") {
          entryStates[entryId] = { ...(entryStates[entryId] ?? {}), enabled: false }
        }
      })
    }

    if (Array.isArray(rawTargetState.userEntries)) {
      rawTargetState.userEntries.forEach(entry => {
        if (!isRecord(entry)) return
        if (
          typeof entry.id !== "string" ||
          typeof entry.target !== "string" ||
          (entry.kind !== "base" && entry.kind !== "modifier") ||
          typeof entry.label !== "string" ||
          typeof entry.value !== "number"
        ) {
          return
        }
        if (seenUserContributionIds.has(entry.id)) return
        seenUserContributionIds.add(entry.id)
        userModifierContributions.push({
          id: entry.id,
          definition: {
            target: entry.target as ModifierTargetId,
            kind: entry.kind as ModifierEntryKind,
          },
          editable: {
            label: entry.label,
            value: entry.value,
          },
        })
      })
    }
  })

  migrated.modifierState = { targetStates, entryStates }
  migrated.userModifierContributions = userModifierContributions

  if (!migrated.automationSelections || typeof migrated.automationSelections !== "object" || Array.isArray(migrated.automationSelections)) {
    migrated.automationSelections = {}
    console.log("[Migration] Added automationSelections field")
  }

  return reconcileModifierState(migrated)
}
```

- [ ] **Step 6: Run migration and reconciliation tests**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/migration.test.ts tests/unit/modifiers/reconcile.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/sheet-data-migration.ts lib/modifiers/reconcile.ts tests/unit/modifiers/migration.test.ts tests/unit/modifiers/reconcile.test.ts
git commit -m "feat: migrate modifier consumer state"
```

---

### Task 7: Update Store Actions for Contributions and Entry State

**Files:**
- Modify: `lib/sheet-store.ts`
- Modify: `tests/unit/modifiers/store-actions.test.ts`

- [ ] **Step 1: Update store action tests**

In `tests/unit/modifiers/store-actions.test.ts`, update expectations:

```ts
it("sets active base for a target", () => {
  resetSheetStore()

  store().setActiveModifierBase("evasion", "user:evasion-base")

  expect(sheet().modifierState?.targetStates.evasion?.activeBaseId).toBe("user:evasion-base")
})

it("toggles modifier entry enabled state", () => {
  resetSheetStore()

  store().setModifierEntryEnabled("upgrade:evasion", false)
  expect(sheet().modifierState?.entryStates["upgrade:evasion"]).toEqual({ enabled: false })

  store().setModifierEntryEnabled("upgrade:evasion", true)
  expect(sheet().modifierState?.entryStates["upgrade:evasion"]).toBeUndefined()
})

it("adds user modifier contributions", () => {
  resetSheetStore()

  store().upsertUserModifierContribution({
    id: "user:evasion-mod",
    definition: { target: "evasion", kind: "modifier" },
    editable: { label: "临时加值", value: 2 },
  })

  expect(sheet().userModifierContributions).toEqual([
    expect.objectContaining({
      id: "user:evasion-mod",
      editable: { label: "临时加值", value: 2 },
    }),
  ])
})
```

- [ ] **Step 2: Run store tests to verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/store-actions.test.ts
```

Expected: FAIL because store actions still use old names and shapes.

- [ ] **Step 3: Update `SheetState` action signatures**

In `lib/sheet-store.ts`, replace:

```ts
setModifierEntryDisabled: (target: ModifierTargetId, entryId: ModifierEntryId, disabled: boolean) => void;
upsertUserModifierEntry: (entry: UserModifierEntry) => void;
removeUserModifierEntry: (target: ModifierTargetId, entryId: ModifierEntryId) => void;
```

with:

```ts
setModifierEntryEnabled: (entryId: ModifierEntryId, enabled: boolean) => void;
upsertUserModifierContribution: (contribution: UserModifierContribution) => void;
removeUserModifierContribution: (entryId: ModifierEntryId) => void;
```

- [ ] **Step 4: Update `ensureModifierState`**

Replace:

```ts
const ensureModifierState = (sheetData: SheetData) => ({
    byTarget: {
        ...(sheetData.modifierState?.byTarget ?? {}),
    },
});
```

with:

```ts
const ensureModifierState = (sheetData: SheetData) => ({
    targetStates: {
        ...(sheetData.modifierState?.targetStates ?? {}),
    },
    entryStates: {
        ...(sheetData.modifierState?.entryStates ?? {}),
    },
});
```

- [ ] **Step 5: Implement new actions**

Replace old modifier action implementations with:

```ts
setActiveModifierBase: (target, baseId) => set((state) => {
    const modifierState = ensureModifierState(state.sheetData);
    const nextTargetStates = { ...modifierState.targetStates };
    if (baseId) {
        nextTargetStates[target] = { activeBaseId: baseId };
    } else {
        delete nextTargetStates[target];
    }

    return {
        sheetData: {
            ...state.sheetData,
            modifierState: {
                ...modifierState,
                targetStates: nextTargetStates,
            },
        },
    };
}),

setModifierEntryEnabled: (entryId, enabled) => set((state) => {
    const modifierState = ensureModifierState(state.sheetData);
    const nextEntryStates = { ...modifierState.entryStates };
    if (enabled) {
        const current = { ...(nextEntryStates[entryId] ?? {}) };
        delete current.enabled;
        if (Object.keys(current).length === 0) {
            delete nextEntryStates[entryId];
        } else {
            nextEntryStates[entryId] = current;
        }
    } else {
        nextEntryStates[entryId] = {
            ...(nextEntryStates[entryId] ?? {}),
            enabled: false,
        };
    }

    return {
        sheetData: {
            ...state.sheetData,
            modifierState: {
                ...modifierState,
                entryStates: nextEntryStates,
            },
        },
    };
}),

upsertUserModifierContribution: (contribution) => set((state) => {
    const contributions = state.sheetData.userModifierContributions ?? [];
    const nextContributions = contributions.some(existing => existing.id === contribution.id)
        ? contributions.map(existing => existing.id === contribution.id ? contribution : existing)
        : [...contributions, contribution];

    return {
        sheetData: {
            ...state.sheetData,
            userModifierContributions: nextContributions,
        },
    };
}),

removeUserModifierContribution: (entryId) => set((state) => ({
    sheetData: {
        ...state.sheetData,
        userModifierContributions: (state.sheetData.userModifierContributions ?? [])
            .filter(entry => entry.id !== entryId),
    },
})),
```

- [ ] **Step 6: Run store tests**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/store-actions.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/sheet-store.ts tests/unit/modifiers/store-actions.test.ts
git commit -m "refactor: update modifier store actions"
```

---

### Task 8: Update Attribute Auto Base to User Contributions

**Files:**
- Modify: `lib/modifiers/attribute-auto-base.ts`
- Modify: `components/character-sheet-sections/attributes-section.tsx`
- Modify: `tests/unit/modifiers/attribute-auto-base.test.ts`
- Modify: `tests/unit/modifiers/attribute-auto-base-section.test.tsx`

- [ ] **Step 1: Update auto-base unit tests**

In `tests/unit/modifiers/attribute-auto-base.test.ts`, change imports and helper types from `UserModifierEntry` to `UserModifierContribution`.

Update helper:

```ts
function userBase(id: string): UserModifierContribution {
  return {
    id,
    definition: { target: "agility.value", kind: "base" },
    editable: { label: "用户基础值", value: 2 },
  }
}
```

Update assertions:

```ts
expect(getAttributeAutoBaseCreation({
  target: "agility.value",
  level: "",
  initialValue: "",
  submittedValue: "+2",
  existingUserBases: [],
})?.editable.value).toBe(2)
```

- [ ] **Step 2: Run auto-base tests to verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/attribute-auto-base.test.ts
```

Expected: FAIL because auto-base still returns old `UserModifierEntry`.

- [ ] **Step 3: Update `attribute-auto-base.ts`**

Replace `UserModifierEntry` with `UserModifierContribution`.

Update `createAttributeAutoBaseEntry`:

```ts
export function createAttributeAutoBaseEntry(target: AttributeTargetId, value: number): UserModifierContribution {
  const id = getAttributeAutoBaseId(target)
  return {
    id,
    definition: {
      target,
      kind: "base",
    },
    editable: {
      label: ATTRIBUTE_AUTO_BASE_LABEL,
      value,
    },
  }
}
```

Update auto-base checks:

```ts
return input.existingUserBases[0]?.id === getAttributeAutoBaseId(input.target)
```

No target/kind checks are needed in this helper because callers pass only base contributions for the current attribute target.

- [ ] **Step 4: Update `AttributesSection`**

Change imports:

```ts
import type { AttributeTargetId, ModifierTargetId, UserModifierContribution } from "@/lib/modifiers/types"
```

Update helper:

```ts
function userBaseEntriesForTarget(formData: SheetData, target: AttributeTargetId): UserModifierContribution[] {
  return (formData.userModifierContributions ?? [])
    .filter((entry): entry is UserModifierContribution =>
      entry.definition.target === target && entry.definition.kind === "base",
    )
}
```

Update store actions used:

```ts
upsertUserModifierContribution,
removeUserModifierContribution,
```

Update creation:

```ts
upsertUserModifierContribution(autoBase)
if (!formData.modifierState?.targetStates?.[target]?.activeBaseId) {
  setActiveModifierBase(target, autoBase.id)
}
```

Update removal:

```ts
removeUserModifierContribution(getAttributeAutoBaseId(target))
```

- [ ] **Step 5: Update attribute section tests**

In `tests/unit/modifiers/attribute-auto-base-section.test.tsx`, update helper selectors:

```ts
const userContributions = () => sheet().userModifierContributions ?? []
```

Update expected active base:

```ts
expect(sheet().modifierState?.targetStates["agility.value"]?.activeBaseId).toBe("user:agility.value:auto-base")
```

Update manual base helper to return `UserModifierContribution`.

- [ ] **Step 6: Run attribute tests**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/attribute-auto-base.test.ts tests/unit/modifiers/attribute-auto-base-section.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/modifiers/attribute-auto-base.ts components/character-sheet-sections/attributes-section.tsx tests/unit/modifiers/attribute-auto-base.test.ts tests/unit/modifiers/attribute-auto-base-section.test.tsx
git commit -m "refactor: store attribute auto bases as contributions"
```

---

### Task 9: Update Modifier Popover UI

**Files:**
- Modify: `components/modifiers/modifier-popover.tsx`
- Modify: `tests/unit/modifiers/modifier-popover.test.tsx`

- [ ] **Step 1: Update popover tests to new state shape**

In `tests/unit/modifiers/modifier-popover.test.tsx`, update fixtures:

```ts
modifierState: {
  targetStates: {
    evasion: { activeBaseId: "user:evasion-base" },
  },
  entryStates: {
    "user:evasion-disabled": { enabled: false },
  },
},
userModifierContributions: [{
  id: "user:evasion-base",
  definition: { target: "evasion", kind: "base" },
  editable: { label: "手动基础闪避", value: 14 },
}]
```

Update expectations:

```ts
expect(sheet().modifierState?.targetStates.evasion?.activeBaseId).toBe("user:evasion-base-14")
expect(sheet().modifierState?.entryStates["user:evasion-mod"]).toEqual({ enabled: false })
expect(sheet().userModifierContributions).toEqual(expect.arrayContaining([
  expect.objectContaining({ id: "user:evasion-mod" }),
]))
```

Add or update a test that edits a user contribution label after creation:

```ts
expect(sheet().userModifierContributions?.find(entry => entry.id === "user:evasion-mod")?.editable.label)
  .toBe("新的加值名称")
```

- [ ] **Step 2: Run popover tests to verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/modifier-popover.test.tsx
```

Expected: FAIL because the component still uses old flattened entries and old store actions.

- [ ] **Step 3: Update popover imports and editable input props**

In `components/modifiers/modifier-popover.tsx`, replace `UserModifierEntry` with `ModifierEntry` for display and `UserModifierContribution` for edits.

Import helpers:

```ts
import { entryKind, entryLabel, entryValue } from "@/lib/modifiers/entry-utils"
import type { ModifierEntry, ModifierEntryKind, ModifierTargetId, UserModifierContribution } from "@/lib/modifiers/types"
```

Change `EditableValueInputProps`:

```ts
interface EditableValueInputProps {
  entry: ModifierEntry
  onCommit: (id: string, value: number) => void
  signed?: boolean
}
```

Update input internals:

```ts
const [value, setValue] = useState(String(entryValue(entry)))

const commit = () => {
  const parsedValue = tryParseNumberExpression(value)
  if (parsedValue === undefined || parsedValue === entryValue(entry)) {
    setValue(String(entryValue(entry)))
    return
  }
  onCommit(entry.id, parsedValue)
}
```

- [ ] **Step 4: Update user contribution actions**

Use store actions:

```ts
const setModifierEntryEnabled = useSheetStore(state => state.setModifierEntryEnabled)
const upsertUserModifierContribution = useSheetStore(state => state.upsertUserModifierContribution)
const removeUserModifierContribution = useSheetStore(state => state.removeUserModifierContribution)
```

Add helper inside component:

```ts
const updateUserContributionValue = (id: string, value: number) => {
  const contribution = (sheetData.userModifierContributions ?? []).find(entry => entry.id === id)
  if (!contribution) return
  upsertUserModifierContribution({
    ...contribution,
    editable: {
      ...contribution.editable,
      value,
    },
  })
}
```

Add a matching label update helper:

```ts
const updateUserContributionLabel = (id: string, label: string) => {
  const contribution = (sheetData.userModifierContributions ?? []).find(entry => entry.id === id)
  if (!contribution) return
  upsertUserModifierContribution({
    ...contribution,
    editable: {
      ...contribution.editable,
      label: label.trim() || (contribution.definition.kind === "base" ? "手动基础值" : "手动加值"),
    },
  })
}
```

Create user contribution:

```ts
const contribution: UserModifierContribution = {
  id,
  definition: {
    target,
    kind,
  },
  editable: {
    label: name.trim() || (kind === "base" ? "手动基础值" : "手动加值"),
    value: parsedValue,
  },
}

upsertUserModifierContribution(contribution)
```

- [ ] **Step 5: Update rendering to structured entries**

Replace:

```tsx
entry.label
entry.value
entry.sourceType === "user"
```

with:

```tsx
entryLabel(entry)
entryValue(entry)
entry.source.type === "user"
```

For user entries, render a compact text input for the label and commit through `updateUserContributionLabel`. System entries keep rendering read-only labels:

```tsx
{entry.source.type === "user" ? (
  <input
    type="text"
    aria-label={`编辑${entryLabel(entry)}名称`}
    value={entryLabel(entry)}
    className="min-w-0 flex-1 rounded border border-gray-300 px-1 text-xs"
    onChange={event => updateUserContributionLabel(entry.id, event.target.value)}
  />
) : (
  <span className="truncate">{entryLabel(entry)}</span>
)}
```

Checkbox enabled calculation:

```tsx
const checked = sheetData.modifierState?.entryStates?.[entry.id]?.enabled !== false
```

Checkbox handler:

```tsx
onChange={event => setModifierEntryEnabled(entry.id, event.target.checked)}
```

Delete handler:

```tsx
onClick={() => removeUserModifierContribution(entry.id)}
```

- [ ] **Step 6: Run popover tests**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/modifier-popover.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/modifiers/modifier-popover.tsx tests/unit/modifiers/modifier-popover.test.tsx
git commit -m "refactor: update modifier popover for provider state"
```

---

### Task 10: Normalize Armor Modifier Target to ArmorMax

**Files:**
- Modify: `lib/modifiers/types.ts`
- Modify: `lib/modifiers/source-definitions.ts`
- Modify: `lib/modifiers/target-accessors.ts`
- Modify: `components/character-sheet.tsx`
- Modify: `tests/unit/modifiers/source-definitions.test.ts`
- Modify: `tests/unit/modifiers/migration.test.ts`

- [ ] **Step 1: Update armor target tests**

In `tests/unit/modifiers/source-definitions.test.ts`, change armor base assertions from `armorValue` to `armorMax`:

```ts
expect(entries).toContainEqual(expect.objectContaining({
  id: "armor:current:armorMax",
  definition: { target: "armorMax", kind: "base" },
  presentation: { label: "锁子甲：基础护甲值", value: 4 },
  source: { type: "armor", id: "armor:current" },
}))
```

In migration tests, add coverage for old `armorValue` modifier state:

```ts
const migrated = migrateSheetData({
  modifierState: {
    byTarget: {
      armorValue: {
        activeBaseId: "armor:current:armorValue",
        disabledEntryIds: ["user:armor-mod"],
      },
    },
  },
})

expect(migrated.modifierState?.targetStates.armorMax?.activeBaseId).toBe("armor:current:armorMax")
expect(migrated.modifierState?.entryStates["user:armor-mod"]).toEqual({ enabled: false })
```

- [ ] **Step 2: Run armor target tests to verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/source-definitions.test.ts tests/unit/modifiers/migration.test.ts
```

Expected: FAIL because the code still emits and migrates `armorValue`.

- [ ] **Step 3: Update target types and accessors**

In `lib/modifiers/types.ts`, replace `"armorValue"` in `ModifierTargetId` with `"armorMax"`.

In `lib/modifiers/target-accessors.ts`, remove `armorValue` from the string target branch and include `armorMax` with numeric max targets:

```ts
if (target === "hpMax" || target === "stressMax" || target === "armorMax") {
  return { ...sheetData, [target]: Number(value) }
}
```

Keep `readTargetValue` generic behavior; it can read `sheetData.armorMax`.

- [ ] **Step 4: Update armor system entries**

In `lib/modifiers/source-definitions.ts`, change armor base entry:

```ts
entries.push(createModifierEntry({
  id: "armor:current:armorMax",
  sourceId: "armor:current",
  target: "armorMax",
  kind: "base",
  label: `${armorLabel}：基础护甲值`,
  value: armorValue,
  sourceType: "armor",
  priority: 100,
}))
```

- [ ] **Step 5: Update armor field anchor**

In `components/character-sheet.tsx`, change:

```tsx
<ModifierFieldAnchor target="armorValue" label="护甲值" />
```

to:

```tsx
<ModifierFieldAnchor target="armorMax" label="护甲值" />
```

- [ ] **Step 6: Update migration mapping for legacy armorValue target**

In `lib/sheet-data-migration.ts`, when converting legacy `byTarget` entries, normalize target and ids:

```ts
function migrateModifierTarget(target: string): ModifierTargetId {
  return target === "armorValue" ? "armorMax" : target as ModifierTargetId
}

function migrateModifierEntryId(entryId: string): string {
  return entryId.replaceAll("armorValue", "armorMax")
}
```

Apply these when populating `targetStates`, `entryStates`, and migrated user contributions.

- [ ] **Step 7: Run armor target tests**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/source-definitions.test.ts tests/unit/modifiers/migration.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/modifiers/types.ts lib/modifiers/source-definitions.ts lib/modifiers/target-accessors.ts lib/sheet-data-migration.ts components/character-sheet.tsx tests/unit/modifiers/source-definitions.test.ts tests/unit/modifiers/migration.test.ts
git commit -m "refactor: migrate armor modifier target to armor max"
```

---

### Task 11: Update Remaining Tests and Type References

**Files:**
- Modify remaining files reported by search:
  - `tests/unit/modifiers/*.test.ts*`
  - `components/character-sheet-page-two.tsx` only if TypeScript reports modifier type breakage
  - `lib/modifiers/effect-executor.ts` only if TypeScript reports modifier type breakage

- [ ] **Step 1: Search for old entry/state references**

Run:

```bash
rg -n "byTarget|userEntries|disabledEntryIds|UserModifierEntry|entry\\.target|entry\\.kind|entry\\.label|entry\\.value|entry\\.sourceType|entry\\.sourceId|setModifierEntryDisabled|upsertUserModifierEntry|removeUserModifierEntry" lib components tests/unit/modifiers -S
rg -n "armor:current:armorValue|target=\"armorValue\"|target: \"armorValue\"|target === \"armorValue\"" lib/modifiers components tests/unit/modifiers -S
```

Expected: remaining old-model results are limited to intentionally legacy migration tests. Production code has no old-model references and no `armorValue` modifier target references.

- [ ] **Step 2: Update each remaining production reference**

Use these replacements:

```text
entry.target -> entry.definition.target
entry.kind -> entry.definition.kind
entry.label -> entry.presentation.label
entry.value -> entry.presentation.value
entry.sourceType -> entry.source.type
entry.sourceId -> entry.source.id
modifierState.byTarget -> modifierState.targetStates / entryStates depending on meaning
userEntries -> userModifierContributions
disabledEntryIds -> entryStates[id].enabled === false
armorValue -> armorMax for modifier targets and registry entries
```

- [ ] **Step 3: Run all modifier tests**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers
```

Expected: PASS.

- [ ] **Step 4: Run type check**

Run:

```bash
pnpm exec tsc --noEmit
```

Expected: PASS. If the project does not have a working `tsc --noEmit` command, record the exact failure and run:

```bash
pnpm exec vitest run tests/unit/modifiers tests/unit/automation tests/unit/number-utils.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib components tests
git commit -m "refactor: finish modifier architecture migration"
```

---

### Task 12: Final Verification

**Files:**
- No planned code changes unless verification finds a concrete issue.

- [ ] **Step 1: Run full focused verification**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers tests/unit/automation tests/unit/number-utils.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run type check**

Run:

```bash
pnpm exec tsc --noEmit
```

Expected: PASS, or document the exact pre-existing blocker if this repo currently lacks a clean typecheck.

- [ ] **Step 3: Inspect git status**

Run:

```bash
git status --short
```

Expected: no uncommitted changes.
