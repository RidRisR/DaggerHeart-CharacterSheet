# AGENTS.md

## Project

DaggerHeart Character Sheet is a Next.js character sheet and content-pack tool for DaggerHeart.

## Read First

1. `AGENTS.md`
2. `CONTEXT.md`
3. Relevant `docs/contexts/*/CONTEXT.md`
4. Relevant `docs/architecture/*.md`
5. Relevant spec or plan under `docs/superpowers/`

## Rule Levels

- `Must`: required for new work touching the relevant boundary.
- `Should`: default direction; deviations need a clear reason.
- `Avoid`: do not expand this pattern; clean it when the opportunity is local.

## Hard Rules

- Do not start `pnpm dev`, `pnpm start`, or other long-running servers unless the user explicitly asks.
- Default to fast failure. Fallback or legacy paths require case-by-case justification before implementation.
- Keep UI, business behavior, and storage details separated.
- New domain code should not default to `lib/`.
- New internal identifiers, schema fields, storage keys, and filenames should use English unless they are user-facing copy or legacy contracts.
- Keep project rule docs concise and non-repetitive.

## Architecture Docs

- `docs/architecture/project-structure.md`
- `docs/architecture/error-handling.md`
- `docs/architecture/storage-boundaries.md`
- `docs/architecture/ui-business-boundaries.md`
- `docs/architecture/testing.md`
- `docs/architecture/character-data.md`
- `docs/architecture/roadmap.md`

## Commands

- `pnpm install`
- `pnpm test:run`
- `pnpm test:unit`
- `pnpm test:integration`
- `pnpm build`
- `pnpm build:local`
