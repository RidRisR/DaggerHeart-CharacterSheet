# Automatic Calculation Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make modifier-aware store actions commit only stable sheet data produced by the shared automatic-calculation sync boundary.

**Architecture:** Treat `applyAutoCalculationForTargets` as the shared boundary executor for this stage. It builds the full Modifier Target Universe, normalizes modifier state for every target, writes Final Value only for enabled targets, and is called by all modifier-aware store actions before commit.

**Tech Stack:** TypeScript, Zustand store, Vitest.

---

## Specs

- `CONTEXT.md`
- `docs/superpowers/specs/2026-05-19-automatic-calculation-boundary-design.md`
- `docs/superpowers/specs/2026-05-19-modifier-base-reference-invariant-design.md`
- `docs/superpowers/specs/2026-05-18-modifier-other-adjustments-design.md`

## File Map

- Modify `lib/modifiers/target-sync.ts`: implement full target universe, target state normalization, disabled-target active-base normalization, and default-on state cleanup.
- Modify `lib/modifiers/reconcile.ts`: stop preserving `autoCalculation: true` as a meaningful target preference.
- Modify `lib/sheet-store.ts`: route replacement, final-value submit, auto-calculation toggle, special-base removal, max/proficiency edits, and disabled Other changes through `applyAutoCalculationForTargets`.
- Modify `tests/unit/modifiers/target-sync.test.ts`: cover target universe and disabled-target normalization.
- Modify `tests/unit/modifiers/reconcile.test.ts`: cover `autoCalculation: true` cleanup.
- Modify `tests/unit/modifiers/store-actions.test.ts`: cover store boundary commit behavior.

---

### Task 1: Shared Boundary Normalization

**Files:**
- Modify: `tests/unit/modifiers/target-sync.test.ts`
- Modify: `tests/unit/modifiers/reconcile.test.ts`
- Modify: `lib/modifiers/target-sync.ts`
- Modify: `lib/modifiers/reconcile.ts`

- [ ] **Step 1: Write failing tests**

Add tests that assert:

```ts
it("normalizes disabled targets without rewriting their final values", () => {
  const data = sheet({
    evasion: "10",
    userModifierContributions: [{
      id: "user:evasion-fallback-base",
      definition: { target: "evasion", kind: "base" },
      editable: { label: "Fallback", value: 14 },
    }],
    modifierState: {
      targetStates: {
        evasion: { activeBaseId: "user:evasion-missing-base", autoCalculation: false },
      },
      entryStates: {},
    },
  })

  const result = applyAutoCalculationForTargets(data)

  expect(result.evasion).toBe("10")
  expect(result.modifierState?.targetStates.evasion).toEqual({
    activeBaseId: "user:evasion-fallback-base",
    autoCalculation: false,
  })
})

it("cleans empty enabled target state after writing default-on finals", () => {
  const data = sheet({
    evasion: "10",
    modifierState: {
      targetStates: { evasion: { autoCalculation: true } },
      entryStates: {},
    },
  })

  const result = applyAutoCalculationForTargets(data)

  expect(result.evasion).toBe("")
  expect(result.modifierState?.targetStates.evasion).toBeUndefined()
})

it("includes fixed targets even when only the stored final is stale", () => {
  const result = applyAutoCalculationForTargets(sheet({ evasion: "15" }))

  expect(result.evasion).toBe("")
})
```

Add a reconcile test:

```ts
it("removes autoCalculation true because enabled is the default", () => {
  const result = reconcileModifierState(sheet({
    modifierState: {
      targetStates: { evasion: { autoCalculation: true } },
      entryStates: {},
    },
  }))

  expect(result.modifierState.targetStates.evasion).toBeUndefined()
})
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm run test:run -- tests/unit/modifiers/target-sync.test.ts tests/unit/modifiers/reconcile.test.ts
```

Expected: new tests fail because disabled targets are skipped, fixed targets without state are not in the universe, and `autoCalculation: true` is preserved.

- [ ] **Step 3: Implement target universe and normalization**

Update `lib/modifiers/target-sync.ts` to:

- Include fixed targets, five experience slots, entry targets, target states, and Other adjustment targets.
- Process disabled targets for active-base normalization while skipping only Final Value writeback.
- Remove empty target state and `autoCalculation: true`.
- Keep `autoCalculation: false` and valid `activeBaseId`.
- Preserve unparseable nonblank Final Value by skipping only Final Value writeback, not state normalization.

- [ ] **Step 4: Stop preserving default enabled state in reconcile**

Update `lib/modifiers/reconcile.ts` so only `autoCalculation: false` is persisted.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
npm run test:run -- tests/unit/modifiers/target-sync.test.ts tests/unit/modifiers/reconcile.test.ts
```

Expected: PASS.

---

### Task 2: Store Actions Commit Through Boundary

**Files:**
- Modify: `tests/unit/modifiers/store-actions.test.ts`
- Modify: `lib/sheet-store.ts`

- [ ] **Step 1: Write failing store tests**

Add tests that assert:

```ts
it("syncs calculated final after numeric final creates a manual base", () => {
  resetSheetStore({
    evasion: "",
    userModifierContributions: [{
      id: "user:evasion-mod",
      definition: { target: "evasion", kind: "modifier" },
      editable: { label: "Penalty", value: -2 },
    }],
    modifierState: { targetStates: {}, entryStates: {} },
  })

  store().commitModifierTargetValue("evasion", "5")

  expect(sheet().evasion).toBe("3")
  expect(sheet().userModifierContributions).toContainEqual(createManualBaseContribution("evasion", 5))
})

it("clears final after removing the last special base while enabled", () => {
  const manualBase = createManualBaseContribution("evasion", 12)
  resetSheetStore({
    evasion: "12",
    userModifierContributions: [manualBase],
    modifierState: {
      targetStates: { evasion: { activeBaseId: manualBase.id } },
      entryStates: {},
    },
  })

  store().removeSpecialBaseContribution("evasion", manualBase.id)

  expect(sheet().evasion).toBe("")
  expect(sheet().modifierState?.targetStates.evasion).toBeUndefined()
})

it("syncs current-schema replacement before committing it", () => {
  resetSheetStore()

  store().replaceSheetData({
    ...defaultSheetData,
    evasion: "",
    userModifierContributions: [createManualBaseContribution("evasion", 12)],
    modifierState: { targetStates: {}, entryStates: {} },
  })

  expect(sheet().evasion).toBe("12")
})
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm run test:run -- tests/unit/modifiers/store-actions.test.ts
```

Expected: new tests fail because these store paths do not currently run the full boundary before commit.

- [ ] **Step 3: Route modifier-aware actions through the boundary**

Update `lib/sheet-store.ts` so these action results are wrapped with `applyAutoCalculationForTargets`:

- `replaceSheetData`
- `updateProficiency`
- `updateHPMax`
- `updateStressMax`
- `setTargetAutoCalculation`
- `commitModifierTargetValue`
- `upsertOtherAdjustment`
- `removeOtherAdjustment`
- `removeSpecialBaseContribution`

For disabled Final Value submissions, write the locked Final Value first, then run the boundary. The disabled target keeps its Final Value while Source State and active base normalize.

For blank or unparseable enabled Final Value submissions, write the submitted stored value first, then run the boundary. Blank values are recalculated when a Reference Total exists; nonblank unparseable text blocks only Final Value writeback.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
npm run test:run -- tests/unit/modifiers/store-actions.test.ts
```

Expected: PASS.

---

### Task 3: Focused Regression Run

**Files:**
- Verify only.

- [ ] **Step 1: Run focused modifier suite**

Run:

```bash
npm run test:run -- tests/unit/modifiers/target-sync.test.ts tests/unit/modifiers/reconcile.test.ts tests/unit/modifiers/final-input-reconciliation.test.ts tests/unit/modifiers/store-actions.test.ts tests/unit/automation/target-sync-unification.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full unit suite**

Run:

```bash
npm run test:unit
```

Expected: PASS.
