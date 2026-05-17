# Final Input Automation Reconciliation Design

日期：2026-05-17

## 目的

本文记录关于“用户直接修改最终值时，系统应如何解释这次修改”的设计共识。

这个议题替代了更窄的“target auto base 泛化”讨论。新的核心问题不是某些字段是否自动创建 base，而是：

```text
final input 是否只是手填最终值，还是也是 modifier 来源系统的快捷入口。
```

## 背景

当前 modifier 架构已经形成三层模型：

```text
provider entries
-> reference total = active base + enabled modifiers
-> final value field
```

此前 UI 暴露了“同步”和“持续同步”概念。但从用户体验上看，这两个概念偏实现细节：

- 用户不一定知道何时应该点“同步”。
- “持续同步”被用户手动编辑 final value 静默关闭，会很隐式。
- 用户可能忘记自己什么时候关闭了同步。

因此新的方向是：不要把“一次同步 / 持续同步”作为用户主要心智模型。用户只需要理解：

```text
自动计算关闭：这个字段就是手填最终值。
自动计算开启：这个字段由来源系统解释和计算。
```

内部仍然可以保留 `syncMode: "manual" | "continuous"`，但 UI 应表达为“自动计算：关闭 / 开启”。

## 核心用户模型

### 自动计算关闭

当某个 target 的自动计算关闭时：

- 用户编辑 final input，就是直接编辑最终值。
- 系统不整理来源。
- 系统不创建 base 或 modifier。
- provider / modifier entries 仍可在 popover 中作为参考展示。
- source 变化不会自动覆盖 final value。

这适合只想快速填表、不想使用自动计算的用户。

### 自动计算开启

当某个 target 的自动计算开启时：

- 开启瞬间应立刻把 final value 同步为当前 reference total。
- source 变化会持续同步到 final value。
- 用户直接编辑 final input，不再被视为 override。
- 用户输入会被整理回 modifier 来源系统。

用户不需要理解“一次同步”。开启自动计算时的一次同步只是内部行为。

## Base 与 Modifier 的保留理由

数学上，base 也可以被看成一个加值。例如：

```text
final = 12 + 2 - 1
```

但产品语义上仍需要区分：

```ts
kind: "base" | "modifier"
```

原因：

1. **base 是互斥的主来源**

   同一个 target 通常只能有一个 active base。例如职业闪避 12 和用户手动基础闪避 13 不应该相加成 25，而应该选择其中一个作为基础。

2. **base 是计算锚点**

   没有 active base 时，系统无法判断 reference total 是否完整。只有 modifier 而没有 base 的 target，不应被当作完整可同步结果。

3. **base 支持来源切换**

   未来同一个 target 可能有多个 base 候选：职业基础值、手动基础值、特殊规则基础值。用户需要能选择 active base。

4. **UI 解释更清楚**

   “基础值 12，修正 +2”比“加值 12，加值 +2”更符合角色卡心智。

因此本文使用：

```text
base = 互斥的主来源
modifier = 可叠加的修正来源
```

## Final Input Reconciliation

自动计算开启时，用户提交 final input 后，系统执行一次 reconciliation。

### 没有任何 base

如果 target 没有任何 base，且用户输入可解析为数字，则创建或更新专用 base：

```text
手动基础值
```

建议 id：

```ts
user:${target}:manual-base
```

语义：

- `kind = "base"`
- label 固定为 `手动基础值`
- value 保存解析后的数值
- 如果当前没有 active base，则设为 active base
- 这是 final input 专用维护项，不是普通用户自定义 base

### 已经有 base

如果 target 已经有 active base 或其它可用 base，用户输入 final value 时，不修改 base，而是创建或更新专用 modifier：

```text
手动修改
```

建议 id：

```ts
user:${target}:manual-adjustment
```

语义：

- `kind = "modifier"`
- label 固定为 `手动修改`
- value 表示“用户输入 final value”与“排除手动修改后的 reference total”之间的差额
- 每个 target 最多一个 `手动修改`
- 再次编辑 final input 时更新同一个 entry，不重复创建

示例：

```text
职业 base = 12
武器 modifier = -1
排除手动修改后的 reference = 11
用户输入 final = 14
=> 手动修改 = +3
```

之后用户再输入 15：

```text
排除手动修改后的 reference = 11
=> 手动修改 更新为 +4
```

不能按“当前 final 与新输入差值”叠加，否则会产生重复加值。

### 输入等于原始 reference

如果用户输入值等于“排除手动修改后的 reference total”，则删除或清空 `手动修改`。

示例：

```text
base 12 + 手动修改 2 = 14
用户输入 12
=> 删除 手动修改
=> final = 12
```

## 专用项的编辑规则

`手动基础值` 和 `手动修改` 都是 final input reconciliation 的专用项。

它们不是普通自定义来源。

规则：

- 系统识别靠稳定 id，不靠 label。
- label 固定：
  - `手动基础值`
  - `手动修改`
- value 可以被用户在 popover 中修改。
- 用户可以禁用或删除这些项。
- 用户不能把这些项改名成其它语义。
- 如果用户需要“祝福 +2”“临时状态 -1”等具名来源，应使用已有的普通自定义 modifier 创建入口。

选择这个约束的原因：

- 避免用户把 `手动修改` 改名成具体语义后，系统后续又自动改它的 value。
- 避免为了 label 归属引入 `managedBy` 等新持久化结构。
- 保持当前数据模型简单。

## 清空 Final Input 的语义

清空 final input 必须指用户提交编辑后，例如 blur / Enter，而不是编辑过程中的临时空值。

自动计算开启时：

```text
清空 final input = 清空 final input 产生的手动修改项
```

具体规则：

1. 如果存在 `手动修改`，清空 final 后删除 `手动修改`。
2. 不删除任何 base。
3. 不禁用任何系统 base。
4. 不把空值解释成 `0`。
5. 删除 `手动修改` 后，final value 重新同步为当前 reference total。

示例：

```text
base 12 + 手动修改 2 = 14
用户清空 final 并 blur
=> 删除 手动修改
=> final 回到 12
```

如果当前只有 `手动基础值`：

```text
手动基础值 12
用户清空 final 并 blur
=> 保留 手动基础值
=> final 同步回 12
```

原因是 base 是 target 的锚点。尤其六大属性、经历这类 target，清空 final input 不应隐式删除基础值。用户如果真的想删除 base，应在 popover 中删除 `手动基础值`。

如果用户想表达数值为 0，应输入 `0`，而不是清空。

## 开启自动计算的行为

用户从关闭自动计算切换到开启自动计算时：

1. 如果 reference total 可计算，立刻同步 final value。
2. 如果没有 base：
   - final value 若为空，保持为空。
   - 后续用户输入数值时创建 `手动基础值`。
3. 开启后不因为用户编辑 final value 而自动关闭。

这个行为可以继续用内部的 continuous sync 实现，但 UI 不暴露“一次同步 / 持续同步”概念。

## 与旧设计的关系

### Target Auto Base Generalization

旧文档 `2026-05-09-target-auto-base-generalization-design.md` 讨论的是：

```text
没有 base 时，用户首次输入是否自动创建 base。
```

本文将它纳入更大的 final input reconciliation 模型：

```text
没有 base => 手动基础值
已有 base => 手动修改
```

### Target Sync Automation

旧文档 `2026-05-10-target-sync-automation-design.md` 暴露了“同步”和“持续同步”按钮。

本文建议调整用户心智：

```text
自动计算关闭 / 开启
```

内部仍可保留：

```ts
syncMode: "manual" | "continuous"
```

但 UI 应弱化或移除“一次同步”按钮，把一次同步作为开启自动计算时的内部动作。

## 当前已达成共识

1. 用户直接编辑 final value 是合理行为，不应简单视为错误或 override。
2. UI 不应主要暴露“一次同步 / 持续同步”概念。
3. 用户侧只需要理解“自动计算关闭 / 开启”。
4. 自动计算关闭时，final input 只写最终值。
5. 自动计算开启时，final input 必须接入来源系统。
6. 自动计算开启时，如果没有 base，用户输入创建或更新 `手动基础值`。
7. 自动计算开启时，如果已有 base，用户输入创建或更新 `手动修改`。
8. `手动修改` 每个 target 最多一个，重复编辑更新同一项。
9. 计算 `手动修改` 时必须排除旧的 `手动修改` 自身。
10. `手动基础值` 和 `手动修改` 的 label 固定，value 可改。
11. 用户需要具名来源时，应创建普通自定义 modifier。
12. 清空 final input 只删除 `手动修改`，不删除 base。
13. 清空不等于输入 0。
14. 开启自动计算时立刻同步一次。

## 待讨论问题

1. UI 文案使用“自动计算”还是“自动化”。
2. 现有“同步”按钮是否完全移除，还是保留为高级/调试操作。
3. 哪些 target 第一阶段接入 final input reconciliation。
4. `proficiency` 这种非文本输入是否要支持 final input reconciliation，还是只通过已有格子交互。
5. `hpMax` / `stressMax` 清空后 fallback 是否仍保持 6，还是在 final input reconciliation 层特殊处理。
6. `手动基础值` / `手动修改` 在 popover 中如何视觉区分普通用户来源。
