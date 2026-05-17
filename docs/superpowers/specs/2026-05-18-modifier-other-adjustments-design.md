# Modifier Other Adjustments Design

日期：2026-05-18

状态：已定稿

## 目的

本文记录 modifier 系统中“其他”项的设计决策。

本文只覆盖原议题一：收窄 `未归因差额` 的语义，并把迁移、用户手动修改、自动计算关闭期间产生的差额拆成清晰的概念。

本文不是实现计划。

## 背景

当前实现把多种差额都物化为 `user:${target}:unattributed-delta`，并存入 `userModifierContributions`。这导致三个问题：

1. 迁移差额、用户手动修改终值、自动计算关闭期间的差额被混为一谈。
2. 这些差额会出现在“修正值”列表里，看起来像普通已知来源。
3. 迁移差额可能和之后出现的 provider 来源双写，例如旧武器 `闪避 +1` 迁移成 `未归因差额 +1` 后，再换上新武器 `闪避 +1` 会叠加成 `+2`。

新的设计目标是：

```text
没有作为兜底概念的“未归因差额”。
所有持久化差额都必须有明确原因。
```

## 核心模型

target popover 中的来源列表分成三栏：

```text
基础值
修正值
其他
```

其中：

- `基础值`：已知 base 来源。
- `修正值`：已知 modifier 来源。
- `其他`：影响最终值，但不属于已知基础值或已知修正来源的调整。

总计不是一个栏目。总计仍由标题栏或摘要区域表达。

计算关系：

```text
reference total = active base + known modifiers
final value = reference total + other adjustments
```

## 其他项类型

第一阶段 `其他` 包含三类。

### 未知迁移差额

迁移旧存档时，为了保留旧 `final value` 产生。

系统知道它来自迁移，但不知道旧规则来源。它可能原本来自旧武器、升级、用户手填或其它旧自动化行为。

展示：

```text
badge: 迁移
label: 未知迁移差额
```

行为：

- 保存。
- 可编辑数值。
- 可删除。

### 手动修改终值

用户明确提交 final input 后产生。

它不表示普通规则修正，而表示用户直接改变了最终值。

展示：

```text
badge: 用户
label: 手动修改终值
```

行为：

- 保存。
- 可编辑数值。
- 可删除。

### 未归因差额

`未归因差额` 只表示自动计算关闭期间的动态差额：

```text
final value - reference total - 已保存 other adjustments
```

它解释的是：自动计算关闭时，final value 被锁住，而已知来源发生变化后产生的差距。

展示：

```text
badge: 同步
label: 未归因差额
```

行为：

- 自动计算关闭期间：运行时派生，不保存，实时变化，不可编辑、不可删除、不可归零。
- 自动计算开启时：如果当前派生的 `未归因差额` 非 0，必须物化并保存为“其他”项。
- 保存后：固定为当时的值，不再跟随 source/reference 变化，可删除。
- 再次关闭自动计算时：删除已保存的 `未归因差额`，回到运行时派生模式。

## 自动计算语义

自动计算开关只控制系统是否写回 final value。

### 自动计算开启

- provider / reference / 其他实时更新。
- final value 按公式写回。
- 删除任何“其他”项都会立刻按剩余 reference 和剩余“其他”项重算 final value。

### 自动计算关闭

- provider / reference / 其他仍实时更新。
- final value 不被系统写回。
- `未归因差额` 运行时派生，用于解释 locked final value 与当前计算值之间的差距。
- 删除可编辑“其他”项不会写回 final value；剩余差额由运行时派生的 `未归因差额` 接住。

## 存储

新增与 `userModifierContributions` 同级的专用结构保存“其他”项。

`userModifierContributions` 继续表示用户创建的已知来源；“其他”不再混入“基础值 / 修正值”来源列表。

建议数据形状：

```ts
type OtherAdjustmentKind =
  | "unknownMigrationDifference"
  | "manualFinalAdjustment"
  | "unattributedDifference"

interface OtherAdjustment {
  id: string
  target: ModifierTargetId
  kind: OtherAdjustmentKind
  value: number
}
```

建议稳定 id：

```text
other:${target}:unknown-migration-difference
other:${target}:manual-final-adjustment
other:${target}:unattributed-difference
```

每个 target 下，每一类已保存“其他”最多一条。

三类“其他”可以在同一个 target 同时存在。

## 空值、不可解析值、无 Reference

### Final 为空

不创建任何“其他”差额。

### Final 不可解析

如果 final value 不可解析为数字：

- 原样保留。
- 不创建“其他”差额。
- 不自动覆盖。
- 直到用户提交可解析数字。

不可解析 final 后续被用户改成可解析数字时，产生的差额归类为 `手动修改终值`。

### 无 Reference Total

当 target 没有可计算 reference total 时，不创建“其他”差额。

仍使用既有 base 语义：

- 用户输入数值：创建 `手动基础值`。
- 迁移数值：创建 `估算基础值`。

## 迁移规则

迁移必须优先保留旧存档 final value。

如果迁移时有可计算 reference total，且 legacy final 可解析为数字：

```text
未知迁移差额 = legacy final - reference total - 其它已保存 other adjustments
```

如果差额为 0，不创建 `未知迁移差额`。

如果迁移时没有 reference total，仍创建 `估算基础值`，不创建“其他”差额。

迁移时：

- 压力初始值按 6 处理。
- 经历初始值按 2 处理。
- 超出的部分直接进入 `未知迁移差额`，不再反推这些默认初始值。

当前 modifier 分支未发布，因此不需要为分支中间态的 `user:${target}:unattributed-delta` 做复杂兼容。实现只需保证从已发布 main 存档迁移到新模型。

## UI 行为

`其他` 栏与 `基础值`、`修正值` 并列。

行展示：

```text
迁移  未知迁移差额      +N
用户  手动修改终值      +N
同步  未归因差额        +N
```

操作能力：

- `未知迁移差额`：可编辑，可删除。
- `手动修改终值`：可编辑，可删除。
- `未归因差额`：
  - 自动计算关闭期间：不可编辑，不可删除。
  - 自动计算开启且已物化后：不可编辑，可删除。

## 非目标

本设计不处理：

- 升级项 provider 迁移策略。
- 装备/护甲旧存档是否自动套用 provider。
- 阈值双 target 的联合 UI。
- 实现计划和测试矩阵。
