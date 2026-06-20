# Architecture Roadmap

## Card Automation DSL

- Direction: design a card automation DSL and new card pack data structure.
- Constraint: automation effect definitions need an owning design outside UI hard-coding; free text is not a structure source.
- Near-term opportunities: card import validation, runtime projection, modifier source definitions, editor import/export.
- Non-goals: no DSL syntax or new public schema in this governance step.

## Mobile UX

- Direction: improve mobile experience.
- Constraint: UI/business separation comes before mobile information architecture decisions; see `ui-business-boundaries.md`.
- Near-term opportunities: sheet actions, selection flows, import commits, automatic calculation entry points.
- Non-goals: no mobile information architecture decision in this governance step.

## Internationalization

- Direction: prepare for future i18n.
- Constraint: English is the target language for new internal identifiers, schema fields, storage keys, and filenames; user-facing copy and legacy contracts are separate concerns.
- Near-term opportunities: touched modules with Chinese internal variable names.
- Non-goals: no full translation system in this governance step.

## Storage Replacement

- Direction: make persistence replaceable beyond localStorage and IndexedDB.
- Constraint: explicit storage boundaries own new storage behavior; see `storage-boundaries.md`.
- Near-term opportunities: character saves, content packs, imported assets.
- Non-goals: no new backend implementation in this governance step.

## Domain-First Migration

- Direction: reduce `lib/` by moving responsibilities to domain homes.
- Constraint: new domain code belongs in domain homes rather than `lib/`; see `project-structure.md`.
- Near-term opportunities: character data, import/export, storage services.
- Non-goals: no one-shot directory migration.
