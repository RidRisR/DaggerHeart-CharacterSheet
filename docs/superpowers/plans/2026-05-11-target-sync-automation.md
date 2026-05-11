# Target Sync Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add target-level sync controls so every existing modifier target can sync its final value once or continuously from the current reference total.

**Architecture:** Add a pure `lib/modifiers/target-sync.ts` helper that computes desired synced values from registry summaries and writes them with a sync-source path. Store actions call this helper as post-processing after source/reference changes. The modifier popover exposes sync controls; current final-input auto-base UX remains out of scope and is not hard-coded as unconditional sync disabling.

**Tech Stack:** TypeScript, Zustand store, React popover UI, Vitest, Testing Library.

---

## File Map

- Create: `lib/modifiers/target-sync.ts`
  Owns sync target discovery, fallback values, equality checks, one-shot sync, and continuous sync post-processing.

- Modify: `lib/modifiers/types.ts`
  Adds `TargetSyncMode` and `TargetModifierState.syncMode`.

- Modify: `lib/modifiers/reconcile.ts`
  Preserves `syncMode` while still dropping orphan `activeBaseId`.

- Modify: `lib/modifiers/target-accessors.ts`
  Allows sync fallback for `armorMax` to write an empty string while keeping normal numeric writes intact.

- Modify: `lib/sheet-data.ts`
  Widens `armorMax` to `number | ""` so empty fallback can be represented.

- Modify: `lib/character-data-validator.ts`
  Preserves `armorMax: ""` in current schema validation / normalization.

- Modify: `lib/sheet-data-migration.ts`
  Preserves `syncMode` during current modifier state normalization.

- Modify: `lib/sheet-store.ts`
  Adds sync store actions and applies continuous sync after source/reference-changing actions.

- Modify: `components/modifiers/modifier-popover.tsx`
  Adds “同步一次” and “持续同步” controls.

- Test: `tests/unit/modifiers/target-sync.test.ts`
  Covers pure sync helper behavior and loop prevention.

- Modify: `tests/unit/modifiers/reconcile.test.ts`
  Covers preserving `syncMode` while removing orphan active base.

- Modify: `tests/unit/modifiers/store-actions.test.ts`
  Covers store actions for sync once, continuous mode, and source-change post-processing.

- Modify: `tests/unit/modifiers/modifier-popover.test.tsx`
  Covers sync buttons and UI behavior.

---

## Important Scope Notes

This implementation covers all currently anchored modifier targets:

```ts
evasion
armorMax
minorThreshold
majorThreshold
hpMax
stressMax
proficiency
agility.value
strength.value
finesse.value
instinct.value
presence.value
knowledge.value
experienceValues.${number}
```

This implementation does not generalize target auto base. It must not hard-code “any user final input closes sync” because no-base final input may later create a base and should not close sync. Final-input override wiring should be implemented only after the target auto-base interaction is designed.

This implementation intentionally does not wrap generic final-value writers such as `setSheetData()`, `replaceSheetData()`, `updateAttribute()`, `updateExperienceValues()`, `updateHPMax()`, `updateStressMax()`, or direct final input handlers with continuous sync. In this phase, sync runs only after known provider/reference source changes and explicit sync actions. That keeps manual final-value input available for the later auto-base / override classification work.

---

### Task 1: Add Sync State Types And Preserve Them In Reconcile

**Files:**
- Modify: `lib/modifiers/types.ts`
- Modify: `lib/modifiers/reconcile.ts`
- Test: `tests/unit/modifiers/reconcile.test.ts`

- [ ] **Step 1: Write failing reconcile tests**

Append to `tests/unit/modifiers/reconcile.test.ts`:

```ts
it("preserves continuous sync mode when active base is still valid", () => {
  const sheetData = {
    ...defaultSheetData,
    userModifierContributions: [{
      id: "user:evasion-base",
      definition: { target: "evasion", kind: "base" },
      editable: { label: "Base", value: 12 },
    }],
    modifierState: {
      targetStates: {
        evasion: {
          activeBaseId: "user:evasion-base",
          syncMode: "continuous",
        },
      },
      entryStates: {},
    },
  } as any

  const reconciled = reconcileModifierState(sheetData)

  expect(reconciled.modifierState?.targetStates.evasion).toEqual({
    activeBaseId: "user:evasion-base",
    syncMode: "continuous",
  })
})

it("keeps sync mode when active base becomes orphaned", () => {
  const sheetData = {
    ...defaultSheetData,
    modifierState: {
      targetStates: {
        evasion: {
          activeBaseId: "missing:base",
          syncMode: "continuous",
        },
      },
      entryStates: {},
    },
  } as any

  const reconciled = reconcileModifierState(sheetData)

  expect(reconciled.modifierState?.targetStates.evasion).toEqual({
    syncMode: "continuous",
  })
})
```

- [ ] **Step 2: Run failing test**

Run:

```bash
npm run test:run -- tests/unit/modifiers/reconcile.test.ts
```

Expected: FAIL because `syncMode` is not defined in types and `reconcileModifierState()` currently rebuilds target state with only `activeBaseId`.

- [ ] **Step 3: Add sync mode type**

In `lib/modifiers/types.ts`, change:

```ts
export interface TargetModifierState {
  activeBaseId?: ModifierEntryId
}
```

to:

```ts
export type TargetSyncMode = "manual" | "continuous"

export interface TargetModifierState {
  activeBaseId?: ModifierEntryId
  syncMode?: TargetSyncMode
}
```

- [ ] **Step 4: Preserve sync mode in reconcile**

In `lib/modifiers/reconcile.ts`, replace the target-state loop with:

```ts
  const nextTargetStates: ModifierState["targetStates"] = {}
  Object.entries(currentState.targetStates ?? {}).forEach(([target, state]) => {
    if (!state) return

    const targetId = target as ModifierTargetId
    const activeBaseId = state.activeBaseId
    const nextState: NonNullable<ModifierState["targetStates"][ModifierTargetId]> = {}

    if (activeBaseId && baseIdsByTarget.get(targetId)?.has(activeBaseId)) {
      nextState.activeBaseId = activeBaseId
    }

    if (state.syncMode === "continuous") {
      nextState.syncMode = "continuous"
    }

    if (Object.keys(nextState).length > 0) {
      nextTargetStates[targetId] = nextState
    }
  })
```

- [ ] **Step 5: Run reconcile test**

Run:

```bash
npm run test:run -- tests/unit/modifiers/reconcile.test.ts
```

Expected: PASS.

---

### Task 2: Add Pure Target Sync Helper

**Files:**
- Create: `lib/modifiers/target-sync.ts`
- Modify: `lib/modifiers/target-accessors.ts`
- Modify: `lib/sheet-data.ts`
- Modify: `lib/character-data-validator.ts`
- Test: `tests/unit/modifiers/target-sync.test.ts`

- [ ] **Step 1: Write target sync helper tests**

Create `tests/unit/modifiers/target-sync.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { applyContinuousTargetSync, getTargetSyncFallbackValue, syncTargetOnce } from "@/lib/modifiers/target-sync"
import type { SheetData } from "@/lib/sheet-data"

function sheet(overrides: Partial<SheetData> = {}): SheetData {
  return {
    ...defaultSheetData,
    ...overrides,
  }
}

describe("target sync helper", () => {
  it("syncs a target once from its reference total", () => {
    const data = sheet({
      evasion: "10",
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Base", value: 12 },
        },
        {
          id: "user:evasion-mod",
          definition: { target: "evasion", kind: "modifier" },
          editable: { label: "Mod", value: 1 },
        },
      ],
      modifierState: {
        targetStates: { evasion: { activeBaseId: "user:evasion-base" } },
        entryStates: {},
      },
    })

    const result = syncTargetOnce(data, "evasion")

    expect(result.applied).toBe(true)
    expect(result.sheetData.evasion).toBe("13")
  })

  it("does not sync once when target has no active base", () => {
    const data = sheet({
      evasion: "10",
      userModifierContributions: [
        {
          id: "user:evasion-mod",
          definition: { target: "evasion", kind: "modifier" },
          editable: { label: "Mod", value: 1 },
        },
      ],
      modifierState: { targetStates: {}, entryStates: {} },
    })

    const result = syncTargetOnce(data, "evasion")

    expect(result.applied).toBe(false)
    expect(result.sheetData).toBe(data)
  })

  it("applies continuous sync for all continuous targets", () => {
    const data = sheet({
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
          evasion: { activeBaseId: "user:evasion-base", syncMode: "continuous" },
          hpMax: { activeBaseId: "user:hp-base", syncMode: "manual" },
        },
        entryStates: {},
      },
    })

    const result = applyContinuousTargetSync(data)

    expect(result.evasion).toBe("12")
    expect(result.hpMax).toBe(6)
  })

  it("uses fallback when continuous target has no base", () => {
    const data = sheet({
      evasion: "10",
      hpMax: 9,
      stressMax: 8,
      armorMax: 3,
      modifierState: {
        targetStates: {
          evasion: { syncMode: "continuous" },
          hpMax: { syncMode: "continuous" },
          stressMax: { syncMode: "continuous" },
          armorMax: { syncMode: "continuous" },
        },
        entryStates: {},
      },
    })

    const result = applyContinuousTargetSync(data)

    expect(result.evasion).toBe("")
    expect(result.hpMax).toBe(6)
    expect(result.stressMax).toBe(6)
    expect(result.armorMax).toBe("")
  })

  it("returns the same object when no synced value changes", () => {
    const data = sheet({
      evasion: "12",
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Base", value: 12 },
        },
      ],
      modifierState: {
        targetStates: { evasion: { activeBaseId: "user:evasion-base", syncMode: "continuous" } },
        entryStates: {},
      },
    })

    expect(applyContinuousTargetSync(data)).toBe(data)
  })

  it("defines fallback values for known target families", () => {
    expect(getTargetSyncFallbackValue("agility.value")).toBe("")
    expect(getTargetSyncFallbackValue("experienceValues.0")).toBe("")
    expect(getTargetSyncFallbackValue("minorThreshold")).toBe("")
    expect(getTargetSyncFallbackValue("hpMax")).toBe(6)
    expect(getTargetSyncFallbackValue("stressMax")).toBe(6)
    expect(getTargetSyncFallbackValue("armorMax")).toBe("")
    expect(getTargetSyncFallbackValue("proficiency")).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run failing test**

Run:

```bash
npm run test:run -- tests/unit/modifiers/target-sync.test.ts
```

Expected: FAIL because `lib/modifiers/target-sync.ts` does not exist and `armorMax` cannot yet store `""`.

- [ ] **Step 3: Allow armorMax empty fallback in types**

In `lib/sheet-data.ts`, change:

```ts
  armorMax?: number
```

to:

```ts
  armorMax?: number | ""
```

- [ ] **Step 4: Preserve armorMax empty string in validation wrapper**

In `lib/character-data-validator.ts`, change:

```ts
    armorMax: typeof data.armorMax === 'number' ? data.armorMax : undefined,
```

to:

```ts
    armorMax: typeof data.armorMax === 'number' || data.armorMax === "" ? data.armorMax : undefined,
```

- [ ] **Step 5: Update target accessor write behavior**

In `lib/modifiers/target-accessors.ts`, replace:

```ts
  if (target === "hpMax" || target === "stressMax" || target === "armorMax") {
    return { ...sheetData, [target]: Number(value) }
  }
```

with:

```ts
  if (target === "armorMax") {
    return { ...sheetData, armorMax: value === "" ? "" : Number(value) }
  }

  if (target === "hpMax" || target === "stressMax") {
    return { ...sheetData, [target]: Number(value) }
  }
```

- [ ] **Step 6: Create target sync helper**

Create `lib/modifiers/target-sync.ts`:

```ts
import { tryParseNumber } from "@/lib/number-utils"
import type { SheetData } from "@/lib/sheet-data"
import { getReferenceSummary } from "./registry"
import { readTargetValue, writeTargetValue } from "./target-accessors"
import type { ModifierTargetId, TargetModifierState } from "./types"

export interface SyncTargetOnceResult {
  sheetData: SheetData
  applied: boolean
}

export function getTargetSyncFallbackValue(target: ModifierTargetId): number | string | undefined {
  if (target === "hpMax" || target === "stressMax") return 6
  if (target === "proficiency") return undefined
  if (
    target === "evasion" ||
    target === "armorMax" ||
    target === "minorThreshold" ||
    target === "majorThreshold" ||
    target.startsWith("experienceValues.") ||
    target.endsWith(".value")
  ) {
    return ""
  }
  return undefined
}

function isContinuousState(state: TargetModifierState | undefined): boolean {
  return state?.syncMode === "continuous"
}

function continuousTargets(sheetData: SheetData): ModifierTargetId[] {
  return Object.entries(sheetData.modifierState?.targetStates ?? {})
    .filter(([, state]) => isContinuousState(state))
    .map(([target]) => target as ModifierTargetId)
}

function desiredContinuousValue(sheetData: SheetData, target: ModifierTargetId): number | string | undefined {
  const summary = getReferenceSummary(sheetData, target)
  return summary.referenceTotal ?? getTargetSyncFallbackValue(target)
}

function isSameTargetValue(currentValue: unknown, desiredValue: number | string): boolean {
  if (desiredValue === "") return currentValue === ""
  if (typeof desiredValue === "number") return tryParseNumber(currentValue) === desiredValue
  return String(currentValue ?? "") === desiredValue
}

function writeTargetValueFromSync(sheetData: SheetData, target: ModifierTargetId, value: number | string): SheetData {
  return writeTargetValue(sheetData, target, value)
}

export function syncTargetOnce(sheetData: SheetData, target: ModifierTargetId): SyncTargetOnceResult {
  const summary = getReferenceSummary(sheetData, target)
  if (summary.referenceTotal === undefined) {
    return { sheetData, applied: false }
  }

  if (isSameTargetValue(readTargetValue(sheetData, target), summary.referenceTotal)) {
    return { sheetData, applied: false }
  }

  return {
    sheetData: writeTargetValueFromSync(sheetData, target, summary.referenceTotal),
    applied: true,
  }
}

export function applyContinuousTargetSync(sheetData: SheetData): SheetData {
  let next = sheetData
  let changed = false

  continuousTargets(sheetData).forEach(target => {
    const desiredValue = desiredContinuousValue(next, target)
    if (desiredValue === undefined) return
    if (isSameTargetValue(readTargetValue(next, target), desiredValue)) return

    next = writeTargetValueFromSync(next, target, desiredValue)
    changed = true
  })

  return changed ? next : sheetData
}
```

- [ ] **Step 7: Run target sync tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/target-sync.test.ts
```

Expected: PASS.

---

### Task 3: Add Store Actions For Sync Mode And One-Shot Sync

**Files:**
- Modify: `lib/sheet-store.ts`
- Test: `tests/unit/modifiers/store-actions.test.ts`

- [ ] **Step 1: Write store action tests**

Append to `tests/unit/modifiers/store-actions.test.ts`:

```ts
it("sets target sync mode while preserving active base", () => {
  resetSheetStore({
    modifierState: {
      targetStates: {
        evasion: { activeBaseId: "user:evasion-base" },
      },
      entryStates: {},
    },
  })

  store().setTargetSyncMode("evasion", "continuous")

  expect(sheet().modifierState?.targetStates.evasion).toEqual({
    activeBaseId: "user:evasion-base",
    syncMode: "continuous",
  })
})

it("syncs a target once from the store", () => {
  resetSheetStore({
    evasion: "10",
    userModifierContributions: [
      {
        id: "user:evasion-base",
        definition: { target: "evasion", kind: "base" },
        editable: { label: "Base", value: 12 },
      },
      {
        id: "user:evasion-mod",
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "Mod", value: 1 },
      },
    ],
    modifierState: {
      targetStates: { evasion: { activeBaseId: "user:evasion-base" } },
      entryStates: {},
    },
  })

  store().syncModifierTargetOnce("evasion")

  expect(sheet().evasion).toBe("13")
})

it("applies continuous sync when modifier sources change", () => {
  resetSheetStore({
    evasion: "10",
    userModifierContributions: [
      {
        id: "user:evasion-base",
        definition: { target: "evasion", kind: "base" },
        editable: { label: "Base", value: 12 },
      },
    ],
    modifierState: {
      targetStates: {
        evasion: {
          activeBaseId: "user:evasion-base",
          syncMode: "continuous",
        },
      },
      entryStates: {},
    },
  })

  store().upsertUserModifierContribution({
    id: "user:evasion-mod",
    definition: { target: "evasion", kind: "modifier" },
    editable: { label: "Mod", value: 2 },
  })

  expect(sheet().evasion).toBe("14")
})

it("keeps sync mode when clearing active base", () => {
  resetSheetStore({
    modifierState: {
      targetStates: {
        evasion: {
          activeBaseId: "user:evasion-base",
          syncMode: "continuous",
        },
      },
      entryStates: {},
    },
  })

  store().setActiveModifierBase("evasion", undefined)

  expect(sheet().modifierState?.targetStates.evasion).toEqual({
    syncMode: "continuous",
  })
})
```

- [ ] **Step 2: Run failing store tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/store-actions.test.ts
```

Expected: FAIL because `setTargetSyncMode()` and `syncModifierTargetOnce()` do not exist and existing source actions do not apply continuous sync.

- [ ] **Step 3: Import target sync helpers and types**

In `lib/sheet-store.ts`, update imports:

```ts
import type {
    AutomationSourceId,
    ModifierEntryId,
    ModifierTargetId,
    TargetSyncMode,
    UserModifierContribution,
} from "@/lib/modifiers/types";
import { applyContinuousTargetSync, syncTargetOnce } from "@/lib/modifiers/target-sync";
```

- [ ] **Step 4: Add store interface methods**

In `SheetState`, add:

```ts
    setTargetSyncMode: (target: ModifierTargetId, syncMode: TargetSyncMode) => void;
    syncModifierTargetOnce: (target: ModifierTargetId) => void;
```

- [ ] **Step 5: Add target state updater helpers**

Below `ensureModifierState`, add:

```ts
const cleanupTargetState = (state: { activeBaseId?: ModifierEntryId; syncMode?: TargetSyncMode }) => {
    const next = { ...state };
    if (!next.activeBaseId) {
        delete next.activeBaseId;
    }
    if (next.syncMode === "manual") {
        delete next.syncMode;
    }
    return Object.keys(next).length > 0 ? next : undefined;
};

const setTargetState = (
    targetStates: ReturnType<typeof ensureModifierState>["targetStates"],
    target: ModifierTargetId,
    nextState: { activeBaseId?: ModifierEntryId; syncMode?: TargetSyncMode },
) => {
    const cleaned = cleanupTargetState(nextState);
    if (cleaned) {
        targetStates[target] = cleaned;
    } else {
        delete targetStates[target];
    }
};
```

- [ ] **Step 6: Preserve syncMode in `setActiveModifierBase`**

Replace the active base update body with:

```ts
        const targetStates = { ...modifierState.targetStates };
        const currentTargetState = targetStates[target] ?? {};
        setTargetState(targetStates, target, {
            ...currentTargetState,
            activeBaseId: baseId,
        });

        const sheetData = applyContinuousTargetSync({
            ...state.sheetData,
            modifierState: {
                ...modifierState,
                targetStates,
            },
        });

        return { sheetData };
```

- [ ] **Step 7: Add `setTargetSyncMode`**

Add to the store implementation:

```ts
    setTargetSyncMode: (target, syncMode) => set((state) => {
        const modifierState = ensureModifierState(state.sheetData);
        const targetStates = { ...modifierState.targetStates };
        const currentTargetState = targetStates[target] ?? {};

        setTargetState(targetStates, target, {
            ...currentTargetState,
            syncMode,
        });

        const nextData = {
            ...state.sheetData,
            modifierState: {
                ...modifierState,
                targetStates,
            },
        };

        return {
            sheetData: syncMode === "continuous"
                ? applyContinuousTargetSync(nextData)
                : nextData,
        };
    }),
```

- [ ] **Step 8: Add `syncModifierTargetOnce`**

Add to the store implementation:

```ts
    syncModifierTargetOnce: (target) => set((state) => {
        const result = syncTargetOnce(state.sheetData, target);
        return result.applied ? { sheetData: result.sheetData } : state;
    }),
```

- [ ] **Step 9: Apply continuous sync to modifier source actions**

Wrap these action results with `applyContinuousTargetSync(...)`:

- `setModifierEntryEnabled`
- `upsertUserModifierContribution`
- `removeUserModifierContribution`
- `setAutomationSelection`

For example, change `upsertUserModifierContribution` to:

```ts
    upsertUserModifierContribution: (contribution) => set((state) => {
        const contributions = state.sheetData.userModifierContributions ?? [];
        const nextContributions = contributions.some(existing => existing.id === contribution.id)
            ? contributions.map(existing => existing.id === contribution.id ? contribution : existing)
            : [...contributions, contribution];

        return {
            sheetData: applyContinuousTargetSync({
                ...state.sheetData,
                userModifierContributions: nextContributions,
            }),
        };
    }),
```

- [ ] **Step 10: Run store tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/store-actions.test.ts
```

Expected: PASS.

---

### Task 4: Apply Continuous Sync To Existing Source-Changing Store Actions

**Files:**
- Modify: `lib/sheet-store.ts`
- Test: `tests/unit/modifiers/store-actions.test.ts`

- [ ] **Step 1: Add tests for profession, level, and armor source changes**

Append:

```ts
it("applies continuous sync after level changes update system entries", () => {
  const baseEquipment = defaultSheetData.equipment
  resetSheetStore({
    level: "1",
    minorThreshold: "0",
    equipment: {
      ...baseEquipment,
      armorSlot: {
        ...baseEquipment.armorSlot,
        name: "Armor",
        baseArmorMax: 3,
        baseThresholds: { minor: 7, major: 15 },
      },
    },
    modifierState: {
      targetStates: {
        minorThreshold: {
          activeBaseId: "equipment:armor:current:minorThreshold",
          syncMode: "continuous",
        },
      },
      entryStates: {},
    },
  })

  store().updateLevel("2", "1")

  expect(sheet().minorThreshold).toBe("9")
})

it("applies continuous sync after armor base max changes", () => {
  resetSheetStore({
    armorMax: 0,
    modifierState: {
      targetStates: {
        armorMax: {
          activeBaseId: "equipment:armor:current:armorMax",
          syncMode: "continuous",
        },
      },
      entryStates: {},
    },
  })

  store().updateArmorBaseMax("5")

  expect(sheet().armorMax).toBe(5)
})

it("applies continuous sync after profession card source changes", () => {
  resetSheetStore({
    evasion: "0",
    cards: [
      {
        ...createEmptyCard("profession"),
        id: "profession:current",
        name: "Old",
        type: "profession",
        professionSpecial: {
          "起始生命": 6,
          "起始闪避": 10,
          "起始物品": "",
          "希望特性": "",
        },
      },
      ...defaultSheetData.cards.slice(1),
    ],
    modifierState: {
      targetStates: {
        evasion: {
          activeBaseId: "profession:profession:current:evasion",
          syncMode: "continuous",
        },
      },
      entryStates: {},
    },
  })

  store().updateCard(0, {
    ...createEmptyCard("profession"),
    id: "profession:current",
    name: "New",
    type: "profession",
    professionSpecial: {
      "起始生命": 6,
      "起始闪避": 12,
      "起始物品": "",
      "希望特性": "",
    },
  }, false)

  expect(sheet().evasion).toBe("12")
  expect(sheet().modifierState?.targetStates.evasion?.syncMode).toBe("continuous")
})
```

- [ ] **Step 2: Ensure store action tests can use default equipment**

If `tests/unit/modifiers/store-actions.test.ts` does not already import `defaultSheetData` and `createEmptyCard`, add:

```ts
import { createEmptyCard } from "@/card/card-types"
import { defaultSheetData } from "@/lib/default-sheet-data"
```

- [ ] **Step 3: Run failing focused tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/store-actions.test.ts
```

Expected: FAIL if `updateLevel()` and `updateArmorBaseMax()` do not apply continuous sync after their existing updates.

- [ ] **Step 4: Apply sync to level, armor, profession, and card actions**

In `lib/sheet-store.ts`, wrap final returned `sheetData` in `applyContinuousTargetSync(...)` for:

- `updateLevel`
- `updateArmorBaseThresholds`
- `updateArmorBaseMax`
- `selectArmor`
- `handleProfessionChange`
- `updateCard`
- `deleteCard`
- `moveCard`

For `updateCard` and `deleteCard`, only the focused-card branch (`isInventory === false`) should apply continuous sync. Inventory-only card changes do not feed the current modifier registry and should not force unrelated continuous targets to resync.

When the action already constructs `updates`, apply sync after merging updates into sheet data:

```ts
const nextData = {
    ...state.sheetData,
    ...updates,
};

return {
    sheetData: applyContinuousTargetSync(nextData),
};
```

For `handleProfessionChange`, keep existing notification behavior, but the `set()` payload should apply sync to the final `sheetData` it returns.

For card actions, apply sync to the final card array because profession-card entries are provider sources. If an action only reorders cards and the reference totals do not change, `applyContinuousTargetSync()` returns the original object or an equivalent value with no final-value churn.

- [ ] **Step 5: Run store tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/store-actions.test.ts
```

Expected: PASS.

---

### Task 5: Add Popover Sync Controls

**Files:**
- Modify: `components/modifiers/modifier-popover.tsx`
- Test: `tests/unit/modifiers/modifier-popover.test.tsx`

- [ ] **Step 1: Add popover UI tests**

Append to `tests/unit/modifiers/modifier-popover.test.tsx`:

```tsx
it("syncs the final value once from the popover", async () => {
  resetSheetStore({
    evasion: "10",
    userModifierContributions: [
      userContribution("user:evasion-base", "evasion", "base", "Base", 12),
      userContribution("user:evasion-mod", "evasion", "modifier", "Mod", 1),
    ],
    modifierState: {
      targetStates: { evasion: { activeBaseId: "user:evasion-base" } },
      entryStates: {},
    },
  })

  render(<ModifierFieldAnchor target="evasion" label="闪避" />)
  await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))
  await userEvent.click(screen.getByRole("button", { name: "同步一次" }))

  expect(sheet().evasion).toBe("13")
})

it("disables one-shot sync when base is unknown", async () => {
  resetSheetStore({
    evasion: "10",
    modifierState: { targetStates: {}, entryStates: {} },
  })

  render(<ModifierFieldAnchor target="evasion" label="闪避" />)
  await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

  expect(screen.getByRole("button", { name: "同步一次" })).toBeDisabled()
})

it("toggles continuous sync from the popover", async () => {
  resetSheetStore({
    evasion: "10",
    userModifierContributions: [
      userContribution("user:evasion-base", "evasion", "base", "Base", 12),
    ],
    modifierState: {
      targetStates: { evasion: { activeBaseId: "user:evasion-base" } },
      entryStates: {},
    },
  })

  render(<ModifierFieldAnchor target="evasion" label="闪避" />)
  await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))
  await userEvent.click(screen.getByRole("checkbox", { name: "持续同步" }))

  expect(sheet().modifierState?.targetStates.evasion?.syncMode).toBe("continuous")
  expect(sheet().evasion).toBe("12")
})
```

- [ ] **Step 2: Run failing popover tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/modifier-popover.test.tsx
```

Expected: FAIL because the popover does not render sync controls yet.

- [ ] **Step 3: Import sync store actions in popover**

In `components/modifiers/modifier-popover.tsx`, add:

```ts
  const setTargetSyncMode = useSheetStore(state => state.setTargetSyncMode)
  const syncModifierTargetOnce = useSheetStore(state => state.syncModifierTargetOnce)
```

Define:

```ts
  const targetState = sheetData.modifierState?.targetStates?.[target]
  const continuousSync = targetState?.syncMode === "continuous"
```

- [ ] **Step 4: Add sync controls near reference total**

Above the reference total block, add:

```tsx
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-gray-200 pt-2">
        <button
          type="button"
          className="h-7 rounded border border-gray-300 px-2 text-[11px] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={summary.referenceTotal === undefined}
          onClick={() => syncModifierTargetOnce(target)}
        >
          同步一次
        </button>
        <label className="flex items-center gap-1 text-[11px] text-gray-600">
          <input
            type="checkbox"
            checked={continuousSync}
            aria-label="持续同步"
            onChange={event => setTargetSyncMode(target, event.target.checked ? "continuous" : "manual")}
          />
          持续同步
        </label>
      </div>
```

- [ ] **Step 5: Run popover tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/modifier-popover.test.tsx
```

Expected: PASS.

---

### Task 6: Preserve Sync Mode Through Migration And Current Normalization

**Files:**
- Modify: `lib/sheet-data-migration.ts`
- Test: `tests/unit/modifiers/migration.test.ts`

- [ ] **Step 1: Add migration tests for syncMode**

Append to `tests/unit/modifiers/migration.test.ts`:

```ts
it("preserves sync mode from current modifier state", () => {
  const migrated = migrateSheetData({
    schemaVersion: 2,
    modifierState: {
      targetStates: {
        evasion: { syncMode: "continuous" },
      },
      entryStates: {},
    },
  })

  expect(migrated.modifierState?.targetStates.evasion).toEqual({
    syncMode: "continuous",
  })
})

it("drops invalid sync mode values", () => {
  const migrated = migrateSheetData({
    schemaVersion: 2,
    modifierState: {
      targetStates: {
        evasion: { syncMode: "always" },
      },
      entryStates: {},
    },
  } as any)

  expect(migrated.modifierState?.targetStates.evasion).toBeUndefined()
})
```

- [ ] **Step 2: Run failing migration tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/migration.test.ts
```

Expected: FAIL if current normalization preserves invalid `syncMode` or drops valid `syncMode`.

- [ ] **Step 3: Normalize target states in migration**

In `lib/sheet-data-migration.ts`, add helper:

```ts
function normalizeTargetStates(value: unknown): NonNullable<SheetData["modifierState"]>["targetStates"] {
  if (!isRecord(value)) return {}

  const targetStates: NonNullable<SheetData["modifierState"]>["targetStates"] = {}
  Object.entries(value).forEach(([target, state]) => {
    if (!isRecord(state)) return
    const nextState: NonNullable<SheetData["modifierState"]>["targetStates"][ModifierTargetId] = {}
    if (typeof state.activeBaseId === "string") {
      nextState.activeBaseId = state.activeBaseId
    }
    if (state.syncMode === "continuous") {
      nextState.syncMode = "continuous"
    }
    if (Object.keys(nextState).length > 0) {
      targetStates[target as ModifierTargetId] = nextState
    }
  })

  return targetStates
}
```

Then in `normalizeCurrentModifierCollections()`, replace:

```ts
targetStates: isRecord(migrated.modifierState.targetStates) ? migrated.modifierState.targetStates : {},
```

with:

```ts
targetStates: normalizeTargetStates(migrated.modifierState.targetStates),
```

- [ ] **Step 4: Preserve syncMode in legacy modifier state migration**

In `migrateModifierState()`, when copying existing `legacyState.targetStates`, include valid `syncMode`:

```ts
const nextState: NonNullable<SheetData["modifierState"]>["targetStates"][ModifierTargetId] = {}
if (typeof state.activeBaseId === "string") {
  nextState.activeBaseId = migrateSystemModifierEntryId(state.activeBaseId)
}
if (state.syncMode === "continuous") {
  nextState.syncMode = "continuous"
}
if (Object.keys(nextState).length > 0) {
  targetStates[migrateModifierTarget(target)] = nextState
}
```

- [ ] **Step 5: Run migration tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/migration.test.ts
```

Expected: PASS.

---

### Task 7: Focused Verification And Full Suite

**Files:**
- No new code files unless a previous task reveals a compile issue.

- [ ] **Step 1: Run focused modifier tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/target-sync.test.ts tests/unit/modifiers/reconcile.test.ts tests/unit/modifiers/store-actions.test.ts tests/unit/modifiers/modifier-popover.test.tsx tests/unit/modifiers/migration.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run storage/import migration tests**

Run:

```bash
npm run test:run -- tests/unit/migration-versioning.test.ts tests/unit/storage-migration.test.ts tests/unit/character-data-validator.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run full suite**

Run:

```bash
npm run test:run
```

Expected: PASS. Existing non-failing stderr about `Cannot find module '../card-types'` may appear; record it if Vitest exits 0.

- [ ] **Step 4: Commit implementation**

Run:

```bash
git status --short
git add lib/modifiers/types.ts lib/modifiers/reconcile.ts lib/modifiers/target-sync.ts lib/modifiers/target-accessors.ts lib/sheet-data.ts lib/character-data-validator.ts lib/sheet-data-migration.ts lib/sheet-store.ts components/modifiers/modifier-popover.tsx tests/unit/modifiers/target-sync.test.ts tests/unit/modifiers/reconcile.test.ts tests/unit/modifiers/store-actions.test.ts tests/unit/modifiers/modifier-popover.test.tsx tests/unit/modifiers/migration.test.ts
git commit -m "feat: add target sync automation"
```

Expected: commit succeeds with target sync automation implementation and tests.
