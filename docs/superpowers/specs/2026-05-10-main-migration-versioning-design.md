# Main Migration Versioning Design

日期：2026-05-10

## 目的

本文定义独立的 main 分支 migration versioning 工作范围。

这项工作只在 main 当前数据模型上建立版本化迁移基础，不引入 modifier / equipment / target sync automation 的新结构。

## 范围边界

本阶段只做：

```text
v0 -> v1
CURRENT_SCHEMA_VERSION = 1
```

版本含义：

- `v0`：没有 `schemaVersion` 的旧存档。
- `v1`：main 当前数据结构经过版本化 migration 后的存档。

本阶段不做：

- `v1 -> v2`。
- equipment 结构迁移。
- modifier state 迁移。
- target sync automation 迁移。
- legacy base inference。

这些属于 modifier 分支 rebase 到新版 main 后的后续工作。

## 核心决策

`SheetData` 新增必填字段：

```ts
schemaVersion: number
```

新增常量：

```ts
export const CURRENT_SCHEMA_VERSION = 1
```

无版本或无效版本按 v0 处理。

高于 `CURRENT_SCHEMA_VERSION` 的存档直接报错，不做 best-effort 降级。

## Migration Pipeline

新的 migration 入口：

```text
raw input
-> detect schemaVersion
-> run version migrations
-> normalize current schema
-> validate current schema at import boundary
-> return v1 SheetData
```

关键规则：

- 不在 migration 开始时 merge `defaultSheetData`。
- 先读取 raw input 的真实形状。
- `v0 -> v1` 负责旧结构迁移。
- `normalizeCurrentSheetData()` 负责当前 schema 默认值补齐。
- `validateAndProcessCharacterData()` 负责外部 JSON / HTML 文件导入边界。
- 内部 localStorage load / duplicate 不走 import validate，但必须走 `migrateSheetData()`。

## v0 -> v1 内容

`v0 -> v1` 包含 main 已有 migration 行为：

- page visibility 迁移。
- inventory cards 补齐。
- attribute spellcasting 补齐。
- page visibility `page3` rename。
- page visibility 缺失字段补齐。
- armor template 补齐。
- adventure notes 补齐。
- legacy weapon checkbox 状态保留。
- hope boolean array 到 number。
- notebook 补齐。
- deprecated fields cleanup。
- 写入 `schemaVersion: 1`。

## Import / Normalize 边界

外部文件导入流程：

```text
JSON / HTML file
-> parse raw object
-> validateRawImportCandidate(raw)
-> migrateSheetData(raw)
-> validateCurrentSheetData(migrated)
-> return migrated
```

HTML 和 JSON 已经共用 `validateAndProcessCharacterData(rawData, source)`，实现时只改这条共用路径。

`validateRawImportCandidate()` 只做候选检查：

- 输入必须是 object。
- 必须像角色数据候选。
- 不补默认值。
- 不转换字段类型。
- 不删除未知字段。
- 不迁移 legacy 字段。

`normalizeCurrentSheetData()` 做当前 schema 默认值补齐：

- 当前 schema 需要的数组字段补默认数组。
- 当前 schema 需要的对象字段补默认对象。
- `trainingOptions` 缺失时补完整结构。
- `hopeMax` 缺失时补当前默认值。

## cleanAndNormalizeData

当前 `cleanAndNormalizeData()` 混合了导入清理、旧结构迁移、默认值补齐和兼容性 warning。

版本化后：

- 不再在 import validation 前调用它。
- 迁移行为进入 `migrateV0ToV1()`。
- 默认值补齐进入 `normalizeCurrentSheetData()`。
- warning 进入 current schema validation。
- 如果保留 `cleanAndNormalizeData()` 导出，只作为临时兼容 wrapper，不作为主流程使用。

无效 card 暂时保持当前行为：导入时过滤无效 card，并用测试锁定。未来如果改成 warning 或 error，单独讨论。

## 已知行为差异

main 当前存在一个重要差异：

- 直接调用 `migrateSheetData()` 时，函数开头 merge `defaultSheetData`，会导致 `includePageThreeInExport` 被默认 `pageVisibility` 掩盖。
- 通过 JSON / HTML import 时，`cleanAndNormalizeData()` 不保留默认 `pageVisibility`，所以 `includePageThreeInExport` 能生效。

版本化后采用 raw-first migration。也就是说，`v0 -> v1` 应优先读取 raw legacy input，避免默认值掩盖旧字段。

这个行为与当前 import 路径保持一致，但会修正直接 `migrateSheetData()` 的 legacy field 掩盖问题。实现必须用测试明确锁定。

## Storage Helper

`lib/storage.ts` 不是整个文件废弃。

保留：

- `exportCharacterData()`。
- 导出文件名相关 helper。

清理或废弃：

- 旧单角色 `saveCharacterData()`。
- 旧单角色 `loadCharacterData()`。
- `mergeAndSaveCharacterData()`。
- `clearCharacterData()`。
- 旧 JSON `importCharacterData()`。
- 未被 UI 使用的 `importCharacterDataForMultiCharacter()`。

多角色存储继续使用 `lib/multi-character-storage.ts`，但加载和复制角色必须依赖版本化 `migrateSheetData()`。

## 测试策略

本阶段测试覆盖：

- main 当前 migration/import 行为的 characterization baseline。
- `schemaVersion` 默认值和迁移写入。
- v0 数据迁移到 v1。
- v1 数据重复迁移保持稳定。
- `migrate(migrate(data))` 幂等。
- 无效 schemaVersion 按 v0。
- 高版本 schemaVersion 抛错。
- JSON / HTML import 共用路径不丢 `schemaVersion`。
- raw import validation 不修改输入。
- 无效 card 当前继续过滤。
- localStorage load / duplicate 走版本化 migration。

## 后续 v2

modifier 分支 rebase 到包含本工作的新 main 后，再实现：

```text
v1 -> v2
```

v2 可包含：

- equipment 数据迁移。
- modifier state 数据迁移。
- target sync automation state。
- legacy base inference。
- `CURRENT_SCHEMA_VERSION = 2`。
