# Target Auto Base Generalization Design

日期：2026-05-09

> **状态：已过时。** 本文讨论的 target auto base 泛化已经被 final input
> reconciliation 统一吸收。当前规则区分用户交互输入创建 `手动基础值`、
> 老存档迁移创建 `估算基础值`、已有 base 时创建 `未归因差额`。当前行为以
> `docs/superpowers/specs/2026-05-17-final-input-automation-reconciliation-design.md`
> 为准。

## 目的

本文记录一个待讨论的 modifier 细节改进点：把当前只存在于六大属性输入框上的“自动创建手动基础值”能力，泛化为所有合适 modifier target 的通用行为。

本文不是实现计划。当前结论是：方向合理，但需要先明确适用边界和触发规则。

## 背景

当前系统已经支持：

- provider 提供 base 或 modifier entries。
- target state 保存当前 active base。
- 用户可以在 modifier popover 中手动添加 base。
- 六大属性输入框有额外的 auto base 行为。

现有属性 auto base 的规则来自 `2026-05-03-attribute-auto-base-design.md`：

- 只对六大属性生效。
- 只在 1 级、字段起始为空、提交值可解析、且没有已有用户 base 时创建。
- 最终输入框保留用户输入原文。
- 创建一个用户 base，并在没有 active base 时设为 active base。

这个能力本质上并不是六大属性专属。它表达的是：

```text
当一个 target 没有已知基础值时，玩家在 1 级首次填写的数值可以被解释为手工基础值。
```

## 改进点

把“属性 auto base”泛化为“target auto base”。

更准确的范围不是“所有 DOM 输入框”，而是：

```text
所有绑定到 ModifierTargetId、且语义上代表最终数值的输入字段。
```

当前候选 target 包括：

- `evasion`
- `armorMax`
- `minorThreshold`
- `majorThreshold`
- `hpMax`
- `stressMax`
- `proficiency`
- 六大属性 target：
  - `agility.value`
  - `strength.value`
  - `finesse.value`
  - `instinct.value`
  - `presence.value`
  - `knowledge.value`
- `experienceValues.${index}` 是否纳入需要单独讨论。

非候选字段包括：

- 角色名、职业名、装备名。
- 武器特性、伤害骰、装备描述。
- 备注、背景、自由文本。
- 任何没有稳定 `ModifierTargetId` 的输入框。

## 核心判断

这个改进是合理的，原因是：

- 它符合 provider/target 架构：用户首次手填的基础值应当是 user provider 的 base contribution，而不是永远表现为未归因差额。
- 它减少创建 1 级角色时的操作成本。
- 它让“未知基础值”只在真的未知时出现，而不是因为用户没有打开 popover 手动补一条 base。
- 它避免六大属性拥有一套特殊规则，其它 target 却行为不一致。

同时，它不应该做成无差别输入框监听。否则会把普通文本输入、装备解释字段、临时编辑字段误识别为基础值来源。

## 建议触发规则

自动创建 base 必须全部满足：

1. 当前 target 是允许 auto base 的 `ModifierTargetId`。
2. 当前等级按现有数字解析逻辑判断为 1 级。
3. 编辑开始时，该 target 的最终值为空字符串或等价空值。
4. 提交时，用户输入可以被解析为数字或数字表达式。
5. 当前 target 没有任何已知 base。
6. 当前 target 没有已有用户 base。

第 5 条是相比现有属性实现最重要的变化。

现有属性实现只检查“有没有用户 base”。泛化后应该检查 registry summary 中是否存在任何 base。原因是：

- 职业可能已经提供 `evasion` / `hpMax` base。
- 装备可能已经提供 `armorMax` / threshold base。
- 等级可能已经提供 `proficiency` base。

如果已有系统 base，再自动创建 user base，会制造多 base 竞争，并且让用户的直接编辑行为变得不透明。

## 建议创建结果

创建的仍然是 `UserModifierContribution`：

```ts
{
  id: `user:${target}:auto-base`,
  definition: {
    target,
    kind: "base",
  },
  editable: {
    label: "手动基础值",
    value: parsedValue,
  },
}
```

如果当前 target 没有 active base，则设置：

```ts
modifierState.targetStates[target].activeBaseId = autoBaseId
```

最终值字段仍保存用户输入原文。例如用户输入 `12+1`，最终字段保留 `"12+1"`，auto base 的 `editable.value` 保存解析后的 `13`。

## 撤销规则

保留现有属性 auto base 的保守撤销思路：

当用户清空字段时，可以删除自动创建的 base，但必须全部满足：

1. 当前 target 支持 auto base。
2. 当前等级仍按 1 级处理。
3. 清空后的最终值为空。
4. 当前 target 存在 `id === user:${target}:auto-base` 的用户 base。
5. 该 auto base 是当前 target 唯一的用户 base。

如果 target 已经有其它用户 base，或者用户已经通过 popover 整理过来源，则不自动删除，避免误删用户有意保留的来源。

## 不应触发的场景

- 等级高于 1。
- 编辑开始前字段已经有值。
- 当前 target 已有任何 base entry。
- 当前 target 已有用户 base。
- 输入值无法解析为数字表达式。
- 字段不是 modifier target。
- 字段只是 provider 的解释文本，例如武器特性、护甲描述。

## 设计影响

### 代码边界

当前实现是属性专属 helper：

```ts
lib/modifiers/attribute-auto-base.ts
```

泛化后更合理的方向是新增或替换为 target 通用 helper，例如：

```ts
lib/modifiers/target-auto-base.ts
```

组件层只负责在 focus/commit 时提供：

- target
- 编辑开始前的 target 值
- 提交后的 target 值
- 当前等级
- 当前 target 的 reference summary 或 base 列表
- 当前 target 的用户 base 列表

helper 负责判断是否创建或删除 auto base。

### UI 边界

本改进不要求新增 UI。

用户仍然只是编辑原输入框。自动创建的 base 可以通过已有 modifier popover 查看和管理。

### 数据边界

这不需要新增持久化结构。自动 base 仍然是普通 `UserModifierContribution`，状态仍然使用：

- `modifierState.targetStates[target].activeBaseId`
- `modifierState.entryStates`

也不需要迁移旧存档。旧存档中已有最终值但没有 base 的情况，不应在加载时反推 base。

## 待讨论问题

1. `experienceValues.${index}` 是否应该纳入 auto base？
2. `proficiency` 是否应该纳入 auto base，还是保持等级 provider 永远提供 base？
3. `armorMax` / thresholds 在装备 provider 已经提供 base 时，用户直接编辑最终值是否应保持为未归因差额，而不是创建 user base？
4. 对已经有系统 base 的 target，是否要提供一个明确的“把当前最终值转为手动 base”的显式操作？
5. 这个机制应在每个 target 输入框逐步接入，还是一次性抽象后统一替换属性现有实现？

## 初步建议

建议保留这个改进点，并在后续统一讨论后再实现。

第一阶段可以只做架构性泛化，不改变复杂 target 的用户体验：

- 先把属性专属 helper 改造成 target 通用 helper。
- 先接入六大属性，保证行为不变。
- 再挑选没有系统 base 的简单 target 扩展。
- 对已有系统 base 的 target 暂时只显示未归因差额，不自动创建 base。

这样可以降低行为变化风险，同时把“auto base 是 target 通用能力”这个边界先建立起来。
