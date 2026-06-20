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
