# Base Reference And Armor Input Implementation Plan

> **状态：执行前需更新。** 本计划仍覆盖当前 no-base 和护甲输入目标，但其中部分测试 fixture
> 和步骤早于 `2026-05-19-automatic-calculation-boundary-design.md`。执行前必须更新：
> `applyAutoCalculationForTargets` 视为共享 boundary executor；同步范围为有限 Modifier Target Universe；
> disabled target 仍归一化 source/reference/active base；`autoCalculation: true` 不作为独立持久化偏好。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** First enforce the modifier invariant that final values require a real base, then make armor value and threshold inputs editable without hidden stale values.

**Architecture:** The system phase changes the shared modifier sync path so no source action owns provider-specific active-base cleanup. The armor phase updates parsing and UI inputs to produce structured armor source data, then relies on the shared modifier sync behavior.

**Tech Stack:** TypeScript, React, Zustand store, Vitest, Testing Library.

---

## Specs

- `docs/superpowers/specs/2026-05-19-modifier-base-reference-invariant-design.md`
- `docs/superpowers/specs/2026-05-19-armor-value-threshold-input-design.md`

## File Map

- Modify `lib/modifiers/target-sync.ts`: write empty final values when auto calculation has no base.
- Modify `lib/modifiers/target-accessors.ts`: allow writing empty strings to `hpMax` / `stressMax`; keep numeric writes numeric.
- Modify `lib/default-sheet-data.ts`: default `hpMax` / `stressMax` to empty strings.
- Modify `lib/sheet-data.ts`: type `hpMax` / `stressMax` as `number | string`.
- Modify `lib/character-data-validator.ts`: preserve string values for `hpMax` / `stressMax`.
- Modify `components/character-sheet-sections/hit-points-section.tsx`: remove hidden `6` UI fallback for max inputs and boxes.
- Modify `lib/equipment/armor-utils.ts`: expose side parser and parse half-structured threshold strings.
- Modify `lib/sheet-store.ts`: add side-specific armor threshold action; keep whole-string action for import/legacy paths.
- Modify `components/character-sheet-sections/armor-section.tsx`: use draft inputs for armor max and separate minor/major threshold inputs.
- Modify `components/modals/armor-selection-modal.tsx`: submit custom armor thresholds as structured object and use text inputs.
- Test `tests/unit/modifiers/target-sync.test.ts`: no-base final behavior.
- Test `tests/unit/modifiers/store-actions.test.ts`: armor side source update and final sync.
- Test `tests/unit/equipment/template-to-slot.test.ts`: parser and custom payload half-structured behavior.
- Test `tests/unit/modifiers/final-target-editors.test.tsx`: hit point default/max UI and armor section interaction tests.

---

### Task 1: System No-Base Auto Calculation

**Files:**
- Modify: `tests/unit/modifiers/target-sync.test.ts`
- Modify: `lib/modifiers/target-sync.ts`
- Modify: `lib/modifiers/target-accessors.ts`

- [ ] **Step 1: Replace stale no-reference test with failing no-base behavior tests**

In `tests/unit/modifiers/target-sync.test.ts`, replace the test named `keeps existing values without fallback when auto target has no reference total` with:

```ts
  it("clears auto calculation finals when a target has no base", () => {
    const data = sheet({
      evasion: "10",
      hpMax: 9,
      stressMax: 8,
      armorMax: 3,
      minorThreshold: "12",
      majorThreshold: "24",
      modifierState: {
        targetStates: {
          evasion: { autoCalculation: true },
          hpMax: { autoCalculation: true },
          stressMax: { autoCalculation: true },
          armorMax: { autoCalculation: true },
          minorThreshold: { autoCalculation: true },
          majorThreshold: { autoCalculation: true },
        },
        entryStates: {},
      },
    })

    const result = applyAutoCalculationForTargets(data)

    expect(result).not.toBe(data)
    expect(result.evasion).toBe("")
    expect(result.hpMax).toBe("")
    expect(result.stressMax).toBe("")
    expect(result.armorMax).toBe("")
    expect(result.minorThreshold).toBe("")
    expect(result.majorThreshold).toBe("")
  })

  it("keeps manual finals when auto calculation is disabled and a target has no base", () => {
    const data = sheet({
      evasion: "10",
      hpMax: 9,
      stressMax: 8,
      armorMax: 3,
      modifierState: {
        targetStates: {
          evasion: { autoCalculation: false },
          hpMax: { autoCalculation: false },
          stressMax: { autoCalculation: false },
          armorMax: { autoCalculation: false },
        },
        entryStates: {},
      },
    })

    const result = applyAutoCalculationForTargets(data)

    expect(result).toBe(data)
    expect(result.evasion).toBe("10")
    expect(result.hpMax).toBe(9)
    expect(result.stressMax).toBe(8)
    expect(result.armorMax).toBe(3)
  })

  it("falls back to another base when the saved active base disappeared", () => {
    const data = sheet({
      evasion: "10",
      userModifierContributions: [
        {
          id: "user:evasion-fallback-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Fallback", value: 14 },
        },
      ],
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: "user:evasion-missing-base", autoCalculation: true },
        },
        entryStates: {},
      },
    })

    const result = applyAutoCalculationForTargets(data)

    expect(result.evasion).toBe("14")
  })
```

- [ ] **Step 2: Run target-sync tests and verify RED**

Run:

```bash
npm run test:run -- tests/unit/modifiers/target-sync.test.ts
```

Expected:

- `clears auto calculation finals when a target has no base` fails because no-base values are currently preserved.
- Existing tests may also reveal `hpMax` / `stressMax` cannot hold `""` yet.

- [ ] **Step 3: Add empty target value support**

In `lib/modifiers/target-accessors.ts`, change the `hpMax` / `stressMax` writer to preserve empty strings:

```ts
  if (target === "hpMax" || target === "stressMax") {
    return { ...sheetData, [target]: value === "" ? "" : Number(value) }
  }
```

Do not change `proficiency`; it still writes a checked-count array when a numeric calculated final exists.

- [ ] **Step 4: Write no-base empty values from target sync**

In `lib/modifiers/target-sync.ts`, update the sync loop so `undefined` calculated final writes `""` instead of returning:

```ts
    const desiredValue = getReferenceSummary(next, target).calculatedFinalTotal
    const valueToWrite = desiredValue ?? ""
    if (isSameTargetValue(currentValue, valueToWrite)) return

    next = writeTargetValueFromSync(next, target, valueToWrite)
    changed = true
```

Keep this existing guard before the write:

```ts
    if (!isBlankTargetValue(currentValue) && tryParseNumber(currentValue) === undefined) return
```

It prevents auto sync from overwriting explicitly non-numeric manual text.

- [ ] **Step 5: Run target-sync tests and verify GREEN**

Run:

```bash
npm run test:run -- tests/unit/modifiers/target-sync.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit system no-base sync**

Run:

```bash
git add tests/unit/modifiers/target-sync.test.ts lib/modifiers/target-sync.ts lib/modifiers/target-accessors.ts
git commit -m "fix: clear auto finals without modifier bases"
```

---

### Task 2: Remove Hidden HP/Stress Default Six

**Files:**
- Modify: `tests/unit/modifiers/target-sync.test.ts`
- Modify: `tests/unit/modifiers/final-target-editors.test.tsx`
- Modify: `lib/default-sheet-data.ts`
- Modify: `lib/sheet-data.ts`
- Modify: `lib/character-data-validator.ts`
- Modify: `components/character-sheet-sections/hit-points-section.tsx`

- [ ] **Step 1: Add failing default data assertions**

In `tests/unit/modifiers/target-sync.test.ts`, add this test near the top of the `describe` block:

```ts
  it("starts hp and stress max as blank finals without hidden default bases", () => {
    expect(defaultSheetData.hpMax).toBe("")
    expect(defaultSheetData.stressMax).toBe("")
  })
```

- [ ] **Step 2: Add failing hit point UI regression test**

In `tests/unit/modifiers/final-target-editors.test.tsx`, add or update a test under the `HitPointsSection` group:

```tsx
  it("does not render hidden default six boxes when hp and stress max are blank", () => {
    resetSheetStore({
      hpMax: "",
      stressMax: "",
      hp: Array(18).fill(false),
      stress: Array(18).fill(false),
    })

    render(<HitPointsSection />)

    const hpInput = screen.getByDisplayValue("")
    expect(hpInput).toBeInTheDocument()
    expect(screen.getByTitle("减少HP上限")).toBeDisabled()
    expect(screen.getByTitle("减少压力上限")).toBeDisabled()
  })
```

If `getByDisplayValue("")` is ambiguous, query the max inputs by their surrounding labels or switch to `getAllByDisplayValue("")` and assert at least two max inputs are present.

- [ ] **Step 3: Run tests and verify RED**

Run:

```bash
npm run test:run -- tests/unit/modifiers/target-sync.test.ts tests/unit/modifiers/final-target-editors.test.tsx
```

Expected:

- Default data assertion fails because defaults are currently `6`.
- UI test fails because controls still use `|| 6`.

- [ ] **Step 4: Update SheetData and validator types**

In `lib/sheet-data.ts`, change:

```ts
  hpMax?: number
  stressMax?: number
```

to:

```ts
  hpMax?: number | string
  stressMax?: number | string
```

In `lib/character-data-validator.ts`, change hp/stress validation to preserve number or string:

```ts
    hpMax: typeof data.hpMax === 'number' || typeof data.hpMax === 'string' ? data.hpMax : undefined,
    stressMax: typeof data.stressMax === 'number' || typeof data.stressMax === 'string' ? data.stressMax : undefined,
```

- [ ] **Step 5: Update default sheet data**

In `lib/default-sheet-data.ts`, change:

```ts
    hpMax: 6,
    stressMax: 6,
```

to:

```ts
    hpMax: "",
    stressMax: "",
```

Remove comments that describe `6` as a common base.

- [ ] **Step 6: Remove hidden UI fallback to six**

In `components/character-sheet-sections/hit-points-section.tsx`, add a helper:

```ts
  const numericMax = (value: unknown) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  }
```

Change max controls to use `numericMax`:

```ts
    const currentMax = numericMax(formData[maxField])
```

For increase:

```ts
    if (currentMax < 18) {
      handleMaxChange(field, String(currentMax + 1), true)
    }
```

For decrease:

```ts
    if (currentMax > 1) {
      handleMaxChange(field, String(currentMax - 1), true)
    }
```

Change disabled states:

```tsx
disabled={numericMax(formData.hpMax) <= 1}
disabled={numericMax(formData.hpMax) >= 18}
disabled={numericMax(formData.stressMax) <= 1}
disabled={numericMax(formData.stressMax) >= 18}
```

Change box rendering:

```tsx
{renderBoxes("hp", numericMax(formData.hpMax), 18)}
{renderBoxes("stress", numericMax(formData.stressMax), 18)}
```

Change placeholders from `"6"` to `""`.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run:

```bash
npm run test:run -- tests/unit/modifiers/target-sync.test.ts tests/unit/modifiers/final-target-editors.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit default max cleanup**

Run:

```bash
git add tests/unit/modifiers/target-sync.test.ts tests/unit/modifiers/final-target-editors.test.tsx lib/default-sheet-data.ts lib/sheet-data.ts lib/character-data-validator.ts components/character-sheet-sections/hit-points-section.tsx
git commit -m "fix: remove hidden hp stress max defaults"
```

---

### Task 3: Armor Threshold Parsing

**Files:**
- Modify: `tests/unit/equipment/template-to-slot.test.ts`
- Modify: `lib/equipment/armor-utils.ts`

- [ ] **Step 1: Add failing parser tests through custom payload**

In `tests/unit/equipment/template-to-slot.test.ts`, add:

```ts
  it.each([
    ["9/", { minor: 9, major: null }],
    ["/21", { minor: null, major: 21 }],
    ["9/abc", { minor: 9, major: null }],
    ["abc/21", { minor: null, major: 21 }],
    ["9", { minor: 9, major: null }],
    ["abc", { minor: null, major: null }],
  ])("parses half-structured armor threshold payload %s", (threshold, expected) => {
    const slot = createArmorSlotFromCustomPayload({
      名称: "自定义护甲",
      护甲值: "4",
      伤害阈值: threshold,
    })

    expect(slot.baseThresholds).toEqual(expected)
  })

  it("parses structured armor threshold payload sides independently", () => {
    const slot = createArmorSlotFromCustomPayload({
      名称: "自定义护甲",
      护甲值: "4",
      伤害阈值: { minor: "10+3", major: "bad" },
    })

    expect(slot.baseThresholds).toEqual({ minor: 13, major: null })
  })
```

- [ ] **Step 2: Run parser tests and verify RED**

Run:

```bash
npm run test:run -- tests/unit/equipment/template-to-slot.test.ts
```

Expected: half-structured string cases fail because current parser requires both sides.

- [ ] **Step 3: Export side parser and update whole parser**

In `lib/equipment/armor-utils.ts`, export the side parser and update string parsing:

```ts
export function parseArmorThresholdSide(value: unknown): number | null {
  const parsed = tryParseNumber(value)
  return parsed === undefined ? null : parsed
}
```

Replace calls to `parseThresholdSide` with `parseArmorThresholdSide`.

For string input, implement:

```ts
  const text = String(value ?? "").replace(/[()]/g, "").trim()
  const parts = text.split("/")

  if (parts.length === 1) {
    return {
      minor: parseArmorThresholdSide(parts[0]),
      major: null,
    }
  }

  if (parts.length !== 2) {
    return { minor: null, major: null }
  }

  const [minorRaw, majorRaw] = parts
  return {
    minor: parseArmorThresholdSide(minorRaw),
    major: parseArmorThresholdSide(majorRaw),
  }
```

- [ ] **Step 4: Run parser tests and verify GREEN**

Run:

```bash
npm run test:run -- tests/unit/equipment/template-to-slot.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit parser behavior**

Run:

```bash
git add tests/unit/equipment/template-to-slot.test.ts lib/equipment/armor-utils.ts
git commit -m "feat: parse armor thresholds by side"
```

---

### Task 4: Store Actions For Armor Side Updates

**Files:**
- Modify: `tests/unit/modifiers/store-actions.test.ts`
- Modify: `lib/sheet-store.ts`

- [ ] **Step 1: Add failing store action tests**

In `tests/unit/modifiers/store-actions.test.ts`, add:

```ts
  it("updates one armor threshold side without changing the other side", () => {
    resetSheetStore({
      level: "1",
      minorThreshold: "8",
      majorThreshold: "16",
      equipment: {
        ...defaultSheetData.equipment,
        armorSlot: {
          ...defaultSheetData.equipment.armorSlot,
          baseThresholds: { minor: 7, major: 15 },
        },
      },
      modifierState: {
        targetStates: {
          minorThreshold: {
            activeBaseId: "equipment:armor:current:minorThreshold",
            autoCalculation: true,
          },
          majorThreshold: {
            activeBaseId: "equipment:armor:current:majorThreshold",
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
    })

    store().updateArmorBaseThresholdSide("minor", "10+3")

    expect(sheet().equipment.armorSlot.baseThresholds).toEqual({ minor: 13, major: 15 })
    expect(sheet().minorThreshold).toBe("14")
    expect(sheet().majorThreshold).toBe("16")
  })

  it("clears only the edited armor threshold side when side input is invalid", () => {
    resetSheetStore({
      level: "1",
      minorThreshold: "8",
      majorThreshold: "16",
      equipment: {
        ...defaultSheetData.equipment,
        armorSlot: {
          ...defaultSheetData.equipment.armorSlot,
          baseThresholds: { minor: 7, major: 15 },
        },
      },
      modifierState: {
        targetStates: {
          minorThreshold: {
            activeBaseId: "equipment:armor:current:minorThreshold",
            autoCalculation: true,
          },
          majorThreshold: {
            activeBaseId: "equipment:armor:current:majorThreshold",
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
    })

    store().updateArmorBaseThresholdSide("minor", "bad")

    expect(sheet().equipment.armorSlot.baseThresholds).toEqual({ minor: null, major: 15 })
    expect(sheet().minorThreshold).toBe("")
    expect(sheet().majorThreshold).toBe("16")
  })

  it("updates both armor threshold sides when side input contains a slash", () => {
    resetSheetStore({
      level: "1",
      equipment: {
        ...defaultSheetData.equipment,
        armorSlot: {
          ...defaultSheetData.equipment.armorSlot,
          baseThresholds: { minor: 7, major: 15 },
        },
      },
    })

    store().updateArmorBaseThresholdSide("major", "13/abc")

    expect(sheet().equipment.armorSlot.baseThresholds).toEqual({ minor: 13, major: null })
  })
```

- [ ] **Step 2: Run store tests and verify RED**

Run:

```bash
npm run test:run -- tests/unit/modifiers/store-actions.test.ts -t "armor threshold side"
```

Expected: FAIL because `updateArmorBaseThresholdSide` does not exist.

- [ ] **Step 3: Add the store action type**

In the `SheetState` interface in `lib/sheet-store.ts`, add:

```ts
    updateArmorBaseThresholdSide: (side: "minor" | "major", value: string) => void;
```

- [ ] **Step 4: Implement side update action**

Import `parseArmorThresholdSide` from `@/lib/equipment/armor-utils`.

Add the action near `updateArmorBaseThresholds`:

```ts
    updateArmorBaseThresholdSide: (side, value) => set((state) => {
        const baseThresholds = value.includes("/")
            ? parseArmorThreshold(value)
            : {
                ...state.sheetData.equipment.armorSlot.baseThresholds,
                [side]: parseArmorThresholdSide(value),
            };

        const armorSlot: ArmorSlot = {
            ...state.sheetData.equipment.armorSlot,
            baseThresholds,
        };

        return {
            sheetData: applyAutoCalculationForTargets({
                ...state.sheetData,
                equipment: {
                    ...state.sheetData.equipment,
                    armorSlot,
                },
            }),
        };
    }),
```

Keep `updateArmorBaseThresholds` for legacy whole-string callers.

- [ ] **Step 5: Run store tests and verify GREEN**

Run:

```bash
npm run test:run -- tests/unit/modifiers/store-actions.test.ts -t "armor threshold side"
```

Expected: PASS.

- [ ] **Step 6: Commit armor side store action**

Run:

```bash
git add tests/unit/modifiers/store-actions.test.ts lib/sheet-store.ts
git commit -m "feat: update armor threshold sides"
```

---

### Task 5: Armor Section Inputs

**Files:**
- Modify: `tests/unit/modifiers/equipment-provider-popover.test.tsx`
- Modify: `components/character-sheet-sections/armor-section.tsx`

- [ ] **Step 1: Add failing armor section UI tests**

In `tests/unit/modifiers/equipment-provider-popover.test.tsx`, add:

```tsx
  it("edits armor thresholds through separate minor and major inputs", async () => {
    resetSheetStore({
      equipment: {
        ...defaultSheetData.equipment,
        armorSlot: {
          ...defaultSheetData.equipment.armorSlot,
          baseArmorMax: 4,
          baseThresholds: { minor: 7, major: 15 },
        },
      },
    })

    render(<ArmorSection onOpenArmorModal={vi.fn()} />)

    const minorInput = screen.getByRole("textbox", { name: "重伤阈值" })
    const majorInput = screen.getByRole("textbox", { name: "严重阈值" })

    await userEvent.clear(minorInput)
    await userEvent.type(minorInput, "10+3")
    await userEvent.tab()

    expect(useSheetStore.getState().sheetData.equipment.armorSlot.baseThresholds).toEqual({
      minor: 13,
      major: 15,
    })

    await userEvent.clear(majorInput)
    await userEvent.type(majorInput, "bad")
    await userEvent.tab()

    expect(useSheetStore.getState().sheetData.equipment.armorSlot.baseThresholds).toEqual({
      minor: 13,
      major: null,
    })
  })

  it("pastes a full armor threshold into either threshold input", async () => {
    resetSheetStore({
      equipment: {
        ...defaultSheetData.equipment,
        armorSlot: {
          ...defaultSheetData.equipment.armorSlot,
          baseThresholds: { minor: 7, major: 15 },
        },
      },
    })

    render(<ArmorSection onOpenArmorModal={vi.fn()} />)

    const majorInput = screen.getByRole("textbox", { name: "严重阈值" })
    await userEvent.clear(majorInput)
    await userEvent.type(majorInput, "13/abc")
    await userEvent.tab()

    expect(useSheetStore.getState().sheetData.equipment.armorSlot.baseThresholds).toEqual({
      minor: 13,
      major: null,
    })
  })
```

- [ ] **Step 2: Run armor section tests and verify RED**

Run:

```bash
npm run test:run -- tests/unit/modifiers/equipment-provider-popover.test.tsx -t "armor threshold"
```

Expected: FAIL because the separate inputs do not exist.

- [ ] **Step 3: Replace whole threshold input with two draft inputs**

In `components/character-sheet-sections/armor-section.tsx`:

- Remove `formatArmorThreshold` import.
- Destructure `updateArmorBaseThresholdSide`.
- Add state:

```ts
  const [baseArmorMaxDraft, setBaseArmorMaxDraft] = useState<string | null>(null)
  const [thresholdDrafts, setThresholdDrafts] = useState<Partial<Record<"minor" | "major", string>>>({})
```

Add helpers:

```ts
  const baseArmorMaxValue = baseArmorMaxDraft ?? (armorSlot.baseArmorMax === null ? "" : String(armorSlot.baseArmorMax))
  const thresholdValue = (side: "minor" | "major") => (
    thresholdDrafts[side] ?? (armorSlot.baseThresholds[side] === null ? "" : String(armorSlot.baseThresholds[side]))
  )

  const commitBaseArmorMax = () => {
    updateArmorBaseMax(baseArmorMaxDraft ?? baseArmorMaxValue)
    setBaseArmorMaxDraft(null)
  }

  const commitThresholdSide = (side: "minor" | "major") => {
    updateArmorBaseThresholdSide(side, thresholdValue(side))
    setThresholdDrafts((prev) => {
      const next = { ...prev }
      delete next[side]
      return next
    })
  }
```

Update the armor max input:

```tsx
          <input
            type="text"
            aria-label="护甲值"
            name="baseArmorMax"
            value={baseArmorMaxValue}
            onChange={(event) => setBaseArmorMaxDraft(event.target.value)}
            onBlur={commitBaseArmorMax}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitBaseArmorMax()
                event.currentTarget.blur()
              }
            }}
            {...getElementProps(baseArmorMaxValue, "armor-base-score")}
            className="w-full border-b border-gray-400 focus:outline-none print-empty-hide"
          />
```

Replace the single threshold input with:

```tsx
          <div className="flex items-center gap-1">
            <input
              type="text"
              aria-label="重伤阈值"
              value={thresholdValue("minor")}
              onChange={(event) => setThresholdDrafts((prev) => ({ ...prev, minor: event.target.value }))}
              onBlur={() => commitThresholdSide("minor")}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitThresholdSide("minor")
                  event.currentTarget.blur()
                }
              }}
              placeholder="重伤"
              {...getElementProps(thresholdValue("minor"), "armor-threshold-minor")}
              className="min-w-0 flex-1 border-b border-gray-400 text-center focus:outline-none print-empty-hide"
            />
            <span className="text-gray-500">/</span>
            <input
              type="text"
              aria-label="严重阈值"
              value={thresholdValue("major")}
              onChange={(event) => setThresholdDrafts((prev) => ({ ...prev, major: event.target.value }))}
              onBlur={() => commitThresholdSide("major")}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitThresholdSide("major")
                  event.currentTarget.blur()
                }
              }}
              placeholder="严重"
              {...getElementProps(thresholdValue("major"), "armor-threshold-major")}
              className="min-w-0 flex-1 border-b border-gray-400 text-center focus:outline-none print-empty-hide"
            />
          </div>
```

Keep feature/name editing unchanged.

- [ ] **Step 4: Run armor section tests and verify GREEN**

Run:

```bash
npm run test:run -- tests/unit/modifiers/equipment-provider-popover.test.tsx -t "armor threshold"
```

Expected: PASS.

- [ ] **Step 5: Commit armor section inputs**

Run:

```bash
git add tests/unit/modifiers/equipment-provider-popover.test.tsx components/character-sheet-sections/armor-section.tsx
git commit -m "feat: split armor threshold inputs"
```

---

### Task 6: Custom Armor Modal Structured Payload

**Files:**
- Modify: `components/modals/armor-selection-modal.tsx`
- Modify: `tests/unit/equipment/template-to-slot.test.ts`

- [ ] **Step 1: Add failing custom object payload test**

In `tests/unit/equipment/template-to-slot.test.ts`, add:

```ts
  it("keeps half-structured custom modal armor threshold objects", () => {
    const slot = createArmorSlotFromCustomPayload({
      名称: "自定义护甲",
      护甲值: "5+1",
      伤害阈值: { minor: "8", major: "" },
    })

    expect(slot.baseArmorMax).toBe(6)
    expect(slot.baseThresholds).toEqual({ minor: 8, major: null })
  })
```

This may already pass after Task 3; keep it as coverage for the modal payload shape.

- [ ] **Step 2: Run payload tests**

Run:

```bash
npm run test:run -- tests/unit/equipment/template-to-slot.test.ts
```

Expected: PASS or RED only if object payload parsing still needs adjustment. If RED, fix `parseArmorThreshold` object path using `parseArmorThresholdSide`.

- [ ] **Step 3: Update modal input types and payload**

In `components/modals/armor-selection-modal.tsx`, change the three custom numeric inputs from `type="number"` to `type="text"`.

Change custom armor submit payload from:

```ts
                      const damageThreshold = customDamageThreshold1 && customDamageThreshold2
                        ? `${customDamageThreshold1}/${customDamageThreshold2}`
                        : (customDamageThreshold1 || customDamageThreshold2 || "");
```

to:

```ts
                      const damageThreshold = {
                        minor: customDamageThreshold1,
                        major: customDamageThreshold2,
                      };
```

Change:

```ts
                        护甲值: customArmorValue || 0,
```

to:

```ts
                        护甲值: customArmorValue,
```

Change the armor value state update from `parseInt` to preserving text:

```tsx
                      onChange={e => setCustomArmorValue(e.target.value)}
```

- [ ] **Step 4: Run custom payload tests**

Run:

```bash
npm run test:run -- tests/unit/equipment/template-to-slot.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit custom armor modal update**

Run:

```bash
git add components/modals/armor-selection-modal.tsx tests/unit/equipment/template-to-slot.test.ts
git commit -m "feat: submit custom armor thresholds structurally"
```

---

### Task 7: Integration Verification

**Files:**
- No source edits unless verification finds a defect.

- [ ] **Step 1: Run focused modifier and equipment tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/target-sync.test.ts tests/unit/modifiers/store-actions.test.ts tests/unit/equipment/template-to-slot.test.ts tests/unit/modifiers/equipment-provider-popover.test.tsx tests/unit/modifiers/final-target-editors.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run broader automation and migration tests touched by system defaults**

Run:

```bash
npm run test:run -- tests/unit/automation tests/unit/modifiers/migration.test.ts tests/unit/character-data-validator.test.ts
```

Expected: PASS. If tests still assert hidden default `6`, update those tests only when they conflict with the approved specs.

- [ ] **Step 3: Build**

Run:

```bash
npm run build
```

Expected: build succeeds.

Note: this repo may regenerate `lib/embedded-styles.ts` during build. If that file changes only due to generated CSS extraction, restore it before committing verification cleanup:

```bash
git restore lib/embedded-styles.ts
```

- [ ] **Step 4: Check whitespace and status**

Run:

```bash
git diff --check
git status --short
```

Expected:

- `git diff --check` has no output.
- `git status --short` shows only intentional files before final commit, or clean if every task committed.

- [ ] **Step 5: Final commit if verification required cleanup**

If verification fixes were needed, commit them:

```bash
git add tests/unit/modifiers/target-sync.test.ts tests/unit/modifiers/store-actions.test.ts tests/unit/equipment/template-to-slot.test.ts tests/unit/modifiers/equipment-provider-popover.test.tsx tests/unit/modifiers/final-target-editors.test.tsx lib/modifiers/target-sync.ts lib/modifiers/target-accessors.ts lib/default-sheet-data.ts lib/sheet-data.ts lib/character-data-validator.ts components/character-sheet-sections/hit-points-section.tsx lib/equipment/armor-utils.ts lib/sheet-store.ts components/character-sheet-sections/armor-section.tsx components/modals/armor-selection-modal.tsx
git commit -m "test: verify base reference armor input behavior"
```

---

## Plan Self-Review

- Spec coverage: Task 1 covers no-base final and fallback to another base. Task 2 covers blank hp/stress defaults and hidden `6` removal. Tasks 3-6 cover armor parser, source updates, UI split inputs, custom modal structured payloads, and migration/import parser semantics. Task 7 covers focused and broader verification.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation steps remain.
- Type consistency: `hpMax` / `stressMax` become `number | string`; `writeTargetValue` accepts `""`; `updateArmorBaseThresholdSide` uses `"minor" | "major"` consistently.
