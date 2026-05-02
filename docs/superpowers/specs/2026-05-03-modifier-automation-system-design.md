# Modifier 与自动化系统设计

日期：2026-05-03

## 背景

当前角色卡里的数值自动化分散在多个组件和 store action 中。职业卡、护甲、等级变化、升级选项、升级弹窗各自直接写入 `SheetData`，并且缺少统一的来源解释。用户可以看到最终值，但很难知道这个值来自职业、护甲、升级、手动填写，还是旧存档残留。

v1 modifier 方案尝试把基值和加值结构化，但失败点之一是迁移前缺少自动化基线测试，另一个问题是过早试图接管最终值计算，导致用户意图难以判断。本轮设计以现有 baseline tests 为保护，目标是把系统演进为可溯源、可检查，同时保持现有最终值编辑体验。

## 目标

- 保留现有最终值字段作为角色卡实际显示、导出、计算使用的值。
- 建立统一的 source/effect definition，收束职业、护甲、升级等自动化来源。
- 建立 modifier registry，用于按需展示当前字段有哪些 base 和 modifier 来源。
- 建立 automation executor，用于统一执行选择/取消自动化时的数值操作。
- 支持 v1 风格的简洁问号 UI：base、modifier、未归因差额。
- 支持老存档保守迁移：不重算、不猜来源、不改最终值。

## 非目标

- 第一阶段不把最终值改成只读计算结果。
- 第一阶段不做完整历史记录。
- 第一阶段不实现复杂条件表达式、脚本化规则语言或公式 DSL。
- 第一阶段不强制用户把所有旧字段拆成结构化来源。
- 第一阶段不在存档中保存系统可重新推导出来的来源列表。

## 核心原则

### 最终值仍是事实

`SheetData` 中现有字段仍然是角色卡的最终值，例如 `evasion`、六属性 `value`、`hpMax`、`stressMax`、`armorValue`、`minorThreshold`、`majorThreshold`、`experienceValues`、`proficiency`。

用户仍然可以直接编辑最终值。直接编辑最终值不表示“修改某个 base”或“修改某个 modifier”，而是用户在当前上下文下输入了新的最终结果。系统不猜测用户意图。

### 自动化是当前动作，不是历史修复器

自动化来源声明 effects。用户选择来源时执行正向 effect；取消来源时执行反向 effect。执行是否成功只看动作发生当下字段是否能解析为数字。

- 字段能解析为数字：执行 `add`。
- 字段不能解析为数字：不改最终值，但仍记录选择状态，并在 UI 中提示来源已记录但最终值未自动更新。

系统不保存旧 snapshot，不记录 `appliedToFinalValue`，也不尝试还原历史。

### 存事实，不存推导结果

存档只持久化用户做过的选择和手写内容。系统来源列表、参考总值、未归因差额都从当前 `SheetData`、持久化选择状态和 registry 按需推导。

## 数据结构

在 `SheetData` 中新增一个轻量结构，用于保存用户事实：

```ts
interface SheetData {
  modifierState?: ModifierState
  automationSelections?: AutomationSelections
}

interface ModifierState {
  byTarget: Record<ModifierTargetId, TargetModifierState>
}

interface TargetModifierState {
  activeBaseId?: ModifierEntryId
  disabledEntryIds?: ModifierEntryId[]
  userEntries?: UserModifierEntry[]
}

interface UserModifierEntry {
  id: ModifierEntryId
  target: ModifierTargetId
  kind: "base" | "modifier"
  label: string
  value: number
}

type AutomationSelections = Record<AutomationSourceId, AutomationSelection>

interface AutomationSelection {
  selected: boolean
  params?: Record<string, unknown>
}
```

`modifierState` 保存：

- 用户手动新增的 base。
- 用户手动新增的 modifier。
- 用户选择的 active base。
- 用户关闭的 modifier/base 来源 id。

`automationSelections` 保存：

- 升级选项是否已选择。
- 参数化升级选项的参数，例如选择哪两个属性、哪两个经历。

不保存：

- 职业、护甲、升级推导出来的系统 entries。
- reference total。
- 未归因差额。
- 系统 effect 列表的运行时快照。

## Target 范围

第一阶段覆盖以下目标：

- `evasion`
- `armorValue`
- `minorThreshold`
- `majorThreshold`
- 六属性：`agility.value`、`strength.value`、`finesse.value`、`instinct.value`、`presence.value`、`knowledge.value`
- `hpMax`
- `stressMax`
- `experienceValues[n]`
- `proficiency`

其中 `proficiency` 底层仍然可以保持 boolean array，但 registry/executor 层语义上把它视为熟练值数量。

## Source 与 Effect

统一 source definition 是职业、护甲、升级等自动化的注册入口。

```ts
interface AutomationSourceDefinition {
  id: AutomationSourceId
  sourceType: "profession" | "armor" | "level" | "upgrade" | "user"
  label: string
  createEffects(context: AutomationContext): AutomationEffect[]
  createModifierEntries(context: AutomationContext): ModifierEntry[]
}

type AutomationEffect =
  | AddEffect
  | SetBaseEffect
  | RecalculateEffect

interface AddEffect {
  operation: "add"
  target: ModifierTargetId
  value: number
}

interface SetBaseEffect {
  operation: "setBase"
  target: ModifierTargetId
  value: number | string
}

interface RecalculateEffect {
  operation: "recalculate"
  target: ModifierTargetId
  formulaId: string
}
```

第一阶段的执行重点是 `add`。`setBase` 和 `recalculate` 主要用于表达语义和 registry 展示，实际结果层保持现有外部行为。

### add

用于升级、熟练度、属性、经历、闪避、生命上限、压力上限等加减语义。

选择时：

- 字段可解析：`current + value`
- 字段不可解析：跳过最终值写入
- 记录选择状态

取消时：

- 字段可解析：`current - value`
- 字段不可解析：跳过最终值写入
- 移除或更新选择状态

### setBase

用于职业起始值、护甲基础值、护甲基础阈值等 base 来源。

`setBase` 不做通用 undo。base 来源消失时，只影响 reference 层的 active base 选择，不自动反向修改最终值。结果层继续保持当前职业/护甲自动化的外部行为。

### recalculate

用于等级与护甲阈值共同决定伤害阈值这类派生结果。

第一阶段不引入公式 DSL。可以通过命名公式函数处理，例如 `armorThresholdPlusLevel`。迁移时优先维持当前结果行为，再逐步把来源解释接入 registry。

## Registry 与 Executor

### modifier registry

modifier registry 负责回答：

> 当前角色卡上，某个 target 有哪些 base 和 modifier 来源？

它从以下输入推导 entries：

- 当前 `SheetData`
- `modifierState`
- `automationSelections`
- source definitions

输出不写回存档。

```ts
function collectModifierEntries(
  sheetData: SheetData,
  target?: ModifierTargetId,
): ModifierEntry[]
```

### automation executor

automation executor 负责执行自动化动作：

```ts
function applyAutomationSource(sourceId: AutomationSourceId, params?: unknown): AutomationResult
function revertAutomationSource(sourceId: AutomationSourceId): AutomationResult
function applyEffects(sheetData: SheetData, effects: AutomationEffect[]): ApplyEffectsResult
function revertEffects(sheetData: SheetData, effects: AutomationEffect[]): ApplyEffectsResult
```

执行结果包括：

- `updates`: 对 `SheetData` 最终值字段的更新。
- `selectionUpdates`: 对 `automationSelections` 的更新。
- `warnings`: 字段不可解析、无法应用等非阻断提示。

## Base 选择规则

一个 target 同时只能有一个 active base。

active base 来源可以是：

- 用户手动 base。
- 系统 base，例如职业起始闪避、护甲基础护甲值。

如果已保存的 active base 不再存在：

1. 按稳定优先级选择下一个可用 base。
2. 如果没有任何 base，显示“未知基础值”。
3. 没有 base 时，不计算 reference total。
4. 没有 reference total 时，不反推未归因差额。

fallback 优先级固定为：

1. 用户手动 base。
2. 当前装备、职业、已选择升级等系统 base。
3. registry 默认 base。

base fallback 只影响问号 UI 和 reference 层，不自动修改最终值。

## 未归因差额

当 target 有 active base，并且所有启用的 modifier 都有数字 value 时：

```ts
referenceTotal = activeBase.value + sum(enabledModifier.value)
unattributedDelta = finalValue - referenceTotal
```

如果最终值不可解析，或者没有 active base，则不计算未归因差额。

用户直接修改最终值后，如果它与 reference total 不一致，问号 UI 展示未归因差额。系统不猜测这个差额应归属于哪个来源。

第一阶段必须展示未归因差额，但不实现自动归因动作。以下动作留给后续 UX 迭代：

- 将未归因差额归因为手动 modifier。
- 将当前最终值设为新的手动 base。

## UX

第一阶段沿用 v1 风格，而不是做大型管理面板。

每个目标字段附近显示一个小问号按钮。打开后展示：

- 当前 active base。
- 可选 base 列表。
- modifier 列表。
- 每个 modifier 的启用/关闭状态。
- 用户手动新增 base/modifier 的入口。
- 未归因差额提示。

不可解析字段遇到自动化 add 时，行为为：

- 不阻断用户操作。
- 记录选择状态。
- 轻量提示：“已记录该加值，但当前字段无法计算为数字，最终值未自动更新。”

具体视觉细节可以在实现前用现有 `docs/demos/modifier-system-ux.html` 继续迭代。

## 迁移

老存档迁移必须保守：

- 不重算最终值。
- 不猜测旧来源。
- 不把旧字段拆成自动 base/modifier。
- 只补默认空结构，例如 `modifierState` 和 `automationSelections`。

打开旧存档后：

- 最终值保持原样。
- 如果 registry 能从当前职业、护甲、已选择升级状态推导来源，就展示这些来源。
- 如果 target 没有 base，问号 UI 显示“未知基础值”。
- 没有 base 时不计算 reference total 和未归因差额。

## 第一阶段切分

第一阶段按自动化来源切，而不是按目标字段切：

1. 职业自动化
   - 起始闪避。
   - 起始生命上限。
   - 职业清空行为保持现有外部结果。

2. 护甲自动化
   - 护甲基础护甲值。
   - 护甲基础伤害阈值。
   - 等级加成后的最终阈值。

3. 升级自动化
   - 属性 +1。
   - 闪避 +1。
   - 生命上限 +1。
   - 压力上限 +1。
   - 熟练度 +1。
   - 经历加值 +1。

## 测试策略

现有 automation baseline tests 是迁移保护线，必须持续通过。

新增测试应覆盖：

- `add` effect 可解析时正向/反向应用。
- `add` effect 不可解析时跳过最终值写入，但记录选择状态。
- 用户直接编辑最终值后，取消 add 来源按当前数字执行反向 add。
- `setBase` 来源消失时 reference fallback，不自动改最终值。
- 没有 base 时不计算 reference total 和未归因差额。
- modifier registry 能从职业、护甲、升级选择状态推导 entries。
- 老存档迁移只补结构，不改最终值。
- 问号 UI smoke test：能展示 base、modifier、未归因差额、未知 base。

## 风险与缓解

- 风险：registry 与 executor 语义分裂。
  - 缓解：source definition 同时提供 effects 和 modifier entries，二者从同一来源生成。

- 风险：reference 层 fallback 被误解为自动修改最终值。
  - 缓解：明确 base fallback 只影响 UI，不写 `SheetData` 最终值。

- 风险：旧自动化行为在收束入口时回归。
  - 缓解：保持 baseline tests，并在迁移每个来源前补充对应测试。

- 风险：第一阶段引入过多公式系统复杂度。
  - 缓解：仅支持命名公式函数，不做 DSL。

## 开放但不阻塞的问题

- 问号 UI 的具体视觉布局和交互细节。
- 更复杂卡牌自动化未来是否需要条件、依赖或脚本规则。

这些问题不影响第一阶段的数据边界和自动化语义，可以在 implementation plan 或后续 spec 中继续细化。
