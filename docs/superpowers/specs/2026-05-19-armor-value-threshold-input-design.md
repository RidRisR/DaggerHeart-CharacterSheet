# Armor Value And Threshold Input Design

日期：2026-05-19

状态：待复核

## 目的

本文定义角色卡护甲栏中 `护甲值` 与 `阈值` 的编辑模型。

当前护甲阈值是一个整体输入框，显示为 `13/28`。因为输入框每次变化都会立即 parse 并格式化，用户只能粘贴完整结构，无法自然地逐字符编辑。新的设计把阈值拆成两个结构化输入框，并依赖 `Modifier Base Reference Invariant Design` 中的系统规则处理 source 消失后的 final 行为。

本文不是实现计划。

## 背景

当前护甲阈值数据已经是结构化字段：

```ts
baseThresholds: {
  minor: number | null
  major: number | null
}
```

但 UI 仍把它格式化成一个字符串：

```text
13/28
```

用户输入中间态如 `13/`、`1`、`abc/28` 时，整体 parser 无法表达半结构化状态，导致输入被立刻清空或回写成旧格式。

## 总体方案

护甲栏改为：

```text
阈值
[重伤] / [严重]
```

- 左侧输入框编辑 `baseThresholds.minor`。
- 右侧输入框编辑 `baseThresholds.major`。
- 中间 `/` 是固定文本。
- 两侧允许独立为空。
- 两侧允许独立非法；非法提交后保存为 `null`。

这样 UI 与存储模型一致：用户看到两个槽位，系统也保存两个槽位。

## 编辑与提交

护甲阈值输入使用本地 draft，但 draft 只表示“正在编辑的临时文本”，不是业务状态。

- 输入时只更新 draft。
- `blur` 或 `Enter` 时提交。
- 提交后合法值规范化显示为计算后的数字。
- 提交后空值或非法值保存为 `null`，输入框显示为空。

单侧输入规则：

- 左侧输入 `13`：`minor = 13`。
- 右侧输入 `28`：`major = 28`。
- 任一侧输入空字符串：该侧为 `null`。
- 任一侧输入非法文本：该侧为 `null`。
- 任一侧输入数字表达式，如 `10+3`：该侧保存为 `13`。

## 粘贴完整阈值

任一阈值输入框都支持粘贴或提交完整结构：

```text
A/B
```

解析规则逐侧执行：

- `13/28` -> `{ minor: 13, major: 28 }`
- `13/` -> `{ minor: 13, major: null }`
- `/28` -> `{ minor: null, major: 28 }`
- `13/abc` -> `{ minor: 13, major: null }`
- `abc/28` -> `{ minor: null, major: 28 }`

如果完整字符串入口没有 `/`，默认视为重伤阈值：

- `13` -> `{ minor: 13, major: null }`
- `abc` -> `{ minor: null, major: null }`

这里的“完整字符串入口”包括迁移、导入、自定义护甲 payload，以及任何非左右输入框语境下的旧格式字段。

## 护甲值输入

护甲值 `baseArmorMax` 也改为 draft + `blur` / `Enter` 提交。

规则：

- 合法数字或数字表达式保存为数字。
- 空字符串保存为 `null`。
- 非法文本保存为 `null`。
- 提交后显示规范化数字或空。

这只改变提交时机和非法值处理，不改变 `baseArmorMax: number | null` 的数据结构。

## 自动计算行为

护甲栏只更新 source 数据：

- `equipment.armorSlot.baseArmorMax`
- `equipment.armorSlot.baseThresholds.minor`
- `equipment.armorSlot.baseThresholds.major`

它不直接管理 active base，也不写 provider 特例清理逻辑。

source definitions 根据当前结构自然生成或移除：

- `baseArmorMax !== null` 时生成 `equipment:armor:current:armorMax`。
- `baseThresholds.minor !== null` 时生成 `equipment:armor:current:minorThreshold`。
- `baseThresholds.major !== null` 时生成 `equipment:armor:current:majorThreshold`。

source 更新后必须进入 automatic-calculation sync boundary；护甲输入本身只改变 source 数据，不直接写 Final Value、不直接管理 active base：

- 自动计算开启且该 target 有 Reference Total：按 Reference Total + Other Adjustments 派生 Calculated Final Value，并按规则写回 Final Value。
- 自动计算开启且该 target 无 Reference Total：Calculated Final Value 不存在，Final Value 写为空。
- 自动计算关闭：Final Value 不写回，但 source / reference / active base 实时更新。
- 当前 active base 消失但仍有其他 base：顺延到其他有效 base。

## 自定义护甲弹窗

自定义护甲弹窗中的两个阈值输入也应与角色卡护甲栏一致：

- 输入类型改为 `text`，支持数字表达式。
- 提交 payload 使用结构化对象 `{ minor, major }`，不再拼成可能丢失半结构化信息的字符串。
- 允许只填写一侧。
- 非法侧保存为 `null`。

护甲值输入也应支持同样的 text + parser 行为，避免 `type="number"` 阻止表达式。

## 迁移与导入

旧存档或外部数据中的完整阈值字符串继续由 parser 处理。

规则：

- 可解析 `A/B`：逐侧迁移。
- 半结构化 `A/` 或 `/B`：保留可解析侧。
- 单值 `A`：默认迁移为 `{ minor: A, major: null }`。
- 不可解析文本：迁移为 `{ minor: null, major: null }`。
- 不保留 raw text，不追加到备注，不引入隐藏字段。

## 保留的工具函数职责

`parseArmorThreshold` 继续用于迁移、导入、模板 payload 和旧格式兼容。

`formatArmorThreshold` 不再用于角色卡护甲栏的编辑输入。它可以继续服务非编辑展示场景；本阶段不扩大它对半结构化值的展示语义。

新增或暴露单侧 parser 用于 UI 输入：

```ts
parseArmorThresholdSide(value): number | null
```

## 验证范围

实现时至少覆盖：

- 护甲阈值左右输入可以逐字符编辑。
- 左侧输入单值只更新 `minor`。
- 右侧输入单值只更新 `major`。
- 任一侧输入 `13/28` 同时更新两侧。
- `13/abc` 只保留 `minor`。
- `abc/28` 只保留 `major`。
- 空值和非法文本提交后保存为 `null`。
- 单侧清空只移除对应 source，不影响另一侧 source。
- 自动计算开启时，清空某侧阈值后对应 final 为空或顺延到其他 base。
- 自动计算关闭时，清空某侧阈值不写 final，但 source/reference 更新。
- 护甲值 draft 编辑不会在每次 keypress 重算。
- 护甲值非法或空提交为 `null`。
- 自定义护甲弹窗允许半结构化阈值。
- 迁移单值阈值默认进入 `minor`。
- 不可解析旧阈值迁移为两个 `null`。

## 非目标

本阶段不做：

- 保存不可解析 raw 阈值文本。
- 在备注或特性里追加旧阈值原文。
- 改变护甲 provider popover 的额外修正编辑模型。
- 合并重伤阈值和严重阈值的 modifier panel。
- 改变内置护甲数据结构，除非测试暴露其与 parser 规则不兼容。
