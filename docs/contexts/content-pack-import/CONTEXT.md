# Content Pack Import Context

This context defines the domain language for content pack formats, import validation, normalization, diagnostics, commit planning, and storage transactions.

## Language

**Content Pack**:
A user- or system-provided bundle of game content that can be imported, stored, enabled, disabled, queried, or removed as a unit.
_Avoid_: card when referring to equipment packs; save file

**Card Pack**:
A content pack whose templates are cards.
_Avoid_: equipment pack

**Class**:
A player character class card category in a card pack.
_Avoid_: profession

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
_Avoid_: content bundle draft; stored pack; imported pack; runtime pack; editor workspace metadata

**Editor Draft Recovery**:
The lenient editor-only import step that turns a parseable content-pack-shaped file into a **Content Pack Draft** for continued editing, possibly filling editor-safe structure, without claiming the file is valid for formal import.
_Avoid_: formal import; schema validation; installed pack import

**Editor Draft Repair**:
An editor-only recovery behavior that may preserve existing authoring ergonomics, such as completing ancestry pairs or subclass triples when opening a draft for continued editing.
_Avoid_: formal import normalization; editor draft validation; export serialization

**Editor Draft Export**:
The editor action that writes the current **Content Pack Draft** for round-trip authoring. It may be more permissive than formal import because the exported file may be imported back into the editor rather than installed for play.
_Avoid_: formal import validation; install action; public release guarantee

**Editor Draft Export Serialization**:
The non-mutating export step that produces the actual payload or bundle view written by **Editor Draft Export**, including removing editor-only state and excluding packaged assets that do not belong to current draft content.
_Avoid_: editor draft validation; editor draft recovery; draft repair; storage cleanup

**Editor Draft Validation**:
The read-only editor action that serializes the current **Content Pack Draft** to the same payload shape the editor would actually export, runs **Dry Run** against that payload, then explicitly runs **Editor-Owned Authoring Checks** in the editor layer and combines both results into an editor validation view model.
_Avoid_: export; editor draft recovery; second validator; draft repair; import workflow stage

**Editor-Owned Authoring Checks**:
Editor-layer checks that run only inside **Editor Draft Validation** orchestration, such as requiring ancestry cards to appear in pairs or subclass cards to appear in triples. They are not an import workflow stage, do not belong to **Dry Run**, do not run during formal import, and should live in the editor application service or editor adapter layer rather than `card/import` or `equipment/import`.
_Avoid_: dry-run stage; import validation stage; commit-plan preflight; formal import diagnostic source

**Editor-Local Authoring Diagnostic**:
A diagnostic produced only by an editor validation action for authoring regularity, such as requiring ancestry cards to appear in pairs or subclass cards to appear in triples. It helps pack authors make a clean draft but does not become a formal import blocking rule unless the formal import workflow also reports it.
_Avoid_: formal import diagnostic; storage conflict; schema validation error

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

**Pack-Scoped Card Image**:
An imported card image stored under a pack-owned image namespace, keyed by both Pack ID and card ID rather than by global card ID alone.
_Avoid_: editor image; global image; public image path

**Legacy Global Card Image**:
The older imported-card image record keyed only by card ID in IndexedDB. It remains readable during migration and compatibility fallback, but new DHCB imports should write **Pack-Scoped Card Images**.
_Avoid_: pack-scoped image; editor image

**Editor Image Workspace**:
The best-effort image storage used by the content pack editor while a pack author is editing a draft. It may allow partial image import failures, asynchronous cleanup, and workspace replacement behavior because it is not committed content. Formal import asset storage must not reuse these relaxed semantics.
_Avoid_: pack-scoped image storage; formal import asset storage; committed content image namespace

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

**Legacy Card Format**:
The released card-pack payload shape that uses grouped arrays and legacy Chinese card field names, such as `profession`, `ancestry`, `community`, `subclass`, `domain`, and `variant`.
_Avoid_: future card schema; storage model; unsupported old shape

**Legacy Card Adapter**:
The compatibility adapter that converts a **Legacy Card Format** payload into the **Card Pack Internal Validation Schema** shape before structural validation.
_Avoid_: storage migration; best-effort repair; runtime normalizer

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

**Card Pack Public Schema**:
An intentionally published JSON Schema for pack authors and third-party tools. A schema becomes public only when it is released through public docs, public schema files, examples, and compatibility guidance.
_Avoid_: internal validation schema; storage model; runtime read model

**Card Pack Internal Validation Schema**:
The English, shape-preserving JSON Schema used inside the card import workflow after external payloads have been adapted. The first version uses the format identifier `daggerheart.card-pack.v1`, is accepted from external imports, and is the mandatory structural shape for downstream validation, but it is not the editor's default export format while legacy export compatibility remains required.
_Avoid_: legacy card format; storage model; default editor export

**External Format Adapter**:
A workflow boundary that converts one accepted external payload shape, such as **Legacy Card Format** or a future public card-pack schema, into the **Card Pack Internal Validation Schema** shape.
_Avoid_: semantic validator; storage migration; editor draft repair

**Source Adaptation**:
The Dry Run boundary that applies an **External Format Adapter** or equivalent source-view conversion before structural validation while preserving author-facing diagnostic locations.
_Avoid_: authoring preprocess; editor draft repair; editor-owned authoring checks; semantic validation

**External Import File**:
The actual file or container supplied to the import workflow, such as a card-pack JSON file or a legacy card DHCB.
_Avoid_: public schema; import model; storage model

**Card Pack Import Model**:
A conservative staging shape used only inside the card pack import workflow after legacy input has been schema-validated and adapted. It supports dry-run validation, normalization, and diagnostics, and may be consumed by **Commit Plan** building, but it is not a public schema, editor authoring model, storage authority, or future v1 implementation.
_Avoid_: v1-like model; storage model; public schema

**Prepared Card Pack Runtime Content**:
The result of shared card-pack content preparation after source adaptation, structure validation, automation compilation, and semantic validation, before either runtime projection or import-specific commit planning.
_Avoid_: commit plan; storage payload; installed pack; runtime source snapshot

**Runtime Card Projection**:
The workflow step that converts accepted card-pack import data into the current runtime card read model, such as `StandardCard` / `ExtendedStandardCard`, for existing selection and display code.
_Avoid_: public schema; storage authority; validation model

**Card Runtime Source**:
A card content source that has already become queryable and selectable by the application, whether it came from bundled built-in content or an installed custom card pack.
_Avoid_: card pack when discussing import/storage lifecycle; batch; storage record

**Built-in Card Runtime Source Loading**:
The workflow that turns bundled built-in card data into a Card Runtime Source without installing it as a custom card pack.
_Avoid_: built-in import; commit plan; storage transaction

**Card Automation Definition**:
A structured external automation wrapper supplied by a pack author, editor, or Editor Draft Export workflow and compiled during import before installation.
_Avoid_: normalized runtime IR, rule text, prose inference, runtime script

**Normalized Card Automation IR**:
The compiled automation form stored on installed card templates and copied to character sheet card instances.
_Avoid_: external automation definition, authoring syntax, editor draft text

**Card Automation Revision**:
A stable identity for a Normalized Card Automation IR, used to detect differences between an installed template and an existing character sheet instance.
_Avoid_: content version, format identifier

**Runtime Refresh Adapter**:
The application boundary that refreshes the current runtime card store after storage commit. In this phase it wraps existing store rebuild helpers instead of introducing a new runtime registry architecture.
_Avoid_: storage backend adapter; storage format adapter; full runtime registry rewrite

**Storage Format Adapter**:
The workflow boundary that converts a **Card Import Commit Plan** into the concrete storage payload shape for the selected card-pack storage format, such as the current legacy card batch storage shape or a future card pack storage version.
_Avoid_: storage backend adapter; semantic validator; public schema adapter; UI mapper

**Storage Backend Adapter**:
The persistence boundary that writes a storage-format payload to a concrete backend, such as localStorage plus IndexedDB, IndexedDB-only storage, or a backend API. It owns backend keys, write order, compensation cleanup, and integrity recovery mechanics.
_Avoid_: storage format adapter; public schema adapter; semantic validator

**Legacy Card Batch Storage Format**:
The current custom-card localStorage payload shape for installed card packs. It stores batch metadata plus `cards: ExtendedStandardCard[]`, custom field definitions, and variant types. It is a compatibility storage target, not the card-pack import contract or long-term storage authority.
_Avoid_: public schema; normalized pack data; editor draft

**Commit Plan**:
The storage-aware, pre-commit description of persistent writes an import would perform, including pack metadata, templates, lifecycle state, and packaged assets. Building a commit plan is the boundary that checks whether a dry-run-valid pack can be imported into the current local installation.
_Avoid_: storage transaction; public schema; runtime read model

**Card Import Commit Plan**:
A card-pack-specific **Commit Plan** built from a successful **Dry Run** result by performing storage-aware importability checks and producing the planned writes. It is the boundary between import validation/staging and storage-format projection, and describes what pack should be installed before any concrete storage format or backend writes are chosen.
_Avoid_: dry-run result; editor draft; direct localStorage payload

**Compatibility Facade**:
A stable legacy-facing API surface that preserves older call shapes while delegating to the current import workflow instead of maintaining a separate implementation.
_Avoid_: legacy import flow; duplicate pipeline; deprecated store path

**Card Import Storage Snapshot**:
A comparable view of installed card-pack storage that includes only card import index entries, legacy batch content, and pack-scoped image metadata needed to verify import results.
_Avoid_: full localStorage dump; runtime card registry; browser profile backup

**Local Card Pack Fixture Set**:
A local, ignored collection of real card pack files used to verify import compatibility and storage projection without becoming a published fixture set or public compatibility promise.
_Avoid_: public sample pack; CI fixture; authoring guide example

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
The storage-aware check, performed while building a **Commit Plan**, that compares a dry-run-valid pack against current system state, such as built-in template IDs and already imported template IDs.
_Avoid_: duplicate check when current system state matters

**Import Diagnostic**:
A structured message produced by the import pipeline with severity, code, path, message, and optional value.
_Avoid_: raw error string

**Diagnostic Path**:
A JSON Pointer string that identifies the primary location of an import diagnostic in the input document.
_Avoid_: localized field label

**Diagnostic Source Map**:
A mapping produced by an external format adapter, editor export serializer, or normalization boundary that relates workflow diagnostic paths to the author-facing payload paths and editor jump targets that produced them.
_Avoid_: UI-only field label table; hardcoded legacy path mapper

**Import Origin**:
Metadata describing where an import input came from, such as a file, object, builtin source, or future container.
_Avoid_: pipeline branch condition

**Warning Diagnostic**:
A non-blocking import diagnostic that may help authors improve content but does not prevent a pack from being imported.
_Avoid_: separate authoring pipeline

**Dry Run**:
An import execution mode that validates the content pack itself without committing storage, rebuilding runtime registries, or using current local storage state. It includes source reading, source adaptation, structural validation, normalization, semantic validation, diagnostics, and staging needed to describe the pack, but it does not build a **Commit Plan** or perform installed-content **Conflict Check**.
_Avoid_: install preflight; storage-aware validation; separate validation pipeline

**Import Result Stage**:
The final pipeline stage reached by an import workflow result.
_Avoid_: committed flag

**Storage Transaction**:
The commit step that updates persistent storage and in-memory state only if all required writes succeed.
_Avoid_: best-effort save

**Compensation Cleanup**:
The rollback-style cleanup performed after a multi-store commit fails, removing artifacts written by the failed import according to its write set. It is not a true cross-storage transaction and must be backed by later integrity recovery.
_Avoid_: database transaction; best-effort ignore

**Application Service**:
The use-case orchestration layer that coordinates import validation, commit plan building, pack ID generation, repository transactions, and lifecycle result mapping for content pack workflows.
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
A repository read result exposed to an application service. It combines pack lifecycle state, conflict-check identifiers, pack count, and integrity report without exposing persisted indexes, backend keys, legacy storage payloads, or full runtime template arrays. Repository implementations may use richer internal recovered storage views, but those are not application-facing snapshots.
_Avoid_: persisted index; runtime query index; legacy BatchData; full runtime card arrays

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
The runtime view used by selection flows; it includes templates from enabled runtime sources and excludes templates from disabled runtime sources.
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
- **Built-in Card Runtime Source Loading** and the external card **Import Workflow** do not share one end-to-end lifecycle, but they should share **Prepared Card Pack Runtime Content** and **Runtime Card Projection** below their separate lifecycle orchestration.
- Disabling a **Card Runtime Source** removes that source's templates from the **Selectable Runtime Read Model**; it does not change existing character-sheet Card Instances or their instance-owned automation.
- A **Pack User** may receive a simplified import result while **Warning Diagnostics** remain available in details or advanced views.
- A **Pack Author** can use the same import pipeline in **Dry Run** mode to see source, structural, normalization, and semantic diagnostics without committing data or depending on current local storage state.
- A failed **Dry Run** for an **Equipment Editor Draft** blocks treating the draft as a valid equipment pack payload, but does not block **Scoped Equipment JSON Export** of the current authoring draft.
- The same equipment-pack **Import Diagnostic** should use one consistent domain explanation across authoring and formal import views. Pack Author dry-run copy should guide the author to fix the draft and rerun validation; Pack User formal-import copy should guide the user to fix the file and import again.
- An **Import Origin** provides metadata for diagnostics and results; parsed-vs-text handling is determined by the raw payload shape, not by origin.
- A **Content Bundle Manifest** is a file index, not a content metadata authority. It must not override card pack or equipment pack payload metadata.
- An **Import Result Stage** records where the workflow stopped; `runtimeCacheBuild` with success means the import is complete and runtime-available.
- A successful **Dry Run** stops before storage-aware **Commit Plan** building, **Storage Transaction**, or `runtimeCacheBuild`.
- Import workflows have three responsibility boundaries: **Dry Run** validates the pack itself without storage state; **Commit Plan** building uses current storage and built-in state to decide whether that valid pack can be imported and what would be written; **Storage Transaction** executes that plan.
- An **Import Diagnostic** has one primary **Diagnostic Path** and may reference related paths for multi-location issues.
- A **Diagnostic Source Map** should be produced by the boundary that changes payload shape. UI projection should use the source map to show author-facing paths and editor jump targets instead of hardcoding one legacy mapping table.
- User-facing diagnostic views should prioritize readable author-facing explanations and locations. Internal diagnostic paths, raw codes, and raw values should be available only as necessary technical details, not as the primary message.
- **Editor Draft Validation** diagnostic copy is addressed to a **Pack Author** and should guide them to fix the draft and validate again. Formal import diagnostic summary is addressed to a **Pack User**; detail copy may remain actionable for authors, but should use import-oriented actions such as fixing the file and importing again.
- A **Public Schema** defines the accepted external JSON shape.
- A **Public Schema** should use **Official-Facing Terminology** for author-facing fields when the rulebook provides stable card anatomy terms.
- **Official-Facing Terminology** must be balanced with **Low-Loss Legacy Mapping**. Public schemas should not require legacy adapters to split a markdown rule paragraph into multiple semantic feature objects unless the legacy data already has that structure.
- Internal runtime or canonical fields may differ from **Official-Facing Terminology**, but adapters must own that mapping explicitly.
- A **Legacy Published Format** may remain a supported import and export contract even when new capabilities move to a newer **Public Schema**.
- Import workflows may convert a **Legacy Published Format** into the current **Canonical Model** through adapters, while export workflows may convert current content back to a **Legacy Published Format** through **Compatibility Export**.
- New editor versions should not make old-version-incompatible files the default output without an explicit compatibility decision.
- A **Forward Format Export** can expose new schema or container capabilities, but should be labeled as requiring a compatible app version.
- For card packs, the legacy JSON / legacy DHCB / current editor export shape remains a required compatibility contract and default editor export target. The English shape-preserving `daggerheart.card-pack.v1` schema is accepted for external import and required internally as the **Card Pack Internal Validation Schema**, but it is not the default editor export format.
- An **External Import File** is not itself the public contract; the public contract is the payload shape it contains, such as the **Legacy Published Format** inside a JSON file or legacy card DHCB.
- Card pack import refactoring should keep **Legacy Card Format** files importable through a **Legacy Card Adapter** rather than force existing pack authors to rewrite old packs. Internally, the workflow may adapt legacy input into the **Card Pack Internal Validation Schema** and then into a **Card Pack Import Model** for dry-run validation, normalization, and diagnostics before commit planning consumes the staged result.
- The **Card Pack Import Model** should stay conservative and close to legacy input. It must not introduce extra reshaping solely for i18n, future v1, or storage migration.
- A **Card Pack Public Schema** documents an intentionally published author-facing payload contract, a **Card Pack Internal Validation Schema** stabilizes workflow validation, an **External Format Adapter** converts accepted external shapes into that internal schema, a **Card Pack Import Model** is an internal workflow shape, and a **Commit Plan** describes possible durable writes.
- Absence of a **Format Identifier** in a card-pack payload means the importer should treat it as **Legacy Card Format**. Presence of `daggerheart.card-pack.v1` means the importer should validate it directly as **Card Pack Internal Validation Schema**. Presence of any other unrecognized card-pack **Format Identifier** must produce an unsupported-format diagnostic and must not fall back to legacy parsing.
- The first-wave **Card Pack Internal Validation Schema** should preserve the legacy top-level grouped arrays, using normalized group names such as `classes`, `ancestries`, `communities`, `subclasses`, `domains`, and `variants`.
- The **Card Pack Internal Validation Schema** should use English official-facing field names for individual card properties. Legacy Chinese card property names belong at the **Legacy Card Adapter** input boundary only.
- The **Card Pack Internal Validation Schema** should be strict about unknown fields. Legacy card payloads may be leniently adapted for compatibility, but unknown legacy fields should produce **Warning Diagnostics** and be discarded before structural validation.
- Storage structures and runtime read models must not define what a pack author is required to write in either **Legacy Card Format**, any future **Card Pack Public Schema**, or the **Card Pack Internal Validation Schema**.
- Card pack formal import should not commit directly from a dry-run result into localStorage. It should first build a **Card Import Commit Plan**, including storage-aware **Conflict Check**, then execute that plan through a storage/application boundary.
- A **Card Import Commit Plan** should be built only after storage-aware importability checks, such as template ID conflicts and pack limits, succeed. Those checks belong to commit planning, not to **Dry Run** or the storage backend, though backends may still reject stale or duplicate pack writes defensively.
- Like equipment-pack final commit plans, a **Card Import Commit Plan** should include final pack identity, imported timestamp, source summary, staged pack data, and lifecycle defaults such as `disabled: false`.
- This phase keeps **Legacy Card Batch Storage Format** as the selected card import storage format, but it must be reached through a **Storage Format Adapter** so future storage format changes do not rewrite validation and staging.
- This phase uses a localStorage/IndexedDB **Storage Backend Adapter** for card packs, but backend keys and persistence mechanics must not leak into **Card Import Commit Plan** or validation stages.
- The legacy card storage **Storage Format Adapter** should produce a complete legacy storage projection, including stored pack data and index entry. The **Storage Backend Adapter** should not rederive business fields from the import model; it should handle backend keys, serialization, write order, compensation cleanup, and recovery.
- **Runtime Card Projection** is separate from **Storage Transaction**. Converting imported card content into `StandardCard` / `ExtendedStandardCard` does not by itself install the pack, write localStorage, import images, or rebuild runtime indexes.
- A **Card Automation Definition** belongs to external card-pack authoring, import, and export. It must be compiled, normalized, and validated by **Dry Run** before commit.
- **Normalized Card Automation IR** stored on an installed card template is a source for future character sheet card instances, not the runtime authority for existing instances.
- A **Card Automation Revision** identifies automation logic, not pack release metadata. It is separate from **Content Version** and **Format Identifier**.
- Current equipment editor work should use **Scoped Equipment JSON Export** rather than mixed DHCB export. Mixed bundles can return later only with explicit export scope, bundle-level preflight, and atomic success/failure semantics.
- Content bundle export must not hide card-only incompatibility behind equipment support. If a future bundle contains cards, the card payload should remain legacy-compatible by default unless the author explicitly opts into a future-only card capability with clear diagnostics.
- A **Downgrade Diagnostic** belongs to export compatibility. It must distinguish lossless compatibility export, lossy compatibility export with warnings, and blocked compatibility export.
- A **Canonical Model** is produced only after parsing, structural validation, and normalization.
- A **Template ID** is stable content identity, not a runtime sheet identity.
- A **Content Version** is maintained by the pack author; a **Format Identifier** is maintained by the application.
- **Source Adaptation**, **Structural Validation**, **Normalization**, and **Semantic Validation** belong to **Dry Run**. Storage-aware checks such as template ID conflicts and pack limits belong to **Commit Plan** building. Durable writes belong to **Storage Transaction**.
- A failed import before **Storage Transaction** must return **Import Diagnostics** and must not mutate storage or runtime registries.
- **Equipment Editor Import Recovery** may accept incomplete equipment JSON for continued authoring, but it must reject inputs that cannot be safely rendered as an **Equipment Editor Draft**. It does not replace **Structural Validation**, **Semantic Validation**, or formal equipment pack import.
- **Equipment Draft Replacement** is the current equipment editor import behavior. Importing into the editor opens one equipment JSON as the current draft and does not merge weapons or armor into an existing draft.
- An **Editor Null Placeholder** may appear in editor-exported half-finished equipment JSON. Formal import validation must still treat it as invalid when the field is required by the public schema.
- A **Standard Equipment Editor Template ID** is generated when a pack author creates a new weapon or armor template in the editor. If equipment pack `name` or `author` changes, only ids matching the previous standard prefix are rewritten. Non-standard ids remain unchanged.
- **Editor Draft Repair** is an explicit editor-only phase inside **Editor Draft Recovery**. For card drafts, automatic ancestry-pair and subclass-triple completion belongs to repair, not to parsing, formal validation, export serialization, or dry-run validation.
- **Content Pack Draft** content should not include editor workspace metadata such as dirty flags or last-saved timestamps. Legacy persisted drafts may still contain old editor-only fields, but export and validation serialization should construct payloads from an explicit whitelist and naturally ignore those residues.
- **Editor Draft Recovery** and **Editor Draft Export** may be lenient to preserve authoring round trips. **Editor Draft Validation** validates the serialized draft payload with **Dry Run**, separately runs **Editor-Owned Authoring Checks**, and combines both results in the editor layer. **Dry Run** results must not contain **Editor-Local Authoring Diagnostics**.
- **Editor-Owned Authoring Checks** are editor concerns, not import workflow stages. Formal import and content manager flows do not run them.
- **Editor Image Workspace** behavior may be best-effort, such as continuing draft recovery when one editor image fails to persist or deleting editor images asynchronously after draft mutation. Formal card import asset writes remain part of **Storage Transaction** and must preserve import atomicity.
- **Persisted Editor Workspace Recovery** runs when the editor opens an existing local `card-editor-storage` draft. It is a silent editor maintenance step, not file import, dry run, or validation. It may remove legacy editor-only fields, reconcile stale `hasLocalImage` flags against the actual **Editor Image Workspace**, and run best-effort orphan image cleanup so the editor UI reflects real local image availability.
- A successful import may include **Warning Diagnostics**; warnings must not block storage commit or runtime cache build.
- An **Application Service** is the only layer that orchestrates full import commit, remove, enable, and disable workflows.
- UI stores, repository adapters, and import validators should not duplicate **Application Service** workflow decisions.
- A **Service Composition Root** chooses concrete persistence implementations. UI stores should depend on application services or repository ports through this composition boundary, not directly decide whether localStorage or a future backend is used.
- A **Repository Port** keeps storage behavior independent from localStorage, IndexedDB, backend APIs, or UI stores.
- A **Persistence Adapter** implements a **Repository Port** for one storage backend.
- The card import refactor should initially extract only the formal import commit path behind an **Application Service** and repository ports. It should not require rewriting every card-store runtime hook, stats query, editor action, or management action in the same phase.
- The formal card import **Application Service** should depend on one card import repository port for recovery, conflict context, and commit. That repository implementation may internally coordinate separate content, index, and image backend adapters, but business logic should not understand those storage mechanics.
- The card-pack repository port should stay structurally aligned with the equipment-pack repository port: load snapshot, ensure integrity, commit import, remove pack, and set disabled state. Card-specific image coordination belongs inside the repository implementation, not the application service.
- Card-pack storage transaction results and integrity issue models should stay structurally aligned with equipment-pack storage. Repository-level card id conflicts should use the shared template language, such as `TEMPLATE_ID_CONFLICT`, while card-specific wording belongs in application diagnostics or UI copy.
- Card import conflict context should be constructed by the **Application Service** from imported-pack repository snapshots plus a separate built-in card ID dependency. Import pipelines should not read Zustand stores, localStorage, or built-in card assets directly for conflict checks.
- Card-pack storage snapshots exposed to the **Application Service** should contain management and conflict-check summaries, such as pack lifecycle data and template IDs, rather than legacy `BatchData`, localStorage keys, or full runtime card arrays.
- Card import Pack IDs should be generated by the **Application Service** before repository commit, following the equipment-pack application-service pattern. This phase should keep the legacy `batch_${timestamp}_${random}` style where practical and avoid deriving pack identity from pack names.
- Built-in base card initialization may be revisited later so built-in cards no longer need to be written as localStorage or batch-like state, but that is outside the current card import commit-path phase.
- Old formal card import entrypoint names may remain temporarily as facades for UI compatibility, but old validation/commit/image-write implementations must not remain as a second real import path alongside the new **Application Service**.
- Formal JSON card import and legacy DHCB card import should differ only in source intake. After cards JSON and optional image assets are read, both should use the same card import **Application Service** path, aligned with the equipment-pack `importFromSource` pattern.
- Card import application services should receive `CardImportSource` objects rather than raw `File` objects, matching the equipment-pack source contract. The card import pipeline should produce a commit draft at stage-import-data; the application service should turn that draft into a final commit plan by adding pack identity, imported timestamp, and lifecycle defaults.
- Card import modes should match the long-term equipment import mode vocabulary: `"dryRun"` validates the pack itself without storage writes or storage-aware conflict context, while formal import uses the **Application Service** to build a **Commit Plan** and perform **Conflict Check** before final repository commit.
- Card import application result shapes should stay aligned with equipment import application results, including stage, mode, storage committed flag, optional snapshot, diagnostics, and summary counts. Card-specific summaries may add card and image counts.
- A legacy localStorage card-pack repository should write **Pack Data** before updating the **Storage Index**. If content exists without an index entry, recovery treats it as orphan content and removes it; if the index references missing or corrupted content, recovery removes the broken index entry.
- For legacy card DHCB import, card content and packaged images are one strong-consistency install unit. The **Storage Index** must be updated only after both card content and all required packaged image writes succeed; if image or index commit fails, the import must compensate by removing content and images written for that failed import.
- Card import rollback across localStorage and IndexedDB should use **Compensation Cleanup** based on the failed import's write set, then rely on integrity recovery to clean any artifacts left behind if compensation itself fails.
- Card import application result stages should stay aligned with equipment import stages. Card content writes, pack-scoped image writes, and index updates are all part of `storageTransaction`; image write failures should surface as storage transaction diagnostics rather than a separate public `assetCommit` stage.
- For compatibility, a card payload that sets `hasLocalImage: true` without providing a matching image asset should not be rejected. Actual committed local-image ownership is determined by imported image assets; orphan image assets without matching staged card IDs remain blocking errors.
- Imported card images should move from **Legacy Global Card Image** records to **Pack-Scoped Card Images** so rollback, removal, and integrity recovery can operate by Pack ID. Runtime image lookup may fall back to legacy global card-id images during migration.
- Legacy global image migration should derive ownership from valid indexed card batches. A legacy image referenced by a valid batch should be copied to that batch's pack-scoped namespace and then removed from the legacy global table; an unreferenced legacy image should be treated as orphan data.
- Legacy global image migration should run during application/card-system initialization as an idempotent recovery step. Migration failure should be reported but should not make the whole card system unavailable because runtime image lookup can still fall back to legacy global images.
- Legacy global image migration should use copy-then-clean and no migration marker. If legacy global images still exist, migration is considered incomplete and should run again; if legacy global images and pack-scoped images both exist, legacy global images remain the migration source of truth until the legacy table is cleared.
- A **Storage Snapshot** is derived by reading the **Storage Index** and **Pack Data** together.
- A **Storage Snapshot** is a repository output, not a long-lived UI store contract or a selectable template index.
- Public repository reads return **Storage Snapshots** after integrity recovery; raw storage state is adapter-internal.
- A **Storage Index** is lifecycle authority, not a content metadata cache.
- **Pack Data** is content authority, not lifecycle status.
- A successful **Storage Transaction** returns the post-transaction **Storage Snapshot** for storage result mapping and for future cache/runtime layers to consume.
- A **Storage Snapshot** alone does not define end-user runtime availability; runtime availability is defined by the later cache/runtime read model.
- A committed import is complete only after a **Stable Runtime Cache View** has been established from the recovered **Storage Snapshot**.
- This phase should establish the stable runtime view through a **Runtime Refresh Adapter** that reuses existing card-store reload and rebuild helpers. It should not introduce a new runtime registry or rewrite runtime selection hooks.
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
  -> Source Adaptation
  -> Structural Validation
  -> Canonical Normalize
  -> Semantic Validation
  -> Stage Import Data
  -> Build Commit Plan
  -> Storage Transaction
  -> Runtime Cache Build
  -> Result Mapping
```

Pipeline stages:

- **Source Read** reads raw input from a file, object, builtin source, or future container source.
- **JSON Parse** converts textual JSON into an unknown object and reports invalid JSON before schema validation.
- **Source Adaptation** applies accepted external-format adapters or equivalent source-view conversion before schema validation, without guessing, repairing business meaning, or running **Editor-Owned Authoring Checks**.
- **Structural Validation** validates the source-adapted object against the public schema.
- **Canonical Normalize** creates the internal canonical model and applies explicit defaults.
- **Semantic Validation** checks business rules that are not structural schema rules.
- **Stage Import Data** builds a staged import / commit draft from canonical data without mutating state or assigning final storage identity.
- **Build Commit Plan** creates a **Commit Plan** by assigning final storage identity and lifecycle metadata to staged import data, checking storage-aware importability such as conflicts and pack limits, and describing planned repository writes before repository commit.
- **Storage Transaction** commits persistent writes and in-memory state only if the transaction succeeds.
- **Runtime Cache Build** rebuilds runtime template lookup and query models after successful storage commit.
- **Result Mapping** returns the unified import result and diagnostics.

## Flagged Ambiguities

- "卡包" can mean a card pack specifically or a content pack generally. Use **Content Pack** for the general category, **Card Pack** for card-only packs, and **Equipment Pack** for equipment-only packs.
- "batch" is a legacy card-store implementation term for a stored card-pack import unit. Use **Content Pack**, **Equipment Pack**, and **Pack ID** in the equipment-pack design unless referring to existing card code.
- "版本" can mean content version or format identifier. Use **Content Version** for author-maintained releases and **Format Identifier** for schema/format selection.
- "Registry" can refer to template selection or automation calculation. Use **Registry** in this context only for content pack template lookup; say **automation registry** when discussing modifier calculation.
- "warning" can mean user-facing UI noise or useful author guidance. Use **Warning Diagnostic** for non-blocking pipeline output, and describe UI visibility separately as presentation policy.
- "profession" was an early card-pack field name for character class cards. Keep `profession` only when referring to the **Legacy Card Format** field; use **Class** and `classes` for the forward card-pack schema and internal import model terminology.
- "automation" can refer to an external payload wrapper, normalized template data, or character-sheet runtime calculation. In this context, use **Card Automation Definition** for the external wrapper and **Normalized Card Automation IR** for the compiled installed form; runtime contributions belong to the modifier context.
