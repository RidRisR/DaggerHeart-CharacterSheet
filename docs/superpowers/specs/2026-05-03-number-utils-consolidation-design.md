# Number Utils Consolidation Design

日期：2026-05-03

> **状态：部分过时。** 本文的 number-utils API 方向仍可作为历史背景参考，但文中的
> 具体改动清单包含已经删除的旧文件，例如 `components/upgrade-popover/evasion-editor.tsx`。
> 当前升级区和 modifier 行为不要以本文的文件清单为准。

## 背景

当前项目中存在多套数值解析方式：`tryParseNumber()`、`parseToNumber()`、`isValidNumber()`、`safeEvaluateExpression()`、组件内重复的 `safeEvaluateExpression()`，以及散落的 `parseInt()` / `Number()`。这些函数的输入范围和失败语义不统一，尤其会影响 modifier/reference 系统和后续“六大属性空字段首次输入自动创建基值”的判断。

问题的核心不是函数数量，而是公共 API 没有明确表达：

- 是否只接受纯数字，还是接受简单数学表达式。
- 解析失败时返回 `undefined`、默认值，还是 `0`。

## 目标

- 统一 `lib/number-utils.ts` 的公共 API 命名和语义。
- 支持纯数字解析和简单数学表达式解析两类输入。
- 明确区分失败返回 `undefined` 与失败返回 fallback 的场景。
- 删除 `safeEvaluateExpression()` 公共导出和组件内重复实现。
- 只迁移角色卡核心数值链路和 modifier 直接相关调用点。
- 为新 API 添加单元测试，锁定 `0`、负数、`+2`、`12+1`、非法字符串等行为。

## 非目标

- 不一次性替换全项目所有 `parseInt()`、`Number()`。
- 不重构卡牌编辑器、笔记本、快捷键、布局索引等非角色卡核心数值逻辑。
- 不改变旧存档迁移语义。
- 不在本任务中实现“六大属性空字段首次输入自动创建基值”，但为它提供可靠解析 API。

## 新 API

`lib/number-utils.ts` 提供以下公共函数：

```ts
export function tryParseNumber(value: unknown): number | undefined
export function tryParseNumberExpression(value: unknown): number | undefined

export function parseNumberOr(value: unknown, fallback: number): number
export function parseNumberExpressionOr(value: unknown, fallback: number): number
```

语义：

- `tryParseNumber()` 只接受纯数字，支持 `+2`、`-1`、`0`、小数，并保持当前向上取整行为。
- `tryParseNumberExpression()` 接受纯数字和简单表达式，支持 `12+1`、`2*3`、`(10+2)/2`，并保持向上取整行为。
- `parseNumberOr()` 是 `tryParseNumber() ?? fallback`。
- `parseNumberExpressionOr()` 是 `tryParseNumberExpression() ?? fallback`。

`isValidNumber()` 和 `parseToNumber()` 暂时保留为兼容 alias：

- `isValidNumber(value)` 保持现有行为，内部可调用新 helper。
- `parseToNumber(value, fallback)` 委托给 `parseNumberOr(value, fallback)`。

`safeEvaluateExpression()` 删除，不再导出。旧调用点显式改用 `parseNumberExpressionOr(value, 0)` 或 `tryParseNumberExpression(value)`。

## 表达式解析规则

表达式解析只允许：

- 数字
- 空格
- `+`
- `-`
- `*`
- `/`
- `.`
- `(`
- `)`

不允许变量、中文、函数调用、对象访问、逗号或其它字符。

示例行为：

```ts
tryParseNumberExpression("") === undefined
tryParseNumberExpression("+2") === 2
tryParseNumberExpression("-1") === -1
tryParseNumberExpression("0") === 0
tryParseNumberExpression("12+1") === 13
tryParseNumberExpression("2*3") === 6
tryParseNumberExpression("(10+2)/2") === 6
tryParseNumberExpression("12+敏捷") === undefined
tryParseNumberExpression("abc") === undefined
parseNumberExpressionOr("abc", 0) === 0
```

## 迁移范围

第一轮迁移这些调用点：

- `components/character-sheet.tsx`
  - 删除组件内重复的 `safeEvaluateExpression()`。
  - 护甲槽计算改用 `parseNumberExpressionOr(value, 0)`。
- `components/upgrade-popover/evasion-editor.tsx`
  - 改用 `parseNumberExpressionOr(localValue, 0)`，保持现有失败当 0 的行为。
- `components/modifiers/modifier-popover.tsx`
  - 手动基值/加值输入改用 `tryParseNumberExpression()`，允许 `+2` 和 `12+1`。
- `lib/modifiers/*`
  - 继续使用 `tryParseNumber()`，因为 reference 层当前只应解析已落库的数字最终值，不把表达式静默当最终数字，除非后续有明确需求。

暂不迁移：

- 卡牌编辑器中的数字字段。
- 笔记本计数器和骰子输入。
- 页面快捷键数字解析。
- guide 文案中的内部索引计算。

## 测试策略

新增或扩展 `tests/unit/number-utils.test.ts`：

- `tryParseNumber()` 解析纯数字、符号数字、0、负数、小数向上取整。
- `tryParseNumber()` 拒绝 `12+1` 和非法字符串。
- `tryParseNumberExpression()` 解析 `12+1`、`2*3`、括号表达式、符号数字、0、负数。
- `tryParseNumberExpression()` 拒绝变量、中文、空字符串和非法字符串。
- `parseNumberOr()` 和 `parseNumberExpressionOr()` 在失败时返回 fallback。
- `parseToNumber()` 保持兼容行为。

回归验证：

```bash
pnpm exec vitest run tests/unit/number-utils.test.ts tests/unit/modifiers tests/unit/automation
```

## 后续衔接

完成本整理后，六大属性的“空字段首次输入自动创建基值”应使用 `tryParseNumberExpression()` 判断用户提交值是否可作为基值。这样可以支持 `+2`、`12+1`、0 和负数，同时避免把非法输入误判为 0。
