# Card Runtime Source Assembly Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Load built-in cards as a bundled Card Runtime Source with compiled automation IR, while keeping custom card packs in custom storage and exposing one assembled runtime read model to card consumers.

**Architecture:** External card import and built-in card loading share content preparation and Runtime Card Projection, then split into separate lifecycle orchestration: custom packs enter Commit Plan and storage, while built-ins become runtime source snapshots directly. Runtime source adapters produce snapshots, the assembler builds the runtime read model, and source-state persistence ports own disabled-state writes.

**Tech Stack:** TypeScript, Next.js, Zustand, Vitest, existing card import pipeline, existing app preferences localStorage boundary.

---

## Required Reading

Read these before Task 1:

- `AGENTS.md`
- `CONTEXT.md`
- `docs/contexts/content-pack-import/CONTEXT.md`
- `docs/architecture/storage-boundaries.md`
- `docs/architecture/ui-business-boundaries.md`
- `docs/architecture/testing.md`
- `docs/superpowers/specs/2026-06-22-card-runtime-source-assembly-design.md`
- `docs/superpowers/plans/2026-06-22-card-automation-phase-1.md`

## Non-Negotiable Constraints

- Do not start `pnpm dev`, `pnpm start`, or another long-running server.
- Built-in cards must not be installed into custom card localStorage.
- Built-in loading must not build `CardImportFinalCommitPlan`, generated pack ids, or fake commit drafts.
- Runtime consumers should not branch on `SYSTEM_BUILTIN_CARDS`.
- Custom card storage format remains compatible with existing installed packs.
- Existing card instances must not auto-refresh automation from current templates.
- If runtime refresh fails, keep the previously published runtime read model.

## File Structure

Create these new files:

- `card/runtime/source-types.ts`: runtime source ids, source snapshot types, disabled-state result types, source-load diagnostic types.
- `card/runtime/prepare-card-pack-content.ts`: shared card-pack content preparation used by import and built-in loading before projection.
- `card/runtime/runtime-card-projection.ts`: pure `CardPackDryRunCard -> ExtendedStandardCard` projection with no source/storage metadata.
- `card/runtime/source-assembly.ts`: pure assembly of ordered source snapshots into `cards` and `batches`.
- `card/runtime/builtin-source-adapter.ts`: bundled built-in source loader using app preferences and shared preparation/projection.
- `card/runtime/custom-source-adapter.ts`: custom source loader from existing custom storage/index payloads; passes installed template automation through without compiling or repairing it.
- `card/runtime/source-disabled-state.ts`: built-in disabled-state operation routing app preference writes through a semantic runtime-source helper. Custom disabled-state writes remain in the store because they update the custom pack index.
- `card/runtime/card-pack-view-model.ts`: card pack management source list item builder with capabilities.
- `card/runtime/__tests__/runtime-card-projection.test.ts`
- `card/runtime/__tests__/source-assembly.test.ts`
- `card/runtime/__tests__/builtin-source-adapter.test.ts`
- `card/runtime/__tests__/custom-source-adapter.test.ts`
- `card/runtime/__tests__/source-disabled-state.test.ts`

Modify these existing files:

- `card/import/import-pipeline.ts`: call shared preparation boundary before import-specific conflict checks and commit draft building.
- `card/packs/legacy-storage-format-adapter.ts`: reuse `projectCardPackModelToRuntimeTemplates()` and append storage metadata afterward.
- `card/packs/local-storage-repository.ts`: keep storage transaction behavior; expose or preserve helpers needed by custom source adapter.
- `card/packs/default-card-pack-services.ts`: use an all-sources built-in identity surface for conflict checks.
- `card/packs/runtime-refresh-adapter.ts`: call full runtime refresh rather than custom-only runtime reload.
- `card/stores/store-types.ts`: add runtime source APIs and remove legacy built-in import actions from the public internal action surface.
- `card/stores/store-actions.ts`: replace legacy built-in seed/import path with source loading, assembly, atomic publish, custom-only sync, and semantic disabled-state routing.
- `card/index-unified.ts`: route `toggleBatchDisabled` and `getBatchDisabledStatus` through source-state/read-model helpers.
- `lib/app-preferences.ts`: add card disabled source ids, raw field detection, and card source helpers.
- `lib/__tests__/app-preferences.test.ts`: cover card source preference normalization and write failures.
- `components/content-pack-manager/card-pack-tab.tsx`: use source capabilities instead of `isSystemBatch`.
- `components/content-pack-manager/__tests__/card-pack-tab.test.tsx`: update UI capability expectations.
- `app/card-manager/page.tsx`: use semantic source disabled operation and refresh local snapshots after source changes.
- `app/card-manager/__tests__/card-manager-card-lifecycle.test.tsx`: update toggle expectations and stale-view refresh coverage.
- `components/modals/generic-card-selection-modal.tsx`: ensure batch filter options refresh after runtime source changes.

## Task 1: Characterize Current Runtime Boundaries

**Files:**

- Modify: `card/packs/__tests__/runtime-refresh-adapter.test.ts`
- Modify: `card/packs/__tests__/lifecycle-runtime-integration.test.ts`
- Modify: `card/__tests__/legacy-import-facade.test.ts`
- Modify: `components/content-pack-manager/__tests__/card-pack-tab.test.tsx`

- [x] **Step 1: Add characterization for disabled built-in id reservation**

Add a test in `card/packs/__tests__/lifecycle-runtime-integration.test.ts` that proves the desired future invariant: disabled built-in templates remain reserved for import conflicts.

```ts
it("reserves disabled built-in template ids for custom import conflict checks", async () => {
  const builtinCardId = "class-bard"
  const builtinIds = new Set([builtinCardId])

  expect(builtinIds.has("class-bard")).toBe(true)
})
```

This starts as a narrow identity-surface test. Later tasks replace the local `Set` with the real all-sources identity helper.

- [x] **Step 2: Add characterization for custom-only refresh being replaced**

In `card/packs/__tests__/runtime-refresh-adapter.test.ts`, add a failing target test for full runtime refresh:

```ts
it("refreshes built-in and custom snapshots together instead of preserving stale built-in state", async () => {
  const store = createStoreWithBuiltinAndBrowserStorage({ builtinDisabledInMemory: false })

  await store.reloadCustomRuntimeFromStorage()

  expect(store.batches.get(BUILTIN_BATCH_ID)?.disabled).toBe(false)
  expect(Array.from(store.batches.keys())).toContain(BUILTIN_BATCH_ID)
})
```

Expected now: PASS or FAIL depending on current helper details. If it passes accidentally, keep it as regression coverage and add Task 6 tests for preference-state refresh.

- [x] **Step 3: Update existing facade characterization names**

In `card/__tests__/legacy-import-facade.test.ts`, rename the `toggleBatchDisabled` test description to make the current limitation explicit:

```ts
it("currently delegates custom batch toggles through custom pack storage", async () => {
  const { toggleBatchDisabled } = await import("@/card/index-unified")
  await expect(toggleBatchDisabled("batch_test")).resolves.toBe(true)
})
```

- [x] **Step 4: Run characterization tests**

Run:

```bash
pnpm test:run card/packs/__tests__/runtime-refresh-adapter.test.ts card/packs/__tests__/lifecycle-runtime-integration.test.ts card/__tests__/legacy-import-facade.test.ts components/content-pack-manager/__tests__/card-pack-tab.test.tsx
```

Expected: PASS, except any target test intentionally marked as failing must be committed only after converting it to `.fails` or after implementing the matching task. Do not leave a normal failing test committed.

- [x] **Step 5: Commit characterization**

```bash
git add card/packs/__tests__/runtime-refresh-adapter.test.ts card/packs/__tests__/lifecycle-runtime-integration.test.ts card/__tests__/legacy-import-facade.test.ts components/content-pack-manager/__tests__/card-pack-tab.test.tsx
git commit -m "test: characterize card runtime source boundaries"
```

## Task 2: Add Card Source Preferences and Runtime Source Types

**Files:**

- Modify: `lib/app-preferences.ts`
- Modify: `lib/__tests__/app-preferences.test.ts`
- Create: `card/runtime/source-types.ts`

- [x] **Step 1: Write preference tests**

Add these imports to `lib/__tests__/app-preferences.test.ts`:

```ts
import {
  getCardDisabledSourceIds,
  setCardSourceDisabled,
  SYSTEM_BUILTIN_CARDS_SOURCE_ID,
} from "../app-preferences"
```

Add tests:

```ts
it("normalizes card disabled source ids independently from equipment", () => {
  const storage = createMemoryStorage({
    [APP_PREFERENCES_STORAGE_KEY]: JSON.stringify({
      format: "dhsheet.app-preferences.v1",
      ui: { cardDisplayMode: "image", dualPage: { enabled: false } },
      announcements: {},
      contentSources: {
        equipmentDisabledSourceIds: ["builtin"],
        cardDisabledSourceIds: [SYSTEM_BUILTIN_CARDS_SOURCE_ID, "unknown", SYSTEM_BUILTIN_CARDS_SOURCE_ID],
      },
    }),
  })

  expect(getCardDisabledSourceIds(storage)).toEqual([SYSTEM_BUILTIN_CARDS_SOURCE_ID])
  expect(getEquipmentDisabledSourceIds(storage)).toEqual(["builtin"])
})

it("reports card source preference write failures", () => {
  const storage = createMemoryStorage({}, { failWritesFor: [APP_PREFERENCES_STORAGE_KEY] })

  expect(setCardSourceDisabled(SYSTEM_BUILTIN_CARDS_SOURCE_ID, true, storage)).toBe(false)
  expect(getCardDisabledSourceIds(storage)).toEqual([])
})
```

- [x] **Step 2: Run preference tests and verify failure**

Run:

```bash
pnpm test:run lib/__tests__/app-preferences.test.ts
```

Expected: FAIL because card source helpers and fields do not exist.

- [x] **Step 3: Implement card preference fields**

In `lib/app-preferences.ts`, add:

```ts
export const SYSTEM_BUILTIN_CARDS_SOURCE_ID = "SYSTEM_BUILTIN_CARDS"
const KNOWN_CARD_SOURCE_IDS = new Set([SYSTEM_BUILTIN_CARDS_SOURCE_ID])
```

Extend `AppPreferencesDocument.contentSources` and defaults:

```ts
contentSources: {
  equipmentDisabledSourceIds: string[]
  cardDisabledSourceIds: string[]
}
```

Add normalizer:

```ts
function normalizeCardDisabledSourceIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  const normalized = new Set<string>()
  for (const sourceId of value) {
    if (typeof sourceId === "string" && KNOWN_CARD_SOURCE_IDS.has(sourceId)) {
      normalized.add(sourceId)
    }
  }
  return Array.from(normalized)
}
```

Set `normalized.contentSources.cardDisabledSourceIds` in `normalizePreferences()`.

Add helpers:

```ts
export function getCardDisabledSourceIds(storage?: AppPreferencesStorage): string[] {
  return getAppPreferences(storage).contentSources.cardDisabledSourceIds
}

export function setCardSourceDisabled(
  sourceId: string,
  disabled: boolean,
  storage?: AppPreferencesStorage,
): boolean {
  if (!KNOWN_CARD_SOURCE_IDS.has(sourceId)) return false

  return updatePreferences((preferences) => {
    const next = new Set(preferences.contentSources.cardDisabledSourceIds)
    if (disabled) {
      next.add(sourceId)
    } else {
      next.delete(sourceId)
    }

    return {
      ...preferences,
      contentSources: {
        ...preferences.contentSources,
        cardDisabledSourceIds: Array.from(next),
      },
    }
  }, storage)
}
```

- [x] **Step 4: Add source result types**

Create `card/runtime/source-types.ts`:

```ts
import type { ExtendedStandardCard } from "@/card/card-types"
import type { BatchInfo } from "@/card/stores/store-types"

export const CARD_BUILTIN_SOURCE_ID = "SYSTEM_BUILTIN_CARDS"

export type CardRuntimeSourceKind = "builtin" | "custom"

export interface CardRuntimeSourceSnapshot {
  sourceId: string
  kind: CardRuntimeSourceKind
  batch: BatchInfo
  cards: ExtendedStandardCard[]
}

export type CardRuntimeSourceStateResult =
  | { ok: true; sourceId: string; disabled: boolean }
  | { ok: false; sourceId: string; disabled: boolean; message: string }
```

- [x] **Step 5: Run preference tests**

Run:

```bash
pnpm test:run lib/__tests__/app-preferences.test.ts
```

Expected: PASS.

- [x] **Step 6: Commit preferences**

```bash
git add lib/app-preferences.ts lib/__tests__/app-preferences.test.ts card/runtime/source-types.ts
git commit -m "feat: add card source preferences"
```

## Task 3: Extract Prepared Content and Runtime Projection

**Files:**

- Create: `card/runtime/prepare-card-pack-content.ts`
- Create: `card/runtime/runtime-card-projection.ts`
- Create: `card/runtime/__tests__/runtime-card-projection.test.ts`
- Modify: `card/import/import-pipeline.ts`
- Modify: `card/packs/legacy-storage-format-adapter.ts`
- Modify: `card/packs/__tests__/legacy-storage-format-adapter.test.ts`

- [x] **Step 1: Write projection tests**

Create `card/runtime/__tests__/runtime-card-projection.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { CardType } from "@/card/card-types"
import type { CardPackDryRunValidationModel } from "@/card/import/types"
import { projectCardPackModelToRuntimeTemplates } from "../runtime-card-projection"

describe("projectCardPackModelToRuntimeTemplates", () => {
  it("projects compiled dry-run cards without source-owned metadata", () => {
    const model = {
      cards: [
        {
          group: "communities",
          id: "community-test",
          name: "Test Community",
          description: "Body",
          feature: "Feature",
          summary: "Summary",
          imageUrl: "/images/test.webp",
          hasLocalImage: false,
          automation: {
            format: "daggerheart.card-automation.ir.v1",
            revision: "test",
            abilities: [],
          },
        },
      ],
    } as unknown as CardPackDryRunValidationModel

    expect(projectCardPackModelToRuntimeTemplates(model)).toEqual([
      expect.objectContaining({
        id: "community-test",
        type: CardType.Community,
        automation: expect.objectContaining({ revision: "test" }),
      }),
    ])
    expect(projectCardPackModelToRuntimeTemplates(model)[0]).not.toHaveProperty("batchId")
    expect(projectCardPackModelToRuntimeTemplates(model)[0]).not.toHaveProperty("batchName")
    expect(projectCardPackModelToRuntimeTemplates(model)[0]).not.toHaveProperty("source")
  })
})
```

- [x] **Step 2: Run projection test and verify failure**

Run:

```bash
pnpm test:run card/runtime/__tests__/runtime-card-projection.test.ts
```

Expected: FAIL because projection module does not exist.

- [x] **Step 3: Move pure projection out of legacy storage adapter**

Create `card/runtime/runtime-card-projection.ts` by moving `projectCardFields()` and `subclassLevelToNumber()` from `card/packs/legacy-storage-format-adapter.ts`.

Export:

```ts
export function projectCardPackModelToRuntimeTemplates(
  model: Pick<CardPackDryRunValidationModel, "cards">,
): ExtendedStandardCard[] {
  return model.cards.map(projectCard)
}
```

Keep `projectCard()` preserving compiled `card.automation`:

```ts
function projectCard(card: CardPackDryRunCard): ExtendedStandardCard {
  const projected = projectCardFields(card)
  return card.automation === undefined ? projected : { ...projected, automation: card.automation }
}
```

- [x] **Step 4: Update legacy storage adapter to wrap projection**

In `card/packs/legacy-storage-format-adapter.ts`, import `projectCardPackModelToRuntimeTemplates` and replace direct field projection:

```ts
const runtimeCards = projectCardPackModelToRuntimeTemplates({ cards: plan.packData.cards })
const cards = runtimeCards.map((card) => withBatchStorageFields(card, plan, imageTemplateIdSet))
```

The adapter keeps storage-specific metadata only: `batchId`, `batchName`, `source`, image flags, stored metadata, index entry.

- [x] **Step 5: Extract prepared content function**

Create `card/runtime/prepare-card-pack-content.ts`:

```ts
import { buildCardPackDryRunValidationModel } from "@/card/import/dry-run-model"
import { routeCardPackFormat } from "@/card/import/format-router"
import { validateCardPackV1Structure } from "@/card/import/schema-validation"
import { compileCardPackAutomation, validateCardPackSemantics } from "@/card/import/semantic-validation"
import { hasErrors } from "@/card/import/diagnostics"
import type { CardImportDiagnostic, CardImportSource, CardPackDryRunValidationModel } from "@/card/import/types"

export type PreparedCardPackRuntimeContent =
  | {
      success: true
      model: CardPackDryRunValidationModel
      diagnostics: CardImportDiagnostic[]
    }
  | {
      success: false
      stage: "formatRouting" | "structuralValidation" | "semanticValidation"
      diagnostics: CardImportDiagnostic[]
      model?: CardPackDryRunValidationModel
    }

export function prepareCardPackContentForRuntime(input: {
  payload: unknown
  source?: CardImportSource
  imageAssets?: Parameters<typeof buildCardPackDryRunValidationModel>[1]
}): PreparedCardPackRuntimeContent {
  const imageAssets = input.imageAssets ?? []
  const routed = routeCardPackFormat(input.payload, input.source)
  if (!routed.success) {
    return { success: false, stage: "formatRouting", diagnostics: routed.diagnostics }
  }

  const structural = validateCardPackV1Structure(routed.value)
  if (!structural.success) {
    return {
      success: false,
      stage: "structuralValidation",
      diagnostics: [...routed.diagnostics, ...structural.diagnostics],
    }
  }

  const modelWithoutCompiledAutomation = buildCardPackDryRunValidationModel(structural.value, imageAssets)
  const automationCompilation = compileCardPackAutomation(structural.value, modelWithoutCompiledAutomation)
  const model = automationCompilation.model
  const semanticDiagnostics = [...automationCompilation.diagnostics, ...validateCardPackSemantics(model)]
  const diagnostics = [...routed.diagnostics, ...semanticDiagnostics]

  if (hasErrors(semanticDiagnostics)) {
    return { success: false, stage: "semanticValidation", diagnostics, model }
  }

  return { success: true, diagnostics, model }
}
```

- [x] **Step 6: Update import pipeline to call preparation**

In `card/import/import-pipeline.ts`, replace the duplicated route/structure/model/compile/semantic block with `prepareCardPackContentForRuntime()`. Keep conflict checks and `buildCommitDraft()` in import pipeline after preparation succeeds.

- [x] **Step 7: Run import/projection tests**

Run:

```bash
pnpm test:run card/runtime/__tests__/runtime-card-projection.test.ts card/packs/__tests__/legacy-storage-format-adapter.test.ts card/import/__tests__/pipeline-dry-run.test.ts card/import/__tests__/semantic-validation.test.ts
```

Expected: PASS.

- [x] **Step 8: Commit projection/preparation**

```bash
git add card/runtime/prepare-card-pack-content.ts card/runtime/runtime-card-projection.ts card/runtime/__tests__/runtime-card-projection.test.ts card/import/import-pipeline.ts card/packs/legacy-storage-format-adapter.ts card/packs/__tests__/legacy-storage-format-adapter.test.ts
git commit -m "feat: extract card runtime preparation and projection"
```

## Task 4: Implement Source Assembly

**Files:**

- Create: `card/runtime/source-assembly.ts`
- Create: `card/runtime/__tests__/source-assembly.test.ts`
- Modify: `card/stores/store-types.ts`

- [x] **Step 1: Write source assembly tests**

Create `card/runtime/__tests__/source-assembly.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { CardSource, CardType, type ExtendedStandardCard } from "@/card/card-types"
import type { BatchInfo } from "@/card/stores/store-types"
import { CARD_BUILTIN_SOURCE_ID, type CardRuntimeSourceSnapshot } from "../source-types"
import { assembleCardRuntimeSources } from "../source-assembly"

function card(id: string, batchId: string, source: CardSource): ExtendedStandardCard {
  return { id, name: id, type: CardType.Domain, description: "", batchId, source } as ExtendedStandardCard
}

function batch(id: string, cardIds: string[]): BatchInfo {
  return {
    id,
    name: id,
    fileName: `${id}.json`,
    importTime: "2026-06-23T00:00:00.000Z",
    cardCount: cardIds.length,
    cardTypes: [CardType.Domain],
    size: 1,
    cardIds,
  }
}

describe("assembleCardRuntimeSources", () => {
  it("orders built-in before custom sources", () => {
    const custom: CardRuntimeSourceSnapshot = {
      sourceId: "custom-pack",
      kind: "custom",
      batch: batch("custom-pack", ["custom-card"]),
      cards: [card("custom-card", "custom-pack", CardSource.CUSTOM)],
    }
    const builtin: CardRuntimeSourceSnapshot = {
      sourceId: CARD_BUILTIN_SOURCE_ID,
      kind: "builtin",
      batch: batch(CARD_BUILTIN_SOURCE_ID, ["builtin-card"]),
      cards: [card("builtin-card", CARD_BUILTIN_SOURCE_ID, CardSource.BUILTIN)],
    }

    const assembled = assembleCardRuntimeSources([custom, builtin])

    expect(Array.from(assembled.batches.keys())).toEqual([CARD_BUILTIN_SOURCE_ID, "custom-pack"])
    expect(Array.from(assembled.cards.keys())).toEqual(["builtin-card", "custom-card"])
  })

  it("fails fast on duplicate card ids", () => {
    const first: CardRuntimeSourceSnapshot = {
      sourceId: "a",
      kind: "custom",
      batch: batch("a", ["duplicate"]),
      cards: [card("duplicate", "a", CardSource.CUSTOM)],
    }
    const second: CardRuntimeSourceSnapshot = {
      sourceId: "b",
      kind: "custom",
      batch: batch("b", ["duplicate"]),
      cards: [card("duplicate", "b", CardSource.CUSTOM)],
    }

    expect(() => assembleCardRuntimeSources([first, second])).toThrow(/Duplicate card id duplicate/)
  })
})
```

- [x] **Step 2: Run assembly tests and verify failure**

Run:

```bash
pnpm test:run card/runtime/__tests__/source-assembly.test.ts
```

Expected: FAIL because `source-assembly.ts` does not exist.

- [x] **Step 3: Implement assembler**

Create `card/runtime/source-assembly.ts`:

```ts
import type { ExtendedStandardCard } from "@/card/card-types"
import type { BatchInfo } from "@/card/stores/store-types"
import type { CardRuntimeSourceSnapshot } from "./source-types"

export interface AssembledCardRuntime {
  cards: Map<string, ExtendedStandardCard>
  batches: Map<string, BatchInfo>
}

function orderedSources(sources: CardRuntimeSourceSnapshot[]): CardRuntimeSourceSnapshot[] {
  return [
    ...sources.filter((source) => source.kind === "builtin"),
    ...sources.filter((source) => source.kind !== "builtin"),
  ]
}

export function assembleCardRuntimeSources(sources: CardRuntimeSourceSnapshot[]): AssembledCardRuntime {
  const cards = new Map<string, ExtendedStandardCard>()
  const batches = new Map<string, BatchInfo>()

  for (const source of orderedSources(sources)) {
    if (batches.has(source.sourceId)) {
      throw new Error(`Duplicate card runtime source id ${source.sourceId}`)
    }
    batches.set(source.sourceId, source.batch)

    for (const card of source.cards) {
      if (cards.has(card.id)) {
        throw new Error(`Duplicate card id ${card.id}`)
      }
      cards.set(card.id, card)
    }
  }

  return { cards, batches }
}
```

- [x] **Step 4: Run assembly tests**

Run:

```bash
pnpm test:run card/runtime/__tests__/source-assembly.test.ts
```

Expected: PASS.

- [x] **Step 5: Commit assembler**

```bash
git add card/runtime/source-assembly.ts card/runtime/__tests__/source-assembly.test.ts card/stores/store-types.ts
git commit -m "feat: assemble card runtime sources"
```

## Task 5: Implement Built-in and Custom Source Adapters

**Files:**

- Create: `card/runtime/builtin-source-adapter.ts`
- Create: `card/runtime/custom-source-adapter.ts`
- Create: `card/runtime/__tests__/builtin-source-adapter.test.ts`
- Create: `card/runtime/__tests__/custom-source-adapter.test.ts`

- [x] **Step 1: Write built-in adapter tests**

Create `card/runtime/__tests__/builtin-source-adapter.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { CardSource } from "@/card/card-types"
import { CARD_BUILTIN_SOURCE_ID } from "../source-types"
import { loadBuiltinCardRuntimeSource } from "../builtin-source-adapter"

describe("loadBuiltinCardRuntimeSource", () => {
  it("loads bundled built-in cards with compiled automation", async () => {
    const source = await loadBuiltinCardRuntimeSource({ disabledSourceIds: [] })
    const automated = source.cards.find((card) => card.automation)

    expect(source.sourceId).toBe(CARD_BUILTIN_SOURCE_ID)
    expect(source.kind).toBe("builtin")
    expect(source.batch.id).toBe(CARD_BUILTIN_SOURCE_ID)
    expect(source.batch.disabled).toBe(false)
    expect(source.cards.every((card) => card.source === CardSource.BUILTIN)).toBe(true)
    expect(automated?.automation).toEqual(expect.objectContaining({ format: "daggerheart.card-automation.ir.v1" }))
  })

  it("applies disabled state from app preferences input", async () => {
    const source = await loadBuiltinCardRuntimeSource({ disabledSourceIds: [CARD_BUILTIN_SOURCE_ID] })

    expect(source.batch.disabled).toBe(true)
  })
})
```

- [x] **Step 2: Write custom adapter tests**

Create `card/runtime/__tests__/custom-source-adapter.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { CardSource, CardType } from "@/card/card-types"
import type { BatchData, CustomCardIndex } from "@/card/stores/store-types"
import { CARD_BUILTIN_SOURCE_ID } from "../source-types"
import { loadCustomCardRuntimeSourcesFromSnapshot } from "../custom-source-adapter"

describe("loadCustomCardRuntimeSourcesFromSnapshot", () => {
  it("ignores legacy built-in batch entries", () => {
    const index: CustomCardIndex = {
      batches: {
        [CARD_BUILTIN_SOURCE_ID]: {
          id: CARD_BUILTIN_SOURCE_ID,
          name: "builtin",
          fileName: "builtin",
          importTime: "2026-06-23T00:00:00.000Z",
          cardCount: 1,
          cardTypes: [CardType.Domain],
          size: 1,
          isSystemBatch: true,
        },
        custom: {
          id: "custom",
          name: "custom",
          fileName: "custom.json",
          importTime: "2026-06-23T00:00:00.000Z",
          cardCount: 1,
          cardTypes: [CardType.Domain],
          size: 1,
          disabled: false,
        },
      },
      totalCards: 2,
      totalBatches: 2,
      lastUpdate: "2026-06-23T00:00:00.000Z",
    }
    const batches = new Map<string, BatchData>([
      [
        "custom",
        {
          metadata: { id: "custom", name: "custom", fileName: "custom.json", importTime: "2026-06-23T00:00:00.000Z" },
          cards: [{ id: "custom-card", name: "Custom", type: CardType.Domain, source: CardSource.CUSTOM, batchId: "custom" } as any],
        },
      ],
    ])

    expect(loadCustomCardRuntimeSourcesFromSnapshot({ index, batches }).map((source) => source.sourceId)).toEqual([
      "custom",
    ])
  })
})
```

- [x] **Step 3: Run adapter tests and verify failure**

Run:

```bash
pnpm test:run card/runtime/__tests__/builtin-source-adapter.test.ts card/runtime/__tests__/custom-source-adapter.test.ts
```

Expected: FAIL because adapters do not exist.

- [x] **Step 4: Implement built-in adapter**

Create `card/runtime/builtin-source-adapter.ts`:

```ts
import builtinCardPackJson from "@/data/cards/builtin-base.json"
import { CardSource, CardType } from "@/card/card-types"
import type { BatchInfo } from "@/card/stores/store-types"
import { prepareCardPackContentForRuntime } from "./prepare-card-pack-content"
import { projectCardPackModelToRuntimeTemplates } from "./runtime-card-projection"
import { CARD_BUILTIN_SOURCE_ID, type CardRuntimeSourceSnapshot } from "./source-types"

export async function loadBuiltinCardRuntimeSource(input: {
  disabledSourceIds: string[]
}): Promise<CardRuntimeSourceSnapshot> {
  const prepared = prepareCardPackContentForRuntime({
    payload: builtinCardPackJson,
    source: { kind: "builtin", label: "System Built-in Cards" },
  })

  if (!prepared.success) {
    throw new Error(`Failed to load built-in card runtime source: ${prepared.diagnostics.map((d) => d.message).join("; ")}`)
  }

  const cards = projectCardPackModelToRuntimeTemplates(prepared.model).map((card) => ({
    ...card,
    source: CardSource.BUILTIN,
    batchId: CARD_BUILTIN_SOURCE_ID,
    batchName: "系统内置卡牌",
    hasLocalImage: false,
  }))

  const cardTypes = Array.from(new Set(cards.map((card) => card.type ?? CardType.Domain)))
  const batch: BatchInfo = {
    id: CARD_BUILTIN_SOURCE_ID,
    name: "系统内置卡牌",
    fileName: "builtin-base.json",
    importTime: "builtin",
    cardCount: cards.length,
    cardTypes,
    size: 0,
    isSystemBatch: true,
    disabled: input.disabledSourceIds.includes(CARD_BUILTIN_SOURCE_ID),
    cardIds: cards.map((card) => card.id),
  }

  return { sourceId: CARD_BUILTIN_SOURCE_ID, kind: "builtin", batch, cards }
}
```

- [x] **Step 5: Implement custom adapter**

Create `card/runtime/custom-source-adapter.ts`:

```ts
import { CARD_BUILTIN_SOURCE_ID, type CardRuntimeSourceSnapshot } from "./source-types"
import type { BatchData, BatchInfo, CustomCardIndex } from "@/card/stores/store-types"

export function loadCustomCardRuntimeSourcesFromSnapshot(input: {
  index: CustomCardIndex
  batches: Map<string, BatchData>
}): CardRuntimeSourceSnapshot[] {
  const sources: CardRuntimeSourceSnapshot[] = []

  for (const [batchId, entry] of Object.entries(input.index.batches)) {
    if (batchId === CARD_BUILTIN_SOURCE_ID) continue
    const stored = input.batches.get(batchId)
    if (!stored) continue

    const batch: BatchInfo = {
      ...entry,
      disabled: entry.disabled === true,
      cardIds: stored.cards.map((card) => card.id),
      customFieldDefinitions: stored.customFieldDefinitions,
      variantTypes: stored.variantTypes,
      imageCardIds: stored.metadata.imageCardIds,
      imageCount: stored.metadata.imageCount,
      totalImageSize: stored.metadata.totalImageSize,
    }

    sources.push({ sourceId: batchId, kind: "custom", batch, cards: stored.cards })
  }

  return sources
}
```

Do not add full persisted automation IR validation in this task. That hardening belongs to a separate storage-validation task. The adapter should preserve stored automation and leave compilation/validation to the import pipeline that originally installed the template.

- [x] **Step 6: Run adapter tests**

Run:

```bash
pnpm test:run card/runtime/__tests__/builtin-source-adapter.test.ts card/runtime/__tests__/custom-source-adapter.test.ts
```

Expected: PASS.

- [x] **Step 7: Commit adapters**

```bash
git add card/runtime/builtin-source-adapter.ts card/runtime/custom-source-adapter.ts card/runtime/__tests__/builtin-source-adapter.test.ts card/runtime/__tests__/custom-source-adapter.test.ts
git commit -m "feat: load card runtime source snapshots"
```

## Task 6A: Add Built-in Source Disabled-State Helper

**Files:**

- Create: `card/runtime/source-disabled-state.ts`
- Create: `card/runtime/__tests__/source-disabled-state.test.ts`

- [x] **Step 1: Implement built-in disabled-state operation**

Create `card/runtime/source-disabled-state.ts` with `setBuiltinCardRuntimeSourceDisabled()` and `getBuiltinCardRuntimeSourceDisabled()`. The helper must route only the built-in source to app preferences through `setCardSourceDisabled()` / `getCardDisabledSourceIds()`.

Custom source disabled writes are deliberately not handled here because custom disabled state belongs to the existing custom card index and has to be coordinated with full runtime refresh by the store.

- [x] **Step 2: Cover success and write failure**

Add `card/runtime/__tests__/source-disabled-state.test.ts` covering:

- successful built-in source preference writes;
- failed app preference writes returning `ok: false`;
- reads using an injected storage boundary.

- [x] **Step 3: Run helper tests**

Run:

```bash
pnpm test:run card/runtime/__tests__/source-disabled-state.test.ts lib/__tests__/app-preferences.test.ts
```

Expected: PASS.

- [x] **Step 4: Commit helper**

```bash
git add card/runtime/source-disabled-state.ts card/runtime/__tests__/source-disabled-state.test.ts docs/superpowers/plans/2026-06-23-card-runtime-source-assembly.md
git commit -m "feat: add card source disabled state helper"
```

## Task 6B: Replace Store Initialization, Refresh, Sync, and Disabled Writes

**Files:**

- Modify: `card/stores/store-types.ts`
- Modify: `card/stores/store-actions.ts`
- Modify: `card/packs/runtime-refresh-adapter.ts`
- Modify: `card/packs/default-card-pack-services.ts`
- Modify: `card/index-unified.ts`
- Modify: `card/runtime/source-disabled-state.ts`
- Modify: `card/packs/__tests__/runtime-refresh-adapter.test.ts`
- Modify: `card/packs/__tests__/lifecycle-runtime-integration.test.ts`
- Modify: `card/__tests__/legacy-import-facade.test.ts`

- [x] **Step 1: Add store-level target tests**

In `card/packs/__tests__/runtime-refresh-adapter.test.ts`, add:

```ts
it("keeps previous runtime when full runtime refresh fails", async () => {
  const store = createStoreWithStaleCustomCard("stale-card")
  const before = store.cards.map((card) => card.id)

  await expect(store.reloadCustomRuntimeFromStorage()).rejects.toThrow()

  expect(store.cards.map((card) => card.id)).toEqual(before)
  expect(before).toContain("stale-card")
})
```

If existing helper cannot simulate failure, add a local store variant whose `_loadCustomCardsFromStorage` throws and assert previous runtime is preserved.

- [x] **Step 2: Replace built-in seed path**

In `card/stores/store-actions.ts`:

- stop calling `_seedBuiltinCards()` from `_loadAllCards()`;
- create a new internal load flow that calls `loadBuiltinCardRuntimeSource()`, custom source loading, and `assembleCardRuntimeSources()`;
- publish `{ cards, batches }` once after assembly succeeds;
- rebuild derived indexes after publish;
- keep `_seedBuiltinCards`, `_importBuiltinCards`, and `_convertImportData` only until all references are removed, then delete them from `store-types.ts` and `store-actions.ts`.

Use this structure:

```ts
const builtinSource = await loadBuiltinCardRuntimeSource({
  disabledSourceIds: getCardDisabledSourceIds(),
})
const customSources = await get()._loadCustomRuntimeSourceSnapshots()
const assembled = assembleCardRuntimeSources([builtinSource, ...customSources])
set({ cards: assembled.cards, batches: assembled.batches, cacheValid: false })
get()._rebuildCardsByType()
```

- [x] **Step 3: Make custom sync custom-only**

Replace `_syncToLocalStorage()` internals so it derives the index from custom batches only:

```ts
const customBatches = Array.from(state.batches.values()).filter((batch) => batch.id !== CARD_BUILTIN_SOURCE_ID)
const customCards = Array.from(state.cards.values()).filter((card) => card.batchId !== CARD_BUILTIN_SOURCE_ID)
```

Write batch payloads first, then the index. Keep `_syncToLocalStorage()` as a wrapper if renaming all call sites causes churn; add a local comment:

```ts
// Persists custom card storage only. Built-in source state belongs to app preferences.
```

- [x] **Step 4: Route disabled writes**

Change `toggleBatchDisabled(batchId)` so:

- built-in calls `setBuiltinCardRuntimeSourceDisabled(nextDisabled)`;
- custom updates the custom index as before;
- failed persistence returns `false`;
- successful persistence triggers full runtime refresh/assembly.

Keep `toggleBatchDisabled()` as a facade for compatibility, but implement the new semantic behavior under it.

- [x] **Step 5: Replace custom-only refresh adapter**

In `card/packs/runtime-refresh-adapter.ts`, call the store's full runtime refresh method instead of `reloadCustomRuntimeFromStorage()` if the store exposes one. If keeping the method name for compatibility, change its implementation to full refresh and update comments.

- [x] **Step 6: Fix built-in conflict identity**

In `card/packs/default-card-pack-services.ts`, replace `loadAllCards()` for built-in ids with an all-sources identity helper. If the helper lives in store actions, name it:

```ts
getAllBuiltinCardTemplateIds(): string[]
```

It must include disabled built-in templates.

- [x] **Step 7: Run store and lifecycle tests**

Run:

```bash
pnpm test:run card/packs/__tests__/runtime-refresh-adapter.test.ts card/packs/__tests__/lifecycle-runtime-integration.test.ts card/__tests__/legacy-import-facade.test.ts card/runtime/__tests__/source-disabled-state.test.ts
```

Expected: PASS.

- [x] **Step 8: Commit store integration**

```bash
git add card/stores/store-types.ts card/stores/store-actions.ts card/packs/runtime-refresh-adapter.ts card/packs/default-card-pack-services.ts card/index-unified.ts card/packs/__tests__/runtime-refresh-adapter.test.ts card/packs/__tests__/lifecycle-runtime-integration.test.ts card/__tests__/legacy-import-facade.test.ts docs/superpowers/plans/2026-06-23-card-runtime-source-assembly.md
git commit -m "feat: assemble card runtime sources in store"
```

## Task 7: UI Runtime Subscriptions

Superseded by `docs/superpowers/plans/2026-06-23-card-runtime-ui-subscriptions.md`.

The direction changed from manually refreshing stale UI snapshots after source changes to subscribing card UI directly to the card runtime read model. Execute the standalone UI subscription plan instead of this older Task 7.

## Task 8: End-to-End Verification and Cleanup

**Files:**

- Modify: `card/stores/store-actions.ts`
- Modify: `card/stores/store-types.ts`
- Modify: `docs/superpowers/specs/2026-06-22-card-runtime-source-assembly-design.md` only if implementation decisions require wording correction.

- [x] **Step 1: Remove dead legacy built-in import code**

Delete these members from `card/stores/store-types.ts` and implementations from `card/stores/store-actions.ts` after all references are gone:

```ts
_seedBuiltinCards
_importBuiltinCards
_convertImportData
```

Run:

```bash
rg "_seedBuiltinCards|_importBuiltinCards|_convertImportData" card
```

Expected: no production references remain.

- [x] **Step 2: Run focused runtime suite**

Run:

```bash
pnpm test:run card/runtime/__tests__/runtime-card-projection.test.ts card/runtime/__tests__/source-assembly.test.ts card/runtime/__tests__/builtin-source-adapter.test.ts card/runtime/__tests__/custom-source-adapter.test.ts card/runtime/__tests__/source-disabled-state.test.ts card/packs/__tests__/legacy-storage-format-adapter.test.ts card/packs/__tests__/runtime-refresh-adapter.test.ts card/packs/__tests__/lifecycle-runtime-integration.test.ts lib/__tests__/app-preferences.test.ts
```

Expected: PASS.

- [x] **Step 3: Run automation propagation suite**

Run:

```bash
pnpm test:run automation/actions/__tests__/card-actions.test.ts automation/card/__tests__/provider.test.ts card/automation/__tests__/fixture-matrix.test.ts card/import/__tests__/pipeline-dry-run.test.ts card/import/__tests__/compatibility-fixtures.test.ts
```

Expected: PASS.

- [x] **Step 4: Run full test suite**

Run:

```bash
pnpm test:run
```

Expected: PASS.

- [x] **Step 5: Build**

Run:

```bash
pnpm build
```

Expected: PASS.

- [x] **Step 6: Commit cleanup**

```bash
git add card/stores/store-actions.ts card/stores/store-types.ts docs/superpowers/specs/2026-06-22-card-runtime-source-assembly-design.md
git commit -m "refactor: remove legacy built-in card import path"
```

## Self-Review Checklist

- The plan starts with characterization tests before production changes.
- Built-in and external import share `prepareCardPackContentForRuntime()` and `projectCardPackModelToRuntimeTemplates()`, not Commit Plan.
- Runtime assembler does not produce custom storage documents.
- Disabled built-in template ids remain reserved for import conflicts.
- App preferences own built-in disabled state.
- Custom index remains custom-only.
- Refresh publishes runtime atomically.
- UI uses source capabilities instead of `isSystemBatch`.
- No task requires running a long-lived dev server.
