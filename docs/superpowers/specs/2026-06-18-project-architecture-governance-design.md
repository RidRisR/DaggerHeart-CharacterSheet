# Project Architecture Governance Design

## Context

The project currently has an old `CLAUDE.md` that mixes project overview, commands, stale architecture notes, SheetData migration details, page layout rules, and Claude-specific workflow guidance. It is no longer a reliable project-level development guide.

The project also has several long-term architecture pressures:

- future card automation needs a DSL and a new card pack data structure;
- mobile UX work is blocked by UI and business logic being too tightly coupled;
- future internationalization requires internal naming cleanup, especially avoiding new Chinese identifiers in code contracts;
- persistence must move toward clear storage boundaries because future storage may not be limited to localStorage or IndexedDB;
- `lib/` has become an unclear bucket for unrelated responsibilities;
- the project already has domain-oriented areas such as `card/`, `equipment/`, and `automation/`, but those boundaries are not written as project rules.

This design creates project-level rules for future humans and agents without implementing code migration in this step.

## Goals

1. Replace `CLAUDE.md` as the source of project rules with `AGENTS.md`.
2. Keep `AGENTS.md` short and use `docs/architecture/` for detailed rules.
3. Document architecture principles that future development must follow.
4. Make historical debt explicit without requiring an unsafe one-shot cleanup.
5. Record the system-level decision in an ADR.
6. Keep project rule documents concise, non-repetitive, and easy for agents to apply.
7. Preserve useful current facts from `CLAUDE.md` only when they are still accurate.

## Non-Goals

- Do not create a `character/` code directory in this step.
- Do not design card automation DSL syntax.
- Do not publish or implement a new card pack schema.
- Do not migrate existing business code.
- Do not delete `CLAUDE.md` yet.
- Do not preserve stale implementation details from the old `CLAUDE.md`.

## Documentation Outputs

### `AGENTS.md`

`AGENTS.md` becomes the project-level entry point for all coding agents.

It should include:

- project summary;
- reading order for architecture and context docs;
- common commands;
- hard workflow rules, including not starting `pnpm dev` or other long-running servers unless explicitly requested;
- rule severity definitions: `Must`, `Should`, and `Avoid`;
- links to detailed architecture docs.

`AGENTS.md` should stay short enough to be read on every session start.

### `CLAUDE.md`

`CLAUDE.md` becomes a thin compatibility entry. It should point to `AGENTS.md` and state that Claude must follow the same project rules.

It should not keep duplicated project rules. Long term, it may be deleted once no tool depends on it.

### Documentation Style

Project rule documents should be short and direct.

Rules:

- say each rule once, then link to the owning document instead of repeating it;
- prefer concrete rules over background explanation;
- remove filler, motivational language, and long examples unless they prevent likely mistakes;
- keep `AGENTS.md` as an index and rule summary, not a second copy of `docs/architecture/`;
- keep architecture docs focused on durable rules, not current implementation trivia.

### `docs/architecture/project-structure.md`

This document defines domain-first project organization.

Confirmed direction:

- `card/` owns card templates, card pack import, card pack storage, and card runtime read models.
- `equipment/` owns equipment templates, equipment pack import, equipment pack storage, and equipment runtime cache/readers.
- `automation/` owns character-sheet automatic calculation, modifier behavior, upgrades, and equipment contribution logic.
- `components/` owns React presentation and interaction surfaces, not business transactions or storage details.
- `app/` owns Next.js routes and page composition.
- `contexts/` owns React context providers and must not be confused with domain context docs.
- `docs/contexts/` owns domain language.
- future `character/` should own character data, saves, SheetData schema/migration/import/export/store boundaries.

`lib/` is treated as a historical shared bucket. New domain code should not default to `lib/`. Existing `lib/` files may remain until touched by relevant work.

### `docs/architecture/error-handling.md`

The default project rule is fast failure.

Fallbacks, legacy compatibility paths, and multiple logic chains must be approved case by case before implementation. Any proposed fallback must explain:

- why fast failure is not acceptable;
- which user data, historical format, or product experience it protects;
- exact trigger conditions;
- diagnostics, errors, or migration records it produces;
- tests that lock the boundary;
- when the fallback can be removed.

Agents must not add fallback behavior just to make code appear more robust.

### `docs/architecture/storage-boundaries.md`

New storage-related work must separate business behavior from persistence details.

New features, new storage capabilities, and new import/commit paths must not put storage keys, localStorage/IndexedDB reads, write order, table names, rollback, or recovery mechanics inside UI or business calculation code.

Expected boundaries:

- application service coordinates use cases;
- repository owns persistent state operations at the domain boundary;
- storage format adapter converts domain commit plans into storage payloads;
- storage backend adapter owns concrete backend details;
- runtime adapter refreshes runtime read models after commit.

Existing direct storage access is historical debt. Related work should clean boundaries opportunistically and must not spread direct storage patterns.

### `docs/architecture/ui-business-boundaries.md`

UI and business behavior must be separated.

Rules:

- new business rules, migrations, import commits, automatic calculation, and storage transactions must not live only inside React components or hook event handlers;
- components should trigger user intent;
- business/application layers should interpret intent and return explicit results;
- complex hooks may orchestrate UI, but should not be the only implementation of domain rules;
- important business behavior should be testable without mounting React;
- component state and DOM state must not be treated as the source of business truth.

Mobile UX remains a roadmap direction. The current blocker is tight UI/business coupling, so this governance step does not prescribe mobile layouts.

### `docs/architecture/testing.md`

The project already has useful boundary testing patterns in `card/packs`, `equipment/packs`, `card/import`, and `equipment/import`. The architecture rules should make those patterns explicit.

Rules:

- new application services, repositories, adapters, and pure domain functions must have boundary tests;
- approved fallback or legacy compatibility paths must test trigger conditions, diagnostics, and isolation from the normal path;
- storage transactions must test write order, failure results, rollback, and recovery-required states;
- business rules should usually be tested without React;
- UI tests should focus on interaction and wiring;
- new domain tests should prefer colocated `__tests__` folders in the domain directory;
- avoid large snapshots, localized copy, and DOM internals as the main assertions for architecture boundaries.

Historical tests under `tests/unit` do not need to be moved immediately.

### `docs/architecture/character-data.md`

The old `CLAUDE.md` SheetData section is not migrated directly because many details are stale. Only current invariants should be documented.

Current invariants:

1. Raw imported character data must pass through character import validation and the `SheetData` migration pipeline before it can be saved as an imported character or enter the production store replacement path.
2. Imported save creation and production store replacement paths must receive current-schema `SheetData`. Low-level entries such as `replaceSheetData` must not be used as raw legacy data repair points.
3. A `SheetData` schema change must update type definitions, default data, migration/normalization logic, current-schema validation, and import/migration tests together.
4. Character data is future-owned by the `character/` domain. Existing `lib/sheet-*`, `lib/multi-character-storage.ts`, and `lib/character-data-validator.ts` are historical locations. New development and relevant refactors should move responsibilities out of `lib/` over time.

### `docs/architecture/roadmap.md`

The roadmap document should use this structure for each long-term direction:

- Direction
- Current constraints
- Near-term opportunities
- Non-goals

Initial roadmap topics:

- card automation DSL and new card pack data structure;
- mobile UX through UI/business separation first;
- internationalization readiness and internal English naming;
- storage backend replacement through storage boundary cleanup;
- domain-first directory migration and `lib/` reduction.

Card automation should be constrained now, but DSL syntax and a new public schema remain out of scope for this governance step.

### `docs/adr/0001-agent-rules-and-architecture-governance.md`

Create a system-level ADR that records:

- `AGENTS.md` replaces `CLAUDE.md` as the project rule entry;
- detailed rules live under `docs/architecture/`;
- development moves toward domain-first organization;
- fast failure is the default;
- fallback and legacy paths require case-by-case justification;
- UI/business and business/storage boundaries are core long-term architecture goals;
- historical debt is migrated gradually instead of by a one-shot cleanup.

The ADR should capture the decision and trade-offs. It should not duplicate all detailed rules.

## Rule Severity

Use three levels in architecture docs:

- `Must`: required for new development or changes that touch the relevant boundary.
- `Should`: default direction; deviations need a clear reason.
- `Avoid`: long-term cleanup direction or pattern that should not expand.

Historical code may violate new rules. The rule files should distinguish existing debt from new development.

## Current Evidence

Current code already supports parts of the proposed direction:

- card pack application service and repository tests cover dry-run behavior, commit orchestration, runtime refresh failure, and rollback behavior;
- card pack repository tests cover content/image/index write order and rollback;
- equipment service tests already check that UI/card editor equipment modules do not directly import storage implementations;
- card import tests already show explicit legacy fallback behavior and unsupported-format fast failure.

The new docs should elevate these patterns to project-level expectations.

## Implementation Order

1. Write `AGENTS.md` as the thin entry point.
2. Replace `CLAUDE.md` with a compatibility pointer to `AGENTS.md`.
3. Add `docs/architecture/project-structure.md`.
4. Add `docs/architecture/error-handling.md`.
5. Add `docs/architecture/storage-boundaries.md`.
6. Add `docs/architecture/ui-business-boundaries.md`.
7. Add `docs/architecture/testing.md`.
8. Add `docs/architecture/character-data.md`.
9. Add `docs/architecture/roadmap.md`.
10. Add the ADR.
11. Review all docs for stale implementation claims and inconsistent rule severity.

## Review Checklist

- Do not claim historical code already follows every rule.
- Do not make `lib/` look like the future architecture.
- Do not preserve stale `CLAUDE.md` SheetData field lists.
- Do not prescribe card DSL syntax or mobile UI layout.
- Distinguish fast failure from approved compatibility behavior.
- Avoid repeating the same rule in multiple documents.
- Keep rule text concise enough for repeated agent reads.
- Guide agents without making the docs agent-only project knowledge.
