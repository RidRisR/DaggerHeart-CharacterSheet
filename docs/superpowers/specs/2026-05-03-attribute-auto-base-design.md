# Attribute Auto Base Design

日期：2026-05-03

## 背景

六大属性输入框既承担最终值编辑，也承担初始属性填写。当前 modifier/reference 系统已经支持用户手动 base，但如果用户在 1 级创建角色时直接在空属性字段中输入数值，系统不会自动把这个输入记录为 base，导致来源弹窗显示“未知基础值”或未归因差额。

本设计为六大属性添加一个保守的自动 base 创建规则：只在 1 级、空字段首次提交可解析表达式时触发。旧存档和高等级编辑不反推来源。

## 目标

- 只对六大属性 target 生效：
  - `agility.value`
  - `strength.value`
  - `finesse.value`
  - `instinct.value`
  - `presence.value`
  - `knowledge.value`
- 当 1 级角色从空属性字段首次输入可解析表达式时，自动创建该属性的用户 base。
- 支持 `+2`、`-1`、`0`、`12+1` 等表达式。
- 最终值字段保存用户输入原文，不替换为计算结果。
- 不在旧存档加载、迁移、导入时猜测 base。
- 清空字段时，在安全条件下自动撤销系统代建的 auto base。

## 非目标

- 不对闪避、护甲、伤害阈值、HP/Stress、经历值等其它字段应用此规则。
- 不把属性最终值改为只读计算值。
- 不在已有属性值的旧存档上反推 base。
- 不在已有用户 base 的情况下自动覆盖或更新 base。
- 不实现“编辑输入框时持续同步 base”。

## 触发规则

自动创建 base 的条件必须全部满足：

1. target 是六大属性之一。
2. 编辑开始前属性 `value` 为空字符串或只包含空白。
3. 当前等级按 `parseNumberOr(sheetData.level, 1)` 解析后等于 `1`。
4. 当前 target 没有任何 `sourceType: "user"` 且 `kind: "base"` 的 entry。
5. 用户在 blur 或 Enter 提交的值可以被 `tryParseNumberExpression()` 解析。

满足条件时：

- 最终值仍保存用户输入原文，例如 `"12+1"`。
- 创建用户 base：

```ts
{
  id: `user:${target}:auto-base`,
  sourceId: `user:${target}:auto-base`,
  target,
  kind: "base",
  label: "手动基础值",
  value: parsedExpressionValue,
  sourceType: "user",
  priority: 10,
}
```

- 如果当前没有 active base，设置 `activeBaseId` 为该 auto base id。

## 不触发示例

- 等级为 `2` 或更高。
- 编辑开始前属性已有值。
- 当前 target 已经有任意用户 base。
- 输入值为空。
- 输入值无法被 `tryParseNumberExpression()` 解析，例如 `"abc"` 或 `"12+敏捷"`。

## 撤销规则

当用户清空属性字段时，系统可以自动删除 auto base，但必须全部满足：

1. target 是六大属性之一。
2. 当前等级按 `parseNumberOr(sheetData.level, 1)` 解析后等于 `1`。
3. 清空后的属性 `value` 为空字符串或只包含空白。
4. 当前 target 存在 `id === user:${target}:auto-base` 的用户 base。
5. 该 auto base 是当前 target 唯一的用户 base。

满足条件时：

- 删除该 auto base。
- 不修改其它系统来源或用户来源。
- 最终值保持用户清空后的空字符串。

如果用户已经在弹窗中添加了其它 base、切换到其它用户 base，或 auto base 不再是唯一用户 base，则不自动删除，避免误删用户整理过的来源。

## 数据流

建议新增纯 helper：

```ts
getAttributeAutoBaseId(target: AttributeTargetId): ModifierEntryId
createAttributeAutoBaseEntry(target: AttributeTargetId, value: number): UserModifierEntry
shouldCreateAttributeAutoBase(input): boolean
shouldRemoveAttributeAutoBase(input): boolean
```

组件层只负责收集：

- target
- 编辑开始前 value
- 提交后的 value
- 当前 `sheetData.level`
- 当前 target 的 user base 列表

写入仍复用现有 store actions：

- `updateAttribute(attribute, value)` 更新最终值。
- `upsertUserModifierEntry(entry)` 创建 auto base。
- `setActiveModifierBase(target, baseId)` 选择 active base。
- `removeUserModifierEntry(target, baseId)` 删除 auto base。

## 交互设计

属性输入框本身不新增可见控件。用户体验保持：

- 输入或粘贴属性值。
- blur 或 Enter 提交。
- 点击问号可看到自动创建的“手动基础值”。
- 如果误输入，清空该属性字段即可撤销 auto base，前提是它仍满足安全删除条件。

## 测试策略

新增纯 helper 测试和组件/section 测试：

- 1 级空属性输入 `12+1` 创建 auto base，最终值保存 `"12+1"`。
- 1 级空属性输入 `+2`、`0`、`-1` 创建对应 auto base。
- 非法表达式不创建 auto base。
- 非空属性编辑不创建 auto base。
- 等级为 `2` 时不创建 auto base。
- 等级为空或无法解析时按 1 处理。
- 已有用户 base 时不重复创建 auto base。
- 清空字段时删除唯一 auto base。
- 清空字段时如果存在其它用户 base，不自动删除。

回归验证：

```bash
pnpm exec vitest run tests/unit/modifiers tests/unit/automation tests/unit/number-utils.test.ts
```
