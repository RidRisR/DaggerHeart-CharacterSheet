# Current Automation Baseline Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freeze the current character-sheet automation behavior in tests before implementing the new modifier reference layer.

**Architecture:** Use Vitest as the primary baseline layer because most automation is deterministic state transformation in `useSheetStore`. Extract only the upgrade checkbox automation from React component closures into a small testable helper/action before covering it. Add Playwright only after the unit baseline exists, and only for a few smoke tests that prove real UI paths still reach the tested automation.

**Tech Stack:** Next.js 15, React 19, Zustand, Vitest 3, happy-dom, Testing Library React, optional Playwright later.

---

## File Structure

### New Test Files

| File | Responsibility |
|---|---|
| `tests/unit/automation/test-helpers.ts` | Shared store reset helpers and fixture builders for automation tests. |
| `tests/unit/automation/profession-automation.test.ts` | Baseline tests for profession auto-fill behavior. |
| `tests/unit/automation/armor-automation.test.ts` | Baseline tests for armor selection, armor manual edits, and armor box clearing. |
| `tests/unit/automation/level-automation.test.ts` | Move or extend existing level/proficiency baseline coverage. |
| `tests/unit/automation/upgrade-automation.test.ts` | Baseline tests for upgrade checkbox automation after extracting a helper. |
| `tests/unit/automation/rollback-snapshots.test.ts` | Baseline tests for attribute, experience, and evasion rollback snapshot behavior. |
| `tests/unit/automation/component-smoke.test.tsx` | Lightweight component-level smoke tests only where helper/store tests cannot prove wiring. |

### Modified Source Files

| File | Responsibility |
|---|---|
| `components/character-sheet-page-two.tsx` | Delegate upgrade checkbox automation to a testable helper/action. |
| `lib/sheet-store.ts` | Optional: expose a store action if extracting upgrade automation as a store-level action is cleaner than a pure helper. |
| `tests/unit/level-proficiency.test.ts` | Either keep as-is or move contents into `tests/unit/automation/level-automation.test.ts`; do not delete coverage. |

### Optional Later Files

| File | Responsibility |
|---|---|
| `playwright.config.ts` | Only add after Vitest baseline is complete. |
| `tests/e2e/automation-smoke.spec.ts` | Browser smoke tests for critical user flows. |

---

## Automation Inventory

The baseline must cover the current behavior in these places:

- `lib/sheet-store.ts`
  - `setSheetData`: clears `armorBoxes` when `armorValue` changes.
  - `updateLevel`: updates level, proficiency, attribute upgrade flags, and damage thresholds.
  - `updateArmorThresholdWithDamage`: writes armor threshold and recalculates damage thresholds when level is valid.
  - `updateArmorBaseScore`: writes `armorBaseScore`, `armorValue`, and `armorMax`.
  - `selectArmor`: applies preset/custom/none armor data and recalculates related values.
  - `handleProfessionChange`: at level 1 or empty level, writes profession starting `evasion` and `hpMax`.
  - rollback snapshots: `rollbackAttributeUpgrade`, `restoreExperienceValuesSnapshot`, `restoreEvasionSnapshot`.
- `components/character-sheet-page-two.tsx`
  - `handleUpgradeCheck`: HP max, stress max, proficiency, and rollback checkbox behavior.
- `components/upgrade-popover/*`
  - `AttributeUpgradeEditor`, `ExperienceValuesEditor`, and `EvasionEditor` apply values and create rollback snapshots.
- `components/character-sheet.tsx`
  - weapon selection logic is currently component-local. Baseline this with a helper extraction only if weapon automation becomes part of modifier reference work. For Phase 0, classify as lower priority because it fills display fields but does not affect the modifier targets listed for the new system.

---

## Task 1: Create Shared Automation Test Helpers

**Files:**
- Create: `tests/unit/automation/test-helpers.ts`

- [ ] **Step 1: Create helper file**

```ts
import { useSheetStore } from "@/lib/sheet-store"
import { defaultSheetData } from "@/lib/default-sheet-data"
import type { SheetData } from "@/lib/sheet-data"

export function resetSheetStore(overrides: Partial<SheetData> = {}) {
  useSheetStore.setState({
    sheetData: {
      ...defaultSheetData,
      ...overrides,
    },
    attributeUpgradeHistory: {},
    experienceValuesSnapshot: undefined,
    evasionSnapshot: undefined,
  })
}

export function sheet() {
  return useSheetStore.getState().sheetData
}

export function store() {
  return useSheetStore.getState()
}

export function countChecked(values: unknown): number {
  return Array.isArray(values) ? values.filter(Boolean).length : 0
}
```

- [ ] **Step 2: Run helper import smoke check**

Run:

```bash
pnpm exec vitest run tests/unit/automation/test-helpers.ts --passWithNoTests
```

Expected: PASS with no tests found or no test files warning handled by `--passWithNoTests`.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/automation/test-helpers.ts
git commit -m "test(automation): add sheet store test helpers"
```

---

## Task 2: Profession Automation Baseline

**Files:**
- Create: `tests/unit/automation/profession-automation.test.ts`

- [ ] **Step 1: Write profession tests**

```ts
import { beforeEach, describe, expect, it } from "vitest"
import type { StandardCard } from "@/card/card-types"
import { resetSheetStore, sheet, store } from "./test-helpers"

function professionCard(evasion: number, hp: number): StandardCard {
  return {
    id: "profession-ranger",
    name: "游侠",
    type: "profession",
    class: "游侠",
    domains: ["骨骼", "贤者"],
    description: "",
    professionSpecial: {
      "起始闪避": evasion,
      "起始生命": hp,
    },
  } as unknown as StandardCard
}

describe("职业自动化基线", () => {
  beforeEach(() => resetSheetStore())

  it("1级选择职业时自动写入闪避和生命上限", () => {
    resetSheetStore({ level: "1", evasion: "", hpMax: 6 })

    store().handleProfessionChange(
      { id: "profession-ranger", name: "游侠" },
      professionCard(12, 7),
    )

    expect(sheet().evasion).toBe("12")
    expect(sheet().hpMax).toBe(7)
  })

  it("空等级选择职业时按1级处理并自动写入", () => {
    resetSheetStore({ level: "", evasion: "", hpMax: 6 })

    store().handleProfessionChange(
      { id: "profession-ranger", name: "游侠" },
      professionCard(13, 8),
    )

    expect(sheet().evasion).toBe("13")
    expect(sheet().hpMax).toBe(8)
  })

  it("非1级选择职业不会覆盖现有闪避和生命上限", () => {
    resetSheetStore({ level: "2", evasion: "15", hpMax: 9 })

    store().handleProfessionChange(
      { id: "profession-ranger", name: "游侠" },
      professionCard(12, 7),
    )

    expect(sheet().evasion).toBe("15")
    expect(sheet().hpMax).toBe(9)
  })

  it("1级清空职业时重置闪避为空并把生命上限设为6", () => {
    resetSheetStore({ level: "1", evasion: "12", hpMax: 7 })

    store().handleProfessionChange(undefined, undefined)

    expect(sheet().evasion).toBe("")
    expect(sheet().hpMax).toBe(6)
  })

  it("非1级清空职业不会覆盖现有数值", () => {
    resetSheetStore({ level: "3", evasion: "14", hpMax: 8 })

    store().handleProfessionChange(undefined, undefined)

    expect(sheet().evasion).toBe("14")
    expect(sheet().hpMax).toBe(8)
  })
})
```

- [ ] **Step 2: Run test and verify it passes**

```bash
pnpm exec vitest run tests/unit/automation/profession-automation.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/automation/profession-automation.test.ts
git commit -m "test(automation): cover profession autofill baseline"
```

---

## Task 3: Armor Automation Baseline

**Files:**
- Create: `tests/unit/automation/armor-automation.test.ts`

- [ ] **Step 1: Write armor tests**

```ts
import { beforeEach, describe, expect, it } from "vitest"
import { armorItems } from "@/data/list/armor"
import { resetSheetStore, sheet, store } from "./test-helpers"

describe("护甲自动化基线", () => {
  beforeEach(() => resetSheetStore())

  it("选择预设护甲会写入护甲字段、护甲值、护甲上限和等级修正后的伤害阈值", () => {
    const armor = armorItems[0]
    resetSheetStore({ level: "3" })

    store().selectArmor(armor.名称)

    const [minor, major] = armor.伤害阈值.split("/").map((v) => parseInt(v, 10))
    expect(sheet().armorName).toBe(armor.名称)
    expect(sheet().armorBaseScore).toBe(String(armor.护甲值))
    expect(sheet().armorThreshold).toBe(armor.伤害阈值)
    expect(sheet().armorValue).toBe(String(armor.护甲值))
    expect(sheet().armorMax).toBe(armor.护甲值)
    expect(sheet().minorThreshold).toBe(String(minor + 3))
    expect(sheet().majorThreshold).toBe(String(major + 3))
    expect(sheet().armorFeature).toContain(armor.特性名称)
  })

  it("选择自定义护甲 JSON 会写入对应字段并计算伤害阈值", () => {
    resetSheetStore({ level: "4" })
    const customArmor = JSON.stringify({
      名称: "测试护甲",
      护甲值: 5,
      伤害阈值: "7/15",
      特性名称: "测试特性",
      描述: "测试描述",
    })

    store().selectArmor(customArmor)

    expect(sheet().armorName).toBe("测试护甲")
    expect(sheet().armorBaseScore).toBe("5")
    expect(sheet().armorThreshold).toBe("7/15")
    expect(sheet().armorValue).toBe("5")
    expect(sheet().armorMax).toBe(5)
    expect(sheet().minorThreshold).toBe("11")
    expect(sheet().majorThreshold).toBe("19")
    expect(sheet().armorFeature).toContain("测试特性")
  })

  it("选择 none 会清空护甲相关字段", () => {
    resetSheetStore({
      armorName: "旧护甲",
      armorBaseScore: "4",
      armorThreshold: "8/17",
      armorFeature: "旧特性",
      armorValue: "4",
      armorMax: 4,
      minorThreshold: "9",
      majorThreshold: "18",
    })

    store().selectArmor("none")

    expect(sheet().armorName).toBe("")
    expect(sheet().armorBaseScore).toBe("")
    expect(sheet().armorThreshold).toBe("")
    expect(sheet().armorFeature).toBe("")
    expect(sheet().armorValue).toBe("")
    expect(sheet().armorMax).toBe(0)
    expect(sheet().minorThreshold).toBe("")
    expect(sheet().majorThreshold).toBe("")
  })

  it("手动修改护甲基础值会同步 armorValue 和 armorMax", () => {
    resetSheetStore({ armorBaseScore: "3", armorValue: "3", armorMax: 3 })

    store().updateArmorBaseScore("6")

    expect(sheet().armorBaseScore).toBe("6")
    expect(sheet().armorValue).toBe("6")
    expect(sheet().armorMax).toBe(6)
  })

  it("手动修改护甲阈值会按当前等级重算伤害阈值", () => {
    resetSheetStore({ level: "5" })

    store().updateArmorThresholdWithDamage("9/20")

    expect(sheet().armorThreshold).toBe("9/20")
    expect(sheet().minorThreshold).toBe("14")
    expect(sheet().majorThreshold).toBe("25")
  })

  it("armorValue 改变时 setSheetData 会清空护甲槽", () => {
    resetSheetStore({
      armorValue: "3",
      armorBoxes: [true, true, false, false, false, false, false, false, false, false, false, false],
    })

    store().setSheetData({ armorValue: "4" })

    expect(sheet().armorBoxes).toEqual(Array(12).fill(false))
  })
})
```

- [ ] **Step 2: Run test**

```bash
pnpm exec vitest run tests/unit/automation/armor-automation.test.ts
```

Expected: 6 tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/automation/armor-automation.test.ts
git commit -m "test(automation): cover armor automation baseline"
```

---

## Task 4: Consolidate Level Automation Baseline

**Files:**
- Modify or copy from: `tests/unit/level-proficiency.test.ts`
- Create: `tests/unit/automation/level-automation.test.ts`

- [ ] **Step 1: Keep existing tests passing**

Run:

```bash
pnpm exec vitest run tests/unit/level-proficiency.test.ts
```

Expected: 17 tests pass.

- [ ] **Step 2: Create automation folder version**

Copy the existing `tests/unit/level-proficiency.test.ts` content to `tests/unit/automation/level-automation.test.ts`, then update imports to use helper functions where useful:

```ts
import { describe, it, expect, beforeEach } from "vitest"
import { resetSheetStore, sheet, store, countChecked } from "./test-helpers"
```

Keep all current assertions for:

- crossing one proficiency threshold
- crossing multiple thresholds
- empty level behavior
- invalid level behavior
- downgrade behavior
- proficiency cap
- attribute checked reset
- damage threshold recalculation

- [ ] **Step 3: Run both tests during transition**

```bash
pnpm exec vitest run tests/unit/level-proficiency.test.ts tests/unit/automation/level-automation.test.ts
```

Expected: both files pass.

- [ ] **Step 4: Decide duplication policy**

If `level-automation.test.ts` is an exact superset, delete `tests/unit/level-proficiency.test.ts` in the same commit. If not, keep both until later cleanup.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/automation/level-automation.test.ts tests/unit/level-proficiency.test.ts
git commit -m "test(automation): consolidate level automation baseline"
```

---

## Task 5: Extract Upgrade Checkbox Automation

**Files:**
- Create: `lib/automation/upgrade-actions.ts`
- Modify: `components/character-sheet-page-two.tsx`
- Test later: `tests/unit/automation/upgrade-automation.test.ts`

- [ ] **Step 1: Create action type definitions**

```ts
import type { SheetData } from "@/lib/sheet-data"

export interface UpgradeOptionLike {
  label: string
  doubleBox?: boolean
  boxCount?: number
}

export interface UpgradeAutomationContext {
  sheetData: SheetData
  checkKey: string
  optionIndex: number
  option: UpgradeOptionLike
  currentlyChecked: boolean
}

export type UpgradeAutomationResult =
  | { kind: "none" }
  | { kind: "setSheetData"; updates: Partial<SheetData> }
  | { kind: "rollback"; rollbackKind: "attribute" | "experience" | "evasion" }

export function computeUpgradeAutomation(
  context: UpgradeAutomationContext,
): UpgradeAutomationResult {
  const { sheetData, option, currentlyChecked } = context
  const label = option.label
  const newCheckedState = !currentlyChecked

  if (label.includes("角色属性+1") && currentlyChecked) {
    return { kind: "rollback", rollbackKind: "attribute" }
  }

  if (label.includes("经历获得额外") && currentlyChecked) {
    return { kind: "rollback", rollbackKind: "experience" }
  }

  if (label.includes("闪避值") && currentlyChecked) {
    return { kind: "rollback", rollbackKind: "evasion" }
  }

  if (label.includes("生命槽")) {
    const currentHP = sheetData.hpMax || 6
    return {
      kind: "setSheetData",
      updates: { hpMax: newCheckedState ? Math.min(currentHP + 1, 18) : Math.max(currentHP - 1, 1) },
    }
  }

  if (label.includes("压力槽")) {
    const currentStress = sheetData.stressMax || 6
    return {
      kind: "setSheetData",
      updates: { stressMax: newCheckedState ? Math.min(currentStress + 1, 18) : Math.max(currentStress - 1, 1) },
    }
  }

  if (label.includes("熟练度+1")) {
    const currentProficiency = Array.isArray(sheetData.proficiency)
      ? sheetData.proficiency
      : Array(6).fill(false)
    const currentCount = currentProficiency.filter(v => v === true).length
    const newProficiency = [...currentProficiency]

    if (newCheckedState && currentCount < 6) {
      newProficiency[currentCount] = true
      return { kind: "setSheetData", updates: { proficiency: newProficiency } }
    }

    if (!newCheckedState && currentCount > 0) {
      newProficiency[currentCount - 1] = false
      return { kind: "setSheetData", updates: { proficiency: newProficiency } }
    }
  }

  return { kind: "none" }
}
```

- [ ] **Step 2: Wire component to helper**

In `components/character-sheet-page-two.tsx`, replace the inline HP/stress/proficiency branch logic with a call to `computeUpgradeAutomation`. Keep rollback toast behavior in the component for now, because the helper only classifies rollback type.

- [ ] **Step 3: Run existing full tests**

```bash
pnpm test:run
```

Expected: all existing tests pass.

- [ ] **Step 4: Commit extraction**

```bash
git add lib/automation/upgrade-actions.ts components/character-sheet-page-two.tsx
git commit -m "refactor(automation): extract upgrade checkbox actions"
```

---

## Task 6: Upgrade Automation Baseline

**Files:**
- Create: `tests/unit/automation/upgrade-automation.test.ts`
- Test target: `lib/automation/upgrade-actions.ts`

- [ ] **Step 1: Write upgrade helper tests**

```ts
import { describe, expect, it } from "vitest"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { computeUpgradeAutomation } from "@/lib/automation/upgrade-actions"

function run(label: string, overrides = {}, currentlyChecked = false) {
  return computeUpgradeAutomation({
    sheetData: { ...defaultSheetData, ...overrides },
    checkKey: "tier1-0-0",
    optionIndex: 0,
    option: { label },
    currentlyChecked,
  })
}

describe("升级选项自动化基线", () => {
  it("生命槽勾选会增加 hpMax", () => {
    expect(run("永久增加一个生命槽。", { hpMax: 6 })).toEqual({
      kind: "setSheetData",
      updates: { hpMax: 7 },
    })
  })

  it("生命槽取消会减少 hpMax 但不低于1", () => {
    expect(run("永久增加一个生命槽。", { hpMax: 1 }, true)).toEqual({
      kind: "setSheetData",
      updates: { hpMax: 1 },
    })
  })

  it("压力槽勾选会增加 stressMax", () => {
    expect(run("永久增加一个压力槽。", { stressMax: 6 })).toEqual({
      kind: "setSheetData",
      updates: { stressMax: 7 },
    })
  })

  it("压力槽勾选不会超过18，因为组件现有 checkbox 自动化使用18上限", () => {
    expect(run("永久增加一个压力槽。", { stressMax: 18 })).toEqual({
      kind: "setSheetData",
      updates: { stressMax: 18 },
    })
  })

  it("熟练度勾选会点亮下一个熟练度标记", () => {
    expect(run("(同时标记两格) 获得熟练度+1。", {
      proficiency: [true, false, false, false, false, false],
    })).toEqual({
      kind: "setSheetData",
      updates: { proficiency: [true, true, false, false, false, false] },
    })
  })

  it("熟练度取消会熄灭最后一个熟练度标记", () => {
    expect(run("(同时标记两格) 获得熟练度+1。", {
      proficiency: [true, true, false, false, false, false],
    }, true)).toEqual({
      kind: "setSheetData",
      updates: { proficiency: [true, false, false, false, false, false] },
    })
  })

  it("已勾选属性升级选项会请求属性回滚", () => {
    expect(run("两项未升级的角色属性+1，然后将该属性标记为已升级。", {}, true)).toEqual({
      kind: "rollback",
      rollbackKind: "attribute",
    })
  })

  it("已勾选经历升级选项会请求经历回滚", () => {
    expect(run("选择两项经历获得额外+1。", {}, true)).toEqual({
      kind: "rollback",
      rollbackKind: "experience",
    })
  })

  it("已勾选闪避升级选项会请求闪避回滚", () => {
    expect(run("获得闪避值+1。", {}, true)).toEqual({
      kind: "rollback",
      rollbackKind: "evasion",
    })
  })
})
```

- [ ] **Step 2: Run test**

```bash
pnpm exec vitest run tests/unit/automation/upgrade-automation.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/automation/upgrade-automation.test.ts
git commit -m "test(automation): cover upgrade checkbox baseline"
```

---

## Task 7: Rollback Snapshot Baseline

**Files:**
- Create: `tests/unit/automation/rollback-snapshots.test.ts`

- [ ] **Step 1: Write rollback tests**

```ts
import { beforeEach, describe, expect, it } from "vitest"
import { resetSheetStore, sheet, store } from "./test-helpers"

describe("升级回滚快照基线", () => {
  beforeEach(() => resetSheetStore())

  it("属性升级快照存在且当前状态匹配 after 时可以回滚", () => {
    const before = {
      agility: { value: "1", checked: false, spellcasting: false },
      strength: { value: "0", checked: false, spellcasting: false },
      finesse: { value: "0", checked: false, spellcasting: false },
      instinct: { value: "0", checked: false, spellcasting: false },
      presence: { value: "0", checked: false, spellcasting: false },
      knowledge: { value: "0", checked: false, spellcasting: false },
    }
    const after = {
      ...before,
      agility: { value: "2", checked: true, spellcasting: false },
      strength: { value: "1", checked: true, spellcasting: false },
    }
    resetSheetStore(after)
    store().saveAttributeUpgradeRecord("tier1-0-0", before, after)

    const result = store().rollbackAttributeUpgrade("tier1-0-0")

    expect(result).toEqual({ success: true, reason: "success" })
    expect(sheet().agility).toEqual(before.agility)
    expect(sheet().strength).toEqual(before.strength)
  })

  it("属性当前状态与 after 不匹配时返回 conflict 并不回滚", () => {
    const before = {
      agility: { value: "1", checked: false, spellcasting: false },
      strength: { value: "0", checked: false, spellcasting: false },
      finesse: { value: "0", checked: false, spellcasting: false },
      instinct: { value: "0", checked: false, spellcasting: false },
      presence: { value: "0", checked: false, spellcasting: false },
      knowledge: { value: "0", checked: false, spellcasting: false },
    }
    const after = { ...before, agility: { value: "2", checked: true, spellcasting: false } }
    resetSheetStore({ ...after, agility: { value: "3", checked: true, spellcasting: false } })
    store().saveAttributeUpgradeRecord("tier1-0-0", before, after)

    const result = store().rollbackAttributeUpgrade("tier1-0-0")

    expect(result).toEqual({ success: false, reason: "conflict" })
    expect(sheet().agility?.value).toBe("3")
  })

  it("经历快照匹配时可以恢复原经历加值", () => {
    resetSheetStore({ experienceValues: ["1", "2", "", "", ""] })
    store().createExperienceValuesSnapshot([0, 1], { 0: "2", 1: "3" })
    store().setSheetData({ experienceValues: ["2", "3", "", "", ""] })

    const result = store().restoreExperienceValuesSnapshot()

    expect(result).toEqual({ success: true, reason: "success" })
    expect(sheet().experienceValues).toEqual(["1", "2", "", "", ""])
  })

  it("经历快照不匹配时返回 conflict 并清除快照", () => {
    resetSheetStore({ experienceValues: ["1", "2", "", "", ""] })
    store().createExperienceValuesSnapshot([0], { 0: "2" })
    store().setSheetData({ experienceValues: ["4", "2", "", "", ""] })

    const result = store().restoreExperienceValuesSnapshot()

    expect(result).toEqual({ success: false, reason: "conflict" })
    expect(useSheetStore.getState().experienceValuesSnapshot).toBeUndefined()
  })

  it("闪避快照匹配时可以恢复原闪避", () => {
    resetSheetStore({ evasion: "12" })
    store().createEvasionSnapshot("13")
    store().setSheetData({ evasion: "13" })

    const result = store().restoreEvasionSnapshot()

    expect(result).toEqual({ success: true, reason: "success" })
    expect(sheet().evasion).toBe("12")
  })

  it("闪避快照不匹配时返回 conflict 并保留当前闪避", () => {
    resetSheetStore({ evasion: "12" })
    store().createEvasionSnapshot("13")
    store().setSheetData({ evasion: "14" })

    const result = store().restoreEvasionSnapshot()

    expect(result).toEqual({ success: false, reason: "conflict" })
    expect(sheet().evasion).toBe("14")
  })
})
```

Note: Add `import { useSheetStore } from "@/lib/sheet-store"` to this file because one assertion reads non-sheet snapshot state directly.

- [ ] **Step 2: Run test**

```bash
pnpm exec vitest run tests/unit/automation/rollback-snapshots.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/automation/rollback-snapshots.test.ts
git commit -m "test(automation): cover rollback snapshot baseline"
```

---

## Task 8: Component Smoke Tests for Popover Editors

**Files:**
- Create: `tests/unit/automation/component-smoke.test.tsx`

- [ ] **Step 1: Write component smoke tests**

```tsx
import { beforeEach, describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { EvasionEditor } from "@/components/upgrade-popover/evasion-editor"
import { ExperienceValuesEditor } from "@/components/upgrade-popover/experience-values-editor"
import { resetSheetStore, sheet } from "./test-helpers"

describe("升级编辑器组件烟雾测试", () => {
  beforeEach(() => resetSheetStore())

  it("EvasionEditor 确认后写入闪避并勾选对应升级项", async () => {
    const user = userEvent.setup()
    resetSheetStore({ evasion: "12" })

    render(
      <EvasionEditor
        checkKey="tier1-5-0"
        optionIndex={5}
        toggleUpgradeCheckbox={(checkKey, index, checked) => {
          expect(checkKey).toBe("tier1-5-0")
          expect(index).toBe(5)
          expect(checked).toBe(true)
        }}
      />,
    )

    await user.click(screen.getByTitle("计算当前值 +1"))
    await user.click(screen.getByRole("button", { name: /确认/ }))

    expect(sheet().evasion).toBe("13")
  })

  it("ExperienceValuesEditor 确认后写入两项经历加值并勾选对应升级项", async () => {
    const user = userEvent.setup()
    resetSheetStore({
      experience: ["军人", "铁匠", "", "", ""],
      experienceValues: ["1", "2", "", "", ""],
    })

    render(
      <ExperienceValuesEditor
        checkKey="tier1-3-0"
        optionIndex={3}
        toggleUpgradeCheckbox={(checkKey, index, checked) => {
          expect(checkKey).toBe("tier1-3-0")
          expect(index).toBe(3)
          expect(checked).toBe(true)
        }}
      />,
    )

    await user.click(screen.getByText("军人"))
    await user.click(screen.getByText("铁匠"))
    const incrementButtons = screen.getAllByTitle("增加经历加值 (+1)")
    await user.click(incrementButtons[0])
    await user.click(incrementButtons[1])
    await user.click(screen.getByRole("button", { name: /确认/ }))

    expect(sheet().experienceValues?.[0]).toBe("2")
    expect(sheet().experienceValues?.[1]).toBe("3")
  })
})
```

- [ ] **Step 2: Run component smoke test**

```bash
pnpm exec vitest run tests/unit/automation/component-smoke.test.tsx
```

Expected: tests pass under happy-dom. If Radix/portal behavior breaks happy-dom, do not add Playwright yet; first keep direct editor tests without popover wrappers.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/automation/component-smoke.test.tsx
git commit -m "test(automation): add upgrade editor smoke tests"
```

---

## Task 9: Full Baseline Verification

**Files:**
- No source changes.

- [ ] **Step 1: Run focused automation test suite**

```bash
pnpm exec vitest run tests/unit/automation
```

Expected: all automation tests pass.

- [ ] **Step 2: Run full test suite**

```bash
pnpm test:run
```

Expected: all tests pass, including the existing 113 baseline tests and the new automation tests.

- [ ] **Step 3: Record baseline status**

Add a short note to the modifier system design document or a future implementation plan:

```md
Phase 0 automation baseline established with Vitest. New modifier reference layer work must keep `pnpm exec vitest run tests/unit/automation` passing.
```

- [ ] **Step 4: Commit any documentation note**

```bash
git add docs/superpowers/plans/2026-05-03-current-automation-baseline-tests.md
git commit -m "docs: document automation baseline test plan"
```

---

## Task 10: Playwright Decision Gate

**Files:**
- Create only if decision is yes: `playwright.config.ts`
- Create only if decision is yes: `tests/e2e/automation-smoke.spec.ts`
- Modify only if decision is yes: `package.json`

- [ ] **Step 1: Decide whether Playwright is needed**

Add Playwright only if at least one of these is true after Tasks 1-9:

- A critical automation path cannot be covered by store/helper/component tests.
- Card selection modal wiring is too risky to trust without browser coverage.
- Future modifier reference UI depends on popover/portal behavior that happy-dom cannot represent.

- [ ] **Step 2: If no, document no-Playwright decision**

Write:

```md
Playwright deferred. Current automation baseline is sufficiently covered by Vitest store/helper/editor tests. Revisit when modifier reference UI or card modal flows need browser-level coverage.
```

- [ ] **Step 3: If yes, install Playwright**

Run:

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

Expected: package added and Chromium browser installed.

- [ ] **Step 4: If yes, add scripts**

Modify `package.json` scripts:

```json
{
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

- [ ] **Step 5: If yes, add `playwright.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
```

- [ ] **Step 6: If yes, add one initial smoke test**

```ts
import { expect, test } from "@playwright/test"

test("character sheet loads", async ({ page }) => {
  await page.goto("/")
  await expect(page.locator("body")).toBeVisible()
  await expect(page.locator("text=LEVEL").first()).toBeVisible()
})
```

- [ ] **Step 7: If yes, run Playwright**

```bash
pnpm test:e2e
```

Expected: smoke test passes.

- [ ] **Step 8: If yes, commit**

```bash
git add package.json pnpm-lock.yaml playwright.config.ts tests/e2e/automation-smoke.spec.ts
git commit -m "test(e2e): add Playwright smoke baseline"
```

---

## Completion Criteria

- `pnpm exec vitest run tests/unit/automation` passes.
- `pnpm test:run` passes.
- Profession, armor, level, upgrade checkbox, and rollback snapshot automation behavior is covered before modifier reference layer work starts.
- Upgrade checkbox logic is no longer trapped exclusively inside `CharacterSheetPageTwo`.
- Playwright is either intentionally deferred with documented criteria, or added with one passing smoke test.

## Execution Result

Phase 0 automation baseline has been established with Vitest.

- `pnpm exec vitest run tests/unit/automation`: 6 files passed, 34 tests passed.
- `pnpm test:run`: 16 files passed, 147 tests passed.
- Playwright is deferred. The current baseline is sufficiently covered by store/helper/editor tests; revisit Playwright when modifier reference UI, card modal flows, or portal behavior require browser-level coverage.

New modifier reference layer work must keep `pnpm exec vitest run tests/unit/automation` passing.

---

## Self-Review

- Spec coverage: covers current automation baseline, code structure testability, optional Playwright gate, and future modifier work dependency.
- Placeholder scan: no placeholder tasks; Playwright is explicitly gated and includes exact files/commands if chosen.
- Type consistency: `SheetData`, `StandardCard`, `useSheetStore`, and helper names match current repo naming.
