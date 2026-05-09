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
主分支当前 migration 后结构 = v1
当前分支最终发布结构 = v2
```

`CURRENT_SCHEMA_VERSION` 从 `2` 开始。

不使用日期版本号。schema version 表达的是数据契约迭代顺序，不是发布时间。

## 兼容范围

需要支持：

- v0：比主分支当前 migration 更老的无版本原始存档。
- v1：主分支当前 migration 后的已发布存档形态。
- v2：当前分支最终发布后的版本化存档形态。
- v2 之后的未来版本化存档，按追加 migration 处理。

不需要支持：

- 当前分支开发过程中，中间 commit 产生的无版本临时存档。
- 测试文档或测试 fixture 中的中间态数据。

测试 fixture 可以从头构建，不属于用户数据兼容契约。

开发过程中如果需要保留本地中间态存档，依赖测试覆盖和手动再迁移即可，不为它们单独定义公开 schema version。

## 版本与内部步骤

对外 schema version 只表示发布级别的数据契约。

当前分支内部可以拆很多 migration helper，但版本边界应按已发布迁移历史划分：

```text
v0 -> v1
v1 -> v2
```

推荐结构：

```ts
function migrateV0ToV1(raw: UnknownSheetData): UnknownSheetData {
  let data = raw

  // 主分支已有 migration 行为
  data = migratePageVisibilityV0(data)
  data = migrateInventoryCardsV0(data)
  data = migrateAttributeSpellcastingV0(data)
  data = migrateHopeV0(data)
  data = migrateNotebookV0(data)
  data = cleanupDeprecatedFieldsV0(data)

  return {
    ...data,
    schemaVersion: 1,
  }
}

function migrateV1ToV2(raw: UnknownSheetData): UnknownSheetData {
  let data = raw

  // 当前分支新增 migration 行为
  data = migrateEquipmentV1(data)
  data = migrateModifierStateV1(data)
  data = stripLegacyEquipmentFieldsV1(data)
  data = cleanupDeprecatedFieldsV1(data)

  return {
    ...data,
    schemaVersion: 2,
  }
}
```

也就是说：

```text
schema version = 对外发布契约
migration steps = 内部实现步骤
```

当前分支尚未发布，因此可以重构当前分支新增 migration 的组织方式，但目标是改结构、不改语义。主分支已有 migration 行为应作为 `v0 -> v1` 被锁定，避免在当前分支改造中混淆旧行为和新行为。

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

主分支本身已经有 migration 逻辑，因此它应成为版本链中的第一段：

```text
v0 -> v1 = 主分支已有 migration 行为
```

这一段包括：

- page visibility 迁移。
- inventory cards 补齐。
- attribute spellcasting 补齐。
- armor template 补齐。
- adventure notes 补齐。
- hope boolean array 到 number。
- notebook 补齐。
- deprecated fields cleanup。
- 写入 `schemaVersion: 1`。

当前分支已经对 migration 做过修改，包括 equipment 和 modifier state 相关迁移。因为这些修改还没有作为生产版本发布，所以它们不应混入 `v0 -> v1`，而应作为当前分支新增迁移收进：

```text
migrateV1ToV2()
```

`v1 -> v2` 应包含当前分支最终需要的所有新增结构性迁移，例如：

- equipment 数据迁移。
- modifier state 数据迁移。
- legacy equipment 字段清理。
- target sync automation 相关 state。
- legacy base inference。
- 写入 `schemaVersion: 2`。

当前共识是：target sync automation 会在当前分支发布前完成，因此它属于 v2 的一部分。

## 高版本存档

如果导入数据的 `schemaVersion > CURRENT_SCHEMA_VERSION`，不能静默降级。

当前共识：v2 阶段如果遇到高版本存档，直接报错并禁止导入/加载。反向导入或 best-effort 降级以后再讨论。

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

特别注意：当前 `cleanAndNormalizeData()` 会手工挑字段。如果它继续在 migration 前执行，就可能丢掉 `schemaVersion`、legacy equipment 字段、`targetStates.syncMode` 等字段。

当前共识：导入 validate 应变成彻底的 validate，不再修改存档内容。所有会改变数据的行为都应进入 migration / normalize pipeline。

导入流程目标：

```text
JSON / HTML
-> parse / extract raw object
-> validateRawImportCandidate(raw)
-> migrateSheetData(raw)
-> validateCurrentSheetData(migrated)
-> return migrated
```

职责边界：

- raw validate 只检查输入是否是可迁移的角色数据候选。
- raw validate 不补默认值。
- raw validate 不转换字段类型。
- raw validate 不删除未知字段。
- raw validate 不迁移 legacy 字段。
- `migrateSheetData()` 负责版本判断和结构迁移。
- `normalizeCurrentSheetData()` 负责当前 schema 的默认值补齐和类型兜底。
- current schema validate 负责检查迁移后的数据是否可用。

因此，`cleanAndNormalizeData()` 应移除，或降级为 migration 内部的 normalize helper。它不应继续作为导入时、migration 前的破坏性预处理。

## 外部数据入口

版本化 migration 的安全性取决于入口职责清晰，而不是把所有入口都强行塞进同一个函数。

当前代码中，HTML 文件导入和 JSON 文件导入已经基本收敛：

- HTML 文件先从 `window.characterData = {...}` 提取 JSON 字符串，再 `JSON.parse`。
- JSON 文件直接 `JSON.parse`。
- 两者之后都会进入 `validateAndProcessCharacterData(rawData, source)`。

因此，文件导入层面不需要分别改 HTML 和 JSON 两套迁移逻辑。真正应该改的是它们共用的核心处理流程。

外部文件导入目标流程：

```text
file content
-> parse / extract raw object
-> validateRawImportCandidate(raw)
-> migrateSheetData(raw)
-> validateCurrentSheetData(migrated)
-> return migrated
```

这里的 validate 只适用于外部不可信输入，例如用户导入的 JSON / HTML 文件。

内部持久化入口不应走 import validate：

- 多角色 localStorage 加载。
- 复制角色。
- 运行时已有角色数据保存后再次读取。

这些数据来源是应用自己保存的角色数据，不是外部文件。它们只需要：

```text
stored object
-> migrateSheetData(stored)
-> save migrated data when needed
-> return migrated
```

这样可以避免把“外部文件格式验证”和“内部 schema 迁移”混在一起。

当前仍需要处理的旧路径是 `lib/storage.ts`：

- `lib/storage.ts` 的 `loadCharacterData()` 只做 `JSON.parse`，不迁移。
- `lib/storage.ts` 的 `importCharacterData()` parse 后直接保存并返回，不迁移。

这些函数看起来是遗留单角色存储 API。版本化改造时应先确认是否仍有真实 UI 调用方。如果没有调用方，优先删除或明确废弃，而不是为了历史 API 继续维护另一条导入链。

`migrateToMultiCharacterStorage()` 是旧单角色 localStorage 到多角色系统的迁移入口。它可以继续作为内部存储迁移处理，但建议在保存迁移出来的角色前直接调用 `migrateSheetData()`，避免依赖后续 `loadCharacterById()` 再补迁移。

运行时编辑不属于外部导入入口：

- `setSheetData()`
- `replaceSheetData()`
- 普通字段编辑 actions

这些 API 不应在每次运行时编辑时触发 migration。

## MigrationOptions

当前 `MigrationOptions` 是空接口，`migrateSheetData()` 的 `_options` 参数没有实际使用。

当前共识：

- 短期保留 `MigrationOptions` 和 `migrateSheetData(data, options)` 签名，降低调用方改动。
- 版本化实现时可以让 options 承载 warning / strict 行为，例如高版本存档提示。
- 不为了清理而立刻删除这个参数。

## 测试策略

版本化 migration 改造需要足够测试覆盖，目标是降低“重构 migration 组织方式”带来的回归风险。

至少覆盖：

1. v0 原始旧格式存档迁移到 v1，锁定主分支已有 migration 行为。
2. v1 存档迁移到 v2，锁定当前分支新增 equipment / modifier / automation 行为。
3. v0 存档一路迁移到 v2。
4. v2 数据重复迁移保持稳定。
5. `migrate(migrate(data))` 幂等。
6. legacy equipment 字段迁移到 `equipment`。
7. legacy equipment 字段在 v2 后被清理。
8. modifier state 初始化和旧结构迁移。
9. `userModifierContributions` 初始化和旧用户 entries 迁移。
10. hope boolean array 在 v0 -> v1 迁移为 number。
11. page visibility 旧字段在 v0 -> v1 迁移。
12. validator/importer 不丢 `schemaVersion`。
13. 无效 `schemaVersion` 按 v0 处理。
14. 高版本 `schemaVersion` 报错并禁止导入/加载。
15. import raw validation 不修改数据。
16. 原 `cleanAndNormalizeData()` 的必要清理行为迁入 migration / normalize 后，导入结果不回归。
17. JSON import 和 HTML import 共用同一条外部文件导入处理链。
18. localStorage load、duplicate character、legacy storage migration 不走 import validate，但必须进入版本化 `migrateSheetData()`。
19. 旧 `lib/storage.ts` API 要么删除，要么明确标记为废弃并不再作为用户入口。

测试 fixture 应从目标场景构建，不需要兼容当前分支开发过程中的中间态测试数据。

## 安全落地策略

这个改动触及导入、迁移、本地存储和版本判断，不能直接一次性重构完成。

安全策略：

1. 先补测试，冻结当前导入和迁移行为。
2. 保持 `migrateSheetData(data, options?)` 公共 API 不变。
3. 新增版本化 pipeline，但先让现有测试证明输出不回归。
4. 将 `cleanAndNormalizeData()` 的必要行为迁入 `normalizeCurrentSheetData()`，不要直接删除行为。
5. 重构 `validateAndProcessCharacterData()`，让 HTML / JSON 文件导入共享新的 raw validate + migrate + current validate 流程。
6. 检查内部存储入口，保证 localStorage load、duplicate character、legacy storage migration 都只依赖版本化 `migrateSheetData()`。
7. 保证所有 migration 幂等：

```text
migrate(v0) = v2
migrate(migrate(v0)) = v2
migrate(v1) = v2
migrate(v2) = v2
```

建议提交拆分：

1. 增加版本化 migration / import 行为测试。
2. 增加 `schemaVersion` 和 `CURRENT_SCHEMA_VERSION`。
3. 重构 `migrateSheetData()` 为版本 pipeline。
4. 重构 `validateAndProcessCharacterData()`，收敛 JSON / HTML 文件导入。
5. 调整或废弃旧 storage helper，并确保内部存储入口直接使用版本化 migration。
6. 移除或降级旧 `cleanAndNormalizeData()`。

每一步都必须能独立验证。

## 与自动化同步设计的关系

版本化 migration 是 target sync automation 的前置基础之一。

原因：

- target sync automation 需要区分 v0/v1 老存档和 v2 新存档。
- legacy base inference 只应对 v0 老存档生效。
- v2+ 存档已有明确 schema，不应继续靠字段形状猜测。

没有 schema version 时，迁移器只能猜一个存档是不是“纯老存档”。版本化后，这个判断可以变成明确规则：

```text
schemaVersion missing -> v0 -> 跑 v0 -> v1 -> v2
schemaVersion === 1 -> 跑 v1 -> v2
schemaVersion >= 2 -> 按未来版本 migration，不做旧存档专属猜测
```

## 当前已达成共识

1. 当前没有可用的角色存档 schema version 字段。
2. 新增 `schemaVersion: number` 到 `SheetData` 顶层。
3. `schemaVersion` 是必填字段。
4. 无版本存档视为 v0。
5. 主分支当前 migration 后结构视为 v1。
6. 当前分支最终发布结构视为 v2。
7. 主分支已有 migration 行为应重构进 `v0 -> v1`。
8. 当前分支 migration 改动应重构进 `v1 -> v2`。
9. 对外只需要发布级版本，不需要记录开发过程内部版本。
10. 每个版本 migration 内部可以拆多个小 helper，并用测试覆盖。
11. 当前分支中间态无版本存档不进入兼容范围。
12. 发布后不再重写已发布 migration，只追加新版本。
13. 重构 migration 的目标是改组织方式，不改变现有迁移语义。
14. target sync automation 是 v2 的一部分。
15. 高版本存档在 v2 阶段直接报错并禁止导入/加载。
16. `schemaVersion` 当前不需要在 UI 或导出 metadata 中展示。
17. 导入 validate 不再修改数据，原 `cleanAndNormalizeData()` 应移除或降级为 migration 内部 normalize helper。
18. `MigrationOptions` 短期保留，后续可用于 warning / strict 行为。
19. HTML 和 JSON 文件导入已经共用核心处理函数，后续应只改这条共用文件导入链。
20. 内部存储加载和复制角色不需要 import validate，但必须依赖版本化 migration。
21. 旧 `lib/storage.ts` API 优先删除或废弃，不作为未来主路径维护。
22. 版本化 migration 改造必须测试先行、分步骤落地，避免一次性大重构。

## 待讨论问题

1. 原 `cleanAndNormalizeData()` 中哪些清理行为必须迁入 `normalizeCurrentSheetData()`？
2. `MigrationOptions` 未来需要支持哪些 warning / strict 参数？
3. 旧 `lib/storage.ts` API 是否还有真实调用方？如果没有，应在版本化迁移中删除或明确废弃。
