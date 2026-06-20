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
