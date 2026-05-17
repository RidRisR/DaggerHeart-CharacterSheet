# Number Utils Consolidation Implementation Plan

> **状态：历史执行计划，部分过时。** 本计划包含已经删除的旧文件路径，例如
> `components/upgrade-popover/evasion-editor.tsx`。它只记录当时的执行过程，不作为当前代码结构依据。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clarify number parsing APIs, remove `safeEvaluateExpression`, and migrate modifier-adjacent callers to explicit fallback or try-style functions.

**Architecture:** Keep all shared parsing behavior in `lib/number-utils.ts`. Add tests for the new pure helper API before changing implementation, then migrate the limited caller set from the spec without touching unrelated editor/notebook parsing.

**Tech Stack:** TypeScript, Vitest, React components using existing utility imports.

---

## File Structure

- Create `tests/unit/number-utils.test.ts`: covers pure number parsing, expression parsing, fallback helpers, and backward-compatible aliases.
- Modify `lib/number-utils.ts`: add `tryParseNumberExpression`, `parseNumberOr`, `parseNumberExpressionOr`; keep `isValidNumber`, `parseToNumber`, and `tryParseNumber`; remove `safeEvaluateExpression`.
- Modify `components/character-sheet.tsx`: delete local `safeEvaluateExpression` and use `parseNumberExpressionOr`.
- Modify `components/upgrade-popover/evasion-editor.tsx`: replace `safeEvaluateExpression` import/use with `parseNumberExpressionOr`.
- Modify `components/modifiers/modifier-popover.tsx`: parse manual base/modifier values with `tryParseNumberExpression`.

## Task 1: Add New Number Utility API

**Files:**
- Create: `tests/unit/number-utils.test.ts`
- Modify: `lib/number-utils.ts`

- [ ] **Step 1: Write failing tests**

Create tests for:

```ts
import { describe, expect, it } from "vitest"
import {
  isValidNumber,
  parseNumberExpressionOr,
  parseNumberOr,
  parseToNumber,
  tryParseNumber,
  tryParseNumberExpression,
} from "@/lib/number-utils"

describe("number utils", () => {
  it("parses pure numbers and rejects expressions", () => {
    expect(tryParseNumber("+2")).toBe(2)
    expect(tryParseNumber("-1")).toBe(-1)
    expect(tryParseNumber("0")).toBe(0)
    expect(tryParseNumber("1.2")).toBe(2)
    expect(tryParseNumber("12+1")).toBeUndefined()
    expect(tryParseNumber("abc")).toBeUndefined()
  })

  it("parses numeric expressions without accepting variables", () => {
    expect(tryParseNumberExpression("+2")).toBe(2)
    expect(tryParseNumberExpression("-1")).toBe(-1)
    expect(tryParseNumberExpression("0")).toBe(0)
    expect(tryParseNumberExpression("12+1")).toBe(13)
    expect(tryParseNumberExpression("2*3")).toBe(6)
    expect(tryParseNumberExpression("(10+2)/2")).toBe(6)
    expect(tryParseNumberExpression("12+敏捷")).toBeUndefined()
    expect(tryParseNumberExpression("abc")).toBeUndefined()
    expect(tryParseNumberExpression("")).toBeUndefined()
  })

  it("returns explicit fallback values", () => {
    expect(parseNumberOr("abc", 7)).toBe(7)
    expect(parseNumberOr("0", 7)).toBe(0)
    expect(parseNumberExpressionOr("abc", 7)).toBe(7)
    expect(parseNumberExpressionOr("12+1", 7)).toBe(13)
  })

  it("preserves compatibility helpers", () => {
    expect(isValidNumber("+2")).toBe(true)
    expect(isValidNumber("12+1")).toBe(false)
    expect(parseToNumber("abc", 1)).toBe(1)
    expect(parseToNumber("1.2", 0)).toBe(2)
  })
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/number-utils.test.ts
```

Expected: FAIL because the new functions do not exist yet.

- [ ] **Step 3: Implement helpers**

Update `lib/number-utils.ts` so new helpers pass tests. Use a strict expression regex and keep existing rounding behavior with `Math.ceil`.

- [ ] **Step 4: Run tests and verify pass**

Run:

```bash
pnpm exec vitest run tests/unit/number-utils.test.ts
```

Expected: PASS.

## Task 2: Remove `safeEvaluateExpression` Callers

**Files:**
- Modify: `components/character-sheet.tsx`
- Modify: `components/upgrade-popover/evasion-editor.tsx`
- Modify: `components/modifiers/modifier-popover.tsx`
- Test: `tests/unit/number-utils.test.ts`, `tests/unit/modifiers/modifier-popover.test.tsx`, `tests/unit/automation/upgrade-automation.test.ts`

- [ ] **Step 1: Write failing modifier expression test**

Extend `tests/unit/modifiers/modifier-popover.test.tsx` with a test that adds manual modifier value `12+1` and expects reference math to use `13`.

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/modifier-popover.test.tsx
```

Expected: FAIL because manual modifier parsing still uses `tryParseNumber`.

- [ ] **Step 3: Migrate callers**

Make these changes:

- `components/modifiers/modifier-popover.tsx`: import `tryParseNumberExpression` and use it for manual source values.
- `components/upgrade-popover/evasion-editor.tsx`: import `parseNumberExpressionOr` and use `parseNumberExpressionOr(localValue, 0)`.
- `components/character-sheet.tsx`: import `parseNumberExpressionOr`, delete local `safeEvaluateExpression`, and use `parseNumberExpressionOr(safeFormData.armorValue || "0", 0)`.
- `lib/number-utils.ts`: remove `safeEvaluateExpression` export.

- [ ] **Step 4: Run tests and verify pass**

Run:

```bash
pnpm exec vitest run tests/unit/number-utils.test.ts tests/unit/modifiers/modifier-popover.test.tsx tests/unit/automation/upgrade-automation.test.ts
```

Expected: PASS.

## Task 3: Regression Verification and Commit

**Files:**
- Verify only, then commit.

- [ ] **Step 1: Search for removed API**

Run:

```bash
rg "safeEvaluateExpression" app components lib tests
```

Expected: no results.

- [ ] **Step 2: Run targeted regression suite**

Run:

```bash
pnpm exec vitest run tests/unit/number-utils.test.ts tests/unit/modifiers tests/unit/automation
```

Expected: PASS.

- [ ] **Step 3: Commit**

Run:

```bash
git add lib/number-utils.ts components/character-sheet.tsx components/upgrade-popover/evasion-editor.tsx components/modifiers/modifier-popover.tsx tests/unit/number-utils.test.ts tests/unit/modifiers/modifier-popover.test.tsx docs/superpowers/plans/2026-05-03-number-utils-consolidation.md
git commit -m "refactor: consolidate number parsing utilities"
```

Expected: commit succeeds.
