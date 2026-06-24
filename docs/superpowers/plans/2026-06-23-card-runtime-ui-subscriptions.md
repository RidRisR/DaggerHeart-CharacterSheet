# Card Runtime UI Subscriptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make card-management UI subscribe to the card runtime read model instead of copying runtime card/batch snapshots into local React state.

**Architecture:** `UnifiedCardStore` is the runtime read-model publisher. UI derives card-pack list items, modal card lists, and batch filter options from subscribed store state (`cards`, `batches`, `initialized`) so runtime source rebuilds immediately update the UI. Source-specific UI rules live in a runtime view-model helper, not in page/component conditionals.

**Tech Stack:** TypeScript, React, Next.js, Zustand, Vitest, Testing Library.

---

## Required Reading

Read these before Task 1:

- `AGENTS.md`
- `CONTEXT.md`
- `docs/architecture/ui-business-boundaries.md`
- `docs/architecture/storage-boundaries.md`
- `docs/architecture/testing.md`
- `docs/superpowers/specs/2026-06-22-card-runtime-source-assembly-design.md`
- `docs/superpowers/plans/2026-06-23-card-runtime-source-assembly.md`

## Scope

This plan replaces Task 7 from `docs/superpowers/plans/2026-06-23-card-runtime-source-assembly.md`.

Do:

- derive card-pack UI rows from subscribed runtime `batches`;
- derive card detail modal contents from subscribed runtime `cards` and `batches`;
- derive card selection modal batch options and card lists from subscribed runtime state;
- centralize card source UI capabilities in a view-model helper.

Do not:

- change runtime source assembly semantics;
- add manual `refreshCardData()` calls as the main solution;
- add runtime version counters unless Map subscriptions cannot cover the current UI;
- change automation IR validation, import compilation, or storage schema;
- change equipment pack behavior except where existing card-manager mixed refresh calls become unnecessary for cards.

## File Structure

Create:

- `card/runtime/card-pack-view-model.ts`: converts runtime `BatchInfo` into UI list items with source capabilities.
- `card/runtime/__tests__/card-pack-view-model.test.ts`: covers built-in and custom capability projection.

Modify:

- `components/content-pack-manager/card-pack-tab.tsx`: consumes source capability fields instead of `isSystemBatch`.
- `components/content-pack-manager/__tests__/card-pack-tab.test.tsx`: updates list item fixtures and action expectations.
- `app/card-manager/page.tsx`: subscribes to `useUnifiedCardStore` runtime state and derives `batches` / `viewingCards`.
- `app/card-manager/__tests__/card-manager-card-lifecycle.test.tsx`: replaces one-shot `getAllBatches()` mock with a reactive store mock.
- `components/modals/generic-card-selection-modal.tsx`: derives batch options and selectable cards from subscribed runtime state.

## Task 1: Add Card Runtime Source View Model

**Files:**

- Create: `card/runtime/card-pack-view-model.ts`
- Create: `card/runtime/__tests__/card-pack-view-model.test.ts`

- [x] **Step 1: Write view-model tests**

Create `card/runtime/__tests__/card-pack-view-model.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { CardType, type BatchInfo } from "@/card/stores/store-types"
import { CARD_BUILTIN_SOURCE_ID } from "../source-types"
import { toCardRuntimeSourceListItem } from "../card-pack-view-model"

function batch(overrides: Partial<BatchInfo> = {}): BatchInfo {
  return {
    id: "pack_custom",
    name: "Custom Pack",
    fileName: "custom.json",
    importTime: "2026-06-23T00:00:00.000Z",
    author: "Tester",
    version: "1.0.0",
    cardCount: 2,
    cardTypes: [CardType.Profession],
    size: 100,
    disabled: false,
    cardIds: ["a", "b"],
    ...overrides,
  }
}

describe("toCardRuntimeSourceListItem", () => {
  it("projects built-in source capabilities without exposing storage flags", () => {
    expect(
      toCardRuntimeSourceListItem(
        batch({
          id: CARD_BUILTIN_SOURCE_ID,
          name: "系统内置卡牌",
          fileName: "builtin-base.json",
          importTime: "builtin",
          author: undefined,
          version: undefined,
          isSystemBatch: true,
          disabled: false,
        }),
      ),
    ).toEqual({
      sourceId: CARD_BUILTIN_SOURCE_ID,
      name: "系统内置卡牌",
      author: "",
      version: "",
      fileName: "builtin-base.json",
      importTime: "builtin",
      cardCount: 2,
      cardTypes: [CardType.Profession],
      disabled: false,
      sourceLabel: "系统内置",
      canDisable: true,
      canRemove: false,
      canViewCards: true,
    })
  })

  it("projects disabled custom source capabilities", () => {
    expect(toCardRuntimeSourceListItem(batch({ disabled: true }))).toMatchObject({
      sourceId: "pack_custom",
      sourceLabel: "导入文件：custom.json",
      disabled: true,
      canDisable: true,
      canRemove: true,
      canViewCards: false,
    })
  })
})
```

- [x] **Step 2: Run view-model tests and verify failure**

Run:

```bash
pnpm test:run card/runtime/__tests__/card-pack-view-model.test.ts
```

Expected: FAIL because `card-pack-view-model.ts` does not exist.

- [x] **Step 3: Implement view-model helper**

Create `card/runtime/card-pack-view-model.ts`:

```ts
import type { BatchInfo } from "@/card/stores/store-types"
import { CARD_BUILTIN_SOURCE_ID } from "./source-types"

export interface CardRuntimeSourceListItem {
  sourceId: string
  name: string
  author: string
  version: string
  fileName: string
  importTime: string
  cardCount: number
  cardTypes: string[]
  disabled: boolean
  sourceLabel: string
  canDisable: boolean
  canRemove: boolean
  canViewCards: boolean
}

export function toCardRuntimeSourceListItem(batch: BatchInfo): CardRuntimeSourceListItem {
  const isBuiltin = batch.id === CARD_BUILTIN_SOURCE_ID
  const disabled = batch.disabled === true

  return {
    sourceId: batch.id,
    name: batch.name,
    author: batch.author ?? "",
    version: batch.version ?? "",
    fileName: batch.fileName ?? "",
    importTime: batch.importTime,
    cardCount: batch.cardCount,
    cardTypes: batch.cardTypes,
    disabled,
    sourceLabel: isBuiltin ? "系统内置" : batch.fileName ? `导入文件：${batch.fileName}` : "本地导入",
    canDisable: true,
    canRemove: !isBuiltin,
    canViewCards: !disabled,
  }
}
```

- [x] **Step 4: Run view-model tests and verify pass**

Run:

```bash
pnpm test:run card/runtime/__tests__/card-pack-view-model.test.ts
```

Expected: PASS.

- [x] **Step 5: Commit view model**

```bash
git add card/runtime/card-pack-view-model.ts card/runtime/__tests__/card-pack-view-model.test.ts
git commit -m "feat: add card runtime source view model"
```

## Task 2: Update CardPackTab to Consume Capabilities

**Files:**

- Modify: `components/content-pack-manager/card-pack-tab.tsx`
- Modify: `components/content-pack-manager/__tests__/card-pack-tab.test.tsx`

- [x] **Step 1: Update CardPackTab tests**

In `components/content-pack-manager/__tests__/card-pack-tab.test.tsx`, replace fixtures with capability-shaped items:

```ts
const systemBatch = {
  sourceId: "SYSTEM_BUILTIN_CARDS",
  name: "系统内置卡牌包",
  author: "",
  version: "",
  fileName: "builtin-base.json",
  importTime: "builtin",
  cardCount: 321,
  cardTypes: ["profession", "ancestry", "community", "subclass", "domain", "variant"],
  disabled: false,
  sourceLabel: "系统内置",
  canDisable: true,
  canRemove: false,
  canViewCards: true,
}

const customEnabledBatch = {
  ...systemBatch,
  sourceId: "pack_enabled",
  name: "启用测试包",
  fileName: "enabled.json",
  sourceLabel: "导入文件：enabled.json",
  canRemove: true,
}

const customDisabledBatch = {
  ...customEnabledBatch,
  sourceId: "pack_disabled",
  name: "禁用测试包",
  fileName: "disabled.json",
  disabled: true,
  sourceLabel: "导入文件：disabled.json",
  canViewCards: false,
}
```

Update action expectations:

```ts
expect(onViewCards).toHaveBeenCalledWith("custom-pack")
expect(onToggleBatchDisabled).toHaveBeenCalledWith("custom-pack", true)
expect(onRemoveBatch).toHaveBeenCalledWith("custom-pack")
```

Update the system delete test to use the capability label:

```ts
const deleteButtons = screen.getAllByRole("button", { name: "此卡牌来源不能删除" }) as HTMLButtonElement[]
```

- [x] **Step 2: Run CardPackTab tests and verify failure**

Run:

```bash
pnpm test:run components/content-pack-manager/__tests__/card-pack-tab.test.tsx
```

Expected: FAIL because `CardPackTab` still expects `id` / `isSystemBatch`.

- [x] **Step 3: Update CardPackTab types and rendering**

In `components/content-pack-manager/card-pack-tab.tsx`:

```ts
import type { CardRuntimeSourceListItem } from "@/card/runtime/card-pack-view-model"

export type CardPackListItem = CardRuntimeSourceListItem

interface CardPackTabProps {
  batches: CardPackListItem[]
  totalCards: number
  onViewCards(sourceId?: string): void
  onToggleBatchDisabled(sourceId: string, nextDisabled: boolean): void
  onRemoveBatch(sourceId: string): void
}
```

Remove `formatSourceLabel()` and use `batch.sourceLabel` everywhere.

Update action buttons:

```tsx
const viewLabel = batch.canViewCards ? "查看卡牌包" : "已禁用卡牌包不能查看"
const deleteLabel = batch.canRemove ? "删除卡牌包" : "此卡牌来源不能删除"

<Button
  size="icon"
  variant="outline"
  aria-label={viewLabel}
  title={viewLabel}
  disabled={!batch.canViewCards}
  onClick={() => props.onViewCards(batch.sourceId)}
  className="h-11 w-11"
>
  <Eye className="h-4 w-4" />
</Button>

<Button
  size="icon"
  variant="outline"
  aria-label={batch.disabled ? "启用卡牌包" : "禁用卡牌包"}
  title={batch.disabled ? "启用卡牌包" : "禁用卡牌包"}
  disabled={!batch.canDisable}
  onClick={() => props.onToggleBatchDisabled(batch.sourceId, !batch.disabled)}
  className="h-11 w-11"
>
  {batch.disabled ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
</Button>

<Button
  size="icon"
  variant="destructive"
  aria-label={deleteLabel}
  title={deleteLabel}
  disabled={!batch.canRemove}
  onClick={() => props.onRemoveBatch(batch.sourceId)}
  className="h-11 w-11"
>
  <XCircle className="h-4 w-4" />
</Button>
```

Update filtering:

```ts
const sourceLabel = batch.sourceLabel.toLowerCase()
```

- [x] **Step 4: Run CardPackTab tests and verify pass**

Run:

```bash
pnpm test:run components/content-pack-manager/__tests__/card-pack-tab.test.tsx
```

Expected: PASS.

- [x] **Step 5: Commit CardPackTab capability update**

```bash
git add components/content-pack-manager/card-pack-tab.tsx components/content-pack-manager/__tests__/card-pack-tab.test.tsx
git commit -m "feat: use card source capabilities in pack tab"
```

## Task 3: Refactor CardManagerPage to Subscribe to Runtime State

**Files:**

- Modify: `app/card-manager/page.tsx`
- Modify: `app/card-manager/__tests__/card-manager-card-lifecycle.test.tsx`

- [x] **Step 1: Update card-manager tests to use a reactive store mock**

In `app/card-manager/__tests__/card-manager-card-lifecycle.test.tsx`, replace the one-shot `getAllBatches()` style mock with a reactive `useUnifiedCardStore` mock.

Add these helpers near the existing `mocks` object:

```ts
import type { ExtendedStandardCard } from "@/card/card-types"
import type { BatchInfo, UnifiedCardState } from "@/card/stores/store-types"
import { act } from "@testing-library/react"

type RuntimeSlice = Pick<UnifiedCardState, "initialized" | "batches" | "cards"> & {
  initializeSystem: () => Promise<{ initialized: boolean }>
  loadAllCards: () => ExtendedStandardCard[]
}

const runtimeListeners = new Set<() => void>()

function emitRuntime(next: Partial<RuntimeSlice>) {
  Object.assign(mocks.runtime, next)
  act(() => {
    runtimeListeners.forEach((listener) => listener())
  })
}

function makeRuntimeBatch(overrides: Partial<BatchInfo> = {}): BatchInfo {
  return {
    id: "pack_a",
    name: "Pack A",
    author: "Tester",
    version: "1.0.0",
    fileName: "pack-a.json",
    importTime: "2026-06-19T00:00:00.000Z",
    cardCount: 1,
    cardTypes: ["profession"],
    size: 100,
    disabled: false,
    cardIds: ["card_a"],
    ...overrides,
  }
}

function makeRuntimeCard(overrides: Partial<ExtendedStandardCard> = {}): ExtendedStandardCard {
  return {
    id: "card_a",
    name: "Card A",
    type: "profession",
    batchId: "pack_a",
    ...overrides,
  } as ExtendedStandardCard
}
```

Add `runtime` to `mocks`:

```ts
runtime: {
  initialized: true,
  batches: new Map([["pack_a", makeRuntimeBatch()]]),
  cards: new Map([["card_a", makeRuntimeCard()]]),
  initializeSystem: vi.fn(async () => ({ initialized: true })),
  loadAllCards: vi.fn(() => Array.from(mocks.runtime.cards.values())),
} as RuntimeSlice,
```

Replace the `@/card/stores/unified-card-store` mock:

```ts
vi.mock("@/card/stores/unified-card-store", async () => {
  const React = await vi.importActual<typeof import("react")>("react")

  const useUnifiedCardStore = Object.assign(
    (selector?: (state: RuntimeSlice) => unknown) => {
      const [, setVersion] = React.useState(0)

      React.useEffect(() => {
        const listener = () => setVersion((version) => version + 1)
        runtimeListeners.add(listener)
        return () => {
          runtimeListeners.delete(listener)
        }
      }, [])

      return selector ? selector(mocks.runtime) : mocks.runtime
    },
    {
      getState: () => mocks.runtime,
    },
  )

  return { useUnifiedCardStore }
})
```

Update the successful toggle test so the store emits a changed batch instead of relying on `refreshCardData()`:

```ts
mocks.toggleBatchDisabled.mockImplementation(async () => {
  emitRuntime({
    batches: new Map([
      ["pack_a", makeRuntimeBatch({ disabled: true })],
    ]),
  })
  return true
})
```

Add a regression test for viewing cards staying derived from runtime state:

```ts
it("updates an open card view when runtime cards for the source change", async () => {
  render(<CardManagerPage />)

  await screen.findAllByText("Pack A")
  await userEvent.click(screen.getAllByRole("button", { name: "查看卡牌包" })[0])
  expect(await screen.findByText("Card A")).toBeTruthy()

  emitRuntime({
    batches: new Map([["pack_a", makeRuntimeBatch({ cardIds: ["card_b"] })]]),
    cards: new Map([["card_b", makeRuntimeCard({ id: "card_b", name: "Card B" })]]),
  })

  await waitFor(() => expect(screen.getByText("Card B")).toBeTruthy())
  expect(screen.queryByText("Card A")).toBeNull()
})
```

- [x] **Step 2: Run card-manager tests and verify failure**

Run:

```bash
pnpm test:run app/card-manager/__tests__/card-manager-card-lifecycle.test.tsx
```

Expected: FAIL because `CardManagerPage` still stores `batches` and `viewingCards` as local snapshots.

- [x] **Step 3: Replace local batch/card snapshots with subscribed derivations**

In `app/card-manager/page.tsx`:

Remove:

```ts
const [batches, setBatches] = useState<CardPackListItem[]>([])
const [viewingCards, setViewingCards] = useState<ExtendedStandardCard[]>([])
```

Add subscribed runtime state:

```ts
import { toCardRuntimeSourceListItem } from "@/card/runtime/card-pack-view-model"

const cardRuntimeInitialized = useUnifiedCardStore((state) => state.initialized)
const runtimeBatches = useUnifiedCardStore((state) => state.batches)
const runtimeCards = useUnifiedCardStore((state) => state.cards)
const initializeCardSystem = useUnifiedCardStore((state) => state.initializeSystem)
```

Add derived card-pack list:

```ts
const batches = useMemo(
  () => Array.from(runtimeBatches.values()).map(toCardRuntimeSourceListItem),
  [runtimeBatches],
)
```

Replace viewing card state with viewing source identity:

```ts
const [viewingCardSourceId, setViewingCardSourceId] = useState<string | undefined>(undefined)

const viewingCards = useMemo(() => {
  if (!viewModalOpen) return []

  if (viewingCardSourceId) {
    const batch = runtimeBatches.get(viewingCardSourceId)
    if (!batch || batch.disabled) return []

    return batch.cardIds
      .map((cardId) => runtimeCards.get(cardId))
      .filter((card): card is ExtendedStandardCard => Boolean(card))
  }

  return Array.from(runtimeCards.values()).filter((card) => {
    if (!card.batchId) return true
    return runtimeBatches.get(card.batchId)?.disabled !== true
  })
}, [runtimeBatches, runtimeCards, viewModalOpen, viewingCardSourceId])
```

Delete `refreshCardData()`.

Update initialization:

```ts
useEffect(() => {
  async function initializeData() {
    if (!cardRuntimeInitialized) {
      await initializeCardSystem()
    }
    await getEquipmentUiStore().getState().ensureInitialized()
  }

  void initializeData()
}, [cardRuntimeInitialized, initializeCardSystem])
```

Update handlers:

```ts
function handleViewCards(sourceId?: string) {
  setViewingCardSourceId(sourceId)
  setViewModalOpen(true)
}

async function handleToggleBatchDisabled(sourceId: string) {
  try {
    const success = await toggleBatchDisabled(sourceId)
    if (!success) {
      alert("切换卡牌包状态失败")
    }
  } catch (error) {
    console.error("切换卡牌包状态时出错:", error)
    alert("切换卡牌包状态时出错")
  }
}

async function handleRemoveBatch(sourceId: string) {
  if (!confirm("确定要删除这个卡牌包吗？这将删除卡牌包中的所有卡牌。")) return

  const success = await removeCustomCardBatch(sourceId)
  if (success) {
    if (viewingCardSourceId === sourceId) {
      setViewModalOpen(false)
      setViewingCardSourceId(undefined)
    }
    alert("卡牌包删除成功")
  } else {
    alert("卡牌包删除失败")
  }
}
```

Do not call `refreshCardData()` from card import/toggle/remove/reset handlers. Equipment `refreshFromStorage()` calls stay for equipment.

- [x] **Step 4: Run card-manager tests and verify pass**

Run:

```bash
pnpm test:run app/card-manager/__tests__/card-manager-card-lifecycle.test.tsx
```

Expected: PASS.

- [x] **Step 5: Commit card-manager subscription refactor**

```bash
git add app/card-manager/page.tsx app/card-manager/__tests__/card-manager-card-lifecycle.test.tsx
git commit -m "refactor: subscribe card manager to runtime state"
```

## Task 4: Refactor Generic Card Selection Modal Runtime Inputs

**Files:**

- Modify: `components/modals/generic-card-selection-modal.tsx`

- [x] **Step 1: Confirm direct modal coverage is out of scope**

Run:

```bash
rg -n "GenericCardSelectionModal" app components -g '*test*'
```

Expected: no direct modal test exists. Do not add a new modal-specific harness in this plan; `GenericCardSelectionModal` pulls in sheet-store, modal primitives, card-grid rendering, and filter widgets. The risk this task addresses is dependency correctness, and the implementation is verified by `pnpm build:local` plus the final focused runtime/UI suite.

- [x] **Step 2: Subscribe to runtime maps in the modal**

In `components/modals/generic-card-selection-modal.tsx`, replace `const cardStore = useUnifiedCardStore()` with specific subscriptions:

```ts
const runtimeInitialized = useUnifiedCardStore((state) => state.initialized)
const runtimeBatches = useUnifiedCardStore((state) => state.batches)
const runtimeCards = useUnifiedCardStore((state) => state.cards)
const initializeCardSystem = useUnifiedCardStore((state) => state.initializeSystem)
```

Add initialization on open:

```ts
useEffect(() => {
  if (!isOpen || runtimeInitialized) return
  void initializeCardSystem()
}, [initializeCardSystem, isOpen, runtimeInitialized])
```

- [x] **Step 3: Derive batch options from subscribed batches**

Replace the current `batchOptions` memo:

```ts
const batchOptions = useMemo(() => {
  return Array.from(runtimeBatches.values()).map((batch) => ({
    id: batch.id,
    name: batch.name,
    cardCount: batch.disabled ? 0 : batch.cardCount,
  }))
}, [runtimeBatches])
```

- [x] **Step 4: Derive selectable cards from subscribed runtime cards**

Remove `refreshTrigger`, `baseCards`, `professionCards`, `cardsLoading`, and `cardsError` state. These values are runtime read-model projections and should not be copied into local state.

Add:

```ts
const cardsLoading = isOpen && !runtimeInitialized
const cardsError = null

const baseCards = useMemo(() => {
  if (!isOpen || !runtimeInitialized) return []

  return Array.from(runtimeCards.values()).filter((card) => {
    if (card.type !== cardType) return false
    if (!card.batchId) return true
    return runtimeBatches.get(card.batchId)?.disabled !== true
  }) as StandardCard[]
}, [cardType, isOpen, runtimeBatches, runtimeCards, runtimeInitialized])

const professionCards = useMemo(() => {
  if (!isOpen || !runtimeInitialized || cardType !== "subclass") return []

  return Array.from(runtimeCards.values()).filter((card) => {
    if (card.type !== CardType.Profession) return false
    if (!card.batchId) return true
    return runtimeBatches.get(card.batchId)?.disabled !== true
  }) as StandardCard[]
}, [cardType, isOpen, runtimeBatches, runtimeCards, runtimeInitialized])
```

Keep the existing downstream filtering by `selectedBatches`, subclass profession, level, and class.

- [x] **Step 5: Run modal-adjacent validation**

Run:

```bash
pnpm test:run app/card-manager/__tests__/card-manager-card-lifecycle.test.tsx
pnpm build:local
```

Expected: PASS. `pnpm build:local` may regenerate `lib/embedded-styles.ts`; restore that generated file before committing if it changes.

- [x] **Step 6: Commit modal subscription refactor**

```bash
git add components/modals/generic-card-selection-modal.tsx
git commit -m "refactor: derive card selection modal from runtime state"
```

## Task 5: Final Verification and Plan Sync

**Files:**

- Modify: `docs/superpowers/plans/2026-06-23-card-runtime-source-assembly.md`
- Modify: `docs/superpowers/plans/2026-06-23-card-runtime-ui-subscriptions.md`

- [x] **Step 1: Mark superseded Task 7 in the original plan**

In `docs/superpowers/plans/2026-06-23-card-runtime-source-assembly.md`, replace the Task 7 body with a short pointer:

```md
## Task 7: UI Runtime Subscriptions

Superseded by `docs/superpowers/plans/2026-06-23-card-runtime-ui-subscriptions.md`.
The direction changed from manual stale-view refresh to subscribing UI directly to the card runtime read model.
```

- [x] **Step 2: Run final focused suite**

Run:

```bash
pnpm test:run card/runtime/__tests__/card-pack-view-model.test.ts components/content-pack-manager/__tests__/card-pack-tab.test.tsx app/card-manager/__tests__/card-manager-card-lifecycle.test.tsx card/packs/__tests__/runtime-refresh-adapter.test.ts card/packs/__tests__/lifecycle-runtime-integration.test.ts
```

Expected: PASS.

- [x] **Step 3: Run build**

Run:

```bash
pnpm build:local
```

Expected: PASS. If `lib/embedded-styles.ts` changes, run:

```bash
git restore lib/embedded-styles.ts
```

- [x] **Step 4: Commit plan sync**

```bash
git add docs/superpowers/plans/2026-06-23-card-runtime-ui-subscriptions.md
git commit -m "docs: complete card runtime UI subscription plan"
```
