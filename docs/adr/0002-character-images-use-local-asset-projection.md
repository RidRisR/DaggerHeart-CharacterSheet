# 0002: Character Images Use Local Asset Projection

## Status

Accepted

## Context

Character save measurements showed large localStorage usage was dominated by embedded base64 image fields, while non-image sheet data remained small. Raising the save limit by moving whole saves to IndexedDB would add unnecessary save-switching complexity, but leaving images embedded would keep localStorage pressure.

## Decision

Keep canonical character sheet data and external import/export contracts image-compatible with the existing base64 fields. Store character image payloads as browser-local IndexedDB assets, and persist character saves to localStorage through **Storage Projection** that strips embedded image data and records local `imageAssets` metadata.

Do not ship a partial rollout: image upload, autosave, load hydration, import, duplicate, delete, export, reset, legacy image migration, and orphan cleanup must all understand this projection before release. Export preparation restores base64 image fields and strips local-only `imageAssets`, so external files do not expose local IndexedDB references.

## Consequences

- Local character save payloads must not contain `data:image/`.
- `imageAssets` is local storage metadata, not an external sheet contract.
- Image operations become explicit character image asset writes and reads.
- Schema migration can add the projection shape, but asynchronous image asset migration remains in the character save storage boundary.
- The migration must not expand into a general storage rewrite. Only character save entrypoints that can read, write, import, export, duplicate, delete, reset, or migrate character image data are in scope.
- Existing synchronous storage helpers may delegate to new character storage commands during the transition, but UI code must stop directly writing `dh_character_*` payloads.
