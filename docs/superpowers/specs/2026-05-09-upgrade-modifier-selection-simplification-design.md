# Upgrade Modifier Selection Simplification Design

日期：2026-05-09

> **状态：已过时。** 本文记录升级选项从“手填最终值”转为 selection/provider
> 模型的早期讨论。当前实现已经落地：属性和经历升级记录 selection，闪避升级不再弹
> 最终值输入框，取消属性/经历升级需要确认。当前行为以
> `components/character-sheet-page-two-sections/upgrade-section.tsx`、
> `components/upgrade-popover/attribute-upgrade-editor.tsx`、
> `components/upgrade-popover/experience-values-editor.tsx` 和
> `tests/integration/upgrade-cancel-flow.test.tsx` 为准。

## 目的

本文记录第二个待讨论改进点：在新的 modifier 系统下，升级选项不应继续要求用户手动填写升级后的新最终值。升级 UI 应从“选择并手填新数值”简化为“选择升级对象”，由系统记录一个固定的 `+1` upgrade modifier。

本文不是实现计划。本文只记录问题、方向和待讨论边界。

## 背景

当前升级相关 UI 仍保留旧的快照式交互：

- 属性升级：选择两个属性后，弹窗里仍显示输入框，用户需要手动填写升级后的属性值。
- 经历升级：选择两个经历后，弹窗里仍显示输入框，用户需要手动填写升级后的经历值。
- 闪避升级：弹窗里仍显示闪避输入框，用户需要手动确认或修改新的闪避值。
- 取消升级时，系统会尝试从当前最终值反向减回去。

这些行为来自旧自动化模型：升级动作直接修改最终字段，并且需要依靠用户填写或确认新的最终值。

新的 modifier 架构已经具备另一套表达方式：

- `automationSelections` 记录用户选择了哪个升级选项。
- selection params 记录选择对象，例如属性、经历索引或 `evasion`。
- registry 根据 selection 生成 `sourceType: "upgrade"` 的 modifier entries。

例如当前已经可以从 selection 推导出：

```text
upgrade:tier1-0-0:agility.value -> 升级：敏捷 +1
upgrade:tier1-0-0:strength.value -> 升级：力量 +1
upgrade:tier1-5-0:evasion -> 升级：闪避 +1
upgrade:tier2-6:proficiency -> 升级：熟练度 +1
```

因此，升级 UI 继续要求用户手动填写“新最终值”已经显得多余，并且容易造成来源解释和最终值编辑之间的语义混乱。

## 改进点

把参数化升级选项改成选择式交互：

```text
用户选择升级对象
-> 系统记录 automation selection
-> registry 提供 upgrade modifier entry
```

不再让用户在升级弹窗中手动填写升级后的最终值。

## 适用范围

本改进点主要覆盖：

- 两项未升级属性 `+1`。
- 两项经历值 `+1`。
- 闪避值 `+1`。

这些选项当前仍有明显的手填最终值 UI。

当前已经接近目标模式的选项：

- 生命槽上限 `+1`。
- 压力槽上限 `+1`。
- 熟练度 `+1`。

它们可以作为目标行为参考：用户勾选升级，系统知道 target 和固定增量，不需要额外输入新的最终值。

## 建议 UI 变化

### 属性升级

当前：

- 选择两个未升级属性。
- 每个选中属性旁边显示输入框和加减按钮。
- 用户点击“应用升级”后，把编辑值写入最终属性值。

建议：

- 只显示可选属性。
- 用户选择两个未升级属性。
- 不显示最终值输入框。
- 点击应用后，记录 selection：

```ts
{
  selected: true,
  params: {
    attributes: ["agility", "strength"],
  },
}
```

registry 生成两个 `+1` upgrade modifier。

### 经历升级

当前：

- 选择两个已有经历。
- 每个选中经历旁边显示经历值输入框和加减按钮。
- 用户点击应用后，把编辑值写入最终经历值。

建议：

- 只显示已有经历。
- 用户选择两个经历。
- 不显示经历值输入框。
- 点击应用后，记录 selection：

```ts
{
  selected: true,
  params: {
    experienceIndexes: [0, 2],
  },
}
```

registry 生成两个 `+1` upgrade modifier。

### 闪避升级

当前：

- 打开闪避升级弹窗。
- 弹窗显示当前闪避值输入框和加减按钮。
- 用户确认后写入最终闪避值。

建议：

- 该升级不需要弹窗。
- 点击或勾选该升级选项时，直接记录 selection：

```ts
{
  selected: true,
  params: {
    target: "evasion",
  },
}
```

registry 生成一个 `evasion +1` upgrade modifier。

## 是否同步最终值

这是本改进点中最重要的开放问题，也是后续“自动化系统如何演进”的独立议题。

有两种可选方向。

### 方案 A：继续同步最终值

用户选择升级对象后：

1. 记录 `automationSelections`。
2. registry 生成 upgrade modifier entry。
3. 系统同时把当前最终值自动 `+1`。

取消升级时：

1. selection 变为未选中。
2. registry 不再生成对应 entry。
3. 系统尝试把当前最终值自动 `-1`。

优点：

- 保持当前“最终值是事实”的架构。
- 角色卡主界面上的数值会立即变化。
- 改动范围相对较小。
- 和 HP、Stress、Proficiency 当前行为接近。

缺点：

- 仍然保留“自动化会写最终字段”的旧模式。
- 如果用户之后手动改过最终值，取消升级时继续 `-1` 可能仍有语义风险。
- modifier entry 和最终值之间仍可能出现未归因差额。

### 方案 B：不再同步最终值

用户选择升级对象后：

1. 只记录 `automationSelections`。
2. registry 生成 upgrade modifier entry。
3. 最终值字段不直接写入。

优点：

- 自动化彻底变成 provider selection。
- selection 只影响来源解释，不再直接改最终值。
- 避免取消升级时从用户手写最终值中反向扣除。

缺点：

- 当前角色卡主界面仍读取最终字段。如果不同时引入计算展示层，用户看不到数值变化。
- 需要更大范围地讨论“最终值是否仍是事实”。
- 可能牵涉所有 modifier target 的显示和保存语义。

## 当前倾向

本改进点本身是合理的：升级 UI 不应再要求用户手动填写升级后的最终值。

但“是否自动同步最终值”不应在本文中直接定案。它应作为下一个独立议题讨论，因为它触及当前自动化系统的核心边界：

```text
自动化到底是在写最终值，还是只是在登记来源？
```

在这个问题定案前，本文只确认较窄共识：

- 参数化升级 UI 应从“手填新最终值”转为“选择升级对象”。
- 升级选择应生成明确的 `+1` modifier entry。
- 最终值同步策略需要单独讨论。

## 待讨论问题

1. 升级 selection 是否应继续自动写入最终值？
2. 取消升级时是否应继续尝试从最终值中反向 `-1`？
3. 如果最终值不可解析，是否仍记录 selection 并只显示 modifier entry？
4. 对属性升级，是否继续使用属性 `checked` 标记“该属性已经升级过”？
5. 对经历升级，是否需要记录某个经历已经被升级过，防止重复选择同一经历？
6. 闪避升级是否可以完全取消弹窗，直接勾选生效？
7. 这个改进应先在 UI 上去掉手填框，还是等自动化系统整体策略定案后一起做？

## 与第一个改进点的关系

第一个改进点是 target auto base 泛化，处理的是：

```text
玩家首次填写基础值时，是否自动生成 user base。
```

本文处理的是升级 selection，处理的是：

```text
玩家选择升级选项时，是否生成 upgrade modifier，以及是否同步最终值。
```

两者都涉及“最终值字段”和“来源结构”的关系，但语义不同：

- auto base 解释的是基础值来源。
- upgrade selection 解释的是升级加值来源。

因此它们应分别讨论，避免把 base 创建和 upgrade modifier 简化混在同一个实现决策里。
