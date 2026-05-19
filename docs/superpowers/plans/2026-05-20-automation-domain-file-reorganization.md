# Automation Domain File Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the automatic value calculation domain out of generic `lib` folders into a top-level `automation/` module, without changing runtime behavior.

**Architecture:** Treat `automation/` as the top-level module for value automation: calculation core, equipment contribution adapters, and user/system actions that enter automatic-calculation sync boundaries. Keep sheet-data migration/versioning outside this module because migration is a broader save-format compatibility system, not an internal part of value automation.

**Tech Stack:** Next.js, TypeScript path alias `@/*`, Vitest, Git rename tracking.

---

## Decision Summary

Create a new top-level module:

```text
automation/
  core/
  equipment/
  actions/
```

Move only the value automation domain files:

```text
lib/modifiers/*   -> automation/core/*
lib/equipment/*   -> automation/equipment/*
lib/automation/*  -> automation/actions/*
```

Do not move migration/versioning in this release cleanup:

```text
lib/sheet-data-migration.ts
lib/sheet-schema-version.ts
```

Reason: sheet-data migration is a save-format evolution module. It currently creates modifier/equipment state because this release needs that migration, but its long-term responsibility is broader than value automation. It may later become a top-level `sheet-migration/` module.

## Scope Rules

Allowed:

- Move files with `git mv`.
- Update import specifiers required by those moves.
- Commit the structural change as one isolated refactor commit.

Forbidden:

- Function body changes.
- Type/interface shape changes.
- Export name changes.
- Test expectation changes.
- Compatibility re-export shim files.
- Barrel `index.ts` files.
- Moving UI components, data lists, stores, storage, or migration/versioning in this PR cleanup.

If a verification failure appears to require behavioral code changes, stop and report it instead of hiding the fix inside this refactor.

## Target Structure

### Core

Move:

```text
lib/modifiers/attribute-auto-base.ts
  -> automation/core/attribute-auto-base.ts
lib/modifiers/entry-utils.ts
  -> automation/core/entry-utils.ts
lib/modifiers/final-input-reconciliation.ts
  -> automation/core/final-input-reconciliation.ts
lib/modifiers/hp-stress-invariants.ts
  -> automation/core/hp-stress-invariants.ts
lib/modifiers/other-adjustments.ts
  -> automation/core/other-adjustments.ts
lib/modifiers/reconcile.ts
  -> automation/core/reconcile.ts
lib/modifiers/reference-calculator.ts
  -> automation/core/reference-calculator.ts
lib/modifiers/registry.ts
  -> automation/core/registry.ts
lib/modifiers/source-definitions.ts
  -> automation/core/source-definitions.ts
lib/modifiers/special-contributions.ts
  -> automation/core/special-contributions.ts
lib/modifiers/target-accessors.ts
  -> automation/core/target-accessors.ts
lib/modifiers/target-sync.ts
  -> automation/core/target-sync.ts
lib/modifiers/types.ts
  -> automation/core/types.ts
lib/modifiers/upgrade-states.ts
  -> automation/core/upgrade-states.ts
```

Responsibility:

- Source State and Derived State types.
- Reference Total calculation.
- Final Value reconciliation and writeback helpers.
- Other adjustments.
- target state normalization and automatic-calculation sync helpers.

### Equipment

Move:

```text
lib/equipment/armor-utils.ts
  -> automation/equipment/armor-utils.ts
lib/equipment/contribution-utils.ts
  -> automation/equipment/contribution-utils.ts
lib/equipment/defaults.ts
  -> automation/equipment/defaults.ts
lib/equipment/template-to-slot.ts
  -> automation/equipment/template-to-slot.ts
lib/equipment/types.ts
  -> automation/equipment/types.ts
lib/equipment/weapon-slot-utils.ts
  -> automation/equipment/weapon-slot-utils.ts
```

Responsibility:

- Equipment data shape used by automated value calculation.
- Equipment contribution templates and contribution sanitization.
- Weapon and armor slot helpers that make equipment act as Known Sources.

### Actions

Move:

```text
lib/automation/level-entry-actions.ts
  -> automation/actions/level-entry-actions.ts
lib/automation/upgrade-actions.ts
  -> automation/actions/upgrade-actions.ts
```

Responsibility:

- Modifier-aware actions that interpret user/system intent.
- Upgrade and level-entry behavior that enters automatic-calculation sync boundaries.

## Files To Keep Outside `automation/`

Keep these in `lib`:

```text
lib/sheet-data.ts
lib/default-sheet-data.ts
lib/sheet-store.ts
lib/sheet-data-migration.ts
lib/sheet-schema-version.ts
lib/character-data-validator.ts
lib/storage.ts
lib/multi-character-storage.ts
lib/html-exporter.ts
lib/html-importer.ts
lib/seal-dice-exporter.ts
lib/number-utils.ts
lib/utils.ts
```

Reasons:

- `sheet-data.ts` is the global save-data shape, not automation internals.
- `default-sheet-data.ts` defines the full sheet default state, not only automated values.
- `sheet-store.ts` is the whole character sheet state boundary; moving it would create broad unrelated churn.
- `sheet-data-migration.ts` and `sheet-schema-version.ts` belong to save-format evolution.
- storage/import/export modules are app boundaries.
- `number-utils.ts` and `utils.ts` are generic utilities.

Keep these outside this release cleanup:

```text
components/modifiers/*
components/character-sheet-sections/*
components/upgrade-popover/*
data/list/*
tests/unit/modifiers/*
tests/unit/equipment/*
tests/unit/automation/*
```

Reasons:

- UI movement would expand the PR from a low-risk domain-module cleanup into a feature-slice reorganization.
- Data-list movement needs a separate decision because those files also represent rules/catalog data, not only automation.
- Test directories can remain grouped by behavior names for now; only their imports need updates.

## Import Mapping

Use mechanical replacements:

```text
@/lib/modifiers/   -> @/automation/core/
@/lib/equipment/   -> @/automation/equipment/
@/lib/automation/  -> @/automation/actions/
```

Examples:

```ts
import { applyAutoCalculationForTargets } from "@/automation/core/target-sync"
import { createEmptyEquipmentData } from "@/automation/equipment/defaults"
import { computeUpgradeAutomation } from "@/automation/actions/upgrade-actions"
```

Do not introduce:

```ts
import { applyAutoCalculationForTargets } from "@/automation"
```

There should be no barrel export in this refactor.

## Task 1: Confirm Branch State

**Files:**
- No source file edits.

- [ ] **Step 1: Check current branch and worktree**

Run:

```bash
git status --short --branch
```

Expected:

```text
## integration/modifier-calculator-v2...origin/integration/modifier-calculator-v2
```

Only this plan document should be uncommitted before implementation starts.

## Task 2: Create Destination Directories

**Files:**
- Create directory: `automation/core`
- Create directory: `automation/equipment`
- Create directory: `automation/actions`

- [ ] **Step 1: Create directories**

Run:

```bash
mkdir -p automation/core automation/equipment automation/actions
```

Expected: command exits with status 0.

## Task 3: Move Files With Git Rename Tracking

**Files:**
- Move files listed in **Target Structure**.

- [ ] **Step 1: Move core files**

Run:

```bash
git mv lib/modifiers/attribute-auto-base.ts automation/core/attribute-auto-base.ts
git mv lib/modifiers/entry-utils.ts automation/core/entry-utils.ts
git mv lib/modifiers/final-input-reconciliation.ts automation/core/final-input-reconciliation.ts
git mv lib/modifiers/hp-stress-invariants.ts automation/core/hp-stress-invariants.ts
git mv lib/modifiers/other-adjustments.ts automation/core/other-adjustments.ts
git mv lib/modifiers/reconcile.ts automation/core/reconcile.ts
git mv lib/modifiers/reference-calculator.ts automation/core/reference-calculator.ts
git mv lib/modifiers/registry.ts automation/core/registry.ts
git mv lib/modifiers/source-definitions.ts automation/core/source-definitions.ts
git mv lib/modifiers/special-contributions.ts automation/core/special-contributions.ts
git mv lib/modifiers/target-accessors.ts automation/core/target-accessors.ts
git mv lib/modifiers/target-sync.ts automation/core/target-sync.ts
git mv lib/modifiers/types.ts automation/core/types.ts
git mv lib/modifiers/upgrade-states.ts automation/core/upgrade-states.ts
```

Expected: command exits with status 0.

- [ ] **Step 2: Move equipment files**

Run:

```bash
git mv lib/equipment/armor-utils.ts automation/equipment/armor-utils.ts
git mv lib/equipment/contribution-utils.ts automation/equipment/contribution-utils.ts
git mv lib/equipment/defaults.ts automation/equipment/defaults.ts
git mv lib/equipment/template-to-slot.ts automation/equipment/template-to-slot.ts
git mv lib/equipment/types.ts automation/equipment/types.ts
git mv lib/equipment/weapon-slot-utils.ts automation/equipment/weapon-slot-utils.ts
```

Expected: command exits with status 0.

- [ ] **Step 3: Move action files**

Run:

```bash
git mv lib/automation/level-entry-actions.ts automation/actions/level-entry-actions.ts
git mv lib/automation/upgrade-actions.ts automation/actions/upgrade-actions.ts
```

Expected: command exits with status 0.

## Task 4: Update Import Specifiers Only

**Files:**
- Modify imports in app, component, data, lib, automation, and test files reported by the stale-import search.

- [ ] **Step 1: Replace moved import prefixes**

Replace every import prefix exactly:

```text
@/lib/modifiers/
@/lib/equipment/
@/lib/automation/
```

with:

```text
@/automation/core/
@/automation/equipment/
@/automation/actions/
```

Expected: no implementation lines change beyond import specifier text.

- [ ] **Step 2: Update imports inside moved files**

After the move, ensure moved files import each other through the same absolute aliases:

```ts
import type { ModifierContribution, ModifierTargetId } from "@/automation/core/types"
import type { EquipmentModifierContribution } from "@/automation/equipment/types"
```

Expected: no `@/lib/modifiers`, `@/lib/equipment`, or `@/lib/automation` imports remain.

## Task 5: Static Verification

**Files:**
- No source edits expected unless missed imports are found.

- [ ] **Step 1: Search for stale imports**

Run:

```bash
rg "@/lib/(modifiers|equipment|automation)" -n --glob '*.{ts,tsx}'
```

Expected: no output.

- [ ] **Step 2: Confirm migration stayed outside automation**

Run:

```bash
test -f lib/sheet-data-migration.ts
test -f lib/sheet-schema-version.ts
```

Expected: both commands exit with status 0.

- [ ] **Step 3: Confirm new automation module contents**

Run:

```bash
find automation -maxdepth 2 -type f | sort
```

Expected: all moved `core`, `equipment`, and `actions` files are listed.

## Task 6: Behavioral Verification

**Files:**
- No source edits expected.

- [ ] **Step 1: Review diff shape**

Run:

```bash
git diff --stat
git diff --name-status --find-renames
```

Expected:

- Domain files show as renames.
- Non-moved files contain import-only edits.
- No test expectation changes.
- No generated `lib/embedded-styles.ts` changes.

- [ ] **Step 2: Run focused tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers tests/unit/equipment tests/unit/automation tests/unit/migration-versioning.test.ts tests/unit/migration-regression-baseline.test.ts tests/unit/storage-migration.test.ts tests/integration/upgrade-cancel-flow.test.tsx
```

Expected: all selected tests pass.

- [ ] **Step 3: Run full test suite**

Run:

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: build passes. If build regenerates `lib/embedded-styles.ts` with only generated output churn, do not include that file in this refactor commit unless the generated content genuinely changed because of the move.

## Task 7: Commit And Push

**Files:**
- Commit only file moves and import specifier updates.

- [ ] **Step 1: Stage the structural refactor**

Run:

```bash
git add automation lib components data tests app hooks
```

Expected: only intended move/import files are staged.

- [ ] **Step 2: Inspect staged diff**

Run:

```bash
git diff --cached --stat
git diff --cached --name-status --find-renames
```

Expected: same shape as Task 6, with no behavior changes.

- [ ] **Step 3: Commit**

Run:

```bash
git commit -m "refactor: move automation domain modules"
```

Expected: one commit created on `integration/modifier-calculator-v2`.

- [ ] **Step 4: Push PR branch**

Run:

```bash
git push origin integration/modifier-calculator-v2
```

Expected: PR #11 updates with the structural refactor commit.

## Follow-Up Architecture Notes

Do not implement these in this release cleanup, but keep them as future candidates:

- Promote sheet migration/versioning into a top-level `sheet-migration/` module.
- Decide whether `data/list/armor.ts`, weapon lists, and upgrade metadata are rules catalog data or automation adapters.
- Decide whether UI modules such as `components/modifiers/*` should stay under global `components` or move into a feature/module directory in a later PR.
- Reduce `lib/sheet-store.ts` responsibility by routing more modifier-aware behavior through explicit automation action modules.
