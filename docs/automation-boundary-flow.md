# 自动化同步边界全流程说明

日期：2026-05-20

本文说明当前实现中 modifier-aware 自动化在进入自动计算同步边界前后如何收口成稳定的角色卡数据。本文是实现阅读说明，不替代 `CONTEXT.md` 中的领域术语，也不替代 `docs/superpowers/specs/2026-05-19-automatic-calculation-boundary-design.md` 中的设计约束。

## 范围

这里的“自动化同步边界”指当前代码里的共享执行器：

```ts
applyAutoCalculationForTargets(sheetData): SheetData
```

定义位置：`automation/core/target-sync.ts`。

它负责在一次 modifier-aware 行为之后，全量扫描当前角色卡的 Modifier Target Universe，归一化 Source State，重新派生 Reference Total / Calculated Final Value，并按自动计算状态决定是否写回 Stored Final Value。

本文把流程分成两层：

- 边界前：store action 或 helper 先把行为意图写成明确的 Source State 变化。
- 边界内：`applyAutoCalculationForTargets` 对整张角色卡做统一归一化和写回。

## 总览

完整链路可以概括为：

```text
用户或系统行为
  -> store action / automation action
  -> 行为解释 helper
  -> applyAutoCalculationForTargets
  -> collectModifierEntries
  -> normalize entryStates
  -> 构建 Modifier Target Universe
  -> 每个 target 计算 Reference Summary
  -> 归一化 targetState
  -> Final Writeback
  -> 提交稳定 SheetData
```

边界的核心原则是：modifier-aware 行为不能把半同步状态提交进用户可见 store。可以在内存中的 draft sheet data 里产生短暂中间态，但最终提交的 `sheetData` 必须已经过统一边界。

## 主要入口

当前 `lib/sheet-store.ts` 中多数会影响 Source State、Derived State 或 Final Value 的 action 都会调用 `applyAutoCalculationForTargets`。

常见入口包括：

- `replaceSheetData`：当前 schema 的整表替换进入边界后再提交。
- `updateLevel`：先运行等级进入自动化，再更新等级字段，最后进入边界。
- `selectArmor` / `updateArmorBaseMax` / `updateArmorBaseThresholds` / `updateArmorBaseThresholdSide`：更新护甲 Source State 后进入边界。
- `selectWeaponSlot` / `updateActiveWeaponSlot` / `swapInventoryWeaponToActiveSlot`：更新当前装备来源后进入边界。
- `setUpgradeState`：升级状态变更后进入边界，由 registry 根据 `upgradeStates` 重新生成升级来源。
- `handleProfessionChange` / 主卡组 `updateCard` / 主卡组 `deleteCard` / 跨卡组 `moveCard`：职业卡或聚焦卡组变化可能影响职业基础来源，因此进入边界。
- `commitModifierTargetValue`：用户提交 Final Value 时先做 final input reconciliation，再进入边界。
- `setTargetAutoCalculation`：开关自动计算时先物化或移除相关差额，再进入边界。
- `upsertUserModifierContribution` / `removeUserModifierContribution`：用户来源变化后进入边界。
- `upsertOtherAdjustment` / `removeOtherAdjustment`：Other 调整变化后进入边界。
- `addEquipmentModifierContribution` / `updateEquipmentModifierContribution` / `changeEquipmentModifierContributionTarget` / `removeEquipmentModifierContribution`：装备 contribution 变化后进入边界。

仍有一些普通字段更新不会进入边界，例如姓名、金币、希望、HP 当前格等。它们不是 modifier-aware 行为，不影响自动计算 Source State。

## 边界前的行为解释

`applyAutoCalculationForTargets` 本身主要做模型归一化、派生和写回。部分行为的业务意图会在调用边界前由 helper 明确写入 draft sheet data。

### Final Value 提交

入口是 `commitModifierTargetValue`，实际解释逻辑在 `applyModifierTargetValueSubmission` 和 `automation/core/final-input-reconciliation.ts`。

流程如下：

1. 读取目标当前自动计算状态。
2. 尝试把用户输入解析为数字表达式。
3. 如果自动计算关闭：
   - 可解析数字直接写入 Stored Final Value。
   - 支持文本保存的 target 可以保留不可解析文本。
   - 然后进入边界。边界仍会归一化 Source State，但不会改写关闭 target 的 Final Value。
4. 如果自动计算开启且输入不可解析：
   - 支持文本保存的 target 先写入该文本。
   - 然后进入边界。边界会检测非空不可解析 Final Value，并跳过该 target 的 Final Writeback。
5. 如果自动计算开启且输入是数字：
   - 进入 `reconcileFinalInput`。
   - 当前没有 active base 或可顺延 base 时，创建或更新 `手动基础值`。
   - 当前有 base 时，创建或更新 `手动修改终值` Other Adjustment，使提交的 Final Value 得到解释。
   - 然后进入边界，由边界重新计算并写回最终稳定值。

这里有一个重要语义：用户提交的数字不是先当作普通字段写死再靠 diff 猜意图，而是作为明确行为被解释成 Manual Base 或 Manual Final Adjustment。

### 自动计算开关

入口是 `setTargetAutoCalculation`。

开启自动计算时调用 `enableAutoCalculationForTarget`：

- 如果当前 Final Value 可解析，且存在 Reference Total，则把自动计算关闭期间的差额物化为 `自动计算暂停期间差额`。
- 如果 Final Value 不可解析，无法物化数值差额，只记录自动计算开启意图。
- 随后进入边界，边界会清理默认开启状态，并在允许时写回 Calculated Final Value。

关闭自动计算时调用 `disableAutoCalculationForTarget`：

- 删除已经保存的 `自动计算暂停期间差额`。
- 在 `targetStates[target]` 中保留 `autoCalculation: false`。
- 随后进入边界。边界继续归一化 active base 和 reference，但跳过 Final Writeback。

### 删除特殊基础值

入口是 `removeSpecialBaseContribution`，调用 `deleteSpecialBase`。

该 helper 会先删除指定的特殊 base contribution，再移除旧的未归因 delta contribution，并尝试选择同 target 的其他可用 base。如果没有 base，只保留必要的自动计算状态。随后进入边界，边界决定 Final Value 是顺延到新 base、清空，还是保持锁定值。

### Source State 直接变更

装备、职业、等级、升级项、用户 contribution、Other Adjustment 等变更通常不需要额外解释。它们先把对应 Source State 写入 draft sheet data，然后直接进入边界。

## 边界内流程

`applyAutoCalculationForTargets` 的实现可以按以下阶段理解。

### 1. 清理旧未归因 contribution

边界先调用 `withoutLegacyUnattributedDeltaContributions`，删除旧模型里保存在 `userModifierContributions` 中的 `未归因差额` contribution。

当前模型中，未归因差额属于 Other Adjustment 的 `unattributedDifference`，不再作为普通 modifier contribution 存在。

### 2. 收集当前 registry entries

边界调用 `collectModifierEntries(next)`，把当前有效 Known Sources 统一转成 `ModifierEntry[]`。

来源包括：

- 系统来源：`collectSystemModifierEntries`。
- 当前装备来源：主武器、副武器、当前护甲。
- 用户来源：`userModifierContributions`。

系统来源包括：

- 职业卡提供的起始闪避和起始生命上限。
- 当前护甲核心字段提供的护甲值、重伤阈值、严重阈值 base。
- 当前等级提供的阈值 modifier、基础压力上限、基础熟练度、等级门槛熟练度 modifier。
- `upgradeStates` 中已勾选升级项生成的升级 modifier。

装备来源只收集当前生效槽位：

- `weaponSlots.primary`
- `weaponSlots.secondary`
- `armorSlot`

备用武器的 contribution 保存在装备槽里，但不进入当前 registry。它换入主/副武器后才成为当前 Known Source。

### 3. 归一化 entryStates

`normalizeEntryStates` 会用当前 registry entry id 集合过滤 `modifierState.entryStates`。

规则是：

- 当前 registry 中存在的 entry state 保留。
- 已经不属于当前 registry 的 entry state 删除。

这避免备用武器、被删除 contribution、旧升级项等不再生效的 entry state 长期残留。

### 4. 构建 Modifier Target Universe

边界不是只同步刚刚改过的 target，而是构建完整的有限 target 集合。

当前 universe 来源包括：

- 固定 target：`evasion`、`armorMax`、`minorThreshold`、`majorThreshold`、`hpMax`、`stressMax`、`proficiency`、六属性 value。
- 五个经历数值 target：`experienceValues.0` 到 `experienceValues.4`。
- 当前 registry entry 引用到的 target。
- `modifierState.targetStates` 中已有状态的 target。
- `otherAdjustments` 中引用到的 target。

全量 universe 的意义是修复 stale state：即使当前 action 看起来只改了装备，边界也会顺手清理已经无效的 active base、默认开启状态、过期 entry state 和开启 target 的陈旧 Final Value。

### 5. 每个 target 计算 Reference Summary

边界对 universe 中每个 target 调用 `calculateReferenceSummary`。

Reference Summary 的主要内容包括：

- 该 target 的所有 entries。
- base entries。
- modifier entries。
- enabled modifiers。
- active base。
- Reference Total。
- Other Adjustments。
- Other Total。
- Calculated Final Value。
- 当前 Stored Final Value 与 Calculated Final Value 的差额。

当前排序规则是：

```text
priority 从小到大
priority 相同则按 id 字符串排序
```

active base 选择规则是：

1. 如果 `targetStates[target].activeBaseId` 指向当前可用 base，使用它。
2. 否则使用排序后的第一个 base。
3. 如果没有 base，Reference Total 和 Calculated Final Value 都不存在。

Reference Total 的计算是：

```text
Reference Total = active base value + enabled modifier values
```

Calculated Final Value 的计算是：

```text
Calculated Final Value = Reference Total + Other Adjustment values
```

当前实现中 modifier entries 全部视为 enabled。`disabledEntries` 字段存在于 summary 结构中，但当前计算未从 entry state 禁用 modifier。

### 6. 归一化 targetState

每个 target 算出 summary 后，边界调用 `writeNormalizedTargetState`。

归一化规则是：

- 如果有 active base，则保存 `activeBaseId`。
- 如果该 target 自动计算关闭，则保留 `autoCalculation: false`。
- 不保存 `autoCalculation: true`，因为自动计算默认开启。
- 如果 target state 没有任何业务含义，则从 `targetStates` 中删除。
- 如果保存的 active base 已失效，但还有其他 base，则顺延到当前 summary 选择出的 base。
- 如果没有可用 base，则删除无效 active base。

这一步即使 target 自动计算关闭也会执行。关闭自动计算只锁住 Stored Final Value，不阻止 Source State 和 active base 归一化。

### 7. Final Writeback

归一化完 targetState 后，边界决定是否写回 Stored Final Value。

写回规则：

1. 如果 target 自动计算关闭，跳过写回。
2. 如果 target 自动计算开启，但当前 Final Value 是非空不可解析文本，跳过写回。
3. 如果 target 自动计算开启，且 Calculated Final Value 存在，写入 Calculated Final Value。
4. 如果 target 自动计算开启，但 Calculated Final Value 不存在，写入空值。

写入目标字段时通过 `writeTargetValue` 处理不同 target 的真实存储结构：

- 属性 target 写入对应属性对象的 `value`。
- 经历 target 写入 `experienceValues[index]`。
- `proficiency` 写成 6 个布尔格。
- `armorMax`、`hpMax`、`stressMax` 写成 number 或空值。
- `evasion`、阈值等字段写成 string。

如果写的是 `hpMax` 或 `stressMax`，边界会继续调用 `applyHpStressMaxInvariant`，确保当前已勾选的 HP / Stress 格不会超过新的上限。

### 8. 幂等返回

边界内部维护 `changed` 标记。如果没有任何清理、归一化或写回发生，会返回原始 `sheetData` 引用；如果发生变化，则返回新的 `SheetData`。

这让边界可以频繁调用，但仍尽量避免无意义的对象替换。

## 数据层分工

当前自动化模型可以按三层理解：

- Source State：系统、装备、升级、用户 contribution、Other Adjustment、active base、自动计算状态。
- Derived State：Reference Total 和 Calculated Final Value。
- Stored State：角色卡真实保存并展示的 Final Value。

边界只允许 Derived State 从 Source State 派生，不能反过来把 Calculated Final Value 当成新的 Source State。只有明确的行为解释，例如用户提交 Final Value，才会创建 Manual Base 或 Manual Final Adjustment。

## 典型场景

### 用户选择护甲

```text
selectArmor
  -> 创建新的 armorSlot
  -> applyAutoCalculationForTargets
  -> registry 根据 armorSlot 生成 armorMax / threshold base
  -> targetState active base 归一化
  -> 自动计算开启的 armorMax / threshold 写回
```

### 用户把闪避值输入为 15

```text
commitModifierTargetValue("evasion", "15")
  -> applyModifierTargetValueSubmission
  -> reconcileFinalInput
  -> 有 base：写入 Manual Final Adjustment
     无 base：写入 Manual Base
  -> applyAutoCalculationForTargets
  -> 重新计算 evasion
  -> 自动计算开启且未被不可解析文本阻塞时写回
```

### 用户关闭自动计算后换装备

```text
setTargetAutoCalculation(target, false)
  -> disableAutoCalculationForTarget
  -> 保存 autoCalculation: false
  -> applyAutoCalculationForTargets

后续装备变更
  -> Source State 更新
  -> applyAutoCalculationForTargets
  -> Reference / active base 继续更新
  -> Final Value 不写回，保留锁定值
```

### 用户重新开启自动计算

```text
setTargetAutoCalculation(target, true)
  -> enableAutoCalculationForTarget
  -> 如果可计算差额，物化 unattributedDifference
  -> applyAutoCalculationForTargets
  -> 清理默认开启状态
  -> 写回 Calculated Final Value
```

## 当前实现边界

需要注意的当前实现细节：

- `applyAutoCalculationForTargets` 目前没有显式 intent 参数。它更准确地说是自动计算同步执行器，而不是完整的自动化边界。它只接收已经被调用方解释过的 `SheetData`，不接收本次 modifier-aware 行为的 intent；因此 Final Value 提交、自动计算开关、特殊 base 删除等行为解释仍分散在前置 helper 中。
- `setSheetData` 是低层 escape hatch，不会统一进入边界；modifier-aware UI 不应依赖它改 modifier 相关字段。
- `reconcileModifierState` 主要用于迁移和 schema 归一化，它不是完整自动计算同步边界。
- 备用武器不进入当前 registry，相关 entry state 会被边界清掉；换入主/副武器后重新作为当前来源参与计算。
- Final Value 的不可解析文本只阻止该 target 的 Final Writeback，不阻止 registry 收集、active base 归一化或其他 target 写回。

当前收口形态的主要摩擦是调用方必须知道正确顺序：先用对应 helper 解释行为，再调用 `applyAutoCalculationForTargets` 做统一归一化和写回。如果某个 modifier-aware 入口绕过了前置 helper，或只调用 helper 而没有继续进入同步执行器，就可能提交半同步状态。也就是说，当前实现把“发生了什么”和“如何同步”拆在多个调用点上，测试和维护时需要同时检查 store action、前置 helper 和同步执行器。

长期更合理的形状是让统一入口接收显式 intent，例如：

```ts
runModifierAutomationBoundary({
  sheetData,
  intent,
})
```

intent 可以表达：

- `{ type: "finalValueSubmitted", target, submittedValue }`
- `{ type: "autoCalculationToggled", target, enabled }`
- `{ type: "sourceMutated", source: "equipment" }`
- `{ type: "otherAdjustmentMutated", target }`
- `{ type: "storeReplaced", source: "currentSchema" }`

这样调用方只声明本次 modifier-aware 行为，行为解释、模型归一化、Reference Summary 派生和 Final Writeback 都收在同一个自动化边界 Module 里。

## 阅读入口

建议按以下顺序读代码：

1. `lib/sheet-store.ts`：看哪些 action 进入边界，以及哪些 helper 在边界前解释用户意图。
2. `automation/core/final-input-reconciliation.ts`：看 Final Value 提交、自动计算开关、特殊 base 删除如何转成 Source State。
3. `automation/core/target-sync.ts`：看边界执行器的完整归一化和写回流程。
4. `automation/core/registry.ts` 和 `automation/core/source-definitions.ts`：看 Known Sources 如何生成 registry entries。
5. `automation/core/reference-calculator.ts`：看 Reference Summary 如何计算。
6. `automation/core/target-accessors.ts`：看统一 target 如何读写到真实 `SheetData` 字段。
7. `automation/core/other-adjustments.ts` 和 `automation/core/special-contributions.ts`：看 Other Adjustment 与特殊用户 contribution 的身份规则。
