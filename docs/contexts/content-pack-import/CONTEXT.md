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

**Public Schema**:
The JSON Schema that defines the external structure a content pack file must satisfy before it can enter normalization.
_Avoid_: TypeScript type when referring to the third-party file contract

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
The validation step that checks a structurally and semantically valid pack against current system state, such as built-in IDs and already imported pack IDs.
_Avoid_: duplicate check when current system state matters

**Import Diagnostic**:
A structured message produced by the import pipeline with severity, code, path, message, and optional value.
_Avoid_: raw error string

**Storage Transaction**:
The commit step that updates persistent storage and in-memory state only if all required writes succeed.
_Avoid_: best-effort save

**Registry**:
The runtime read model used to look up or query currently selectable templates.
_Avoid_: storage index; automation registry

**Storage Index**:
The persistent index used to locate and manage stored content pack data.
_Avoid_: query index; registry

**Query Index**:
The runtime-derived index used for fast template filtering and lookup.
_Avoid_: storage index

## Relationships

- A **Content Pack** may be a **Card Pack** or an **Equipment Pack**.
- A **Public Schema** defines the accepted external JSON shape.
- A **Canonical Model** is produced only after parsing, structural validation, and normalization.
- A **Template ID** is stable content identity, not a runtime sheet identity.
- A **Content Version** is maintained by the pack author; a **Format Identifier** is maintained by the application.
- **Structural Validation**, **Normalization**, **Semantic Validation**, **Conflict Check**, and **Storage Transaction** are separate import pipeline stages.
- A failed import must return **Import Diagnostics** and must not mutate storage or in-memory state.
- A **Storage Index** is persistent management data; a **Registry** and **Query Index** are runtime read models.
- An **Equipment Pack** template does not become an automation source until it is instantiated into character sheet equipment state.

## Import Pipeline

```text
Source Read
  -> JSON Parse
  -> Authoring Preprocess
  -> Structural Validation
  -> Canonical Normalize
  -> Semantic Validation
  -> Conflict Check
  -> Stage Commit Data
  -> Storage Transaction
  -> Registry Rebuild
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
- **Stage Commit Data** builds the next persistent and in-memory data in memory without mutating state.
- **Storage Transaction** commits persistent writes and in-memory state only if the transaction succeeds.
- **Registry Rebuild** rebuilds runtime template lookup and query models after successful storage commit.
- **Result Mapping** returns the unified import result and diagnostics.

## Flagged Ambiguities

- "卡包" can mean a card pack specifically or a content pack generally. Use **Content Pack** for the general category, **Card Pack** for card-only packs, and **Equipment Pack** for equipment-only packs.
- "版本" can mean content version or format identifier. Use **Content Version** for author-maintained releases and **Format Identifier** for schema/format selection.
- "Registry" can refer to template selection or automation calculation. Use **Registry** in this context only for content pack template lookup; say **automation registry** when discussing modifier calculation.
