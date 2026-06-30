# Character Save Image Storage Design

## Goal

Increase the character save limit from 10 to 15 without moving whole character saves to IndexedDB.

The storage pressure investigation showed that large saves are dominated by embedded image data. Two measured saves were 140 KB and 111 KB, with image data accounting for about 79-81% of each save. The non-image `SheetData` payload is around 20-30 KB per save, so moving entire inactive saves to IndexedDB would add unnecessary switching complexity for the current problem.

## Decision

Store character-owned images in IndexedDB and keep character save JSON in localStorage.

The implementation should:

- Move character image payloads such as `characterImage` and `companionImage` out of persisted `SheetData`.
- Persist image blobs in a character image IndexedDB table.
- Keep localStorage character records as normal `SheetData` JSON, but replace embedded image payloads with a local-only `imageAssets` map.
- Increase the save limit from 10 to 15.
- Keep `Ctrl+1` through `Ctrl+9` and `Ctrl+0` mapped to the first 10 saves only.
- Update shortcut helper text so it explicitly says the shortcut covers the first 10 saves.

## Non-Goals

- Do not move whole character saves to IndexedDB.
- Do not implement active/inactive save promotion between localStorage and IndexedDB.
- Do not add shortcuts for saves 11-15 in this change.
- Do not introduce cloud sync, export bundle redesign, or cross-device storage.
- Do not silently fall back to storing large image data in localStorage after the new image path is active.
- Do not ship a partial state where only some character save entrypoints understand `imageAssets`.

## Release Scope

This change should ship as one coherent character save storage migration, not as a partial rollout.

Once `imageAssets` exists, all character save entrypoints must participate before the work is considered releasable:

- image upload and delete,
- autosave,
- save switching and load hydration,
- imported save creation,
- duplicate save creation,
- character deletion,
- export,
- full local data reset,
- legacy embedded image migration and orphan image cleanup.

Partial implementation is allowed only inside the development branch. It should not be merged or released while old and new image persistence paths can both be reached from normal user workflows.

## Release Invariant

After this migration, no normal character save localStorage record may contain embedded image data.

For every `dh_character_*` value, excluding `dh_character_list`, the serialized stored payload must not contain `data:image/`. Exported JSON or HTML may contain base64 images because export is the portable external contract; localStorage character records may not.

This invariant should be covered by tests and by storage diagnostics.

## Entrypoint Audit

The implementation is risky mainly because character image payloads can enter or leave the system through several normal workflows. Before release, each entrypoint below must route through the character save storage boundary or export preparation boundary.

### Storage Lifecycle

- `lib/multi-character-storage.ts`: owns character save keys, character list metadata, active character id, `MAX_CHARACTERS`, save/load/delete helpers, legacy single-save migration, test cleanup helpers, key listing, and orphan cleanup.
- `hooks/use-character-management.ts`: owns startup migration/load, first-save creation, new-save creation, save switching, imported save creation, deletion, duplication, and active sheet updates.
- `components/home-client-app.tsx`: currently has a direct autosave write to `dh_character_${id}` and must stop knowing the storage key.
- `components/modals/character-management-modal.tsx`: currently calls `loadCharacterById()` while rendering save rows; this must move to metadata preview data or a controlled effect because load can become write-capable through image migration.

### Image Producers And Consumers

- `components/ui/image-upload-crop.tsx`: creates temporary data URLs for crop preview and returns a cropped JPEG data URL through `onImageChange`.
- `components/character-sheet.tsx`: writes the main `characterImage` field from the cropper.
- `components/character-sheet-page-adventure-notes.tsx`: writes the same main `characterImage` field from another page.
- `components/character-sheet-page-ranger-companion.tsx`: writes the `companionImage` field.
- `lib/sheet-data.ts`, `lib/default-sheet-data.ts`, `lib/sheet-data-migration.ts`, `lib/sheet-store.ts`, and `lib/character-data-validator.ts`: define, default, merge, migrate, and validate the image fields and must treat `imageAssets` as local-only metadata.
- `hooks/use-print-ready.ts` and HTML export image conversion depend on hydrated runtime image fields being usable `<img src>` values.

### Import And Export

- `lib/storage.ts` and `hooks/use-export-handlers.ts`: JSON export currently stringifies runtime `SheetData` directly and must call export preparation.
- `lib/html-exporter.ts`: embeds `window.characterData` directly and must embed export-prepared portable sheet data. DOM image conversion alone is not enough because re-import uses the embedded JSON payload.
- `lib/html-importer.ts` and `lib/character-data-validator.ts`: parse and validate portable imports; they may preserve base64 image fields, but must not make external `imageAssets` part of the trusted contract.
- `components/home-client-app.tsx`: quick HTML import routes parsed data into imported save creation.
- `components/modals/character-management-modal.tsx`: modal HTML and JSON import both route data into imported save creation.
- `hooks/use-character-management.ts`: `createImportedCharacterHandler(saveName, importedData)` is the central Imported Save Creation boundary and must discard inbound `imageAssets`, archive portable image fields, and save only the stored projection.

### Limits, Shortcuts, Cleanup, And Diagnostics

- `lib/multi-character-storage.ts`: change `MAX_CHARACTERS` to 15 and keep it the single source of truth.
- `components/layout/bottom-dock.tsx`: remove hard-coded `MAX_CHARACTERS = 10` so quick-create/import gates follow the shared limit.
- `components/home-client-app.tsx` and `components/ui/archive-manager-dropdown.tsx`: keep shortcuts for the first 10 saves only, but update copy from broad `Ctrl+数字` wording to explicit first-10 wording.
- `app/card-manager/page.tsx`: full local data reset must clear the character image IndexedDB table in addition to `localStorage.clear()`.
- `lib/memory-monitor.ts`: diagnostics should expose localStorage totals, per-save sizes, image-field sizes, and whether any character record violates the no-`data:image/` invariant.

### Test Coverage Anchors

- `tests/unit/imported-save-creation.test.tsx`: import success, rollback, limit, image extraction, inbound `imageAssets` discard, and no embedded image data in stored records.
- `tests/unit/storage-migration.test.ts`: schema migration, legacy embedded image movement, load hydration, duplicate copy behavior, and storage invariant.
- `tests/unit/character-data-validator.test.ts` and `tests/unit/import-regression-baseline.test.ts`: portable image fields survive import validation; external `imageAssets` is ignored or stripped.
- `tests/unit/quick-html-import.test.tsx` and `tests/unit/character-management-modal-import.test.tsx`: route coverage for quick and modal imports.
- `tests/unit/home-compact-shortcuts.test.tsx` or a new home shortcut test: `Ctrl+1..0` targets only saves 1-10 when 15 saves exist.
- `tests/unit/memory-monitor.test.ts` and card manager reset tests: diagnostics and full reset cover character image storage.

## Migration Risk Assessment

This migration is moderate to high risk because the project is introducing separate meanings for runtime, stored, and exported character sheet data for the first time. The risk is acceptable only if the change remains limited to the character save storage boundary and every known entrypoint above is covered in the same release.

### Highest Risks

- **Missed storage entrypoint**: any unprojected write can reintroduce `data:image/` into `dh_character_*`. Autosave, imported save creation, duplicate save creation, legacy migration writeback, and `saveCharacterById()` are the highest-risk paths.
- **Async storage crossing sync APIs**: IndexedDB image operations are async while many current character save helpers are sync. Avoid turning the whole project async by introducing higher-level async character storage commands only where image work is required.
- **Broken export contract**: JSON and HTML exports must stay portable. If export preparation is missed, exported files may contain `imageAssets` references or lose images.
- **Untrusted imported local metadata**: imported files may contain stale or hostile `imageAssets`. Import must discard inbound local metadata and only archive portable `characterImage` and `companionImage` payloads.
- **Shared image ownership after duplicate**: duplicates must receive copied image records under the target character id. They must not share image references with the source save.
- **Unbounded cleanup failure**: delete and reset must attempt image cleanup, but character deletion should not be blocked after metadata/data deletion. Failed cleanup must leave records attributable by `characterId` for orphan cleanup.
- **Render-triggered migration**: loading a sheet can become write-capable through Image Asset Migration. Components must not call storage-loading functions from JSX render.
- **Save limit and shortcut drift**: storage and UI gates must agree on the 15-save limit, while keyboard shortcuts intentionally remain limited to the first 10 saves. Hard-coded 10-save gates or broad shortcut copy would create inconsistent user behavior.

### Required Scope

The following changes are necessary and should be treated as one release unit:

- route autosave through a character save storage command,
- add character image repository and storage projection helpers under `character/storage/`,
- add explicit character image write/delete actions for upload flows,
- project images out of localStorage during save/import/duplicate/migration,
- hydrate image references during load/switch,
- restore portable base64 during JSON and HTML export,
- delete or orphan-clean character image records during delete/reset,
- raise `MAX_CHARACTERS` to 15 and remove UI hard-coded 10-save gates,
- update shortcut copy while keeping shortcuts limited to the first 10 saves.

### Required Tests

Before release, tests must prove:

- every saved `dh_character_*` payload except `dh_character_list` lacks `data:image/`,
- importing a sheet with base64 images writes image assets and stores only references,
- importing a sheet with `imageAssets` ignores that local metadata,
- exporting JSON and HTML restores base64 images and strips `imageAssets`,
- duplicating a save copies image assets to the new character id,
- deleting a save and full local reset attempt character image cleanup,
- old embedded image payloads are migrated through the controlled image migration command,
- save limit is 15 while `Ctrl+1..0` still covers only saves 1-10.

### Out Of Scope

Do not expand this work into a general storage migration. These are explicitly deferred:

- moving all `SheetData` persistence to IndexedDB,
- refactoring all business data out of historical `lib/` modules,
- introducing a global storage framework,
- rewriting HTML import parsing or JSON validation beyond local metadata stripping,
- merging character image storage with the card editor image system,
- changing `ImageUploadCrop` to a storage-aware component,
- designing shortcuts for saves 11-20.

## Architecture

New character storage behavior should live behind character-domain boundaries rather than expanding `lib/multi-character-storage.ts` directly.

Preferred target structure:

- `character/storage/character-image-database.ts`: Dexie database/table setup for character image records.
- `character/storage/character-image-repository.ts`: read/write/delete image operations.
- `character/storage/sheet-image-references.ts`: helpers that detect embedded images, write them to the image repository, and project `SheetData` to a localStorage-safe shape.
- `character/storage/character-image-actions.ts`: explicit image write/delete commands used by image upload flows.
- Existing `lib/multi-character-storage.ts`: can delegate to the new helpers during the migration, but should not own new IndexedDB table details.

This matches the project architecture rule that future character data boundaries belong under `character/`, while existing `lib/sheet-*` and `lib/multi-character-storage.ts` are historical locations.

## Autosave Boundary

Autosave must use the character save storage boundary. It must not write `dh_character_${id}` directly from UI code.

Today `components/home-client-app.tsx` writes the active `SheetData` directly to localStorage. That direct write would bypass image extraction and reintroduce embedded image payloads after migration. This change must replace the direct write with a character save command such as `saveActiveCharacterSheet(characterId, sheetData)`.

The command owns:

- projecting **Runtime Sheet State** to localStorage-safe **Stored Sheet State**,
- persisting **Character Image Assets**,
- updating character metadata,
- surfacing save failures.

UI code can schedule and debounce autosave, but it must not know character storage keys or persistence shape.

## Image Write Boundary

User image upload and delete flows should perform explicit character image actions instead of waiting for autosave to discover image payloads.

`ImageUploadCrop` should remain a UI component that crops an image and returns image data. The page-level caller should pass that image data to a character image action, such as:

```ts
setCharacterImageAsset(characterId, "portrait", imageDataUrl)
deleteCharacterImageAsset(characterId, "portrait")
```

Those actions own:

- converting data URLs to blobs,
- writing or deleting IndexedDB image records,
- producing the matching **Image Reference** metadata,
- updating **Runtime Sheet State** with the reference and a usable display value.

Autosave remains responsible for projecting **Runtime Sheet State** into localStorage-safe **Stored Sheet State**. It is a guardrail against embedded image payloads entering localStorage, not the primary image persistence mechanism.

## Stored Shape

Character image records should use stable keys derived from the character id and image role:

```ts
type CharacterImageRole = "portrait" | "companion"

interface CharacterImageRecord {
  key: string
  characterId: string
  role: CharacterImageRole
  blob: Blob
  mimeType: string
  size: number
  updatedAt: number
}
```

The `characterId` field is required even when the key also embeds the id. Orphan cleanup should not need to parse file names or key formats to determine ownership.

The persisted `SheetData` should not contain full `data:image/...` strings after migration. It should contain a small local-only Image Asset Map that can be resolved by the image repository.

Use this explicit local-only map:

```ts
type CharacterSheetImageField = "characterImage" | "companionImage"

interface CharacterImageAssetRef {
  key: string
  mimeType: string
}

interface SheetData {
  characterImage?: string
  companionImage?: string
  imageAssets?: Partial<Record<CharacterSheetImageField, CharacterImageAssetRef>>
}
```

`characterImage` and `companionImage` remain canonical external and runtime display fields. Persisted localStorage records should omit those embedded image fields when `imageAssets` contains the matching field entry. On load, the storage boundary resolves the image asset entry and rehydrates the runtime display field as a data URL.

Because this adds schema fields, update `SheetData`, defaults, migration, current-schema validation, and import tests together. The schema migration should only upgrade the synchronous `SheetData` shape. It must not write IndexedDB or move image payloads.

## Runtime Hydration

The first implementation should hydrate image references into data URLs in **Runtime Sheet State**.

This intentionally preserves existing UI contracts: components can continue to pass `characterImage` and `companionImage` directly to `<img src>`, and export can reuse the same portable representation. Object URLs are deferred because they would require lifecycle management with `URL.revokeObjectURL()` and additional export conversion.

The storage guardrail remains strict: hydrated runtime data URLs must be stripped by `projectSheetForStorage()` before any localStorage write.

## Data Flow

### Save

When saving a character:

1. Inspect image fields that can contain embedded data URLs.
2. If a field contains a `data:image/...` payload, store that payload in IndexedDB under the stable character image key.
3. Replace the localStorage payload with the matching `imageAssets` entry.
4. Save the sanitized `SheetData` JSON to `dh_character_${id}`.
5. Update save metadata as today.

If image persistence fails, the save should fail visibly instead of silently keeping the large data URL in localStorage.

### Load

When loading a character:

1. Load the localStorage `SheetData`.
2. Run existing sheet migration.
3. Resolve `imageAssets` entries from IndexedDB and rehydrate `characterImage` or `companionImage` for runtime display.
4. If legacy embedded image data is found, run Image Asset Migration: write it to IndexedDB and resave the localStorage-safe shape.

Runtime components should continue to receive usable image data. The storage boundary owns the difference between embedded legacy data, persisted references, and rehydrated runtime image fields.

Legacy embedded images should be moved by a controlled asynchronous Image Asset Migration command during the version upgrade storage flow. The synchronous `migrateSheetData()` step may add shape fields, but it must not write IndexedDB. The async migration command should be owned by the character save storage boundary and should iterate known character saves through the same projection helpers used by normal saves.

If Image Asset Migration fails, the failure should be visible and diagnostic. It must not silently rewrite embedded image payloads back to localStorage.

The character management modal may trigger controlled image migration or prewarming for the listed saves when it opens if startup did not complete it. That work must run from an explicit effect or command, not from JSX render. Rendering save list rows must not call `loadCharacterById()` or perform storage writes.

Save list preview data should move toward metadata fields such as `characterNamePreview`. Missing legacy preview metadata may display a placeholder until the save is loaded or a controlled prewarm updates it.

### Delete

Deleting a character should delete:

- metadata from the character list,
- localStorage character data,
- all IndexedDB character image records for that character id.

If image cleanup fails after metadata deletion, log a diagnostic. It leaves only orphan image records, which can be cleaned by a maintenance pass.

Deletion should not be blocked by image cleanup failure. Image records are attributable to their owning character id, so a later `cleanupOrphanedCharacterImages()` pass can remove records whose `characterId` is no longer present in the character list.

### Duplicate

Duplicating a character should copy image records to keys for the new character id and store references to the new keys. The duplicate must not point at the original character's image records.

Do not refactor the whole duplicate flow. The required seam is after duplicate metadata creation provides the target character id. Call a helper such as `prepareDuplicatedSheetForStorage(sourceId, targetId, sourceData)` before saving the duplicated stored sheet.

If image copy or save fails, clean up the newly-created metadata, target localStorage data, and any target image records already written.

### Import

Imported save creation currently receives current-schema `SheetData`. If imported data contains embedded image fields, the imported save creation path should store those images through the same image repository before saving the new character record.

Raw import validation and schema migration remain responsible for producing current-schema `SheetData`; image extraction is a storage concern after validation.

Do not refactor the HTML parser, JSON validator, or migration pipeline for this change. The required seam is `createImportedCharacterHandler(saveName, importedData)`: after metadata creation provides the new character id, but before the first stored sheet write, call a helper such as `prepareImportedSheetForStorage(characterId, importedData)`.

Imported Save Creation must not trust external `imageAssets` values. `imageAssets` is a browser-local storage overlay, not part of the portable import contract. Imported Save Creation should discard any incoming `imageAssets` and only archive images from portable `characterImage` and `companionImage` base64 data URLs.

That helper should return:

- `storedSheet`: **Stored Sheet State** with image references and no embedded image payloads,
- `runtimeSheet`: **Runtime Sheet State** suitable for immediate activation,
- written image keys for rollback if the later save or activation fails.

This may make imported save creation async, but import validation and migration should remain synchronous unless a separate design chooses otherwise.

### Export

JSON and HTML export must preserve the existing external contract: exported character files should contain portable base64 image data, not local IndexedDB references.

Before exporting, call a dedicated boundary helper such as `prepareSheetForExport(sheetData)`. It should resolve `imageAssets`, restore `characterImage` and `companionImage` as base64 data URLs, and omit local-only `imageAssets` from the exported payload.

If an image reference cannot be resolved, export should fail visibly or report a clear warning. It must not silently emit a reference-only file that another browser cannot import correctly.

## Shortcut Behavior

The save limit becomes 15, but save shortcuts remain limited to the first 10 saves:

- `Ctrl+1` through `Ctrl+9`: saves 1-9.
- `Ctrl+0`: save 10.
- Saves 11-15 are reachable through the save switcher, archive manager, and character management modal.

Shortcut text should be updated from broad phrasing like `Ctrl+数字键快速切换存档` to explicit phrasing such as `Ctrl+1-9/0 切换前 10 个存档`.

Adding shortcuts for saves 11-15 is deferred. A future design can choose between shortcut slots, `Ctrl+Shift+number`, or a command palette.

## Storage Diagnostics

Add or preserve a developer/maintenance diagnostic that reports:

- total localStorage usage,
- per-save total size,
- per-save image size,
- largest top-level fields.

Diagnostics must not expose character text content in normal UI. Sizes and field names are enough.

## Full Local Data Reset

The card manager "clear all local data" maintenance action must clear the character image IndexedDB table.

This action already promises to delete character saves and image cache data. After character images move to IndexedDB, calling `localStorage.clear()` is not sufficient. Add a character image cleanup command such as `clearAllCharacterImages()` and call it from the reset flow alongside the existing card store reset.

The reset should clear the character image table specifically. It does not need to delete unrelated IndexedDB databases that are owned by other domains.

## Error Handling

This change should follow fast failure:

- IndexedDB unavailable during an image write should produce a visible save/import failure.
- Do not silently fall back to large localStorage image payloads after the new path is enabled.
- Do not fall back to storing image base64 in localStorage when IndexedDB is unavailable.
- Non-image character saves may continue to work when IndexedDB is unavailable, but image upload, image-bearing import, image copy, and image hydration must surface clear failures.
- Legacy embedded images may remain readable, but only as a migration input.
- Cleanup failures should log specific diagnostics including character id and image role/key.

Any fallback added for browser compatibility must document its trigger, protected data or user experience, diagnostic shape, tests, and removal condition.

## Testing

Unit tests should cover:

- detecting embedded image data and projecting it to image references,
- saving image records with stable keys,
- loading and resolving image references,
- controlled migration from legacy embedded image fields,
- delete cleanup of character image records,
- full local data reset clears the character image table,
- stored `dh_character_*` localStorage payloads never contain `data:image/`,
- duplicate image copy to new character keys,
- imported save creation with embedded images,
- export still includes usable image data,
- save limit is 15,
- `Ctrl+1..0` still targets only saves 1-10,
- shortcut helper text says the shortcut covers the first 10 saves.

Integration or hook-level tests should cover the full save/load path through character management and autosave boundaries.

## Open Follow-Up

Shortcut coverage for saves 11-20 is intentionally deferred. The current change should not decide that interaction model.
