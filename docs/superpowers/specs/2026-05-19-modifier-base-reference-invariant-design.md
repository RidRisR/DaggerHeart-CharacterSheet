# Modifier Base Reference Invariant Design

日期：2026-05-19

状态：待复核

## 目的

本文固定 modifier 系统的基础不变量：

```text
final 必须由存在的 active base + modifiers + other adjustments 计算得出。
没有 base，就没有 final。
```

本文先于护甲阈值输入优化落地。护甲阈值拆成两个输入框后，用户可以清空单侧基础阈值；这会直接暴露“来源消失后 final 是否仍保留旧值”的系统问题。因此必须先定义系统级行为。

本文不是护甲 UI 方案，也不是实现计划。

## 背景

当前 `reference-calculator` 在 target 没有 active base 时返回 `calculatedFinalTotal: undefined`。`target-sync` 遇到 `undefined` 后不写回 final，因此旧 final 会保留。

这会产生不一致状态：

```text
来源已经消失
消费方 final 仍显示旧值
```

这等价于隐藏的“最后合法值”，和当前 modifier 设计方向冲突。新的设计要求系统承认当前来源状态：来源不存在时，消费方也不存在。

## 核心不变量

每个 modifier target 的自动计算公式是：

```text
final = active base + enabled modifiers + other adjustments
```

其中：

- `active base` 必须是当前 registry 中真实存在的 base entry。
- `enabled modifiers` 是当前 registry 中对该 target 生效的 modifier entries。
- `other adjustments` 是保存于 `otherAdjustments` 的差额项。

如果没有任何 base entry：

- reference total 不存在。
- calculated final 不存在。
- 自动计算开启时，写入该 target 的空值表现。
- 自动计算关闭时，不写 final，但 reference 状态仍应实时反映“无 base”。

## Active Base 消失

当保存的 `activeBaseId` 指向的 base source 消失时，系统按统一规则处理：

1. 如果同一 target 还有其他 base entry，顺延到下一个稳定排序后的有效 base。
2. 如果同一 target 没有任何 base entry，该 target 进入无 base 状态。
3. 不存在的 base 不应继续作为 active base 参与计算或 UI 展示。

这是一条 reference 系统级规则，不应由某个 source action 做特殊清理。例如护甲值清空、职业移除、装备替换都只是 source 变化；active base fallback / no-base 行为应由 `reference-calculator`、`target-sync`、`reconcile` 等通用层处理。

## 无 Base 时的 Final 表现

无 base 不等于 final 为 0。无 base 表示没有可计算结果。

自动计算开启时，无 base 的 target 写为空值：

- 文本型 target：`""`
- `armorMax`：`""`
- `hpMax`：`""`
- `stressMax`：`""`
- `proficiency`：正常不应无 base；如果防御性遇到无 base，也不应发明隐藏默认值。

不再为 `hpMax` / `stressMax` 注入默认 base `6`。如果未来需要默认生命或压力上限，必须建模为明确的 base source，而不是裸 final 默认值或 no-base fallback。

新建角色卡中的 `hpMax` / `stressMax` 默认也应为空，而不是 `6` 或 `0`。

## 自动计算开关

自动计算开关只控制系统是否写回 final。

### 自动计算开启

- source / reference / other adjustments 实时更新。
- 如果存在 active base，写回计算后的 final。
- 如果 active base 消失但有其他 base，顺延并写回新计算结果。
- 如果没有任何 base，写回空值。

### 自动计算关闭

- source / reference / other adjustments 仍实时更新。
- final 不被系统写回。
- UI 应反映当前 active base 是否已顺延或不存在。
- 自动计算重新开启时，按当时 reference 状态写回 final；如果仍无 base，则写回空值。

## 迁移影响

本设计更新旧讨论中关于默认 `6` 的口径：

- 不再把 `hpMax` / `stressMax` 的 `6` 当作隐藏系统默认 base。
- 旧存档迁移时，不反推一个默认 6 作为来源。
- 旧 final 如果可解析，仍按迁移保留规则处理；它可以通过迁移差额或估算基础值表达历史状态。
- 不可解析 legacy final 按既有规则保留文本，不创建数值差额。

这只影响新 modifier 分支的迁移设计。当前分支尚未发布，不需要兼容未发布中间态。

## 验证范围

实现时至少覆盖：

- 自动计算开启时，active base 消失且有其他 base，final 顺延到其他 base 重算。
- 自动计算开启时，target 没有任何 base，final 写为空。
- 自动计算关闭时，target 没有任何 base，final 保持不变，但 reference summary 显示无 base。
- 重新开启自动计算后，无 base target 写为空。
- `hpMax` / `stressMax` 新建默认为空。
- `hpMax` / `stressMax` 不再依赖隐藏默认 base `6`。
- source action 不包含针对某个 provider 的 active base 特例清理。

## 非目标

本阶段不做：

- 为 `hpMax` / `stressMax` 新增默认 base source。
- 为无 base target 发明 fallback 数字。
- 改变 other adjustments 的三类模型。
- 改变用户手动 final 提交时创建手动基础值 / 手动差额的既有规则，除非实现中发现它直接违反本文不变量。
