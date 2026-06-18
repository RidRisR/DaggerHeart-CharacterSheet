# Card Pack Import Architecture Discovery

日期：2026-06-13
状态：Initial architecture discovery / 非实施计划

> **Superseded note (2026-06-16):** 本文是早期调研记录，用于保留问题发现和历史判断。后续方案以 `2026-06-16-card-import-commit-path-scope.md` 和 `2026-06-16-card-import-commit-path-test-strategy.md` 为准。本文中关于 `daggerheart.card-pack.v1` “不是近期实现目标”的判断已被后续决策替代：`daggerheart.card-pack.v1` 是 **Card Pack Internal Validation Schema**，可被外部 direct import 接受，但不是默认编辑器导出格式，也不作为本轮公开发布内容。

## Purpose

本文记录卡牌导入重构前的第一轮架构调研结论。目标不是重新定义已经公开的卡牌包格式，而是明确当前实现的摩擦点、装备导入可复用的架构模式，以及后续设计应优先探索的 deepening opportunities。

本轮重构主题：

- 保持已经公布的第三方材料可继续导入。
- 让卡牌导入功能层和储存层解耦。
- 为卡牌包公开契约补上结构化 JSON Schema。
- 降低长期积累的技术债。
- 区分公开 legacy 中文字段和内部实现变量。

## Existing Decisions To Preserve

`docs/contexts/content-pack-import/CONTEXT.md` 已经给出当前方向：

- 卡牌包近期公开契约是 legacy JSON、Legacy Card DHCB、当前编辑器导出的 grouped shape。
- `daggerheart.card-pack.v1` 是 Deferred Public Schema Exploration，不是当前默认导出格式或近期实现目标。
- 可以发布 Legacy Published Format Schema，用来标准化已发布格式，而不是创建新格式。
- Card Pack Import Model 只能作为导入 workflow 内部 staging shape，不能变成 public schema、editor authoring model、storage authority 或 future v1 的提前实现。
- Card Pack Import Model 应保持保守并贴近 legacy input，不应为了 i18n、future v1 或 storage migration 做额外重塑。

现有历史文档也支持这一点：

- `docs/superpowers/specs/2026-06-06-card-pack-schema-discovery.md`
- `docs/superpowers/specs/2026-06-06-card-pack-public-schema-v1-design.md`
- `docs/superpowers/specs/2026-06-06-content-bundle-card-pack-import-workflow-design.md`

## Public Contract Snapshot

当前已经公开并被示例使用的 Card Pack shape 是 native grouped legacy JSON：

```json
{
  "name": "string",
  "version": "string",
  "description": "string",
  "author": "string",
  "customFieldDefinitions": {
    "professions": [],
    "ancestries": [],
    "communities": [],
    "domains": [],
    "variants": []
  },
  "profession": [],
  "ancestry": [],
  "community": [],
  "subclass": [],
  "domain": [],
  "variant": []
}
```

Observed sources:

- `public/自定义卡包指南和示例/用户指南.md`
- `public/自定义卡包指南和示例/AI-卡包生成提示词.md`
- `public/自定义卡包指南和示例/神州战役卡牌包.json`
- `data/cards/builtin-base.json`
- `app/card-editor/utils/zip-export.ts`

Important compatibility notes:

- Top-level `format` is not present in published card pack samples.
- JSON routing currently recognizes card packs by non-empty card arrays.
- Content pack manager tests explicitly reject top-level `{ "cards": [...] }` as card pack JSON routing input.
- Editor JSON / ZIP import is looser than formal content manager import.
- Legacy Card DHCB is a zip with root `cards.json`, optional root `manifest.json`, and optional root `images/*` matched to card IDs by filename.

## Equipment Import Pattern To Reuse

Equipment import already has the target shape for this refactor:

- `equipment/import/import-pipeline.ts`
  - Source Read
  - JSON Parse
  - Authoring Preprocess
  - Structural Validation
  - Normalization
  - Semantic Validation
  - Conflict Check
  - Stage Import Data
- `equipment/packs/application-service.ts`
  - builds Conflict Check context from Storage Snapshot
  - owns commit orchestration
  - maps storage and runtime lifecycle diagnostics
- `equipment/packs/repository.ts`
  - Repository Port
- `equipment/packs/local-storage-repository.ts`
  - localStorage Persistence Adapter
- `equipment/runtime-cache/*`
  - Stable Runtime Cache View and runtime readers
- `equipment/services/default-equipment-services.ts`
  - Service Composition Root
- `equipment/services/__tests__/default-equipment-services.test.ts`
  - verifies UI/editor modules do not import storage implementations directly

This is the primary template for card import modernization.

## Current Card Import Shape

Primary files:

- `card/stores/store-actions.ts`
- `card/stores/store-types.ts`
- `card/stores/unified-card-store.ts`
- `card/type-validators.ts`
- `card/variant-format-preprocessor.ts`
- `card/utils/dhcb-importer.ts`
- `app/card-editor/utils/import-export.ts`
- `app/card-editor/utils/zip-import.ts`
- `app/card-editor/utils/zip-export.ts`
- `app/card-editor/services/validation-service.ts`
- `components/content-pack-manager/import-content-pack.ts`

Observed paths:

1. Formal JSON install:
   - `components/content-pack-manager/import-content-pack.ts`
   - `useUnifiedCardStore.getState().importCards(...)`
   - `card/stores/store-actions.ts`

2. Formal Legacy Card DHCB install:
   - `card/utils/dhcb-importer.ts`
   - parse zip
   - parse root `cards.json`
   - infer images by `images/<cardId>.<ext>`
   - call `store.importCards(...)`
   - write images to IndexedDB
   - rollback with `removeBatch(...)` on image failure or orphan images

3. Editor JSON import recovery:
   - `app/card-editor/utils/import-export.ts`
   - parse JSON
   - clear editor images
   - auto-complete ancestry pairs
   - auto-complete subclass triples
   - return editor draft state

4. Editor ZIP import recovery:
   - `app/card-editor/utils/zip-import.ts`
   - parse zip
   - parse root `cards.json`
   - write editor images to IndexedDB before formal card validation
   - auto-complete ancestry pairs
   - auto-complete subclass triples
   - return editor draft state

## Architectural Friction

### 1. Card store is a shallow Module

`card/stores/store-actions.ts` currently owns too much behind one large store interface:

- initialization
- built-in seeding
- legacy loading
- import validation
- conversion to runtime card view
- duplicate conflict checks
- batch ID generation
- localStorage writes
- runtime index rebuilds
- batch lifecycle operations
- storage usage and integrity checks

The interface does not hide enough complexity. Callers and tests still need to know storage shape, runtime read model details, and import behavior. Deleting this Module would not concentrate complexity; it would reappear across UI, importers, and tests.

### 2. No Repository Port for Card Packs

Card batch persistence is directly tied to `localStorage` keys:

- `daggerheart_custom_cards_index`
- `daggerheart_custom_cards_batch_*`

Image persistence is directly tied to IndexedDB via the image service. There is no storage-neutral Repository Port for card packs, so import workflow cannot stage or commit through a storage-independent seam.

### 3. Formal import and editor import recovery are mixed

Formal import should answer: can this pack be installed and made runtime-available?

Editor import recovery should answer: can this parseable payload be opened as a Content Pack Draft for authoring?

Today they share scattered helpers but have different behavior:

- editor import auto-completes ancestry pairs and subclass triples;
- formal JSON install does not obviously share the same recovery path;
- editor ZIP import writes images before formal validation;
- formal DHCB import rolls back card install if image write fails.

These are different use cases and should cross different interfaces.

### 4. Public contract is prose-first

Equipment pack has a Public Schema at `public/schemas/equipment-pack.v1.schema.json`.

Card pack does not have an equivalent Legacy Published Format Schema. The current public contract is spread across:

- user guide prose
- AI prompt prose
- samples
- TypeScript types
- validators
- converters

This makes third-party authoring and regression testing weaker than equipment import.

### 5. Import diagnostics are raw strings

Equipment import produces structured Import Diagnostics with severity, code, path, message, and value.

Card import usually returns string arrays such as `errors: string[]`, and content-pack manager maps them into generic `CARD_IMPORT_ERROR`. That loses diagnostic paths and makes editor/user messaging inconsistent.

### 6. Runtime Card View acts as storage authority

Stored custom card batch data persists converted runtime cards (`ExtendedStandardCard`-like data) rather than preserving a clearer Pack Data authority. This is historically understandable, and a full storage migration should not be bundled into the first refactor, but new code should avoid making runtime view more authoritative.

### 7. Chinese fields are both public payload and internal implementation

Legacy Published Format uses Chinese card fields such as `名称`, `领域`, `描述`, `类别`, `主职`, `子职业`, `等级`, `施法`. These must remain importable and exportable.

The problem is not the public legacy fields. The problem is that Chinese identifiers also appear in internal grouping maps, editor state manipulation, validators, and helper variable names. That couples implementation language to the external file format and makes future seams harder to reason about.

## Deepening Opportunities

### 1. Card Pack Import Workflow Module

Files:

- `card/stores/store-actions.ts`
- `card/type-validators.ts`
- `card/variant-format-preprocessor.ts`
- `card/utils/dhcb-importer.ts`
- `components/content-pack-manager/import-content-pack.ts`

Problem:

Current card import is shallow. The caller-facing interface is simple, but the implementation leaks decisions about format detection, validation, conversion, conflicts, storage writes, image handling, and runtime rebuilds.

Solution:

Create a Card Pack Import Workflow Module modeled after equipment import:

```text
Source Read
  -> Container / Format Detection
  -> JSON Parse
  -> Legacy Structural Validation
  -> Legacy Source Adapter
  -> Authoring Preprocess
  -> Normalize to Card Pack Import Model
  -> Semantic Validation
  -> Conflict Check
  -> Stage Import Data
```

Benefits:

- Higher locality for import rules.
- Higher leverage for JSON, Legacy Card DHCB, dry-run validation, and future content bundle preflight.
- Tests can target the workflow interface instead of UI stores.

### 2. Legacy Published Format Schema

Files:

- `public/自定义卡包指南和示例/用户指南.md`
- `public/自定义卡包指南和示例/AI-卡包生成提示词.md`
- `public/自定义卡包指南和示例/神州战役卡牌包.json`
- `data/cards/builtin-base.json`

Problem:

The public contract is not machine-checkable.

Solution:

Publish `card-pack.legacy.schema.json` for the existing grouped Chinese-field format. This should not add `format`, should not rename fields, and should not require a new v1 payload.

Benefits:

- Pack Authors get a stable authoring contract.
- The import workflow can produce structural diagnostics from JSON Pointer paths.
- The current public promise remains intact.

### 3. Card Pack Application Service

Files:

- `card/stores/store-actions.ts`
- `card/stores/store-types.ts`
- `card/stores/image-service/actions.ts`
- `card/stores/image-service/database.ts`

Problem:

The UI store owns import commit, remove, enable/disable, storage writes, image writes, and runtime index rebuild.

Solution:

Introduce an Application Service for Card Pack lifecycle orchestration. It should eventually own import commit, remove, disable/enable, and result mapping. The first implementation may still write legacy storage shape behind an Adapter.

Benefits:

- UI store becomes a presentation state Module.
- Commit and rollback behavior becomes testable without React/Zustand.
- Future backend or IndexedDB changes have a real seam.

### 4. Card Pack Repository Port

Files:

- `card/stores/store-actions.ts`
- `card/stores/store-types.ts`
- `card/stores/image-service/*`

Problem:

localStorage and IndexedDB behavior are hard-coded into the store and image service.

Solution:

Define a Repository Port around existing legacy storage:

- load Storage Snapshot
- commit import plan
- remove pack
- set disabled
- ensure integrity

The initial Persistence Adapter can keep current localStorage and IndexedDB keys unchanged.

Benefits:

- Existing storage compatibility is preserved.
- Storage Transaction can become explicit.
- The repository interface becomes the test surface.

### 5. Editor Import Recovery Module

Files:

- `app/card-editor/utils/import-export.ts`
- `app/card-editor/utils/zip-import.ts`
- `app/card-editor/services/validation-service.ts`

Problem:

Editor import currently performs authoring recovery and image writes in ad hoc helpers.

Solution:

Create a separate Card Editor Import Recovery Module. It may be lenient and draft-focused, but it should call the formal workflow in Dry Run when claiming a draft is formally importable.

Benefits:

- Keeps authoring convenience without weakening formal import.
- Avoids silent repair being confused with import success.
- Makes editor diagnostics line up with formal diagnostics.

### 6. Runtime Read Model Separation

Files:

- `card/card-types.ts`
- `card/*/convert.ts`
- `card/stores/store-actions.ts`

Problem:

`StandardCard` / `ExtendedStandardCard` is both runtime view and stored pack data.

Solution:

Do not migrate storage in the first pass. Instead, put conversion to `ExtendedStandardCard` behind the import commit adapter and document that runtime card view is not Pack Data authority.

Benefits:

- Reduces blast radius.
- Leaves room for future Pack Data storage without forcing it into this refactor.
- Prevents new code from depending on runtime view as public contract.

## Suggested First Slice

Start with the lowest-risk, highest-leverage slice:

1. Add Legacy Published Format Schema and schema tests using current public samples.
2. Add Card Pack Import Diagnostic types and JSON Pointer helpers.
3. Extract a pure Card Pack Import Workflow through `Stage Import Data`, without changing storage.
4. Rewire `importCards` to call the workflow but still commit through existing store logic.
5. Only after behavior parity is locked, introduce Application Service / Repository Port.

This order keeps all public compatibility commitments intact while creating a real seam before touching persistence.

## Open Questions For Design

1. Should formal import preserve editor auto-completion of missing ancestry/subclass groups, or should that remain editor-only recovery with Warning Diagnostics?
2. Should Legacy Published Format Schema allow empty card arrays as long as at least one card array is non-empty, matching current content manager routing?
3. Should top-level `customFieldDefinitions.variantTypes` remain schema-supported even though guide now promotes `variants`?
4. Should Legacy Card DHCB orphan images be an error, warning, or editor-only recoverable condition?
5. How much of current stored `BatchData` should be treated as compatibility storage rather than domain Pack Data?
6. Should built-in cards enter the same import workflow as custom packs, or remain a separate bootstrap source until later?

## Non-Goals For The First Refactor

- Do not introduce `daggerheart.card-pack.v1`.
- Do not make card-only export default to a new format.
- Do not migrate existing localStorage card batches in the first pass.
- Do not redesign card selection UI.
- Do not bundle mixed card/equipment DHCB support into card import modernization.
- Do not remove Chinese fields from the Legacy Published Format.
