# Migration Versioning Design

日期：2026-05-10

## 目的

本文记录当前关于存档 migration 版本化的设计共识。

本文不是实现计划。它定义新的 migration 组织方式、当前分支如何迁入版本化方案，以及哪些兼容范围不再承诺。

## 背景

当前 `migrateSheetData()` 是按具体修改内容串联的迁移：

```text
raw data
-> merge defaultSheetData
-> migratePageVisibility
-> migrateInventoryCards
-> migrateAttributeSpellcasting
-> migrateArmorTemplate
-> migrateEquipment
-> migrateModifierState
-> cleanup
```

这个模式的问题是：

- 没有存档 schema version。
- migration 只能根据字段是否存在、数据长什么样来猜测来源。
- 一开始 merge `defaultSheetData` 会掩盖“字段原本不存在”的事实。
- 各 migration step 缺少明确版本边界。
- 当 modifier、equipment、automation 都开始涉及语义迁移时，字段猜测会越来越危险。

当前项目里有一些 `version` 相关字段，但它们不是角色存档 schema version：

- HTML 导出的 `data-version="1.0"` 是导出格式元信息。
- HTML importer 读取的 `metadata.version` 不进入 `SheetData`。
- 卡包编辑器和 package version 属于卡包系统。
- `CharacterMetadata` 不表示角色数据 schema。

因此，当前角色存档实际上没有可用的 schema version。

## 核心共识

新增顶层字段：

```ts
interface SheetData {
  schemaVersion: number
}
```

版本定义：

```text
无 schemaVersion = v0
当前分支最终发布结构 = v1
```

`CURRENT_SCHEMA_VERSION` 从 `1` 开始。

不使用日期版本号。schema version 表达的是数据契约迭代顺序，不是发布时间。

## 兼容范围

需要支持：

- v0：主分支/已发布版本产生的无版本存档。
- v1：当前分支最终发布后产生的版本化存档。
- v1 之后的未来版本化存档，按追加 migration 处理。

不需要支持：

- 当前分支开发过程中，中间 commit 产生的无版本临时存档。
- 测试文档或测试 fixture 中的中间态数据。

测试 fixture 可以从头构建，不属于用户数据兼容契约。

开发过程中如果需要保留本地中间态存档，依赖测试覆盖和手动再迁移即可，不为它们单独定义公开 schema version。

## 版本与内部步骤

对外 schema version 只表示发布级别的数据契约。

当前分支内部可以拆很多 migration helper，但对外只暴露一个版本跃迁：

```text
v0 -> v1
```

推荐结构：

```ts
function migrateV0ToV1(raw: UnknownSheetData): UnknownSheetData {
  let data = raw

  data = migratePageVisibilityV0(data)
  data = migrateInventoryCardsV0(data)
  data = migrateAttributeSpellcastingV0(data)
  data = migrateHopeV0(data)
  data = migrateNotebookV0(data)
  data = migrateEquipmentV0(data)
  data = migrateModifierStateV0(data)
  data = cleanupDeprecatedFieldsV0(data)

  return {
    ...data,
    schemaVersion: 1,
  }
}
```

也就是说：

```text
schema version = 对外发布契约
migration steps = 内部实现步骤
```

当前分支尚未发布，因此可以重构当前 migration 的组织方式，但目标是改结构、不改语义。

发布之后，已发布版本 migration 不再重写，只追加新版本：

```text
v0 -> v1
v1 -> v2
v2 -> v3
```

## Migration 入口

新的迁移入口应按版本执行：

```text
raw input
-> detect schemaVersion
-> run version migrations
-> fill defaults / normalize
-> reconcile
-> cleanup
-> schemaVersion = CURRENT_SCHEMA_VERSION
```

关键约束：

- 不要在最开始 merge `defaultSheetData`。
- 先读取 raw input 上的 `schemaVersion`。
- 没有 `schemaVersion`，或 `schemaVersion` 不是有效数字，按 v0 处理。
- 版本 migration 负责结构性迁移。
- defaults / normalize 负责补齐当前 schema 必需字段。
- cleanup 负责移除废弃字段。

原因是：如果先 merge default，migration 会失去判断旧数据真实形状的能力。

## 当前分支迁移归属

当前分支已经对 migration 做过修改，包括 equipment 和 modifier state 相关迁移。

因为这些修改还没有作为生产版本发布，所以它们不应成为散落在主入口中的永久历史，而应被收进：

```text
migrateV0ToV1()
```

`v0 -> v1` 应包含当前分支最终需要的所有结构性迁移，例如：

- page visibility 迁移。
- inventory cards 补齐。
- attribute spellcasting 补齐。
- armor template 补齐。
- adventure notes 补齐。
- hope boolean array 到 number。
- notebook 补齐。
- equipment 数据迁移。
- modifier state 数据迁移。
- legacy equipment 字段清理。
- deprecated fields cleanup。
- 写入 `schemaVersion: 1`。

如果 target sync automation 在当前分支发布前完成，也可以进入 `v0 -> v1`。

如果 equipment / modifier 先发布，target sync automation 后做，则 target sync automation 必须成为未来的 `v1 -> v2`。

## 高版本存档

如果导入数据的 `schemaVersion > CURRENT_SCHEMA_VERSION`，不能静默降级。

建议行为：

- validation/import 阶段给出 warning。
- UI 提示“该存档来自更新版本，可能不兼容”。
- 是否阻止导入可以在实现阶段再定，但不能无提示地当作当前版本处理。

## Validator / Import / Export

版本化 migration 不只影响 `sheet-data-migration.ts`。

这些路径都必须保留或写入 `schemaVersion`：

- `SheetData` 类型。
- `defaultSheetData`。
- JSON import validation。
- HTML import validation。
- local storage / multi-character storage。
- HTML export 嵌入的角色数据。
- 任何 clean / normalize 函数。

特别注意：当前 `cleanAndNormalizeData()` 会手工挑字段。如果不更新，它可能丢掉 `schemaVersion`。

## 测试策略

版本化 migration 改造需要足够测试覆盖，目标是降低“重构 migration 组织方式”带来的回归风险。

至少覆盖：

1. v0 主分支旧格式存档迁移到 v1。
2. v1 数据重复迁移保持稳定。
3. `migrate(migrate(data))` 幂等。
4. legacy equipment 字段迁移到 `equipment`。
5. legacy equipment 字段在迁移后被清理。
6. modifier state 初始化和旧结构迁移。
7. `userModifierContributions` 初始化和旧用户 entries 迁移。
8. hope boolean array 迁移为 number。
9. page visibility 旧字段迁移。
10. validator/importer 不丢 `schemaVersion`。
11. 无效 `schemaVersion` 按 v0 处理。
12. 高版本 `schemaVersion` 有 warning 或明确错误。

测试 fixture 应从目标场景构建，不需要兼容当前分支开发过程中的中间态测试数据。

## 与自动化同步设计的关系

版本化 migration 是 target sync automation 的前置基础之一。

原因：

- target sync automation 需要区分 v0 老存档和 v1+ 新存档。
- legacy base inference 只应对 v0 老存档生效。
- v1+ 存档已有明确 schema，不应继续靠字段形状猜测。

没有 schema version 时，迁移器只能猜一个存档是不是“纯老存档”。版本化后，这个判断可以变成明确规则：

```text
schemaVersion missing -> v0 -> 可执行 legacy inference
schemaVersion >= 1 -> 按版本 migration，不做 v0 专属猜测
```

## 当前已达成共识

1. 当前没有可用的角色存档 schema version 字段。
2. 新增 `schemaVersion: number` 到 `SheetData` 顶层。
3. 无版本存档视为 v0。
4. 当前分支最终发布结构视为 v1。
5. 当前分支 migration 改动应重构进 `v0 -> v1`。
6. 对外只需要发布级版本，不需要记录开发过程内部版本。
7. `v0 -> v1` 内部可以拆多个小 helper，并用测试覆盖。
8. 当前分支中间态无版本存档不进入兼容范围。
9. 发布后不再重写已发布 migration，只追加新版本。
10. 重构 migration 的目标是改组织方式，不改变现有迁移语义。

## 待讨论问题

1. 高版本存档是阻止导入，还是允许 best-effort 导入但强提示？
2. `schemaVersion` 是否应该在 UI 或导出 metadata 中显示？
3. target sync automation 是否会赶在当前分支发布前完成，从而进入 v1？
4. `cleanAndNormalizeData()` 是否应继续存在，还是逐步收敛到 migration + normalize pipeline？
5. `MigrationOptions` 是否需要保留，或在版本化重构时清理为真正有用途的参数？
