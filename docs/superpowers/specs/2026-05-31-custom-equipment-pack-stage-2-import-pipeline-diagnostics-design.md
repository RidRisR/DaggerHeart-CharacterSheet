# 自定义装备卡包系统阶段 2：导入 Pipeline 与诊断模型细化

日期：2026-05-31
状态：已完成，待执行
上游设计：`2026-05-30-custom-equipment-pack-system-phased-design.md`
前置设计：`2026-05-31-custom-equipment-pack-stage-1-contract-design.md`

## 阶段目标

阶段 2 负责把装备包导入 pipeline、阶段边界、诊断模型、诊断映射和可测试入口设计清楚，直到可以直接进入导入 pipeline 的实现计划。

阶段 2 不负责存储结构、localStorage transaction、启动自检、runtime cache/query index、装备选择 UI 或卡牌包导入重构。阶段 2 可以定义提交阶段需要的接口边界，但真实持久化与 runtime cache build 细节属于阶段 3。

## 已固定前提

### Pipeline 总顺序

阶段 1 已固定完整导入路径：

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

### Public Schema 与 Canonical Model

- 核心 Public Schema 单真源是 `public/schemas/equipment-pack.v1.schema.json`。
- Runtime structural validation 使用 AJV。
- 外部输入字段名必须是英文。
- 核心 schema 只接受英文 canonical enum。
- 受控中文 enum alias 属于 Authoring Preprocess，不进入 canonical model。
- Canonical model 只保存英文 canonical enum 和 trim 后字符串。

### Diagnostics

阶段 2 将阶段 1 的单一 diagnostic code union 调整为按 severity 区分的 discriminated union。

```ts
type EquipmentPackImportErrorCode =
  | "SOURCE_READ_FAILED"
  | "INVALID_JSON"
  | "INVALID_FORMAT"
  | "MISSING_FIELD"
  | "UNKNOWN_FIELD"
  | "INVALID_TYPE"
  | "INVALID_ENUM"
  | "INVALID_SEMVER"
  | "DUPLICATE_ID"
  | "ID_CONFLICT"
  | "INVALID_CONTRIBUTION_TARGET"
  | "EMPTY_EQUIPMENT"
  | "INVALID_THRESHOLD_ORDER"
  | "FILE_TOO_LARGE"
  | "PACK_LIMIT_EXCEEDED"
  | "TEMPLATE_LIMIT_EXCEEDED"
  | "FIELD_TOO_LONG"
  | "STORAGE_QUOTA_EXCEEDED"
  | "STORAGE_SERIALIZE_FAILED"
  | "STORAGE_WRITE_FAILED"
  | "RUNTIME_CACHE_BUILD_FAILED"

type EquipmentPackImportWarningCode =
  | "MISSING_AUTHOR"
  | "MISSING_DESCRIPTION"
  | "MISSING_TEMPLATE_DESCRIPTION"
  | "DESCRIPTION_LONG"
```

```ts
type EquipmentPackImportDiagnostic =
  | {
      severity: "error"
      code: EquipmentPackImportErrorCode
      path: string
      message: string
      value?: unknown
      relatedPaths?: string[]
    }
  | {
      severity: "warning"
      code: EquipmentPackImportWarningCode
      path: string
      message: string
      value?: unknown
      relatedPaths?: string[]
    }
```

Rules:

- Core import layer returns structured diagnostics, not raw string arrays.
- AJV raw errors are internal inputs and must be mapped.
- 任何停在 `storageTransaction` 之前的失败都不得修改 storage 或 in-memory runtime cache。
- `storageTransaction` 或 `runtimeCacheBuild` 阶段失败后的 rollback/recovery 语义属于阶段 3。
- `success = true` 可以包含 `severity: "warning"` diagnostics。
- warning 不阻止导入，也不影响 storage transaction 或 runtime cache build。
- 终端使用者路径可以默认隐藏、折叠或延后展示 warning；作者检查、dry run 或高级详情可以展示 warning。
- warning 不代表另一条作者专用导入 pipeline；同一条 import pipeline 根据调用模式和 UI 呈现策略决定是否提交、是否展示。
- 字符串被 trim 不产生 warning；trim 是正常输入规范化。

### Warning 与呈现策略边界

Warning 是有价值的，但它不应强迫每个 Pack User 在普通导入成功后处理作者质量信息。

同一条 import pipeline 可以服务两类场景：

- Pack User 普通导入：展示成功摘要；warning 可以隐藏、折叠到详情、或只在高级模式展示。
- Pack Author / 检查场景：使用同一 pipeline 的 dry run 模式，展示 error 和 warning，但不提交 storage 或 runtime cache。

原则：

- warning 是非阻塞诊断，不参与 `success` 判断。
- warning 可以帮助作者改善包质量，但不需要一条独立作者导入路径。
- dry run 是同一 pipeline 的检查策略：运行到 `Stage Import Data` 后返回 staged import result，不执行 `Build Commit Plan`、repository commit、`Storage Transaction` 或 `Runtime Cache Build`。
- warning code 应和 error code 一样结构化，避免只能靠文案判断。
- `author` 缺失、`description` 缺失、模板缺少 `featureName`/`description`、description 较长可以作为 warning 候选。
- 字符串 trim 成功不是 warning；trim 后为空才按字段规则产生 hard error。

## Existing Codebase Notes

现有卡牌包导入有可参考经验，但不作为装备包导入的架构模板：

- `app/card-editor/utils/import-export.ts` 在 UI helper 内直接读文件、`JSON.parse`、toast、自动补全卡牌关系并返回编辑器状态。
- `card/stores/store-actions.ts` 的 `importCards` 在同一 action 内做校验、冲突检查、state mutation、localStorage sync 和 index rebuild，返回字符串 errors。
- `card/stores/store-actions.ts` 的 `_syncToLocalStorage` 先写 index 再写 batch data，且错误只 console，不形成 transaction result。
- 卡牌包 store 把一次导入的数据单元称为 `Batch`，例如 `BatchInfo`、`batchId`、`CustomCardIndex.batches`、`daggerheart_custom_cards_batch_`。
- 卡牌包当前 `generateBatchId()` 使用 `batch_${Date.now()}_${random5}`，这是 storage/management identity，不是卡牌内容 id。
- 装备包导入应保留 `index + pack data` 的大方向，但 pipeline、diagnostics 和 storage transaction 必须更清晰地分层。
- 装备包领域术语继续使用 `Equipment Pack` / `packId`；不沿用 card store 的 `batch` 命名，避免把“导入批次”和“内容包”混成同一个概念。

## 待确认问题

### 已确认：Import Diagnostic 保留 warning

Import pipeline 可以产生 warning。Warning 是非阻塞诊断，由调用方和 UI 呈现策略决定是否展示给终端使用者。

已确认：

- `severity: "error" | "warning"` 保留。
- `success = true` 可以携带 warning。
- error 阻止提交；warning 不阻止提交。
- 普通使用者导入 UI 可以默认不展示 warning，或折叠到详情。
- 作者检查不需要单独 pipeline；使用同一 import pipeline 的 dry run 模式即可。
- trim 成功不产生 warning。

### 已确认：阶段 2 只设计到提交接口边界

总设计中的阶段 2 文本曾把 `Commit to storage` 和 `Rebuild runtime cache/query index` 放进 pipeline；阶段 3 又专门负责存储层、事务和完整性恢复。为了避免两个阶段互相踩边界，需要在阶段 2 先收紧责任。

- 阶段 2 设计完整 pipeline 的逻辑顺序和 gate rule。
- 阶段 2 详细设计到 `Stage Import Data` 的输入输出，并保留 `Storage Transaction` / `Runtime Cache Build` 的 fake dependency result mapping；`Build Commit Plan` 与真实 commit orchestration 属于阶段 3。
- 阶段 2 不设计 localStorage key、写入顺序、rollback 细节、启动自检或 query index 数据结构；这些进入阶段 3。
- 阶段 2 的测试使用 fake storage transaction 和 fake runtime cache builder 证明 pipeline gate 正确，不写真实 localStorage。

### 已确认：Source Read 和 JSON Parse 的输入输出模型

阶段 1 已确认 Source Read 和 JSON Parse 分离；阶段 2 需要把 `EquipmentPackImportSource` 改成不会让 adapter 偷偷 parse JSON 的形状。

- `EquipmentPackImportSource` 只描述来源和读取原始 payload。
- file/container source 的 `read()` 返回文本字符串，由 JSON Parse 阶段统一 `JSON.parse`。
- object source、test fixture source 和 builtin source 的 `read()` 返回 unknown object，并标记为已解析输入，JSON Parse 阶段跳过文本 parse。
- Source Read 负责读取失败、文件大小策略和 source metadata；JSON Parse 只负责文本 JSON 语法错误。
- `origin.kind` 是来源 metadata，不是核心 pipeline 分支条件。
- Pipeline 根据 `payload.kind` 决定是否执行 JSON Parse；根据 import mode 决定是否提交；根据 `origin.kind` 只做 diagnostic context、result metadata、日志和少量来源策略。
- `origin`、`fileName`、`sizeBytes` 等来源信息只进入 diagnostic context 和 result metadata，不进入 canonical pack data。

示意接口：

```ts
type EquipmentPackImportOriginKind = "file" | "object" | "builtin" | "container"

type EquipmentPackRawPayload =
  | {
      kind: "jsonText"
      text: string
      sizeBytes?: number
    }
  | {
      kind: "parsedObject"
      value: unknown
      sizeBytes?: number
    }

interface EquipmentPackImportSource {
  origin: {
    kind: EquipmentPackImportOriginKind
    label?: string
    fileName?: string
  }
  read(): Promise<EquipmentPackRawPayload>
}
```

这样做的理由：

- file adapter 不再拥有 parse 责任，`INVALID_JSON` 统一由 JSON Parse 阶段产生。
- object source 和 test fixture source 仍能绕过文本 parse，方便测试 preprocess/schema/normalize/semantic/conflict。
- future container adapter 可以先解包出 `equipment.json` 文本，再交给 JSON Parse，不需要特殊 pipeline。
- 内置装备源数据后续直接迁移为 canonical 标准格式，不设计长期 builtin adapter，也不伪装成文件导入。
- Stage 1+2 的实现目标是 custom equipment pack import dry run；内置源数据迁移属于后续阶段，不作为第一版 dry run/commit 测试范围。

### 已确认：Import Mode 使用 `commit | dryRun`

既然 warning 可用于作者检查，且作者检查不需要另一条导入 pipeline，那么阶段 2 需要定义同一 pipeline 的运行模式。

- 引入 `EquipmentPackImportMode = "commit" | "dryRun"`。
- `commit` 是普通导入：所有 error gate 通过后执行 `Storage Transaction` 和 `Runtime Cache Build`。
- `dryRun` 是检查模式：运行 Source Read 到 Stage Import Data，返回同样的 result shape 和 diagnostics，但不执行 repository commit、`Storage Transaction` 或 `Runtime Cache Build`。
- `dryRun` 仍执行 Conflict Check，因为作者/使用者需要知道“这个包现在能不能导入当前系统”。
- `dryRun` 成功时，result 停在 `stage: "stageImportData"` 且 `success: true`，表示“输入已通过导入校验并生成 staged import data”；不表示已经写入 storage，也不表示最终 `packId` 已保留。
- Import result 通过 `stage` 明确 workflow 最终停在哪个阶段，避免 dry run 成功被 UI 或调用方误读成已导入。

示意：

```ts
type EquipmentPackImportMode = "commit" | "dryRun"

interface EquipmentPackImportOptions {
  mode?: EquipmentPackImportMode
}
```

`mode` 默认值是 `"commit"`。

### 已确认：Import Result 使用 `stage + success`

阶段 2 需要调整总设计中的 `EquipmentPackImportResult`。原结构只有 `success` 和 `imported`，不足以表达 workflow 最终停在哪个阶段。

- `stage` 表示本次 workflow 最终停在哪个业务阶段。
- `success` 表示 `stage` 所指阶段是否成功完成。
- `mode` 回显本次运行模式。
- `summary` 固定返回 normalize 后的 pack 摘要和模板数量；失败时至少返回 0 计数，成功 dry run 也能返回计数。
- `summary.packId` 只在 final commit plan 已由 Application Service 生成后才出现；Stage Import Data / dry run 成功不要求返回 `packId`。
- `diagnostics` 同时包含 error 和 warning。

示意：

```ts
type EquipmentPackImportPipelineStage =
  | "sourceRead"
  | "jsonParse"
  | "authoringPreprocess"
  | "structuralValidation"
  | "canonicalNormalize"
  | "semanticValidation"
  | "conflictCheck"
  | "stageImportData"
  | "buildCommitPlan"
  | "storageTransaction"
  | "runtimeCacheBuild"

interface EquipmentPackImportResult {
  success: boolean
  stage: EquipmentPackImportPipelineStage
  mode: EquipmentPackImportMode
  summary: {
    packId?: string
    name?: string
    version?: string
    author?: string
    weaponCount: number
    armorCount: number
    warningCount: number
    errorCount: number
  }
  diagnostics: EquipmentPackImportDiagnostic[]
}
```

结果语义：

- JSON parse 失败：`stage: "jsonParse"`、`success: false`。
- structural validation 失败：`stage: "structuralValidation"`、`success: false`。
- dry run 成功：`stage: "stageImportData"`、`success: true`。
- commit plan 构造失败：`stage: "buildCommitPlan"`、`success: false`。
- commit 完整成功：`stage: "runtimeCacheBuild"`、`success: true`。
- storage transaction 失败：`stage: "storageTransaction"`、`success: false`。
- runtime cache build 失败：`stage: "runtimeCacheBuild"`、`success: false`。
- warning 不改变 `stage` 或 `success`。
- `Result Mapping` 不进入 `stage` union，因为它只是返回值包装，不是装备包导入业务状态。

### 已确认：Diagnostic path 使用 JSON Pointer

阶段 1 测试清单已经使用 `/equipment/weapons/0/id` 这种路径示例。阶段 2 需要把 path 格式正式固定，否则 AJV error、semantic validation、conflict check 和 storage failure 可能输出不同风格。

- `path` 使用 JSON Pointer 风格。
- 顶层路径使用 `""` 表示整个 document。
- 普通字段路径示例：`/format`、`/equipment/weapons/0/id`、`/equipment/armor/0/baseThresholds/major`。
- Source Read 和 JSON Parse 这类没有稳定 JSON 字段位置的错误使用 `""`。
- pack-level semantic error 使用最接近的对象路径，例如 `EMPTY_EQUIPMENT` 使用 `/equipment`。
- cross-item semantic error 使用发现问题的第二个位置作为主 path，并在 `relatedPaths` 中记录第一个位置。
- Stage/Storage/Registry 级错误使用 `""`，并通过 code 与 message 说明阶段。

扩展 diagnostic shape 中的位置字段：

```ts
type EquipmentPackImportDiagnosticBase = {
  path: string
  message: string
  value?: unknown
  relatedPaths?: string[]
}
```

理由：

- 重复 id、跨数组冲突这类问题只有一个 `path` 不够表达。
- `relatedPaths` 仍保持结构化，不把位置信息塞进 message。
- UI 可以高亮主错误位置，同时展示“与另一处冲突”。

### 已确认：Diagnostic code 按 severity 拆分

阶段 1 固定的 code union 主要覆盖 error。现在已确认 warning 保留，阶段 2 需要明确 warning code 是复用现有 code，还是新增 warning 专用 code。

- diagnostic 使用 discriminated union：`severity: "error"` 只能搭配 `EquipmentPackImportErrorCode`，`severity: "warning"` 只能搭配 `EquipmentPackImportWarningCode`。
- `diagnostics` 仍然是同一个数组，不拆成 `errors` / `warnings` 两个返回字段。
- 第一版 warning code：
  - `MISSING_AUTHOR`
  - `MISSING_DESCRIPTION`
  - `MISSING_TEMPLATE_DESCRIPTION`
  - `DESCRIPTION_LONG`
- `MISSING_FIELD` 仍表示 schema/required hard error，不用于 optional author/description warning。
- `FIELD_TOO_LONG` 仍表示超过 schema maxLength 的 hard error；`DESCRIPTION_LONG` 表示虽合法但 UI 可能折叠或阅读体验较差的非阻塞提示。
- 不使用 `stage + code` 作为第一版核心模型；stage 可在未来作为内部调试 metadata，但不进入用户诊断契约。
- 顶层 `name` 和 `author` 的 schema hard limit 均为 100 字符；超过 100 是 `FIELD_TOO_LONG` error，不是 warning。
- 第一版不增加 `contact` 字段；联系方式如果需要，应放在 `description` 或后续另行设计。

理由：

- TypeScript 可以按 `severity` 自动收窄 `code`。
- 避免出现 `severity: "warning"` + `code: "INVALID_JSON"` 这类语义非法组合。
- error/warning 的增长节奏分开，后续维护更清楚。

### 已确认：第一版 Warning 触发条件

Warning 在已经有足够可信数据的阶段产生。某个 warning 一旦产生，即使后续阶段出现 error，也保留在最终 result 中。Warning 不阻止 commit，也不影响 dry run 的 `success`。

第一版 warning：

- `MISSING_AUTHOR`
  - 条件：顶层 `author` 缺失。
  - path：`/author`。
  - normalize：`metadata.author = "Unknown"`。
- `MISSING_DESCRIPTION`
  - 条件：顶层 `description` 缺失，或存在但 trim 后为空。
  - path：`/description`。
  - normalize：`metadata.description = ""`。
- `MISSING_TEMPLATE_DESCRIPTION`
  - 条件：单个 weapon/armor 同时缺少 `featureName` 和 `description`，或二者存在但 trim 后均为空。
  - path：对应模板对象路径，例如 `/equipment/weapons/0`。
- `DESCRIPTION_LONG`
  - 条件：顶层或模板 `description` trim 后长度大于 1000，且不超过 schema hard limit 4000。
  - path：对应 description 字段路径，例如 `/description` 或 `/equipment/armor/0/description`。

非 warning：

- 字符串首尾 trim 成功不是 warning。
- `author: ""` 或 `author: "   "` 在 trim 后违反 schema `minLength: 1`，是 `INVALID_TYPE` hard error，不是 `MISSING_AUTHOR` warning。
- 顶层 `name` 或 `author` 超过 100 是 `FIELD_TOO_LONG` error。
- `description` 超过 4000 是 `FIELD_TOO_LONG` error。

### 已确认：Pipeline Stage Gate Rule

现在需要明确每个阶段失败后是否继续后续阶段，以及是否聚合多个错误。

- Source Read 失败：停止，返回 source-level error。
- JSON Parse 失败：停止，不进入 Authoring Preprocess。
- Authoring Preprocess 遇到可识别枚举字段内的未知中文 alias：继续扫描可扫描字段，收集 alias 错误；之后停止，不进入 Structural Validation。
- Structural Validation 失败：尽量收集 AJV 的所有 schema errors；停止，不进入 Canonical Normalize。
- Canonical Normalize 不应产生 error；如果出现无法 normalize 的情况，说明前置 validation 缺规则，应补 validation。
- Semantic Validation 失败：收集所有可发现 semantic errors；停止，不进入 Conflict Check。
- Conflict Check 失败：收集所有可发现 conflict errors；停止，不进入 Stage Import Data。
- Stage Import Data 失败：停止，不进入 Storage Transaction。
- Storage Transaction 失败：停在 `stage: "storageTransaction"`，`success: false`。
- Runtime Cache Build 失败：停在 `stage: "runtimeCacheBuild"`，`success: false`。

原则：

- 同一阶段内尽量聚合错误，跨阶段不继续。
- warning 可以跨 normalize/semantic 阶段累积；如果后续阶段失败，已经产生的 warning 仍保留。
- 如果已经出现 error，result 可以保留此前已经收集到的 warning，但 UI 默认优先展示 error。

### 已确认：Runtime Cache Build 失败停在 `runtimeCacheBuild`

阶段 2 只定义调用接口边界。Runtime Cache Build 发生在 storage transaction 之后，如果 rebuild 失败，可能出现“storage 已提交，但 runtime cache 未刷新”的状态。

- 阶段 2 暂不最终定义 runtime cache build failure 的事务语义，留给阶段 3。
- 阶段 2 的接口先要求 storage transaction 返回 `storageCommitted: boolean`，runtime cache build 返回独立结果。
- 如果 storage 成功但 runtime cache build 失败，result 应是 `stage: "runtimeCacheBuild"`、`success: false`、code `RUNTIME_CACHE_BUILD_FAILED`，并由阶段 3 决定是否 rollback storage、重新 rebuild、或进入 recoverable integrity state。
- 阶段 2 测试只用 fake runtime cache failure 验证 result mapping，不测试真实恢复策略。

理由：

- 从 Pack User 视角，`stage: "runtimeCacheBuild"` 且 `success: true` 才表示普通 commit 导入完成并可用。
- 真实 storage 是否已经写入是阶段 3 事务恢复问题，不应在阶段 2 伪装成已处理。

### 已确认：Import Result Summary 只来自可信阶段

`summary` 用于 UI 摘要、测试断言和日志定位，但不能从未验证 raw JSON 中猜测字段。

规则：

- Source Read、JSON Parse、Authoring Preprocess、Structural Validation 失败时，summary 只返回安全计数：
  - `weaponCount: 0`
  - `armorCount: 0`
  - `warningCount`
  - `errorCount`
- Canonical Normalize 成功之后，summary 可以返回 canonical metadata：
  - `name`
  - `version`
  - `author`
  - `weaponCount`
  - `armorCount`
- Semantic Validation、Conflict Check、Stage Import Data、Build Commit Plan、Storage Transaction、Runtime Cache Build 阶段失败时，summary 应返回 canonical pack 摘要，便于 UI 说明是哪一个包失败。
- `summary.packId` 在 `stage: "runtimeCacheBuild"` 且 `success: true` 时必有。
- Dry run 成功不返回最终 `packId`；如果调试工具展示 provisional id，必须明确它不是 repository identity，不能作为后续 commit 承诺。
- `warningCount` 和 `errorCount` 始终从 `diagnostics` 计算，不单独手写。

理由：

- 不能把未通过 schema 的 raw `name` 当成可信显示内容。
- normalize 后的数据已经经过字段、类型、长度、enum 和默认值处理，可以作为摘要来源。
- 失败摘要应帮助用户定位问题，但不能绕过前置校验边界。

### 已确认：Source Read 阶段新增 `SOURCE_READ_FAILED`

阶段 1 的 error union 已包含 `FILE_TOO_LARGE`，但还没有定义普通读取失败如何表示。阶段 2 需要决定是否新增 source read error code。

- 新增 `SOURCE_READ_FAILED` 到 `EquipmentPackImportErrorCode`。
- `FILE_TOO_LARGE` 专门表示读取前或读取后发现大小超过限制。
- 文件权限、浏览器 File API 读取失败、container 解包读取失败、source adapter 抛错，统一映射为 `SOURCE_READ_FAILED`。
- `SOURCE_READ_FAILED` 的 `path` 使用 `""`。
- `value` 可以包含安全的 source metadata，例如 `{ originKind, fileName }`，但不包含文件内容。

理由：

- 不应把读取失败伪装成 `INVALID_JSON`，因为 JSON Parse 根本没有发生。
- `STORAGE_*` 是提交阶段错误，不适合表示 source read。
- 统一 source read code 可以让 UI 给出“无法读取文件/来源”的明确提示。

### 已确认：Source Read 的大小限制是 500 KiB

阶段 1 已有数组数量和字段长度限制；阶段 2 还需要定义整体输入大小限制，用于 `FILE_TOO_LARGE`。

推荐答案：

- 第一版单个装备包 JSON 文本上限：`500 KiB`。
- 对 file/container `jsonText`，Source Read 在可获得 size 时先检查；读取后也可用文本字节长度二次检查。
- 对 object source、test fixture source 和 builtin `parsedObject`，如果 source 提供 `sizeBytes` 则检查；未提供则不做 source-level size check，依赖 schema 数量/长度限制。
- builtin source 不按用户文件大小限制处理；builtin 数据异常应作为系统数据/adapter validation 问题暴露，不映射为 `FILE_TOO_LARGE`。
- 超过限制返回：
  - `stage: "sourceRead"`
  - `success: false`
  - error code `FILE_TOO_LARGE`
  - path `""`
- `FILE_TOO_LARGE` 不用于数组超限；第一版只有 `modifierContributions` 的数组超限映射为 `TEMPLATE_LIMIT_EXCEEDED`。

理由：

- 500 KiB 对第一版纯 JSON 装备包已经足够，能覆盖大量模板和描述文本。
- 第一版不包含图片或资源文件，不需要更大的导入体积。
- 过大的 JSON 输入会拖慢 parse/AJV 和 UI diagnostics，应该在 Source Read 阶段快速失败。

大小检查按来源：

- file source：必须检查 File API `size` 或读取后的 UTF-8 字节数。
- container source：必须检查 container 内 `equipment.json` 文本字节数；container 总大小留给未来容器设计。
- object source 和 test fixture source：如果提供 `sizeBytes` 则检查；不提供则跳过整体大小检查。
- builtin source：不做 `FILE_TOO_LARGE`。

### 已确认：Pack 数量限制属于 Conflict Check

总设计已有 `MAX_EQUIPMENT_PACKS = 50`。这个限制依赖当前 storage/index state，不是单个文件结构，所以需要明确归属。

- `PACK_LIMIT_EXCEEDED` 属于 Conflict Check 阶段。
- 第一版 `commit` 和 `dryRun` 都执行 pack 数量 Conflict Check，因为 dry run 表示“按当前系统状态是否可导入”。
- 当 `customPackCount >= maxCustomPackCount` 时产生 `PACK_LIMIT_EXCEEDED`。
- disabled pack 也计入 pack 数量，因为它仍占用 storage 和 id conflict 空间。
- 如果未来 dry run 支持“忽略当前系统状态”的纯文件检查，需要另加 option；第一版不做。

结果：

- 超过 pack 数量：`stage: "conflictCheck"`、`success: false`、code `PACK_LIMIT_EXCEEDED`、path `""`。

### 已确认：第一版不做模板数量上限

- 第一版不做单包模板数量上限。
- 不启用 `MAX_TEMPLATES_PER_PACK = 500`。
- Public Schema 不设置 `equipment.weapons.maxItems` 或 `equipment.armor.maxItems`。
- 仍保留单个装备模板最多 20 个 modifier contributions。
- 第一版只用 500 KiB 总输入大小、字段长度、contribution 数量限制控制规模。

理由：

- 模板数量限制的独立意义不大，500 KiB 总大小已经能控制导入规模。
- 数量限制容易与文件大小限制叠加出不直观的失败原因。
- 少一个限制，作者模型更简单，测试和诊断也更简单。

### 已确认：`TEMPLATE_LIMIT_EXCEEDED` 暂时保留

如果第一版不限制 weapon/armor 数量，那么 `TEMPLATE_LIMIT_EXCEEDED` 的用途会缩小。

- 保留 `TEMPLATE_LIMIT_EXCEEDED`，但第一版只用于 `modifierContributions` 超过 20。
- 不用于 weapon/armor 数量。
- 如果未来恢复模板数量限制，可以复用该 code。
- `modifierContributions` 上限是单个装备模板内最多 20 个，不是整个文件最多 20 个。

替代方案：

- 新增 `CONTRIBUTION_LIMIT_EXCEEDED`，让 code 更精确。

我的推荐仍是保留 `TEMPLATE_LIMIT_EXCEEDED`，因为 contribution template 也是 template 的子结构，且少增一个 code。

### 已确认：保留 `success` 字段名

现在 `success` 的语义已经被重新定义为“`stage` 指向的最终阶段是否成功完成”。这个语义清楚，但 `success` 一词容易被误解为“整个导入是否最终可用”或“是否没有 warning”。

- 保留字段名 `success`。
- 在文档和类型注释中明确：`success` means the reported `stage` completed successfully。
- 不改成 `stageSucceeded`，因为 result API 常用 `success`，UI/调用方更容易消费。
- 判断普通 commit 导入是否可用，应使用：

```ts
result.mode === "commit" &&
result.stage === "runtimeCacheBuild" &&
result.success
```

- 判断 dry run 是否通过，应使用：

```ts
result.mode === "dryRun" &&
result.stage === "stageImportData" &&
result.success
```

### 已确认：Conflict Check 使用显式 Context

Conflict Check 是第一个需要读取当前系统状态的阶段。为了让它可测试，阶段 2 需要定义它依赖的 read model，而不是让 pipeline 直接读 store/localStorage。

- 定义 `EquipmentPackConflictContext`，由调用方从当前系统状态构造。
- Conflict Check 只读取 context，不直接读 localStorage 或 Zustand store。
- 第一版需要：
  - builtin weapon template ids
  - builtin armor template ids
  - imported custom weapon template ids，包括 disabled pack
  - imported custom armor template ids，包括 disabled pack
  - current custom equipment pack count，包括 disabled pack
  - max pack count
- Conflict Check 检查：
  - incoming template id 与 builtin id 冲突 -> `ID_CONFLICT`
  - incoming template id 与 imported custom id 冲突 -> `ID_CONFLICT`
  - current custom pack count 已达上限 -> `PACK_LIMIT_EXCEEDED`
- 同包内 duplicate id 已在 Semantic Validation 阶段检查，不属于 Conflict Check。

示意：

```ts
interface EquipmentPackConflictContext {
  builtinTemplateIds: ReadonlySet<string>
  importedTemplateIds: ReadonlySet<string>
  importedTemplateSources?: ReadonlyMap<string, { packId?: string }>
  customPackCount: number
  maxCustomPackCount: number
}
```

理由：

- Conflict Check 可用纯函数测试。
- disabled pack 是否占用 id 由 context 构造保证，不散落在 pipeline 内。
- `importedTemplateSources` 只用于 custom conflict diagnostic metadata；不存在时仍可只返回 `{ id, conflictSource: "custom" }`。
- Stage 3 可以从 storage snapshot / runtime cache build input 组装 context，不影响阶段 2。

### 已确认：ID Conflict Diagnostic Path

`ID_CONFLICT` 的主错误位置在 incoming pack 中，但冲突对象可能来自 builtin template 或已导入 custom pack，不一定有当前输入文档的 path。需要定义 `relatedPaths` 和 `value` 怎么用。

- `path` 指向 incoming template id 字段，例如 `/equipment/weapons/2/id`。
- 与同一个 incoming pack 内重复 id 不使用 `ID_CONFLICT`，使用 `DUPLICATE_ID`，并用 `relatedPaths` 指向第一个重复位置。
- 与 builtin id 冲突时：
  - `relatedPaths` 为空或省略，因为 builtin 不在输入文档内。
  - `value` 包含 `{ id, conflictSource: "builtin" }`。
- 与 imported custom id 冲突时：
  - `relatedPaths` 为空或省略，因为已导入 pack 不在当前输入文档内。
  - `value` 包含 `{ id, conflictSource: "custom", packId?: string }`。
- 如果 conflict context 只能提供 id set，不能提供 packId，则 `packId` 可省略。

理由：

- `relatedPaths` 只表达当前输入 document 内的位置关系。
- 外部系统状态冲突放进 `value` metadata，不伪造 JSON Pointer。
- UI 可以显示“该 id 已被内置装备占用”或“该 id 已被已导入装备包占用”。

### 已确认：Stage Import Data 输出 staged import / commit draft

阶段 2 不设计真实 storage 写入，也不生成最终 repository identity。Stage Import Data 只输出经过校验和 normalize 的 staged import / commit draft，作为阶段 3 Application Service 组装 final commit plan 的输入。

- Stage Import Data 输入是 `NormalizedEquipmentPackData`、source metadata 和 conflict context 的必要摘要。
- Stage Import Data 输出不可变 `EquipmentPackCommitDraft`。
- `EquipmentPackCommitDraft` 不写 storage、不更新 store、不重建 runtime cache。
- `EquipmentPackCommitDraft` 包含：
  - canonical pack data
  - template id 列表
  - source metadata
- `packId` 不在 Stage Import Data 生成；最终 `packId` 由阶段 3 Application Service 基于 repository snapshot 生成。

示意：

```ts
interface EquipmentPackCommitDraft {
  packData: NormalizedEquipmentPackData
  templateIds: string[]
  source: {
    originKind: EquipmentPackImportOriginKind
    label?: string
    fileName?: string
    sizeBytes?: number
  }
}
```

理由：

- dry run 可以返回 pack 摘要和模板计数，便于作者确认。
- Stage 3 Application Service 可以把 commit draft 加上 `packId`、`importedAt` 和 lifecycle metadata，组装为 final commit plan。
- pack storage identity 与模板 id 分离，避免把 pack 升级/删除/管理和模板 id 混在一起。
- Import pipeline 不读取 repository snapshot，因此不应负责生成需要 repository 唯一性的 `packId`。

### 已确认：`packId` 语义阶段 2 固定，生成职责阶段 3 固定

`packId` 是 pack 管理和 storage identity，不是 template id。阶段 2 只固定它不属于 import pipeline 的内容身份；最终生成职责由阶段 3 Application Service 承担。

- 阶段 2 固定 `packId` 的语义和约束，不固定最终字符串算法。
- `packId` 不在 Stage Import Data 生成。
- `packId` 必须只用于 pack storage/management，不作为模板 id 前缀，也不进入角色表装备槽。
- `packId` 必须在当前 custom equipment pack storage 中唯一。
- `packId` 可以包含随机/时间成分；重复导入同一包不靠 packId 判断覆盖，仍靠 template id conflict 拒绝。
- Dry run 不承诺最终 `packId`。
- 阶段 3 存储设计固定具体算法，例如 timestamp/random。
- 现有卡牌包 `batchId` 的 timestamp/random 方案可作为参考，但装备包命名应使用 `packId`，不使用 `batchId`。

理由：

- 现在过早固定 packId 算法收益不大。
- 冲突策略依赖 template id，不依赖 packId。
- 阶段 3 需要结合 repository snapshot、storage key、index 和 remove/toggle action 再定算法。

### 已确认：Storage Transaction 和 Runtime Cache Build 使用依赖接口

阶段 2 不实现真实 storage/runtime cache，但保留 fake storage/runtime cache 依赖用于测试 stage/result mapping。阶段 3 进一步把真实 commit orchestration 移到 Application Service。

- pipeline 接受 dependency object，不直接 import store/localStorage/runtime cache。
- `storageTransaction.commit(draft)` 在阶段 2 测试中可继续接收 fake draft 证明 result mapping；真实 final commit plan 由阶段 3 Application Service 组装。
- `runtimeCacheBuilder.rebuild()` 在 storage transaction 成功后调用，返回成功或 `EquipmentPackImportDiagnostic`。
- storage failure 必须映射到 `stage: "storageTransaction"`。
- runtime cache failure 必须映射到 `stage: "runtimeCacheBuild"`。
- dry run 不调用 storage transaction 或 runtime cache build。

示意：

```ts
interface EquipmentPackImportDependencies {
  conflictContext: EquipmentPackConflictContext
  storageTransaction: EquipmentPackStorageTransaction
  runtimeCacheBuilder: EquipmentRuntimeCacheBuilder
}

interface EquipmentPackStorageTransaction {
  commit(draft: EquipmentPackCommitDraft): Promise<EquipmentPackStorageResult>
}

interface EquipmentRuntimeCacheBuilder {
  rebuild(): Promise<EquipmentRuntimeCacheBuildResult>
}
```

阶段 3 负责细化真实 final commit plan、`EquipmentPackStorageResult`、`EquipmentRuntimeCacheBuildResult`、rollback 和恢复策略。

### 已确认：导入入口使用单一 Pipeline，函数签名由实现阶段细化

阶段 2 已经有 source、options、dependencies 三类输入。具体函数参数排列属于实现细节，阶段 2 只固定行为边界。

建议实现形状：

```ts
async function importEquipmentPackFromSource(
  source: EquipmentPackImportSource,
  options: EquipmentPackImportOptions,
  dependencies: EquipmentPackImportDependencies,
): Promise<EquipmentPackImportResult>
```

规则：

- `options.mode` 默认 `"commit"`。
- UI 普通导入使用 `mode: "commit"`。
- 作者检查/dry run 使用 `mode: "dryRun"`。
- 不提供多个公开入口如 `validateEquipmentPack` / `dryRunEquipmentPack`；这些可以是薄 wrapper，但核心入口只有一个。

可选 wrapper：

```ts
const dryRunEquipmentPackFromSource = (source, dependencies) =>
  importEquipmentPackFromSource(source, { mode: "dryRun" }, dependencies)
```

理由：

- 一条 pipeline，两个 mode，减少行为分叉。
- 测试可以精确替换 conflict/storage/runtime cache/clock。
- UI/作者工具可以复用同一结果模型。

### 已确认：Authoring Preprocess Enum Error

中文 enum alias 在 Structural Validation 前处理，因此未知 alias 的错误发生在 `authoringPreprocess` 阶段。

规则：

- Authoring Preprocess 只负责受控中文 alias 转换和字符串 trim。
- 已知中文 alias 成功转换为英文 canonical enum。
- 可识别枚举字段内的未知中文 alias 映射为 `INVALID_ENUM`。
- 未知英文 enum 不是中文 authoring alias，保留给 Structural Validation，由 AJV enum/const 映射为 `INVALID_ENUM`。
- 中文 alias error 的 result 使用 `stage: "authoringPreprocess"`、`success: false`。
- diagnostic `path` 指向对应字段，例如 `/equipment/weapons/0/trait`。
- diagnostic `value` 保留原始值，例如 `"敏捷力"`。
- 同一 Authoring Preprocess 阶段内尽量收集所有可发现 enum alias errors。
- 如果 Authoring Preprocess 有 error，不进入 Structural Validation。
- message 可以区分“未知中文 alias”或“非法枚举值”，但测试不绑定完整文案。

理由：

- 对 UI 来说，未知中文 alias 和未知英文 enum 都是“枚举值非法”，但 `stage` 保留它们发生在便利层还是 schema 层的信息。
- 统一使用 `INVALID_ENUM` 避免新增只服务 alias 的错误码。

### 已确认：AJV Error 映射优先级

Structural Validation 使用 AJV。一个错误输入可能触发多个 AJV keyword，例如 `version` 同时不匹配 pattern，字段类型错误又导致后续 keyword 无意义。阶段 2 需要定义映射优先级，避免 diagnostics 抖动。

- AJV 配置使用 `allErrors: true`，尽量收集同阶段所有结构错误。
- 映射按 keyword 和 path 稳定转换，不暴露 AJV 原始 keyword 文案。
- 对同一 path 的多个 schema error，保留最具体/最优先的一条，避免同一字段刷屏。
- 优先级：
  1. `required` -> `MISSING_FIELD`
  2. `additionalProperties` -> `UNKNOWN_FIELD`
  3. `const` on `/format` -> `INVALID_FORMAT`
  4. `enum` / `const` elsewhere -> `INVALID_ENUM`
  5. `pattern` on `/version` -> `INVALID_SEMVER`
  6. `maxLength` -> `FIELD_TOO_LONG`
  7. `maxItems` on `modifierContributions` -> `TEMPLATE_LIMIT_EXCEEDED`
  8. `type` / `minimum` / `integer` / `minLength` / `not` -> `INVALID_TYPE`
- `format` 缺失由 `required` 产生 `MISSING_FIELD`，`format` 值错误由 `INVALID_FORMAT`。

Path 构造规则：

- AJV `required` 的 path 指向缺失字段本身，例如 parent `/equipment/weapons/0` 缺少 `id` 时，最终 path 是 `/equipment/weapons/0/id`。
- AJV `additionalProperties` 的 path 指向未知字段本身，例如 `/equipment/weapons/0/extra`。
- JSON Pointer segment 必须按 RFC 6901 escape：`~` -> `~0`，`/` -> `~1`。
- `path: ""` 只用于 document-level、source-level、parse-level、storage-level 或 runtime-cache-level diagnostic。
- 最终 public diagnostic 不暴露 raw AJV `keyword`、`params` 或原始 message。

这个优先级主要是实现指导，不需要 UI 暴露。

## 阶段 2 验收条件

阶段 2 细化完成时，必须满足：

- 明确 Source Read 和 JSON Parse 的分离模型。
- 明确 Import Origin 只是 metadata，pipeline parse 分支由 payload kind 决定。
- 明确 `commit` / `dryRun` 两种 mode 的行为。
- 明确 Import Result 使用 `stage + success`，不使用 `committed`。
- 明确 `stage + success + mode` 的判定语义：commit 导入完成且可用必须满足 `mode === "commit" && stage === "runtimeCacheBuild" && success === true`；dry run 通过必须满足 `mode === "dryRun" && stage === "stageImportData" && success === true`。
- 明确 dry run 仍执行 Conflict Check，但绝不调用 Storage Transaction 或 Runtime Cache Build。
- 明确 Import Result Summary 只能来自可信阶段：Source Read / JSON Parse / Authoring Preprocess / Structural Validation 失败只返回安全计数；Canonical Normalize 成功后才可返回 canonical metadata 和装备计数；`warningCount` / `errorCount` 始终由 diagnostics 计算。
- 明确所有 pipeline stage 的 gate rule。
- 明确 warning 是同一 pipeline 的非阻塞诊断，并固定第一版 warning code 和触发条件。
- 明确 warning lifecycle：已产生 warning 在后续阶段失败时保留，`warningCount` / `errorCount` 从 diagnostics 计算。
- 明确 diagnostic 使用 JSON Pointer path 和可选 `relatedPaths`。
- 明确 diagnostic code 使用 error/warning discriminated union。
- 明确 AJV keyword/params 到 diagnostic code、path、value 的稳定映射优先级，且不泄漏 raw AJV error。
- 明确 `required`、`additionalProperties`、数组项和嵌套字段的 JSON Pointer path 构造规则，包括 `~` 和 `/` escaping。
- 明确 Source Read error、文件大小上限和来源大小检查规则。
- 明确 Conflict Check 依赖显式 context，不直接读 storage/store。
- 明确 Conflict Check 的冲突键是 template id，不是 packId。
- 明确 Stage Import Data 输出 `EquipmentPackCommitDraft`。
- 明确 `packId` 不在 Stage Import Data 生成；commit 完整成功时 `summary.packId` 必须存在；dry run 不承诺最终 `packId`。
- 明确 `Build Commit Plan` 由阶段 3 Application Service 负责，`PACK_ID_GENERATION_FAILED` 停在 `stage: "buildCommitPlan"`。
- 明确 `packId` 是 equipment pack 的 storage/management identity，不参与 template id 冲突判断，不作为 template id 前缀，也不进入角色表装备槽。
- 明确装备包设计不使用 `batch` / `batchId` 命名，除非明确引用 legacy card store。
- 明确 Storage Transaction 和 Runtime Cache Build 在阶段 2 只作为依赖接口。
- 明确 Stage Import Data、Conflict Check 或任何 pre-storage 失败不得写 storage、更新 store 或重建 runtime cache。
- 明确阶段 2 不设计真实 localStorage transaction、rollback、启动自检或 query index 数据结构。

## 阶段 2 最低测试清单

测试目标是证明 pipeline stage、result mapping、diagnostics 和 dry run/commit 分支清楚；不测试真实 localStorage、真实 runtime cache 或 UI。

### Source Read / JSON Parse

- file source 读取失败 -> `stage: "sourceRead"`、`success: false`、`SOURCE_READ_FAILED`、path `""`。
- file source 超过 500 KiB -> `stage: "sourceRead"`、`success: false`、`FILE_TOO_LARGE`、path `""`。
- container source 内 `equipment.json` 超过 500 KiB -> `stage: "sourceRead"`、`FILE_TOO_LARGE`。
- object source 或 test fixture source 提供 `sizeBytes` 且超过 500 KiB -> `stage: "sourceRead"`、`FILE_TOO_LARGE`。
- object source 或 test fixture source 未提供 `sizeBytes` 时跳过整体大小检查，继续后续 validation。
- invalid JSON text -> `stage: "jsonParse"`、`success: false`、`INVALID_JSON`、path `""`。
- object source 的 `parsedObject` 跳过 JSON Parse。
- builtin source 不做 `FILE_TOO_LARGE`。

### Authoring Preprocess

- 中文 alias 成功转换后继续 Structural Validation。
- 未知中文 alias -> `stage: "authoringPreprocess"`、`INVALID_ENUM`。
- 未知英文 canonical enum -> `stage: "structuralValidation"`、`INVALID_ENUM`。
- 同一输入中所有可遍历 enum alias 错误都应聚合；遇到非对象/非数组结构时由 Structural Validation 处理。
- Authoring Preprocess 有 error 时不调用 AJV。
- trim 成功不产生 warning。

### Structural Validation / AJV Mapping

- `required` -> `MISSING_FIELD`。
- 缺 `/equipment/weapons/0/id` -> `MISSING_FIELD`，path 是 `/equipment/weapons/0/id`。
- `additionalProperties` -> `UNKNOWN_FIELD`。
- 未知 `/equipment/weapons/0/extra` -> `UNKNOWN_FIELD`，path 是 `/equipment/weapons/0/extra`。
- 未知字段名 `a/b~c` 的 path segment escape 为 `/a~1b~0c`。
- `/format` const mismatch -> `INVALID_FORMAT`。
- 缺 `format` -> `MISSING_FIELD`，不是 `INVALID_FORMAT`。
- enum / const mismatch -> `INVALID_ENUM`。
- `/version` pattern mismatch -> `INVALID_SEMVER`。
- maxLength -> `FIELD_TOO_LONG`。
- modifierContributions maxItems -> `TEMPLATE_LIMIT_EXCEEDED`。
- type/minimum/integer/minLength/not -> `INVALID_TYPE`。
- 每个 diagnostic `path` 和 `relatedPaths[]` 都是 JSON Pointer string；`""` 只用于 document/stage-level 错误。
- public diagnostic 不暴露 raw AJV `keyword`、`params` 或原始 message。
- 同一 path 多个 AJV errors 时只保留优先级最高的一条。
- Structural Validation 失败时不进入 Canonical Normalize。

### Diagnostic Shape

- `severity: "error"` diagnostic 不能使用 warning code。
- `severity: "warning"` diagnostic 不能使用 error code。
- `diagnostics` 保持一个混合数组，不拆分为 `errors` / `warnings`。
- 多个聚合 error 的 `errorCount` 准确。
- failure with errors only：`warningCount = 0`，`errorCount > 0`。

### Warning Diagnostics

- 缺 `author` -> `MISSING_AUTHOR` warning，path `/author`。
- `author: "   "` -> trim 后 schema `minLength` hard error，不是 `MISSING_AUTHOR` warning。
- 缺顶层 `description` 或 trim 后为空 -> `MISSING_DESCRIPTION` warning，path `/description`。
- 单个模板缺 `featureName` 且缺 `description`，或二者 trim 后均为空 -> `MISSING_TEMPLATE_DESCRIPTION` warning，path 是模板对象路径。
- description 长度 `1000` -> 不产生 `DESCRIPTION_LONG`。
- description 长度 `1001` -> `DESCRIPTION_LONG` warning。
- description 长度 `4000` -> `DESCRIPTION_LONG` warning 且仍可成功。
- description 长度 `4001` -> `FIELD_TOO_LONG` error，不是 `DESCRIPTION_LONG`。
- `DESCRIPTION_LONG` path 指向具体 description 字段。
- warning 不影响 `stage` 或 `success`。
- success with warnings only：`success: true`，`warningCount > 0`，`errorCount = 0`。
- failure with retained warnings and later errors：diagnostics 同时包含 warning 与 error，计数准确。

### Semantic Validation

- Canonical Normalize 不产生 error；需要失败的情况必须由前置 Structural Validation 或后置 Semantic Validation 表达。
- 空装备包 -> `stage: "semanticValidation"`、`EMPTY_EQUIPMENT`。
- 同包内重复 weapon id -> `DUPLICATE_ID`，第二个位置为 `path`，第一个位置在 `relatedPaths`。
- weapon/armor 跨数组重复 id -> `DUPLICATE_ID` + `relatedPaths`。
- 单模板内 contribution id 重复 -> `DUPLICATE_ID` + `relatedPaths`。
- input-local `DUPLICATE_ID` 的 `relatedPaths` 只包含当前输入 document 内 JSON Pointer。
- armor threshold order invalid -> `INVALID_THRESHOLD_ORDER`。
- Semantic Validation 失败时不进入 Conflict Check。

### Conflict Check

- incoming id 与 builtin id 冲突 -> `ID_CONFLICT`，`value.conflictSource = "builtin"`。
- incoming id 与 imported custom id 冲突 -> `ID_CONFLICT`，`value.conflictSource = "custom"`。
- `ID_CONFLICT` 的 `path` 指向 incoming id 字段。
- builtin conflict 的 `value` 至少包含 `{ id, conflictSource: "builtin" }`。
- custom conflict 的 `value` 至少包含 `{ id, conflictSource: "custom" }`，context 提供 packId 时包含 `packId`。
- external `ID_CONFLICT` 不伪造 `relatedPaths`。
- 多个 external ID conflicts 尽量聚合。
- disabled pack 的 template id 仍参与 conflict context。
- custom pack count 达到上限 -> `PACK_LIMIT_EXCEEDED`，path `""`。
- dry run 下 custom pack count 达到上限 -> `PACK_LIMIT_EXCEEDED`，且不调用 storage/runtime cache fake。
- Conflict Check 失败时不进入 Stage Import Data。
- Conflict Check 只读取 `EquipmentPackConflictContext`，不直接读 localStorage 或 Zustand store。

### Stage Import Data / Commit Draft

- Stage Import Data 成功生成不可变 `EquipmentPackCommitDraft`。
- commit draft 包含 pack data、template id 列表和 source metadata。
- commit draft 不包含最终 `packId`、pack lifecycle metadata 或 repository key。
- `packId` 不作为 template id 前缀，不参与 duplicate/conflict 判断。
- 重复导入同一包仍因 template id conflict 失败，而不是因 packId 相同或不同决定。
- Stage Import Data 不写 storage、不更新 store、不重建 runtime cache。
- dry run 成功可返回 staged import 摘要，但 UI 不承诺后续 commit 的最终 `packId`。
- equipment import contracts 不出现 `batchId` / `BatchInfo` 命名。

### Stage / Mode / Result

- dry run 成功 -> `stage: "stageImportData"`、`success: true`，不调用 storage/runtime cache fake。
- 未指定 `mode` 时默认等同 `mode: "commit"`。
- commit 成功 -> `stage: "runtimeCacheBuild"`、`success: true`，storage fake 和 runtime cache fake 都被调用。
- storage fake failure -> `stage: "storageTransaction"`、`success: false`，且不调用 runtime cache fake。
- storage quota failure -> `STORAGE_QUOTA_EXCEEDED`，path `""`。
- storage serialize failure -> `STORAGE_SERIALIZE_FAILED`，path `""`。
- storage write failure -> `STORAGE_WRITE_FAILED`，path `""`。
- runtime cache fake 只在 storage success 后调用。
- runtime cache fake failure -> `stage: "runtimeCacheBuild"`、`success: false`、`RUNTIME_CACHE_BUILD_FAILED`，path `""`。
- `summary` 在 Source Read / JSON Parse / Authoring Preprocess / Structural Validation 失败时不包含 raw name，且 `weaponCount: 0`、`armorCount: 0`。
- `summary` 在 normalize 后失败时包含 canonical metadata 和 counts。
- `warningCount` / `errorCount` 与 diagnostics 一致。
- successful commit with warnings still ends at `stage: "runtimeCacheBuild"`、`success: true`。
- successful dry run with warnings still ends at `stage: "stageImportData"`、`success: true`。
- commit 完整可用判断是 `mode === "commit" && stage === "runtimeCacheBuild" && success`。
- dry run 通过判断是 `mode === "dryRun" && stage === "stageImportData" && success`。
- pre-storage 任一阶段失败时，不调用 storage fake 或 runtime cache fake。
