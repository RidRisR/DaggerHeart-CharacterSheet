# Project Architecture Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create concise project-level agent and architecture rule documents from the approved governance spec.

**Architecture:** `AGENTS.md` is the short entry point. Durable rules live once in focused `docs/architecture/*` files. `CLAUDE.md` becomes a compatibility pointer, and one ADR records the decision without duplicating all rules.

**Tech Stack:** Markdown documentation, existing `docs/superpowers/specs/2026-06-18-project-architecture-governance-design.md`, Git.

---

## Files

- Create: `AGENTS.md`
- Replace: `CLAUDE.md`
- Create: `docs/architecture/project-structure.md`
- Create: `docs/architecture/error-handling.md`
- Create: `docs/architecture/storage-boundaries.md`
- Create: `docs/architecture/ui-business-boundaries.md`
- Create: `docs/architecture/testing.md`
- Create: `docs/architecture/character-data.md`
- Create: `docs/architecture/roadmap.md`
- Create: `docs/adr/0001-agent-rules-and-architecture-governance.md`

## Global Constraints

- Keep every rule document concise.
- Do not repeat a rule in multiple files; link to the owning file.
- Use `Must`, `Should`, and `Avoid` consistently.
- Do not claim existing historical code already follows all rules.
- Do not make `lib/` sound like the target architecture.
- Do not prescribe card DSL syntax, mobile layout, or new public schemas.
- Do not add business code or create a `character/` code directory.

## Task 1: Entry Documents

**Files:**
- Create: `AGENTS.md`
- Replace: `CLAUDE.md`

- [ ] **Step 1: Create `AGENTS.md`**

Create `AGENTS.md` as a short entry document with these sections:

```markdown
# AGENTS.md

## Project

DaggerHeart Character Sheet is a Next.js character sheet and content-pack tool for DaggerHeart.

## Read First

1. `AGENTS.md`
2. `CONTEXT.md`
3. Relevant `docs/contexts/*/CONTEXT.md`
4. Relevant `docs/architecture/*.md`
5. Relevant spec or plan under `docs/superpowers/`

## Rule Levels

- `Must`: required for new work touching the relevant boundary.
- `Should`: default direction; deviations need a clear reason.
- `Avoid`: do not expand this pattern; clean it when the opportunity is local.

## Hard Rules

- Do not start `pnpm dev`, `pnpm start`, or other long-running servers unless the user explicitly asks.
- Default to fast failure. Fallback or legacy paths require case-by-case justification before implementation.
- Keep UI, business behavior, and storage details separated.
- New domain code should not default to `lib/`.
- New internal identifiers, schema fields, storage keys, and filenames should use English unless they are user-facing copy or legacy contracts.
- Keep project rule docs concise and non-repetitive.

## Architecture Docs

- `docs/architecture/project-structure.md`
- `docs/architecture/error-handling.md`
- `docs/architecture/storage-boundaries.md`
- `docs/architecture/ui-business-boundaries.md`
- `docs/architecture/testing.md`
- `docs/architecture/character-data.md`
- `docs/architecture/roadmap.md`

## Commands

- `pnpm install`
- `pnpm test:run`
- `pnpm test:unit`
- `pnpm test:integration`
- `pnpm build`
- `pnpm build:local`
```

- [ ] **Step 2: Replace `CLAUDE.md` with a compatibility pointer**

Replace all old `CLAUDE.md` content with:

```markdown
# CLAUDE.md

Project rules live in `AGENTS.md`.

Claude must read and follow `AGENTS.md` before working in this repository. This file exists only as a compatibility pointer and may be deleted later.
```

- [ ] **Step 3: Verify entry docs are concise**

Run:

```bash
wc -l AGENTS.md CLAUDE.md
```

Expected:

- `AGENTS.md` is short enough to read at session start.
- `CLAUDE.md` is only a compatibility pointer.

- [ ] **Step 4: Commit entry docs**

Run:

```bash
git add AGENTS.md CLAUDE.md
git commit -m "docs: add agent rule entry"
```

## Task 2: Architecture Rule Documents

**Files:**
- Create: `docs/architecture/project-structure.md`
- Create: `docs/architecture/error-handling.md`
- Create: `docs/architecture/storage-boundaries.md`
- Create: `docs/architecture/ui-business-boundaries.md`
- Create: `docs/architecture/testing.md`
- Create: `docs/architecture/character-data.md`
- Create: `docs/architecture/roadmap.md`

- [ ] **Step 1: Create `docs/architecture/project-structure.md`**

Include these sections:

```markdown
# Project Structure

## Must

- Organize new work by domain before reaching for `lib/`.
- Keep React UI in `components/` or route composition in `app/`.
- Keep domain language in `docs/contexts/`.

## Should

- Treat `card/`, `equipment/`, and `automation/` as current domain examples.
- Treat future `character/` as the target home for character data, saves, SheetData schema, migration, import/export, and store boundaries.
- Move responsibilities out of `lib/` when relevant code is already being changed.

## Avoid

- Do not add unrelated domain behavior to `lib/`.
- Do not use `contexts/` for domain documentation; it is for React context code.
```

- [ ] **Step 2: Create `docs/architecture/error-handling.md`**

Include these sections:

```markdown
# Error Handling

## Must

- Default to fast failure for internal invariant violations.
- Discuss and justify every fallback, compatibility path, or parallel logic chain before implementation.
- For any approved fallback, document its trigger, protected data or user experience, diagnostic/error shape, tests, and removal condition.

## Should

- Use structured diagnostics or typed results at import and validation boundaries.
- Keep user-facing copy separate from diagnostic codes.

## Avoid

- Do not add silent fallback to make code appear safer.
- Do not use empty arrays, empty objects, or default values to hide invalid business state.
```

- [ ] **Step 3: Create `docs/architecture/storage-boundaries.md`**

Include these sections:

```markdown
# Storage Boundaries

## Must

- Keep storage keys, backend tables, write order, rollback, and recovery mechanics out of UI and business calculation code.
- Put new storage behavior behind repository and storage backend adapter boundaries.
- Keep application services responsible for use-case orchestration.

## Should

- Use storage format adapters when a domain commit plan must become a concrete stored payload.
- Use runtime adapters when committed storage must refresh runtime read models.
- Clean direct localStorage or IndexedDB access when relevant code is already being changed.

## Avoid

- Do not copy existing direct localStorage or IndexedDB patterns into new code.
- Do not make UI components own storage transactions.
```

- [ ] **Step 4: Create `docs/architecture/ui-business-boundaries.md`**

Include these sections:

```markdown
# UI and Business Boundaries

## Must

- Keep business rules, migrations, import commits, automatic calculation, and storage transactions out of React component internals.
- Let components trigger user intent; let business/application code interpret that intent.

## Should

- Keep important business behavior testable without mounting React.
- Treat complex hooks as UI orchestration unless they delegate domain behavior to a clearer boundary.
- Use this separation before designing major mobile-specific UI changes.

## Avoid

- Do not infer business truth from DOM state.
- Do not make component-local state the only source of a business transaction.
```

- [ ] **Step 5: Create `docs/architecture/testing.md`**

Include these sections:

```markdown
# Testing

## Must

- Add boundary tests for new application services, repositories, adapters, and pure domain functions.
- Test approved fallback or legacy paths for trigger conditions, diagnostics, and isolation from the normal path.
- Test storage transactions for write order, failure result, rollback, and recovery-required states.

## Should

- Prefer non-React tests for business rules.
- Keep UI tests focused on interaction and wiring.
- Prefer colocated `__tests__` folders for new domain tests.

## Avoid

- Do not make large snapshots, localized copy, or DOM internals the main assertion for architecture boundaries.
- Do not move historical `tests/unit` files just for folder symmetry.
```

- [ ] **Step 6: Create `docs/architecture/character-data.md`**

Include these sections:

```markdown
# Character Data

## Must

- Raw imported character data must pass through character import validation and `SheetData` migration before it is saved as an imported character or enters the production store replacement path.
- Imported save creation and production store replacement paths must receive current-schema `SheetData`.
- `replaceSheetData` and similar low-level entries must not become raw legacy repair points.
- `SheetData` schema changes must update types, defaults, migration/normalization, current-schema validation, and import/migration tests together.

## Should

- Treat future `character/` as the target domain for character data, saves, schema, migration, import/export, and store boundaries.
- Move responsibilities out of `lib/sheet-*`, `lib/multi-character-storage.ts`, and `lib/character-data-validator.ts` when relevant work touches them.

## Avoid

- Do not preserve stale field lists from old `CLAUDE.md`.
- Do not expand character-data responsibilities inside `lib/`.
```

- [ ] **Step 7: Create `docs/architecture/roadmap.md`**

Include concise sections for:

```markdown
# Architecture Roadmap

## Card Automation DSL

- Direction: design a card automation DSL and new card pack data structure.
- Current constraints: do not hard-code new automation effects in UI or infer structure from free text.
- Near-term opportunities: card import validation, runtime projection, modifier source definitions, editor import/export.
- Non-goals: no DSL syntax or new public schema in this governance step.

## Mobile UX

- Direction: improve mobile experience.
- Current constraints: first separate UI from business behavior.
- Near-term opportunities: sheet actions, selection flows, import commits, automatic calculation entry points.
- Non-goals: no mobile information architecture decision in this governance step.

## Internationalization

- Direction: prepare for future i18n.
- Current constraints: new internal identifiers, schema fields, storage keys, and filenames should use English.
- Near-term opportunities: touched modules with Chinese internal variable names.
- Non-goals: no full translation system in this governance step.

## Storage Replacement

- Direction: make persistence replaceable beyond localStorage and IndexedDB.
- Current constraints: new storage behavior must use explicit boundaries.
- Near-term opportunities: character saves, content packs, imported assets.
- Non-goals: no new backend implementation in this governance step.

## Domain-First Migration

- Direction: reduce `lib/` by moving responsibilities to domain homes.
- Current constraints: new domain code should not default to `lib/`.
- Near-term opportunities: character data, import/export, storage services.
- Non-goals: no one-shot directory migration.
```

- [ ] **Step 8: Verify architecture docs avoid repeated full rules**

Run:

```bash
rg -n 'Fallbacks, legacy compatibility paths|Raw imported character data|Do not start `pnpm dev`' AGENTS.md docs/architecture
```

Expected:

- Long rules appear only in their owning architecture document.
- `AGENTS.md` contains only short summaries and links.

- [ ] **Step 9: Commit architecture docs**

Run:

```bash
git add docs/architecture
git commit -m "docs: add architecture governance rules"
```

## Task 3: ADR and Final Verification

**Files:**
- Create: `docs/adr/0001-agent-rules-and-architecture-governance.md`

- [ ] **Step 1: Create ADR directory and ADR file**

Create `docs/adr/0001-agent-rules-and-architecture-governance.md`:

```markdown
# 0001: Agent Rules and Architecture Governance

## Status

Accepted

## Context

`CLAUDE.md` had become stale and mixed tool-specific guidance with architecture notes. The project also needs durable rules for domain-first organization, fast failure, UI/business separation, and storage boundaries.

## Decision

- Use `AGENTS.md` as the project rule entry.
- Keep detailed durable rules under `docs/architecture/`.
- Keep `CLAUDE.md` only as a compatibility pointer.
- Default to fast failure; approve fallback and legacy paths case by case.
- Move future development toward domain-first structure.
- Treat historical violations as migration debt, not as patterns to copy.

## Consequences

- Agents have one short entry point.
- Architecture rules can evolve without duplicating `AGENTS.md`.
- Existing code may violate new rules until touched by relevant work.
- Future work must justify fallback, direct storage access, and UI-owned business behavior.
```

- [ ] **Step 2: Run documentation checks**

Run:

```bash
rg -n 'TB[D]|TO[D]O|PLACEHOLD[E]R|\\?\\?' AGENTS.md CLAUDE.md docs/architecture docs/adr
git diff --check
```

Expected:

- No placeholder matches.
- No whitespace errors.

- [ ] **Step 3: Review file sizes**

Run:

```bash
wc -l AGENTS.md CLAUDE.md docs/architecture/*.md docs/adr/*.md
```

Expected:

- `AGENTS.md` remains short.
- Each architecture file is focused and not a large essay.

- [ ] **Step 4: Commit ADR and verification cleanup**

Run:

```bash
git add docs/adr
git commit -m "docs: record architecture governance decision"
```

- [ ] **Step 5: Final status**

Run:

```bash
git status --short --branch
git log --oneline -5
```

Expected:

- Worktree is clean.
- Recent commits include entry docs, architecture docs, ADR, and this plan.
