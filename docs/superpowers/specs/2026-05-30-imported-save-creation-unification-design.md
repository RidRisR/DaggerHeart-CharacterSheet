# Imported Save Creation Unification Design

## Goal

Unify all character import paths so JSON import, HTML import from save management, and quick HTML import create saves through the same Imported Save Creation pipeline.

This is an internal data-flow refactor. Users should not perceive a behavior change.

## Current Problem

The parsing and migration layer is already mostly unified:

- JSON import reads file text, parses JSON, and calls `validateJSONCharacterData()`.
- HTML import extracts `window.characterData` and calls `validateAndProcessCharacterData(..., "html")`.
- Both routes reach `migrateSheetData()` through the validation layer.

The final save creation layer is not unified:

- Save-management JSON import creates an empty save, then calls modal-local `onImportData()`.
- Save-management HTML import creates an empty save, then calls modal-local `onImportData()`.
- Quick HTML import creates an empty save, then calls `setSheetData(result.data)` directly.

This creates two problems:

- Quick HTML import bypasses `replaceSheetData()`, so it does not use the same store replacement boundary as the save-management import paths.
- `CharacterManagementModal.onImportData()` performs extra default merging and deprecated-field restoration that overlaps with, and may contradict, `migrateSheetData()`.

## Domain Language

`CONTEXT.md` now defines **Imported Save Creation** as creating a new save from already validated and migrated imported character data, then making that imported sheet the active Stored State.

Important implications:

- Raw JSON and raw HTML extraction output must not be written directly into storage or the user-visible store.
- Imported Save Creation differs from empty save creation: imported sheet data is the new save's initial Stored State.
- Imported sheet data should be persisted to the new save before that save becomes active.

## Import Pipeline Responsibilities

### 1. Source Acquisition

UI code obtains the file from the user.

- JSON import: read selected `.json` file as text.
- HTML import: read selected `.html` file as text.

### 2. Raw Source Parsing

Parsing converts the file text into raw candidate character data.

- JSON import: `JSON.parse()`.
- HTML import: extract `window.characterData` from the exported HTML.

### 3. Raw Import Candidate Validation

The validation layer checks only that the raw candidate is plausibly character data. It must not merge defaults before migration, because defaults can hide legacy fields.

### 4. Schema Migration And Current Normalization

`migrateSheetData()` is the single owner of schema migration and current-schema normalization.

It is responsible for:

- version-chain migration from older saves to the current schema,
- adding current required data such as `inventory_cards`, `pageVisibility`, `equipment`, `armorTemplate`, `adventureNotes`, and `notebook`,
- converting legacy data such as boolean-array `hope`,
- preserving legacy final values through the modifier model,
- cleaning deprecated fields such as `includePageThreeInExport`,
- normalizing current-schema modifier and equipment collections.

UI import code must not repeat this work.

### 5. Post-Migration Validation

After migration, validation confirms that the result is current-schema `SheetData` and produces warnings.

### 6. Imported Save Creation

A single action should create the new imported save.

The action should:

1. accept a save name and already validated/migrated `SheetData`,
2. check the maximum save count,
3. create new save metadata,
4. persist the imported `SheetData` to the new save id,
5. update the local save list,
6. make the new save active through a shared activation helper,
7. replace the sheet store with the imported `SheetData` through that activation helper.

The action should not create an empty save and then overwrite it through a later autosave.

The action must throw on invalid or non-current-schema input. This is a pipeline contract violation, not a user-recoverable import error. It must not call `migrateSheetData()` internally, merge defaults, repair malformed data, or reinterpret raw imported data. Those responsibilities belong to the validation and migration layers before Imported Save Creation.

The current-schema guard must be strict. It must not reuse broad raw-import helpers such as `validateSheetData()` or the current validator's internal `validateCurrentSheetData()` behavior, because those checks allow legacy-compatible shapes such as boolean-array `hope` or any numeric schema version. The guard should check `schemaVersion === CURRENT_SCHEMA_VERSION` and reject obvious non-current shapes such as deprecated `includePageThreeInExport` or missing current-schema structures required by Imported Save Creation.

Contract validation must run before metadata creation. A contract violation must not be caught and converted into `false` by a broad handler `try/catch`.

Imported Save Creation should not reuse the whole `switchToCharacter()` flow after saving imported data. `switchToCharacter()` loads from storage and may migrate and re-save stored data, which is correct for existing saves but unnecessary for freshly imported current-schema data. Instead, `switchToCharacter()` and Imported Save Creation should share a smaller internal activation helper that receives a character id and already loaded `SheetData`, then updates current id, active id, and the sheet store.

The activation helper should preserve the existing activation order used by `switchToCharacter()`:

1. update the current character id state,
2. persist the active character id,
3. replace the sheet store.

### 7. Store Replacement Boundary

`replaceSheetData()` remains the store replacement boundary. It receives current-schema sheet data and may apply automatic-calculation sync behavior.

## Chosen Approach

Use the existing `useCharacterManagement` ownership boundary and add one shared action there, tentatively named:

```ts
createImportedCharacterHandler(saveName: string, importedData: SheetData): boolean
```

All user-visible import paths should call this action:

- save-management JSON import,
- save-management HTML import,
- quick HTML import.

`CharacterManagementModal` should no longer own import-data finalization. It should receive the shared imported-save creation action as a prop and call it after validation succeeds.

The action should follow the existing `useCharacterManagement` command style for this change:

- return `true` when the imported save is created successfully,
- return `false` for expected business failures, such as reaching the maximum save count or failing to create metadata,
- show the specific user-facing failure message inside the handler,
- avoid additional caller-side guesses such as "可能已达到存档数量上限" after a `false` result,
- throw for pipeline contract violations such as non-current-schema imported data.

A structured command result with explicit failure reasons would be cleaner, but it should be handled later as a wider `useCharacterManagement` command-return convention cleanup rather than introduced only for this import action.

If metadata is created but saving imported sheet data fails, the handler should clean up the newly-created metadata/data before returning or rethrowing. The implementation should avoid leaving a half-created save that appears in the list but has no character data.

Imported Save Creation should not change the active character-sheet page/tab. This change is scoped to import data flow and save creation semantics, not navigation UX. Existing import behavior should be preserved unless a path already changes pages explicitly.

Success messages, warning messages, prompt timing, and validation-failure messages should remain user-visible compatible with the current behavior. The only failure-message cleanup is removing duplicate caller-side guesses after the shared handler has already shown a specific business-failure message.

Default imported save names should be unified to use the format-neutral suffix `(导入)`. The save name does not need to expose whether the source file was JSON or HTML.

## Refactoring Notes

Remove modal-local import finalization logic like:

```ts
{
  ...defaultSheetData,
  ...data,
  inventory_cards: data.inventory_cards || Array(20).fill(...),
  includePageThreeInExport: data.includePageThreeInExport ?? true,
}
```

That logic belongs in `migrateSheetData()` and current-schema normalization. In particular, `includePageThreeInExport` is deprecated and should not be restored after migration has removed it.

Do not refactor file acquisition or source parsing in this change. JSON import may continue using its modal-local `FileReader + validateJSONCharacterData()` flow, and HTML import may continue using `importCharacterFromHTMLFile()`. The unification boundary starts after validation has produced current-schema `SheetData`.

Update stale import-path documentation in `CLAUDE.md` as part of the implementation. In particular, remove or replace references to non-existent JSON import functions in `lib/storage.ts`, and document the current validation/migration/imported-save-creation path after the code change lands.

## Regression Test Strategy

Tests should cover these behaviors:

- JSON and HTML validation both produce migrated current-schema data through the same processing path.
- `migrateSheetData()` remains responsible for adding `inventory_cards` and cleaning `includePageThreeInExport`.
- imported save creation persists imported data as the new save's initial data before activation.
- quick HTML import no longer uses `setSheetData()` as a bypass.
- imported save creation reaches `replaceSheetData()` rather than partial `setSheetData()`.
- hook-level orchestration is covered for `createImportedCharacterHandler()`: metadata creation, localStorage save, active id persistence, store replacement, deprecated-field non-restoration, and throwing on non-current-schema input.
- hook-level failure coverage includes a save failure after metadata creation and verifies the half-created save is cleaned up.

Prefer behavior-based tests over direct mocking of Zustand store actions. Tests should verify that imported data replaces the active store state and does not partial-merge with prior sheet state. Direct action mocks may be added only if behavior checks cannot cover a specific regression.

Use a `.tsx` hook test with `@testing-library/react` and the existing happy-dom environment for Imported Save Creation orchestration. FileReader/browser-file behavior is not the core pipeline risk and should not be required for the main hook test.

## Open Design Question

Resolved: `createImportedCharacterHandler()` should reject non-current-schema data instead of calling `migrateSheetData()` itself.

Raw import data should enter migration only through `validateAndProcessCharacterData()`. If the imported-save creation action also migrates, it becomes a second migration entry point and blurs the pipeline boundary.

Resolved: invalid or non-current-schema input should throw. In real business flow this state should not occur; user-facing bad-file cases must be handled earlier by import validation.

Resolved: expected business failures should follow the existing boolean handler style for now. The handler owns the specific alert message; callers should not infer or duplicate the failure reason.

Resolved: successful imported save creation should not force navigation to page 1. The current tab/page should remain whatever it was before import.

Resolved: this refactor should mostly preserve existing user-visible behavior. Existing success prompts, warnings, and import-source-specific success wording should be preserved.

Resolved: imported default save names should use the format-neutral suffix `(导入)` for all import paths.

Resolved: success alert wording should keep the current source-specific labels such as `HTML导入成功` and `JSON导入成功`.

Resolved: file acquisition and source parsing are out of scope. This change should not introduce a combined JSON/HTML import-file service.

Resolved: Imported Save Creation should reuse shared activation logic, not the whole load-and-migrate `switchToCharacter()` path. Existing save switching remains responsible for loading and migrating stored saves; imported save creation already owns current-schema sheet data and should activate it directly through the shared helper.

Resolved: shared activation should preserve the current `switchToCharacter()` update order: current id, active id, then store replacement.

Resolved: regression coverage must include the hook-level Imported Save Creation orchestration, not only migration or validation helpers.

Resolved: verify store replacement behavior indirectly through resulting state where possible, rather than mocking `replaceSheetData()` or `setSheetData()` directly.

Resolved: update stale `CLAUDE.md` import-path guidance together with this change.

Resolved after review: Imported Save Creation needs a strict current-schema assertion rather than reusing broad legacy-compatible validation helpers.

Resolved after review: save failures after metadata creation should clean up the half-created save.
