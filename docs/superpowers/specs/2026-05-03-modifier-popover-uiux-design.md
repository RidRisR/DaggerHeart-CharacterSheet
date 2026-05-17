# Modifier Popover UI/UX Enhancement Design

日期：2026-05-03

> **状态：已过时。** 本文记录早期 modifier popover UI 方案，其中 entry 开关、
> 同步按钮、手动来源不影响最终值等设定已经不再是当前行为。当前 popover 语义以
> `docs/superpowers/specs/2026-05-17-final-input-automation-reconciliation-design.md`
> 和 `components/modifiers/modifier-popover.tsx` 为准。本文仅作为历史背景。

## 背景

当前 modifier 来源弹窗只负责展示参考值来源。闪避和护甲值的问号按钮位于固定大小且 `overflow-hidden` 的小卡片内部，弹窗会被父容器裁切。弹窗打开后只能再次点击问号关闭，不能通过点击空白区域或键盘退出。底层 store 已有 active base、禁用 entry、用户自定义 entry 的 action，但 UI 尚未暴露这些能力。

## 目标

- 修复弹窗被闪避、护甲等输入框容器裁切的问题。
- 支持点击外部区域关闭、按 `Esc` 关闭、再次点击问号关闭。
- 在弹窗中展示并选择当前 target 的 active base。
- 在弹窗中展示并开关 modifier 是否计入参考合计。
- 支持用户手动添加基值和加值。
- 支持删除用户手动添加的来源。
- 手动来源和开关只影响参考合计，不自动修改角色卡最终值字段。

## 非目标

- 不把最终值字段改为只读计算结果。
- 不在添加手动来源时自动同步更新 `evasion`、`armorValue`、属性值等最终值字段。
- 不实现复杂来源编辑器、历史记录或公式 DSL。
- 不允许删除职业、护甲、等级、升级等系统来源；系统来源只能选择或开关。

## 交互设计

问号按钮继续作为入口，视觉上保持紧凑。弹窗打开后渲染到 document body 或等效 portal 容器中，使用锚点按钮的位置计算浮层位置，从而脱离小卡片的裁切上下文。

关闭行为：

- 点击问号：打开或关闭。
- 点击弹窗外：关闭。
- 按 `Esc`：关闭。
- 点击弹窗内控件：不关闭，除非控件本身是明确的关闭操作。

浮层宽度使用适合表单的固定宽度，优先向右下展开；如果靠近视口边缘，则钳制到可见区域内。打印模式继续隐藏问号入口和浮层。

## 弹窗内容

弹窗分为四个区域：

1. 顶部：显示“{字段名}来源”和当前最终值。
2. 基础值：列出所有 base 来源，用单选控件选择 active base。没有 base 时显示“未知基础值”。用户手动 base 可删除。
3. 加值：列出所有 modifier 来源，用 checkbox 控制是否计入参考合计。用户手动 modifier 可删除。
4. 底部：显示参考合计和未归因差额。

表单区域提供两个最小操作：

- 添加基值：输入名称和值，保存为 `kind: "base"`。
- 添加加值：输入名称和值，保存为 `kind: "modifier"`。

名称为空时使用默认名称，例如“手动基础值”或“手动加值”。值必须能解析为数字；无法解析时显示本地错误，不写入 store。

## 数据流

UI 继续通过 `getReferenceSummary(sheetData, target)` 读取派生结果。

写操作复用现有 store actions：

- `setActiveModifierBase(target, baseId)`：选择 active base。
- `setModifierEntryDisabled(target, entryId, disabled)`：开关 modifier 计入参考合计。
- `upsertUserModifierEntry(entry)`：新增或更新用户来源。
- `removeUserModifierEntry(target, entryId)`：删除用户来源。

用户来源 id 使用稳定前缀和时间/随机后缀，例如 `user:${target}:base:${suffix}` 或 `user:${target}:modifier:${suffix}`。用户来源 priority 低于系统来源，使它们在列表中稳定靠前，且可以被 active base 明确选中。

所有写操作只更新 `modifierState`。角色卡最终值字段保持不变。

## 测试策略

优先补充 `tests/unit/modifiers/modifier-popover.test.tsx`：

- 弹窗打开后渲染在裁切容器外的 portal/root 层。
- 点击外部区域关闭弹窗。
- 按 `Esc` 关闭弹窗。
- 选择不同 base 会调用 store 并改变参考合计。
- 关闭 modifier 后不再计入参考合计。
- 添加手动 base 或 modifier 会出现在列表中，并只改变参考合计，不改变最终值。
- 删除用户来源会从列表移除；系统来源不显示删除入口。

必要时补充 store action 测试，验证删除 active base 或 disabled entry 后状态仍保持保守且不会改最终值。

## 实现边界

本次改动集中在 `components/modifiers/*` 和相关测试。除非测试暴露缺口，不修改 modifier registry、effect executor 或自动化选择逻辑。
