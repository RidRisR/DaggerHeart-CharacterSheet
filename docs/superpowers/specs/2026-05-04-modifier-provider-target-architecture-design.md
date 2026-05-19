# Modifier Provider / Target Architecture Design

日期：2026-05-04

> **状态：保留为架构背景。** Provider、Registry、Target/Calculator
> 三层分工仍是当前 modifier 系统的核心语言；本文的“第一阶段边界”、
> load/migration-only reconciliation 和 `automationSelections` 口径早于 05-19
> 自动计算边界设计。当前同步入口、Source/Derived/Stored State 术语、
> Final Value writeback 规则和 Modifier Target Universe 以 `CONTEXT.md` 与
> `docs/superpowers/specs/2026-05-19-automatic-calculation-boundary-design.md`
> 为准。

## 目的

本文记录 modifier provider 与 target 分离设计的当前共识。它用于解释涉及哪些结构、这些结构分别在哪里使用，以及第一阶段架构边界。

本文不是实现计划。

## 核心共识

modifier 系统应分成三层：

1. Provider 层：拥有来源数据。
2. Registry 层：从当前有效 provider 收集运行时 entries。
3. Target/Calculator 层：按 target 消费 entries，并套用用户状态。

一句话原则：

```text
Provider owns source facts.
Registry resolves current entries.
Target consumes entries and owns entry state.
```

## Provider

Provider 是“价值来源”的拥有者。它负责保存或推导 contribution。

当前和未来会有这些 provider：

- 职业 provider：从当前职业卡推导起始闪避、起始生命上限。
- 护甲 provider：从当前护甲数据推导护甲值、伤害阈值 base。
- 等级 provider：从当前等级推导阈值加值、熟练度来源。
- 升级 provider：从升级选择推导对应 modifier。
- 用户 provider：保存用户自定义 contributions。
- 装备 provider：保存武器、护甲提供的 modifier contributions。

Provider 不应该保存 target 对 entry 的消费状态，例如禁用、active base、排序。

## ModifierContribution

`ModifierContribution` 是 provider 持久化保存的来源数据。用户来源和装备来源应使用同一种 contribution 结构。

当前共识形状：

```ts
interface ModifierContribution {
  id: ModifierEntryId
  definition: ModifierContributionDefinition
  editable: ModifierContributionEditable
}

interface ModifierContributionDefinition {
  target: ModifierTargetId
  kind: ModifierEntryKind
}

interface ModifierContributionEditable {
  label: string
  value: number
}
```

字段语义：

- `id`：整张角色卡内全局唯一，用于 target state 引用。
- `definition.target`：这个来源作用于哪个 target。
- `definition.kind`：这个来源是 base 还是 modifier。
- `editable.label`：用户可编辑的显示名片段。
- `editable.value`：用户可编辑的数值。

`definition` 创建后不可原地修改。原因是 `target` 和 `kind` 会影响消费语义：

- target 决定 entry 出现在哪个 target panel，并影响哪个最终字段。
- kind 决定它是参与 base 选择，还是作为可启用/禁用 modifier 叠加。

如果用户需要改变 target 或 kind，数据层语义是删除旧 contribution，并创建一个带新 id 的 contribution。

## 用户来源

用户自定义来源是 user provider 拥有的 contributions。

建议结构：

```ts
interface SheetData {
  userModifierContributions: ModifierContribution[]
}
```

虽然用户来源的 UI 入口是 per target 的，但存储不需要按 target 分桶。target panel 可以通过 registry 或 helper 获取当前 target 的用户 contributions。

创建用户来源时：

- 当前 target panel 决定 `definition.target`。
- “添加基础值”或“添加加值”按钮决定 `definition.kind`。
- 用户输入 `editable.label` 和 `editable.value`。

创建完成后，用户只编辑 label/value。target/kind 不暴露为可编辑字段。

## 装备来源

装备来源由装备 provider 拥有。主武器、副武器和当前护甲可以提供 active contributions。

建议结构：

```ts
interface WeaponSlot {
  name: string
  trait: string
  damage: string
  feature: string
  modifierContributions: ModifierContribution[]
}
```

装备 contribution 与用户 contribution 使用相同基础结构，但编辑入口不同：

- 用户 contribution 在 target panel 里创建和编辑。
- 武器 contribution 在武器界面里创建和编辑。
- 护甲 contribution 在护甲界面里创建和编辑。

备用武器保存自己的 `modifierContributions`，但不进入 active registry，不参与当前角色数值计算，也不出现在 target panel 中。

当前共识：如果一把武器离开主/副装备位进入备用栏，它对应的 entry state 不需要保留。再次装备回来时，相关 entries 默认按新 active 来源处理。

## ModifierEntry

`ModifierEntry` 是 registry 收集后用于计算和展示的运行时结构。它不是 provider 的持久化存储结构。

目标结构：

```ts
interface ModifierEntry {
  id: ModifierEntryId
  definition: ModifierContributionDefinition
  presentation: ModifierEntryPresentation
  source: ModifierEntrySource
  priority: number
}

interface ModifierEntryPresentation {
  label: string
  value: number
}

interface ModifierEntrySource {
  type: ModifierSourceType
  id: string
}
```

`ModifierEntry` 与 `ModifierContribution` 共享 `definition` 结构。区别是：

- `ModifierContribution.editable` 是 provider 持久化保存、用户可编辑的字段。
- `ModifierEntry.presentation` 是 registry 产出的运行时展示和计算值。
- `ModifierEntry.source` 是 registry 附加的来源上下文，用于展示、排序和调试。
- `ModifierEntry` 不写入 `SheetData`，因此改变它的结构没有存档迁移问题。

转换关系：

```text
ModifierContribution + provider context -> ModifierEntry
```

例如武器 contribution：

```ts
{
  id: "contrib_1",
  definition: { target: "evasion", kind: "modifier" },
  editable: { label: "灵巧", value: 1 }
}
```

在 registry 中转换为：

```ts
{
  id: "contrib_1",
  definition: { target: "evasion", kind: "modifier" },
  presentation: { label: "短剑：灵巧", value: 1 },
  source: { type: "equipment", id: "equipment.weaponSlots.primary" },
  priority: 120
}
```

## Registry

Registry 应保持纯读取。它不注册 entry，不生成默认状态，也不清理状态。

目标流程：

```text
collectModifierEntries(sheetData)
  -> collect active provider entries
  -> merge system entries and provider contributions
  -> return ModifierEntry[]
```

打开某个 target panel 时：

```text
activeEntries = collectModifierEntries(sheetData)
targetEntries = activeEntries.filter(entry => entry.definition.target === currentTarget)
summary = calculateReferenceSummary(targetEntries, modifierState)
```

Target panel 不应该知道“去主武器路径读取 contribution”。它只消费 registry 给出的 entries。

`ModifierEntry[]` 是派生运行时数据：

- 不写入 `SheetData`。
- 不作为可独立修改的 store state 保存。
- 需要时从当前 `SheetData` 现场收集。
- 如果未来性能成为问题，使用 memoized selector，而不是引入第二份可变状态。

## Modifier State

`ModifierState` 保存消费侧状态，不保存来源基础信息。

消费侧不应该复制：

- label
- value
- target
- kind
- source path

这些都来自 provider 或 registry。

当前共识是把消费侧状态分成两类：

- `targetStates`：target 作为消费方持有的状态。
- `entryStates`：针对具体 entry id 的状态。

```ts
interface ModifierState {
  targetStates: Partial<Record<ModifierTargetId, TargetModifierState>>
  entryStates: Record<ModifierEntryId, ModifierEntryState>
}

interface TargetModifierState {
  activeBaseId?: ModifierEntryId
}

interface ModifierEntryState {
  enabled?: boolean
  order?: number
}
```

### TargetModifierState

`TargetModifierState` 保存 target 自己的消费选择。

当前只需要：

- `activeBaseId`：当前 target 选择哪个 base entry。

active base 属于 target state，因为它的约束是“每个 target 最多一个 active base”。如果把 active base 建模成 entry state，就必须额外维护同 target 下多个 base 不能同时 active 的不变量。

计算时：

```text
targetEntries = entries.filter(entry.definition.target === target)
savedBaseId = modifierState.targetStates[target]?.activeBaseId
activeBase = targetEntries 中 id === savedBaseId 的 base
fallback = 如果 savedBaseId 无效，使用排序后的第一个 base
```

### ModifierEntryState

`ModifierEntryState` 保存某个 entry id 自己的消费侧状态。

当前需要：

- `enabled?: boolean`：缺省为启用，`false` 表示禁用。

未来如果需要用户排序，可以使用 `order`。排序是 entry 级状态，因此不放在 target state 里。

计算时：

```text
enabled = modifierState.entryStates[entry.id]?.enabled !== false
```

这个结构避免了旧模型中的混合职责：

- 用户和装备 contributions 由 provider 保存。
- active base 由 target state 保存。
- enabled/disabled 由 entry state 保存。

## Reconciliation

Reconciliation 是数据清理机制，不应成为计算正确性的前提。

正确性规则：

```text
calculateReferenceSummary 只遍历当前 active entries。
找不到对应 active entry 的状态天然无效。
```

因此孤儿状态不会参与计算。

Reconciliation 可以清理：

- `entryStates` 中当前 active registry 不存在的 entry id。
- `targetStates[target].activeBaseId` 中当前 target 不存在或不是 base 的 entry id。
- 删除 contribution 后遗留的消费侧状态。

第一阶段只在加载存档和迁移后执行 reconciliation：

```text
load sheetData
  -> migrate old shape
  -> reconcileModifierState(sheetData)
  -> hydrate store
```

不在以下位置执行：

- registry 读取时。
- target panel 打开时。
- 每个 provider mutation action 后。

这意味着当前 session 中删除 contribution、卸下装备、移动武器后，内存中的孤儿 state 可能暂时残留。只要 calculator 只遍历当前 active entries，这些孤儿 state 不会影响计算；下次加载存档时会统一清理。

## 已达成共识

1. Provider 和 target 要分离。
2. 用户来源和装备来源本质上都是 provider-owned contribution。
3. 用户来源和装备来源应使用相同的 `ModifierContribution` 基础结构。
4. 用户来源存储为简单列表，不按 target 分桶。
5. 用户来源 UI 仍然是 per target。
6. 装备来源 UI 在装备界面中，不在 target panel 中编辑。
7. contribution id 必须在整张角色卡内全局唯一。
8. `definition.target` 和 `definition.kind` 创建后不可原地修改。
9. 修改 target/kind 的语义是删除旧 contribution，并创建新 contribution。
10. `editable.label` 和 `editable.value` 可以原地修改。
11. 备用武器 contributions 不进入 active registry。
12. Registry 应是纯读取，不写入默认状态，不执行清理。
13. Correctness 不依赖 reconciliation；reconciliation 只负责清理孤儿状态。
14. `modifierState` 分为 `targetStates` 和 `entryStates`。
15. active base 存在 `targetStates[target].activeBaseId`。
16. enabled/disabled 存在 `entryStates[entryId].enabled`。
17. 第一阶段 reconciliation 只在 load/migration 后执行。
18. Store action 不需要在每次 provider 变化后主动执行 reconciliation。
19. `ModifierEntry[]` 不进入 store；它是由 registry 从当前 `SheetData` 派生的运行时数据。
