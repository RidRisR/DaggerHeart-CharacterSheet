# V1 To V2 Migration Boundary Design

日期：2026-05-11

## 目的

本文定义 modifier 分支上的 v1 -> v2 migration 边界重构。

这一步只整理版本边界，不引入新的业务行为。目标是把当前 modifier 分支已经实现、但还挂在 current normalize 阶段的结构迁移，移动到明确的 `migrateV1ToV2()` 中。

## 背景

main 分支已经引入存档 schema version：

```text
无 schemaVersion = v0
main 当前已发布结构 = v1
```

modifier 分支 rebase 到 main 之后，现状是：

- `CURRENT_SCHEMA_VERSION` 仍是 `1`。
- `migrateV0ToV1()` 已存在。
- `normalizeCurrentSheetData()` 仍承载了 modifier 分支新增迁移：
  - equipment 数据迁移。
  - modifier state 迁移。
  - legacy equipment 字段清理。
  - modifier state reconcile。

这个状态是 rebase 后的安全中间态。它保证现有行为和测试先通过，但版本边界并不清晰。

## 目标

本次重构完成后：

```text
CURRENT_SCHEMA_VERSION = 2
```

版本链为：

```text
v0 -> v1 -> v2
```

其中：

- `v0 -> v1`：main 已发布 migration 行为。
- `v1 -> v2`：modifier 分支已实现但尚未发布的结构迁移。

## 非目标

本次不实现：

- target sync automation。
- legacy base inference。
- target auto base 泛化。
- upgrade selection 简化。
- 新 UI 或新的用户可见行为。

这些可以在 v2 发布前继续追加到 `migrateV1ToV2()`，但不和本次边界重构混在一起。

## Migration Pipeline

目标入口：

```text
raw input
-> detect schemaVersion
-> if v0: migrateV0ToV1()
-> if v1: migrateV1ToV2()
-> normalizeCurrentSheetData()
-> return current schema data
```

高版本存档继续直接报错：

```text
schemaVersion > CURRENT_SCHEMA_VERSION -> throw
```

无版本、非法版本或非整数版本继续视为 v0。

## migrateV0ToV1

`migrateV0ToV1()` 必须只保留 main 已发布 migration 行为：

- page visibility 迁移。
- inventory cards 补齐。
- attribute spellcasting 补齐。
- page visibility 字段重命名。
- page visibility 字段补齐。
- armor template 补齐。
- adventure notes 补齐。
- hope boolean array 到 number。
- notebook 补齐。
- deprecated fields cleanup。

它必须显式写入：

```ts
schemaVersion: 1
```

不能写 `CURRENT_SCHEMA_VERSION`。否则未来 `CURRENT_SCHEMA_VERSION` 增加时，`v0 -> v1` 的语义会漂移。

## migrateV1ToV2

`migrateV1ToV2()` 承载当前 modifier 分支新增结构迁移。

本次纳入：

- legacy weapon / armor 顶层字段迁移到 `equipment`。
- existing `equipment` normalization。
- legacy equipment 顶层字段删除。
- legacy modifier state `byTarget` 迁移到 `targetStates` / `entryStates`。
- legacy `armorValue` target 迁移到 `armorMax`。
- `userModifierContributions` sanitize / normalize。
- `automationSelections` 缺失或畸形时补为空对象。
- modifier state reconcile，清理孤儿 entry state / target state。

它必须显式写入：

```ts
schemaVersion: 2
```

## normalizeCurrentSheetData

`normalizeCurrentSheetData()` 保留为 current schema 默认值补齐和安全兜底。

它可以做：

- merge `defaultSheetData`。
- 写入 `schemaVersion: CURRENT_SCHEMA_VERSION`。
- cards / inventory_cards 过滤无效 card。
- 当前 schema 缺失字段补默认值。
- 当前 schema 数据 shape 的轻量兜底。

它不应继续承担旧结构迁移的主职责。

特别是以下行为应从 normalize 主流程移出，放入 `migrateV1ToV2()`：

- 从 legacy equipment 顶层字段构造 `equipment`。
- 删除 legacy equipment 顶层字段。
- 从 legacy modifier state `byTarget` 构造新 state。
- legacy `armorValue` target 改名。

## 幂等性

迁移必须满足：

```text
migrate(v0) = v2
migrate(migrate(v0)) = v2
migrate(v1) = v2
migrate(migrate(v1)) = v2
migrate(v2) = v2
```

v2 数据重复迁移不应重新解释已迁移结构，也不应重新从不存在的 legacy 字段推断数据。

## 测试策略

先补测试，再改实现。

需要覆盖：

1. `CURRENT_SCHEMA_VERSION` 和 `defaultSheetData.schemaVersion` 为 `2`。
2. v0 存档最终迁移到 v2。
3. v1 存档迁移到 v2。
4. v2 存档重复迁移保持稳定。
5. 高版本 v3 报错。
6. v0 -> v1 行为仍包含 main 已发布 migration 语义，例如 hope、page visibility、notebook。
7. v1 -> v2 行为包含 equipment 迁移和 legacy equipment 字段清理。
8. v1 -> v2 行为包含 legacy modifier state 迁移。
9. storage load / duplicate / legacy storage migration 最终写入 v2。
10. JSON / HTML import 最终返回 v2。
11. 现有 equipment migration 测试保持语义不变。
12. 现有 modifier migration 测试保持语义不变。

测试重点不是证明新增业务能力，而是锁定“组织方式改变后输出不回归”。

## 落地顺序

建议按以下顺序实现：

1. 更新 migration versioning 测试，把当前版本预期从 v1 改为 v2，并增加 v1 -> v2 fixture。
2. 更新 equipment / modifier / storage / import 测试中的 schema version 预期。
3. 将 `CURRENT_SCHEMA_VERSION` 改为 `2`。
4. 让 `migrateV0ToV1()` 显式写入 `schemaVersion: 1`。
5. 新增 `migrateV1ToV2()`。
6. 从 `normalizeCurrentSheetData()` 移出结构性 migration。
7. 调整 `migrateSheetData()` 按版本链执行。
8. 跑完整单元测试。

## 当前共识

- 本次只做版本边界重构。
- 目标是改组织方式，不改现有迁移结果。
- 当前 modifier 分支已有的 equipment / modifier 迁移归入 `v1 -> v2`。
- 后续 target sync automation 和 legacy base inference 可以继续追加到 v2，但必须作为单独设计和计划执行。
