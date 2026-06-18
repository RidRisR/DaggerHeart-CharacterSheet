# Card Import Lifecycle Test Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add regression tests that prove card pack lifecycle operations update storage, runtime read models, and visible management state without requiring a page refresh.

**Architecture:** This is a test-only plan. It does not fix production behavior. Tests should expose current gaps, especially builtin card pack disabled/enabled hot-state refresh. If a new test fails because production behavior is wrong, record the failure and continue with independent test-only tasks when possible; do not modify production code.

**Tech Stack:** Vitest, happy-dom, existing card pack application service, in-memory storage/image backends, Zustand store action helpers, React Testing Library.

---

## Non-Negotiable Execution Rules

- Do not modify production code in `card/`, `app/`, `components/`, `lib/`, or `equipment/`.
- Allowed write targets are test files, test helpers, docs, and `package.json` test script entries if needed.
- If a new test fails, do not make it pass by changing production code. Record the failure and continue with independent test-only tasks when possible. Return a report with:
  - failing test name,
  - expected behavior,
  - actual behavior,
  - suspected production file/function,
  - whether the failure is the known builtin hot-state regression or a new finding.
- Do not weaken assertions to make tests green.
- Do not mark failing regression tests as `skip` or `todo` unless the lead explicitly asks.

## File Structure

- Create: `card/packs/__tests__/lifecycle-runtime-integration.test.ts`
  - Owns real service/repository/runtime integration tests for card pack commit, disable, enable, and remove.
- Modify: `card/packs/__tests__/runtime-refresh-adapter.test.ts`
  - Adds focused hot-state tests for `reloadCustomRuntimeFromStorage()` and builtin batch metadata.
- Modify: `card/packs/__tests__/application-service.test.ts`
  - Adds missing lifecycle tests for `removePack` and `setPackDisabled` failure/refresh behavior.
- Modify: `components/content-pack-manager/__tests__/card-pack-tab.test.tsx`
  - Adds missing UI component tests for card pack search/status filtering.
- Create: `app/card-manager/__tests__/card-manager-card-lifecycle.test.tsx`
  - Adds thin page-level tests for user-visible card lifecycle refresh behavior through mocked facade functions.
- Modify: `package.json`
  - Only if needed, ensure `npm run test:card-import` includes the new test files.

---

### Task 1: Runtime Refresh Builtin Hot-State Regression Test

**Files:**
- Modify: `card/packs/__tests__/runtime-refresh-adapter.test.ts`

- [ ] **Step 1: Add a helper that creates a store with real `_loadCustomCardsFromStorage()`**

Append this helper near the existing test helpers. It intentionally uses real `localStorage` so the test covers the same skip-builtin branch as production.

```ts
function createStoreWithBuiltinAndBrowserStorage(input: { builtinDisabledInMemory: boolean }) {
  const builtinCard = makeCard("builtin-card", BUILTIN_BATCH_ID, CardSource.BUILTIN)
  let state: UnifiedCardState & Partial<ReturnType<typeof createStoreActions>>

  const set = (partial: any) => {
    const next = typeof partial === "function" ? partial(state) : partial
    state = { ...state, ...next }
  }
  const get = () => state as UnifiedCardState & ReturnType<typeof createStoreActions>

  state = {
    cards: new Map([[builtinCard.id, builtinCard]]),
    batches: new Map([
      [
        BUILTIN_BATCH_ID,
        makeBatch(BUILTIN_BATCH_ID, {
          isSystemBatch: true,
          disabled: input.builtinDisabledInMemory,
          cardIds: [builtinCard.id],
        }),
      ],
    ]),
    cardsByType: new Map([[CardType.Profession, [builtinCard.id]]]),
    index: {
      batches: {
        [BUILTIN_BATCH_ID]: makeBatch(BUILTIN_BATCH_ID, {
          isSystemBatch: true,
          disabled: input.builtinDisabledInMemory,
          cardIds: [builtinCard.id],
        }),
      },
      totalCards: 1,
      totalBatches: 1,
      lastUpdate: "2026-06-19T00:00:00.000Z",
    },
    aggregatedCustomFields: null,
    aggregatedVariantTypes: null,
    subclassCardIndex: null,
    levelCardIndex: null,
    batchKeywordIndex: null,
    batchLevelIndex: null,
    cacheValid: false,
    initialized: true,
    loading: false,
    error: null,
    config: { maxBatches: 50, maxStorageSize: 5 * 1024 * 1024, autoCleanup: true, compressionEnabled: false },
    stats: null,
    imageService: baseImageServiceState(),
  }

  Object.assign(state, createStoreActions(set, get))

  return {
    reloadCustomRuntimeFromStorage: () => get().reloadCustomRuntimeFromStorage(),
    loadAllCards: () => get().loadAllCards(),
    getCardById: (id: string) => get().getCardById(id),
    rebuildSubclassIndex: () => get()._rebuildSubclassIndex(),
    get batch() {
      return state.batches.get(BUILTIN_BATCH_ID)
    },
    get indexBatch() {
      return state.index.batches[BUILTIN_BATCH_ID]
    },
    get subclassCardIndex() {
      return state.subclassCardIndex
    },
  }
}
```

- [ ] **Step 2: Write the failing builtin disabled hot-state test**

Add this test in the `describe("card runtime refresh adapter", ...)` block.

```ts
it("syncs builtin disabled state from storage during runtime refresh", async () => {
  localStorage.clear()
  localStorage.setItem(
    "daggerheart_custom_cards_index",
    JSON.stringify({
      batches: {
        [BUILTIN_BATCH_ID]: {
          id: BUILTIN_BATCH_ID,
          name: "System Builtin Cards",
          fileName: "builtin-base.json",
          importTime: "2026-06-19T00:00:00.000Z",
          version: "1.0.0",
          cardCount: 1,
          cardTypes: [CardType.Profession],
          size: 100,
          isSystemBatch: true,
          disabled: true,
        },
      },
      totalCards: 1,
      totalBatches: 1,
      lastUpdate: "2026-06-19T00:00:00.000Z",
    }),
  )

  const store = createStoreWithBuiltinAndBrowserStorage({ builtinDisabledInMemory: false })

  await store.reloadCustomRuntimeFromStorage()
  store.rebuildSubclassIndex()

  expect(store.batch?.disabled).toBe(true)
  expect(store.indexBatch?.disabled).toBe(true)
  expect(store.loadAllCards()).toEqual([])
  expect(store.getCardById("builtin-card")).toBeNull()
  expect(store.subclassCardIndex).toEqual({})
})
```

- [ ] **Step 3: Write the reverse builtin enabled hot-state test**

Add the reverse test next to the disabled-state test. This locks both directions of the lifecycle.

```ts
it("syncs builtin enabled state from storage during runtime refresh", async () => {
  localStorage.clear()
  localStorage.setItem(
    "daggerheart_custom_cards_index",
    JSON.stringify({
      batches: {
        [BUILTIN_BATCH_ID]: {
          id: BUILTIN_BATCH_ID,
          name: "System Builtin Cards",
          fileName: "builtin-base.json",
          importTime: "2026-06-19T00:00:00.000Z",
          version: "1.0.0",
          cardCount: 1,
          cardTypes: [CardType.Profession],
          size: 100,
          isSystemBatch: true,
          disabled: false,
        },
      },
      totalCards: 1,
      totalBatches: 1,
      lastUpdate: "2026-06-19T00:00:00.000Z",
    }),
  )

  const store = createStoreWithBuiltinAndBrowserStorage({ builtinDisabledInMemory: true })

  await store.reloadCustomRuntimeFromStorage()
  store.rebuildSubclassIndex()

  expect(store.batch?.disabled).toBe(false)
  expect(store.indexBatch?.disabled).toBe(false)
  expect(store.loadAllCards().map((card) => card.id)).toEqual(["builtin-card"])
  expect(store.getCardById("builtin-card")?.id).toBe("builtin-card")
})
```

- [ ] **Step 4: Ensure the existing test setup clears localStorage**

Update the existing `beforeEach` in `runtime-refresh-adapter.test.ts`:

```ts
beforeEach(() => {
  localStorage.clear()
  images.clear()
  objectUrls.clear()
  objectUrlIndex = 0
  vi.restoreAllMocks()
  // keep the existing URL spies
})
```

- [ ] **Step 5: Run both builtin hot-state tests**

Run:

```bash
npx vitest run card/packs/__tests__/runtime-refresh-adapter.test.ts -t "syncs builtin"
```

Expected:
- If production is still broken: FAIL on one or both builtin hot-state tests.
- If already fixed by another branch: PASS.

If it fails, record the failure and continue with independent test-only tasks. Do not fix production code.

---

### Task 2: Service + Runtime Lifecycle Integration Tests

**Files:**
- Create: `card/packs/__tests__/lifecycle-runtime-integration.test.ts`

- [ ] **Step 1: Create a browser localStorage-backed repository and valid card source**

Use the browser localStorage adapter for repository storage, not the in-memory adapter. This is required because `reloadCustomRuntimeFromStorage()` reads `window.localStorage` directly. The repository and runtime store must share the same storage object. The image backend can remain in-memory.

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"
import { CardType } from "@/card/card-types"
import { createCardObjectSource } from "@/card/import/source"
import { createStoreActions } from "@/card/stores/store-actions"
import { BUILTIN_BATCH_ID, CardSource, type UnifiedCardState } from "@/card/stores/store-types"
import { createCardPackApplicationService } from "../application-service"
import { createInMemoryCardPackImageBackend } from "../image-backend"
import { createBrowserCardPackStorageAdapter } from "../local-storage-adapter"
import { createLocalStorageCardPackRepository } from "../local-storage-repository"
import { createZustandCardRuntimeRefreshAdapter } from "../runtime-refresh-adapter"

const fixedNow = new Date("2026-06-19T10:00:00.000Z")

function validPack(id = "warrior") {
  return {
    format: "daggerheart.card-pack.v1",
    name: "Runtime Pack",
    version: "1.0.0",
    author: "Tester",
    definitions: { classes: ["Warrior"], domains: ["Blade", "Bone"] },
    classes: [
      {
        id,
        name: "Warrior",
        summary: "A runtime test class.",
        domain1: "Blade",
        domain2: "Bone",
        startingHitPoints: 6,
        startingEvasion: 10,
        startingItems: "",
        hopeFeature: "",
        classFeature: "",
      },
    ],
  }
}
```

- [ ] **Step 2: Add a minimal Zustand runtime test store**

The store must run real store actions but stub server-only/builtin-only pieces.

```ts
function createRuntimeHarness() {
  let state: UnifiedCardState & ReturnType<typeof createStoreActions>

  const set = (partial: any) => {
    const next = typeof partial === "function" ? partial(state) : partial
    state = { ...state, ...next }
  }
  const get = () => state
  const builtinCard = {
    id: "builtin-card",
    name: "Builtin Card",
    type: CardType.Profession,
    class: "Warrior",
    level: 1,
    description: "builtin",
    source: CardSource.BUILTIN,
    batchId: BUILTIN_BATCH_ID,
  }

  state = {
    cards: new Map([[builtinCard.id, builtinCard as any]]),
    batches: new Map([
      [
        BUILTIN_BATCH_ID,
        {
          id: BUILTIN_BATCH_ID,
          name: "System Builtin Cards",
          fileName: "builtin-base.json",
          importTime: fixedNow.toISOString(),
          cardCount: 1,
          cardTypes: [CardType.Profession],
          size: 100,
          isSystemBatch: true,
          disabled: false,
          cardIds: [builtinCard.id],
        },
      ],
    ]),
    cardsByType: new Map([[CardType.Profession, [builtinCard.id]]]),
    index: {
      batches: {
        [BUILTIN_BATCH_ID]: {
          id: BUILTIN_BATCH_ID,
          name: "System Builtin Cards",
          fileName: "builtin-base.json",
          importTime: fixedNow.toISOString(),
          version: "1.0.0",
          cardCount: 1,
          cardTypes: [CardType.Profession],
          size: 100,
          isSystemBatch: true,
          disabled: false,
        },
      },
      totalCards: 1,
      totalBatches: 1,
      lastUpdate: fixedNow.toISOString(),
    },
    aggregatedCustomFields: null,
    aggregatedVariantTypes: null,
    subclassCardIndex: null,
    levelCardIndex: null,
    batchKeywordIndex: null,
    batchLevelIndex: null,
    cacheValid: false,
    initialized: true,
    loading: false,
    error: null,
    config: { maxBatches: 50, maxStorageSize: 5 * 1024 * 1024, autoCleanup: true, compressionEnabled: false },
    stats: null,
    imageService: {
      initialized: true,
      cache: new Map(),
      cacheOrder: [],
      loadingImages: new Set(),
      failedImages: new Set(),
      maxCacheSize: 100,
    },
  } as UnifiedCardState & ReturnType<typeof createStoreActions>

  Object.assign(state, createStoreActions(set, get))

  return {
    store: state,
    visibleIds: () => state.loadAllCards().map((card) => card.id),
    batch: (packId: string) => state.getAllBatches().find((batch) => batch.id === packId),
    classOptions: () => {
      state._recomputeAggregations()
      return state.aggregatedCustomFields?.profession ?? []
    },
  }
}
```

- [ ] **Step 3: Test custom import -> disable -> enable -> remove hot runtime behavior**

```ts
it("updates custom pack runtime read models across import disable enable and remove", async () => {
  localStorage.clear()
  const runtime = createRuntimeHarness()
  const storage = createBrowserCardPackStorageAdapter(localStorage)
  const repository = createLocalStorageCardPackRepository({
    storage,
    images: createInMemoryCardPackImageBackend(),
  })
  const service = createCardPackApplicationService({
    repository,
    runtimeRefresh: createZustandCardRuntimeRefreshAdapter(runtime.store),
    builtinTemplateIds: new Set(),
    createPackId: () => "pack_runtime",
    now: () => fixedNow,
    random: () => 0.123,
  })

  const imported = await service.importFromSource(createCardObjectSource(validPack(), "runtime.json"), { mode: "commit" })
  expect(imported.success).toBe(true)
  expect(runtime.visibleIds()).toEqual(["builtin-card", "warrior"])
  expect(runtime.batch(BUILTIN_BATCH_ID)).toMatchObject({ disabled: false, cardCount: 1 })
  expect(runtime.batch("pack_runtime")).toMatchObject({ disabled: false, cardCount: 1 })

  const disabled = await service.setPackDisabled("pack_runtime", true)
  expect(disabled.success).toBe(true)
  expect(runtime.visibleIds()).toEqual(["builtin-card"])
  expect(runtime.batch(BUILTIN_BATCH_ID)).toMatchObject({ disabled: false, cardCount: 1 })
  expect(runtime.batch("pack_runtime")).toMatchObject({ disabled: true })

  const enabled = await service.setPackDisabled("pack_runtime", false)
  expect(enabled.success).toBe(true)
  expect(runtime.visibleIds()).toEqual(["builtin-card", "warrior"])
  expect(runtime.batch(BUILTIN_BATCH_ID)).toMatchObject({ disabled: false, cardCount: 1 })
  expect(runtime.batch("pack_runtime")).toMatchObject({ disabled: false })

  const removed = await service.removePack("pack_runtime")
  expect(removed.success).toBe(true)
  expect(runtime.visibleIds()).toEqual(["builtin-card"])
  expect(runtime.batch(BUILTIN_BATCH_ID)).toMatchObject({ disabled: false, cardCount: 1 })
  expect(runtime.batch("pack_runtime")).toBeUndefined()
})
```

- [ ] **Step 4: Run the new integration test**

Run:

```bash
npx vitest run card/packs/__tests__/lifecycle-runtime-integration.test.ts
```

Expected:
- Custom lifecycle test should pass if current custom runtime path is sound.
- If it fails, stop this task and report. Do not fix production code. Independent test-only tasks may continue.

---

### Task 3: Application Service Lifecycle Failure Semantics

**Files:**
- Modify: `card/packs/__tests__/application-service.test.ts`

- [ ] **Step 1: Extend `createFakeRepository` to observe `setPackDisabled` calls**

Update the local fake repository type and implementation so tests can assert disable calls:

```ts
function createFakeRepository(input: {
  snapshot?: CardPackStorageSnapshot
  commitFails?: boolean
  removeFails?: boolean
  setDisabledFails?: boolean
} = {}): CardPackRepository & {
  commitCalls: CardImportFinalCommitPlan[]
  removeCalls: string[]
  setDisabledCalls: Array<{ packId: string; disabled: boolean }>
} {
  // keep existing body, add:
  const setDisabledCalls: Array<{ packId: string; disabled: boolean }> = []

  // return object includes:
  setDisabledCalls,
  setPackDisabled: vi.fn(async (packId: string, disabled: boolean): Promise<CardPackStorageTransactionResult> => {
    setDisabledCalls.push({ packId, disabled })
    if (input.setDisabledFails) {
      return {
        ok: false,
        error: { code: "STORAGE_WRITE_FAILED", message: "Unable to update disabled state." },
        issues: [],
      }
    }
    return { ok: true, snapshot, issues: [] }
  }),
}
```

- [ ] **Step 2: Add tests for remove and set-disabled runtime refresh**

```ts
it("refreshes runtime after removePack succeeds", async () => {
  const repository = createFakeRepository({ snapshot: makeSnapshot({ packId: "pack_a", templateIds: ["warrior"] }) })
  const runtimeRefresh = createFakeRuntimeRefresh()
  const service = createCardPackApplicationService({
    repository,
    runtimeRefresh,
    builtinTemplateIds: new Set(),
    now: () => FIXED_NOW,
  })

  const result = await service.removePack("pack_a")

  expect(result.success).toBe(true)
  expect(repository.removeCalls).toEqual(["pack_a"])
  expect(runtimeRefresh.calls).toHaveLength(1)
})

it("refreshes runtime after setPackDisabled succeeds", async () => {
  const repository = createFakeRepository({ snapshot: makeSnapshot({ packId: "pack_a", templateIds: ["warrior"] }) })
  const runtimeRefresh = createFakeRuntimeRefresh()
  const service = createCardPackApplicationService({
    repository,
    runtimeRefresh,
    builtinTemplateIds: new Set(),
    now: () => FIXED_NOW,
  })

  const result = await service.setPackDisabled("pack_a", true)

  expect(result.success).toBe(true)
  expect(repository.setDisabledCalls).toEqual([{ packId: "pack_a", disabled: true }])
  expect(runtimeRefresh.calls).toHaveLength(1)
})
```

- [ ] **Step 3: Add tests for storage failure and runtime refresh failure**

```ts
it("does not refresh runtime when setPackDisabled storage transaction fails", async () => {
  const repository = createFakeRepository({ setDisabledFails: true })
  const runtimeRefresh = createFakeRuntimeRefresh()
  const service = createCardPackApplicationService({
    repository,
    runtimeRefresh,
    builtinTemplateIds: new Set(),
    now: () => FIXED_NOW,
  })

  const result = await service.setPackDisabled("pack_a", true)

  expect(result.success).toBe(false)
  expect(result.stage).toBe("storageTransaction")
  expect(result.storageCommitted).toBe(false)
  expect(runtimeRefresh.calls).toHaveLength(0)
})

it("reports runtime refresh failure after setPackDisabled storage commit", async () => {
  const repository = createFakeRepository({ snapshot: makeSnapshot({ packId: "pack_a", templateIds: ["warrior"] }) })
  const service = createCardPackApplicationService({
    repository,
    runtimeRefresh: createFakeRuntimeRefresh({ fail: true }),
    builtinTemplateIds: new Set(),
    now: () => FIXED_NOW,
  })

  const result = await service.setPackDisabled("pack_a", true)

  expect(result.success).toBe(false)
  expect(result.stage).toBe("runtimeRefresh")
  expect(result.storageCommitted).toBe(true)
  expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "RUNTIME_REFRESH_FAILED" }))
})
```

- [ ] **Step 4: Run application service tests**

Run:

```bash
npx vitest run card/packs/__tests__/application-service.test.ts
```

Expected: all existing and new tests pass. If a new failure exposes production behavior, report before changing anything.

---

### Task 4: CardPackTab Search and Status Filter Tests

**Files:**
- Modify: `components/content-pack-manager/__tests__/card-pack-tab.test.tsx`

- [ ] **Step 1: Add a custom enabled and custom disabled fixture**

Add below `systemBatch`:

```ts
const customEnabledBatch = {
  ...systemBatch,
  id: "pack_enabled",
  name: "启用测试包",
  fileName: "enabled.json",
  disabled: false,
  isSystemBatch: false,
}

const customDisabledBatch = {
  ...systemBatch,
  id: "pack_disabled",
  name: "禁用测试包",
  fileName: "disabled.json",
  disabled: true,
  isSystemBatch: false,
}
```

- [ ] **Step 2: Add tests for search and status filtering**

```ts
it("filters card packs by search text", async () => {
  render(
    <CardPackTab
      batches={[customEnabledBatch, customDisabledBatch]}
      totalCards={321}
      onViewCards={vi.fn()}
      onToggleBatchDisabled={vi.fn()}
      onRemoveBatch={vi.fn()}
    />,
  )

  await userEvent.type(screen.getByPlaceholderText("搜索包名或来源"), "禁用")

  const table = screen.getByTestId("card-pack-desktop-table")
  expect(within(table).getByText("禁用测试包")).toBeTruthy()
  expect(within(table).queryByText("启用测试包")).toBeNull()
})

it("filters card packs by enabled and disabled status", async () => {
  render(
    <CardPackTab
      batches={[customEnabledBatch, customDisabledBatch]}
      totalCards={321}
      onViewCards={vi.fn()}
      onToggleBatchDisabled={vi.fn()}
      onRemoveBatch={vi.fn()}
    />,
  )

  await userEvent.selectOptions(screen.getByDisplayValue("全部状态"), "disabled")
  let table = screen.getByTestId("card-pack-desktop-table")
  expect(within(table).getByText("禁用测试包")).toBeTruthy()
  expect(within(table).queryByText("启用测试包")).toBeNull()

  await userEvent.selectOptions(screen.getByDisplayValue("已禁用"), "enabled")
  table = screen.getByTestId("card-pack-desktop-table")
  expect(within(table).getByText("启用测试包")).toBeTruthy()
  expect(within(table).queryByText("禁用测试包")).toBeNull()
})
```

- [ ] **Step 3: Run CardPackTab tests**

Run:

```bash
npx vitest run components/content-pack-manager/__tests__/card-pack-tab.test.tsx
```

Expected: all tests pass.

---

### Task 5: Card Manager Page Lifecycle UI Tests

**Files:**
- Create: `app/card-manager/__tests__/card-manager-card-lifecycle.test.tsx`

- [ ] **Step 1: Mock card and equipment dependencies**

Create a test file that mocks `@/card/index`, `@/card/utils/dhcb-importer`, `@/components/content-pack-manager/import-content-pack`, and `@/equipment/ui/equipment-ui-store`. Keep the tests thin: they should verify the page calls refresh and renders updated props, not re-test repository internals.

```ts
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import CardManagerPage from "../page"

const mocks = vi.hoisted(() => ({
  batches: [] as any[],
  totalCards: 0,
  removeCustomCardBatch: vi.fn(),
  toggleBatchDisabled: vi.fn(),
  initializeSystem: vi.fn(async () => ({ initialized: true })),
  loadAllCards: vi.fn(() => []),
  equipmentState: {
    initialized: true,
    storageSnapshot: null,
    lastResult: null,
    initializationError: null,
    ensureInitialized: vi.fn(async () => undefined),
    getPackSummaries: vi.fn(() => []),
    getPackDetail: vi.fn(() => undefined),
    refreshFromStorage: vi.fn(async () => undefined),
    removePack: vi.fn(),
    setPackDisabled: vi.fn(),
    importPackFromFile: vi.fn(),
  },
}))

vi.mock("@/card/index", () => ({
  getAllBatches: () => mocks.batches,
  getCardsByBatchId: vi.fn(() => []),
  getCustomCardStats: () => ({
    totalCards: mocks.totalCards,
    totalBatches: mocks.batches.filter((batch) => !batch.isSystemBatch).length,
    cardsByType: {},
    cardsByBatch: {},
    storageUsed: 0,
  }),
  importCustomCards: vi.fn(),
  removeCustomCardBatch: (...args: unknown[]) => mocks.removeCustomCardBatch(...args),
  toggleBatchDisabled: (...args: unknown[]) => mocks.toggleBatchDisabled(...args),
}))

vi.mock("@/card/stores/unified-card-store", () => ({
  useUnifiedCardStore: {
    getState: () => ({
      initialized: true,
      initializeSystem: mocks.initializeSystem,
      loadAllCards: mocks.loadAllCards,
    }),
  },
}))

vi.mock("@/card/utils/dhcb-importer", () => ({
  importDhcbCardPackage: vi.fn(),
}))

vi.mock("@/components/content-pack-manager/import-content-pack", () => ({
  importContentPackFiles: vi.fn(),
}))

vi.mock("@/equipment/ui/equipment-ui-store", () => ({
  getEquipmentUiStore: () =>
    Object.assign(
      vi.fn((selector: (state: typeof mocks.equipmentState) => unknown) => selector(mocks.equipmentState)),
      {
        getState: () => mocks.equipmentState,
        subscribe: vi.fn(() => vi.fn()),
      },
    ),
}))

function expectStatValue(label: string, value: string) {
  const matchingLabel = screen
    .getAllByText(label)
    .find((element) => element.parentElement?.textContent?.includes(value))
  expect(matchingLabel?.parentElement?.textContent).toContain(value)
}
```

- [ ] **Step 2: Test delete success and failure UI refresh behavior**

```ts
beforeEach(() => {
  mocks.batches = [
    {
      id: "pack_a",
      name: "Pack A",
      fileName: "pack-a.json",
      importTime: "2026-06-19T00:00:00.000Z",
      cardCount: 1,
      cardTypes: ["profession"],
      disabled: false,
      isSystemBatch: false,
    },
  ]
  mocks.totalCards = 1
  mocks.removeCustomCardBatch.mockReset()
  mocks.toggleBatchDisabled.mockReset()
  mocks.initializeSystem.mockClear()
  mocks.loadAllCards.mockReturnValue([])
  mocks.equipmentState.ensureInitialized.mockClear()
  mocks.equipmentState.getPackSummaries.mockReturnValue([])
  vi.spyOn(window, "confirm").mockReturnValue(true)
  vi.spyOn(window, "alert").mockImplementation(() => undefined)
})

it("refreshes card pack list after successful delete", async () => {
  mocks.removeCustomCardBatch.mockImplementation(async () => {
    mocks.batches = []
    mocks.totalCards = 0
    return true
  })

  render(<CardManagerPage />)

  await userEvent.click((await screen.findAllByRole("button", { name: "删除卡牌包" }))[0])

  expect(mocks.removeCustomCardBatch).toHaveBeenCalledWith("pack_a")
  await waitFor(() => expect(screen.queryByText("Pack A")).toBeNull())
  expectStatValue("卡牌包", "0/0")
  expectStatValue("卡牌", "0")
})

it("keeps card pack list when delete fails", async () => {
  mocks.removeCustomCardBatch.mockResolvedValue(false)

  render(<CardManagerPage />)

  await userEvent.click((await screen.findAllByRole("button", { name: "删除卡牌包" }))[0])

  const table = await screen.findByTestId("card-pack-desktop-table")
  expect(within(table).getByText("Pack A")).toBeTruthy()
  expectStatValue("卡牌包", "1/1")
})
```

- [ ] **Step 3: Test toggle success UI refresh behavior**

```ts
it("refreshes card pack disabled status after toggle succeeds", async () => {
  mocks.toggleBatchDisabled.mockImplementation(async () => {
    mocks.batches = mocks.batches.map((batch) => (batch.id === "pack_a" ? { ...batch, disabled: true } : batch))
    mocks.totalCards = 0
    return true
  })

  render(<CardManagerPage />)

  await userEvent.click((await screen.findAllByRole("button", { name: "禁用卡牌包" }))[0])

  expect(mocks.toggleBatchDisabled).toHaveBeenCalledWith("pack_a")
  const table = await screen.findByTestId("card-pack-desktop-table")
  expect(within(table).getByText("已禁用")).toBeTruthy()
  expectStatValue("卡牌包", "0/1")
  expectStatValue("卡牌", "0")
})
```

- [ ] **Step 4: Run page tests**

Run:

```bash
npx vitest run app/card-manager/__tests__/card-manager-card-lifecycle.test.tsx
```

Expected:
- Tests should pass if mocks are complete and page refresh behavior is correct.
- If test setup fails due missing browser APIs, report the missing API and proposed mock; do not change production code.

---

### Task 6: Package Script and Full Verification

**Files:**
- Modify: `package.json` only if `npm run test:card-import` does not pick up the new files.

- [ ] **Step 1: Check test script coverage**

Run:

```bash
npm run test:card-import
```

Expected:
- The command includes `card/packs`, `components/content-pack-manager`, and should include new card pack tests automatically.
- It may not include `app/card-manager/__tests__`; if not, add that exact path to the script.

- [ ] **Step 2: If needed, update the script**

If `app/card-manager/__tests__/card-manager-card-lifecycle.test.tsx` is not run by `npm run test:card-import`, update the script:

```json
"test:card-import": "npx vitest run card/import card/packs card/__tests__/legacy-import-facade.test.ts card/stores/__tests__/batch-read-model.test.ts tests/local-fixtures/__tests__/card-import-local-fixture-names.test.ts tests/local-fixtures/__tests__/card-import-equivalence.test.ts tests/local-fixtures/__tests__/card-import-runtime-equivalence.test.ts components/content-pack-manager app/card-manager/__tests__/card-manager-card-lifecycle.test.tsx"
```

- [ ] **Step 3: Run final verification**

Run:

```bash
npm run test:card-import
```

Expected:
- If all tests pass, report pass count.
- If any new test fails because of production behavior, report it with the failure details. Do not fix production code.

---

## Expected Initial Failure

The builtin hot-state regression test in Task 1 is expected to fail unless production has already been fixed. This is intentional. The failure should be reported, not repaired, so the lead can decide whether to:

1. patch runtime refresh in the current card-import branch, or
2. defer to a separate builtin source decoupling refactor.

## Completion Criteria

- The test plan is implemented as test-only changes.
- The known builtin hot-state gap is represented by a concrete regression test.
- Custom pack lifecycle has real service/repository/runtime integration coverage.
- Page-level lifecycle refresh has at least thin UI coverage.
- Any failing production behavior is reported without unauthorized fixes.
