# Modifier Calculator Main Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate `feature/modifier-calculator-v2` into `main` without carrying its 206 exploratory commits into mainline history.

**Architecture:** Treat the feature branch as a final diff, not as a commit history to preserve. Create a fresh integration branch from latest `main`, squash-apply the feature branch, then rebuild the result as a small set of reviewable semantic commits with explicit verification after each major stage.

**Tech Stack:** Git worktrees/branches, Next.js 15, React 19, TypeScript, Vitest.

---

## Current Branch Shape

- Source branch: `feature/modifier-calculator-v2`
- Base branch: `main`
- Current delta: 206 commits and 126 files relative to `main`
- Main risk areas: schema migration, persisted sheet compatibility, modifier store actions, equipment contribution migration, automation behavior, popover UI regressions

## Target History

Final integration branch should contain 6 to 8 commits:

1. `feat: add modifier calculation model`
2. `feat: migrate equipment data to contribution providers`
3. `feat: migrate sheet data for modifier provider state`
4. `feat: route automation through modifier providers`
5. `feat: add modifier provider UI`
6. `feat: refine sheet sections for calculated targets`
7. `docs: document modifier architecture`
8. Optional: `test: cover modifier and migration regressions` if test-only changes do not fit cleanly with their feature commits

Keep implementation and its direct tests together when possible. Use the optional test-only commit only for broad regression fixtures or baselines that span several areas.

## Branch Policy

- Do not force-push `feature/modifier-calculator-v2`.
- Do not merge `feature/modifier-calculator-v2` directly into `main`.
- Keep a backup branch before history surgery.
- Open the PR from `integration/modifier-calculator-v2` into `main`.
- Prefer PR squash merge only if the integration branch still feels noisy after cleanup. If the integration branch is clean, normal merge is acceptable.

---

## Task 1: Preflight And Backup

**Files:**
- Read-only: repository state

- [ ] **Step 1: Confirm source worktree is clean**

Run:

```bash
git status --short --branch
```

Expected:

```text
## feature/modifier-calculator-v2...origin/feature/modifier-calculator-v2
```

If extra modified files appear, decide whether they belong to the feature before continuing.

- [ ] **Step 2: Create a backup pointer**

Run:

```bash
git branch backup/modifier-calculator-v2-before-integration feature/modifier-calculator-v2
```

Expected: no output.

- [ ] **Step 3: Fetch latest remote refs**

Run:

```bash
git fetch origin main feature/modifier-calculator-v2
```

Expected: fetch completes without rejected refs.

- [ ] **Step 4: Reconfirm source branch delta**

Run:

```bash
git rev-list --count origin/main..feature/modifier-calculator-v2
git diff --stat origin/main...feature/modifier-calculator-v2
```

Expected: commit count remains high; diff includes modifier, equipment, migration, automation, UI, docs, and tests.

---

## Task 2: Create The Integration Branch

**Files:**
- Modify later: final squashed working tree on `integration/modifier-calculator-v2`

- [ ] **Step 1: Start from latest main**

Run:

```bash
git checkout main
git pull --ff-only origin main
git checkout -b integration/modifier-calculator-v2
```

Expected:

```text
Switched to a new branch 'integration/modifier-calculator-v2'
```

- [ ] **Step 2: Apply feature branch as one staged diff**

Run:

```bash
git merge --squash feature/modifier-calculator-v2
```

Expected: Git reports a squash merge and leaves changes staged.

- [ ] **Step 3: Unstage everything for manual commit slicing**

Run:

```bash
git reset
```

Expected: working tree contains the feature diff, with no files staged.

- [ ] **Step 4: Remove obvious local noise**

Run:

```bash
git restore --staged .DS_Store
git restore .DS_Store
```

Expected: `.DS_Store` no longer appears in `git status --short`.

If `.DS_Store` does not exist in the index or worktree, Git may print a pathspec error. In that case, continue and verify with:

```bash
git status --short -- .DS_Store
```

Expected: no output.

---

## Task 3: Commit Modifier Core

**Files:**
- Add/modify: `lib/modifiers/*`
- Add/modify: `tests/unit/modifiers/*`
- Modify if needed: `lib/number-utils.ts`
- Modify if needed: `tests/unit/number-utils.test.ts`

- [ ] **Step 1: Stage modifier model and direct tests**

Run:

```bash
git add lib/modifiers tests/unit/modifiers lib/number-utils.ts tests/unit/number-utils.test.ts
git diff --cached --stat
```

Expected: staged files are focused on modifier source definitions, target accessors, reconciliation, final input handling, other adjustments, upgrade state helpers, and modifier tests.

- [ ] **Step 2: Review staged diff**

Run:

```bash
git diff --cached -- lib/modifiers tests/unit/modifiers
```

Expected: no component UI, equipment data lists, or sheet migration bulk changes are included except shared number parsing support.

- [ ] **Step 3: Run focused tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers tests/unit/number-utils.test.ts
```

Expected: Vitest exits with code 0.

- [ ] **Step 4: Commit modifier core**

Run:

```bash
git commit -m "feat: add modifier calculation model"
```

Expected: one commit created on `integration/modifier-calculator-v2`.

---

## Task 4: Commit Equipment Contribution Model

**Files:**
- Add/modify: `lib/equipment/*`
- Modify: `data/list/armor.ts`
- Modify: `data/list/all-weapons.ts`
- Modify: `data/list/primary-weapon.ts`
- Modify: `data/list/secondary-weapon.ts`
- Add/modify: `tests/unit/equipment/*`
- Modify if needed: `tests/unit/character-sheet-equipment.test.tsx`

- [ ] **Step 1: Stage equipment runtime and tests**

Run:

```bash
git add lib/equipment data/list/armor.ts data/list/all-weapons.ts data/list/primary-weapon.ts data/list/secondary-weapon.ts tests/unit/equipment tests/unit/character-sheet-equipment.test.tsx
git diff --cached --stat
```

Expected: staged diff contains equipment slot helpers, template conversion, contribution helpers, equipment defaults, data-list updates, and equipment tests.

- [ ] **Step 2: Review staged diff**

Run:

```bash
git diff --cached -- lib/equipment data/list tests/unit/equipment
```

Expected: no modifier popover UI or sheet-store action rewrites are staged unless required by equipment type signatures.

- [ ] **Step 3: Run focused tests**

Run:

```bash
npm run test:run -- tests/unit/equipment tests/unit/character-sheet-equipment.test.tsx
```

Expected: Vitest exits with code 0.

- [ ] **Step 4: Commit equipment contribution model**

Run:

```bash
git commit -m "feat: migrate equipment data to contribution providers"
```

Expected: one commit created.

---

## Task 5: Commit Schema, Validation, Migration, And Store State

**Files:**
- Modify: `lib/sheet-data.ts`
- Modify: `lib/default-sheet-data.ts`
- Modify: `lib/sheet-schema-version.ts`
- Modify: `lib/sheet-data-migration.ts`
- Modify: `lib/character-data-validator.ts`
- Modify: `lib/sheet-store.ts`
- Modify: `lib/seal-dice-exporter.ts`
- Add/modify: `tests/unit/migration-versioning.test.ts`
- Add/modify: `tests/unit/migration-regression-baseline.test.ts`
- Add/modify: `tests/unit/import-regression-baseline.test.ts`
- Add/modify: `tests/unit/storage-migration.test.ts`
- Add/modify: `tests/unit/character-data-validator.test.ts`
- Add/modify: `tests/unit/seal-dice-exporter.test.ts`

- [ ] **Step 1: Stage migration and persistence layer**

Run:

```bash
git add lib/sheet-data.ts lib/default-sheet-data.ts lib/sheet-schema-version.ts lib/sheet-data-migration.ts lib/character-data-validator.ts lib/sheet-store.ts lib/seal-dice-exporter.ts tests/unit/migration-versioning.test.ts tests/unit/migration-regression-baseline.test.ts tests/unit/import-regression-baseline.test.ts tests/unit/storage-migration.test.ts tests/unit/character-data-validator.test.ts tests/unit/seal-dice-exporter.test.ts
git diff --cached --stat
```

Expected: staged diff contains schema additions, defaults, import validation, v1/v2 migration, store actions, and export compatibility tests.

- [ ] **Step 2: Review schema migration boundaries**

Run:

```bash
git diff --cached -- lib/sheet-data-migration.ts lib/sheet-data.ts lib/sheet-store.ts
```

Expected: migration code handles old saves, equipment contribution backfill, legacy modifier state, HP/stress/armor final values, and invalid numeric input without depending on UI components.

- [ ] **Step 3: Run focused persistence tests**

Run:

```bash
npm run test:run -- tests/unit/migration-versioning.test.ts tests/unit/migration-regression-baseline.test.ts tests/unit/import-regression-baseline.test.ts tests/unit/storage-migration.test.ts tests/unit/character-data-validator.test.ts tests/unit/seal-dice-exporter.test.ts tests/unit/modifiers/migration.test.ts tests/unit/modifiers/store-actions.test.ts
```

Expected: Vitest exits with code 0.

- [ ] **Step 4: Commit migration and store state**

Run:

```bash
git commit -m "feat: migrate sheet data for modifier provider state"
```

Expected: one commit created.

---

## Task 6: Commit Automation Integration

**Files:**
- Add/modify: `lib/automation/*`
- Modify: `components/upgrade-popover/attribute-upgrade-editor.tsx`
- Modify: `components/upgrade-popover/experience-values-editor.tsx`
- Modify: `components/upgrade-popover/hp-max-editor.tsx`
- Modify: `components/upgrade-popover/new-experience-editor.tsx`
- Modify: `components/upgrade-popover/stress-max-editor.tsx`
- Delete if already superseded: `components/upgrade-popover/evasion-editor.tsx`
- Add/modify: `tests/unit/automation/*`
- Add/modify: `tests/integration/upgrade-cancel-flow.test.tsx`
- Modify if needed: `tests/unit/level-proficiency.test.ts`

- [ ] **Step 1: Stage automation and upgrade editor changes**

Run:

```bash
git add lib/automation components/upgrade-popover tests/unit/automation tests/integration/upgrade-cancel-flow.test.tsx tests/unit/level-proficiency.test.ts
git diff --cached --stat
```

Expected: staged diff contains level entry automation, upgrade actions, upgrade-state provider behavior, and automation tests.

- [ ] **Step 2: Review staged diff**

Run:

```bash
git diff --cached -- lib/automation components/upgrade-popover tests/unit/automation tests/integration/upgrade-cancel-flow.test.tsx
```

Expected: automation writes and rollback behavior go through modifier provider state rather than legacy hidden snapshots.

- [ ] **Step 3: Run focused automation tests**

Run:

```bash
npm run test:run -- tests/unit/automation tests/integration/upgrade-cancel-flow.test.tsx tests/unit/level-proficiency.test.ts
```

Expected: Vitest exits with code 0.

- [ ] **Step 4: Commit automation integration**

Run:

```bash
git commit -m "feat: route automation through modifier providers"
```

Expected: one commit created.

---

## Task 7: Commit Modifier And Equipment UI

**Files:**
- Add: `components/modifiers/equipment-provider-popover.tsx`
- Add: `components/modifiers/modifier-field-anchor.tsx`
- Add/modify: `components/modifiers/modifier-popover.tsx`
- Modify: `components/character-sheet-sections/armor-section.tsx`
- Modify: `components/character-sheet-sections/attributes-section.tsx`
- Modify: `components/character-sheet-sections/experience-section.tsx`
- Modify: `components/character-sheet-sections/header-section.tsx`
- Modify: `components/character-sheet-sections/hit-points-section.tsx`
- Modify: `components/character-sheet-sections/inventory-weapon-section.tsx`
- Modify: `components/character-sheet-sections/weapon-section.tsx`
- Modify: `components/modals/armor-selection-modal.tsx`
- Modify: `components/modals/weapon-selection-modal.tsx`
- Add/modify: `tests/unit/modifiers/equipment-provider-popover.test.tsx`
- Add/modify: `tests/unit/modifiers/modifier-popover.test.tsx`
- Add/modify: `tests/unit/modifiers/final-target-editors.test.tsx`
- Add/modify: `tests/unit/modifiers/attribute-auto-base-section.test.tsx`

- [ ] **Step 1: Stage popovers, anchors, sheet-section integrations, and UI tests**

Run:

```bash
git add components/modifiers components/character-sheet-sections components/modals tests/unit/modifiers/equipment-provider-popover.test.tsx tests/unit/modifiers/modifier-popover.test.tsx tests/unit/modifiers/final-target-editors.test.tsx tests/unit/modifiers/attribute-auto-base-section.test.tsx
git diff --cached --stat
```

Expected: staged diff contains provider popovers, field anchors, armor/weapon/attribute/hp/stress target editor integration, and direct UI tests.

- [ ] **Step 2: Review staged diff**

Run:

```bash
git diff --cached -- components/modifiers components/character-sheet-sections components/modals
```

Expected: no schema migration, equipment data-list, or docs-only changes are staged.

- [ ] **Step 3: Run focused UI tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/equipment-provider-popover.test.tsx tests/unit/modifiers/modifier-popover.test.tsx tests/unit/modifiers/final-target-editors.test.tsx tests/unit/modifiers/attribute-auto-base-section.test.tsx tests/unit/use-auto-resize-font.test.tsx
```

Expected: Vitest exits with code 0.

- [ ] **Step 4: Commit modifier and equipment UI**

Run:

```bash
git commit -m "feat: add modifier provider UI"
```

Expected: one commit created.

---

## Task 8: Commit Remaining Sheet Composition And Guide Changes

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/character-sheet.tsx`
- Modify: `components/character-sheet-page-two.tsx`
- Modify: `components/character-sheet-page-two-sections/upgrade-section.tsx`
- Modify: `components/guide/guide-content.ts`
- Modify: `hooks/use-auto-resize-font.ts`
- Modify: `lib/embedded-styles.ts`
- Modify: `.eslintrc.json`
- Add/modify: `tests/unit/guide-content.test.ts`
- Add/modify: `tests/unit/use-auto-resize-font.test.tsx`
- Add/modify: `tests/unit/automation/component-smoke.test.tsx`

- [ ] **Step 1: Stage remaining app composition changes**

Run:

```bash
git add app/page.tsx components/character-sheet.tsx components/character-sheet-page-two.tsx components/character-sheet-page-two-sections/upgrade-section.tsx components/guide/guide-content.ts hooks/use-auto-resize-font.ts lib/embedded-styles.ts .eslintrc.json tests/unit/guide-content.test.ts tests/unit/use-auto-resize-font.test.tsx tests/unit/automation/component-smoke.test.tsx
git diff --cached --stat
```

Expected: staged diff contains page composition, guide content, embedded styles, resize hook behavior, and smoke tests.

- [ ] **Step 2: Review staged diff**

Run:

```bash
git diff --cached -- app/page.tsx components/character-sheet.tsx components/character-sheet-page-two.tsx components/character-sheet-page-two-sections/upgrade-section.tsx
```

Expected: changes connect the new provider architecture to the full sheet without introducing unrelated visual rewrites.

- [ ] **Step 3: Run focused tests**

Run:

```bash
npm run test:run -- tests/unit/guide-content.test.ts tests/unit/use-auto-resize-font.test.tsx tests/unit/automation/component-smoke.test.tsx
```

Expected: Vitest exits with code 0.

- [ ] **Step 4: Commit sheet composition**

Run:

```bash
git commit -m "feat: refine sheet sections for calculated targets"
```

Expected: one commit created.

---

## Task 9: Commit Documentation

**Files:**
- Modify: `CONTEXT.md`
- Add/modify: `docs/equipment-modifier-data-decisions.md`
- Add/modify: `docs/superpowers/plans/*`
- Add/modify: `docs/superpowers/specs/*`
- Delete only if intentionally obsolete: `docs/attribute-upgrade-interaction-improvement.md`
- Delete only if intentionally obsolete: `docs/upgrade-section-refactor-plan.md`
- Delete only if intentionally obsolete: `docs/superpowers/plans/2026-05-10-migration-versioning.md`
- Delete only if intentionally obsolete: `docs/superpowers/specs/2026-05-10-main-migration-versioning-design.md`

- [ ] **Step 1: Review docs deletions before staging**

Run:

```bash
git status --short -- docs
```

Expected: docs additions and deletions are visible. Confirm each deleted doc is superseded by a newer plan/spec before staging.

- [ ] **Step 2: Stage docs**

Run:

```bash
git add CONTEXT.md docs
git diff --cached --stat
```

Expected: staged diff contains only documentation and domain context changes.

- [ ] **Step 3: Commit docs**

Run:

```bash
git commit -m "docs: document modifier architecture"
```

Expected: one commit created.

---

## Task 10: Final Verification

**Files:**
- Read-only: all changed files

- [ ] **Step 1: Confirm nothing accidental remains unstaged**

Run:

```bash
git status --short
```

Expected: no output.

If output remains, inspect it and either commit it into the correct semantic commit with `git commit --amend` or explicitly discard only known noise such as `.DS_Store`.

- [ ] **Step 2: Run the full test suite**

Run:

```bash
npm run test:run
```

Expected: Vitest exits with code 0.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: Next.js build exits with code 0.

- [ ] **Step 4: Inspect final commit list**

Run:

```bash
git log --oneline main..HEAD
```

Expected: 6 to 8 semantic commits, not 206 source-branch commits.

- [ ] **Step 5: Compare final diff with source branch**

Run:

```bash
git diff --stat feature/modifier-calculator-v2...HEAD
```

Expected: no meaningful implementation drift except intentionally removed noise such as `.DS_Store`.

If this command shows unexpected source-code differences, inspect them with:

```bash
git diff feature/modifier-calculator-v2...HEAD -- path/to/file
```

Then either stage the missing intended change or document why the integration branch intentionally diverges.

---

## Task 11: Open Pull Request

**Files:**
- Read-only: final branch state

- [ ] **Step 1: Push integration branch**

Run:

```bash
git push -u origin integration/modifier-calculator-v2
```

Expected: branch is available on origin.

- [ ] **Step 2: Create PR**

Use this PR title:

```text
Integrate modifier calculator provider architecture
```

Use this PR body:

```markdown
## Summary
- Adds the modifier provider model for calculated sheet targets, final input reconciliation, special contributions, and other adjustments.
- Migrates equipment, upgrade automation, and persisted sheet data onto provider-backed modifier state.
- Adds provider popovers and sheet-section integrations for attributes, HP/stress, armor, weapons, proficiency, and equipment contributions.

## Risk Areas
- Save-data migration from legacy modifier/equipment state
- V1 equipment contribution backfill
- HP, stress, armor, and proficiency final-value preservation
- Upgrade rollback and level-entry automation
- Import/export compatibility

## Test Plan
- `npm run test:run`
- `npm run build`
```

- [ ] **Step 3: Review PR diff by commit**

Expected: reviewers can inspect modifier core, equipment model, migration/store, automation, UI, and docs separately.

---

## Rollback Plan

If integration fails before pushing:

```bash
git checkout main
git branch -D integration/modifier-calculator-v2
git checkout feature/modifier-calculator-v2
```

If integration branch was pushed but PR should be abandoned:

```bash
git push origin --delete integration/modifier-calculator-v2
git branch -D integration/modifier-calculator-v2
git checkout feature/modifier-calculator-v2
```

The original source branch remains protected by:

```text
feature/modifier-calculator-v2
backup/modifier-calculator-v2-before-integration
```

## Self-Review Checklist

- Every major subsystem has one semantic commit.
- `.DS_Store` is absent from the final branch.
- Deleted docs are intentionally superseded, not accidental cleanup.
- `npm run test:run` passes.
- `npm run build` passes.
- PR body names migration and compatibility risks explicitly.
