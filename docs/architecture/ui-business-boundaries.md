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
