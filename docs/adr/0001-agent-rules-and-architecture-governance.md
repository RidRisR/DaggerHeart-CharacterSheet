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
