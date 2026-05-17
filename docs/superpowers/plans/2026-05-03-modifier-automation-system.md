# Modifier Automation System Implementation Plan

> **状态：历史执行计划，已过时。** 本计划描述的 final-value-first 自动化和 snapshot/rollback
> 过渡步骤已经被当前 provider/target 架构、v2 迁移和 final input reconciliation 取代。
> 它只记录当时的执行过程，不作为当前行为依据。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first-phase modifier/reference system and unified automation execution layer without changing existing final-value-first sheet behavior.

**Architecture:** Add a focused `lib/modifiers` module containing persisted state types, target accessors, effect execution, registry collection, and reference summary helpers. Migrate profession, armor, and upgrade automation to shared source/effect definitions while preserving the current store-facing behavior covered by baseline tests. Add a compact v1-style modifier popover UI that reads derived entries and user modifier state from `SheetData`.

**Tech Stack:** Next.js 15, React 19, TypeScript, Zustand, Vitest, Testing Library, lucide-react.

---

## File Structure

Create these focused files:

- `lib/modifiers/types.ts`  
  Shared target ids, persisted `modifierState` / `automationSelections` types, modifier entry types, and effect types.

- `lib/modifiers/target-accessors.ts`  
  Pure helpers to read/write target values in `SheetData`, including `proficiency` count and `experienceValues[n]`.

- `lib/modifiers/effect-executor.ts`  
  Pure `applyEffects` / `revertEffects` implementation. Handles numeric parsing, add semantics, warnings, and immutable `SheetData` updates.

- `lib/modifiers/reference-calculator.ts`  
  Pure helper to merge entries, resolve active base fallback, apply disabled ids, compute reference total and unattributed delta.

- `lib/modifiers/source-definitions.ts`  
  Unified definitions for profession, armor, level/threshold, and upgrade sources. Produces both effects and modifier entries.

- `lib/modifiers/registry.ts`  
  Public `collectModifierEntries` and `getReferenceSummary` API used by UI and tests.

- `components/modifiers/modifier-popover.tsx`  
  Compact v1-style question-mark popover content and field button.

- `components/modifiers/modifier-field-anchor.tsx`  
  Thin wrapper to attach the question-mark button to existing inputs without changing their editing model.

Modify these existing files:

- `lib/sheet-data.ts`  
  Add `modifierState?: ModifierState` and `automationSelections?: AutomationSelections`.

- `lib/default-sheet-data.ts`  
  Initialize `modifierState` and `automationSelections` to empty structures.

- `lib/sheet-data-migration.ts`  
  Add conservative migration for the new empty structures.

- `lib/sheet-store.ts`  
  Add store actions for modifier user state and automation selections. Keep existing snapshot actions until the upgrade UI migration task removes or stops using them.

- `lib/automation/upgrade-actions.ts`  
  Move add-style upgrade automation onto shared effect executor while preserving current public result shape during transition.

- `components/character-sheet.tsx`  
  Attach modifier popovers to page-one fields: evasion, armor value, minor/major thresholds.

- `components/character-sheet-sections/attributes-section.tsx`  
  Attach modifier popovers to six attributes.

- `components/character-sheet-sections/hit-points-section.tsx`  
  Attach modifier popovers to `hpMax` and `stressMax`.

- `components/character-sheet-sections/experience-section.tsx`  
  Attach modifier popovers to experience value fields.

- `components/character-sheet-page-two.tsx` and upgrade popover components  
  Persist upgrade selections/params and use add effects instead of snapshot rollback for upgraded targets.

Add tests:

- `tests/unit/modifiers/effect-executor.test.ts`
- `tests/unit/modifiers/reference-calculator.test.ts`
- `tests/unit/modifiers/source-definitions.test.ts`
- `tests/unit/modifiers/migration.test.ts`
- `tests/unit/modifiers/modifier-popover.test.tsx`
- Update `tests/unit/automation/upgrade-automation.test.ts`
- Update or replace snapshot-specific assertions in `tests/unit/automation/rollback-snapshots.test.ts` after new selection-based undo is in place.

Use existing verification:

```bash
pnpm exec vitest run tests/unit/modifiers tests/unit/automation
pnpm test:run
```

Known caveat: `tsc --noEmit` had pre-existing failures outside this feature branch; do not use it as the primary gate until those unrelated errors are fixed.

---

## Task 1: Add Persisted Modifier State Types and Migration

**Files:**
- Create: `lib/modifiers/types.ts`
- Modify: `lib/sheet-data.ts`
- Modify: `lib/default-sheet-data.ts`
- Modify: `lib/sheet-data-migration.ts`
- Test: `tests/unit/modifiers/migration.test.ts`

- [ ] **Step 1: Write failing migration tests**

Create `tests/unit/modifiers/migration.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { migrateSheetData } from "@/lib/sheet-data-migration"

describe("modifier state migration", () => {
  it("adds empty modifier state without changing existing final values", () => {
    const migrated = migrateSheetData({
      name: "Legacy",
      evasion: "12+敏捷",
      hpMax: 7,
      armorValue: "4",
      minorThreshold: "10",
      majorThreshold: "20",
    })

    expect(migrated.evasion).toBe("12+敏捷")
    expect(migrated.hpMax).toBe(7)
    expect(migrated.armorValue).toBe("4")
    expect(migrated.minorThreshold).toBe("10")
    expect(migrated.majorThreshold).toBe("20")
    expect(migrated.modifierState).toEqual({ byTarget: {} })
    expect(migrated.automationSelections).toEqual({})
  })

  it("preserves existing modifier state and automation selections", () => {
    const migrated = migrateSheetData({
      modifierState: {
        byTarget: {
          evasion: {
            activeBaseId: "user:evasion-base",
            disabledEntryIds: ["upgrade:evasion"],
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
      automationSelections: {
        "upgrade:tier1-5-0": {
          selected: true,
          params: { target: "evasion" },
        },
      },
    })

    expect(migrated.modifierState?.byTarget.evasion?.activeBaseId).toBe("user:evasion-base")
    expect(migrated.automationSelections?.["upgrade:tier1-5-0"]?.selected).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/migration.test.ts
```

Expected: FAIL because `modifierState` and `automationSelections` types/default migration do not exist yet.

- [ ] **Step 3: Add shared modifier types**

Create `lib/modifiers/types.ts`:

```ts
import type { SheetData } from "@/lib/sheet-data"

export type AttributeTargetId =
  | "agility.value"
  | "strength.value"
  | "finesse.value"
  | "instinct.value"
  | "presence.value"
  | "knowledge.value"

export type ExperienceTargetId = `experienceValues.${number}`

export type ModifierTargetId =
  | "evasion"
  | "armorValue"
  | "minorThreshold"
  | "majorThreshold"
  | "hpMax"
  | "stressMax"
  | "proficiency"
  | AttributeTargetId
  | ExperienceTargetId

export type ModifierEntryId = string
export type AutomationSourceId = string

export type ModifierEntryKind = "base" | "modifier"
export type ModifierSourceType = "profession" | "armor" | "level" | "upgrade" | "user"

export interface ModifierEntry {
  id: ModifierEntryId
  sourceId: AutomationSourceId
  target: ModifierTargetId
  kind: ModifierEntryKind
  label: string
  value: number
  sourceType: ModifierSourceType
  priority: number
}

export interface UserModifierEntry extends ModifierEntry {
  sourceType: "user"
}

export interface TargetModifierState {
  activeBaseId?: ModifierEntryId
  disabledEntryIds?: ModifierEntryId[]
  userEntries?: UserModifierEntry[]
}

export interface ModifierState {
  byTarget: Partial<Record<ModifierTargetId, TargetModifierState>>
}

export interface AutomationSelection {
  selected: boolean
  params?: Record<string, unknown>
}

export type AutomationSelections = Record<AutomationSourceId, AutomationSelection>

export interface AddEffect {
  operation: "add"
  target: ModifierTargetId
  value: number
}

export interface SetBaseEffect {
  operation: "setBase"
  target: ModifierTargetId
  value: number | string
}

export interface RecalculateEffect {
  operation: "recalculate"
  target: ModifierTargetId
  formulaId: string
}

export type AutomationEffect = AddEffect | SetBaseEffect | RecalculateEffect

export interface AutomationContext {
  sheetData: SheetData
  selections?: AutomationSelections
  sourceId?: AutomationSourceId
  params?: Record<string, unknown>
}

export interface AutomationSourceDefinition {
  id: AutomationSourceId
  sourceType: ModifierSourceType
  label: string
  createEffects: (context: AutomationContext) => AutomationEffect[]
  createModifierEntries: (context: AutomationContext) => ModifierEntry[]
}

export interface ApplyEffectsResult {
  sheetData: SheetData
  updates: Partial<SheetData>
  warnings: string[]
}
```

- [ ] **Step 4: Extend `SheetData`**

In `lib/sheet-data.ts`, add this import near other imports:

```ts
import type { AutomationSelections, ModifierState } from "@/lib/modifiers/types"
```

Then add these fields to `SheetData` after `checkedUpgrades?: CheckedUpgrades`:

```ts
  modifierState?: ModifierState
  automationSelections?: AutomationSelections
```

- [ ] **Step 5: Add defaults**

In `lib/default-sheet-data.ts`, add these properties after `checkedUpgrades`:

```ts
    modifierState: {
        byTarget: {},
    },
    automationSelections: {},
```

- [ ] **Step 6: Add conservative migration**

In `lib/sheet-data-migration.ts`, add:

```ts
function migrateModifierState(data: SheetData): SheetData {
  const migrated = { ...data }

  if (!migrated.modifierState || typeof migrated.modifierState !== "object") {
    migrated.modifierState = { byTarget: {} }
    console.log("[Migration] Added modifierState field")
  } else if (!migrated.modifierState.byTarget || typeof migrated.modifierState.byTarget !== "object") {
    migrated.modifierState = { ...migrated.modifierState, byTarget: {} }
    console.log("[Migration] Added modifierState.byTarget field")
  }

  if (!migrated.automationSelections || typeof migrated.automationSelections !== "object") {
    migrated.automationSelections = {}
    console.log("[Migration] Added automationSelections field")
  }

  return migrated
}
```

Call it after `migrateNotebook(migrated)` and before `cleanupDeprecatedFields(migrated)`:

```ts
  migrated = migrateModifierState(migrated)
```

- [ ] **Step 7: Run tests**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/migration.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/modifiers/types.ts lib/sheet-data.ts lib/default-sheet-data.ts lib/sheet-data-migration.ts tests/unit/modifiers/migration.test.ts
git commit -m "feat(modifiers): add persisted modifier state"
```

---

## Task 2: Implement Target Accessors and Add Effect Executor

**Files:**
- Create: `lib/modifiers/target-accessors.ts`
- Create: `lib/modifiers/effect-executor.ts`
- Test: `tests/unit/modifiers/effect-executor.test.ts`

- [ ] **Step 1: Write failing executor tests**

Create `tests/unit/modifiers/effect-executor.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { applyEffects, revertEffects } from "@/lib/modifiers/effect-executor"

describe("modifier effect executor", () => {
  it("applies and reverts add effects on string numeric targets", () => {
    const sheetData = { ...defaultSheetData, evasion: "12" }

    const applied = applyEffects(sheetData, [{ operation: "add", target: "evasion", value: 1 }])
    expect(applied.sheetData.evasion).toBe("13")
    expect(applied.updates).toEqual({ evasion: "13" })
    expect(applied.warnings).toEqual([])

    const reverted = revertEffects(applied.sheetData, [{ operation: "add", target: "evasion", value: 1 }])
    expect(reverted.sheetData.evasion).toBe("12")
    expect(reverted.updates).toEqual({ evasion: "12" })
  })

  it("skips add effects when target cannot be parsed as a pure number", () => {
    const sheetData = { ...defaultSheetData, evasion: "12+敏捷" }

    const result = applyEffects(sheetData, [{ operation: "add", target: "evasion", value: 1 }])

    expect(result.sheetData.evasion).toBe("12+敏捷")
    expect(result.updates).toEqual({})
    expect(result.warnings).toEqual([
      "evasion 当前值无法解析为数字，已跳过 +1",
    ])
  })

  it("treats direct final value edits as the new current value for revert", () => {
    const sheetData = { ...defaultSheetData, evasion: "20" }

    const result = revertEffects(sheetData, [{ operation: "add", target: "evasion", value: 1 }])

    expect(result.sheetData.evasion).toBe("19")
    expect(result.updates).toEqual({ evasion: "19" })
  })

  it("adds to attribute values without replacing checked or spellcasting flags", () => {
    const sheetData = {
      ...defaultSheetData,
      agility: { checked: false, value: "2", spellcasting: true },
    }

    const result = applyEffects(sheetData, [{ operation: "add", target: "agility.value", value: 1 }])

    expect(result.sheetData.agility).toEqual({
      checked: false,
      value: "3",
      spellcasting: true,
    })
  })

  it("adds to experience values by index", () => {
    const sheetData = {
      ...defaultSheetData,
      experienceValues: ["1", "2", "", "", ""],
    }

    const result = applyEffects(sheetData, [{ operation: "add", target: "experienceValues.1", value: 1 }])

    expect(result.sheetData.experienceValues).toEqual(["1", "3", "", "", ""])
  })

  it("adds to hpMax and stressMax numeric targets", () => {
    const sheetData = { ...defaultSheetData, hpMax: 6, stressMax: 6 }

    const result = applyEffects(sheetData, [
      { operation: "add", target: "hpMax", value: 1 },
      { operation: "add", target: "stressMax", value: 1 },
    ])

    expect(result.sheetData.hpMax).toBe(7)
    expect(result.sheetData.stressMax).toBe(7)
  })

  it("adds and reverts proficiency count while preserving boolean array storage", () => {
    const sheetData = {
      ...defaultSheetData,
      proficiency: [true, false, false, false, false, false],
    }

    const applied = applyEffects(sheetData, [{ operation: "add", target: "proficiency", value: 1 }])
    expect(applied.sheetData.proficiency).toEqual([true, true, false, false, false, false])

    const reverted = revertEffects(applied.sheetData, [{ operation: "add", target: "proficiency", value: 1 }])
    expect(reverted.sheetData.proficiency).toEqual([true, false, false, false, false, false])
  })
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/effect-executor.test.ts
```

Expected: FAIL because the executor module does not exist.

- [ ] **Step 3: Implement target accessors**

Create `lib/modifiers/target-accessors.ts`:

```ts
import type { AttributeValue, SheetData } from "@/lib/sheet-data"
import type { ModifierTargetId } from "./types"

const ATTRIBUTE_TARGETS = {
  "agility.value": "agility",
  "strength.value": "strength",
  "finesse.value": "finesse",
  "instinct.value": "instinct",
  "presence.value": "presence",
  "knowledge.value": "knowledge",
} as const

type AttributeTarget = keyof typeof ATTRIBUTE_TARGETS
type AttributeKey = (typeof ATTRIBUTE_TARGETS)[AttributeTarget]

export function readTargetValue(sheetData: SheetData, target: ModifierTargetId): unknown {
  if (target in ATTRIBUTE_TARGETS) {
    const attr = sheetData[ATTRIBUTE_TARGETS[target as AttributeTarget]]
    return typeof attr === "object" && attr !== null && "value" in attr ? attr.value : undefined
  }

  if (target.startsWith("experienceValues.")) {
    const index = Number(target.split(".")[1])
    return Number.isInteger(index) ? sheetData.experienceValues?.[index] : undefined
  }

  if (target === "proficiency") {
    const proficiency = sheetData.proficiency
    if (Array.isArray(proficiency)) return proficiency.filter(Boolean).length
    return typeof proficiency === "number" ? proficiency : undefined
  }

  return sheetData[target as keyof SheetData]
}

export function writeTargetValue(sheetData: SheetData, target: ModifierTargetId, value: number | string): SheetData {
  if (target in ATTRIBUTE_TARGETS) {
    const key = ATTRIBUTE_TARGETS[target as AttributeTarget] as AttributeKey
    const current = sheetData[key] as AttributeValue | undefined
    return {
      ...sheetData,
      [key]: {
        checked: current?.checked ?? false,
        value: String(value),
        ...(current?.spellcasting !== undefined ? { spellcasting: current.spellcasting } : {}),
      },
    }
  }

  if (target.startsWith("experienceValues.")) {
    const index = Number(target.split(".")[1])
    if (!Number.isInteger(index) || index < 0) return sheetData
    const values = [...(sheetData.experienceValues ?? ["", "", "", "", ""])]
    while (values.length <= index) values.push("")
    values[index] = String(value)
    return { ...sheetData, experienceValues: values }
  }

  if (target === "hpMax" || target === "stressMax") {
    return { ...sheetData, [target]: Number(value) }
  }

  if (target === "proficiency") {
    const count = Math.max(0, Math.min(6, Number(value)))
    return {
      ...sheetData,
      proficiency: Array(6).fill(false).map((_, index) => index < count),
    }
  }

  if (
    target === "evasion" ||
    target === "armorValue" ||
    target === "minorThreshold" ||
    target === "majorThreshold"
  ) {
    return { ...sheetData, [target]: String(value) }
  }

  return sheetData
}

export function targetUpdate(sheetData: SheetData, before: SheetData, target: ModifierTargetId): Partial<SheetData> {
  if (target in ATTRIBUTE_TARGETS) {
    const key = ATTRIBUTE_TARGETS[target as AttributeTarget]
    return sheetData[key] === before[key] ? {} : { [key]: sheetData[key] }
  }

  if (target.startsWith("experienceValues.")) {
    return sheetData.experienceValues === before.experienceValues ? {} : { experienceValues: sheetData.experienceValues }
  }

  if (target === "proficiency") {
    return sheetData.proficiency === before.proficiency ? {} : { proficiency: sheetData.proficiency }
  }

  return sheetData[target as keyof SheetData] === before[target as keyof SheetData]
    ? {}
    : { [target]: sheetData[target as keyof SheetData] }
}
```

- [ ] **Step 4: Implement effect executor**

Create `lib/modifiers/effect-executor.ts`:

```ts
import { isValidNumber, parseToNumber } from "@/lib/number-utils"
import type { SheetData } from "@/lib/sheet-data"
import type { ApplyEffectsResult, AutomationEffect, ModifierTargetId } from "./types"
import { readTargetValue, targetUpdate, writeTargetValue } from "./target-accessors"

function parseCurrentNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && isValidNumber(value)) return parseToNumber(value, 0)
  return undefined
}

function applySingleAdd(sheetData: SheetData, target: ModifierTargetId, delta: number): {
  sheetData: SheetData
  warning?: string
} {
  const current = parseCurrentNumber(readTargetValue(sheetData, target))
  if (current === undefined) {
    const sign = delta >= 0 ? `+${delta}` : String(delta)
    return {
      sheetData,
      warning: `${target} 当前值无法解析为数字，已跳过 ${sign}`,
    }
  }

  return {
    sheetData: writeTargetValue(sheetData, target, current + delta),
  }
}

export function applyEffects(sheetData: SheetData, effects: AutomationEffect[]): ApplyEffectsResult {
  let next = sheetData
  const updates: Partial<SheetData> = {}
  const warnings: string[] = []

  for (const effect of effects) {
    const before = next

    if (effect.operation === "add") {
      const result = applySingleAdd(next, effect.target, effect.value)
      next = result.sheetData
      if (result.warning) warnings.push(result.warning)
      Object.assign(updates, targetUpdate(next, before, effect.target))
      continue
    }

    if (effect.operation === "setBase" || effect.operation === "recalculate") {
      continue
    }
  }

  return { sheetData: next, updates, warnings }
}

export function revertEffects(sheetData: SheetData, effects: AutomationEffect[]): ApplyEffectsResult {
  const reversed = effects.map(effect => {
    if (effect.operation !== "add") return effect
    return { ...effect, value: -effect.value }
  })

  return applyEffects(sheetData, reversed)
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/effect-executor.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/modifiers/target-accessors.ts lib/modifiers/effect-executor.ts tests/unit/modifiers/effect-executor.test.ts
git commit -m "feat(modifiers): add add effect executor"
```

---

## Task 3: Implement Reference Summary and Base Fallback

**Files:**
- Create: `lib/modifiers/reference-calculator.ts`
- Test: `tests/unit/modifiers/reference-calculator.test.ts`

- [ ] **Step 1: Write failing reference tests**

Create `tests/unit/modifiers/reference-calculator.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { calculateReferenceSummary } from "@/lib/modifiers/reference-calculator"
import type { ModifierEntry, ModifierState } from "@/lib/modifiers/types"

const entries: ModifierEntry[] = [
  {
    id: "system:profession:evasion",
    sourceId: "profession:warrior",
    target: "evasion",
    kind: "base",
    label: "职业基础闪避",
    value: 12,
    sourceType: "profession",
    priority: 100,
  },
  {
    id: "upgrade:evasion",
    sourceId: "upgrade:tier1-5-0",
    target: "evasion",
    kind: "modifier",
    label: "升级：闪避 +1",
    value: 1,
    sourceType: "upgrade",
    priority: 200,
  },
]

describe("reference calculator", () => {
  it("computes reference total and unattributed delta", () => {
    const result = calculateReferenceSummary({
      sheetData: { ...defaultSheetData, evasion: "15" },
      target: "evasion",
      entries,
      targetState: {},
    })

    expect(result.activeBase?.id).toBe("system:profession:evasion")
    expect(result.enabledModifiers.map(entry => entry.id)).toEqual(["upgrade:evasion"])
    expect(result.referenceTotal).toBe(13)
    expect(result.unattributedDelta).toBe(2)
    expect(result.unknownBase).toBe(false)
  })

  it("uses saved active base when it still exists", () => {
    const userBase: ModifierEntry = {
      id: "user:evasion-base",
      sourceId: "user:evasion-base",
      target: "evasion",
      kind: "base",
      label: "手动基础闪避",
      value: 14,
      sourceType: "user",
      priority: 10,
    }

    const state: ModifierState["byTarget"]["evasion"] = {
      activeBaseId: "user:evasion-base",
    }

    const result = calculateReferenceSummary({
      sheetData: { ...defaultSheetData, evasion: "15" },
      target: "evasion",
      entries: [...entries, userBase],
      targetState: state,
    })

    expect(result.activeBase?.id).toBe("user:evasion-base")
    expect(result.referenceTotal).toBe(15)
    expect(result.unattributedDelta).toBe(0)
  })

  it("falls back to the next stable base when active base disappears", () => {
    const result = calculateReferenceSummary({
      sheetData: { ...defaultSheetData, evasion: "13" },
      target: "evasion",
      entries,
      targetState: { activeBaseId: "missing:base" },
    })

    expect(result.activeBase?.id).toBe("system:profession:evasion")
    expect(result.activeBaseChanged).toBe(true)
  })

  it("does not calculate total or delta when no base exists", () => {
    const result = calculateReferenceSummary({
      sheetData: { ...defaultSheetData, evasion: "13" },
      target: "evasion",
      entries: entries.filter(entry => entry.kind !== "base"),
      targetState: {},
    })

    expect(result.activeBase).toBeUndefined()
    expect(result.unknownBase).toBe(true)
    expect(result.referenceTotal).toBeUndefined()
    expect(result.unattributedDelta).toBeUndefined()
  })

  it("does not calculate delta when final value is not numeric", () => {
    const result = calculateReferenceSummary({
      sheetData: { ...defaultSheetData, evasion: "12+敏捷" },
      target: "evasion",
      entries,
      targetState: {},
    })

    expect(result.referenceTotal).toBe(13)
    expect(result.unattributedDelta).toBeUndefined()
  })

  it("removes disabled modifier entries from the enabled total", () => {
    const result = calculateReferenceSummary({
      sheetData: { ...defaultSheetData, evasion: "13" },
      target: "evasion",
      entries,
      targetState: { disabledEntryIds: ["upgrade:evasion"] },
    })

    expect(result.enabledModifiers).toEqual([])
    expect(result.disabledEntries.map(entry => entry.id)).toEqual(["upgrade:evasion"])
    expect(result.referenceTotal).toBe(12)
    expect(result.unattributedDelta).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/reference-calculator.test.ts
```

Expected: FAIL because `reference-calculator.ts` does not exist.

- [ ] **Step 3: Implement reference calculator**

Create `lib/modifiers/reference-calculator.ts`:

```ts
import { isValidNumber, parseToNumber } from "@/lib/number-utils"
import type { SheetData } from "@/lib/sheet-data"
import { readTargetValue } from "./target-accessors"
import type { ModifierEntry, ModifierTargetId, TargetModifierState } from "./types"

export interface ReferenceSummary {
  target: ModifierTargetId
  entries: ModifierEntry[]
  bases: ModifierEntry[]
  modifiers: ModifierEntry[]
  enabledModifiers: ModifierEntry[]
  disabledEntries: ModifierEntry[]
  activeBase?: ModifierEntry
  activeBaseChanged: boolean
  unknownBase: boolean
  referenceTotal?: number
  unattributedDelta?: number
}

export interface CalculateReferenceSummaryInput {
  sheetData: SheetData
  target: ModifierTargetId
  entries: ModifierEntry[]
  targetState?: TargetModifierState
}

function sortEntries(a: ModifierEntry, b: ModifierEntry): number {
  if (a.priority !== b.priority) return a.priority - b.priority
  return a.id.localeCompare(b.id)
}

function parseFinalValue(sheetData: SheetData, target: ModifierTargetId): number | undefined {
  const value = readTargetValue(sheetData, target)
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && isValidNumber(value)) return parseToNumber(value, 0)
  return undefined
}

export function calculateReferenceSummary(input: CalculateReferenceSummaryInput): ReferenceSummary {
  const targetEntries = input.entries
    .filter(entry => entry.target === input.target)
    .sort(sortEntries)
  const disabledIds = new Set(input.targetState?.disabledEntryIds ?? [])
  const disabledEntries = targetEntries.filter(entry => disabledIds.has(entry.id))
  const enabledEntries = targetEntries.filter(entry => !disabledIds.has(entry.id))
  const bases = enabledEntries.filter(entry => entry.kind === "base")
  const modifiers = targetEntries.filter(entry => entry.kind === "modifier")
  const enabledModifiers = enabledEntries.filter(entry => entry.kind === "modifier")

  const savedBaseId = input.targetState?.activeBaseId
  const savedBase = savedBaseId ? bases.find(entry => entry.id === savedBaseId) : undefined
  const activeBase = savedBase ?? bases[0]
  const activeBaseChanged = Boolean(savedBaseId && !savedBase && activeBase)

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

  const referenceTotal = activeBase.value + enabledModifiers.reduce((sum, entry) => sum + entry.value, 0)
  const finalValue = parseFinalValue(input.sheetData, input.target)

  return {
    target: input.target,
    entries: targetEntries,
    bases,
    modifiers,
    enabledModifiers,
    disabledEntries,
    activeBase,
    activeBaseChanged,
    unknownBase: false,
    referenceTotal,
    unattributedDelta: finalValue === undefined ? undefined : finalValue - referenceTotal,
  }
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/reference-calculator.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/modifiers/reference-calculator.ts tests/unit/modifiers/reference-calculator.test.ts
git commit -m "feat(modifiers): calculate reference summaries"
```

---

## Task 4: Add Source Definitions and Registry

**Files:**
- Create: `lib/modifiers/source-definitions.ts`
- Create: `lib/modifiers/registry.ts`
- Test: `tests/unit/modifiers/source-definitions.test.ts`

- [ ] **Step 1: Write failing source/registry tests**

Create `tests/unit/modifiers/source-definitions.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { collectModifierEntries, getReferenceSummary } from "@/lib/modifiers/registry"

describe("modifier source definitions", () => {
  it("derives profession base entries from selected profession card", () => {
    const sheetData = {
      ...defaultSheetData,
      cards: [
        {
          ...defaultSheetData.cards[0],
          id: "profession-warrior",
          type: "profession",
          name: "战士",
          professionSpecial: {
            起始闪避: 12,
            起始生命: 7,
          },
        } as any,
        ...defaultSheetData.cards.slice(1),
      ],
    }

    const entries = collectModifierEntries(sheetData, "evasion")

    expect(entries).toContainEqual(expect.objectContaining({
      id: "profession:profession-warrior:evasion",
      target: "evasion",
      kind: "base",
      label: "战士：起始闪避",
      value: 12,
      sourceType: "profession",
    }))
  })

  it("derives armor base and threshold entries from current armor fields", () => {
    const sheetData = {
      ...defaultSheetData,
      armorName: "锁子甲",
      armorBaseScore: "4",
      armorThreshold: "9/20",
    }

    const entries = collectModifierEntries(sheetData)

    expect(entries).toContainEqual(expect.objectContaining({
      id: "armor:current:armorValue",
      target: "armorValue",
      kind: "base",
      label: "锁子甲：基础护甲值",
      value: 4,
      sourceType: "armor",
    }))
    expect(entries).toContainEqual(expect.objectContaining({
      id: "armor:current:minorThreshold",
      target: "minorThreshold",
      kind: "base",
      label: "锁子甲：基础轻伤阈值",
      value: 9,
      sourceType: "armor",
    }))
  })

  it("derives selected upgrade modifier entries from automation selections", () => {
    const sheetData = {
      ...defaultSheetData,
      automationSelections: {
        "upgrade:tier1-5-0": {
          selected: true,
          params: { target: "evasion" },
        },
        "upgrade:tier1-0-0": {
          selected: true,
          params: { attributes: ["agility", "strength"] },
        },
      },
    }

    const entries = collectModifierEntries(sheetData)

    expect(entries).toContainEqual(expect.objectContaining({
      id: "upgrade:tier1-5-0:evasion",
      target: "evasion",
      kind: "modifier",
      value: 1,
      label: "升级：闪避 +1",
    }))
    expect(entries).toContainEqual(expect.objectContaining({
      id: "upgrade:tier1-0-0:agility.value",
      target: "agility.value",
      kind: "modifier",
      value: 1,
      label: "升级：敏捷 +1",
    }))
  })

  it("combines user entries with system entries in reference summary", () => {
    const sheetData = {
      ...defaultSheetData,
      evasion: "15",
      modifierState: {
        byTarget: {
          evasion: {
            activeBaseId: "user:evasion-base",
            userEntries: [{
              id: "user:evasion-base",
              sourceId: "user:evasion-base",
              target: "evasion",
              kind: "base",
              label: "手动基础闪避",
              value: 14,
              sourceType: "user",
              priority: 10,
            }],
          },
        },
      },
      automationSelections: {
        "upgrade:tier1-5-0": {
          selected: true,
          params: { target: "evasion" },
        },
      },
    }

    const summary = getReferenceSummary(sheetData, "evasion")

    expect(summary.activeBase?.id).toBe("user:evasion-base")
    expect(summary.referenceTotal).toBe(15)
    expect(summary.unattributedDelta).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/source-definitions.test.ts
```

Expected: FAIL because source definitions and registry do not exist.

- [ ] **Step 3: Implement source definitions**

Create `lib/modifiers/source-definitions.ts`:

```ts
import type { SheetData } from "@/lib/sheet-data"
import { isValidNumber, parseToNumber } from "@/lib/number-utils"
import type { AutomationSelection, ModifierEntry, ModifierTargetId } from "./types"

const ATTRIBUTE_LABELS: Record<string, string> = {
  agility: "敏捷",
  strength: "力量",
  finesse: "灵巧",
  instinct: "本能",
  presence: "风度",
  knowledge: "知识",
}

function numericString(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && isValidNumber(value)) return parseToNumber(value, 0)
  return undefined
}

function selectedUpgradeEntries(sourceId: string, selection: AutomationSelection): ModifierEntry[] {
  if (!selection.selected) return []
  const params = selection.params ?? {}

  if (params.target === "evasion") {
    return [{
      id: `${sourceId}:evasion`,
      sourceId,
      target: "evasion",
      kind: "modifier",
      label: "升级：闪避 +1",
      value: 1,
      sourceType: "upgrade",
      priority: 200,
    }]
  }

  if (params.target === "hpMax" || params.target === "stressMax" || params.target === "proficiency") {
    const labelMap = {
      hpMax: "升级：生命上限 +1",
      stressMax: "升级：压力上限 +1",
      proficiency: "升级：熟练值 +1",
    } as const
    return [{
      id: `${sourceId}:${params.target}`,
      sourceId,
      target: params.target,
      kind: "modifier",
      label: labelMap[params.target],
      value: 1,
      sourceType: "upgrade",
      priority: 200,
    }]
  }

  if (Array.isArray(params.attributes)) {
    return params.attributes.flatMap((attribute) => {
      if (typeof attribute !== "string" || !(attribute in ATTRIBUTE_LABELS)) return []
      const target = `${attribute}.value` as ModifierTargetId
      return [{
        id: `${sourceId}:${target}`,
        sourceId,
        target,
        kind: "modifier",
        label: `升级：${ATTRIBUTE_LABELS[attribute]} +1`,
        value: 1,
        sourceType: "upgrade",
        priority: 200,
      }]
    })
  }

  if (Array.isArray(params.experienceIndexes)) {
    return params.experienceIndexes.flatMap((index) => {
      if (typeof index !== "number") return []
      const target = `experienceValues.${index}` as ModifierTargetId
      return [{
        id: `${sourceId}:${target}`,
        sourceId,
        target,
        kind: "modifier",
        label: `升级：经历 ${index + 1} +1`,
        value: 1,
        sourceType: "upgrade",
        priority: 200,
      }]
    })
  }

  return []
}

export function collectSystemModifierEntries(sheetData: SheetData): ModifierEntry[] {
  const entries: ModifierEntry[] = []
  const professionCard = sheetData.cards?.[0]
  const professionId = professionCard?.id || sheetData.professionRef?.id || sheetData.profession || "current"
  const professionName = professionCard?.name || sheetData.professionRef?.name || sheetData.profession || "职业"
  const evasion = professionCard?.professionSpecial?.["起始闪避"]
  const hp = professionCard?.professionSpecial?.["起始生命"]

  if (typeof evasion === "number") {
    entries.push({
      id: `profession:${professionId}:evasion`,
      sourceId: `profession:${professionId}`,
      target: "evasion",
      kind: "base",
      label: `${professionName}：起始闪避`,
      value: evasion,
      sourceType: "profession",
      priority: 100,
    })
  }

  if (typeof hp === "number") {
    entries.push({
      id: `profession:${professionId}:hpMax`,
      sourceId: `profession:${professionId}`,
      target: "hpMax",
      kind: "base",
      label: `${professionName}：起始生命上限`,
      value: hp,
      sourceType: "profession",
      priority: 100,
    })
  }

  const armorLabel = sheetData.armorName || "当前护甲"
  const armorValue = numericString(sheetData.armorBaseScore)
  if (armorValue !== undefined) {
    entries.push({
      id: "armor:current:armorValue",
      sourceId: "armor:current",
      target: "armorValue",
      kind: "base",
      label: `${armorLabel}：基础护甲值`,
      value: armorValue,
      sourceType: "armor",
      priority: 100,
    })
  }

  const [minorRaw, majorRaw] = String(sheetData.armorThreshold || "").split("/")
  const minor = numericString(minorRaw)
  const major = numericString(majorRaw)
  if (minor !== undefined) {
    entries.push({
      id: "armor:current:minorThreshold",
      sourceId: "armor:current",
      target: "minorThreshold",
      kind: "base",
      label: `${armorLabel}：基础轻伤阈值`,
      value: minor,
      sourceType: "armor",
      priority: 100,
    })
  }
  if (major !== undefined) {
    entries.push({
      id: "armor:current:majorThreshold",
      sourceId: "armor:current",
      target: "majorThreshold",
      kind: "base",
      label: `${armorLabel}：基础重伤阈值`,
      value: major,
      sourceType: "armor",
      priority: 100,
    })
  }

  Object.entries(sheetData.automationSelections ?? {}).forEach(([sourceId, selection]) => {
    entries.push(...selectedUpgradeEntries(sourceId, selection))
  })

  return entries
}
```

- [ ] **Step 4: Implement registry**

Create `lib/modifiers/registry.ts`:

```ts
import type { SheetData } from "@/lib/sheet-data"
import { calculateReferenceSummary } from "./reference-calculator"
import { collectSystemModifierEntries } from "./source-definitions"
import type { ModifierEntry, ModifierTargetId } from "./types"

export function collectModifierEntries(sheetData: SheetData, target?: ModifierTargetId): ModifierEntry[] {
  const systemEntries = collectSystemModifierEntries(sheetData)
  const userEntries = Object.values(sheetData.modifierState?.byTarget ?? {})
    .flatMap(state => state?.userEntries ?? [])
  const entries = [...systemEntries, ...userEntries]

  return target ? entries.filter(entry => entry.target === target) : entries
}

export function getReferenceSummary(sheetData: SheetData, target: ModifierTargetId) {
  return calculateReferenceSummary({
    sheetData,
    target,
    entries: collectModifierEntries(sheetData, target),
    targetState: sheetData.modifierState?.byTarget?.[target],
  })
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/source-definitions.test.ts tests/unit/modifiers/reference-calculator.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/modifiers/source-definitions.ts lib/modifiers/registry.ts tests/unit/modifiers/source-definitions.test.ts
git commit -m "feat(modifiers): add source registry"
```

---

## Task 5: Add Store Actions for Modifier State and Automation Selections

**Files:**
- Modify: `lib/sheet-store.ts`
- Test: `tests/unit/modifiers/store-actions.test.ts`

- [ ] **Step 1: Write failing store action tests**

Create `tests/unit/modifiers/store-actions.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { resetSheetStore, sheet, store } from "../automation/test-helpers"

describe("modifier store actions", () => {
  it("sets active base for a target", () => {
    resetSheetStore()

    store().setActiveModifierBase("evasion", "user:evasion-base")

    expect(sheet().modifierState?.byTarget.evasion?.activeBaseId).toBe("user:evasion-base")
  })

  it("toggles disabled modifier entry ids", () => {
    resetSheetStore()

    store().setModifierEntryDisabled("evasion", "upgrade:evasion", true)
    expect(sheet().modifierState?.byTarget.evasion?.disabledEntryIds).toEqual(["upgrade:evasion"])

    store().setModifierEntryDisabled("evasion", "upgrade:evasion", false)
    expect(sheet().modifierState?.byTarget.evasion?.disabledEntryIds).toEqual([])
  })

  it("adds user modifier entries", () => {
    resetSheetStore()

    store().upsertUserModifierEntry({
      id: "user:evasion-mod",
      sourceId: "user:evasion-mod",
      target: "evasion",
      kind: "modifier",
      label: "临时加值",
      value: 2,
      sourceType: "user",
      priority: 10,
    })

    expect(sheet().modifierState?.byTarget.evasion?.userEntries).toEqual([
      expect.objectContaining({ id: "user:evasion-mod", value: 2 }),
    ])
  })

  it("records and clears automation selections", () => {
    resetSheetStore()

    store().setAutomationSelection("upgrade:tier1-5-0", true, { target: "evasion" })
    expect(sheet().automationSelections?.["upgrade:tier1-5-0"]).toEqual({
      selected: true,
      params: { target: "evasion" },
    })

    store().setAutomationSelection("upgrade:tier1-5-0", false)
    expect(sheet().automationSelections?.["upgrade:tier1-5-0"]).toEqual({
      selected: false,
    })
  })
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/store-actions.test.ts
```

Expected: FAIL because the store actions do not exist.

- [ ] **Step 3: Extend `SheetState` interface**

In `lib/sheet-store.ts`, add imports:

```ts
import type {
    AutomationSourceId,
    ModifierEntryId,
    ModifierTargetId,
    UserModifierEntry,
} from "@/lib/modifiers/types";
```

Add methods to `SheetState` near other action declarations:

```ts
    setActiveModifierBase: (target: ModifierTargetId, baseId: ModifierEntryId | undefined) => void;
    setModifierEntryDisabled: (target: ModifierTargetId, entryId: ModifierEntryId, disabled: boolean) => void;
    upsertUserModifierEntry: (entry: UserModifierEntry) => void;
    removeUserModifierEntry: (target: ModifierTargetId, entryId: ModifierEntryId) => void;
    setAutomationSelection: (sourceId: AutomationSourceId, selected: boolean, params?: Record<string, unknown>) => void;
```

- [ ] **Step 4: Implement store actions**

Add helper functions above `export const useSheetStore`:

```ts
const ensureModifierState = (sheetData: SheetData) => ({
    byTarget: {
        ...(sheetData.modifierState?.byTarget ?? {}),
    },
});
```

Add these action implementations inside the store object before rollback actions:

```ts
    setActiveModifierBase: (target, baseId) => set((state) => {
        const modifierState = ensureModifierState(state.sheetData);
        const targetState = modifierState.byTarget[target] ?? {};

        return {
            sheetData: {
                ...state.sheetData,
                modifierState: {
                    byTarget: {
                        ...modifierState.byTarget,
                        [target]: {
                            ...targetState,
                            activeBaseId: baseId,
                        },
                    },
                },
            },
        };
    }),

    setModifierEntryDisabled: (target, entryId, disabled) => set((state) => {
        const modifierState = ensureModifierState(state.sheetData);
        const targetState = modifierState.byTarget[target] ?? {};
        const current = new Set(targetState.disabledEntryIds ?? []);
        if (disabled) {
            current.add(entryId);
        } else {
            current.delete(entryId);
        }

        return {
            sheetData: {
                ...state.sheetData,
                modifierState: {
                    byTarget: {
                        ...modifierState.byTarget,
                        [target]: {
                            ...targetState,
                            disabledEntryIds: Array.from(current),
                        },
                    },
                },
            },
        };
    }),

    upsertUserModifierEntry: (entry) => set((state) => {
        const modifierState = ensureModifierState(state.sheetData);
        const targetState = modifierState.byTarget[entry.target] ?? {};
        const entries = targetState.userEntries ?? [];
        const nextEntries = entries.some(existing => existing.id === entry.id)
            ? entries.map(existing => existing.id === entry.id ? entry : existing)
            : [...entries, entry];

        return {
            sheetData: {
                ...state.sheetData,
                modifierState: {
                    byTarget: {
                        ...modifierState.byTarget,
                        [entry.target]: {
                            ...targetState,
                            userEntries: nextEntries,
                        },
                    },
                },
            },
        };
    }),

    removeUserModifierEntry: (target, entryId) => set((state) => {
        const modifierState = ensureModifierState(state.sheetData);
        const targetState = modifierState.byTarget[target] ?? {};

        return {
            sheetData: {
                ...state.sheetData,
                modifierState: {
                    byTarget: {
                        ...modifierState.byTarget,
                        [target]: {
                            ...targetState,
                            userEntries: (targetState.userEntries ?? []).filter(entry => entry.id !== entryId),
                        },
                    },
                },
            },
        };
    }),

    setAutomationSelection: (sourceId, selected, params) => set((state) => ({
        sheetData: {
            ...state.sheetData,
            automationSelections: {
                ...(state.sheetData.automationSelections ?? {}),
                [sourceId]: params === undefined ? { selected } : { selected, params },
            },
        },
    })),
```

- [ ] **Step 5: Run tests**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/store-actions.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run automation baseline**

Run:

```bash
pnpm exec vitest run tests/unit/automation
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/sheet-store.ts tests/unit/modifiers/store-actions.test.ts
git commit -m "feat(modifiers): add modifier store actions"
```

---

## Task 6: Migrate Simple Upgrade Automation to Effects

**Files:**
- Modify: `lib/automation/upgrade-actions.ts`
- Modify: `components/character-sheet-page-two.tsx`
- Test: `tests/unit/automation/upgrade-automation.test.ts`

- [ ] **Step 1: Update tests for selection side effects and add semantics**

Modify `tests/unit/automation/upgrade-automation.test.ts` to add these cases after the existing hp/stress/proficiency tests:

```ts
  it("生命槽升级返回 automation selection 信息", () => {
    expect(run("永久增加一个生命槽。", { hpMax: 6 })).toMatchObject({
      kind: "setSheetData",
      updates: { hpMax: 7 },
      selection: {
        selected: true,
        params: { target: "hpMax" },
      },
    })
  })

  it("取消生命槽升级返回未选中 selection 信息", () => {
    expect(run("永久增加一个生命槽。", { hpMax: 7 }, true)).toMatchObject({
      kind: "setSheetData",
      updates: { hpMax: 6 },
      selection: {
        selected: false,
        params: { target: "hpMax" },
      },
    })
  })
```

Update `UpgradeAutomationResult` expectations to tolerate `warnings: []`:

```ts
expect(run("永久增加一个压力槽。", { stressMax: 6 })).toMatchObject({
  kind: "setSheetData",
  updates: { stressMax: 7 },
  warnings: [],
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/automation/upgrade-automation.test.ts
```

Expected: FAIL because `selection` and `warnings` are not returned yet.

- [ ] **Step 3: Update `UpgradeAutomationResult`**

In `lib/automation/upgrade-actions.ts`, import executor and selection type:

```ts
import { applyEffects, revertEffects } from "@/lib/modifiers/effect-executor"
import type { AutomationSelection, ModifierTargetId } from "@/lib/modifiers/types"
```

Replace the result type with:

```ts
export type UpgradeAutomationResult =
  | { kind: "none" }
  | {
      kind: "setSheetData"
      updates: Partial<SheetData>
      message?: string
      warnings?: string[]
      selection?: AutomationSelection
    }
  | { kind: "rollback"; rollbackKind: UpgradeRollbackKind }
```

Add helper:

```ts
function addTargetResult(
  sheetData: SheetData,
  currentlyChecked: boolean,
  target: ModifierTargetId,
  messageLabel: string,
  min?: number,
  max?: number,
): UpgradeAutomationResult {
  const newCheckedState = !currentlyChecked
  const effect = { operation: "add" as const, target, value: 1 }
  const result = newCheckedState
    ? applyEffects(sheetData, [effect])
    : revertEffects(sheetData, [effect])

  let updates = result.updates
  const nextValue = target === "hpMax"
    ? result.sheetData.hpMax
    : target === "stressMax"
      ? result.sheetData.stressMax
      : undefined

  if ((target === "hpMax" || target === "stressMax") && typeof nextValue === "number") {
    const clamped = Math.min(max ?? 18, Math.max(min ?? 1, nextValue))
    updates = { ...updates, [target]: clamped }
  }

  return {
    kind: "setSheetData",
    updates,
    warnings: result.warnings,
    selection: {
      selected: newCheckedState,
      params: { target },
    },
    message: newCheckedState
      ? `${messageLabel} +1`
      : `${messageLabel} -1`,
  }
}
```

Replace hp/stress branches with:

```ts
  if (label.includes("生命槽")) {
    return addTargetResult(sheetData, currentlyChecked, "hpMax", "生命槽上限", 1, 18)
  }

  if (label.includes("压力槽")) {
    return addTargetResult(sheetData, currentlyChecked, "stressMax", "压力槽上限", 1, 18)
  }
```

For proficiency, keep the existing boolean-array implementation and add `selection` plus `warnings` to both checked and unchecked return objects:

```ts
      return {
        kind: "setSheetData",
        updates: { proficiency: newProficiency },
        warnings: [],
        selection: {
          selected: newCheckedState,
          params: { target: "proficiency" },
        },
        message: `熟练度 +1，当前为 ${currentCount + 1}/6`,
      }
```

- [ ] **Step 4: Persist automation selection in page-two handler**

In `components/character-sheet-page-two.tsx`, after `setFormData(result.updates)`, add:

```ts
        if (result.selection) {
          const sourceId = `upgrade:${checkKeyOrTier}`
          const setAutomationSelection = useSheetStore.getState().setAutomationSelection
          setAutomationSelection(sourceId, result.selection.selected, result.selection.params)
        }
```

For warnings, add before success notification:

```ts
        result.warnings?.forEach(warning => {
          showFadeNotification({
            message: warning,
            type: "info",
            position: "middle"
          })
        })
```

- [ ] **Step 5: Run tests**

Run:

```bash
pnpm exec vitest run tests/unit/automation/upgrade-automation.test.ts tests/unit/modifiers/effect-executor.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run automation baseline**

Run:

```bash
pnpm exec vitest run tests/unit/automation
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/automation/upgrade-actions.ts components/character-sheet-page-two.tsx tests/unit/automation/upgrade-automation.test.ts
git commit -m "feat(automation): persist simple upgrade selections"
```

---

## Task 7: Replace Snapshot Upgrade Undo for Attribute, Evasion, and Experience

**Files:**
- Modify: `components/upgrade-popover/attribute-upgrade-editor.tsx`
- Modify: `components/upgrade-popover/evasion-editor.tsx`
- Modify: `components/upgrade-popover/experience-values-editor.tsx`
- Modify: `lib/automation/upgrade-actions.ts`
- Modify: `components/character-sheet-page-two.tsx`
- Test: `tests/unit/automation/component-smoke.test.tsx`
- Test: `tests/unit/automation/rollback-snapshots.test.ts`

- [ ] **Step 1: Add tests for new selection params**

In `tests/unit/automation/component-smoke.test.tsx`, update the evasion test to assert automation selection after confirmation:

```ts
expect(sheet().automationSelections?.["upgrade:tier1-5-0"]).toEqual({
  selected: true,
  params: { target: "evasion" },
})
```

Add a new direct store-level test to `tests/unit/automation/rollback-snapshots.test.ts`:

```ts
it("新升级选择模型取消闪避升级时按当前最终值执行 -1", () => {
  resetSheetStore({
    evasion: "20",
    automationSelections: {
      "upgrade:tier1-5-0": {
        selected: true,
        params: { target: "evasion" },
      },
    },
  })

  const result = computeUpgradeAutomation({
    sheetData: sheet(),
    option: { label: "获得闪避值+1。" },
    currentlyChecked: true,
  })

  expect(result).toMatchObject({
    kind: "setSheetData",
    updates: { evasion: "19" },
    selection: {
      selected: false,
      params: { target: "evasion" },
    },
  })
})
```

Import `computeUpgradeAutomation` at the top:

```ts
import { computeUpgradeAutomation } from "@/lib/automation/upgrade-actions"
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/automation/component-smoke.test.tsx tests/unit/automation/rollback-snapshots.test.ts
```

Expected: FAIL because popup components still create snapshots and do not persist selection params.

- [ ] **Step 3: Update evasion editor**

In `components/upgrade-popover/evasion-editor.tsx`:

Remove:

```ts
  const createEvasionSnapshot = useSheetStore(state => state.createEvasionSnapshot)
```

Import executor:

```ts
import { applyEffects } from "@/lib/modifiers/effect-executor"
```

In `handleConfirm`, replace snapshot creation and `setSheetData({ evasion: finalValue })` with:

```ts
      setSheetData({ evasion: finalValue })
      const setAutomationSelection = useSheetStore.getState().setAutomationSelection
      setAutomationSelection(`upgrade:${checkKey}`, true, { target: "evasion" })
```

Keep the existing UI behavior that lets the user confirm the final value; do not force an extra `+1` on confirm. The recorded source explains the `+1`.

- [ ] **Step 4: Update attribute editor to persist selected attributes**

In `components/upgrade-popover/attribute-upgrade-editor.tsx`:

Remove usage of `saveAttributeUpgradeRecord`. Keep attribute value writes and checked flags for current UX.

After applying selected attributes, add:

```ts
    const selectedAttributes = Object.entries(selected)
      .filter(([, isSelected]) => isSelected)
      .map(([key]) => key)

    const setAutomationSelection = useSheetStore.getState().setAutomationSelection
    setAutomationSelection(`upgrade:${checkKey}`, true, {
      attributes: selectedAttributes,
    })
```

Do not delete the legacy snapshot store methods in this task; stop calling them first.

- [ ] **Step 5: Update experience editor to persist selected indexes**

In `components/upgrade-popover/experience-values-editor.tsx`:

Remove usage of `createExperienceValuesSnapshot`.

After applying selected experience value changes, add:

```ts
    const setAutomationSelection = useSheetStore.getState().setAutomationSelection
    setAutomationSelection(`upgrade:${checkKey}`, true, {
      experienceIndexes: Array.from(selected),
    })
```

- [ ] **Step 6: Update cancellation behavior for complex upgrades**

In `lib/automation/upgrade-actions.ts`, replace rollback returns for checked attribute/experience/evasion options:

```ts
  if (label.includes("角色属性+1") && currentlyChecked) {
    return {
      kind: "setSheetData",
      updates: {},
      warnings: [],
      selection: { selected: false },
    }
  }

  if (label.includes("经历获得额外") && currentlyChecked) {
    return {
      kind: "setSheetData",
      updates: {},
      warnings: [],
      selection: { selected: false },
    }
  }

  if (label.includes("闪避值") && currentlyChecked) {
    return addTargetResult(sheetData, currentlyChecked, "evasion", "闪避值")
  }
```

In `components/character-sheet-page-two.tsx`, import:

```ts
import { revertEffects } from "@/lib/modifiers/effect-executor"
import type { AutomationEffect, ModifierTargetId } from "@/lib/modifiers/types"
```

Add this helper inside the component before `handleUpgradeCheck`:

```ts
const createUpgradeRevertEffects = (sourceId: string): AutomationEffect[] => {
  const params = safeFormData.automationSelections?.[sourceId]?.params ?? {}
  const effects: AutomationEffect[] = []

  if (Array.isArray(params.attributes)) {
    params.attributes.forEach(attribute => {
      if (typeof attribute !== "string") return
      const target = `${attribute}.value` as ModifierTargetId
      effects.push({ operation: "add", target, value: 1 })
    })
  }

  if (Array.isArray(params.experienceIndexes)) {
    params.experienceIndexes.forEach(index => {
      if (typeof index !== "number") return
      effects.push({
        operation: "add",
        target: `experienceValues.${index}` as ModifierTargetId,
        value: 1,
      })
    })
  }

  return effects
}
```

In the branch that handles `result.selection?.selected === false && !result.selection.params`, replace direct snapshot rollback with:

```ts
const sourceId = `upgrade:${checkKeyOrTier}`
const effects = createUpgradeRevertEffects(sourceId)

if (effects.length > 0) {
  const reverted = revertEffects(safeFormData, effects)
  const updates = { ...reverted.updates }
  const params = safeFormData.automationSelections?.[sourceId]?.params ?? {}

  if (Array.isArray(params.attributes)) {
    params.attributes.forEach(attribute => {
      if (typeof attribute !== "string") return
      const current = safeFormData[attribute as keyof typeof safeFormData]
      if (current && typeof current === "object" && "checked" in current) {
        ;(updates as Record<string, unknown>)[attribute] = {
          ...current,
          checked: false,
        }
      }
    })
  }

  setFormData(updates)
  reverted.warnings.forEach(warning => {
    showFadeNotification({
      message: warning,
      type: "info",
      position: "middle",
    })
  })
}

const setAutomationSelection = useSheetStore.getState().setAutomationSelection
setAutomationSelection(sourceId, false)
```

- [ ] **Step 7: Update snapshot tests**

Keep `tests/unit/automation/rollback-snapshots.test.ts` for legacy store methods if they still exist, but add `describe.skip` only if those methods are removed. Prefer keeping the old methods unused for one release so old runtime state cannot break imports.

Update expectations for new flow in the added tests.

- [ ] **Step 8: Run tests**

Run:

```bash
pnpm exec vitest run tests/unit/automation tests/unit/modifiers
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add components/upgrade-popover/attribute-upgrade-editor.tsx components/upgrade-popover/evasion-editor.tsx components/upgrade-popover/experience-values-editor.tsx lib/automation/upgrade-actions.ts components/character-sheet-page-two.tsx tests/unit/automation/component-smoke.test.tsx tests/unit/automation/rollback-snapshots.test.ts
git commit -m "feat(automation): record complex upgrade selections"
```

---

## Task 8: Add Compact Modifier Popover UI

**Files:**
- Create: `components/modifiers/modifier-popover.tsx`
- Create: `components/modifiers/modifier-field-anchor.tsx`
- Test: `tests/unit/modifiers/modifier-popover.test.tsx`

- [ ] **Step 1: Write failing UI tests**

Create `tests/unit/modifiers/modifier-popover.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { ModifierFieldAnchor } from "@/components/modifiers/modifier-field-anchor"
import { resetSheetStore } from "../automation/test-helpers"

describe("ModifierFieldAnchor", () => {
  it("shows base, modifier, and unattributed delta", async () => {
    resetSheetStore({
      evasion: "15",
      modifierState: {
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
            }, {
              id: "user:evasion-mod",
              sourceId: "user:evasion-mod",
              target: "evasion",
              kind: "modifier",
              label: "临时加值",
              value: 1,
              sourceType: "user",
              priority: 10,
            }],
          },
        },
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)

    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

    expect(screen.getByText("手动基础闪避")).toBeInTheDocument()
    expect(screen.getByText("临时加值")).toBeInTheDocument()
    expect(screen.getByText("未归因差额 +2")).toBeInTheDocument()
  })

  it("shows unknown base when no base exists", async () => {
    resetSheetStore({ evasion: "13" })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)

    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

    expect(screen.getByText("未知基础值")).toBeInTheDocument()
    expect(screen.queryByText(/未归因差额/)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/modifier-popover.test.tsx
```

Expected: FAIL because UI components do not exist.

- [ ] **Step 3: Implement popover content**

Create `components/modifiers/modifier-popover.tsx`:

```tsx
"use client"

import { getReferenceSummary } from "@/lib/modifiers/registry"
import type { ModifierTargetId } from "@/lib/modifiers/types"
import type { SheetData } from "@/lib/sheet-data"

interface ModifierPopoverProps {
  sheetData: SheetData
  target: ModifierTargetId
  label: string
}

function formatSigned(value: number): string {
  return value >= 0 ? `+${value}` : String(value)
}

export function ModifierPopover({ sheetData, target, label }: ModifierPopoverProps) {
  const summary = getReferenceSummary(sheetData, target)

  return (
    <div className="w-64 rounded border border-gray-300 bg-white p-3 text-xs shadow-lg">
      <div className="mb-2 font-semibold text-gray-900">{label}来源</div>

      <div className="mb-2">
        <div className="mb-1 text-[11px] font-medium text-gray-500">基础值</div>
        {summary.activeBase ? (
          <div className="flex justify-between gap-2 rounded bg-gray-50 px-2 py-1">
            <span className="truncate">{summary.activeBase.label}</span>
            <span className="font-semibold">{summary.activeBase.value}</span>
          </div>
        ) : (
          <div className="rounded bg-gray-50 px-2 py-1 text-gray-500">未知基础值</div>
        )}
      </div>

      <div className="mb-2">
        <div className="mb-1 text-[11px] font-medium text-gray-500">加值</div>
        {summary.modifiers.length > 0 ? (
          <div className="space-y-1">
            {summary.modifiers.map(entry => (
              <div key={entry.id} className="flex justify-between gap-2 rounded bg-gray-50 px-2 py-1">
                <span className="truncate">{entry.label}</span>
                <span className="font-semibold">{formatSigned(entry.value)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded bg-gray-50 px-2 py-1 text-gray-500">无加值</div>
        )}
      </div>

      {summary.referenceTotal !== undefined && (
        <div className="flex justify-between border-t border-gray-200 pt-2">
          <span className="text-gray-500">参考合计</span>
          <span className="font-semibold">{summary.referenceTotal}</span>
        </div>
      )}

      {summary.unattributedDelta !== undefined && summary.unattributedDelta !== 0 && (
        <div className="mt-1 rounded bg-amber-50 px-2 py-1 text-amber-800">
          未归因差额 {formatSigned(summary.unattributedDelta)}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Implement anchor button**

Create `components/modifiers/modifier-field-anchor.tsx`:

```tsx
"use client"

import { useState } from "react"
import { CircleHelp } from "lucide-react"
import { useSheetStore } from "@/lib/sheet-store"
import type { ModifierTargetId } from "@/lib/modifiers/types"
import { ModifierPopover } from "./modifier-popover"

interface ModifierFieldAnchorProps {
  target: ModifierTargetId
  label: string
}

export function ModifierFieldAnchor({ target, label }: ModifierFieldAnchorProps) {
  const [open, setOpen] = useState(false)
  const sheetData = useSheetStore(state => state.sheetData)

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={`查看${label}来源`}
        className="inline-flex h-5 w-5 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        onClick={() => setOpen(value => !value)}
      >
        <CircleHelp className="h-3.5 w-3.5" />
      </button>

      {open && (
        <span className="absolute right-0 top-6 z-50">
          <ModifierPopover sheetData={sheetData} target={target} label={label} />
        </span>
      )}
    </span>
  )
}
```

- [ ] **Step 5: Run UI tests**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/modifier-popover.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/modifiers/modifier-popover.tsx components/modifiers/modifier-field-anchor.tsx tests/unit/modifiers/modifier-popover.test.tsx
git commit -m "feat(modifiers): add compact source popover"
```

---

## Task 9: Attach Modifier Popovers to First-Phase Fields

**Files:**
- Modify: `components/character-sheet.tsx`
- Modify: `components/character-sheet-sections/attributes-section.tsx`
- Modify: `components/character-sheet-sections/hit-points-section.tsx`
- Modify: `components/character-sheet-sections/experience-section.tsx`
- Test: `tests/unit/modifiers/modifier-popover.test.tsx`

- [ ] **Step 1: Add smoke tests for anchors in real sections**

Extend `tests/unit/modifiers/modifier-popover.test.tsx` with a minimal section smoke test:

```tsx
import { AttributesSection } from "@/components/character-sheet-sections/attributes-section"

it("renders modifier anchors for attributes section", () => {
  resetSheetStore()

  render(<AttributesSection />)

  expect(screen.getByRole("button", { name: "查看敏捷来源" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "查看力量来源" })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/modifier-popover.test.tsx
```

Expected: FAIL because existing sections do not render anchors yet.

- [ ] **Step 3: Attach anchors to attribute section**

In `components/character-sheet-sections/attributes-section.tsx`, import:

```ts
import { ModifierFieldAnchor } from "@/components/modifiers/modifier-field-anchor"
import type { ModifierTargetId } from "@/lib/modifiers/types"
```

Near each attribute label, render:

```tsx
<ModifierFieldAnchor target={`${attr.key}.value` as ModifierTargetId} label={attr.name} />
```

Use the existing attribute map in the component. Keep the input behavior unchanged.

- [ ] **Step 4: Attach anchors to HP/stress and experience sections**

In `components/character-sheet-sections/hit-points-section.tsx`, import `ModifierFieldAnchor` and place:

```tsx
<ModifierFieldAnchor target="hpMax" label="生命上限" />
<ModifierFieldAnchor target="stressMax" label="压力上限" />
```

In `components/character-sheet-sections/experience-section.tsx`, import both `ModifierFieldAnchor` and `ModifierTargetId`:

```ts
import { ModifierFieldAnchor } from "@/components/modifiers/modifier-field-anchor"
import type { ModifierTargetId } from "@/lib/modifiers/types"
```

Render one anchor next to each experience value:

```tsx
<ModifierFieldAnchor target={`experienceValues.${i}` as ModifierTargetId} label={`经历 ${i + 1}`} />
```

- [ ] **Step 5: Attach anchors to page-one direct fields**

In `components/character-sheet.tsx`, import:

```ts
import { ModifierFieldAnchor } from "@/components/modifiers/modifier-field-anchor";
```

Render anchors next to:

```tsx
<ModifierFieldAnchor target="evasion" label="闪避" />
<ModifierFieldAnchor target="armorValue" label="护甲值" />
<ModifierFieldAnchor target="minorThreshold" label="轻伤阈值" />
<ModifierFieldAnchor target="majorThreshold" label="重伤阈值" />
```

Do not alter input `value`, `onChange`, or store update handlers.

- [ ] **Step 6: Run UI and automation tests**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers tests/unit/automation
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/character-sheet.tsx components/character-sheet-sections/attributes-section.tsx components/character-sheet-sections/hit-points-section.tsx components/character-sheet-sections/experience-section.tsx tests/unit/modifiers/modifier-popover.test.tsx
git commit -m "feat(modifiers): attach source popovers to sheet fields"
```

---

## Task 10: Final Regression and Cleanup

**Files:**
- Modify: only the modifier, automation, component, or test files already touched by Tasks 1-9.

- [ ] **Step 1: Run modifier and automation tests**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers tests/unit/automation
```

Expected: PASS.

- [ ] **Step 2: Run full Vitest suite**

Run:

```bash
pnpm test:run
```

Expected: PASS.

- [ ] **Step 3: Inspect git diff**

Run:

```bash
git status --short
git diff --stat
```

Expected: only intended modifier/automation files are changed.

- [ ] **Step 4: Commit final fixes if any**

If Step 1 or Step 2 required fixes, stage the feature paths explicitly:

```bash
git add lib/modifiers lib/sheet-data.ts lib/default-sheet-data.ts lib/sheet-data-migration.ts lib/sheet-store.ts lib/automation/upgrade-actions.ts components/modifiers components/character-sheet.tsx components/character-sheet-sections components/character-sheet-page-two.tsx components/upgrade-popover tests/unit/modifiers tests/unit/automation
git commit -m "test(modifiers): stabilize modifier automation system"
```

If no fixes were needed, do not create an empty commit.

- [ ] **Step 5: Record residual risks in final response**

Mention these explicitly:

- `tsc --noEmit` is not the chosen gate because unrelated pre-existing type errors were already present.
- The old snapshot store methods have been removed; upgrade undo now relies on persisted automation selections and add-effect reversal.
- The first-phase UI displays manual user entries but one-click creation of user base/modifier from unattributed delta is intentionally deferred.

---

## Self-Review

Spec coverage:

- Persisted data boundary: Task 1 and Task 5.
- `add` semantics and non-numeric skip behavior: Task 2 and Task 6/7.
- Source/effect registry: Task 4.
- Base fallback and unknown base behavior: Task 3.
- Conservative migration: Task 1.
- v1-style question-mark UI: Task 8 and Task 9.
- Profession/armor/upgrade first-phase sources: Task 4, Task 6, Task 7.
- Baseline regression protection: Task 6, Task 7, Task 10.

No placeholder tasks remain. Open UX refinements from the spec are intentionally not implemented in this plan: one-click attribution and complex future rule conditions.
