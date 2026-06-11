# Domain Context Index

This repository uses separate domain context documents. Do not mix terminology across contexts unless a document explicitly defines the relationship.

## Contexts

- [Character Sheet Modifier Context](docs/contexts/modifiers/CONTEXT.md): character-sheet values, modifier sources, automatic calculation, migration difference behavior, and sync boundaries.
- [Content Pack Import Context](docs/contexts/content-pack-import/CONTEXT.md): card/equipment content packs, public schemas, import pipeline, diagnostics, normalization, conflict checks, and storage transactions.

## Cross-Context Boundaries

- Content pack import terms describe data entering and being managed by the application.
- Modifier terms describe character-sheet calculation behavior after data has become sheet state.
- Equipment pack templates do not become automation sources by themselves. They affect automation only after a selected template is instantiated into a character sheet equipment slot.
- Selecting, clearing, or replacing sheet equipment is a modifier-aware behavior and must enter the automatic-calculation sync boundary defined by the modifier context.
