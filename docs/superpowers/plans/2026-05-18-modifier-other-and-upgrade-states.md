# Modifier Other Adjustments and Upgrade States Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the finalized "Other" adjustment model and unified `upgradeStates` model without touching later agenda topics such as threshold grouping or equipment auto-matching.

**Architecture:** Add a first-class `otherAdjustments` collection beside `userModifierContributions`, and make reference/final reconciliation apply Other adjustments outside the normal base/modifier entry list. Replace `checkedUpgrades` + `automationSelections` with one `upgradeStates` structure, generated from v1 `checkedUpgrades` during migration and consumed by registry/UI.

**Tech Stack:** Next.js/React 19, Zustand, TypeScript, Vitest, Testing Library.

---

## File Map

- Modify `lib/modifiers/types.ts`: add `OtherAdjustment`, `OtherAdjustmentKind`, `UpgradeState`, `UpgradeStateParams`, and `UpgradeAutomationMetadata`.
- Create `lib/modifiers/other-adjustments.ts`: stable ids, labels/badges, sanitizer, upsert/remove helpers, derived unattributed-difference calculator.
- Modify `lib/sheet-data.ts`: add `otherAdjustments?: OtherAdjustment[]`, add `upgradeStates?: UpgradeStates`, remove runtime reliance on `checkedUpgrades` and `automationSelections`.
- Modify `lib/default-sheet-data.ts`: initialize `otherAdjustments: []` and `upgradeStates: {}`.
- Modify `lib/modifiers/reference-calculator.ts`: include saved and derived Other adjustments in summary separately from bases/modifiers.
- Modify `lib/modifiers/final-input-reconciliation.ts`: create manual final adjustments in `otherAdjustments`, materialize/delete unattributed difference on auto-calculation transitions, keep special base behavior for no-reference targets.
- Modify `lib/modifiers/target-sync.ts`: calculate final as `referenceTotal + saved other adjustments + derived unattributed difference` and preserve non-numeric final behavior.
- Modify `lib/modifiers/registry.ts` and `lib/modifiers/source-definitions.ts`: read `upgradeStates`, stop reading `automationSelections`.
- Modify `lib/automation/upgrade-actions.ts`: return typed upgrade params from metadata, not label matching.
- Create `lib/modifiers/upgrade-states.ts`: sanitize/merge helpers for `upgradeStates`, including legal target/attribute/experience validation.
- Modify `data/list/upgrade.ts`: add machine-readable `automation` metadata.
- Modify `components/character-sheet-page-two.tsx`, `components/character-sheet-page-two-sections/upgrade-section.tsx`, `components/upgrade-popover/attribute-upgrade-editor.tsx`, `components/upgrade-popover/experience-values-editor.tsx`: read/write `upgradeStates`.
- Modify `components/modifiers/modifier-popover.tsx`: render `Other` section with correct badges, edit/delete rules, and no longer show materialized other adjustments in `修正值`.
- Modify `lib/sheet-data-migration.ts`: v1 -> v2 creates `upgradeStates`, computes `unknownMigrationDifference`, deletes `checkedUpgrades`/`automationSelections`.
- Modify `lib/character-data-validator.ts`: import/export validation keeps `otherAdjustments` and `upgradeStates`, and does not reintroduce `checkedUpgrades` or `automationSelections`.
- Update tests under `tests/unit/modifiers`, `tests/unit/automation`, and `tests/integration`.

---

## Execution Review Gate

This plan has been independently reviewed by four read-only subagents before implementation. The following corrections are binding and supersede any conflicting snippets below.

### Scope Guard

- Implement only agenda issue 1 and issue 2.
- Do not implement threshold paired panels or legacy equipment provider migration in this pass.
- Do not preserve compatibility with unpublished intermediate v2 data, except where explicitly stated by a test. Main published v1 migration remains required.

### Critical Corrections

- `upgradeStates` keys are always raw `checkKey` values, never prefixed with `upgrade:`. Registry may derive `sourceId = upgrade:${checkKey}` and entry ids such as `upgrade:${checkKey}:${target}`.
- `toggleUpgradeCheckbox` must not overwrite existing `params`. It must either merge into the existing `upgradeStates[checkKey]` or be skipped when a caller already writes a complete `{ checked: true, params }` state.
- Parameterized editor confirmation must write `{ checked: true, params }` without a later generic write that drops params.
- Fixed-target upgrade recheck must regenerate params from metadata. Parameterized upgrade recheck after cancellation must open the selector again and must not reuse old params.
- `sanitizeOtherAdjustments` must validate real `ModifierTargetId` values and finite numeric values; string-only target checks are insufficient.
- Add and export `sanitizeUpgradeStates` before any migration/validator code uses it. It must validate fixed targets, legal attribute keys, legal non-negative integer experience indexes, checked states without params, and checked false states with stale params.
- `SheetData` and `defaultSheetData` fields for `otherAdjustments` and `upgradeStates` should be added before tasks that read those fields, so TypeScript remains green during task execution.
- `ReferenceSummary` early-return paths without an active base must still return consistent `otherAdjustments`, `otherTotal`, and `calculatedFinalTotal` fields.
- `character-data-validator` and its tests must be updated in the same pass as `SheetData`; otherwise import/export may reintroduce old fields.

### Required Other Adjustment Tests

- Utility tests must cover stable ids, labels/badges, legal target validation, non-finite value rejection, duplicate target+kind removal, and three saved Other kinds coexisting on one target.
- Store/reconciliation tests must cover:
  - auto on: editing or deleting `unknownMigrationDifference`, `manualFinalAdjustment`, or saved `unattributedDifference` recalculates final;
  - auto off: editing/deleting unknown/manual Other does not rewrite final, and the derived `unattributedDifference` changes accordingly;
  - toggle on: nonzero derived unattributed difference materializes into saved `otherAdjustments`, zero does not;
  - toggle off: saved `unattributedDifference` is deleted, final is preserved, and the popover can show a derived sync row that is not editable/deletable;
  - final edit with existing Other: existing unknown/manual values are subtracted correctly, manual final adjustment updates instead of double-counting, and matching the reference plus other values removes/omits the manual row.
- Popover tests must cover the `其他` section, absence of Other rows from `修正值`, editing/deleting allowed rows, saved sync row delete rule, and derived sync row non-editable/non-deletable rule.
- Direct final-editor tests for evasion, hp, stress, proficiency, threshold, attributes, and experiences must assert writes go to `manualFinalAdjustment`, not old `user:${target}:unattributed-delta`.

### Required Upgrade State Tests

- Registry tests must cover checked fixed targets for `hpMax`, `stressMax`, `evasion`, and `proficiency`; proficiency/doubleBox must produce exactly one provider entry.
- Registry tests must cover attribute and experience params, checked states without params producing no provider, and checked false producing no provider.
- Sanitizer tests must cover invalid fixed target, invalid attribute key, invalid experience index, checked true without params, checked false with stale params, and preservation of checked parameterized states without params from migration.
- UI/integration tests must assert `upgradeStates[checkKey]`, and must assert `checkedUpgrades` and `automationSelections` are not written.
- Cancellation/reselection tests must cover:
  - parameterized cancel clears params and unchecks the state;
  - parameterized recheck opens selection and does not reuse stale params;
  - fixed-target cancel/recheck restores metadata params automatically.
- `computeUpgradeAutomation` tests must prove metadata drives behavior even if the Chinese label text changes.

### Required Migration Tests

- `migrateCheckedUpgradesToUpgradeStates` must run before legacy final preservation, so fixed-target upgrade providers are present before `unknownMigrationDifference` is computed.
- Migration tests must cover:
  - checked fixed-target upgrades migrate to `upgradeStates` with params and prevent false migration deltas;
  - checked parameterized upgrades migrate as `{ checked: true }` without params;
  - `stressMax` baseline is 6: `6` creates no difference, `8` creates `unknownMigrationDifference +2`;
  - experience value baseline is 2: `2` creates no difference, `4` creates `unknownMigrationDifference +2`;
  - empty/blank/undefined final creates no Other;
  - unparseable final is preserved and creates no Other;
  - parseable final with reference creates `unknownMigrationDifference`;
  - parseable final without reference keeps the existing estimated-base/manual-base behavior;
  - old `user:${target}:unattributed-delta` does not remain in ordinary modifier rows after the published migration path.
- `CURRENT_SCHEMA_VERSION` may remain at 2 only because current v2 has not shipped. If that assumption changes, bump schema or add a v2-shape conversion.

### Task 1: Other Adjustment Utilities and Types

**Files:**
- Modify: `lib/modifiers/types.ts`
- Create: `lib/modifiers/other-adjustments.ts`
- Test: `tests/unit/modifiers/other-adjustments.test.ts`

- [ ] **Step 1: Write failing tests for Other adjustment ids, labels, and sanitizing**

Create `tests/unit/modifiers/other-adjustments.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
  createManualFinalAdjustment,
  createUnknownMigrationDifference,
  getOtherAdjustmentId,
  isOtherAdjustmentKind,
  OTHER_ADJUSTMENT_PRESENTATION,
  sanitizeOtherAdjustments,
} from "@/lib/modifiers/other-adjustments"

describe("other adjustments", () => {
  it("creates stable per-target ids", () => {
    expect(getOtherAdjustmentId("evasion", "unknownMigrationDifference")).toBe(
      "other:evasion:unknown-migration-difference",
    )
    expect(getOtherAdjustmentId("evasion", "manualFinalAdjustment")).toBe(
      "other:evasion:manual-final-adjustment",
    )
    expect(getOtherAdjustmentId("evasion", "unattributedDifference")).toBe(
      "other:evasion:unattributed-difference",
    )
  })

  it("maps each kind to its user-facing presentation", () => {
    expect(OTHER_ADJUSTMENT_PRESENTATION.unknownMigrationDifference).toEqual({
      badge: "迁移",
      label: "未知迁移差额",
      editable: true,
      removableWhenAutoCalculation: "always",
    })
    expect(OTHER_ADJUSTMENT_PRESENTATION.manualFinalAdjustment.badge).toBe("用户")
    expect(OTHER_ADJUSTMENT_PRESENTATION.manualFinalAdjustment.label).toBe("手动修改终值")
    expect(OTHER_ADJUSTMENT_PRESENTATION.unattributedDifference).toMatchObject({
      badge: "同步",
      label: "未归因差额",
      editable: false,
    })
  })

  it("sanitizes valid adjustments and removes duplicate kind per target", () => {
    const sanitized = sanitizeOtherAdjustments([
      createUnknownMigrationDifference("evasion", 1),
      createUnknownMigrationDifference("evasion", 2),
      createManualFinalAdjustment("evasion", -1),
      { id: "bad", target: "not-a-target", kind: "manualFinalAdjustment", value: 1 },
      { id: "bad-value", target: "hpMax", kind: "manualFinalAdjustment", value: "1" },
      { id: "bad-infinite", target: "hpMax", kind: "manualFinalAdjustment", value: Number.POSITIVE_INFINITY },
    ])

    expect(sanitized).toEqual([
      createUnknownMigrationDifference("evasion", 1),
      createManualFinalAdjustment("evasion", -1),
    ])
  })

  it("recognizes only supported other adjustment kinds", () => {
    expect(isOtherAdjustmentKind("unknownMigrationDifference")).toBe(true)
    expect(isOtherAdjustmentKind("manualFinalAdjustment")).toBe(true)
    expect(isOtherAdjustmentKind("unattributedDifference")).toBe(true)
    expect(isOtherAdjustmentKind("legacyDelta")).toBe(false)
  })
})
```

- [ ] **Step 2: Run failing utility tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/other-adjustments.test.ts
```

Expected: FAIL because `@/lib/modifiers/other-adjustments` does not exist.

- [ ] **Step 3: Add Other adjustment types**

In `lib/modifiers/types.ts`, add Other adjustment types and the first-class sheet-level types that later tasks will read:

```ts
export type OtherAdjustmentKind =
  | "unknownMigrationDifference"
  | "manualFinalAdjustment"
  | "unattributedDifference"

export interface OtherAdjustment {
  id: string
  target: ModifierTargetId
  kind: OtherAdjustmentKind
  value: number
}
```

In `lib/sheet-data.ts`, import `OtherAdjustment` and add:

```ts
otherAdjustments?: OtherAdjustment[]
```

In `lib/default-sheet-data.ts`, initialize:

```ts
otherAdjustments: []
```

- [ ] **Step 4: Implement `lib/modifiers/other-adjustments.ts`**

Create:

```ts
import type { ModifierTargetId, OtherAdjustment, OtherAdjustmentKind } from "@/lib/modifiers/types"

const KIND_ID_SEGMENTS: Record<OtherAdjustmentKind, string> = {
  unknownMigrationDifference: "unknown-migration-difference",
  manualFinalAdjustment: "manual-final-adjustment",
  unattributedDifference: "unattributed-difference",
}

const KIND_SET = new Set<OtherAdjustmentKind>([
  "unknownMigrationDifference",
  "manualFinalAdjustment",
  "unattributedDifference",
])

export const OTHER_ADJUSTMENT_PRESENTATION = {
  unknownMigrationDifference: {
    badge: "迁移",
    label: "未知迁移差额",
    editable: true,
    removableWhenAutoCalculation: "always",
  },
  manualFinalAdjustment: {
    badge: "用户",
    label: "手动修改终值",
    editable: true,
    removableWhenAutoCalculation: "always",
  },
  unattributedDifference: {
    badge: "同步",
    label: "未归因差额",
    editable: false,
    removableWhenAutoCalculation: "autoOnly",
  },
} as const satisfies Record<
  OtherAdjustmentKind,
  {
    badge: string
    label: string
    editable: boolean
    removableWhenAutoCalculation: "always" | "autoOnly"
  }
>

export function isOtherAdjustmentKind(value: unknown): value is OtherAdjustmentKind {
  return typeof value === "string" && KIND_SET.has(value as OtherAdjustmentKind)
}

export function getOtherAdjustmentId(target: ModifierTargetId, kind: OtherAdjustmentKind): string {
  return `other:${target}:${KIND_ID_SEGMENTS[kind]}`
}

export function createOtherAdjustment(
  target: ModifierTargetId,
  kind: OtherAdjustmentKind,
  value: number,
): OtherAdjustment {
  return {
    id: getOtherAdjustmentId(target, kind),
    target,
    kind,
    value,
  }
}

export function createUnknownMigrationDifference(target: ModifierTargetId, value: number): OtherAdjustment {
  return createOtherAdjustment(target, "unknownMigrationDifference", value)
}

export function createManualFinalAdjustment(target: ModifierTargetId, value: number): OtherAdjustment {
  return createOtherAdjustment(target, "manualFinalAdjustment", value)
}

export function createUnattributedDifference(target: ModifierTargetId, value: number): OtherAdjustment {
  return createOtherAdjustment(target, "unattributedDifference", value)
}

export function sanitizeOtherAdjustments(value: unknown): OtherAdjustment[] {
  if (!Array.isArray(value)) return []

  const seen = new Set<string>()
  return value.flatMap((item): OtherAdjustment[] => {
    if (!item || typeof item !== "object") return []
    const raw = item as { id?: unknown; target?: unknown; kind?: unknown; value?: unknown }

    if (!isModifierTargetId(raw.target)) return []
    if (!isOtherAdjustmentKind(raw.kind)) return []
    if (typeof raw.value !== "number" || !Number.isFinite(raw.value)) return []

    const key = `${raw.target}:${raw.kind}`
    if (seen.has(key)) return []
    seen.add(key)

    return [{
      id: getOtherAdjustmentId(raw.target, raw.kind),
      target: raw.target,
      kind: raw.kind,
      value: raw.value,
    }]
  })
}
```

`isModifierTargetId` must accept the explicit modifier targets and `experienceValues.${non-negative-integer}`. Do not accept arbitrary strings.

- [ ] **Step 5: Run utility tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/other-adjustments.test.ts
```

Expected: PASS.

---

### Task 1A: Sheet Upgrade State Types, Defaults, Sanitizer, and Validator

**Files:**
- Modify: `lib/modifiers/types.ts`
- Create: `lib/modifiers/upgrade-states.ts`
- Modify: `lib/sheet-data.ts`
- Modify: `lib/default-sheet-data.ts`
- Modify: `lib/character-data-validator.ts`
- Test: `tests/unit/modifiers/upgrade-states.test.ts`
- Test: `tests/unit/character-data-validator.test.ts`

- [ ] **Step 1: Write failing sanitizer and validator tests**

Create `tests/unit/modifiers/upgrade-states.test.ts` covering:

```ts
expect(sanitizeUpgradeStates({
  "tier1-1-0": { checked: true, params: { target: "hpMax" } },
  "tier1-2-0": { checked: true, params: { target: "stressMax" } },
  "tier1-5-0": { checked: true, params: { target: "evasion" } },
  "tier2-1": { checked: true, params: { target: "proficiency" } },
  "tier1-0-2": { checked: true, params: { attributes: ["agility", "strength"] } },
  "tier1-3-0": { checked: true, params: { experienceIndexes: [0, 2] } },
  "tier1-0-1": { checked: true },
  "tier1-9-0": { checked: false, params: { target: "hpMax" } },
  invalidTarget: { checked: true, params: { target: "armorMax" } },
  invalidAttribute: { checked: true, params: { attributes: ["agility", "bad"] } },
  invalidExperience: { checked: true, params: { experienceIndexes: [0, -1, 1.5] } },
})).toEqual({
  "tier1-1-0": { checked: true, params: { target: "hpMax" } },
  "tier1-2-0": { checked: true, params: { target: "stressMax" } },
  "tier1-5-0": { checked: true, params: { target: "evasion" } },
  "tier2-1": { checked: true, params: { target: "proficiency" } },
  "tier1-0-2": { checked: true, params: { attributes: ["agility", "strength"] } },
  "tier1-3-0": { checked: true, params: { experienceIndexes: [0, 2] } },
  "tier1-0-1": { checked: true },
  "tier1-9-0": { checked: false },
  invalidTarget: { checked: true },
  invalidAttribute: { checked: true },
  invalidExperience: { checked: true },
})
```

Update `tests/unit/character-data-validator.test.ts` so import/export validation:

- preserves valid `otherAdjustments`;
- preserves valid `upgradeStates`;
- sanitizes malformed `upgradeStates`;
- does not output `checkedUpgrades`;
- does not output `automationSelections`.

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/upgrade-states.test.ts tests/unit/character-data-validator.test.ts
```

Expected: FAIL because `upgrade-states.ts`, `upgradeStates`, and validator support do not exist yet.

- [ ] **Step 3: Add upgrade state types and sheet defaults**

In `lib/modifiers/types.ts`, add:

```ts
export type FixedUpgradeTargetId = "hpMax" | "stressMax" | "evasion" | "proficiency"
export type AttributeKey = "agility" | "strength" | "finesse" | "instinct" | "presence" | "knowledge"

export type UpgradeStateParams =
  | { target: FixedUpgradeTargetId }
  | { attributes: AttributeKey[] }
  | { experienceIndexes: number[] }

export interface UpgradeState {
  checked: boolean
  params?: UpgradeStateParams
}

export type UpgradeStates = Record<string, UpgradeState>
```

In `lib/sheet-data.ts`, import `UpgradeStates` and add:

```ts
upgradeStates?: UpgradeStates
```

In `lib/default-sheet-data.ts`, initialize:

```ts
upgradeStates: {}
```

- [ ] **Step 4: Implement `lib/modifiers/upgrade-states.ts`**

Create helper APIs:

```ts
sanitizeUpgradeStates(value: unknown): UpgradeStates
isFixedUpgradeTargetId(value: unknown): value is FixedUpgradeTargetId
isAttributeKey(value: unknown): value is AttributeKey
mergeUpgradeState(current: UpgradeState | undefined, next: UpgradeState): UpgradeState
```

Rules:

- invalid records are removed;
- `{ checked: true }` is valid and means checked without provider params;
- `{ checked: false, params: ... }` becomes `{ checked: false }`;
- invalid params are removed, preserving `{ checked: true }` for checked states and `{ checked: false }` for unchecked states;
- `mergeUpgradeState` must not drop existing params when the next state only changes `checked`.

- [ ] **Step 5: Update validator**

In `lib/character-data-validator.ts`, sanitize and retain:

```ts
otherAdjustments: sanitizeOtherAdjustments(...)
upgradeStates: sanitizeUpgradeStates(...)
```

Remove legacy fields from validated output:

```ts
delete (data as any).checkedUpgrades
delete (data as any).automationSelections
```

- [ ] **Step 6: Run sanitizer and validator tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/upgrade-states.test.ts tests/unit/character-data-validator.test.ts
```

Expected: PASS.

---

### Task 2: Upgrade States Metadata and Registry

**Files:**
- Modify: `lib/modifiers/types.ts`
- Modify: `data/list/upgrade.ts`
- Modify: `lib/modifiers/source-definitions.ts`
- Test: `tests/unit/modifiers/source-definitions.test.ts`

- [ ] **Step 1: Write failing registry tests for `upgradeStates`**

Append to `tests/unit/modifiers/source-definitions.test.ts`:

```ts
  it("collects upgrade entries from unified upgrade states", () => {
    const entries = collectSystemModifierEntries({
      ...defaultSheetData,
      upgradeStates: {
        "tier1-1-0": { checked: true, params: { target: "hpMax" } },
        "tier1-1-1": { checked: true, params: { target: "hpMax" } },
        "tier1-2-0": { checked: true, params: { target: "stressMax" } },
        "tier1-5-0": { checked: true, params: { target: "evasion" } },
        "tier2-1": { checked: true, params: { target: "proficiency" } },
        "tier1-0-2": { checked: true, params: { attributes: ["agility", "strength"] } },
        "tier1-3-0": { checked: true, params: { experienceIndexes: [0, 2] } },
        "tier1-0-1": { checked: true },
        "tier1-2-1": { checked: false, params: { target: "stressMax" } },
      },
      checkedUpgrades: undefined,
      automationSelections: undefined,
    } as any)

    expect(entries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "upgrade:tier1-1-0:hpMax",
        definition: { target: "hpMax", kind: "modifier" },
        presentation: { label: "升级：生命上限 +1", value: 1 },
      }),
      expect.objectContaining({
        id: "upgrade:tier1-1-1:hpMax",
        definition: { target: "hpMax", kind: "modifier" },
      }),
      expect.objectContaining({
        id: "upgrade:tier1-5-0:evasion",
        definition: { target: "evasion", kind: "modifier" },
      }),
      expect.objectContaining({
        id: "upgrade:tier1-2-0:stressMax",
        definition: { target: "stressMax", kind: "modifier" },
      }),
      expect.objectContaining({
        id: "upgrade:tier2-1:proficiency",
        definition: { target: "proficiency", kind: "modifier" },
      }),
      expect.objectContaining({
        id: "upgrade:tier1-0-2:agility.value",
        definition: { target: "agility.value", kind: "modifier" },
      }),
      expect.objectContaining({
        id: "upgrade:tier1-0-2:strength.value",
        definition: { target: "strength.value", kind: "modifier" },
      }),
      expect.objectContaining({
        id: "upgrade:tier1-3-0:experienceValues.0",
        definition: { target: "experienceValues.0", kind: "modifier" },
      }),
      expect.objectContaining({
        id: "upgrade:tier1-3-0:experienceValues.2",
        definition: { target: "experienceValues.2", kind: "modifier" },
      }),
    ]))

    expect(entries.some(entry => entry.id === "upgrade:tier1-0-1:agility.value")).toBe(false)
    expect(entries.filter(entry => entry.id === "upgrade:tier2-1:proficiency")).toHaveLength(1)
    expect(entries.some(entry => entry.id === "upgrade:tier1-2-1:stressMax")).toBe(false)
  })
```

- [ ] **Step 2: Run failing source definition tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/source-definitions.test.ts
```

Expected: FAIL because `upgradeStates` is not read.

- [ ] **Step 3: Add upgrade automation metadata type**

`UpgradeState`, `UpgradeStateParams`, and `UpgradeStates` were added in Task 1A. In `lib/modifiers/types.ts`, add only:

```ts
export type UpgradeAutomationMetadata =
  | { kind: "fixedTarget"; target: FixedUpgradeTargetId }
  | { kind: "attributeSelection"; count: 2 }
  | { kind: "experienceSelection"; count: 2 }
  | { kind: "none" }
```

- [ ] **Step 4: Add metadata to `data/list/upgrade.ts`**

Update entries:

```ts
{ label: "两项未升级的角色属性+1，然后将该属性标记为已升级。", doubleBox: false, boxCount: 3, automation: { kind: "attributeSelection", count: 2 } },
{ label: "永久增加一个生命槽。", doubleBox: false, boxCount: 2, automation: { kind: "fixedTarget", target: "hpMax" } },
{ label: "永久增加一个压力槽。", doubleBox: false, boxCount: 2, automation: { kind: "fixedTarget", target: "stressMax" } },
{ label: "选择两项经历获得额外+1。", doubleBox: false, boxCount: 1, automation: { kind: "experienceSelection", count: 2 } },
{ label: "选择一张不高于你当前等级{LEVEL_CAP}的领域卡加入卡组。", doubleBox: false, boxCount: 1, automation: { kind: "none" } },
{ label: "获得闪避值+1。", doubleBox: false, boxCount: 1, automation: { kind: "fixedTarget", target: "evasion" } },
```

For tier-specific proficiency entries:

```ts
{ label: "(同时标记两格) 获得熟练度+1。", doubleBox: true, boxCount: 2, automation: { kind: "fixedTarget", target: "proficiency" } },
```

For subclass and multiclass entries:

```ts
automation: { kind: "none" }
```

- [ ] **Step 5: Update registry source definitions to read `upgradeStates`**

In `lib/modifiers/source-definitions.ts`, replace the `automationSelections` loop with:

```ts
Object.entries(sheetData.upgradeStates ?? {}).forEach(([checkKey, state]) => {
  if (!state?.checked) return
  entries.push(...selectedUpgradeEntries(`upgrade:${checkKey}`, state))
})
```

Update `selectedUpgradeEntries` to read `selection.params` from `UpgradeState` and ignore checked states without valid params.

- [ ] **Step 6: Run source definition tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/source-definitions.test.ts
```

Expected: PASS after existing tests are updated from `automationSelections` to `upgradeStates`.

---

### Task 3: Other Adjustments in Reference Calculation and Final Reconciliation

**Files:**
- Modify: `lib/modifiers/reference-calculator.ts`
- Modify: `lib/modifiers/final-input-reconciliation.ts`
- Modify: `lib/modifiers/target-sync.ts`
- Test: `tests/unit/modifiers/reference-calculator.test.ts`
- Test: `tests/unit/modifiers/final-input-reconciliation.test.ts`
- Test: `tests/unit/modifiers/target-sync.test.ts`

- [ ] **Step 1: Write failing tests for Other-adjusted summaries**

Append to `tests/unit/modifiers/reference-calculator.test.ts`:

```ts
  it("keeps other adjustments separate from known modifiers", () => {
    const result = calculateReferenceSummary({
      sheetData: {
        ...defaultSheetData,
        evasion: "15",
        otherAdjustments: [
          createUnknownMigrationDifference("evasion", 1),
          createManualFinalAdjustment("evasion", 2),
        ],
      } as any,
      target: "evasion",
      entries: [
        createModifierEntry({
          id: "base",
          sourceId: "base",
          sourceType: "user",
          target: "evasion",
          kind: "base",
          label: "Base",
          value: 12,
          priority: 10,
        }),
      ],
      modifierState: { targetStates: { evasion: { activeBaseId: "base" } }, entryStates: {} },
    })

    expect(result.referenceTotal).toBe(12)
    expect(result.otherTotal).toBe(3)
    expect(result.calculatedFinalTotal).toBe(15)
    expect(result.otherAdjustments).toHaveLength(2)
    expect(result.unattributedDelta).toBe(0)
  })
```

- [ ] **Step 2: Run failing calculator tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/reference-calculator.test.ts
```

Expected: FAIL because `otherTotal`, `calculatedFinalTotal`, and `otherAdjustments` do not exist.

- [ ] **Step 3: Extend `ReferenceSummary`**

In `lib/modifiers/reference-calculator.ts`, add fields:

```ts
otherAdjustments: OtherAdjustment[]
otherTotal: number
calculatedFinalTotal?: number
```

Calculate:

```ts
const savedOtherAdjustments = sanitizeOtherAdjustments(input.sheetData.otherAdjustments)
  .filter(adjustment => adjustment.target === input.target)
const otherTotal = savedOtherAdjustments.reduce((sum, adjustment) => sum + adjustment.value, 0)
const calculatedFinalTotal = referenceTotal + otherTotal
const unattributedDelta = finalValue === undefined ? undefined : finalValue - calculatedFinalTotal
```

Every return path must include the new fields. If there is no active base and therefore no `referenceTotal`, return `otherAdjustments` for the target, `otherTotal`, `calculatedFinalTotal: undefined`, and keep `unattributedDelta: undefined`; do not silently drop the shape on early returns.

- [ ] **Step 4: Update final input reconciliation tests**

Change the existing "creates an unattributed delta when final input differs from an existing base" test to expect:

```ts
expect(reconciled.otherAdjustments).toContainEqual(
  createManualFinalAdjustment("evasion", 3),
)
expect(reconciled.userModifierContributions).toEqual([
  createManualBaseContribution("evasion", 12),
])
```

Add a new test:

```ts
it("materializes derived unattributed difference when enabling auto calculation", () => {
  const reconciled = enableAutoCalculationForTarget(sheet({
    evasion: "15",
    userModifierContributions: [createManualBaseContribution("evasion", 12)],
    otherAdjustments: [createUnknownMigrationDifference("evasion", 1)],
    modifierState: {
      targetStates: {
        evasion: { activeBaseId: getManualBaseId("evasion"), autoCalculation: false },
      },
      entryStates: {},
    },
  }), "evasion")

  expect(reconciled.otherAdjustments).toEqual([
    createUnknownMigrationDifference("evasion", 1),
    createUnattributedDifference("evasion", 2),
  ])
  expect(reconciled.evasion).toBe("15")
})
```

- [ ] **Step 5: Run failing reconciliation tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/final-input-reconciliation.test.ts
```

Expected: FAIL because reconciliation still writes `user:${target}:unattributed-delta`.

- [ ] **Step 6: Implement reconciliation with Other adjustments**

In `lib/modifiers/final-input-reconciliation.ts`:

- Keep `createManualBaseContribution` when no active base exists.
- Replace user `unattributed-delta` creation with `createManualFinalAdjustment`.
- In `enableAutoCalculationForTarget`, compute current derived unattributed difference from final minus reference minus saved other, then save `createUnattributedDifference` only when non-zero.
- In `setTargetAutoCalculation(false)` later, remove saved unattributed differences for the target.

- [ ] **Step 7: Update target sync to write calculated final**

In `lib/modifiers/target-sync.ts`, use:

```ts
const summary = getReferenceSummary(next, target)
const desiredValue = summary.calculatedFinalTotal
```

instead of `summary.referenceTotal`.

- [ ] **Step 8: Run modifier calculation tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/reference-calculator.test.ts tests/unit/modifiers/final-input-reconciliation.test.ts tests/unit/modifiers/target-sync.test.ts
```

Expected: PASS.

---

### Task 4: Sheet Data Migration for Other Adjustments and Upgrade States

**Files:**
- Modify: `lib/sheet-data-migration.ts`
- Test: `tests/unit/modifiers/migration.test.ts`
- Test: `tests/unit/migration-versioning.test.ts`

`lib/sheet-data.ts`, `lib/default-sheet-data.ts`, and `lib/character-data-validator.ts` were updated in Task 1A. This task may touch them only if migration tests expose a missed normalization detail.

- [ ] **Step 1: Write failing migration tests**

Add to `tests/unit/modifiers/migration.test.ts`:

```ts
  it("migrates checked fixed-target upgrades into upgrade states before preserving final values", () => {
    const migrated = migrateSheetData(v1ModifierInput({
      hpMax: 8,
      checkedUpgrades: {
        tier1: {},
        tier2: {},
        tier3: {},
        "tier1-1-0": { 1: true },
        "tier1-1-1": { 1: true },
      },
      cards: [{
        id: "profession",
        name: "Warrior",
        type: "profession",
        professionSpecial: { "起始生命": 6 },
      }],
    }))

    expect(migrated.upgradeStates).toMatchObject({
      "tier1-1-0": { checked: true, params: { target: "hpMax" } },
      "tier1-1-1": { checked: true, params: { target: "hpMax" } },
    })
    expect(migrated.otherAdjustments ?? []).not.toContainEqual(
      expect.objectContaining({ target: "hpMax", kind: "unknownMigrationDifference" }),
    )
    expect("checkedUpgrades" in (migrated as any)).toBe(false)
    expect("automationSelections" in (migrated as any)).toBe(false)
  })

  it("keeps checked parameterized upgrades without params during migration", () => {
    const migrated = migrateSheetData(v1ModifierInput({
      checkedUpgrades: {
        tier1: {},
        tier2: {},
        tier3: {},
        "tier1-0-2": { 0: true },
        "tier1-3-0": { 3: true },
      },
    }))

    expect(migrated.upgradeStates).toMatchObject({
      "tier1-0-2": { checked: true },
      "tier1-3-0": { checked: true },
    })
  })
```

- [ ] **Step 2: Run failing migration tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/migration.test.ts
```

Expected: FAIL because `upgradeStates` and `otherAdjustments` are not migrated.

- [ ] **Step 3: Verify sheet fields from Task 1A**

Task 1A already added:

```ts
upgradeStates?: UpgradeStates
otherAdjustments?: OtherAdjustment[]
```

and default values:

```ts
upgradeStates: {},
otherAdjustments: [],
```

In this migration task, do not re-add `checkedUpgrades` or `automationSelections` to the runtime interface. If migration code needs to read them, read through a raw legacy input type or `Record<string, unknown>`.

- [ ] **Step 4: Implement v1 checkedUpgrades -> upgradeStates migration**

In `lib/sheet-data-migration.ts`, add helpers:

```ts
function migrateCheckedUpgradesToUpgradeStates(raw: Partial<SheetData> | any): UpgradeStates {
  // iterate raw.checkedUpgrades entries
  // for each inner value true, set upgradeStates[checkKey] = { checked: true }
  // use upgrade metadata to add fixed target params
}
```

Use processed upgrade options from `data/list/upgrade.ts` and exact checkKey rules:

- `tier1-1-0`, `tier1-1-1` -> `hpMax`
- `tier1-2-0`, `tier1-2-1` -> `stressMax`
- `tier1-5-0` -> `evasion`
- tier2/tier3 proficiency doubleBox checkKey -> `proficiency`

The implementation should use metadata, not label matching.

- [ ] **Step 5: Implement unknown migration difference preservation**

Replace migration creation of `createUnattributedDeltaContribution(target, delta)` with:

```ts
createUnknownMigrationDifference(target, delta)
```

stored in `otherAdjustments`.

Keep no-reference behavior as estimated base.

Apply default baselines:

- `stressMax` legacy base is 6 when no explicit source exists.
- `experienceValues.${index}` legacy base is 2 when legacy final is present and no reference exists.

- [ ] **Step 6: Normalize current data**

In `normalizeCurrentSheetData`, sanitize:

```ts
normalized.otherAdjustments = sanitizeOtherAdjustments(normalized.otherAdjustments)
normalized.upgradeStates = sanitizeUpgradeStates(normalized.upgradeStates)
delete (normalized as any).checkedUpgrades
delete (normalized as any).automationSelections
```

- [ ] **Step 7: Run migration tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/migration.test.ts tests/unit/migration-versioning.test.ts
```

Expected: PASS after updating old expectations from `automationSelections` and `userModifierContributions` deltas to `upgradeStates` and `otherAdjustments`.

---

### Task 5: Store and UI Update for Upgrade States

**Files:**
- Modify: `lib/sheet-store.ts`
- Modify: `lib/automation/upgrade-actions.ts`
- Modify: `components/character-sheet-page-two.tsx`
- Modify: `components/character-sheet-page-two-sections/upgrade-section.tsx`
- Modify: `components/upgrade-popover/attribute-upgrade-editor.tsx`
- Modify: `components/upgrade-popover/experience-values-editor.tsx`
- Test: `tests/integration/upgrade-cancel-flow.test.tsx`
- Test: `tests/unit/automation/component-smoke.test.tsx`

- [ ] **Step 1: Write failing UI/store tests for `upgradeStates`**

Update `tests/integration/upgrade-cancel-flow.test.tsx` expectations:

```ts
expect(after.upgradeStates?.["tier1-5-0"]).toEqual({
  checked: true,
  params: { target: "evasion" },
})
expect(after.automationSelections).toBeUndefined()
expect(after.checkedUpgrades).toBeUndefined()
```

For parameterized cancel:

```ts
expect(after.upgradeStates?.["tier1-0-0"]).toEqual({ checked: false })
```

- [ ] **Step 2: Run failing upgrade UI tests**

Run:

```bash
npm run test:run -- tests/integration/upgrade-cancel-flow.test.tsx tests/unit/automation/component-smoke.test.tsx
```

Expected: FAIL because UI still writes `checkedUpgrades` and `automationSelections`.

- [ ] **Step 3: Replace store action**

In `lib/sheet-store.ts`, replace `setAutomationSelection` with:

```ts
setUpgradeState: (checkKey: string, state: UpgradeState) => void
```

Implementation:

```ts
setUpgradeState: (checkKey, upgradeState) => set((state) => ({
  sheetData: applyAutoCalculationForTargets({
    ...state.sheetData,
    upgradeStates: {
      ...(state.sheetData.upgradeStates ?? {}),
      [checkKey]: mergeUpgradeState(state.sheetData.upgradeStates?.[checkKey], upgradeState),
    },
  }),
}))
```

This action must preserve existing `params` when the incoming state only changes `checked`. It must clear params only when the caller explicitly passes `{ checked: false }` or a complete replacement state that intentionally has no params.

- [ ] **Step 4: Update upgrade action computation**

In `lib/automation/upgrade-actions.ts`, return `UpgradeStateParams` for fixed target metadata instead of `AutomationSelection`.

Return shape:

```ts
selection?: never
upgradeState?: UpgradeState
```

For fixed target:

```ts
upgradeState: selected
  ? { checked: true, params: { target } }
  : { checked: false }
```

- [ ] **Step 5: Update page two checkbox handling**

In `components/character-sheet-page-two.tsx`:

- Replace `toggleUpgradeCheckbox` implementation with a merge-preserving call to `setUpgradeState(checkKey, { checked })`.
- Read checked state from `safeFormData.upgradeStates?.[checkKey]?.checked`.
- For fixed target options, call `setUpgradeState(checkKey, result.upgradeState)`.
- Do not call generic toggle after writing a complete fixed-target `{ checked: true, params }` state.
- For unchecked states, call `setUpgradeState(checkKey, { checked: false })` so stale params are cleared by `mergeUpgradeState`.
- Stop writing `checkedUpgrades`.

- [ ] **Step 6: Update parameterized editors**

In `attribute-upgrade-editor.tsx`, use the raw `checkKey` as the stored key:

```ts
setUpgradeState(checkKey, {
  checked: true,
  params: { attributes: selectedAttributes },
})
```

In `experience-values-editor.tsx`:

```ts
setUpgradeState(checkKey, {
  checked: true,
  params: { experienceIndexes: Array.from(selected) },
})
```

Do not call any generic checkbox toggle after these editor confirmations, because that can overwrite params.

- [ ] **Step 7: Update upgrade section display helpers**

In `components/character-sheet-page-two-sections/upgrade-section.tsx`, replace:

```ts
formData.automationSelections?.[`upgrade:${checkKey}`]
```

with:

```ts
formData.upgradeStates?.[checkKey]
```

- [ ] **Step 8: Run upgrade UI tests**

Run:

```bash
npm run test:run -- tests/integration/upgrade-cancel-flow.test.tsx tests/unit/automation/component-smoke.test.tsx
```

Expected: PASS.

---

### Task 6: Modifier Popover Other Section

**Files:**
- Modify: `components/modifiers/modifier-popover.tsx`
- Modify: `lib/sheet-store.ts`
- Test: `tests/unit/modifiers/modifier-popover.test.tsx`
- Test: `tests/unit/modifiers/store-actions.test.ts`

- [ ] **Step 1: Write failing popover tests for Other section**

Add to `tests/unit/modifiers/modifier-popover.test.tsx`:

```ts
  it("shows other adjustments separately from modifiers", async () => {
    resetSheetStore({
      evasion: "15",
      userModifierContributions: [createManualBaseContribution("evasion", 12)],
      otherAdjustments: [
        createUnknownMigrationDifference("evasion", 1),
        createManualFinalAdjustment("evasion", 2),
      ],
      modifierState: {
        targetStates: { evasion: { activeBaseId: getManualBaseId("evasion"), autoCalculation: true } },
        entryStates: {},
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)
    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

    expect(screen.getByText("其他")).toBeInTheDocument()
    expect(screen.getByText("未知迁移差额")).toBeInTheDocument()
    expect(screen.getByText("手动修改终值")).toBeInTheDocument()
    expect(screen.getByText("迁移")).toBeInTheDocument()
    expect(screen.getByText("用户")).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run failing popover test**

Run:

```bash
npm run test:run -- tests/unit/modifiers/modifier-popover.test.tsx
```

Expected: FAIL because Other section is not rendered.

- [ ] **Step 3: Add store actions for Other adjustments**

In `lib/sheet-store.ts`, add:

```ts
upsertOtherAdjustment: (adjustment: OtherAdjustment) => void
removeOtherAdjustment: (entryId: string) => void
```

`removeOtherAdjustment` must:

- remove the adjustment from `otherAdjustments`.
- if auto calculation is enabled for that target, call `applyAutoCalculationForTargets`.
- if auto calculation is disabled, leave final value unchanged.

- [ ] **Step 4: Render Other section**

In `modifier-popover.tsx`:

- Use `summary.otherAdjustments`.
- If auto calculation is disabled and `summary.unattributedDelta` is non-zero, append a derived display row with kind `unattributedDifference`, not saved id.
- Render section title `其他`.
- Editable rows: unknown migration difference and manual final adjustment.
- Delete button rules:
  - unknown migration difference: always.
  - manual final adjustment: always.
  - saved unattributed difference: only when auto calculation is enabled.
  - derived unattributed difference: no delete button.

- [ ] **Step 5: Run popover tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/modifier-popover.test.tsx tests/unit/modifiers/store-actions.test.ts
```

Expected: PASS after updating old expectations that looked for special deltas in `修正值`.

---

### Task 7: Final Verification

**Files:**
- All modified files.

- [ ] **Step 1: Run focused modifier and automation tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers tests/unit/automation tests/integration/upgrade-cancel-flow.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run migration and equipment tests**

Run:

```bash
npm run test:run -- tests/unit/migration-versioning.test.ts tests/unit/modifiers/migration.test.ts tests/unit/equipment
```

Expected: PASS.

- [ ] **Step 3: Run full unit suite**

Run:

```bash
npm run test:unit
```

Expected: PASS.

- [ ] **Step 4: Check type/build health if unit tests pass**

Run:

```bash
npm run build
```

Expected: PASS.

---

## Self-Review

Spec coverage:

- `2026-05-18-modifier-other-adjustments-design.md`: covered by Tasks 1, 3, 4, 6, 7.
- `2026-05-18-upgrade-states-provider-migration-design.md`: covered by Tasks 2, 4, 5, 7.
- Scope exclusions respected: no threshold grouping, no equipment auto-matching, no unrelated UI redesign.

Known implementation risks:

- Existing tests assert `automationSelections` and `user:${target}:unattributed-delta`; update them deliberately to the new published v2 model.
- `checkedUpgrades` type is documented inline in `sheet-data.ts`; remove or mark as migration-only to avoid stale runtime docs.
- `build` runs image optimization and static export steps; if it fails due unrelated environment/image issues, capture the exact failure and run `npm run test:unit` as the primary verification.
