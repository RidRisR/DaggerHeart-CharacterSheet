# Automatic Calculation Boundary Design

日期：2026-05-19

状态：待复核

## 目的

本文固定 modifier 系统的自动计算边界模型。

当前系统已经有 `base / modifier / Other Adjustments` 模型，但自动计算触发点分散在多个 store action 中，导致部分路径只做了局部 reconciliation，没有进入完整自动计算同步。例如：

- 用户在没有 base 的 target 上提交 Final Value，系统创建了手动基础值，但 Final Value 没有立刻被重新计算后的结果覆盖。
- 用户删除最后一个手动基础值后，Reference Total 已经消失，但旧 Final Value 仍残留。
- 导入、replace、通用 setSheetData 等路径可能留下 `Reference Total 存在但 Final Value 为空或过期` 的中间态。

本文的目标是定义一个统一的自动计算同步边界，避免这些“半自动化”状态继续扩散。

本文不是实现计划。

## 核心术语

### Source State

自动计算系统的输入状态，包括：

- base entries。
- modifier entries。
- Other Adjustments。
- active base state。
- autoCalculation state。
- `modifierState` 中会影响 target 如何消费 entries 的状态。

Source State 可以由职业、等级、装备、升级项、用户手动维护的 base / modifier / Other，以及 migration 等来源生成。

Calculated Final Value 可以写回 Final Value，但不能反过来被误解释成新的 Source State。只有明确的 modifier-aware behavior，例如用户提交 Final Value，才可以创建或修改 Source State。

### Derived State

由 Source State 派生出来的中间计算结果，包括：

- Reference Total。
- Calculated Final Value。

Derived State 必须可以从当前 Source State 重算出来。同步边界每次运行都应产生稳定、幂等的 Derived State。

### Stored State

真实保存在角色卡中、用户可以看到或编辑的状态。

本文中最重要的 Stored State 是 Final Value。

Final Value 可以等于 Calculated Final Value，也可以因为自动计算关闭、用户手动修改、不可解析文本保护等原因，暂时不等于 Calculated Final Value。

### Reference Total

由当前有效的 active base 和已知 modifier 计算得到：

```text
Reference Total = active base + enabled modifiers
```

如果没有 active base，也没有可顺延的 base，则 Reference Total 不存在。

### Final Value

角色卡上真实保存和展示的最终值，也就是用户在角色卡字段里看到和编辑的值。

Final Value 可以是：

- 可解析数字。
- 空值。
- 不可解析文本。

在本文的新语境下，`Final Value` 只指代这个真实存储值，不指代自动计算系统算出的候选值。

### Calculated Final Value

自动计算系统根据当前 Reference Total 和 Other Adjustments 算出的候选最终值：

```text
Calculated Final Value = Reference Total + Other Adjustments
```

如果没有 Reference Total，则 Calculated Final Value 不存在。

自动计算开启时，系统尝试把 Calculated Final Value 写入 Final Value。

自动计算关闭时，系统仍然可以计算 Calculated Final Value，但不写回 Final Value。

### Automatic-Calculation Sync Boundary

自动计算同步边界是指一次足以影响 Source State、Derived State 或 Stored State 的 modifier-aware 行为完成后，系统必须执行的统一自动化事务。

同步边界不表示“只同步当前 target”。同步边界发生时，系统应全量扫描当前角色卡的有限 Modifier Target Universe。

Modifier Target Universe 包括：

- 固定内建 target，例如闪避、护甲值、阈值、HP / Stress 上限、熟练度、六属性。
- 当前角色卡的五个经历 target。
- 当前 model 中已经由 entry、target state 或 Other Adjustment 引用的 target。

备用武器不是额外的 target universe；当前 registry 只消费生效装备 source，例如主武器、副武器和护甲。备用武器在换入生效槽位后才影响当前 Calculated Final Value。

同步边界不是狭义的加法计算器。它负责把一次 modifier-aware behavior 收口成稳定的 sheet data，包括解释行为意图、归一化模型、派生计算结果，并按规则写回 Final Value。

## 自动计算开关语义

自动计算开关只控制系统是否把 Calculated Final Value 写回 Final Value。

## 稳定状态不变量

自动计算同步边界是 modifier-aware 行为的 commit barrier。

任何 modifier-aware 行为都不应把半同步状态提交给用户可见 store。一次行为可以在内存中的 draft sheet data 里产生短暂中间态，但 commit 到 store 的结果必须已经经过同步边界，满足当前 Source State、Derived State 和 Stored State 的一致性规则。

以下状态只能作为同步边界内部的 transient system state 或 legacy / escape hatch 修复对象，不能作为正常稳定状态暴露给用户：

- Reference Total 存在，但自动计算开启的 Final Value 为空。
- Reference Total 已经消失，但自动计算开启的 Final Value 仍残留旧值。
- active base 指向已经不存在的 base entry。
- source / Other Adjustment 已变化，但自动计算开启的 Final Value 仍是变化前的计算结果。

如果这些状态出现在 store 中，应视为同步边界遗漏或 legacy / escape hatch 输入造成的需要修复状态，而不是用户意图。

### 自动计算开启

- Source / Reference / Other Adjustments 变化后必须进入同步边界。
- 同步边界全量扫描 Modifier Target Universe。
- 对自动计算开启的 target，可以把 Calculated Final Value 写入 Final Value。
- 如果 target 有 Reference Total，计算并写回 Calculated Final Value。
- 如果 target 没有 Reference Total，Calculated Final Value 不存在，Final Value 写为空值。
- 用户可见的空 Final Value 表示系统当前没有可计算 Reference Total。
- 如果底层已有 Reference Total 但 Final Value 仍为空，这是 transient system state，不应作为稳定状态暴露给用户。

### 自动计算关闭

- Source / Reference / Other Adjustments 仍实时更新。
- active base 仍实时归一化，并写回 normalized activeBaseId。
- Calculated Final Value 仍可被计算。
- Calculated Final Value 不写回 Final Value。
- 同步边界仍可以发生，但关闭的 target 保留 locked Final Value。
- 如果 locked Final Value 可解析，且 Calculated Final Value 存在，系统可以派生 `自动计算暂停期间差额`。
- 如果 locked Final Value 不可解析，则无法派生暂停期间差额。

## 统一同步入口

所有自动计算同步边界应通过同一个共享入口执行。

store action 不应各自发明局部同步逻辑，例如只调用 `reconcileFinalInput`、只删除 base、只更新 Other Adjustment，而不进入统一自动计算边界。

短期实现可以保留当前函数名，例如 `applyAutoCalculationForTargets`，但它在语义上应被视为“自动计算同步边界执行器”。

本阶段采用 Boundary Input Object 作为同步边界入口形式，而不重构成完整 Command Pipeline 或 Effect Collector。

概念形式：

```ts
runModifierAutomationBoundary({
  sheetData,
  intent,
  previousSheetData?,
  options?,
}): SheetData
```

其中：

- `sheetData` 通常是 primary mutation 之后的 draft sheet data。
- `finalValueSubmitted` 是例外：它必须接收用户提交前已经同步稳定的 sheet data，并通过 intent 携带 submitted value。Behavior Interpretation 阶段负责解释提交值、写入 Final Value、创建 manual base 或创建 `用户手动修改终值`。
- `intent` 是明确的 modifier-aware behavior context。
- `previousSheetData` 只在某些 intent 需要历史上下文时使用，不能作为通用 diff 推断来源。
- `options` 只承载调试、日志或未来扩展信息，不应改变业务语义。

示例 intent：

```ts
type ModifierAutomationIntent =
  | { type: "sourceMutated"; source: "profession" | "equipment" | "upgrade" }
  | { type: "finalValueSubmitted"; target: ModifierTarget; submittedValue: string }
  | { type: "autoCalculationToggled"; target: ModifierTarget; enabled: boolean }
  | { type: "baseEntryMutated"; target?: ModifierTarget }
  | { type: "modifierEntryMutated"; target?: ModifierTarget }
  | { type: "otherAdjustmentMutated"; target?: ModifierTarget }
  | { type: "levelChanged"; previousLevel: number; nextLevel: number }
  | { type: "storeReplaced"; source: "currentSchema" };
```

长期如果需要更强的自动化编排，可以把这些 intent 演进成 command pipeline；但这不是本阶段目标。

同步边界执行器应按以下阶段工作。

### 1. Behavior Interpretation

根据明确的 modifier-aware behavior 解释用户意图或系统意图。

所有 intent 都必须进入 Behavior Interpretation 阶段。部分 intent 会在此阶段改变 Source State；部分 intent 只是 pass-through，用来声明后续 normalization / derivation / writeback 必须发生。

不能因为某个 intent 当前无需特殊解释，就绕过统一同步边界。

示例：

- 用户提交 numeric Final Value，且没有 Reference Total：创建或更新 manual base。
- 用户提交 numeric Final Value，且有 Reference Total：创建或更新 `用户手动修改终值`。
- 用户开启自动计算：在条件满足时物化 `自动计算暂停期间差额`。
- 用户关闭自动计算：删除已物化的 `自动计算暂停期间差额`。
- 用户删除 base / modifier / Other：通常不需要特殊解释，作为 pass-through intent 进入后续 Model Normalization 和 Final Writeback。

系统不能只凭新旧 sheet data diff 猜测这些意图。进入同步边界前必须已经知道当前行为 context。

### 2. Model Normalization

归一化自动计算模型，使 Source State 处于可计算状态。

包括：

- 清理已经失效的 entry state / contribution reference。
- 归一化 active base。
- 如果 active base 消失且同 target 仍有其他 base，顺延到可用 base。
- 如果没有任何 base，标记 Reference Total 不存在。
- 保证 base / modifier / Other Adjustment 都是数值；不可解析文本只能存在于 Final Value。

`modifierState.entryStates` 是当前生效 registry entry 的状态表，不是历史 contribution 状态缓存。

Model Normalization 应删除不再属于当前 registry 的 entry state。备用武器的 modifier contribution 在备用槽位中保留自己的 source data，但在换入主武器或副武器前不属于当前生效 registry，因此不应在全局 `modifierState.entryStates` 中预留或保留 inactive state。

`modifierState.targetStates` 应保留有业务含义的 target state，并删除无意义状态：

- 保留 `autoCalculation: false`，即使当前 target 没有任何 source；这是用户锁定 Final Value 的偏好。
- 保留指向当前有效 base 的 `activeBaseId`。
- 不把 `autoCalculation: true` 作为独立业务偏好持久化；自动计算默认开启。
- 删除指向不存在 base 的 `activeBaseId`，除非 normalization 已经顺延到新的有效 base。
- 删除空 target state。

### 3. Calculation Derivation

基于归一化后的 Source State 全量派生 Derived State：

1. 收集 Modifier Target Universe。
2. 对每个 target 解析 reference summary。
3. 计算 Reference Total。
4. 计算 Calculated Final Value。

### 4. Final Writeback

按自动计算开关和不可解析 Final Value 保护规则同步 Stored State：

- 如果 target 自动计算关闭，跳过 Final Value 写回。
- 如果 target 自动计算开启，且当前 Final Value 是非空不可解析文本，跳过 Final Value 写回。
- 如果 target 自动计算开启，且 Calculated Final Value 存在，把 Calculated Final Value 写入 Final Value。
- 如果 target 自动计算开启，且 Calculated Final Value 不存在，把 Final Value 写为空值。

`reconcileFinalInput`、`deleteSpecialBase`、`enableAutoCalculationForTarget`、`disableAutoCalculationForTarget` 这类 helper 不应被视为同步完成点。它们要么成为同步边界内部步骤，要么调用后必须继续进入统一同步边界，由同步边界产出最终稳定 sheet data。

## 全量重算规则

同步边界发生时，系统应对 Modifier Target Universe 中的所有 target 执行 normalization 和 derivation，而不是只处理看起来被当前 action 影响的 target。

自动计算开关不影响 Source State 更新、active base 归一化、Reference Total 计算或 Calculated Final Value 计算。它只影响 Final Writeback 阶段是否把 Calculated Final Value 写回 Final Value。

关闭自动计算的 target 仍应把 normalized activeBaseId 写回 `modifierState`。Final Value 被锁定，但 active base state 不被锁定。

原因：

- 当前角色卡规模很小，全量重算性能压力可接受。
- modifier source 之间存在间接影响，局部判断容易漏。
- 当前 `applyAutoCalculationForTargets` 已经接近全量扫描模型。
- 全量重算更容易验证和维护。

同步边界是：

```text
全量扫描 Modifier Target Universe 中的所有 target
归一化所有 target 的 Source State
派生所有 target 的 Reference Total 和 Calculated Final Value
只把 Calculated Final Value 写回自动计算开启的 target
```

不是：

```text
所有 target 都强制改 Final Value
```

## 同步边界事件

同步边界事件不由 UI 事件名称决定，而由行为是否改变 modifier 派生链决定。

如果一次行为可能改变以下任一内容，它就是 modifier-aware 行为，必须在 primary mutation 完成后进入自动计算同步边界：

- provider/source entries。
- Reference Total。
- Calculated Final Value。
- Final Value reconciliation 语义。
- Other Adjustments。
- active base。
- `modifierState` 中会影响 target 如何消费 entries 的状态。

当前阶段不引入全局 sheetData watcher，也不做字段级 diff 监听。

执行模型是：

```text
modifier-aware store action
  -> 执行行为本身的 sheetData mutation
  -> 调用 automatic calculation boundary
  -> commit synced sheetData
```

plain sheet action 不进入 boundary。`setSheetData` 保留为低层 escape hatch，不作为新的 modifier-aware 业务入口。

以下是当前必须纳入自动计算边界的行为 context。

### 更新职业来源

包括：

- 更换职业。
- 删除职业。
- 导入或替换角色卡后职业来源变化。
- 主卡组中职业卡变化。

当前职业 base 从 `sheetData.cards` 中 `type === "profession"` 的卡派生，因此影响主卡组职业卡的 `selectCardForSlot`、`selectCharacterChoiceCard`、`clearCharacterChoiceCard`、`deleteCard`、`moveCard` 也属于这个行为 context。

### 更新等级

包括：

- 修改等级。
- 等级进入回调自动化。
- 等级提供的阈值 modifier。
- 等级提供的熟练度 base / modifier。
- 5 级和 8 级清理属性升级标记等等级自动化。

等级行为先执行等级自身的自动化，再进入自动计算同步边界。

### 更新装备来源

包括：

- 主武器。
- 副武器。
- 护甲。
- 装备自定义基础值。
- 装备自定义 modifier。
- 从模板选择装备。
- 从自定义 payload 创建装备。
- 通过 provider 面板增删改装备 modifier。

这些行为之所以是同步边界，不是因为 UI 动作本身特殊，而是因为它们修改 `equipment` 中会被 registry 派生成 base / modifier entries 的 source。

当前 registry 只消费主武器、副武器和护甲的装备 modifier entries。备用武器是否影响 Calculated Final Value，取决于它是否被建模为当前生效 source；如果未来纳入生效 source，也必须进入同一边界。

### 用户选择升级选项

包括：

- 勾选或反选固定 target 升级。
- 选择属性升级。
- 选择经历升级。
- 标准 / 自由升级模式下的属性升级标记行为。
- 取消升级时移除对应 provider entries。

升级行为修改 `upgradeStates`，registry 再从 `upgradeStates` 派生升级 provider entries。

### 用户维护 base / modifier 来源

包括：

- 添加、删除、修改 user base。
- 添加、删除、修改 user modifier。
- 切换 active base。
- 删除 manual base / estimated base。
- 清理删除 entry 后遗留的 entry state。
- 未来如果重新引入 entry enable/disable，也属于这个行为 context。

删除 active base 后：

1. 如果同 target 还有其他 base，active base 顺延到另一个可用 base。
2. 如果没有任何 base，Reference Total 消失。
3. 自动计算开启时，Calculated Final Value 不存在，Final Value 写为空。

### 用户维护 Other Adjustment

包括：

- 新增、编辑、删除 `未知迁移差额`。
- 新增、编辑、删除 `用户手动修改终值`。
- 物化或删除 `自动计算暂停期间差额`。

自动计算开启时，删除任何 Other Adjustment 都应立刻按剩余 Reference 和剩余 Other Adjustments 重算 Calculated Final Value，并写回 Final Value。

自动计算关闭时，删除可编辑 Other Adjustment 不写回 Final Value；剩余差距由 Final Value 和 Calculated Final Value 派生出的 `自动计算暂停期间差额` 接住。

### Final Value 提交

用户提交 Final Value 是同步边界。

系统应先进入 Final Value 提交行为，再在行为内部判断提交值是否可解析。不能先根据可解析性决定是否进入同步边界。

`finalValueSubmitted` 边界必须以提交前已经同步稳定的 sheet data 作为输入，并由 intent 携带用户提交值。系统不能先把提交值写进 sheet data，再让边界从新旧 sheet data diff 或当前 Final Value 反推用户意图。

如果 `finalValueSubmitted` 收到的 sheet data 已经不是稳定状态，这是边界遗漏或 escape hatch 输入造成的缺陷状态。实现可以在解释提交值前先按当前 Source State 修复 reference / active base / writeback 状态，但这只是防御性修复；不能把“不稳定状态下的提交”设计成正常业务路径。

包括：

- 属性输入框。
- 经历数值输入框。
- 闪避、护甲、阈值、HP、Stress、熟练度等 target 输入。
- 熟练度 checkbox 点击。
- HP / Stress max 输入。
- 清空 Final Value。
- 不可解析 Final Value 改成数字或清空。

自动计算开启时：

1. 先确保 target 处于稳定同步状态。
2. 读取 intent 中的 submitted value。
3. 根据 submitted value 判断可解析性。
4. 如果提交值是可解析数字，判断当前是否有 Reference Total。
5. 记录用户意图：
   - 无 Reference Total：创建或更新 manual base。
   - 有 Reference Total：创建或更新 `用户手动修改终值`。
6. 进入全量同步边界。

如果提交值是不可解析文本或空值，也仍然进入全量同步边界：

- 不可解析文本会阻止 Calculated Final Value 写回 Final Value。
- 空值在有 Reference Total 时会被 Calculated Final Value 接管；无 Reference Total 时保持空。

自动计算关闭时：

- 只写 locked Final Value。
- 不物化 `用户手动修改终值`。
- 如果 locked Final Value 可解析且 Calculated Final Value 存在，展示层可以派生 `自动计算暂停期间差额`。

### 自动计算开关

包括：

- 关闭自动计算。
- 开启自动计算。
- 开启时物化 `自动计算暂停期间差额`。
- 关闭时删除已物化的 `自动计算暂停期间差额`。

自动计算开关行为会改变 Final Value 是否允许被 Calculated Final Value 写回，因此必须进入边界。

### Store Replacement

`replaceSheetData` 表示 current-schema sheet data 进入 store，因此它是同步边界。

短期内，`replaceSheetData` 应收紧为 current-schema replacement boundary：

- 它不负责解释 raw legacy data。
- legacy / external import 必须先经过 validation / migration，生成 current-schema sheet data。
- 它在 commit 到 store 前必须运行自动计算同步边界。
- 它的产物必须是稳定 sheet data，不能把半同步 replacement 暴露给用户。

短期不要求移除所有直接 sheet data 写入，也不要求所有 `setSheetData` 调用立刻迁移；本阶段优先收口整张卡 replacement 这个高风险入口。

长期方向是逐步减少直接 sheet data 写入。业务路径应通过 explicit action 表达 intent；`setSheetData` 退化为低层 escape hatch、repair、migration 辅助或测试工具。

但是 legacy data 不能直接 replace 后同步。正确顺序是：

1. 读取 legacy data。
2. 执行 migration。
3. migration 创建当前 schema 的 providers、bases、target state 和 Other Adjustments。
4. migration 负责保留 legacy Final Value 的语义。
5. current-schema sheet data 进入 store。
6. store replacement 触发同步边界。

replace sync 可以写回自动计算开启 target 的 Final Value，但 migration 必须先完成 legacy Final Value preservation，使 replace sync 不产生意外 Final Value 跳变。

### 通用 setSheetData

`setSheetData` 是低层通用浅合并入口，不应被定义为通用自动计算同步边界。

原因：

- 它可以用于名字、金币、当前 HP 勾选等无关字段。
- 它不表达具体业务意图。
- 无脑同步会制造隐式副作用。

新的 modifier/source/Final Value 业务路径禁止依赖裸 `setSheetData`。它们应使用明确 store action，并由明确 action 进入同步边界。

长期方向上，直接让 UI 或业务代码写 sheet data 本身就是危险行为。sheet data 是持久化模型，不应成为业务语义入口。业务路径应逐步迁移到能表达 intent 的 action，再由 action 决定是否进入自动计算同步边界。

`setSheetData` 可以保留为低层 escape hatch，用于：

- 与 modifier 系统无关的简单字段。
- import / migration / repair 等明确的底层流程。
- 测试中刻意构造状态。

但只要一次写入可能改变 Source State、Derived State、Final Value reconciliation 语义、Other Adjustments、active base 或 autoCalculation state，就不应通过裸 `setSheetData` 完成。

## Final 输入语义

用户不需要理解 active base。

自动计算开启时，用户看到的 Final Value 输入框应满足：

- 空值表示系统当前没有可计算 Reference Total，需要用户提供基础值。
- 非空数字表示当前 Final Value 是可解析数字，用户修改它是在提交新的 Final Value。
- 非空不可解析文本表示当前 Final Value 被用户文本阻塞，系统不能覆盖它。

### 无 Reference Total

自动计算开启，用户提交 numeric Final Value，且当前没有 Reference Total：

- 提交值成为 manual base。
- 不创建 `用户手动修改终值`。
- 进入同步边界。
- Calculated Final Value 按 manual base + modifiers + Other Adjustments 重算，并写回 Final Value。

示例：

```text
当前：闪避无 base，modifier -2，Final Value 空
用户输入：5
结果：创建 manual base 5，Calculated Final Value 为 3，并写回 Final Value
```

### 有 Reference Total

自动计算开启，用户提交 numeric Final Value，且当前有 Reference Total：

- 不创建 manual base。
- 创建或更新 `用户手动修改终值`。
- 差额计算应排除旧的 `用户手动修改终值` 自身，避免重复计算。
- 进入同步边界。
- 写入 `用户手动修改终值` 后，Calculated Final Value 应与用户提交值一致，并写回 Final Value。

### 清空 Final Value

自动计算开启时，用户清空 Final Value：

- 如果有 Reference Total，系统接管并把 Calculated Final Value 写回 Final Value。
- 如果没有 Reference Total，Calculated Final Value 不存在，Final Value 保持空。
- 清空本身不创建 manual base，也不创建 Other Adjustment。

自动计算关闭时，用户清空 Final Value：

- locked Final Value 变为空。
- 不把 Calculated Final Value 写回 Final Value。
- 因为空值不可计算 numeric gap，不派生 `自动计算暂停期间差额`。

## 不可解析 Final Value

不可解析 Final Value 是系统当前无法参与数值计算的真实存储文本。

原则：

```text
不可解析 Final Value 不解释成任何东西，也不解释成 0。
```

它不是：

- manual base。
- `用户手动修改终值`。
- `未知迁移差额`。
- `自动计算暂停期间差额`。
- 空值。
- 0。

只有 Final Value 允许保留不可解析文本。base、modifier 和 Other Adjustment 必须是数字；无法解析时应拒绝、忽略或转成 `null` / 不存在，不能保存不可解析文本。

### 同步期间遇到不可解析 Final Value

同步边界仍然发生。

系统仍应：

- 更新 source。
- 重新计算 reference。
- 归一化 active base。
- 更新或删除 Other Adjustments。

但在写回 Final Value 时，如果当前 Final Value 是非空不可解析文本，则该 target 的写回被阻塞：Calculated Final Value 会被计算出来，但不会覆盖当前 Final Value。

不可解析文本只阻塞 Calculated Final Value 写回 Final Value，不阻塞 reference/source 系统。即使 Final Value 不可解析，active base 也必须在同步边界中被归一化；旧 active base 消失时仍应顺延到当前有效 base，或进入无 base 状态。

### 自动计算关闭期间

如果自动计算关闭且 Final Value 不可解析：

- 不派生 `自动计算暂停期间差额`。
- source/Reference 可以继续变化。
- Final Value 文本保持 locked。

如果用户把不可解析 Final Value 改成可解析数字：

- locked Final Value 变成该数字。
- 如果 Calculated Final Value 存在，派生 `自动计算暂停期间差额` 可以重新出现。
- 该派生差额不保存。
- 它不是 `用户手动修改终值`。

如果用户清空不可解析 Final Value：

- locked Final Value 变为空。
- 不派生差额。

### 从关闭切到开启

如果 Final Value 不可解析时开启自动计算：

- 自动计算状态可以切到开启。
- 不物化 `自动计算暂停期间差额`。
- 保留不可解析文本。
- 后续同步边界仍执行，但该 target 的 Calculated Final Value 写回继续被不可解析文本阻塞。

### 自动计算开启期间

如果自动计算开启且 Final Value 不可解析：

- source/Reference/active base/Other Adjustment 变化仍正常处理。
- Final Value 不被覆盖。
- 用户清空文本后：
  - 有 Reference Total：立刻由自动计算把 Calculated Final Value 写回 Final Value。
  - 无 Reference Total：Calculated Final Value 不存在，Final Value 保持空。
- 用户提交可解析数字后：
  - 有 Reference Total：创建或更新 `用户手动修改终值`。
  - 无 Reference Total：创建 manual base。
  - 然后进入同步边界。

## Active Base 归一化

同步边界中必须归一化 active base：

1. 如果保存的 active base 仍存在且有效，继续使用它。
2. 如果保存的 active base 消失或缺失，但同 target 有其他 base，顺延到稳定排序后的可用 base。
3. 如果没有任何 base，Reference Total 不存在。

这条规则适用于所有 source 类型，不应为某个 provider 写特殊逻辑。

稳定排序采用当前 registry entry 排序规则：

1. `priority` 升序。
2. `priority` 相同时按 entry `id` 升序。

该排序规则只定义 fallback 选择，不表示 source action 可以绕过统一 active base 归一化。

## 与其他项模型的关系

本文不改变三类 Other Adjustment 的定义：

- `未知迁移差额`
- `用户手动修改终值`
- `自动计算暂停期间差额`

但本文进一步固定它们与同步边界的关系：

- `用户手动修改终值` 只在自动计算开启且用户提交 numeric Final Value，并且当前有 Reference Total 时物化。
- `自动计算暂停期间差额` 只在自动计算关闭期间派生；它来自可解析 Final Value 与 Calculated Final Value 之间的差距。
- 开启自动计算时，如果 Final Value 可解析、Calculated Final Value 存在且差额非 0，才物化保存 `自动计算暂停期间差额`。
- 不可解析 Final Value 不能生成、更新或物化任何差额。

## 当前实现差距

当前实现已经有部分能力：

- `applyAutoCalculationForTargets` 会扫描 modifier entries 和 targetStates，并对自动计算开启的 target 写回 Final Value。
- 它会在 Final Value 非空且不可解析时跳过 Calculated Final Value 写回。
- 它会记录当前 active base。

但当前实现仍存在不一致路径：

- `applyAutoCalculationForTargets` 当前仍按自动计算开启状态过滤 target，不能为关闭 target 写回 normalized activeBaseId。
- `applyAutoCalculationForTargets` 当前扫描范围接近全量，但尚未显式覆盖完整 Modifier Target Universe。
- `commitModifierTargetValue` 调用 `reconcileFinalInput` 后没有统一进入全量同步边界。
- `removeSpecialBaseContribution` 删除 special base 后没有统一进入全量同步边界。
- `updateHPMax`、`updateStressMax`、`updateProficiency` 的自动计算路径依赖局部 reconciliation。
- `replaceSheetData` 当前不是自动计算同步边界。
- `setSheetData` 是低层 escape hatch，不应继续用于 modifier/source/Final Value 业务路径。

## 实现风险提示

以下风险不改变本文设计结论，但实现计划应显式处理。

### Disabled Target 行为会造成测试迁移

旧实现把自动计算关闭的 target 排除在 `applyAutoCalculationForTargets` 之外，因此关闭 target 通常不会产生任何对象变更。

新设计要求关闭 target 仍参与 normalization / derivation，并写回 normalized activeBaseId。实现后，以下旧假设需要更新：

- 自动计算关闭不等于跳过同步边界。
- disabled target 可能因为 active base 顺延或 stale activeBaseId 清理而修改 `modifierState`。
- 只要 Final Value 保持 locked，就不应把这些 `modifierState` 变化视为违反“关闭自动计算”。

### Final Value 提交路径需要从 helper 升级为 boundary intent

当前 `commitModifierTargetValue` 仍在 store action 中直接解释输入，并把 `reconcileFinalInput` 当成局部完成点。

实现时需要避免以下旧路径继续存在：

- numeric input 只调用 `reconcileFinalInput`，但不进入全量边界。
- blank / unparseable input 直接写 Stored Final Value 后提交，导致有 Reference Total 时仍暴露空值或 stale 文本。
- `reconcileFinalInput` 因不可解析输入直接返回原数据，从而让不可解析文本阻塞 source/reference/active base 更新。

`finalValueSubmitted` 应作为明确 intent，基于提交前稳定 sheet data 和 submitted value 解释用户意图。

### 删除最后一个 base 的旧行为会失效

旧实现和部分测试允许删除最后一个 manual / estimated base 后保留旧 Final Value。

新设计要求：

- enabled target 无 Reference Total 时，Calculated Final Value 不存在，Final Value 写为空。
- disabled target 无 Reference Total 时，Final Value 保持 locked，但 active base state 仍归一化为无 base。

实现计划应更新旧测试，避免继续把 stale Final Value 当成稳定状态。

### replaceSheetData 是高风险入口

`replaceSheetData` 当前只做局部同步后直接 commit。

实现时应先把它收口为 current-schema replacement boundary：输入必须是 migration / validation 后的 current-schema sheet data，commit 前必须经过自动计算同步边界。

### modifierState 清理会改变持久化形态

新设计要求：

- `autoCalculation: true` 不作为独立业务偏好持久化。
- 空 target state 应被删除。
- stale activeBaseId 应顺延或删除。
- 不属于当前生效 registry 的 `entryStates` 应被删除。

因此现有测试或计划文档中如果把 `{ autoCalculation: true }` 当作常规持久化形态，需要更新为默认开启语义，或明确标注为 legacy / input fixture。

### Modifier Target Universe 需要显式实现

当前扫描逻辑接近全量，但仍依赖 entries 和 targetStates。

实现时需要显式构造 Modifier Target Universe，包括固定内建 target、五个经历 target，以及 entries / targetStates / Other Adjustments 引用的 target。否则 replace / import 修复路径仍可能漏掉没有现存 targetState 的 stale / blank Final Value。

## 验证范围

实现时至少覆盖以下行为。

### Manual Base

- 自动计算开启、无 Reference Total、用户输入 numeric Final Value，创建 manual base。
- 创建 manual base 后立即全量同步，Calculated Final Value 按 base + modifiers + Other Adjustments 重算并写回 Final Value。
- 删除最后一个 manual base 后，如果没有其他 base，Reference Total 消失，Calculated Final Value 不存在，Final Value 写为空。
- 再次输入 numeric Final Value，再次创建 manual base 并重算。

### Manual Final Adjustment

- 自动计算开启、有 Reference Total、用户输入 numeric Final Value，创建或更新 `用户手动修改终值`。
- 重复编辑 Final Value 不重复累计旧 `用户手动修改终值`。
- 输入值等于 Reference Total + 其他非 manual Other Adjustments 时，移除 `用户手动修改终值`。

### 删除同步边界

- 删除 base 后顺延到其他 base 并重算。
- 删除最后一个 base 后 Calculated Final Value 不存在，Final Value 变空。
- 删除 modifier 后全量重算。
- 删除 Other Adjustment 后全量重算。
- 自动计算关闭时删除 editable Other Adjustment 不写回 Final Value，但仍进入同步边界并归一化 Source State / active base。

### 不可解析 Final

- 自动计算开启时，不可解析 Final Value 阻止 Calculated Final Value 写回，但 source/reference/active base 仍更新。
- 自动计算关闭时，不可解析 Final Value 不派生 `自动计算暂停期间差额`。
- 不可解析 Final Value 改成数字后：
  - 自动计算开启：按 numeric Final Value submission 处理。
  - 自动计算关闭：locked Final Value 更新，并在可计算时派生暂停期间差额。
- 不可解析 Final Value 清空后：
  - 自动计算开启且有 Reference Total：Calculated Final Value 写回 Final Value。
  - 自动计算开启且无 Reference Total：Calculated Final Value 不存在，Final Value 保持空。
  - 自动计算关闭：Final Value 保持空。
- 不可解析 Final Value 下开启自动计算，不物化暂停期间差额。

### Store Replacement

- current-schema sheet data replace 后进入全量同步边界。
- migration 必须先生成 providers / bases / Other Adjustments，再 replace。
- replace sync 不应造成已被 migration 正确解释的 legacy Final Value 跳变。

### Modifier State Cleanup

- disabled target 的 stale activeBaseId 应顺延或清除，但 Final Value 保持 locked。
- `entryStates` 中不属于当前生效 registry 的 entry state 应被清理。
- `targetStates` 中的空状态和 stale activeBaseId 应被清理。
- `autoCalculation: true` 不应作为独立业务偏好持久化。

### Modifier Target Universe

- 同步边界应覆盖固定内建 target、五个经历 target，以及当前 entries / targetStates / Other Adjustments 引用的 target。
- 替换或导入 current-schema sheet data 后，即使 target 没有现存 `targetStates`，也应按 Modifier Target Universe 修复 stale / blank Final Value。

## 非目标

本阶段不做：

- 新增复杂事件总线。
- 优化为局部 target 重算。
- 改变 Other Adjustments 的存储结构。
- 重新设计 target popover UI。
- 让 base / modifier / Other Adjustment 保存不可解析文本。
- 让 `setSheetData` 成为通用同步边界。
