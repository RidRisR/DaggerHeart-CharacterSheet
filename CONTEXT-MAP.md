# Context Map

This repository uses multiple domain contexts. Use this map to choose the right vocabulary before updating specs, plans, or implementation.

## Contexts

- [Modifiers](./docs/contexts/modifiers/CONTEXT.md) — defines character-sheet value sources, automatic calculation, modifier targets, and migration difference behavior.
- [Internationalization](./docs/contexts/i18n/CONTEXT.md) — defines language boundaries for application UI copy, rules content, and system-generated rules labels.

## Relationships

- **Internationalization -> Modifiers**: Internationalization may translate labels generated for modifier UI, but it must not change modifier Source State, Derived State, Stored State, or calculation semantics.
- **Modifiers -> Internationalization**: Modifier logic provides stable domain facts and identifiers; Internationalization decides how those facts are presented in the active locale.
