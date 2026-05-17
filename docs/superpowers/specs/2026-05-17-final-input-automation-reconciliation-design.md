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
-> reference total = active base + modifiers
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

内部状态也应表达为“自动计算是否开启”。一次性同步只是开启自动计算或执行内部 reconciliation 时的动作，不应成为持久化 mode。

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

- 开启瞬间应先接管当前 final value，而不是直接用 reference total 覆盖。
- 如果当前 final value 与来源系统计算值不同，差额会进入专用来源项。
- source 变化会持续同步到 final value。
- 用户直接编辑 final input，不再被视为 override。
- 用户输入会被整理回 modifier 来源系统。

用户不需要理解“一次同步”。开启自动计算时的同步只是内部接管行为：目标是让来源系统解释当前 final value，并尽量保持用户已有 final value 不变。

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

如果 target 没有任何 base，且用户输入可解析为数字，则创建或更新交互输入产生的专用 base：

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

这个规则只描述用户交互输入。它的语义是：当 target 还没有基础锚点时，用户输入的数值就是在提供一个手动基础值。系统不应假设用户理解当前所有 modifier，也不应在交互场景中把这个输入优先解释成反推后的估算结果。

老存档迁移是另一种场景，见“老存档迁移的含义”。

### 已经有 base

如果 target 已经有 active base 或其它可用 base，用户输入 final value 时，不修改 base，而是创建或更新专用 modifier：

```text
未归因差额
```

建议 id：

```ts
user:${target}:unattributed-delta
```

语义：

- `kind = "modifier"`
- label 固定为 `未归因差额`
- value 表示“用户输入 final value”与“排除未归因差额后的 reference total”之间的差额
- 每个 target 最多一个 `未归因差额`
- 再次编辑 final input 时更新同一个 entry，不重复创建

示例：

```text
职业 base = 12
武器 modifier = -1
排除未归因差额后的 reference = 11
用户输入 final = 14
=> 未归因差额 = +3
```

之后用户再输入 15：

```text
排除未归因差额后的 reference = 11
=> 未归因差额 更新为 +4
```

不能按“当前 final 与新输入差值”叠加，否则会产生重复加值。

### 输入等于原始 reference

如果用户输入值等于“排除未归因差额后的 reference total”，则删除或清空 `未归因差额`。

示例：

```text
base 12 + 未归因差额 2 = 14
用户输入 12
=> 删除 未归因差额
=> final = 12
```

## 未归因差额的两种形态

现有系统已经会在 modifier popover 底部展示只读的 `未归因差额`。这个功能应保留，但它的语义需要和自动计算状态绑定：

### 自动计算关闭时：只读提示

当自动计算关闭时，`未归因差额` 只是 diagnostic：

```text
未归因差额 = final value - reference total
```

它提醒用户：当前 final value 与来源系统可解释的 reference total 不一致。系统不会自动处理这个差额，也不会创建来源项。

示例：

```text
final = 15
reference total = 13
popover 底部显示：未归因差额 +2
```

### 自动计算开启时：实体加值项

当用户开启自动计算，或在自动计算开启后提交 final input，系统应把未归因差额物化为专用 modifier：

```text
未归因差额 +2
```

此时它出现在“加值”列表中，参与 reference total 计算。因为差额已经被归因，底部只读提示应消失。

示例：

```text
自动计算关闭：
final 15, reference 13
=> 底部提示：未归因差额 +2

用户开启自动计算：
=> 创建 modifier：未归因差额 +2
=> reference total 变成 15
=> final 保持 15
=> 底部提示消失
```

如果自动计算开启后仍出现底部只读的 `未归因差额`，通常表示 reconciliation 没有完成，或当前状态无法被完整解释。

## 来源所有权

`未归因差额` 进入加值区后，仍不应被视为普通系统加值或普通用户加值。它是第三类来源：

```text
target-owned special modifier
```

因此加值区需要区分三种 ownership：

### Provider-owned 系统加值

来源是职业、武器、护甲、升级选项等 provider。

规则：

- 用户不能直接删除。
- 用户不能在 modifier popover 中临时禁用。
- 要让它消失，应回到 provider 侧修改选择，例如取消升级、换装备。
- 如果某个系统来源未来需要条件性开关，应由 provider 自己建模，而不是通过通用 entry 禁用能力表达。

### User-owned 普通加值

来源是用户通过自定义入口创建的普通 modifier。

规则：

- 用户可以修改 label。
- 用户可以修改 value。
- 用户可以删除。

### Target-owned 未归因差额

来源是 target final reconciliation。

规则：

- 用户不能修改 label。
- 用户可以修改 value。
- 用户可以删除。
- 删除含义是：用户接受移除这段无法归因到具体来源的额外差额。

`未归因差额` 可以删除，是因为它没有外部 provider 依赖。它不是“升级 +1”这类必须由 provider 生命周期控制的系统加值。

系统必须靠稳定身份识别 target-owned `未归因差额`，不能靠 label。用户可以创建一个普通自定义加值，也叫 `未归因差额`，但它仍然只是 user-owned 普通加值：

```text
普通用户加值 label = 未归因差额
=> 可改 label / value / 删除

target-owned 未归因差额
=> label 固定 / value 可改 / 可删除
```

建议身份形态：

```ts
id: `target:${target}:unattributed-delta`
source.type: "target-reconciliation"
kind: "modifier"
```

具体实现也可以用其它字段表达，但语义必须保留：identity 不依赖显示 label。

## 存储策略

为了保持当前数据模型简单，第一阶段不新增第三个持久化列表。

概念上：

- `手动基础值` 是 target-owned special base。
- `估算基础值` 是 target-owned special base。
- `未归因差额` 是 target-owned special modifier。

存储上，它们可以继续复用现有 `userModifierContributions` 容器，并用稳定 id 约定区分：

```ts
user:${target}:manual-base
user:${target}:estimated-base
user:${target}:unattributed-delta
```

因此读取方不能仅凭“存在 `userModifierContributions` 里”就判断它是普通用户来源。必须同时识别 special id，或等价的 special source metadata。

普通用户创建同名 label 不会冲突，因为 identity 不依赖 label。

## 专用项的编辑规则

`手动基础值`、`估算基础值` 和 `未归因差额` 都是 final input reconciliation 的专用项。

它们不是普通自定义来源。

规则：

- 系统识别靠稳定 id，不靠 label。
- label 固定：
  - `手动基础值`
  - `估算基础值`
  - `未归因差额`
- value 可以被用户在 popover 中修改。
- 用户可以删除这些项。
- 用户不能把这些项改名成其它语义。
- 如果用户需要“祝福 +2”“临时状态 -1”等具名来源，应使用已有的普通自定义 modifier 创建入口。

`未归因差额` 的用户操作语义：

- 修改 value：表示用户调整这段尚未归因到具体来源的差额。自动计算应使用新 value 重新计算 final value。
- 删除：表示用户接受移除这段额外差额。删除后 final value 回到当前 base + 其它 modifiers 的结果。
- 修改 label：不允许。系统需要用稳定 id 继续识别这个专用项；具名语义应通过普通自定义 modifier 表达。

选择这个约束的原因：

- 避免用户把 `未归因差额` 改名成具体语义后，系统后续又自动改它的 value。
- 避免为了 label 归属引入 `managedBy` 等新持久化结构。
- 保持当前数据模型简单。

## Entry 禁用能力

新设计不再把 entry 级别的启用 / 禁用作为用户能力。

原因：

- 系统来源如果不应生效，应该回到 provider 侧修改选择。
- 用户来源如果不需要，用户可以直接删除。
- `未归因差额` 如果不需要，用户也可以直接删除。
- 保留“有些项能关、有些项能删、有些项又能关又能删”的 UI 会制造额外心智负担。

因此 modifier popover 中：

- provider-owned 系统来源：只读展示，不提供删除或禁用按钮。
- user-owned 普通来源：提供删除按钮。
- target-owned special 来源：提供删除按钮。

实现上可以暂时继续尊重旧存档里的 `entryStates[entryId].enabled === false`，避免历史数据回归。但新的 UI 和新的业务流程不再创建或依赖 disabled entry state。

## 清空 Final Input 的语义

清空 final input 必须指用户提交编辑后，例如 blur / Enter，而不是编辑过程中的临时空值。

自动计算开启时：

```text
清空 final input = 清空 final input 产生的未归因差额
```

具体规则：

1. 如果存在 `未归因差额`，清空 final 后删除 `未归因差额`。
2. 不删除任何 base。
3. 不修改任何系统 base。
4. 不把空值解释成 `0`。
5. 删除 `未归因差额` 后，final value 重新同步为当前 reference total。

示例：

```text
base 12 + 未归因差额 2 = 14
用户清空 final 并 blur
=> 删除 未归因差额
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

1. 如果 final value 为空：
   - 不创建 `未归因差额`。
   - 如果 reference total 可计算，final value 可以同步为 reference total。
   - 如果没有 base，final value 保持为空，等待后续用户输入或来源变化。
2. 如果 final value 有数字，且 reference total 可计算：
   - 不直接覆盖 final value。
   - 创建或更新 `未归因差额`，使 reference total 追平当前 final value。
3. 如果 final value 有数字，但没有 base：
   - 创建或更新 `手动基础值`。
   - 交互场景中，`手动基础值` 的 value 使用用户提交的数值。
   - 不在这里把用户输入反推成 `final value - modifiers total`；用户输入的语义是提供基础锚点。
4. 如果 final value 无法解析为数字：
   - 可以开启自动计算，但不做初始接管。
   - 后续用户提交可解析数字，或来源系统变得可计算后，再执行 reconciliation。
5. 开启后不因为用户编辑 final value 而自动关闭。

这个行为的目标是：开启自动计算时优先保留用户已有 final value，并把无法解释的差额整理进来源系统。

## 老存档迁移的含义

老存档通常只有 final value，缺少完整的来源解释。因此迁移或首次开启自动计算时，final value 很可能与新 reference total 对不上。

迁移不应默认覆盖老存档的 final value。更合理的目标是：

```text
保留老存档 final value，同时尽量把差额解释进新系统。
```

这意味着：

- 有 base 且 final 与 reference 不一致时，差额应进入 `未归因差额`。
- 没有 base 但 final 有数字时，应创建或更新 `估算基础值`。
- 如果迁移时已有 modifiers，`估算基础值 = legacy final value - modifiers total`，目标是保留老存档 final value 不变。
- 没有 final 或 final 不可解析时，不强行创建来源项。
- 迁移后的 target 默认开启自动计算，因为旧自动化已经统一接入自动计算系统。

这样老存档打开后，不会因为自动化系统接管而突然改变角色卡上的最终数值。

## 与旧设计的关系

### Target Auto Base Generalization

旧文档 `2026-05-09-target-auto-base-generalization-design.md` 讨论的是：

```text
没有 base 时，用户首次输入是否自动创建 base。
```

本文将它纳入更大的 final input reconciliation 模型：

```text
没有 base + 用户交互输入 => 手动基础值
没有 base + 老存档迁移反推 => 估算基础值
已有 base => 未归因差额
```

### Target Sync Automation

旧文档 `2026-05-10-target-sync-automation-design.md` 暴露了“同步”和“持续同步”按钮。

本文建议调整用户心智：

```text
自动计算关闭 / 开启
```

内部状态也应使用自动计算语义。一次同步是内部动作，不应作为用户需要理解的独立模式。

## 当前已达成共识

1. 用户直接编辑 final value 是合理行为，不应简单视为错误或 override。
2. UI 不应主要暴露“一次同步 / 持续同步”概念。
3. 用户侧只需要理解“自动计算关闭 / 开启”。
4. 自动计算关闭时，final input 只写最终值。
5. 自动计算开启时，final input 必须接入来源系统。
6. 自动计算开启时，如果没有 base，用户输入创建或更新 `手动基础值`。
7. 自动计算开启时，如果已有 base，用户输入创建或更新 `未归因差额`。
8. `未归因差额` 每个 target 最多一个，重复编辑更新同一项。
9. 计算 `未归因差额` 时必须排除旧的 `未归因差额` 自身。
10. `手动基础值`、`估算基础值` 和 `未归因差额` 的 label 固定，value 可改。
11. 用户需要具名来源时，应创建普通自定义 modifier。
12. 清空 final input 只删除 `未归因差额`，不删除 base。
13. 清空不等于输入 0。
14. 开启自动计算时优先保留当前 final value，把差额整理进来源系统，而不是直接覆盖 final。
15. 自动计算关闭时，底部 `未归因差额` 是只读提示。
16. 自动计算开启后，`未归因差额` 应成为加值列表中的实体 modifier。
17. 实体 `未归因差额` 可以由用户修改 value 或删除，但不能改 label。
18. `未归因差额` 是 target-owned special modifier，不是 provider-owned 系统加值，也不是 user-owned 普通加值。
19. 系统识别 `未归因差额` 必须依赖稳定 id / source type，不能依赖 label；用户创建同名普通加值不会冲突。
20. 新 UI 不提供 entry 级启用 / 禁用能力；旧 `entryStates.enabled` 只作为兼容状态保留。
21. special contribution 概念上是 target-owned，但第一阶段可以复用 `userModifierContributions` 存储，通过稳定 id / metadata 区分普通用户来源。
22. 用户交互输入在没有 base 时创建 `手动基础值`；老存档迁移在没有 base 时创建 `估算基础值`。
23. 老存档迁移应默认开启自动计算，并通过 `未归因差额` / `估算基础值` 保留旧 final value。
24. final value 不可解析为数字时，不接管、不清空、不创建来源项。

## 已定稿的 UI 决策

1. UI 文案使用 `开启自动计算` / `关闭自动计算`。
2. 移除普通 UI 中的 `同步` 按钮。一次同步只是开启自动计算或内部 reconciliation 的动作。
3. 第一阶段所有 target 都接入 final input reconciliation。
4. 非文本输入也接入同一模型。点击格子提交新 final value 时，等价于提交 final input。
5. `hpMax` / `stressMax` 的默认值 6 保持现有行为，不在本设计中修改。
6. `手动基础值` / `估算基础值` / `未归因差额` 在 popover 中可以用轻量标记区分，例如 `自动计算` 或 `系统保留`；不需要第一阶段引入复杂说明。
7. 系统来源不显示操作按钮；用户来源和 target-owned special 来源在同一位置显示删除按钮。
