# Character Data

## Must

- Raw imported character data must pass through character import validation and `SheetData` migration before it is saved as an imported character or enters the production store replacement path.
- Imported save creation and production store replacement paths must receive current-schema `SheetData`.
- `replaceSheetData` and similar low-level entries must not become raw legacy repair points.
- `SheetData` schema changes must update types, defaults, migration/normalization, current-schema validation, and import/migration tests together.

## Should

- Treat future `character/` as the owner of character data boundaries; see `project-structure.md` for directory rules.
- Treat existing `lib/sheet-*`, `lib/multi-character-storage.ts`, and `lib/character-data-validator.ts` as historical locations, not expansion points.

## Avoid

- Do not preserve stale field lists from old `CLAUDE.md`.
