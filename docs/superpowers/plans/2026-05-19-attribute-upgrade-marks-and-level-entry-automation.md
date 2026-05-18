# Attribute Upgrade Marks and Level Entry Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore attribute upgrade marks, add standard/free attribute upgrade modes, and introduce ordered level-entry automation for 5/8 mark resets.

**Architecture:** Keep `AttributeValue.checked` as the source of truth for attribute marks. Extend `UpgradeState` with an optional `attributeMarksApplied?: true`, add a focused level-entry automation module, and keep modifier value calculation driven by existing `upgradeStates` provider entries.

**Tech Stack:** Next.js/React, Zustand store, TypeScript, Vitest, Testing Library.

---

## Reference Spec

Implement exactly the behavior in:

`docs/superpowers/specs/2026-05-19-attribute-upgrade-marks-and-level-entry-automation-design.md`

## File Structure

- Modify `lib/modifiers/types.ts`
  - Add `attributeMarksApplied?: true` to `UpgradeState`.
- Modify `lib/modifiers/upgrade-states.ts`
  - Sanitize and merge `attributeMarksApplied`.
  - Preserve it only for checked attribute upgrade states.
  - Delete it when state becomes `{ checked: false }`.
- Create `lib/automation/level-entry-actions.ts`
  - Normalize levels.
  - Compute entered levels.
  - Run per-level automation registry in order.
  - Clear attribute marks and remove `attributeMarksApplied`.
- Modify `lib/sheet-store.ts`
  - Change `updateLevel(level: string): void`.
  - Apply level-entry automation before `applyAutoCalculationForTargets`.
  - Add helper/action behavior for applying and cancelling attribute marks as needed.
- Modify `components/character-sheet-sections/attributes-section.tsx`
  - Remove scanning `upgradeStates` for mark display.
  - Display only `AttributeValue.checked`.
- Modify `components/upgrade-popover/attribute-upgrade-editor.tsx`
  - Add standard/free mode UI.
  - Standard mode filters by current black dots and writes marks.
  - Free mode ignores current black dots and does not write marks.
- Modify `components/character-sheet-page-two.tsx`
  - Remove `oldLevel` parameter calls.
  - Ensure attribute upgrade cancellation can return marks when `attributeMarksApplied` is set.
- Modify `components/character-sheet-sections/header-section.tsx`
  - Remove `oldLevel` parameter calls.
  - Keep existing level input behavior.
- Modify `components/character-sheet-page-two-sections/upgrade-section.tsx`
  - Remove `oldLevel` parameter calls.
  - Keep existing cancel confirmation flow.
- Test `tests/unit/automation/level-entry-actions.test.ts`
  - Unit-test entered levels, normalization, ordered execution, mark clearing.
- Test `tests/unit/automation/level-automation.test.ts`
  - Update old black-dot expectations and cover store integration.
- Test `tests/unit/modifiers/attribute-auto-base-section.test.tsx`
  - Correct attribute marker expectations to rely on `AttributeValue.checked`.
- Test `tests/integration/upgrade-cancel-flow.test.tsx`
  - Cover standard/free attribute upgrade application and cancellation.
- Test `tests/unit/automation/upgrade-automation.test.ts`
  - Update cancellation expectations if `computeUpgradeAutomation` becomes responsible for mark-return updates.

## Task 1: Level Entry Automation Foundation

**Files:**
- Create: `lib/automation/level-entry-actions.ts`
- Modify: `lib/modifiers/types.ts`
- Modify: `lib/modifiers/upgrade-states.ts`
- Modify: `lib/sheet-store.ts`
- Test: `tests/unit/automation/level-entry-actions.test.ts`
- Test: `tests/unit/automation/level-automation.test.ts`

- [ ] **Step 1: Write failing level-entry unit tests**

Add `tests/unit/automation/level-entry-actions.test.ts` with tests for:

```ts
import { describe, expect, it } from "vitest"
import { defaultSheetData } from "@/lib/default-sheet-data"
import {
  applyLevelEntryAutomations,
  enteredLevelsBetween,
  normalizeLevelForEntryAutomation,
} from "@/lib/automation/level-entry-actions"

describe("level entry automation", () => {
  it.each([
    ["", 1],
    ["abc", 1],
    ["0", 1],
    ["11", 1],
    ["1", 1],
    ["5", 5],
    ["10", 10],
  ])("normalizes %s to %s", (value, expected) => {
    expect(normalizeLevelForEntryAutomation(value)).toBe(expected)
  })

  it("returns every entered level on upward jumps", () => {
    expect(enteredLevelsBetween("1", "5")).toEqual([2, 3, 4, 5])
    expect(enteredLevelsBetween("4", "6")).toEqual([5, 6])
    expect(enteredLevelsBetween("1", "8")).toEqual([2, 3, 4, 5, 6, 7, 8])
  })

  it("does not return levels for same-level or downward changes", () => {
    expect(enteredLevelsBetween("5", "5")).toEqual([])
    expect(enteredLevelsBetween("8", "4")).toEqual([])
    expect(enteredLevelsBetween("5", "")).toEqual([])
  })

  it("clears attribute marks and attributeMarksApplied at level 5 and level 8", () => {
    const sheet = applyLevelEntryAutomations({
      ...defaultSheetData,
      level: "1",
      agility: { value: "1", checked: true, spellcasting: false },
      strength: { value: "1", checked: true, spellcasting: false },
      upgradeStates: {
        "tier1-0-0": {
          checked: true,
          params: { attributes: ["agility", "strength"] },
          attributeMarksApplied: true,
        },
        "tier1-5-0": {
          checked: true,
          params: { target: "evasion" },
        },
      },
    }, "8")

    expect(sheet.agility?.checked).toBe(false)
    expect(sheet.strength?.checked).toBe(false)
    expect(sheet.upgradeStates?.["tier1-0-0"]).toEqual({
      checked: true,
      params: { attributes: ["agility", "strength"] },
    })
    expect(sheet.upgradeStates?.["tier1-5-0"]).toEqual({
      checked: true,
      params: { target: "evasion" },
    })
  })
})
```

- [ ] **Step 2: Run failing tests**

Run:

`npm run test:run -- tests/unit/automation/level-entry-actions.test.ts`

Expected: FAIL because `lib/automation/level-entry-actions.ts` does not exist.

- [ ] **Step 3: Implement level-entry automation**

Create `lib/automation/level-entry-actions.ts` with:

- `normalizeLevelForEntryAutomation(value: unknown): number`
- `enteredLevelsBetween(oldLevel: unknown, newLevel: unknown): number[]`
- `applyLevelEntryAutomations(sheetData: SheetData, newLevel: string): SheetData`
- `clearAttributeUpgradeMarks(sheetData: SheetData): SheetData`
- `LEVEL_ENTRY_AUTOMATIONS`

Implementation requirements:

- Empty, invalid, and out-of-range values normalize to `1`.
- Only upward transitions return entered levels.
- `applyLevelEntryAutomations` reads `sheetData.level` as old level.
- 5 and 8 both run `clearAttributeUpgradeMarks`.
- Clearing marks sets all six attribute `checked` values to `false`.
- Clearing marks deletes `attributeMarksApplied` from every checked/unchecked attribute upgrade state whose `params` contains `attributes`.

- [ ] **Step 4: Extend `UpgradeState` sanitization**

Update `lib/modifiers/types.ts`:

```ts
export interface UpgradeState {
  checked: boolean
  params?: UpgradeStateParams
  attributeMarksApplied?: true
}
```

Update `lib/modifiers/upgrade-states.ts`:

- Preserve `attributeMarksApplied: true` only when:
  - `checked === true`
  - sanitized params are `{ attributes: AttributeKey[] }`
  - raw state has `attributeMarksApplied === true`
- `mergeUpgradeState(..., { checked: false })` returns exactly `{ checked: false }`.
- `mergeUpgradeState` preserves `attributeMarksApplied` when merging a checked state with params.

- [ ] **Step 5: Integrate store level update**

Update `lib/sheet-store.ts`:

- Change interface to `updateLevel: (level: string) => void`.
- Change implementation:

```ts
updateLevel: (level) => set((state) => {
  const nextSheetData = applyLevelEntryAutomations(state.sheetData, level)
  return {
    sheetData: applyAutoCalculationForTargets({
      ...nextSheetData,
      level,
    }),
  }
}),
```

- [ ] **Step 6: Update level tests**

Update `tests/unit/automation/level-automation.test.ts` so:

- The old test named “等级变化不再直接重置六属性升级标记” becomes a positive assertion that `1 -> 5` clears all six attribute marks.
- Add a downward test asserting `8 -> 4` does not clear marks.
- Keep manual-mode threshold/proficiency tests unchanged.

- [ ] **Step 7: Verify task 1**

Run:

`npm run test:run -- tests/unit/automation/level-entry-actions.test.ts tests/unit/automation/level-automation.test.ts tests/unit/level-proficiency.test.ts tests/unit/automation/target-sync-unification.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit task 1**

```bash
git add lib/automation/level-entry-actions.ts lib/modifiers/types.ts lib/modifiers/upgrade-states.ts lib/sheet-store.ts tests/unit/automation/level-entry-actions.test.ts tests/unit/automation/level-automation.test.ts tests/unit/level-proficiency.test.ts tests/unit/automation/target-sync-unification.test.ts
git commit -m "feat: add level entry automation for attribute marks"
```

## Task 2: Attribute Upgrade Standard and Free Modes

**Files:**
- Modify: `components/character-sheet-sections/attributes-section.tsx`
- Modify: `components/upgrade-popover/attribute-upgrade-editor.tsx`
- Modify: `components/character-sheet-page-two.tsx`
- Modify: `components/character-sheet-sections/header-section.tsx`
- Modify: `components/character-sheet-page-two-sections/upgrade-section.tsx`
- Test: `tests/unit/modifiers/attribute-auto-base-section.test.tsx`
- Test: `tests/integration/upgrade-cancel-flow.test.tsx`

- [ ] **Step 1: Write failing attribute marker test**

Update the existing marker test in `tests/unit/modifiers/attribute-auto-base-section.test.tsx` so it proves `upgradeStates` alone does not blacken marks:

```ts
it("shows attribute upgrade markers from AttributeValue.checked, not upgrade history", () => {
  resetSheetStore({
    agility: { value: "1", checked: false, spellcasting: false },
    strength: { value: "1", checked: true, spellcasting: false },
    finesse: { value: "0", checked: false, spellcasting: false },
    upgradeStates: {
      "tier1-0-0": {
        checked: true,
        params: { attributes: ["agility", "finesse"] },
      },
    },
  })

  const { container } = render(<AttributesSection />)
  const markers = container.querySelectorAll(".w-2.h-2.rounded-full")

  expect(markers[0]).toHaveClass("bg-white")
  expect(markers[1]).toHaveClass("bg-gray-800")
  expect(markers[2]).toHaveClass("bg-white")
})
```

Expected before implementation: FAIL because current code scans `upgradeStates`.

- [ ] **Step 2: Write failing integration tests for standard/free mode**

Add tests to `tests/integration/upgrade-cancel-flow.test.tsx`:

1. Standard mode:
   - Starts with all target attributes white.
   - Opens a `角色属性+1` upgrade.
   - Selects two attributes.
   - Applies.
   - Expects selected attributes `checked: true`.
   - Expects `upgradeStates[checkKey].attributeMarksApplied === true`.

2. Free mode:
   - Starts with selected attributes already black.
   - Opens an unchecked `角色属性+1` upgrade.
   - Switches mode to `自由`.
   - Selects two black attributes.
   - Applies.
   - Expects attributes remain as they were.
   - Expects no `attributeMarksApplied`.

3. Cancellation with marks:
   - Starts with `upgradeStates[checkKey]` checked, params attributes, and `attributeMarksApplied: true`.
   - Attributes are black.
   - Cancels via existing confirmation.
   - Expects upgrade state `{ checked: false }`.
   - Expects those attributes `checked: false`.

4. Cancellation without marks:
   - Same but no `attributeMarksApplied`.
   - Cancels.
   - Expects black dots unchanged.

- [ ] **Step 3: Run failing tests**

Run:

`npm run test:run -- tests/unit/modifiers/attribute-auto-base-section.test.tsx tests/integration/upgrade-cancel-flow.test.tsx`

Expected: FAIL on marker source and missing standard/free behavior.

- [ ] **Step 4: Remove derived marker logic**

Update `components/character-sheet-sections/attributes-section.tsx`:

- Delete `collectUpgradedAttributes`.
- Delete `const upgradedAttributes = collectUpgradedAttributes(formData)`.
- Compute marker state only as:

```ts
const isUpgraded = isAttributeValue(attrValue) && attrValue.checked
```

- [ ] **Step 5: Implement standard/free mode in `AttributeUpgradeEditor`**

Update `components/upgrade-popover/attribute-upgrade-editor.tsx`:

- Add local mode state:

```ts
const [mode, setMode] = useState<"standard" | "free">("standard")
```

- Render a compact mode switch with buttons `标准` and `自由`.
- In standard mode:
  - `isAttributeUpgraded` checks only `sheetData[key].checked`.
  - Black attributes are disabled.
- In free mode:
  - Attributes are never disabled because of black dots.
  - Selection still maxes at 2.
- On apply:
  - Standard mode updates selected attributes to `{ ...attr, checked: true }`.
  - Standard mode writes `attributeMarksApplied: true`.
  - Free mode does not update attribute `checked`.
  - Free mode omits `attributeMarksApplied`.

- [ ] **Step 6: Implement cancellation mark return**

Ensure cancellation of checked attribute upgrades:

- Reads the previous `upgradeStates[checkKey]` before replacing it.
- If previous state has `attributeMarksApplied === true` and `params.attributes`, set those attributes `checked: false`.
- Then write `{ checked: false }`.

This can be done in `components/character-sheet-page-two.tsx` around the existing `setUpgradeState(checkKeyOrTier, result.upgradeState)` path, or by adding a focused store helper. Keep the implementation small and covered by integration tests.

- [ ] **Step 7: Remove `oldLevel` calls**

Update:

- `components/character-sheet-sections/header-section.tsx`
- `components/character-sheet-page-two-sections/upgrade-section.tsx`
- tests calling `updateLevel(newLevel, oldLevel)`

All calls should become `updateLevel(newLevel)`.

- [ ] **Step 8: Verify task 2**

Run:

`npm run test:run -- tests/unit/modifiers/attribute-auto-base-section.test.tsx tests/integration/upgrade-cancel-flow.test.tsx tests/unit/automation/upgrade-automation.test.ts tests/unit/modifiers/source-definitions.test.ts`

Expected: PASS. If `source-definitions.test.ts` does not exist, run the closest existing source-definition tests with `rg -n "selectedUpgradeEntries|source-definitions" tests`.

- [ ] **Step 9: Commit task 2**

```bash
git add components/character-sheet-sections/attributes-section.tsx components/upgrade-popover/attribute-upgrade-editor.tsx components/character-sheet-page-two.tsx components/character-sheet-sections/header-section.tsx components/character-sheet-page-two-sections/upgrade-section.tsx tests/unit/modifiers/attribute-auto-base-section.test.tsx tests/integration/upgrade-cancel-flow.test.tsx tests/unit/automation/upgrade-automation.test.ts
git commit -m "fix: restore attribute upgrade mark semantics"
```

## Task 3: Full Verification and Cleanup

**Files:**
- Modify only files required by failed verification.

- [ ] **Step 1: Run focused test suite**

Run:

`npm run test:run -- tests/unit/automation/level-entry-actions.test.ts tests/unit/automation/level-automation.test.ts tests/unit/level-proficiency.test.ts tests/unit/automation/target-sync-unification.test.ts tests/unit/modifiers/attribute-auto-base-section.test.tsx tests/integration/upgrade-cancel-flow.test.tsx tests/unit/automation/upgrade-automation.test.ts`

Expected: PASS.

- [ ] **Step 2: Run full unit tests**

Run:

`npm run test:unit`

Expected: PASS.

- [ ] **Step 3: Run build**

Run:

`npm run build`

Expected: PASS.

If `lib/embedded-styles.ts` is modified only by build output and no source styling change requires committing it, restore it before final status.

- [ ] **Step 4: Run diff checks**

Run:

`git diff --check`

Expected: no output.

- [ ] **Step 5: Final review**

Review:

- `git diff --stat`
- `git diff`
- `git status --short`

Confirm:

- No `oldLevel` parameter remains in `updateLevel` signature or calls.
- Attribute marker display no longer scans `upgradeStates`.
- Standard/free mode behavior matches the spec.
- Level-entry automation is process-style and ordered by entered level.

- [ ] **Step 6: Commit verification fixes if any**

Only commit if Step 1-5 required extra fixes:

```bash
git add <changed-files>
git commit -m "test: cover attribute mark automation"
```

## Self-Review

Spec coverage:

- Attribute marks as `AttributeValue.checked`: Task 2.
- `attributeMarksApplied?: true`: Task 1 and Task 2.
- Standard/free modes: Task 2.
- Cancellation return behavior: Task 2.
- 5/8 ordered level-entry automation: Task 1.
- `updateLevel(level)` without old parameter: Task 1 and Task 2.
- Verification: Task 3.

Placeholder scan:

- No implementation step uses TBD/TODO placeholders.
- The only conditional test note is for locating an existing source-definition test if the named file is absent; this is a command-time lookup, not a missing implementation detail.

Type consistency:

- `attributeMarksApplied?: true` is consistently used on `UpgradeState`.
- `updateLevel(level: string): void` is consistently used after cleanup.

