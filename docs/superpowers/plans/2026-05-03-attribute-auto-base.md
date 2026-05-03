# Attribute Auto Base Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically record a manual base for six attributes when a level-1 character fills an empty attribute field for the first time.

**Architecture:** Add pure helper logic in `lib/modifiers/attribute-auto-base.ts` so creation/removal rules can be tested without React. Wire `AttributesSection` to capture edit-start values and call existing Zustand store actions after attribute changes.

**Tech Stack:** TypeScript, React 19, Zustand, Vitest, Testing Library.

---

## File Structure

- Create `lib/modifiers/attribute-auto-base.ts`: target validation, stable auto-base id generation, entry creation, create/remove decision helpers.
- Create `tests/unit/modifiers/attribute-auto-base.test.ts`: pure tests for level, empty-start, expression parsing, existing user bases, and safe removal.
- Modify `components/character-sheet-sections/attributes-section.tsx`: record focus-start values and call helper/store actions on change/blur/Enter.
- Modify `tests/unit/modifiers/modifier-popover.test.tsx` or add `tests/unit/modifiers/attribute-auto-base-section.test.tsx`: component-level tests for actual six-attribute inputs.

## Task 1: Pure Attribute Auto Base Helper

**Files:**
- Create: `lib/modifiers/attribute-auto-base.ts`
- Create: `tests/unit/modifiers/attribute-auto-base.test.ts`

- [ ] **Step 1: Write failing pure helper tests**

Tests cover:

- `getAttributeAutoBaseId("agility.value")` returns `user:agility.value:auto-base`.
- level 1 empty-start input `12+1` creates an entry with value `13`.
- level `""` and `"abc"` are treated as 1.
- level 2 does not create.
- non-empty start does not create.
- existing user base does not create.
- clear removes only when auto base is the sole user base.

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/attribute-auto-base.test.ts
```

Expected: FAIL because helper file does not exist.

- [ ] **Step 3: Implement helper**

Implement exported helpers:

```ts
getAttributeAutoBaseId(target: AttributeTargetId): ModifierEntryId
createAttributeAutoBaseEntry(target: AttributeTargetId, value: number): UserModifierEntry
getAttributeAutoBaseCreation(input): UserModifierEntry | undefined
shouldRemoveAttributeAutoBase(input): boolean
```

Use `parseNumberOr(level, 1)` and `tryParseNumberExpression(value)`.

- [ ] **Step 4: Run test and verify pass**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/attribute-auto-base.test.ts
```

Expected: PASS.

## Task 2: Wire AttributesSection

**Files:**
- Modify: `components/character-sheet-sections/attributes-section.tsx`
- Create: `tests/unit/modifiers/attribute-auto-base-section.test.tsx`

- [ ] **Step 1: Write failing section tests**

Tests render `AttributesSection`, then:

- level 1 empty agility input `12+1` creates `user:agility.value:auto-base` with value `13` and keeps final value `"12+1"`.
- level 2 empty agility input `12+1` does not create base.
- non-empty agility input edited to `12+1` does not create base.
- clearing an attribute with only auto base removes it.
- clearing an attribute with another user base keeps both state under user control and does not auto-remove.

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/attribute-auto-base-section.test.tsx
```

Expected: FAIL because `AttributesSection` has no auto-base behavior.

- [ ] **Step 3: Implement section wiring**

In `AttributesSection`:

- track edit-start value by attribute key on focus;
- keep existing `updateAttribute` on change;
- on blur and Enter, run create/remove helpers using current `sheetData`;
- call `upsertUserModifierEntry`, `setActiveModifierBase`, and `removeUserModifierEntry` as needed.

- [ ] **Step 4: Run test and verify pass**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/attribute-auto-base-section.test.tsx
```

Expected: PASS.

## Task 3: Regression Verification and Commit

**Files:**
- Verify only, then commit.

- [ ] **Step 1: Run targeted regression suite**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers tests/unit/automation tests/unit/number-utils.test.ts
```

Expected: PASS.

- [ ] **Step 2: Inspect diff**

Run:

```bash
git diff --stat
git diff -- lib/modifiers/attribute-auto-base.ts components/character-sheet-sections/attributes-section.tsx tests/unit/modifiers/attribute-auto-base.test.ts tests/unit/modifiers/attribute-auto-base-section.test.tsx
```

Expected: diff is limited to helper, attributes section, tests, and this plan.

- [ ] **Step 3: Commit**

Run:

```bash
git add lib/modifiers/attribute-auto-base.ts components/character-sheet-sections/attributes-section.tsx tests/unit/modifiers/attribute-auto-base.test.ts tests/unit/modifiers/attribute-auto-base-section.test.tsx docs/superpowers/plans/2026-05-03-attribute-auto-base.md
git commit -m "feat(modifiers): auto-create attribute base"
```

Expected: commit succeeds.
