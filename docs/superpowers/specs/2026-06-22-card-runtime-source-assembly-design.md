# Card Runtime Source Assembly Design

日期：2026-06-22

状态：Design draft for review

## Problem

The current card runtime mixes three concerns:

- bundled built-in card content,
- imported custom card pack storage,
- the runtime read model used by selection UI, pack filters, automation, image lookup, and pack management.

This coupling produced the current built-in automation failure:

- `data/cards/builtin-base.json` contains author-facing `CardAutomationDefinition`.
- `_seedBuiltinCards()` loads the built-in pack through the legacy `_importBuiltinCards()` / `_convertImportData()` path.
- The legacy card converters convert Chinese legacy card fields to `StandardCard`, but they do not compile or preserve `automation`.
- Character-sheet card actions correctly copy `template.automation` to Card Instances, but built-in templates enter the runtime without compiled automation IR, so there is nothing to copy.

The previous design direction correctly separated bundled built-in cards from custom card localStorage. The missing architectural constraint is that this separation must not leak into the rest of the app as repeated `SYSTEM_BUILTIN_CARDS` special cases. Runtime consumers should not need to know whether a source came from the bundle or from imported storage.

## Goals

- Built-in card automation definitions must compile into template-owned `CardAutomationIR` before cards enter the runtime read model.
- Built-in cards must come from the application bundle, not from custom card localStorage payloads.
- Runtime consumers should use one assembled card runtime read model, independent of source kind.
- Source-kind differences must be contained behind source adapters and source-state persistence ports.
- Built-in card disabled state must move to `app-preferences`.
- Existing users who disabled the built-in card source must keep that preference.
- Legacy built-in localStorage payload and index data should be removed only after the preference migration is written successfully.
- Built-in ordering must remain stable: built-in source first, custom sources after it.
- UI behavior for card selection, pack filters, pack management summaries, images, custom fields, and custom pack lifecycle must not regress.

## Non-Goals

- Do not rewrite cards into the full equipment runtime-cache architecture in this change.
- Do not migrate custom card packs to a new storage format.
- Do not remove or rename existing custom card localStorage keys.
- Do not infer automation from card prose.
- Do not auto-refresh existing character sheet card instances from current templates.
- Do not make UI components decide which persistence backend a card source uses.

## Architectural Principle

Built-in and custom card packs differ only before they become runtime source snapshots and when persisting source-owned state. After assembly, card selection, filtering, automation, batch summaries, image lookup, and pack management must consume one unified runtime read model.

External card packs and built-in card data do not share one end-to-end lifecycle. External packs use the Card Import Workflow because they are installed into custom storage and managed as imported content. Built-in data uses Built-in Card Runtime Source Loading because it is bundled application content that becomes a runtime source without being installed. These two workflows must share content adaptation, automation compilation, and Runtime Card Projection; they must not share Commit Plan or Storage Transaction.

Allowed source-kind branching:

- source adapters that load or build runtime source snapshots;
- source-state persistence ports that write disabled state or storage payloads;
- source lifecycle services that route semantic source writes to the correct persistence owner;
- legacy migration and cleanup code.

Avoid source-kind branching:

- selection UI;
- character-sheet card actions;
- automation provider and snapshot builder;
- `loadCardsByType()`;
- `getAllBatches()`;
- runtime aggregation and filtering indexes;
- image URL lookup after cards are assembled.

## Reference Pattern

Equipment already separates bundled runtime content from imported pack storage:

- built-in equipment templates are built from bundled data;
- imported equipment packs come from repository storage snapshots;
- the source id `builtin` is reserved and cannot be used by stored equipment packs;
- built-in equipment disabled state is stored in app preferences.

Cards should adopt the same boundary principle without copying the entire equipment runtime-cache implementation. Existing card UI and store code still depend on the `cards`, `batches`, and `cardsByType` read model. This design keeps those read models, but changes how they are assembled.

## Design

### Prepared Card Pack Content Boundary

Extract a shared preparation boundary below the Card Import Workflow and Built-in Card Runtime Source Loading:

```ts
prepareCardPackContentForRuntime(input): PreparedCardPackRuntimeContent
```

This boundary owns the shared content-understanding steps:

- route/adapt the raw payload into the current card-pack model;
- run structure validation;
- build the dry-run validation model;
- compile author-facing automation definitions into `CardAutomationIR`;
- run semantic validation over the compiled model;
- return the compiled dry-run model plus structured diagnostics.

It must not:

- create `CardPackCommitDraft`;
- create `CardImportFinalCommitPlan`;
- generate imported pack ids;
- run installed-pack conflict checks;
- project to custom storage payloads;
- write storage.

The Card Import Workflow calls this boundary before import-specific conflict checks, commit planning, and storage. Built-in Card Runtime Source Loading calls the same boundary and then projects directly to runtime templates. This keeps built-in loading from becoming a parallel import pipeline while also preventing fake commit plans from being constructed just to reuse import storage adapters.

### Runtime Card Projection Boundary

Make **Runtime Card Projection** an explicit layer between dry-run validation and commit/storage behavior:

```text
raw payload
  -> source adaptation / schema validation / dry-run model
  -> compile automation
  -> semantic validation
  -> Runtime Card Projection
  -> commit/storage for imported custom packs
```

Add or extract a shared projection function:

```ts
projectCardPackModelToRuntimeTemplates(
  model: CardPackDryRunValidationModel,
): ExtendedStandardCard[]
```

Rules:

- The projection input must already have successful structure validation and compiled automation where definitions exist.
- The projection output is runtime card templates only; it does not assign pack ids, write storage metadata, or decide source disabled state.
- The projection output must not assign source-owned metadata such as `batchId`, `batchName`, or `source`.
- Built-in source loading and custom pack storage projection must both use this projection.
- Projection logic currently hidden inside storage adapters, such as `CardPackDryRunCard -> ExtendedStandardCard`, should move into this layer before built-in loading uses it.
- Commit Plan remains an imported-pack installation boundary. Built-in content does not enter Commit Plan.
- Built-in loading must not construct placeholder `CardPackCommitDraft`, `CardImportFinalCommitPlan`, generated pack ids, or storage projection inputs to reuse the current legacy adapter.
- Built-in source loading is a thin orchestration over shared content understanding steps, not a parallel built-in import implementation.

### Runtime Source Snapshot

Introduce a small source-level runtime contract:

```ts
type CardRuntimeSourceKind = "builtin" | "custom"

type CardRuntimeSourceSnapshot = {
  sourceId: string
  kind: CardRuntimeSourceKind
  batch: BatchInfo
  cards: ExtendedStandardCard[]
}
```

The snapshot is the boundary between source-specific loading and source-agnostic runtime assembly.

Rules:

- `sourceId` is the runtime source identity. For the built-in source it is `SYSTEM_BUILTIN_CARDS`; for custom sources it is the custom batch id.
- `batch.id` must equal `sourceId`.
- `cards` must already be runtime templates, not raw import payloads.
- Cards with automation must carry compiled `CardAutomationIR`, never author-facing `CardAutomationDefinition`.
- Each card must have `batchId: sourceId` and the appropriate `source` metadata before assembly.

Keep the built-in card source id value as `SYSTEM_BUILTIN_CARDS` in this phase for compatibility with existing storage, filters, and UI assumptions. New code should treat that value as the built-in card runtime source id, not as proof that built-in cards belong to custom batch storage. A later rename to `builtin` would be a separate compatibility migration.

### Source Adapters

Create narrow source adapters:

```ts
loadBuiltinCardRuntimeSource(input): CardRuntimeSourceSnapshot
loadCustomCardRuntimeSources(input): CardRuntimeSourceSnapshot[]
```

The built-in adapter:

- reads `data/cards/builtin-base.json`;
- uses the shared legacy adaptation, structure validation, automation compilation, semantic validation, and Runtime Card Projection path;
- fails loudly if a built-in automation definition is invalid;
- applies disabled state from app preferences;
- does not read or write custom card localStorage payloads.
- does not build a Card Import Commit Plan.
- does not run storage or installed-pack conflict checks such as pack limits, generated pack id conflicts, or imported-template conflicts.

The custom adapter:

- reads the existing custom card localStorage index and batch payloads;
- ignores legacy `SYSTEM_BUILTIN_CARDS` index entries and payloads for runtime loading;
- expects installed custom templates to already carry compiled automation IR when imported through the current pipeline;
- passes installed template automation through unchanged;
- does not compile, repair, normalize, or reinterpret installed template automation during runtime source loading;
- leaves full hardening of persisted untrusted automation IR to a separate storage-validation task, outside this Runtime Source Assembly change;
- preserves current custom pack ordering and recovery behavior where possible;
- reports or throws storage failures consistently with the existing store behavior.

The old built-in `_importBuiltinCards()` path should be removed. Built-in runtime loading must have one production path through Built-in Card Runtime Source Loading, not a legacy import wrapper.

Custom storage projection should also be updated to depend on Runtime Card Projection rather than owning its own card-field projection. Storage adapters may append storage/source metadata, but they should not maintain a second mapping from import cards to runtime templates.

### Runtime Assembler

Add a pure assembler:

```ts
type AssembledCardRuntime = {
  cards: Map<string, ExtendedStandardCard>
  batches: Map<string, BatchInfo>
}

assembleCardRuntimeSources(
  sources: CardRuntimeSourceSnapshot[],
  options?: CardRuntimeAssemblyOptions,
): AssembledCardRuntime
```

The assembler owns runtime ordering:

1. built-in source first;
2. custom sources after built-in, preserving custom source order;
3. built-in cards first inside each card type;
4. custom cards after built-in, preserving source and card order.

The assembler must fail fast if the same card id appears in more than one source or more than once inside a source. Duplicate ids reaching assembly indicate a broken upstream import, storage, or built-in data invariant; assembly must not silently overwrite or skip cards.

The assembler should also centralize:

- `cards` map construction;
- `batches` map construction;
- custom field and variant type aggregation inputs where local to card runtime assembly.

Runtime code should call the assembler rather than rebuilding source ordering ad hoc in multiple methods.

If the existing Zustand store continues to expose a field named `index`, that field should either be renamed during implementation or explicitly treated as the custom storage index. It must not become the authority for built-in source visibility or disabled state.

This phase does not need to delete existing derived-index rebuild helpers such as `_rebuildCardsByType()`. Those helpers may remain, but they must rebuild from the assembled ordered `cards` map so built-in/custom ordering remains stable.

The assembler should not produce custom storage documents. Custom storage helpers may derive a custom-only `CustomCardIndex` from custom source snapshots when persisting custom packs, but that derived storage document is not part of the source-agnostic runtime assembly result.

### Runtime Query Surfaces

Define runtime read surfaces by intent:

- selectable card queries, such as `loadAllCards()`, `loadCardsByType()`, and `getCardById()`, exclude disabled sources;
- import conflict checks, duplicate checks, and built-in identity reservation use an all-sources identity surface that includes disabled built-in templates;
- management source summaries may include disabled sources;
- management card-detail reads must explicitly choose whether disabled source cards are inspectable.

Disabled built-in cards still reserve their template ids. A disabled built-in source must not allow an imported custom pack to claim the same card ids.

### Derived Index Semantics

Every derived index must declare whether it is all-template or selectable-only:

- `cardsByType` is an all-template ordering index; selectable APIs filter disabled sources when reading from it.
- `subclassCardIndex` and `levelCardIndex` are selectable-only indexes used for UI options.
- `batchKeywordIndex` and `batchLevelIndex` are selectable-only unless implementation proves an existing management view requires all-template behavior.
- aggregated custom fields and variant types should preserve existing behavior, but the implementation must characterize whether disabled sources currently contribute.

All derived indexes must rebuild from the assembled ordered runtime model. Disabled filtering should be centralized in the rebuild or read helper for that index, not spread across UI components.

### Runtime Publish and Refresh

Runtime initialization and refresh should be atomic from the store consumer's point of view:

```text
load all required source snapshots
assemble next runtime read model
validate derived runtime invariants
publish the assembled read model to the store once
rebuild derived indexes
```

If source loading, assembly, or validation fails, keep the previous runtime read model when one exists. Do not clear custom cards, partially preserve built-in state, or publish a mixed old/new runtime model.

Import, remove, disable, and refresh operations should reassemble built-in plus custom source snapshots. The old custom-only refresh path should be replaced or wrapped so it does not preserve stale built-in preference state and does not read built-in disabled state from the custom index.

### Card Store Initialization

Change initialization from:

```text
seed built-in through legacy converter
load custom cards from localStorage
rebuild runtime indexes from mutable store state
sync everything back to localStorage
```

to:

```text
migrate legacy built-in disabled state if needed
load built-in runtime source snapshot
load custom runtime source snapshots
assemble all runtime sources
install assembled runtime read model into store
initialize image services and derived indexes
sync custom sources only
```

`_seedBuiltinCards()` and `_loadCustomCardsFromStorage()` should no longer mutate overlapping runtime maps independently. Prefer one orchestration method that gathers source snapshots and installs the assembled result once.

### Source Disabled State

Expose a semantic source-state operation:

```ts
setCardRuntimeSourceDisabled(
  sourceId: string,
  disabled: boolean,
): CardRuntimeSourceStateResult
```

Internally this operation routes by source ownership:

- built-in source disabled state is stored in app preferences;
- custom source disabled state is stored in the existing custom card index.

Only built-in card disabled state moves to app preferences in this change. Custom card pack disabled state remains installed content lifecycle state and stays in the custom card index.

This routing belongs in a source-state service or store action, not in UI components.

After a disabled-state change:

- persist the source-owned disabled state first;
- reload or update the affected source snapshot only after persistence succeeds;
- reassemble and atomically publish the runtime read model;
- preserve stable ordering;
- do not rewrite unrelated sources.

If persistence fails, return a structured failure result and leave the published runtime model unchanged. The operation should not report success after silently failing to write the owning persistence layer.

UI should keep using list-item capabilities such as `canDisable` and `canRemove`. It should not infer behavior from `isSystemBatch`.

This design does not redefine disabled-source read semantics. Preserve the existing behavior: management views can still show disabled source summaries, while selectable/query card APIs exclude cards from disabled sources. Treat that behavior as regression coverage rather than a new runtime model split.

This phase should implement only the disabled-state write path as a source lifecycle operation. Importing and removing custom packs may continue using the existing custom pack lifecycle. Future source writes, such as template refresh, source repair, or source update, should enter through semantic source lifecycle APIs instead of direct storage access or UI-level source-id checks.

Existing facades such as `toggleBatchDisabled()` and `getBatchDisabledStatus()` must delegate to the semantic source-state operation or a source-state read helper. Card manager actions should not continue routing built-in toggles through custom pack storage snapshots after built-in storage is removed.

### Card Pack Management View Model

Card pack management UI should consume a source view model rather than raw storage/source flags:

```ts
type CardRuntimeSourceListItem = {
  sourceId: string
  name: string
  disabled: boolean
  cardCount: number
  cardTypes: string[]
  sourceLabel: string
  canDisable: boolean
  canRemove: boolean
  canViewCards: boolean
}
```

Rules:

- built-in source has `canDisable: true` and `canRemove: false`;
- custom sources preserve current disable/remove capabilities;
- UI components should not read `isSystemBatch` to decide behavior;
- toggle callbacks should pass the desired next disabled state, not depend on UI-local inversion;
- remove handlers must guard on `canRemove` before calling custom removal;
- disabled source detail visibility must be explicit through `canViewCards`.

Summary stats should preserve current intent unless characterization proves otherwise: built-in and disabled sources count as installed sources; disabled sources do not contribute to enabled/selectable counts.

### App Preferences

Extend `lib/app-preferences.ts`:

```ts
contentSources: {
  equipmentDisabledSourceIds: string[]
  cardDisabledSourceIds: string[]
}
```

Add semantic helpers:

```ts
getCardDisabledSourceIds(storage?): string[]
setCardSourceDisabled(sourceId: string, disabled: boolean, storage?): void
```

Normalization rules:

- known card source ids initially include only `SYSTEM_BUILTIN_CARDS`;
- unknown card source ids are dropped or ignored;
- missing `cardDisabledSourceIds` is backfilled to `[]`;
- malformed preference documents are normalized using existing app preference behavior.
- migration code must be able to detect whether the raw preference document already contained `contentSources.cardDisabledSourceIds`; normalization alone is not enough because it backfills missing fields.

### Legacy Built-in Disabled Migration

Legacy source:

- storage key: `daggerheart_custom_cards_index`
- legacy path: `index.batches.SYSTEM_BUILTIN_CARDS.disabled`
- legacy payload key: `daggerheart_custom_cards_batch_SYSTEM_BUILTIN_CARDS`

Migration algorithm:

1. Read the raw app preference document and the normalized app preferences, or hydrate defaults if none exist.
2. If the raw document did not contain `contentSources.cardDisabledSourceIds`, inspect the legacy card index.
3. If legacy built-in disabled is `true`, add `SYSTEM_BUILTIN_CARDS` to `cardDisabledSourceIds`.
4. Write the updated preference document.
5. Only after that write succeeds:
   - remove `SYSTEM_BUILTIN_CARDS` from the legacy custom card index;
   - update index totals using only remaining custom entries;
   - remove `daggerheart_custom_cards_batch_SYSTEM_BUILTIN_CARDS`.

This must also run for users who already have an app preference document from earlier migrations. Existing preferences should be normalized and backfilled, not returned unchanged.

If the preference write fails, leave legacy built-in index entry and payload key intact so disabled state is not lost.

For the current session, a failed preference write must also preserve effective disabled behavior. The migration helper should return the effective built-in disabled state it observed from legacy storage so runtime loading can use it for that initialization attempt without treating legacy custom storage as the long-term authority.

Legacy cleanup order should be:

1. write app preferences;
2. write the cleaned custom-only index;
3. remove the legacy built-in payload.

If the cleaned custom-only index write fails, do not remove the payload.

### Storage Sync

Change custom card storage sync so it persists custom sources only:

- write custom card index entries only for custom sources;
- write custom batch payloads only for custom sources;
- never write `daggerheart_custom_cards_batch_SYSTEM_BUILTIN_CARDS`;
- never use the custom card index as the authority for built-in disabled state.
- define custom index totals as custom-only totals;
- write batch payloads and image payloads before writing the custom index;
- write the custom index last so the index does not point at missing payloads after a partial failure.

This should be implemented through a custom source storage adapter or helper rather than sprinkling `if builtin` checks through `_syncToLocalStorage()`.

Custom card storage sync is allowed to branch on source ownership because it is the storage boundary. That branch enforces the invariant that custom card storage may persist custom sources only; it must not leak into runtime consumers or character-sheet business actions.

If the implementation can update call sites safely, rename `_syncToLocalStorage()` to a custom-specific operation such as `_syncCustomCardsToLocalStorage()`. If renaming creates unnecessary churn, keep the existing method as a wrapper but delegate to a custom-only storage helper and cover the custom-only behavior with tests.

Existing integrity and stats helpers that compare runtime maps to custom index totals must be updated to account for the custom-only index invariant.

### Image Invariants

Runtime projection is source-agnostic, but source adapters must attach image metadata consistently before assembly:

- built-in cards use stable public image URLs from bundled data;
- built-in cards must not be marked as local IndexedDB images;
- custom cards preserve `batchId` as the custom pack id for pack-scoped image lookup;
- custom image lookup should prefer pack-scoped images before legacy global fallback;
- assembled runtime cards must retain the metadata needed by existing rendering utilities.

Image lookup after assembly should consume card metadata, not branch on whether a source was loaded from bundle or custom storage.

### Automation Data Flow

Built-in startup:

```text
builtin-base.json
  -> built-in source adapter
  -> shared legacy adaptation and automation compilation
  -> Runtime Card Projection
  -> CardRuntimeSourceSnapshot
  -> runtime assembler
  -> selectable templates with compiled IR
```

Selection:

```text
template with compiled CardAutomationIR
  -> selectCardIntoSlot / replaceCardInstance
  -> instantiateCardTemplate copies IR to Card Instance
  -> automatic-calculation boundary runs card provider
  -> card-sourced base/modifier contributions affect final values
```

Card instance automation contract:

- selecting or replacing from a runtime template deep-clones template automation IR into the card instance;
- `automationSource` and initial `automationState` are initialized from the template;
- moving an existing instance preserves instance-owned automation state;
- replacing an instance discards old instance automation state and copies from the new template;
- ordinary selection, replacement, deletion, and move actions keep rejecting protected loadout slots;
- only explicit protected-loadout intents may set protected slots, and that path must instantiate automation the same way normal selection does.

Custom import:

```text
external card pack
  -> import pipeline compiles definitions
  -> Runtime Card Projection
  -> storage projection persists runtime templates with compiled IR
  -> custom source adapter reads installed templates
  -> CardRuntimeSourceSnapshot
  -> runtime assembler
```

### Error Handling

- Invalid built-in automation is a bundled data error and should fail card runtime initialization with structured diagnostics.
- Built-in structure or semantic validation failures should also fail card runtime initialization. Do not skip only the failing built-in card, and do not load it without automation as a fallback.
- Invalid legacy preference or custom card index JSON should be ignored or handled according to existing app preference and card storage recovery behavior.
- Legacy cleanup after successful preference migration is best-effort.
- Custom source load failures should remain isolated to custom source loading where feasible; they must not silently downgrade built-in automation.
- Duplicate card ids across sources should preserve current import conflict behavior for custom packs. Runtime assembly should still fail fast if duplicate ids reach assembly unexpectedly.

Built-in source-load diagnostics should carry at least:

- source id;
- card id when known;
- group/type and item index when known;
- JSON pointer or equivalent path;
- compiler/import diagnostic code;
- original diagnostic list.

Runtime loading must not recompile or repair author-facing automation definitions found in installed custom storage. Full validation of malformed persisted automation IR is intentionally deferred from this Runtime Source Assembly phase so the current change remains focused on source loading and assembly boundaries.

## Regression Characterization Gate

Before production changes, characterize the current runtime surfaces that could regress. The inventory must cover at least:

- card system initialization order;
- built-in and custom source visibility;
- built-in disabled state;
- custom batch disabled state;
- `getAllBatches()` output shape and ordering;
- `loadCardsByType()` output ordering;
- `cardsByType` rebuilding;
- custom card index and batch payload persistence;
- legacy localStorage recovery paths;
- custom field and variant type aggregation;
- card pack filter options in selection UI;
- card selection into loadout and vault slots;
- protected loadout card replacement;
- card deletion and movement between loadout and vault;
- card image URL lookup for built-in and custom cards;
- card import/runtime refresh behavior for custom packs;
- custom card stats and management summaries.

If a behavior intentionally changes under this design, capture the old behavior first and update the test with an explicit design note in the same implementation step.

This gate must be the first implementation step. Do not extract Runtime Card Projection, source adapters, or the assembler before the current store behavior is protected by focused characterization tests.

The current built-in automation failure is not a behavior to preserve. Cover surrounding runtime behavior with characterization tests, then add built-in automation as a target regression test that initially fails and passes only after built-in source loading compiles automation into runtime templates.

## Testing

Prefer non-React tests for source adapters, assembly, preferences, storage migration, and automation propagation.

Add focused tests for:

- built-in source adapter compiles `Simiah-Nimble` automation into `CardAutomationIR`;
- invalid built-in automation fails source loading with compiler diagnostics;
- invalid built-in structure and invalid built-in semantic content fail source loading with path-preserving diagnostics;
- custom source adapter preserves installed compiled template IR;
- custom source adapter passes installed template automation through without compiling or repairing it;
- projection parity: custom storage projection and built-in projection produce the same runtime template fields before source metadata is added;
- assembler orders built-in source before custom sources;
- assembler orders built-in cards before custom cards inside each card type;
- assembler returns a runtime read model compatible with existing `cards`, `batches`, and `cardsByType` consumers;
- disabled built-in template ids remain reserved for import conflict checks;
- derived indexes document and preserve disabled-source semantics;
- app preferences backfill `cardDisabledSourceIds`;
- migration detects raw preference documents that lack `cardDisabledSourceIds` even after normalization backfills defaults;
- legacy built-in disabled state migrates from custom card index into app preferences;
- migration cleanup removes only the legacy built-in index entry and payload after preference write success;
- failed preference write leaves legacy built-in disabled state intact and preserves effective disabled behavior for the current initialization;
- storage sync writes custom sources only and does not write the built-in batch payload;
- storage sync writes payloads before the custom-only index;
- `setCardRuntimeSourceDisabled(SYSTEM_BUILTIN_CARDS, true)` writes app preferences and reassembles runtime;
- `setCardRuntimeSourceDisabled(customPackId, true)` preserves existing custom index behavior and reassembles runtime;
- failed disabled-state persistence leaves the published runtime read model unchanged and returns a structured failure;
- runtime refresh after import/remove/disable reassembles built-in plus custom sources and publishes atomically;
- selecting a built-in automated card creates an instance with copied IR and produces expected card-sourced contribution;
- existing card selection, movement, deletion, and protected-slot behavior continue to use source-agnostic card actions.

Keep UI tests narrow:

- content pack/card pack UI shows the built-in source summary first;
- built-in source can be disabled but not removed;
- imported custom packs can still be disabled and removed;
- card selection filters list the built-in source first.
- card manager list, open card-detail view, and selection-modal batch filters update after import/remove/disable refreshes;
- card pack UI uses source capabilities instead of `isSystemBatch`.

## Implementation Shape

Suggested new modules:

- `card/runtime/source-types.ts`
- `card/runtime/prepare-card-pack-content.ts`
- `card/runtime/runtime-card-projection.ts`
- `card/runtime/source-assembly.ts`
- `card/runtime/builtin-source-adapter.ts`
- `card/runtime/custom-source-adapter.ts`
- `card/runtime/source-disabled-state.ts`
- card pack management view-model helper

Suggested existing modules to modify:

- `card/stores/store-actions.ts`
- `card/stores/store-types.ts`
- `lib/app-preferences.ts`
- card pack UI view-model helpers that derive capabilities

The exact file names can change during planning, but the boundary should remain:

- source adapters produce snapshots;
- assembler produces runtime read model;
- store installs the assembled read model;
- persistence ports own disabled-state and storage writes.

## Risks

- **Source-kind checks leak into callers:** mitigate by making source adapters and disabled-state persistence the only routing points.
- **Ordering drift:** mitigate by centralizing ordering in the assembler and covering it with tests.
- **Disabled-state loss:** mitigate by writing app preferences before deleting legacy built-in storage.
- **Custom pack lifecycle regression:** mitigate by keeping custom storage format unchanged and adding adapter-level tests.
- **Overbuilding a new runtime architecture:** mitigate by preserving the existing `cards`, `batches`, and `cardsByType` read model and limiting the change to source assembly.

## Rejected Approaches

### Patch legacy converters to copy automation

This is the smallest fix for built-in automation, but it preserves the wrong boundary. Built-in cards would still be loaded through a path designed for custom import/storage compatibility, and storage sync would continue to treat built-in content as a custom batch unless more special cases were added.

### Add `SYSTEM_BUILTIN_CARDS` checks wherever needed

This fixes immediate behavior but spreads source ownership concerns through store actions, UI, storage sync, filtering, and pack management. It makes later card runtime work harder and contradicts the source-boundary direction already used by equipment.

### Full equipment-style card runtime-cache rewrite

This is architecturally cleaner long-term but too broad for the current card automation fix. The current task only needs a source assembly boundary that feeds the existing card read model.
