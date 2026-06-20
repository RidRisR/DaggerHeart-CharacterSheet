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
