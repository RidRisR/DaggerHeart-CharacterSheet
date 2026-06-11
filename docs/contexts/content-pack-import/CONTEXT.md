# Content Pack Import Context

This context defines the domain language for content pack formats, import validation, normalization, diagnostics, conflict checks, and storage transactions.

## Language

**Content Pack**:
A user- or system-provided bundle of game content that can be imported, stored, enabled, disabled, queried, or removed as a unit.
_Avoid_: card when referring to equipment packs; save file

**Card Pack**:
A content pack whose templates are cards.
_Avoid_: equipment pack

**Equipment Pack**:
A content pack whose templates are equipment templates, such as weapon templates and armor templates.
_Avoid_: card pack; automation provider

**Pack ID**:
A storage and management identifier for an imported content pack.
_Avoid_: template id; card batch id

**Pack User**:
A person importing, enabling, disabling, selecting, or removing a content pack for play.
_Avoid_: pack author when discussing import success feedback

**Pack Author**:
A person or tool creating, editing, validating, or linting a content pack before distribution.
_Avoid_: pack user when discussing authoring quality feedback

**Content Pack Editor**:
The authoring surface for creating and editing card pack drafts, equipment pack drafts, and future content bundle exports. It may reuse the current `/card-editor` route during migration, but the product concept should not be limited to card packs.
_Avoid_: card editor when discussing equipment authoring; content pack manager

**Content Pack Draft**:
An in-progress authoring state for one pack payload, such as a card pack draft or an equipment pack draft.
_Avoid_: content bundle draft; stored pack; imported pack; runtime pack

**Equipment Editor Draft**:
The current in-editor equipment pack JSON being edited by a pack author. It keeps the `daggerheart.equipment-pack.v1` shape, may be incomplete or invalid, and is not a separate exported draft format.
_Avoid_: equipment-draft format; installed equipment pack; canonical model

**Equipment Editor Import Recovery**:
The lenient editor-only import step that turns a parseable, equipment-shaped JSON object into an **Equipment Editor Draft** by filling missing editor-safe structure, without claiming the file is valid for formal equipment pack import.
_Avoid_: formal equipment import; schema validation; silent successful install

**Equipment Draft Replacement**:
The equipment editor behavior where importing an equipment JSON opens it as the current **Equipment Editor Draft** by replacing the previous draft, rather than merging entries.
_Avoid_: merge import; append import; installed pack update

**Editor Null Placeholder**:
A `null` value written by the editor to preserve an unfinished required field in an exported half-finished draft. It keeps the draft round-trippable through the editor but does not make the file valid for formal import.
_Avoid_: default value; schema-valid empty value; semantic zero

**Standard Equipment Editor Template ID**:
An editor-generated equipment template id made from equipment pack name, pack author, equipment type, and a random suffix. The editor may mechanically replace the pack-name and author prefix when equipment metadata changes, but only when the existing id still matches the previous standard prefix.
_Avoid_: name-derived item id; persisted id lock; rewriting custom template ids

**Content Bundle Draft**:
An in-progress authoring state for a `.dhcb` content bundle. It can reference one or more content pack drafts and describes the bundle file structure that will be written at export time.
_Avoid_: pack payload metadata; imported pack; runtime pack

**Content Bundle Manifest**:
The file index for a content bundle. It declares bundle format, entries, payload paths, and asset roots, but is not the metadata authority for the content packs inside the bundle.
_Avoid_: bundle-level content metadata authority; metadata override layer

**Bundle Entry**:
One file-list item in a **Content Bundle Manifest**. It tells the reader that a payload exists at a safe relative file path and includes the required `kind` used to route that payload to the correct importer. The payload itself remains the authority for its own schema or format version.
_Avoid_: content pack; pack id; storage identity

**Packaged Asset Path**:
A payload-owned asset locator for an asset packaged inside a content bundle. For card images, the current branch only allows a file name stored on the card payload as `imagePath`; it is resolved inside the entry's `assetsPath`, which may be a nested safe relative directory, or inside the legacy bundle-root `images/` directory when `assetsPath` is omitted.
_Avoid_: remote image URL; card id filename convention; arbitrary nested asset path

**Public Schema**:
The JSON Schema that defines the external structure a content pack file must satisfy before it can enter normalization.
_Avoid_: TypeScript type when referring to the third-party file contract

**Official-Facing Terminology**:
Field names and author-facing labels that follow the official rulebook's card anatomy where available, even if internal runtime models use different names.
_Avoid_: exposing implementation terminology in public authoring contracts

**Low-Loss Legacy Mapping**:
A compatibility requirement that conversion from a **Legacy Published Format** into a newer **Public Schema** or **Canonical Model** must not depend on unreliable prose parsing or semantic splitting of free-form text.
_Avoid_: requiring adapters to infer structured rules from markdown descriptions

**Legacy Published Format**:
An older content pack file format that has already been documented or emitted by released tooling and must remain importable and exportable for compatibility with older app versions.
_Avoid_: internal legacy garbage; unsupported old shape

**Legacy Card DHCB**:
The released card package ZIP container shape. It may contain a root `cards.json`, optional root `manifest.json` with the old `DaggerHeart Card Batch` marker, an unparseable manifest that must not block legacy fallback, and optional bundle-root `images/*` files whose names are matched to card IDs.
_Avoid_: content bundle v1; equipment-capable bundle; requiring manifest

**Root Payload Mixed DHCB**:
A deferred compatibility wrapper idea for a `.dhcb` / `.zip` file that may contain root `cards.json`, root `equipment.json`, and legacy root `images/*`. It is not part of the current branch because mixed bundle import/export needs clear bundle-level atomicity and diagnostics before publication.
_Avoid_: current branch requirement; content bundle v1; manifest entries; card import rewrite

**Scoped Equipment JSON Export**:
The current-branch export behavior for equipment authoring. The editor writes one normal `daggerheart.equipment-pack.v1` JSON file for the complete equipment draft, including both weapons and armor, while card packs remain a separate export.
_Avoid_: mixed DHCB export; exporting all editor content by default; weapon-only export; armor-only export; new weapon-pack format

**Future Content Bundle Manifest**:
The deferred manifest-based container design for future `.dhcb` versions. It may define entries and asset roots later, but is not part of the current branch implementation.
_Avoid_: current branch dependency; immediate reader requirement

**Legacy Published Format Schema**:
A JSON Schema that documents and validates a **Legacy Published Format** without creating a new content pack format or changing old-version compatibility expectations.
_Avoid_: new public v1; migration target

**Card Pack Import Model**:
A conservative staging shape used only inside the card pack import workflow after legacy input has been schema-validated and adapted. It supports validation, normalization, diagnostics, conflict checks, and commit planning, but is not a public schema, editor authoring model, storage authority, or future v1 implementation.
_Avoid_: v1-like model; storage model; public schema

**Compatibility Export**:
An export mode that writes a **Legacy Published Format** so pack authors can distribute content to users on older app versions.
_Avoid_: deprecated export when it remains a supported compatibility promise

**Forward Format Export**:
An export mode that writes the newer **Public Schema** or container format for new app versions and future-only capabilities.
_Avoid_: default export unless old-version compatibility has been intentionally dropped

**Deferred Public Schema Exploration**:
A documented schema design that may inform future work but is not an active public contract, default export target, or near-term implementation goal.
_Avoid_: treating exploratory schema notes as shipped compatibility promises

**Downgrade Diagnostic**:
A structured export diagnostic produced when converting newer pack content into a **Legacy Published Format**. It explains lost information, lossy mappings, or why compatibility export is blocked.
_Avoid_: import diagnostic when the problem occurs during export conversion

**Canonical Model**:
The internal normalized model used by application code after external input has been parsed, structurally validated, and normalized.
_Avoid_: raw JSON; imported file

**Template**:
A reusable content definition from a content pack or built-in source. A template is not a character sheet instance.
_Avoid_: slot; saved equipment

**Template ID**:
A stable identifier owned by a template author and used for registry lookup, conflict checks, and content identity.
_Avoid_: runtime contribution id; entry id

**Content Version**:
The version string maintained by a pack author to describe the pack's content release.
_Avoid_: schema version; format version

**Format Identifier**:
The fixed string that identifies the content pack format and schema generation, such as `daggerheart.equipment-pack.v1`.
_Avoid_: content version

**Structural Validation**:
The validation step that checks the raw parsed JSON against the public schema.
_Avoid_: semantic validation

**Normalization**:
The step that converts accepted external input into the canonical model, including trimming strings, applying defaults, and converting allowed aliases to canonical values.
_Avoid_: migration; silent repair

**Semantic Validation**:
The validation step that checks business rules not fully represented by the public schema.
_Avoid_: structural validation; conflict check

**Conflict Check**:
The validation step that checks a structurally and semantically valid pack against current system state, such as built-in template IDs and already imported template IDs.
_Avoid_: duplicate check when current system state matters

**Import Diagnostic**:
A structured message produced by the import pipeline with severity, code, path, message, and optional value.
_Avoid_: raw error string

**Diagnostic Path**:
A JSON Pointer string that identifies the primary location of an import diagnostic in the input document.
_Avoid_: localized field label

**Import Origin**:
Metadata describing where an import input came from, such as a file, object, builtin source, or future container.
_Avoid_: pipeline branch condition

**Warning Diagnostic**:
A non-blocking import diagnostic that may help authors improve content but does not prevent a pack from being imported.
_Avoid_: separate authoring pipeline

**Dry Run**:
An import execution mode that validates and stages data without committing storage or rebuilding runtime registries.
_Avoid_: separate validation pipeline

**Import Result Stage**:
The final pipeline stage reached by an import workflow result.
_Avoid_: committed flag

**Storage Transaction**:
The commit step that updates persistent storage and in-memory state only if all required writes succeed.
_Avoid_: best-effort save

**Application Service**:
The use-case orchestration layer that coordinates import validation, conflict context construction, pack ID generation, repository transactions, and lifecycle result mapping for content pack workflows.
_Avoid_: UI store; repository adapter; validator

**Repository Port**:
The storage-neutral interface that describes how content packs are loaded, committed, removed, toggled, and checked for integrity.
_Avoid_: localStorage API; Zustand store

**Service Composition Root**:
The application boundary that chooses concrete service implementations, such as whether an equipment pack repository uses localStorage, IndexedDB, or a backend API, and wires them into application services and UI stores.
_Avoid_: UI store; import pipeline; business rule layer

**Persistence Adapter**:
A concrete implementation of a repository port for a specific storage backend, such as localStorage, IndexedDB, or a backend API.
_Avoid_: storage model; domain repository contract

**Storage Snapshot**:
A repository read result that combines stored pack lifecycle state, full pack data, pack count, and integrity report without exposing the persisted index or materializing query summaries.
_Avoid_: persisted index; runtime query index

**Registry**:
The runtime read model used to look up or query currently selectable templates.
_Avoid_: storage index; automation registry

**Storage Index**:
The persistent lifecycle authority used to locate and manage stored content pack data.
_Avoid_: query index; registry

**Pack Data**:
The persistent content authority for one stored content pack.
_Avoid_: lifecycle status; storage index

**Query Index**:
The runtime-derived index used for fast template filtering and lookup.
_Avoid_: storage index

**Query Criterion Group**:
A set-valued runtime query condition for one selectable template field. Values inside one criterion group are ORed; different criterion groups are ANDed.
_Avoid_: single dropdown value; combined query index

**Unconstrained Criterion Group**:
A query criterion group with no selected values. It means the field is not restricted and is equivalent to selecting all currently available values.
_Avoid_: no matching values; empty result filter

**Selectable Runtime Read Model**:
The runtime view used by selection flows; it includes built-in templates and enabled custom templates, and excludes disabled custom pack templates.
_Avoid_: storage snapshot; management state

**Runtime Source**:
The source bucket used by runtime selection flows to filter selectable templates. Built-in templates use the runtime source `builtin`; enabled equipment packs use their Pack ID as runtime source.
_Avoid_: import origin; source file; pack author

**Stable Runtime Cache View**:
The in-memory cache view that has been rebuilt from recovered storage state and is stable enough for runtime queries, selection flows, and import success semantics.
_Avoid_: storage snapshot; persisted index

## Relationships

- A **Content Pack** may be a **Card Pack** or an **Equipment Pack**.
- A **Pack ID** identifies the stored pack unit; a **Template ID** identifies reusable content inside a pack.
- A **Pack User** may receive a simplified import result while **Warning Diagnostics** remain available in details or advanced views.
- A **Pack Author** can use the same import pipeline in **Dry Run** mode to see error and warning diagnostics without committing data.
- An **Import Origin** provides metadata for diagnostics and results; parsed-vs-text handling is determined by the raw payload shape, not by origin.
- A **Content Bundle Manifest** is a file index, not a content metadata authority. It must not override card pack or equipment pack payload metadata.
- An **Import Result Stage** records where the workflow stopped; `runtimeCacheBuild` with success means the import is complete and runtime-available.
- A successful **Dry Run** stops at `stageImportData`, not `runtimeCacheBuild`.
- An **Import Diagnostic** has one primary **Diagnostic Path** and may reference related paths for multi-location issues.
- A **Public Schema** defines the accepted external JSON shape.
- A **Public Schema** should use **Official-Facing Terminology** for author-facing fields when the rulebook provides stable card anatomy terms.
- **Official-Facing Terminology** must be balanced with **Low-Loss Legacy Mapping**. Public schemas should not require legacy adapters to split a markdown rule paragraph into multiple semantic feature objects unless the legacy data already has that structure.
- Internal runtime or canonical fields may differ from **Official-Facing Terminology**, but adapters must own that mapping explicitly.
- A **Legacy Published Format** may remain a supported import and export contract even when new capabilities move to a newer **Public Schema**.
- Import workflows may convert a **Legacy Published Format** into the current **Canonical Model** through adapters, while export workflows may convert current content back to a **Legacy Published Format** through **Compatibility Export**.
- New editor versions should not make old-version-incompatible files the default output without an explicit compatibility decision.
- A **Forward Format Export** can expose new schema or container capabilities, but should be labeled as requiring a compatible app version.
- For card packs, the legacy JSON / legacy DHCB / current editor export shape is the near-term public contract. A **Legacy Published Format Schema** may be published to standardize that existing contract. `daggerheart.card-pack.v1` is a **Deferred Public Schema Exploration**, not the default card-only export format or a near-term implementation target.
- Card pack import refactoring should modernize the workflow around the **Legacy Published Format** rather than force pack authors onto a new card-only schema. Internally, the workflow may adapt legacy input into a **Card Pack Import Model** for validation, normalization, diagnostics, conflict checks, and commit planning.
- The **Card Pack Import Model** should stay conservative and close to legacy input. It must not introduce extra reshaping solely for i18n, future v1, or storage migration.
- Current equipment editor work should use **Scoped Equipment JSON Export** rather than mixed DHCB export. Mixed bundles can return later only with explicit export scope, bundle-level preflight, and atomic success/failure semantics.
- Content bundle export must not hide card-only incompatibility behind equipment support. If a future bundle contains cards, the card payload should remain legacy-compatible by default unless the author explicitly opts into a future-only card capability with clear diagnostics.
- A **Downgrade Diagnostic** belongs to export compatibility. It must distinguish lossless compatibility export, lossy compatibility export with warnings, and blocked compatibility export.
- A **Canonical Model** is produced only after parsing, structural validation, and normalization.
- A **Template ID** is stable content identity, not a runtime sheet identity.
- A **Content Version** is maintained by the pack author; a **Format Identifier** is maintained by the application.
- **Structural Validation**, **Normalization**, **Semantic Validation**, **Conflict Check**, and **Storage Transaction** are separate import pipeline stages.
- A failed import before **Storage Transaction** must return **Import Diagnostics** and must not mutate storage or runtime registries.
- **Equipment Editor Import Recovery** may accept incomplete equipment JSON for continued authoring, but it must reject inputs that cannot be safely rendered as an **Equipment Editor Draft**. It does not replace **Structural Validation**, **Semantic Validation**, or formal equipment pack import.
- **Equipment Draft Replacement** is the current equipment editor import behavior. Importing into the editor opens one equipment JSON as the current draft and does not merge weapons or armor into an existing draft.
- An **Editor Null Placeholder** may appear in editor-exported half-finished equipment JSON. Formal import validation must still treat it as invalid when the field is required by the public schema.
- A **Standard Equipment Editor Template ID** is generated when a pack author creates a new weapon or armor template in the editor. If equipment pack `name` or `author` changes, only ids matching the previous standard prefix are rewritten. Non-standard ids remain unchanged.
- A successful import may include **Warning Diagnostics**; warnings must not block storage commit or runtime cache build.
- An **Application Service** is the only layer that orchestrates full import commit, remove, enable, and disable workflows.
- UI stores, repository adapters, and import validators should not duplicate **Application Service** workflow decisions.
- A **Service Composition Root** chooses concrete persistence implementations. UI stores should depend on application services or repository ports through this composition boundary, not directly decide whether localStorage or a future backend is used.
- A **Repository Port** keeps storage behavior independent from localStorage, IndexedDB, backend APIs, or UI stores.
- A **Persistence Adapter** implements a **Repository Port** for one storage backend.
- A **Storage Snapshot** is derived by reading the **Storage Index** and **Pack Data** together.
- A **Storage Snapshot** is a repository output, not a long-lived UI store contract or a selectable template index.
- Public repository reads return **Storage Snapshots** after integrity recovery; raw storage state is adapter-internal.
- A **Storage Index** is lifecycle authority, not a content metadata cache.
- **Pack Data** is content authority, not lifecycle status.
- A successful **Storage Transaction** returns the post-transaction **Storage Snapshot** for storage result mapping and for future cache/runtime layers to consume.
- A **Storage Snapshot** alone does not define end-user runtime availability; runtime availability is defined by the later cache/runtime read model.
- A committed import is complete only after a **Stable Runtime Cache View** has been established from the recovered **Storage Snapshot**.
- Runtime lifecycle actions operate on a valid **Storage Snapshot** established by recovery-capable initialization or explicit integrity recovery; they do not revalidate stored pack content on every toggle or removal.
- Disabled packs remain in the **Storage Snapshot** and management state with complete pack data, but their templates are excluded from the **Selectable Runtime Read Model**.
- A **Registry** and **Query Index** are runtime read models.
- A **Runtime Source** is a selection/query concept, not an **Import Origin**. It answers which built-in source or enabled pack a selectable template belongs to.
- Disabled packs do not appear as **Runtime Sources** in selection flows because their templates are excluded from the **Selectable Runtime Read Model**.
- Runtime selection filters use **Query Criterion Groups** for source, tier, weapon type, trait, damage type, range, and burden. Empty or omitted criterion groups do not constrain the query.
- An **Unconstrained Criterion Group** must not produce an empty result by itself; it means "do not filter this field".
- Within one **Query Criterion Group**, selected values are alternatives. Across different criterion groups, selected values are combined as required conditions.
- Per-pack template IDs, weapon counts, armor counts, and filtering indexes are derived by helper functions or runtime read models, not materialized in the **Storage Snapshot**.
- Whether a **Storage Snapshot** is retained, released, or transformed after repository operations is a cache/store policy outside the storage repository stage.
- An **Equipment Pack** template does not become an automation source until it is instantiated into character sheet equipment state.
- A **Conflict Check** should use a context derived from a **Storage Snapshot**, not duplicated template IDs persisted in the **Storage Index**.

## Import Pipeline

```text
Source Read
  -> JSON Parse
  -> Authoring Preprocess
  -> Structural Validation
  -> Canonical Normalize
  -> Semantic Validation
  -> Conflict Check
  -> Stage Import Data
  -> Build Commit Plan
  -> Storage Transaction
  -> Runtime Cache Build
  -> Result Mapping
```

Pipeline stages:

- **Source Read** reads raw input from a file, object, builtin source, or future container source.
- **JSON Parse** converts textual JSON into an unknown object and reports invalid JSON before schema validation.
- **Authoring Preprocess** applies explicit authoring conveniences, such as locale alias conversion and string edge trimming, without guessing or repairing business meaning.
- **Structural Validation** validates the preprocessed object against the public schema.
- **Canonical Normalize** creates the internal canonical model and applies explicit defaults.
- **Semantic Validation** checks business rules that are not structural schema rules.
- **Conflict Check** checks the canonical pack against current system state.
- **Stage Import Data** builds a staged import / commit draft from canonical data without mutating state or assigning final storage identity.
- **Build Commit Plan** assigns final storage identity and lifecycle metadata to staged import data before repository commit.
- **Storage Transaction** commits persistent writes and in-memory state only if the transaction succeeds.
- **Runtime Cache Build** rebuilds runtime template lookup and query models after successful storage commit.
- **Result Mapping** returns the unified import result and diagnostics.

## Flagged Ambiguities

- "卡包" can mean a card pack specifically or a content pack generally. Use **Content Pack** for the general category, **Card Pack** for card-only packs, and **Equipment Pack** for equipment-only packs.
- "batch" is a legacy card-store implementation term for a stored card-pack import unit. Use **Content Pack**, **Equipment Pack**, and **Pack ID** in the equipment-pack design unless referring to existing card code.
- "版本" can mean content version or format identifier. Use **Content Version** for author-maintained releases and **Format Identifier** for schema/format selection.
- "Registry" can refer to template selection or automation calculation. Use **Registry** in this context only for content pack template lookup; say **automation registry** when discussing modifier calculation.
- "warning" can mean user-facing UI noise or useful author guidance. Use **Warning Diagnostic** for non-blocking pipeline output, and describe UI visibility separately as presentation policy.
