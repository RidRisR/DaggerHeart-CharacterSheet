# Target Sync Automation Design

日期：2026-05-10

## 目的

本文记录当前关于“自动化系统如何接入最新 modifier 价值系统”的设计共识。

本文不是实现计划。它用于整理已经达成的方向、关键规则、迁移策略和后续仍需讨论的问题。

## 背景

当前项目里存在两套语义：

1. 旧自动化：职业、升级、护甲、等级等逻辑直接写入最终值字段。
2. 新 modifier 系统：provider 提供 base / modifier entries，target panel 展示来源、active base、启用状态和未归因差额。

旧自动化的问题是每个功能各自决定如何改最终值：

- 职业选择直接写入起始闪避和生命上限。
- 升级选项直接对最终值做 `+1` 或 `-1`。
- 护甲选择直接写入护甲值和阈值。
- 等级变化直接改熟练度和伤害阈值。

新架构下，这些行为应收敛到统一模型：

```text
Provider owns source facts.
Registry resolves current entries.
Target consumes entries and owns sync behavior.
```

也就是说，自动化不应该继续散落在不同组件和 store action 中直接写最终值。自动化应先进入 provider / selection / entry 层，然后由 target 的同步策略决定是否写回最终值。

## 核心模型

每个 modifier target 都有三层：

```text
provider entries
-> reference total = active base + enabled modifiers
-> final value field
```

其中：

- provider entries 是来源事实。
- reference total 是当前系统可计算出的推荐值。
- final value field 仍然是角色卡当前显示和保存的最终值。

target panel 同时承担解释和控制：

- 展示当前 entries。
- 展示 active base。
- 展示 reference total。
- 展示 final value。
- 展示未归因差额。
- 提供同步动作。

## Target Sync State

`TargetModifierState` 建议新增同步模式：

```ts
interface TargetModifierState {
  activeBaseId?: ModifierEntryId
  syncMode?: "manual" | "continuous"
}
```

语义：

- `manual`：默认模式。系统只解释来源，不自动改最终值。
- `continuous`：持续同步模式。reference total 变化时，系统自动把最终值写成 reference total。

`syncMode` 属于 target state，而不是 entry state。原因是同步约束是 target 对最终值的消费行为，不是某个 provider entry 的属性。

## 同步动作

target panel 提供两个动作。

### 同步一次

一次性同步不是持久状态，只是一个按钮动作：

```text
把当前 reference total 写入 final value field 一次。
```

如果当前 target 没有 active base，reference total 不完整，则同步一次必须禁用。

### 持续同步

持续同步是持久 target state：

```text
targetStates[target].syncMode = "continuous"
```

开启后，只要 reference total 改变，最终值就应自动更新。

会影响 reference total 的变化包括：

- provider entry 新增或消失。
- modifier entry 启用或禁用。
- active base 切换。
- 装备变化。
- 升级 selection 变化。
- 等级变化。
- 用户添加、修改或删除 contribution。

持续同步必须使用：

```text
set final value = reference total
```

不能使用：

```text
final value += delta
```

原因是 delta 模型会在 provider 增删、取消升级、切换 base、重新加载和迁移时出现重复应用或漏回滚。

## 手动修改最终值

已经达成的共识：

```text
如果用户手动修改某个 target 的最终值，直接关闭该 target 的持续同步。
```

行为：

1. 保留用户输入的最终值。
2. 将 `targetStates[target].syncMode` 改为 `manual` 或删除该字段。
3. target panel 继续显示 reference total 和未归因差额。

这样可以避免用户刚手动改完最终值，下一次 provider 变化又被系统覆盖。

实现上必须区分写入来源：

- `user`：用户手动编辑最终值，应关闭 continuous sync。
- `sync`：系统同步写最终值，不应反过来关闭 continuous sync。

## 缺少基值时的 fallback

持续同步开启时，如果 target 没有 active base，reference total 不可计算。

已经达成的共识：

- 同步一次：禁用。
- 持续同步：可以保持开启，但最终值写入该 target 的 fallback 值。

fallback 规则：

| Target | 缺 base fallback |
|---|---|
| 六大属性 | `""` |
| `evasion` | `""` |
| `minorThreshold` | `""` |
| `majorThreshold` | `""` |
| `experienceValues.${index}` | `""` |
| `armorMax` | `""` |
| `hpMax` | 保持默认 `6` |
| `stressMax` | 保持默认 `6` |
| `proficiency` | 理论上不应缺 base |

如果原本有 base，后来 base 消失，持续同步 target 也应按上述 fallback 更新最终值。等新 base 出现后，再同步为新的 reference total。

注意：`armorMax` 当前实现偏向 number 字段。允许 `""` 会影响类型、校验和 UI 绑定，需要在实现计划中单独处理。

## 老存档迁移

### 问题

六大属性和经历从老存档加载时通常没有 base 来源。它们会在 target panel 中表现为 unknown base 或未归因差额。

用户认为这不合理：这些旧存档里的已有值，本质上就是用户当时填写的基础值。

### 当前共识

对纯老存档，可以从现有最终值推断 legacy user base。

候选 target：

- 六大属性。
- 经历值。

不自动推断的 target：

- `evasion`：职业可能提供 base。
- `hpMax`：职业可能提供 base。
- `stressMax`：默认值和规则语义需要单独判断。
- `armorMax`：装备可能提供 base。
- `minorThreshold` / `majorThreshold`：装备和等级可能提供来源。
- `proficiency`：等级 provider 应提供 base。

### 推断规则

如果一个 target 满足以下条件，则创建 legacy base：

1. target 是六大属性或经历值。
2. 当前最终值非空且可解析为数字。
3. 当前 target 没有已存在 base。
4. 存档没有显式的新 modifier 数据，或至少该 target 没有显式 modifier 来源。

创建的 contribution：

```ts
{
  id: `user:${target}:legacy-base`,
  definition: {
    target,
    kind: "base",
  },
  editable: {
    label: "旧存档基础值",
    value: parsedFinalValue,
  },
}
```

并设置：

```ts
targetStates[target].activeBaseId = `user:${target}:legacy-base`
```

### 已有 modifier 数据的存档

如果存档已经有显式 modifier 数据，则不应再推断 legacy base，应原样展示。

显式 modifier 数据包括：

- `userModifierContributions`
- 新版 `modifierState.targetStates`
- 新版 `modifierState.entryStates`
- `automationSelections`

原因是这类存档已经进入新 modifier 架构。迁移器不应该再猜测基础值，否则可能制造重复或错误来源。

## 版本化 Migration

当前 migration 系统的问题是缺少数据版本。迁移逻辑只能根据字段是否存在、内容长什么样来猜测数据来源。

这在 modifier 和自动化语义迁移中会越来越危险。

后续应单独讨论版本化 migration：

```ts
interface SheetData {
  schemaVersion?: number
}
```

目标方向：

- 新存档写入 `schemaVersion`。
- migration 按版本链执行，例如 `v0 -> v1 -> v2`。
- 每个 migration 只处理一个明确版本差异。
- 无版本存档统一视为 legacy 起点。
- 已有历史迁移不强行重写，但后续新增适配层。

这个议题暂不并入当前自动化同步设计，但会影响 legacy base inference 的长期可靠性。

## 升级自动化的归宿

当前升级 UI 仍保留旧模式：属性、经历、闪避升级要求用户手动填写或确认新的最终值。

新的方向是：

```text
升级选择只记录 provider selection。
registry 根据 selection 生成 upgrade modifier。
target sync 决定是否写 final value。
```

这意味着：

- 属性升级选择两个属性，生成两个 `+1` modifier。
- 经历升级选择两个经历，生成两个 `+1` modifier。
- 闪避升级直接生成一个 `evasion +1` modifier。
- 生命、压力、熟练度也应逐步统一到同一模型。

旧的 rollback / snapshot 逻辑应逐步废弃。取消升级不再直接依赖“记住旧值再回滚”，而是移除 selection，让 reference total 重新计算。最终值是否变化由 target sync mode 决定。

## Experience Target

当前经历使用固定数组槽位：

```text
experienceValues.0
experienceValues.1
...
```

当前代码没有重排经历的行为。新增经历会进入第一个空槽。因此现阶段 `experienceValues.${index}` 可以视为稳定 target。

风险仅在未来出现：

- 经历拖拽排序。
- 删除经历后压缩数组。
- 扩展为动态数量经历。

这些不是当前自动化同步设计的阻塞项。

## 与前两个改进点的关系

### Target Auto Base Generalization

`2026-05-09-target-auto-base-generalization-design.md` 讨论的是：

```text
玩家首次填写基础值时，是否自动生成 user base。
```

它解决的是 base 来源缺失问题。

### Upgrade Modifier Selection Simplification

`2026-05-09-upgrade-modifier-selection-simplification-design.md` 讨论的是：

```text
升级 UI 是否应从手填最终值改为选择升级对象。
```

它解决的是 upgrade modifier 来源创建问题。

### 本文

本文讨论的是：

```text
当 provider entries 已经能生成 reference total 后，final value 应该何时同步。
```

三者相互关联，但不应混成同一个实现决策：

- auto base 负责补 base。
- upgrade simplification 负责生成 modifier。
- target sync automation 负责写 final value。

## 当前已达成共识

1. 废弃旧的分散式自动化写值模型。
2. 自动化应统一接入 provider / registry / target sync 模型。
3. 最终值字段仍保留，不在本阶段改成只读计算字段。
4. target panel 增加“同步一次”和“持续同步”能力。
5. 同步一次要求 reference total 可计算；缺 base 时禁用。
6. 持续同步可以在缺 base 时保持开启，并按 target fallback 写最终值。
7. 用户手动修改最终值会关闭该 target 的持续同步。
8. 持续同步写入必须是 `set(referenceTotal)`，不是 `add(delta)`。
9. 纯老存档的六大属性和经历可以从最终值推断 legacy user base。
10. 已有 modifier 数据的存档不做 legacy base 推断。
11. 经历 target 当前不需要因为 index 稳定性阻塞设计。
12. migration 版本化是后续独立议题。

## 待讨论问题

1. `syncMode` 是否只需要 `"manual" | "continuous"`，还是需要显式 `"off"` / `"once"` 状态？
2. 持续同步是否应让对应最终值输入框变成只读，还是继续允许编辑并自动关闭同步？
3. `armorMax` 允许 `""` 后，相关类型和 UI 应如何调整？
4. `hpMax` / `stressMax` 缺 base 时保持默认 `6`，是否会掩盖来源缺失？
5. 旧自动化入口应一次性废弃，还是按职业、升级、装备、等级分阶段替换？
6. `automationSelections` 长期是否应改名为 `sourceSelections` 或 `providerSelections`？
7. legacy base inference 应如何识别“纯老存档”，在没有 schema version 的前提下是否足够可靠？
8. target panel 的同步 UI 如何展示，才能让用户清楚知道最终值为什么变化或变空？
