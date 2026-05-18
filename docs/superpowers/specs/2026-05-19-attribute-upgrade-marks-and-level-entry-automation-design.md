# Attribute Upgrade Marks and Level Entry Automation Design

日期：2026-05-19

状态：已定稿

## 目的

本文记录属性升级黑点与等级进入自动化的设计决策。

本文覆盖一次回归修复与模型补全：

1. 属性升级后，属性栏的小圆点必须被正确点黑。
2. 属性选择器必须按当前黑点限制标准升级。
3. 升到 5 级和 8 级时，必须清空属性升级黑点。
4. 支持用户在补录历史升级时使用不影响黑点的自由升级模式。
5. 重新引入标准化的等级进入自动化触发接口。

本文不是实现计划。

## 背景

属性栏中每个属性旁边的小圆点不是“是否曾经被某个升级项影响”的派生显示，而是一个独立的区间资源标记。

规则语义：

- 1-4 级期间，每个属性最多通过属性升级点亮一次黑点。
- 升到 5 级时，所有属性黑点被清空。
- 5-7 级期间，每个属性再次最多点亮一次黑点。
- 升到 8 级时，所有属性黑点再次被清空。
- 8-10 级期间，每个属性再次最多点亮一次黑点。

因此，不能只从 `upgradeStates.params.attributes` 推导黑点。旧升级项会长期保留在 `upgradeStates` 中；如果用它们派生黑点，会导致 5/8 清空后历史升级仍然占用当前区间资源。

## 核心概念

### 属性黑点

属性黑点继续保存在属性自身：

```ts
interface AttributeValue {
  checked: boolean
  value: string
  spellcasting: boolean
}
```

`AttributeValue.checked` 是属性选择限制的 source of truth。

属性升级选择器在标准升级模式下只看当前黑点：

```text
checked === true  -> 不可选
checked === false -> 可选
```

用户手动点击属性栏的小圆点，仍然直接修改 `AttributeValue.checked`。自动化不尝试追踪或纠正用户手动干预。

### 升级状态

属性升级的数值贡献仍然来自 `upgradeStates`：

```ts
interface UpgradeState {
  checked: boolean
  params?: UpgradeStateParams
  attributeMarksApplied?: true
}
```

`attributeMarksApplied` 只允许存在值 `true`。当不需要该语义时删除字段，不保存 `false`。

语义：

```text
attributeMarksApplied === true
```

表示这个属性升级项在应用时曾由系统点亮属性黑点，并且这些黑点仍属于当前可返还区间。

它不是复杂 ownership 系统。用户手动改黑点后，系统不反写 `attributeMarksApplied`。

## 属性升级模式

属性升级选择器提供两种模式。

### 标准升级模式

默认模式。

用于当前等级区间内的正常升级。

行为：

1. 只能选择当前没有黑点的属性。
2. 必须选择两项属性。
3. 应用后写入：

   ```ts
   upgradeStates[checkKey] = {
     checked: true,
     params: { attributes: selectedAttributes },
     attributeMarksApplied: true,
   }
   ```

4. 同时把所选属性的 `AttributeValue.checked` 设为 `true`。
5. 属性 `+1` provider entry 由 `checked: true` 和 `params.attributes` 生成。

### 自由升级模式

用于补录历史升级、修档、迁移后手动还原等场景。

行为：

1. 可以选择任意属性，不检查当前黑点。
2. 必须选择两项属性。
3. 应用后写入：

   ```ts
   upgradeStates[checkKey] = {
     checked: true,
     params: { attributes: selectedAttributes },
   }
   ```

4. 不修改任何属性黑点。
5. 不写入 `attributeMarksApplied`。
6. 属性 `+1` provider entry 仍然正常生成。

UI 建议使用分段切换：

```text
标准 / 自由
```

默认选中 `标准`。

## 取消属性升级

已选属性升级项不能直接覆盖选择。用户必须先取消，再重新选择。

取消属性升级时：

1. 升级项变为：

   ```ts
   { checked: false }
   ```

2. 清除该 checkKey 的 `params`。
3. 删除该 checkKey 的 `attributeMarksApplied`。
4. 对应属性 `+1` provider entries 必须被移除。
5. 如果取消前 `attributeMarksApplied === true`，按原 `params.attributes` 把对应属性黑点设为 `false`。
6. 如果没有 `attributeMarksApplied`，不修改属性黑点。

返还黑点是幂等操作：

```text
checked = false
```

如果某个属性本来已经是白点，不提示、不阻止。

如果用户手动干预黑点后造成自动化误清，这是可接受边界。系统不为手动绕过黑点限制后的 ownership 冲突提供强保证。

## 等级进入自动化

当前 `updateLevel` 只设置等级并触发实时 modifier 重算，没有过程式等级自动化钩子。

新设计引入“等级进入自动化”注册表。

### 定义

```ts
type LevelEntryAutomation = (sheetData: SheetData) => SheetData

type LevelEntryAutomationRegistry = Record<number, LevelEntryAutomation[]>
```

建议注册表形状：

```ts
const LEVEL_ENTRY_AUTOMATIONS: LevelEntryAutomationRegistry = {
  1: [],
  2: [],
  3: [],
  4: [],
  5: [clearAttributeUpgradeMarks],
  6: [],
  7: [],
  8: [clearAttributeUpgradeMarks],
  9: [],
  10: [],
}
```

即使当前只有 5 级和 8 级有实际自动化，也保留每一级的注册接口。

### 触发规则

等级变化时，从当前 store 中读取旧等级，只传入新等级。

```ts
updateLevel(level: string): void
```

删除旧签名中的死参数：

```ts
oldLevel?: string
```

流程：

1. `oldLevel = state.sheetData.level`
2. `newLevel = level`
3. 将空字符串、非法文本、越界文本按 1 级归一化。
4. 只处理上升跃迁。
5. 找出本次进入的所有等级。
6. 按等级从小到大执行对应自动化函数。
7. 每个自动化函数接收上一步返回的最新 `SheetData`。
8. 最后执行 `applyAutoCalculationForTargets`，同步实时 modifier target。

示例：

```text
1 -> 8
```

执行顺序：

```text
2 级自动化
3 级自动化
4 级自动化
5 级自动化
6 级自动化
7 级自动化
8 级自动化
```

当前实际效果是 5 级清空一次属性黑点，8 级再清空一次属性黑点。

下降不执行等级进入自动化：

```text
8 -> 4
```

不清属性黑点，不删除 `attributeMarksApplied`。

降级后再次升级仍然触发：

```text
9 -> 4 -> 5
```

第二段 `4 -> 5` 会重新执行 5 级自动化。

## 5/8 属性黑点清理

5 级和 8 级等级进入自动化执行同一个清理动作：

1. 六个属性的 `checked` 全部设为 `false`。
2. 扫描所有 `upgradeStates`。
3. 删除所有属性升级项上的 `attributeMarksApplied`。

不按 tier 过滤。

理由：

- `attributeMarksApplied` 表示当前黑点区间内可返还的标记。
- 跨过 5/8 后，当前区间整体刷新。
- 所有旧 `attributeMarksApplied` 都不应继续拥有返还权。

是否是属性升级项，按 `params.attributes` 判断。

## 实时等级来源

等级进入自动化和实时等级来源是两套机制。

实时等级来源包括：

- 等级对重伤阈值的修正。
- 等级对严重伤害阈值的修正。
- 等级对熟练度的基础值和阈值修正。

这些来源继续由 modifier source registry 根据当前等级生成，并由 `applyAutoCalculationForTargets` 同步。

自动计算开启时，实时等级来源可以随当前等级升降。

这与属性黑点清理不同。属性黑点清理是一次性等级进入自动化，只在上升进入等级时执行。

## 非目标

本设计不引入升级历史记录器。

系统不尝试推断：

- 用户是在当前等级正常升级。
- 用户是在补录历史升级。
- 用户是在修复迁移数据。

这些意图由属性升级选择器中的标准/自由模式显式表达。

本设计也不实现属性级 ownership。

同一个属性在用户手动干预后可能被多个升级项声称影响。系统只保证标准路径正确；手动绕过黑点限制后的冲突不做复杂修复。

## 测试验收点

实现时至少覆盖以下行为：

1. 标准属性升级只能选择白点属性。
2. 标准属性升级应用后，所选属性黑点变黑。
3. 标准属性升级写入 `attributeMarksApplied: true`。
4. 自由属性升级允许选择黑点属性。
5. 自由属性升级不修改属性黑点。
6. 自由属性升级不写入 `attributeMarksApplied`。
7. 取消带 `attributeMarksApplied` 的属性升级会移除属性 `+1`，并返还对应黑点。
8. 取消不带 `attributeMarksApplied` 的属性升级会移除属性 `+1`，但不修改黑点。
9. 已选属性升级必须先取消再重新选择，不允许直接覆盖。
10. `1 -> 5` 清空六属性黑点，并删除所有属性升级项的 `attributeMarksApplied`。
11. `4 -> 6` 也执行 5 级自动化。
12. `1 -> 8` 按顺序执行 2 到 8 级自动化，其中 5 和 8 各执行一次属性黑点清理。
13. `8 -> 4` 不执行等级进入自动化。
14. `9 -> 4 -> 5` 会在第二段重新执行 5 级自动化。
15. `updateLevel` 只接收新等级，从 store 当前数据读取旧等级。
16. 空字符串或非法等级在等级进入自动化判断中按 1 级处理。
17. 实时等级来源仍随当前等级重算，不受等级进入自动化是否触发影响。

