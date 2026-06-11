# Card Pack Schema Discovery

日期：2026-06-06
状态：Historical research / 当前分支非实施设计
来源：第一轮并行子代理调研，覆盖 editor export、公开指南、validation/converter 代码、内置与样例数据。

> 本文是卡牌格式事实调研记录，不再作为当前分支的实施设计入口。
>
> 当前分支设计见：
>
> `docs/superpowers/specs/2026-06-06-content-bundle-editor-and-thin-dhcb-design.md`
>
> 本文仍可作为未来 Legacy Published Format JSON Schema、Card Pack Import Workflow Modernization 或 `daggerheart.card-pack.v1` 重新评估时的事实参考。

## 目的

本文件整理 `daggerheart.card-pack.v1` Public Schema 设计前的事实层材料。它不直接定稿 schema，而是回答：

- 当前系统实际生产什么格式。
- 当前指南曾经承诺什么格式。
- 当前 validate / converter 实际接受和读取什么字段。
- 当前内置与样例数据实际使用什么字段。
- 哪些内容应进入 Public Schema，哪些应留给 Legacy Input Adapter，哪些属于 semantic validation。

## 调研来源

### Editor Export

调研范围：

- `app/card-editor/types/index.ts`
- `app/card-editor/store/card-editor-store.ts`
- `app/card-editor/utils/card-factory.ts`
- `app/card-editor/utils/import-export.ts`
- `app/card-editor/utils/zip-export.ts`
- `app/card-editor/utils/zip-import.ts`
- `app/card-editor/utils/card-transformer.ts`
- `app/card-editor/services/validation-service.ts`
- `app/card-editor/components/card-tabs/metadata-tab.tsx`
- `components/card-editor/card-form.tsx`
- `components/card-editor/ancestry-dual-card-form.tsx`
- `components/card-editor/subclass-triple-card-form.tsx`
- `app/card-editor/components/image-upload.tsx`
- `app/card-editor/components/definitions-manager.tsx`

### Public Guides

调研范围：

- `public/自定义卡包指南和示例/用户指南.md`
- `public/自定义卡包指南和示例/AI-卡包生成提示词.md`
- `public/自定义卡包指南和示例/神州战役卡牌包.json`
- `app/card-pack-guide/page.tsx`

### Validation And Converter Code

调研范围：

- `card/type-validators.ts`
- `card/card-types.ts`
- `card/*/convert.ts`
- `card/variant-format-preprocessor.ts`
- `card/stores/store-actions.ts`
- `app/card-editor/services/validation-service.ts`
- `app/card-editor/utils/import-export.ts`
- `app/card-editor/utils/zip-import.ts`
- `card/utils/dhcb-importer.ts`
- `components/content-pack-manager/import-content-pack.ts`
- `components/content-pack-manager/__tests__/import-content-pack.test.ts`

### Internal Samples

调研范围：

- `data/cards/builtin-base.json`
- `public/自定义卡包指南和示例/神州战役卡牌包.json`
- `test-new-format.json`
- 相关 import / validator / factory tests

## 当前观察到的格式

### Native Grouped Card Pack

当前 editor、guide、built-in data 和样例都围绕同一种 legacy native shape：

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

重要事实：

- 当前样例没有顶层 `format`。
- 当前内容包管理页 JSON routing 要求至少一个 `profession` / `ancestry` / `community` / `subclass` / `domain` / `variant` 是非空数组。
- 当前内容包管理页 tests 明确拒绝顶层 `{ "cards": [...] }` 作为 card pack JSON routing 输入。
- 当前 editor JSON / ZIP import 对 shape 更宽松：它会 parse 并返回 package；ZIP import 遇到 top-level `cards` array 只记录日志而不是作为统一 routing error。
- 当前 editor 默认导出 `.dhcb`，其中 `cards.json` 仍然是 native grouped card pack shape。

### Legacy DHCB

当前 editor 导出的 `.dhcb` / `.zip` 是 zip 文件：

```text
manifest.json
cards.json
images/
  <card-id>.<ext>
```

`manifest.json`：

```json
{
  "format": "DaggerHeart Card Batch",
  "version": "1.0",
  "createdAt": "ISODateString",
  "hasImages": true
}
```

`cards.json` 与 native grouped card pack shape 基本一致。

图片规则：

- 打包图片路径是 `images/{cardId}.{ext}`。
- `.dhcb` import 会用图片文件名推导 card id。
- content-manager / store `.dhcb` importer 拒绝 orphan image，并回滚已导入 batch。
- editor `.dhcb` import 会先把 `images/*` 写入 editor IndexedDB，再继续处理 `cards.json`；它不像 content-manager importer 那样先拒绝 orphan image。
- editor `.dhcb` export 在存在本地图片时会写 `hasLocalImage`，并可能把 `imageUrl` 设为 `undefined` 后再 JSON stringify；实际 JSON 中该字段会被省略。

## 顶层字段矩阵

| Field | Editor Export | Guide | Validator / Import | Samples | Discovery Classification |
| --- | --- | --- | --- | --- | --- |
| `format` | 不输出 | 未文档化 | 当前 card JSON routing 不需要 | 不存在 | Public v1 required; legacy adapter supplies/infers |
| `name` | 输出 | 文档化 | 不严格校验 | 字符串 | Public v1 field |
| `version` | 输出 | 文档化 | 不严格校验 | `V20251114`, `1.3.0`, `1.0.0` | Public v1 free-form string |
| `description` | 输出 | 文档化 | 不严格校验 | 字符串，可较长 | Public v1 optional/free-form |
| `author` | 输出 | 文档化 | 不严格校验 | 逗号分隔、邮箱、普通文本 | Public v1 optional/free-form |
| `customFieldDefinitions` | 输出 | 文档化 | 实际使用 | 存在 | Legacy input; maps to Public v1 `definitions` |
| `profession` 等顶层数组 | 输出 | 文档化 | 实际识别依据 | 存在或部分存在 | Legacy input; Public v1 likely moves under `cards` |
| `cards` top-level array | 不输出 | 未文档化 | content-manager routing tests reject; editor import is looser | 不存在 | Rejected for content-manager routing unless an explicit adapter is designed |
| `cards` top-level object | 不输出 | 未文档化 | 当前 legacy routing 不支持 | 不存在 | Future Public v1 candidate as grouped object |
| `isModified`, `lastSaved` | editor state only; export strips | 未文档化 | 不应导入 | 不存在 | Editor-only |

## Card Type Field Matrix

### Profession

| Legacy Field | Editor Export | Guide | Validator | Converter Reads | Public v1 Candidate |
| --- | --- | --- | --- | --- | --- |
| `id` | yes | required | string required | yes | `id` |
| `名称` | yes | required | required + definition membership | yes | likely `name` |
| `简介` | yes | required | required | yes | likely `summary` / `hint` |
| `领域1` | yes | required | required + definition membership | yes | likely `domains[0]` or `domain1` |
| `领域2` | yes | required | required + definition membership | yes | likely `domains[1]` or `domain2` |
| `起始生命` | yes | required number | `> 0` | yes | likely `startingHitPoints` |
| `起始闪避` | yes | required number | `>= 0` | yes | likely `startingEvasion` |
| `起始物品` | yes | required | required | yes | likely `startingItems` |
| `希望特性` | yes | required | required | yes | likely `hopeFeature` |
| `职业特性` | yes | required | required | yes | likely `classFeature` |
| `imageUrl` | optional | optional | accepted | yes | Public v1 optional |
| `hasLocalImage` | DHCB marker | not guide core | accepted | yes | Bundle asset marker / adapter, not authoring field |

### Ancestry

| Legacy Field | Editor Export | Guide | Validator | Converter Reads | Public v1 Candidate |
| --- | --- | --- | --- | --- | --- |
| `id` | yes | required | string required | yes | `id` |
| `名称` | yes | required | required | yes | `name` |
| `种族` | yes | required | required + definition membership | yes | `ancestry` |
| `简介` | yes | required | required | yes | `summary` |
| `效果` | yes | required | required | yes | `effect` |
| `类别` | yes; generated 1/2 | required 1 or 2 | numeric required | yes | `category` or `slot` |
| `imageUrl` | optional | optional | accepted | yes | Public v1 optional |
| `hasLocalImage` | DHCB marker | not guide core | accepted | yes | Bundle asset marker / adapter |

Notes:

- Editor treats ancestry as pairs but stores individual cards.
- Editor import can auto-complete missing pairs.
- Store import does not enforce exact pair completeness today.

### Community

| Legacy Field | Editor Export | Guide | Validator | Converter Reads | Public v1 Candidate |
| --- | --- | --- | --- | --- | --- |
| `id` | yes | required | string required | yes | `id` |
| `名称` | yes | required | required + definition membership | yes | `name` |
| `特性` | yes | required | required | yes | `featureName` |
| `简介` | yes | required | required | yes | `summary` |
| `描述` | yes | required | required | yes | `description` |
| `imageUrl` | optional | optional | accepted | yes | Public v1 optional |
| `hasLocalImage` | DHCB marker | not guide core | accepted | yes | Bundle asset marker / adapter |

Legacy aliases observed in code paths include `社群`, `社群能力`, and `效果`; these should be adapter-only if supported.

### Subclass

| Legacy Field | Editor Export | Guide | Validator | Converter Reads | Public v1 Candidate |
| --- | --- | --- | --- | --- | --- |
| `id` | yes | required | string required | yes | `id` |
| `名称` | yes | required | required | yes | `name` |
| `描述` | yes | required | required | yes | `description` |
| `主职` | yes | required | required + definition membership | yes | `profession` |
| `子职业` | yes | required | required | yes | `subclass` |
| `等级` | yes; generated | required enum | `基石/专精/大师/未知` | yes | `level` |
| `施法` | yes | required enum | strict enum | yes | `spellcastTrait` |
| `imageUrl` | optional | optional | accepted | yes | Public v1 optional |
| `hasLocalImage` | DHCB marker | not guide core | accepted | yes | Bundle asset marker / adapter |

Notes:

- Editor treats subclass as triples but stores individual cards.
- Store validator accepts `未知`, but guide only documents `基石` / `专精` / `大师`.
- Public v1 should probably not expose `未知`; adapter can handle it if needed.
- Guide ambiguity: `主职` should match actual profession card name vs `customFieldDefinitions.professions`.

### Domain

| Legacy Field | Editor Export | Guide | Validator | Converter Reads | Public v1 Candidate |
| --- | --- | --- | --- | --- | --- |
| `id` | yes | required | string required | yes | `id` |
| `名称` | yes | required | required | yes | `name` |
| `领域` | yes | required | required + definition membership | yes | `domain` |
| `描述` | yes | required | required | yes | `description` |
| `等级` | yes | required number | 1-10 | yes | `level` |
| `属性` | yes | required string | string required | yes | `type` / `kind` |
| `回想` | yes | required number | `>= 0` | yes | `recallCost` |
| `imageUrl` | optional | optional | accepted | yes | Public v1 optional |
| `hasLocalImage` | DHCB marker | not guide core | accepted | yes | Bundle asset marker / adapter |

Legacy aliases observed in code paths include `简介` and `效果`; these should be adapter-only if supported.

### Variant

| Legacy Field | Editor Export | Guide | Validator | Converter Reads | Public v1 Candidate |
| --- | --- | --- | --- | --- | --- |
| `id` | yes | required | string required | yes | `id` |
| `名称` | yes | required | required | yes | `name` |
| `类型` | yes | required | required + definition membership | yes | `variantType` |
| `效果` | yes | required | required | yes | `effect` |
| `子类别` | optional | optional | optional string | yes | `subtype` |
| `等级` | optional | optional | optional non-negative integer; range if configured | yes | `level` |
| `简略信息` | optional object | optional object | optional object | reads `item1`-`item3` | `summaryItems` |
| `imageUrl` | optional | optional | accepted | yes | Public v1 optional |
| `hasLocalImage` | DHCB marker | not guide core | accepted | yes | Bundle asset marker / adapter |

Notes:

- Editor default `简略信息` has `item1` through `item4`, but visible form edits `item1` to `item3`.
- Guide references `类型`; AI prompt has one likely terminology error saying `类别`.
- Public v1 should not allow JSON `undefined`; optional fields should be omitted.

## Definitions And Variants

Observed definition shapes:

```json
{
  "customFieldDefinitions": {
    "professions": [],
    "ancestries": [],
    "communities": [],
    "domains": [],
    "variants": []
  }
}
```

Old/current built-in style:

```json
{
  "customFieldDefinitions": {
    "variantTypes": {
      "野兽形态": {
        "description": "德鲁伊的野兽变身",
        "subclasses": [],
        "levelRange": [1, 4]
      }
    }
  }
}
```

Current preprocessor behavior:

- If `customFieldDefinitions.variants` exists, derive `variantTypes`.
- If both `variants` and `variantTypes` exist, `variants` wins.
- This is destructive compatibility behavior: structured `variantTypes` metadata can be discarded when `variants` is present, including `description`, `subclasses`, `defaultLevel`, and `levelRange`.
- Store persists `variantTypes` separately and strips it from stored custom field definitions.

Schema discovery conclusion:

- Public v1 should use `definitions`, not `customFieldDefinitions`.
- Public v1 should decide whether variant metadata is simple names only or includes structured metadata.
- `customFieldDefinitions.variants` and `customFieldDefinitions.variantTypes` are legacy adapter concerns.
- TypeScript declarations mention singular definition keys, but samples and runtime use plural keys. Singular keys should not influence Public v1 unless external real packs later require them.

## Validation Boundaries

### Structural Schema Candidates

Good fit for JSON Schema:

- Top-level object shape.
- Required metadata fields.
- String/number/object/array types.
- String length limits.
- Enum values for closed lists.
- Card-type-specific required fields.
- `additionalProperties` policy.
- Optional image fields shape.

### Semantic Validation Candidates

Should remain outside structural JSON Schema:

- Global card id uniqueness within one import.
- Card id conflicts with existing installed cards.
- Definition membership checks, such as domain names, ancestry names, professions, variant types.
- Ancestry pair completeness and consistency.
- Subclass triple completeness and consistency.
- Variant `levelRange` checks and subtype checks.
- Legacy DHCB orphan image checks.
- Content bundle cross-entry checks.

### Current Validation Gaps

- Package metadata is barely validated.
- Unknown root keys and unknown card fields are accepted.
- Non-array card-type keys can be ignored rather than rejected.
- Store import checks duplicate IDs against existing cards, but not duplicate IDs inside the same import batch.
- Store import does not enforce ancestry pair or subclass triple completeness.
- `variantTypes.levelRange` shape is weakly checked.
- Current `variantTypes.levelRange` semantics are ambiguous: preprocessor-derived ranges use a max-plus-one convention, while validator checks can behave as inclusive upper-bound checks. Public v1 should not preserve this accidentally without a deliberate decision.
- Editor package validation and store import validation are not equivalent.

### Definition Membership Context

Current validators do more than type-check. They validate several fields against merged definitions from built-in content, installed custom packs, and the current import:

- profession `名称`, `领域1`, `领域2`;
- ancestry `种族`;
- community `名称`;
- subclass `主职`;
- domain `领域`;
- variant `类型`.

This means a legacy import can be valid because another already-installed pack supplies a definition. Public v1 must decide whether author packs are self-contained or may depend on installed definitions. The discovery recommendation is to make Public v1 self-contained by default and treat app-state-dependent acceptance as legacy compatibility behavior.

## Compatibility Classification

### Public v1 Candidates

- New top-level `format`.
- New top-level `definitions`.
- New top-level `cards`.
- Metadata: `name`, `version`, `author`, `description`.
- Card content fields after final naming decision.
- Optional external image reference, likely replacing raw `hasLocalImage` as an author-facing field.

### Legacy Adapter Inputs

- Missing top-level `format`.
- Top-level typed arrays (`profession`, `ancestry`, etc.).
- `customFieldDefinitions`.
- `customFieldDefinitions.variantTypes`.
- `customFieldDefinitions.variants`.
- Legacy DHCB `cards.json`.
- Editor-created `hasLocalImage`.
- Legacy aliases observed in form/copy paths.
- Auto-completion behavior for ancestry pairs and subclass triples, if preserved.
- Definition values supplied only by already-installed packs.

### Runtime / Derived Fields

- `StandardCard` fields:
  - `standarized`
  - `type`
  - `class`
  - `level`
  - `headerDisplay`
  - `cardSelectDisplay`
  - `professionSpecial`
  - `variantSpecial`
  - `batchId`
  - `batchName`
  - `source`
- Editor-only fields:
  - `isModified`
  - `lastSaved`
  - preview/cache/upload state.
- Legacy DHCB manifest fields:
  - `createdAt`
  - `hasImages`.

### Rejected Or Warning Inputs

Likely error:

- Top-level `{ "cards": [...] }` as content-manager routed card pack JSON, unless a future explicit adapter chooses to support it.
- JSON `undefined` as a documented value.
- Orphan images in DHCB.
- Duplicate card ids within the same import.

Likely warning:

- Legacy format without `format`.
- Legacy `customFieldDefinitions`.
- Legacy `variantTypes`.
- Auto-filled ancestry pair or subclass triple.
- Version-like strings are not warnings by themselves; `version` is free-form.

Auto-fill is not neutral normalization. It fabricates new card data with generated names/effects/ids and can change an author's package on import. Public v1 should either reject incomplete ancestry/subclass groups or model the groups structurally; adapter-based repair should be limited to legacy inputs and must emit diagnostics.

## Design Pressure: Field Naming

The current higher-level design says `daggerheart.card-pack.v1` should use English fields as the public contract, with old Chinese fields handled by Legacy Input Adapter.

Discovery evidence:

- Editor output, public guide, built-in data, public example, and current tests all use Chinese card field names.
- Current converters read Chinese fields.
- Current guide promises Chinese fields to users.
- New equipment pack schema already uses English fields.

Implication:

- If Public v1 uses English card fields, then every current real card pack is legacy input and requires adapter conversion.
- This is acceptable if the product goal is a clean future contract, but the adapter and compatibility corpus become mandatory, not optional.
- Public docs must be explicit that legacy Chinese-field card packs remain importable, but new authoring docs and editor export use the new schema.

This discovery file does not reopen the decision; it marks the migration cost and the evidence that must be preserved in adapter tests.

## Design Pressure: Structure Normalization

Current shape uses top-level card arrays. The higher-level design proposes normalized structure:

```json
{
  "format": "daggerheart.card-pack.v1",
  "definitions": {},
  "cards": {
    "profession": [],
    "ancestry": [],
    "community": [],
    "subclass": [],
    "domain": [],
    "variant": []
  }
}
```

Discovery evidence supports this as a future Public Schema if and only if:

- Legacy top-level arrays are adapter-supported.
- Content-manager routing tests keep rejecting accidental top-level `cards: []` arrays unless explicitly mapped.
- Public v1 `cards` is an object grouped by type, not a flat array.

## Image Handling Findings

Observed mechanisms:

- `imageUrl` is user-editable and present in built-in data.
- `hasLocalImage` is a marker used by local image handling and DHCB packaging.
- DHCB packaged images are keyed by card `id`.
- Guide text ambiguously describes inferred image paths using card name vs card identifier.

Schema implications:

- Public v1 should define author-facing image references separately from runtime/local markers.
- `hasLocalImage` should not be an authoring field in Public v1.
- Bundle assets should be resolved by container manifest/path rules, not by asking authors to set `hasLocalImage`.
- Existing `imageUrl` should remain legacy adapter input and may remain Public v1 if remote or static path images are supported.

## Unknown Field Compatibility Matrix

Before enforcing `additionalProperties: false`, the adapter design should classify at least these cases:

| Case | Example | Expected Direction |
| --- | --- | --- |
| known legacy Chinese field only | `名称` | adapter maps to Public v1 field |
| known Public v1 English field only | `name` | valid Public v1 |
| both Chinese and English, same meaning/value | `名称` + `name` | accept or warn; must define precedence |
| both Chinese and English, conflicting values | `名称` + `name` with different values | error or explicit conflict diagnostic |
| unknown Chinese alias | unrecognized localized field | warning/error based on compatibility policy |
| unknown English extension field | future/third-party field | warning/error based on extension policy |
| runtime-derived field | `cardSelectDisplay`, `variantSpecial` | reject or strip with diagnostic |

This matrix is especially important because Public v1 is planned to use English fields while all current pack data uses Chinese fields.

## Compatibility Corpus Plan

Before finalizing `daggerheart.card-pack.v1`, create a corpus with categories:

- Current editor JSON export.
- Current editor DHCB export.
- Built-in card pack.
- Public guide example.
- `test-new-format.json`.
- Legacy `variantTypes` pack.
- Simplified `variants` pack.
- Missing format legacy pack.
- Duplicate card id failure case.
- Missing ancestry pair compatibility case.
- Missing subclass triple compatibility case.
- DHCB orphan image failure case.
- Unknown top-level field case.
- Unknown per-card field case.
- Definition reference missing from pack definitions.
- Definition reference satisfied only by already-installed pack.
- Profession domain missing from definitions.
- Subclass `主职` missing from definitions.
- Variant `类型` missing from definitions.
- `variantTypes.levelRange` boundary case.
- Both `variants` and `variantTypes` present.
- Top-level `cards` array case.
- Top-level `cards` grouped object case.

When external real packs become available, add them as compatibility fixtures and classify expected result:

- valid Public v1;
- legacy adapted with warning;
- invalid with diagnostic.

## Schema Design Questions Remaining

1. Exact English field names for each card type.
2. Whether Public v1 `definitions.variants` is simple string list, structured metadata, or both.
3. Whether Public v1 requires all six `cards.*` arrays or allows omitted empty groups.
4. Whether Public v1 permits unknown fields with warning or rejects them structurally.
5. Whether Public v1 keeps `imageUrl` as an authoring field, replaces it, or supports both external image references and bundle assets.
6. Whether ancestry and subclass should remain stored as individual cards, or Public v1 should group pairs/triples structurally.
7. Whether Public v1 allows `subclass.level = unknown` equivalent. Discovery suggests no; adapter may handle legacy `未知`.
8. Whether auto-completion of ancestry/subclass is retained as adapter warning behavior or moved to editor-only repair tools.
9. Whether author packs must be self-contained in `definitions`, or may reference definitions from built-in / installed packs.
10. Whether legacy `variantTypes.levelRange` is inclusive, exclusive, or adapter-only legacy metadata.

## Recommended Next Step

Use this discovery file to write a dedicated `daggerheart.card-pack.v1` schema design. That design should first resolve:

1. Field naming for card type payloads.
2. Variant definitions structure.
3. Image model.
4. Ancestry/subclass grouping model.
5. Unknown field policy.

Only after those decisions should a JSON Schema file be implemented.
