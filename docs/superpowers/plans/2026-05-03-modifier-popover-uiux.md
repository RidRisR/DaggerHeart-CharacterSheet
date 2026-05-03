# Modifier Popover UI/UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the modifier source popover so it is not clipped, closes naturally, and supports manual base/modifier management without changing final sheet values.

**Architecture:** Keep modifier derivation in `lib/modifiers` unchanged. Convert `ModifierFieldAnchor` into the interaction shell that owns open/close, portal rendering, and positioning; convert `ModifierPopover` into an editable panel that calls existing `useSheetStore` modifier actions.

**Tech Stack:** Next.js 15, React 19, Zustand, Testing Library, Vitest, Tailwind CSS, lucide-react.

---

## File Structure

- Modify `components/modifiers/modifier-field-anchor.tsx`: owns trigger button, outside-click/Esc closing, portal rendering, and viewport-clamped floating position.
- Modify `components/modifiers/modifier-popover.tsx`: renders editable base/modifier rows, add forms, validation messages, and delete controls for user entries.
- Modify `tests/unit/modifiers/modifier-popover.test.tsx`: add behavioral tests for portal, closing interactions, base selection, modifier toggling, manual entry add/delete, and final-value preservation.

No changes are planned for registry, target accessors, effect executor, or automation selection logic.

## Task 1: Portal Rendering and Natural Closing

**Files:**
- Modify: `tests/unit/modifiers/modifier-popover.test.tsx`
- Modify: `components/modifiers/modifier-field-anchor.tsx`

- [ ] **Step 1: Write failing tests**

Append tests that render the anchor inside an `overflow-hidden` clipping container, open the popover, and verify:

```tsx
it("renders the popover outside the clipped anchor container", async () => {
  resetSheetStore({ evasion: "13" })

  render(
    <div data-testid="clip" className="overflow-hidden">
      <ModifierFieldAnchor target="evasion" label="闪避" />
    </div>,
  )

  await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

  const popover = screen.getByRole("dialog", { name: "闪避来源" })
  expect(popover).toBeInTheDocument()
  expect(screen.getByTestId("clip")).not.toContainElement(popover)
})

it("closes the popover when clicking outside or pressing Escape", async () => {
  resetSheetStore({ evasion: "13" })

  render(
    <div>
      <ModifierFieldAnchor target="evasion" label="闪避" />
      <button type="button">外部按钮</button>
    </div>,
  )

  await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))
  expect(screen.getByRole("dialog", { name: "闪避来源" })).toBeInTheDocument()

  await userEvent.click(screen.getByRole("button", { name: "外部按钮" }))
  expect(screen.queryByRole("dialog", { name: "闪避来源" })).not.toBeInTheDocument()

  await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))
  await userEvent.keyboard("{Escape}")
  expect(screen.queryByRole("dialog", { name: "闪避来源" })).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/modifier-popover.test.tsx
```

Expected: FAIL because the popover is currently rendered inline and has no dialog role or outside/Esc closing behavior.

- [ ] **Step 3: Implement portal and close behavior**

Update `ModifierFieldAnchor` to:

- keep `buttonRef` and `popoverRef`;
- compute position from `getBoundingClientRect()`;
- render popover with `createPortal`;
- close on document pointer down outside trigger/popover;
- close on `Escape`;
- keep `print:hidden`.

- [ ] **Step 4: Run tests and verify pass**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/modifier-popover.test.tsx
```

Expected: PASS for existing tests plus the two new tests.

## Task 2: Select Base and Toggle Addends

**Files:**
- Modify: `tests/unit/modifiers/modifier-popover.test.tsx`
- Modify: `components/modifiers/modifier-popover.tsx`

- [ ] **Step 1: Write failing tests**

Add tests that seed two manual bases and a manual modifier:

```tsx
it("lets the user select the active base", async () => {
  resetSheetStore({
    evasion: "15",
    modifierState: {
      byTarget: {
        evasion: {
          activeBaseId: "user:evasion-base-12",
          userEntries: [
            { id: "user:evasion-base-12", sourceId: "user:evasion-base-12", target: "evasion", kind: "base", label: "基础 12", value: 12, sourceType: "user", priority: 10 },
            { id: "user:evasion-base-14", sourceId: "user:evasion-base-14", target: "evasion", kind: "base", label: "基础 14", value: 14, sourceType: "user", priority: 10 },
          ],
        },
      },
    },
  })

  render(<ModifierFieldAnchor target="evasion" label="闪避" />)
  await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))
  await userEvent.click(screen.getByRole("radio", { name: /基础 14/ }))

  expect(screen.getByText("参考合计")).toBeInTheDocument()
  expect(screen.getByText("14")).toBeInTheDocument()
})

it("lets the user disable and re-enable a modifier", async () => {
  resetSheetStore({
    evasion: "15",
    modifierState: {
      byTarget: {
        evasion: {
          activeBaseId: "user:evasion-base",
          userEntries: [
            { id: "user:evasion-base", sourceId: "user:evasion-base", target: "evasion", kind: "base", label: "基础", value: 12, sourceType: "user", priority: 10 },
            { id: "user:evasion-mod", sourceId: "user:evasion-mod", target: "evasion", kind: "modifier", label: "加值", value: 2, sourceType: "user", priority: 10 },
          ],
        },
      },
    },
  })

  render(<ModifierFieldAnchor target="evasion" label="闪避" />)
  await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

  await userEvent.click(screen.getByRole("checkbox", { name: /加值/ }))
  expect(screen.getByText("参考合计")).toBeInTheDocument()
  expect(screen.getByText("12")).toBeInTheDocument()

  await userEvent.click(screen.getByRole("checkbox", { name: /加值/ }))
  expect(screen.getByText("14")).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/modifier-popover.test.tsx
```

Expected: FAIL because base rows are not radio controls and modifier rows are not checkboxes.

- [ ] **Step 3: Implement controls**

Update `ModifierPopover` so:

- bases render as radio rows;
- modifiers render as checkbox rows;
- disabled modifier rows remain visible but muted;
- selecting a base calls `setActiveModifierBase(target, entry.id)`;
- toggling a modifier calls `setModifierEntryDisabled(target, entry.id, !checked)`.

- [ ] **Step 4: Run tests and verify pass**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/modifier-popover.test.tsx
```

Expected: PASS.

## Task 3: Add and Delete Manual Sources

**Files:**
- Modify: `tests/unit/modifiers/modifier-popover.test.tsx`
- Modify: `components/modifiers/modifier-popover.tsx`

- [ ] **Step 1: Write failing tests**

Add tests for adding and deleting user sources:

```tsx
it("adds a manual base without changing the final value", async () => {
  resetSheetStore({ evasion: "15" })

  render(<ModifierFieldAnchor target="evasion" label="闪避" />)
  await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))
  await userEvent.type(screen.getByLabelText("基值名称"), "手动基础")
  await userEvent.type(screen.getByLabelText("基值数值"), "12")
  await userEvent.click(screen.getByRole("button", { name: "添加基值" }))

  expect(screen.getByText("手动基础")).toBeInTheDocument()
  expect(screen.getByText("参考合计")).toBeInTheDocument()
  expect(screen.getByText("未归因差额 +3")).toBeInTheDocument()
  expect(screen.queryByDisplayValue("15")).not.toBeInTheDocument()
})

it("adds and deletes a manual modifier", async () => {
  resetSheetStore({
    evasion: "15",
    modifierState: {
      byTarget: {
        evasion: {
          activeBaseId: "user:evasion-base",
          userEntries: [
            { id: "user:evasion-base", sourceId: "user:evasion-base", target: "evasion", kind: "base", label: "基础", value: 12, sourceType: "user", priority: 10 },
          ],
        },
      },
    },
  })

  render(<ModifierFieldAnchor target="evasion" label="闪避" />)
  await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))
  await userEvent.type(screen.getByLabelText("加值名称"), "临时加值")
  await userEvent.type(screen.getByLabelText("加值数值"), "2")
  await userEvent.click(screen.getByRole("button", { name: "添加加值" }))

  expect(screen.getByText("临时加值")).toBeInTheDocument()
  expect(screen.getByText("14")).toBeInTheDocument()

  await userEvent.click(screen.getByRole("button", { name: "删除临时加值" }))
  expect(screen.queryByText("临时加值")).not.toBeInTheDocument()
})

it("rejects non-numeric manual source values", async () => {
  resetSheetStore({ evasion: "15" })

  render(<ModifierFieldAnchor target="evasion" label="闪避" />)
  await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))
  await userEvent.type(screen.getByLabelText("加值数值"), "abc")
  await userEvent.click(screen.getByRole("button", { name: "添加加值" }))

  expect(screen.getByText("请输入数字")).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/modifier-popover.test.tsx
```

Expected: FAIL because there are no add forms, validation messages, or delete buttons.

- [ ] **Step 3: Implement manual source forms**

Update `ModifierPopover` to:

- keep local form state for base and modifier name/value;
- parse values with `tryParseNumber`;
- create `UserModifierEntry` using target, kind, label, value, `sourceType: "user"`, `priority: 10`;
- call `upsertUserModifierEntry`;
- set a newly added base as active when no active base exists;
- clear the submitted form after success;
- show `请输入数字` for invalid values;
- show delete buttons only for `sourceType === "user"` entries.

- [ ] **Step 4: Run tests and verify pass**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/modifier-popover.test.tsx
```

Expected: PASS.

## Task 4: Final Verification

**Files:**
- Verify only.

- [ ] **Step 1: Run targeted tests**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers tests/unit/automation tests/integration/upgrade-cancel-flow.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Inspect diff**

Run:

```bash
git diff --stat
git diff -- components/modifiers/modifier-field-anchor.tsx components/modifiers/modifier-popover.tsx tests/unit/modifiers/modifier-popover.test.tsx
```

Expected: diff only contains the planned UI/test changes.

- [ ] **Step 3: Commit**

Run:

```bash
git add components/modifiers/modifier-field-anchor.tsx components/modifiers/modifier-popover.tsx tests/unit/modifiers/modifier-popover.test.tsx docs/superpowers/plans/2026-05-03-modifier-popover-uiux.md
git commit -m "feat(modifiers): improve popover source editing"
```

Expected: commit succeeds.
