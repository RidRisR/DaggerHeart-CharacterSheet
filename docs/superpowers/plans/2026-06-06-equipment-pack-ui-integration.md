# Equipment Pack UI Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate custom equipment packs into the content pack management page and weapon/armor selection modals while preserving the existing card pack route and selection workflow.

**Architecture:** Add a pure-memory equipment UI store that wraps the existing equipment application service and runtime cache readers, then let UI components consume read models instead of storage snapshots. Rework `/card-manager` into a content pack manager with one global import panel and card/equipment tabs. Replace string-based equipment selection in new UI with structured runtime template inputs that instantiate character sheet slots directly.

**Tech Stack:** Next.js client components, React, Zustand-style singleton store, Vitest, Testing Library, existing `equipment/*`, `automation/equipment/*`, `card/*`, and `lib/sheet-store.ts`.

---

## Source Design

Primary spec:

- `docs/superpowers/specs/2026-06-06-custom-equipment-pack-ui-integration-design.md`

Supporting specs:

- `docs/superpowers/specs/2026-06-04-custom-equipment-pack-stage-3-storage-repository-design.md`
- `docs/superpowers/specs/2026-06-04-custom-equipment-pack-runtime-cache-view-design.md`

## File Map

Create:

- `equipment/ui/types.ts`: UI-facing read model, diagnostics view model, import result view model, and selection template aliases.
- `equipment/ui/equipment-ui-store.ts`: injectable store factory plus browser singleton. Owns lazy initialization, refresh, import/remove/disable actions, management read models, and runtime query helpers.
- `equipment/ui/__tests__/equipment-ui-store.test.ts`: unit tests for initialization, repeated initialization, import success/failure, management list/detail, and selectable query visibility.
- `components/content-pack-manager/global-import-panel.tsx`: global import drop zone, multi-file result rendering, user-friendly summaries, folded diagnostics.
- `components/content-pack-manager/content-pack-stats.tsx`: business stats cards.
- `components/content-pack-manager/card-pack-tab.tsx`: wrapper for existing card pack list/actions with category badges.
- `components/content-pack-manager/equipment-pack-tab.tsx`: equipment pack list, view modal, enable/disable, delete.
- `components/content-pack-manager/advanced-maintenance.tsx`: folded reset section.
- `components/content-pack-manager/__tests__/global-import-panel.test.tsx`: import auto-detection and diagnostics display tests.
- `components/content-pack-manager/__tests__/equipment-pack-tab.test.tsx`: equipment pack management UI tests.

Modify:

- `app/card-manager/page.tsx`: replace old card-only page with content pack manager layout.
- `components/modals/weapon-selection-modal.tsx`: consume equipment UI store, remove manual custom weapon UI, integrated header filters, source column.
- `components/modals/armor-selection-modal.tsx`: consume equipment UI store, remove manual custom armor UI, integrated header filters, source column.
- `components/character-sheet.tsx`: pass structured template selection objects to sheet store.
- `automation/equipment/template-to-slot.ts`: add runtime template instantiation helpers.
- `lib/sheet-store.ts`: add new structured selection actions and stop new UI from using custom JSON payload parsing.
- `tests/unit/equipment/template-to-slot.test.ts`: runtime helper coverage.
- `tests/unit/modifiers/store-actions.test.ts`: structured selection action coverage.
- `components/modals/__tests__/equipment-selection-modal.test.tsx`: direct modal behavior coverage with mocked equipment UI store.
- `tests/unit/character-sheet-equipment.test.tsx`: existing character sheet equipment regression coverage.

Do not modify in this stage:

- Card pack storage keys.
- Card pack importer internals except where the global import panel delegates to existing functions.
- Card image cache.
- Equipment storage format.
- Equipment import schema.
- Equipment runtime cache core indexes.

---

## Task 1: Equipment UI Store

**Files:**

- Create: `equipment/ui/types.ts`
- Create: `equipment/ui/equipment-ui-store.ts`
- Create: `equipment/ui/__tests__/equipment-ui-store.test.ts`

- [ ] **Step 1: Write failing tests for lazy initialization and query visibility**

Create `equipment/ui/__tests__/equipment-ui-store.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest"
import { createEquipmentUiStore } from "../equipment-ui-store"
import type { EquipmentPackApplicationService } from "@/equipment/packs/application-service"
import type {
  EquipmentRuntimeCacheService,
  RuntimeEquipmentTemplate,
  StableEquipmentRuntimeCacheView,
} from "@/equipment/runtime-cache/types"
import type { EquipmentPackStorageSnapshot } from "@/equipment/packs/storage-types"

function emptySnapshot(): EquipmentPackStorageSnapshot {
  return {
    packs: new Map(),
    packCount: 0,
    integrity: {
      ok: true,
      repaired: false,
      issues: [],
      removedIndexEntries: [],
      removedOrphanPackKeys: [],
      removedCorruptedPackKeys: [],
    },
  }
}

const builtinWeapon: RuntimeEquipmentTemplate = {
  kind: "weapon",
  id: "builtin.weapon.test",
  name: "测试长剑",
  tier: "T1",
  weaponType: "primary",
  trait: "strength",
  damageType: "physical",
  range: "melee",
  burden: "oneHanded",
  damage: "d8",
  featureName: "可靠",
  description: "稳定可靠。",
  modifierContributions: [],
}

function minimalView(): StableEquipmentRuntimeCacheView {
  return {
    templatesById: new Map([[builtinWeapon.id, builtinWeapon]]),
    packsById: new Map(),
    relationIndexes: {
      templateToPackId: new Map([[builtinWeapon.id, "builtin"]]),
      packToTemplateIds: new Map([["builtin", [builtinWeapon.id]]]),
    },
    queryIndexes: {
      selectableTemplateIds: [builtinWeapon.id],
      weaponTemplateIds: [builtinWeapon.id],
      armorTemplateIds: [],
      templateIdsByTier: new Map([["T1", [builtinWeapon.id]]]),
      templateIdsByTrait: new Map([["strength", [builtinWeapon.id]]]),
      templateIdsByWeaponType: new Map([["primary", [builtinWeapon.id]]]),
      templateIdsByDamageType: new Map([["physical", [builtinWeapon.id]]]),
      templateIdsByRange: new Map([["melee", [builtinWeapon.id]]]),
      templateIdsByBurden: new Map([["oneHanded", [builtinWeapon.id]]]),
      templateIdsBySource: new Map([["builtin", [builtinWeapon.id]]]),
    },
  }
}

function createHarness() {
  const runtimeReader = {
    querySelectableTemplates: vi.fn(() => [builtinWeapon]),
    getSelectableTemplateById: vi.fn((id: string) => (id === builtinWeapon.id ? builtinWeapon : undefined)),
  }
  const managementReader = {
    listPacks: vi.fn(() => []),
    getPackDetail: vi.fn(() => undefined),
  }
  const runtimeCacheService = {
    rebuild: vi.fn(),
    getCurrentView: vi.fn(() => minimalView()),
    getRuntimeReader: vi.fn(() => runtimeReader),
    getManagementReader: vi.fn(() => managementReader),
  } as unknown as EquipmentRuntimeCacheService
  const applicationService = {
    initialize: vi.fn(async () => ({
      success: true,
      stage: "runtimeCacheBuild" as const,
      storageCommitted: false,
      snapshot: emptySnapshot(),
      diagnostics: [],
    })),
    loadSnapshot: vi.fn(async () => emptySnapshot()),
    buildConflictContext: vi.fn(),
    importFromSource: vi.fn(),
    removePack: vi.fn(),
    setPackDisabled: vi.fn(),
  } as unknown as EquipmentPackApplicationService

  const store = createEquipmentUiStore({ applicationService, runtimeCacheService })

  return { store, applicationService, runtimeReader, managementReader }
}

describe("equipment UI store", () => {
  it("initializes lazily and does not rebuild twice", async () => {
    const { store, applicationService } = createHarness()

    await store.getState().ensureInitialized()
    await store.getState().ensureInitialized()

    expect(applicationService.initialize).toHaveBeenCalledTimes(1)
    expect(store.getState().initialized).toBe(true)
    expect(store.getState().initializing).toBe(false)
  })

  it("queries selectable runtime templates after initialization", async () => {
    const { store, runtimeReader } = createHarness()

    await store.getState().ensureInitialized()
    const result = store.getState().querySelectableTemplates({ kind: "weapon", searchText: "长剑" })

    expect(runtimeReader.querySelectableTemplates).toHaveBeenCalledWith({ kind: "weapon", searchText: "长剑" })
    expect(result).toEqual([{ ...builtinWeapon, sourceId: "builtin", sourceLabel: "内置" }])
  })

  it("keeps management pack summaries readable when runtime cache initialization fails", async () => {
    const { store, applicationService } = createHarness()
    applicationService.initialize = vi.fn(async () => ({
      success: false,
      stage: "runtimeCacheBuild" as const,
      storageCommitted: false,
      snapshot: {
        ...emptySnapshot(),
        packCount: 1,
        packs: new Map([[
          "dh_equipment_pack_test",
          {
            packId: "dh_equipment_pack_test",
            importedAt: "2026-06-06T00:00:00.000Z",
            disabled: false,
            source: { originKind: "file", fileName: "broken.json" },
            pack: {
              metadata: {
                format: "daggerheart.equipment-pack.v1",
                name: "损坏但可读的装备包",
                version: "1.0.0",
                author: "Tester",
                description: "",
              },
              weapons: [],
              armor: [],
            },
          },
        ]]),
      },
      diagnostics: [{
        severity: "error" as const,
        code: "RUNTIME_CACHE_BUILD_FAILED" as const,
        path: "",
        message: "runtime failed",
      }],
    }))

    await store.getState().ensureInitialized()

    expect(store.getState().initializationError?.code).toBe("RUNTIME_CACHE_BUILD_FAILED")
    expect(store.getState().getPackSummaries()[0]?.name).toBe("损坏但可读的装备包")
    expect(store.getState().querySelectableTemplates({ kind: "weapon" })).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm run test:run -- equipment/ui/__tests__/equipment-ui-store.test.ts
```

Expected: fails because `equipment/ui/equipment-ui-store.ts` does not exist.

- [ ] **Step 3: Add UI types**

Create `equipment/ui/types.ts`:

```ts
import type {
  EquipmentRuntimeQueryCriteria,
  RuntimeEquipmentTemplate,
  RuntimePackDetail,
  RuntimePackSummary,
} from "@/equipment/runtime-cache/types"
import type {
  EquipmentPackApplicationDiagnostic,
  EquipmentPackApplicationImportResult,
  EquipmentPackLifecycleDiagnostic,
  EquipmentPackLifecycleResult,
} from "@/equipment/packs/application-service"
import type { EquipmentPackStorageSnapshot } from "@/equipment/packs/storage-types"

export type EquipmentPackCategoryBadge = "主武器" | "副手" | "护甲"

export type RuntimeEquipmentTemplateWithSource = RuntimeEquipmentTemplate & {
  sourceId: string
  sourceLabel: string
}

export interface EquipmentPackListItem {
  packId: string
  name: string
  author: string
  contentVersion?: string
  importedAt: string
  disabled: boolean
  sourceLabel?: string
  weaponCount: number
  armorCount: number
  categoryBadges: EquipmentPackCategoryBadge[]
}

export interface EquipmentPackDetailView {
  pack: EquipmentPackListItem
  weapons: RuntimeEquipmentTemplateWithSource[]
  armor: RuntimeEquipmentTemplateWithSource[]
}

export interface EquipmentUiDiagnosticView {
  severity: "error" | "warning"
  code: string
  path: string
  message: string
  value?: unknown
}

export interface EquipmentUiStoreState {
  initialized: boolean
  initializing: boolean
  storageSnapshot: EquipmentPackStorageSnapshot | null
  initializationError: EquipmentUiDiagnosticView | null
  lastResult: EquipmentPackApplicationImportResult | EquipmentPackLifecycleResult | null
  lastDiagnostics: EquipmentUiDiagnosticView[]
  ensureInitialized(): Promise<void>
  refreshFromStorage(): Promise<void>
  querySelectableTemplates(criteria?: EquipmentRuntimeQueryCriteria): RuntimeEquipmentTemplateWithSource[]
  getSelectableTemplateById(templateId: string): RuntimeEquipmentTemplateWithSource | undefined
  getPackSummaries(): EquipmentPackListItem[]
  getPackDetail(packId: string): EquipmentPackDetailView | undefined
  importPackFromFile(file: File): Promise<EquipmentPackApplicationImportResult>
  removePack(packId: string): Promise<EquipmentPackLifecycleResult>
  setPackDisabled(packId: string, disabled: boolean): Promise<EquipmentPackLifecycleResult>
}

export type EquipmentUiStoreDiagnostic =
  | EquipmentPackApplicationDiagnostic
  | EquipmentPackLifecycleDiagnostic

export function toDiagnosticView(diagnostic: EquipmentUiStoreDiagnostic): EquipmentUiDiagnosticView {
  return {
    severity: diagnostic.severity,
    code: String(diagnostic.code),
    path: "path" in diagnostic ? diagnostic.path : "",
    message: diagnostic.message,
    value: diagnostic.value,
  }
}
```

- [ ] **Step 4: Add injectable UI store factory and browser singleton**

Create `equipment/ui/equipment-ui-store.ts`:

```ts
"use client"

import { create, type StoreApi, type UseBoundStore } from "zustand"
import { allWeapons } from "@/data/list/all-weapons"
import { armorItems } from "@/data/list/armor"
import { buildBuiltinRuntimeEquipmentTemplates } from "@/equipment/runtime-cache/builtin-templates"
import { createEquipmentRuntimeCacheService } from "@/equipment/runtime-cache/runtime-cache-service"
import { createEquipmentPackApplicationService, type EquipmentPackApplicationService } from "@/equipment/packs/application-service"
import {
  createBrowserLocalStorageAdapter,
  createInMemoryEquipmentPackStorageAdapter,
} from "@/equipment/packs/local-storage-adapter"
import { createLocalStorageEquipmentPackRepository } from "@/equipment/packs/local-storage-repository"
import type { EquipmentRuntimeCacheService, EquipmentRuntimeQueryCriteria, RuntimeEquipmentTemplate, RuntimePackDetail, RuntimePackSummary } from "@/equipment/runtime-cache/types"
import type { EquipmentPackImportSource } from "@/equipment/import/types"
import type { EquipmentPackStorageSnapshot } from "@/equipment/packs/storage-types"
import type { EquipmentUiStoreState, RuntimeEquipmentTemplateWithSource } from "./types"
import { toDiagnosticView } from "./types"

interface CreateEquipmentUiStoreInput {
  applicationService: EquipmentPackApplicationService
  runtimeCacheService: EquipmentRuntimeCacheService
}

function sourceLabelForTemplate(
  template: RuntimeEquipmentTemplate,
  runtimeCacheService: EquipmentRuntimeCacheService,
): { sourceId: string; sourceLabel: string } {
  const view = runtimeCacheService.getCurrentView()
  const sourceId = view.relationIndexes.templateToPackId.get(template.id) ?? "builtin"
  if (sourceId === "builtin") return { sourceId, sourceLabel: "内置" }
  const pack = view.packsById.get(sourceId)
  return { sourceId, sourceLabel: pack?.name ?? sourceId }
}

function withSource(
  template: RuntimeEquipmentTemplate,
  runtimeCacheService: EquipmentRuntimeCacheService,
): RuntimeEquipmentTemplateWithSource {
  return { ...template, ...sourceLabelForTemplate(template, runtimeCacheService) }
}

function categoryBadgesFromDetail(detail: RuntimePackDetail): ("主武器" | "副手" | "护甲")[] {
  const badges: ("主武器" | "副手" | "护甲")[] = []
  if (detail.templates.some((template) => template.kind === "weapon" && template.weaponType === "primary")) badges.push("主武器")
  if (detail.templates.some((template) => template.kind === "weapon" && template.weaponType === "secondary")) badges.push("副手")
  if (detail.templates.some((template) => template.kind === "armor")) badges.push("护甲")
  return badges
}

function toPackListItem(summary: RuntimePackSummary, detail: RuntimePackDetail | undefined) {
  return {
    packId: summary.packId,
    name: summary.name,
    author: summary.author,
    contentVersion: summary.version,
    importedAt: summary.importedAt,
    disabled: summary.disabled,
    sourceLabel: detail?.pack.source?.fileName ?? detail?.pack.source?.label ?? detail?.pack.source?.originKind,
    weaponCount: summary.weaponCount,
    armorCount: summary.armorCount,
    categoryBadges: detail ? categoryBadgesFromDetail(detail) : [],
  }
}

function categoryBadgesFromTemplates(templates: RuntimeEquipmentTemplate[]): ("主武器" | "副手" | "护甲")[] {
  const badges: ("主武器" | "副手" | "护甲")[] = []
  if (templates.some((template) => template.kind === "weapon" && template.weaponType === "primary")) badges.push("主武器")
  if (templates.some((template) => template.kind === "weapon" && template.weaponType === "secondary")) badges.push("副手")
  if (templates.some((template) => template.kind === "armor")) badges.push("护甲")
  return badges
}

function listItemsFromSnapshot(snapshot: EquipmentPackStorageSnapshot | null) {
  if (!snapshot) return []

  return [...snapshot.packs.values()].map((entry) => {
    const runtimeTemplates: RuntimeEquipmentTemplate[] = [
      ...entry.pack.weapons.map((weapon) => ({ kind: "weapon" as const, ...weapon })),
      ...entry.pack.armor.map((armor) => ({ kind: "armor" as const, ...armor })),
    ]

    return {
      packId: entry.packId,
      name: entry.pack.metadata.name,
      author: entry.pack.metadata.author,
      contentVersion: entry.pack.metadata.version,
      importedAt: entry.importedAt,
      disabled: entry.disabled,
      sourceLabel: entry.source?.fileName ?? entry.source?.label ?? entry.source?.originKind,
      weaponCount: entry.pack.weapons.length,
      armorCount: entry.pack.armor.length,
      categoryBadges: categoryBadgesFromTemplates(runtimeTemplates),
    }
  })
}

function detailFromSnapshot(snapshot: EquipmentPackStorageSnapshot | null, packId: string) {
  const entry = snapshot?.packs.get(packId)
  if (!entry) return undefined

  const pack = listItemsFromSnapshot(snapshot).find((item) => item.packId === packId)
  if (!pack) return undefined

  return {
    pack,
    weapons: entry.pack.weapons.map((weapon) => ({
      kind: "weapon" as const,
      ...weapon,
      sourceId: entry.packId,
      sourceLabel: entry.pack.metadata.name,
    })),
    armor: entry.pack.armor.map((armor) => ({
      kind: "armor" as const,
      ...armor,
      sourceId: entry.packId,
      sourceLabel: entry.pack.metadata.name,
    })),
  }
}

function fileToImportSource(file: File): EquipmentPackImportSource {
  return {
    origin: {
      kind: "file",
      fileName: file.name,
      label: file.name,
    },
    async read() {
      return {
        kind: "jsonText",
        text: await file.text(),
        sizeBytes: file.size,
      }
    },
  }
}

export function createEquipmentUiStore(
  input: CreateEquipmentUiStoreInput,
): UseBoundStore<StoreApi<EquipmentUiStoreState>> {
  let initializationPromise: Promise<void> | null = null

  return create<EquipmentUiStoreState>((set, get) => ({
    initialized: false,
    initializing: false,
    initializationError: null,
    storageSnapshot: null,
    lastResult: null,
    lastDiagnostics: [],

    async ensureInitialized() {
      if (get().initialized) return
      if (initializationPromise) return initializationPromise

      set({ initializing: true, initializationError: null })
      initializationPromise = input.applicationService.initialize().then((result) => {
        const diagnostics = result.diagnostics.map(toDiagnosticView)
        set({
          initialized: result.success,
          initializing: false,
          storageSnapshot: result.snapshot,
          initializationError: result.success ? null : diagnostics[0] ?? null,
          lastResult: result,
          lastDiagnostics: diagnostics,
        })
      }).finally(() => {
        initializationPromise = null
      })

      return initializationPromise
    },

    async refreshFromStorage() {
      set({ initialized: false })
      await get().ensureInitialized()
    },

    querySelectableTemplates(criteria: EquipmentRuntimeQueryCriteria = {}) {
      if (get().initializationError) return []

      return input.runtimeCacheService
        .getRuntimeReader()
        .querySelectableTemplates(criteria)
        .map((template) => withSource(template, input.runtimeCacheService))
    },

    getSelectableTemplateById(templateId) {
      const template = input.runtimeCacheService.getRuntimeReader().getSelectableTemplateById(templateId)
      return template ? withSource(template, input.runtimeCacheService) : undefined
    },

    getPackSummaries() {
      if (get().initializationError) {
        return listItemsFromSnapshot(get().storageSnapshot)
      }

      const management = input.runtimeCacheService.getManagementReader()
      return management.listPacks().map((summary) => toPackListItem(summary, management.getPackDetail(summary.packId)))
    },

    getPackDetail(packId) {
      if (get().initializationError) {
        return detailFromSnapshot(get().storageSnapshot, packId)
      }

      const detail = input.runtimeCacheService.getManagementReader().getPackDetail(packId)
      if (!detail) return undefined
      const pack = toPackListItem(detail.pack, detail)
      return {
        pack,
        weapons: detail.templates.filter((template) => template.kind === "weapon").map((template) => withSource(template, input.runtimeCacheService)),
        armor: detail.templates.filter((template) => template.kind === "armor").map((template) => withSource(template, input.runtimeCacheService)),
      }
    },

    async importPackFromFile(file) {
      const result = await input.applicationService.importFromSource(fileToImportSource(file), { mode: "commit" })
      set({ initialized: result.success, lastResult: result, lastDiagnostics: result.diagnostics.map(toDiagnosticView) })
      return result
    },

    async removePack(packId) {
      const result = await input.applicationService.removePack(packId)
      set({ initialized: result.success, lastResult: result, lastDiagnostics: result.diagnostics.map(toDiagnosticView) })
      return result
    },

    async setPackDisabled(packId, disabled) {
      const result = await input.applicationService.setPackDisabled(packId, disabled)
      set({ initialized: result.success, lastResult: result, lastDiagnostics: result.diagnostics.map(toDiagnosticView) })
      return result
    },
  }))
}

function createBrowserEquipmentUiStore() {
  const runtimeCacheService = createEquipmentRuntimeCacheService()
  const adapter = typeof window === "undefined"
    ? createInMemoryEquipmentPackStorageAdapter()
    : createBrowserLocalStorageAdapter(window.localStorage)
  const repository = createLocalStorageEquipmentPackRepository(
    adapter,
  )
  const builtinTemplates = buildBuiltinRuntimeEquipmentTemplates({ weapons: allWeapons, armor: armorItems })
  const applicationService = createEquipmentPackApplicationService({
    repository,
    runtimeCacheService,
    builtinTemplates,
  })

  return createEquipmentUiStore({ applicationService, runtimeCacheService })
}

let browserStore: UseBoundStore<StoreApi<EquipmentUiStoreState>> | null = null

export function useEquipmentUiStore() {
  if (!browserStore) {
    browserStore = createBrowserEquipmentUiStore()
  }
  return browserStore()
}

export function getEquipmentUiStore() {
  if (!browserStore) {
    browserStore = createBrowserEquipmentUiStore()
  }
  return browserStore
}
```

- [ ] **Step 5: Run store tests**

Run:

```bash
npm run test:run -- equipment/ui/__tests__/equipment-ui-store.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add equipment/ui/types.ts equipment/ui/equipment-ui-store.ts equipment/ui/__tests__/equipment-ui-store.test.ts
git commit -m "feat: add equipment UI store"
```

---

## Task 2: Runtime Template Slot Instantiation

**Files:**

- Modify: `automation/equipment/template-to-slot.ts`
- Modify: `tests/unit/equipment/template-to-slot.test.ts`

- [ ] **Step 1: Add failing tests for runtime template helpers**

Append to `tests/unit/equipment/template-to-slot.test.ts`:

```ts
import {
  createArmorSlotFromRuntimeTemplate,
  createWeaponSlotFromRuntimeTemplate,
} from "@/automation/equipment/template-to-slot"
import type { RuntimeEquipmentTemplate } from "@/equipment/runtime-cache/types"

describe("runtime equipment template slot instantiation", () => {
  it("creates a weapon slot from a runtime weapon template", () => {
    const template: RuntimeEquipmentTemplate = {
      kind: "weapon",
      id: "pack.weapon.test-spear",
      name: "测试矛",
      tier: "T1",
      weaponType: "primary",
      trait: "agility",
      damageType: "physical",
      range: "close",
      burden: "oneHanded",
      damage: "d8",
      featureName: "穿刺",
      description: "攻击邻近目标时稳定。",
      modifierContributions: [{
        id: "feature",
        definition: { kind: "modifier", target: "evasion" },
        editable: { label: "闪避", value: 1 },
      }],
    }

    const slot = createWeaponSlotFromRuntimeTemplate(template, (id) => `instance:${id}`)

    expect(slot).toEqual({
      name: "测试矛",
      trait: "physical/oneHanded/close",
      damage: "agility: d8",
      feature: "穿刺: 攻击邻近目标时稳定。",
      modifierContributions: [{
        id: "instance:feature",
        definition: { kind: "modifier", target: "evasion" },
        editable: { label: "闪避", value: 1 },
      }],
    })
  })

  it("creates an armor slot from a runtime armor template", () => {
    const template: RuntimeEquipmentTemplate = {
      kind: "armor",
      id: "pack.armor.test-mail",
      name: "测试链甲",
      tier: "T1",
      baseThresholds: { minor: 5, major: 10 },
      baseArmorMax: 4,
      featureName: "结实",
      description: "适合正面作战。",
      modifierContributions: [],
    }

    const slot = createArmorSlotFromRuntimeTemplate(template, (id) => `instance:${id}`)

    expect(slot).toEqual({
      name: "测试链甲",
      baseArmorMax: 4,
      baseThresholds: { minor: 5, major: 10 },
      feature: "结实: 适合正面作战。",
      modifierContributions: [],
    })
  })
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm run test:run -- tests/unit/equipment/template-to-slot.test.ts
```

Expected: fails because runtime helper exports do not exist.

- [ ] **Step 3: Add runtime helper exports**

Modify `automation/equipment/template-to-slot.ts`:

```ts
import type { RuntimeEquipmentTemplate } from "@/equipment/runtime-cache/types"
```

Add after `createArmorSlotFromTemplate`:

```ts
export function createWeaponSlotFromRuntimeTemplate(
  template: RuntimeEquipmentTemplate & { kind: "weapon" },
  idFactory: IdFactory,
): WeaponSlot {
  return {
    name: template.name,
    trait: joinText([template.damageType, template.burden, template.range], "/"),
    damage: joinText([template.trait, template.damage], ": "),
    feature: createFeatureText(template.featureName, template.description),
    modifierContributions: instantiateContributions(template.modifierContributions, idFactory),
  }
}

export function createArmorSlotFromRuntimeTemplate(
  template: RuntimeEquipmentTemplate & { kind: "armor" },
  idFactory: IdFactory,
): ArmorSlot {
  return {
    name: template.name,
    baseArmorMax: template.baseArmorMax,
    baseThresholds: { ...template.baseThresholds },
    feature: createFeatureText(template.featureName, template.description),
    modifierContributions: instantiateContributions(template.modifierContributions, idFactory),
  }
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm run test:run -- tests/unit/equipment/template-to-slot.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add automation/equipment/template-to-slot.ts tests/unit/equipment/template-to-slot.test.ts
git commit -m "feat: instantiate runtime equipment templates"
```

---

## Task 3: Structured Sheet Store Selection Actions

**Files:**

- Modify: `lib/sheet-store.ts`
- Modify: `tests/unit/modifiers/store-actions.test.ts`
- Modify: `components/character-sheet.tsx`

- [ ] **Step 1: Add failing store action tests**

Append to `tests/unit/modifiers/store-actions.test.ts`:

```ts
import type { RuntimeEquipmentTemplate } from "@/equipment/runtime-cache/types"

describe("structured runtime equipment selection", () => {
  it("selects a runtime weapon template without string lookup", () => {
    const template: RuntimeEquipmentTemplate & { kind: "weapon" } = {
      kind: "weapon",
      id: "pack.weapon.runtime-blade",
      name: "运行时长剑",
      tier: "T1",
      weaponType: "primary",
      trait: "strength",
      damageType: "physical",
      range: "melee",
      burden: "oneHanded",
      damage: "d8",
      featureName: "可靠",
      description: "来自装备包。",
      modifierContributions: [{
        id: "bonus",
        definition: { kind: "modifier", target: "evasion" },
        editable: { label: "闪避", value: 1 },
      }],
    }

    store().selectWeapon({ slotType: "primary" }, { type: "template", template })

    const slot = sheet().equipment.weaponSlots.primary
    expect(slot.name).toBe("运行时长剑")
    expect(slot.feature).toBe("可靠: 来自装备包。")
    expect(slot.modifierContributions).toHaveLength(1)
  })

  it("selects a runtime armor template and clears armor with none", () => {
    const template: RuntimeEquipmentTemplate & { kind: "armor" } = {
      kind: "armor",
      id: "pack.armor.runtime-mail",
      name: "运行时链甲",
      tier: "T1",
      baseThresholds: { minor: 6, major: 12 },
      baseArmorMax: 4,
      featureName: "坚固",
      description: "来自装备包。",
      modifierContributions: [],
    }

    store().selectArmorSlot({ type: "template", template })
    expect(sheet().equipment.armorSlot.name).toBe("运行时链甲")

    store().selectArmorSlot({ type: "none" })
    expect(sheet().equipment.armorSlot.name).toBe("")
  })
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm run test:run -- tests/unit/modifiers/store-actions.test.ts
```

Expected: fails because `selectWeapon` and `selectArmorSlot` do not exist.

- [ ] **Step 3: Add structured action types and actions**

Modify imports in `lib/sheet-store.ts`:

```ts
import {
    createArmorSlotFromRuntimeTemplate,
    createArmorSlotFromTemplate,
    createWeaponSlotFromRuntimeTemplate,
    createWeaponSlotFromTemplate,
} from "@/automation/equipment/template-to-slot";
import type { RuntimeEquipmentTemplate } from "@/equipment/runtime-cache/types";
```

Add near `WeaponSlotSelection`:

```ts
type WeaponSelectionInput =
    | { type: "none" }
    | { type: "template"; template: RuntimeEquipmentTemplate & { kind: "weapon" } }

type ArmorSelectionInput =
    | { type: "none" }
    | { type: "template"; template: RuntimeEquipmentTemplate & { kind: "armor" } }

function createSelectedRuntimeWeaponSlot(selection: WeaponSlotSelection, input: WeaponSelectionInput): WeaponSlot {
    if (input.type === "none") {
        return createEmptyWeaponSlot()
    }

    return createWeaponSlotFromRuntimeTemplate(input.template, (templateContributionId) =>
        createWeaponContributionId(selection, templateContributionId),
    )
}
```

Add to `SheetState`:

```ts
selectWeapon: (selection: WeaponSlotSelection, input: WeaponSelectionInput) => void;
selectArmorSlot: (input: ArmorSelectionInput) => void;
```

Add actions next to existing `selectArmor` / `selectWeaponSlot`:

```ts
selectArmorSlot: (input) => set((state) => {
    const armorSlot = input.type === "none"
        ? createEmptyArmorSlot()
        : createArmorSlotFromRuntimeTemplate(input.template, createEquipmentContributionId)

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

selectWeapon: (selection, input) => set((state) => {
    const slot = createSelectedRuntimeWeaponSlot(selection, input);
    const weaponSlots = state.sheetData.equipment.weaponSlots;

    if (selection.slotType === "inventory") {
        const inventory = [...weaponSlots.inventory] as typeof weaponSlots.inventory;
        inventory[selection.index] = slot;
        return {
            sheetData: applyAutoCalculationForTargets({
                ...state.sheetData,
                equipment: {
                    ...state.sheetData.equipment,
                    weaponSlots: { ...weaponSlots, inventory },
                },
            }),
        };
    }

    return {
        sheetData: applyAutoCalculationForTargets({
            ...state.sheetData,
            equipment: {
                ...state.sheetData.equipment,
                weaponSlots: { ...weaponSlots, [selection.slotType]: slot },
            },
        }),
    };
}),
```

Keep `selectWeaponSlot(selection, weaponId)` and `selectArmor(armorId)` for existing built-in id compatibility, but remove their JSON custom payload parsing:

- `selectWeaponSlot(selection, "none")` still clears the slot.
- `selectWeaponSlot(selection, builtinWeaponId)` still instantiates a built-in weapon.
- Unknown non-JSON strings may still use the existing name fallback during this stage.
- JSON strings are no longer parsed as custom weapon payloads.
- `selectArmor("none")` still clears the slot.
- `selectArmor(builtinArmorId)` still instantiates a built-in armor.
- Unknown non-JSON strings may still use the existing name fallback during this stage.
- JSON strings are no longer parsed as custom armor payloads.

Delete imports and usage of `createWeaponSlotFromCustomPayload` and `createArmorSlotFromCustomPayload` from `lib/sheet-store.ts`. Keep the helper exports in `automation/equipment/template-to-slot.ts` only if other non-UI compatibility tests still import them; do not call them from sheet-store.

- [ ] **Step 4: Update character sheet callbacks**

Modify `components/character-sheet.tsx`:

```ts
const {
  sheetData: formData,
  setSheetData: setFormData,
  updateArmorBox,
  updateProficiency,
  selectArmorSlot,
  selectWeapon,
  handleProfessionChange: autofillProfessionData,
  commitModifierTargetValue,
} = useSheetStore();
```

Change weapon callback:

```ts
const handleWeaponSelect = (input: WeaponSelectionInput) => {
  if (!currentWeaponSlot) return
  selectWeapon(currentWeaponSlot, input)
  setWeaponModalOpen(false)
}
```

Change armor callback:

```ts
const handleArmorSelect = (input: ArmorSelectionInput) => {
  selectArmorSlot(input)
  setArmorModalOpen(false)
}
```

Import the action input types from `lib/sheet-store.ts` if they are exported, or define local prop-compatible types from `RuntimeEquipmentTemplate`.

- [ ] **Step 5: Run store tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/store-actions.test.ts tests/unit/equipment/template-to-slot.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/sheet-store.ts components/character-sheet.tsx tests/unit/modifiers/store-actions.test.ts
git commit -m "feat: add structured equipment selection actions"
```

---

## Task 4: Weapon and Armor Selection Modal Runtime Integration

**Files:**

- Modify: `components/modals/weapon-selection-modal.tsx`
- Modify: `components/modals/armor-selection-modal.tsx`
- Create: `components/modals/__tests__/equipment-selection-modal.test.tsx`

- [ ] **Step 1: Add failing modal behavior tests**

Create `components/modals/__tests__/equipment-selection-modal.test.tsx`. Test `WeaponSelectionModal` and `ArmorSelectionModal` directly; do not render the full `CharacterSheet` for modal behavior.

```ts
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { WeaponSelectionModal } from "../weapon-selection-modal"
import { ArmorSelectionModal } from "../armor-selection-modal"
import type { RuntimeEquipmentTemplateWithSource } from "@/equipment/ui/types"

const weapon: RuntimeEquipmentTemplateWithSource & { kind: "weapon" } = {
  kind: "weapon",
  id: "builtin.weapon.test",
  name: "测试长剑",
  tier: "T1",
  weaponType: "primary",
  trait: "strength",
  damageType: "physical",
  range: "melee",
  burden: "oneHanded",
  damage: "d8",
  featureName: "可靠",
  description: "稳定可靠。",
  modifierContributions: [],
  sourceId: "builtin",
  sourceLabel: "内置",
}

const armor: RuntimeEquipmentTemplateWithSource & { kind: "armor" } = {
  kind: "armor",
  id: "builtin.armor.test",
  name: "测试链甲",
  tier: "T1",
  baseThresholds: { minor: 5, major: 10 },
  baseArmorMax: 3,
  featureName: "坚固",
  description: "稳定可靠。",
  modifierContributions: [],
  sourceId: "builtin",
  sourceLabel: "内置",
}

const storeState = {
  initialized: true,
  initializing: false,
  initializationError: null as null | { severity: "error"; code: string; path: string; message: string },
  ensureInitialized: vi.fn(async () => undefined),
  querySelectableTemplates: vi.fn((criteria?: { kind?: "weapon" | "armor" }) =>
    criteria?.kind === "armor" ? [armor] : [weapon],
  ),
}

vi.mock("@/equipment/ui/equipment-ui-store", () => ({
  getEquipmentUiStore: () => ((selector: (state: typeof storeState) => unknown) => selector(storeState)),
}))

describe("equipment selection modals", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storeState.initialized = true
    storeState.initializing = false
    storeState.initializationError = null
  })

  it("renders weapon source column and selects a runtime weapon template", async () => {
    const onSelect = vi.fn()
    render(
      <WeaponSelectionModal
        isOpen
        onClose={vi.fn()}
        onSelect={onSelect}
        title="选择主武器"
        weaponSlotType="primary"
      />,
    )

    expect(screen.getByRole("columnheader", { name: /来源/ })).toBeInTheDocument()
    expect(screen.getByText("内置")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /自定义武器/ })).not.toBeInTheDocument()

    await userEvent.click(screen.getByText("测试长剑"))
    expect(onSelect).toHaveBeenCalledWith({ type: "template", template: weapon })
  })

  it("renders armor source column and clears with structured none input", async () => {
    const onSelect = vi.fn()
    render(<ArmorSelectionModal isOpen onClose={vi.fn()} onSelect={onSelect} title="选择护甲" />)

    expect(screen.getByRole("columnheader", { name: /来源/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /自定义护甲/ })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "清除选择" }))
    expect(onSelect).toHaveBeenCalledWith({ type: "none" })
  })

  it("shows initialization failure and no equipment rows", () => {
    storeState.initialized = false
    storeState.initializationError = {
      severity: "error",
      code: "RUNTIME_CACHE_BUILD_FAILED",
      path: "",
      message: "runtime failed",
    }

    render(<ArmorSelectionModal isOpen onClose={vi.fn()} onSelect={vi.fn()} title="选择护甲" />)

    expect(screen.getByText(/装备数据初始化失败/)).toBeInTheDocument()
    expect(screen.queryByText("测试链甲")).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm run test:run -- components/modals/__tests__/equipment-selection-modal.test.tsx
```

Expected: fails because modals still show manual custom controls and do not use runtime source columns.

- [ ] **Step 3: Change modal props to structured selection**

In `components/modals/weapon-selection-modal.tsx`, replace:

```ts
onSelect: (weaponId: string) => void;
```

with:

```ts
import type { RuntimeEquipmentTemplate } from "@/equipment/runtime-cache/types"

type WeaponSelectionInput =
  | { type: "none" }
  | { type: "template"; template: RuntimeEquipmentTemplate & { kind: "weapon" } }

onSelect: (input: WeaponSelectionInput) => void;
```

In `components/modals/armor-selection-modal.tsx`, replace:

```ts
onSelect: (armorId: string) => void
```

with:

```ts
import type { RuntimeEquipmentTemplate } from "@/equipment/runtime-cache/types"

type ArmorSelectionInput =
  | { type: "none" }
  | { type: "template"; template: RuntimeEquipmentTemplate & { kind: "armor" } }

onSelect: (input: ArmorSelectionInput) => void
```

- [ ] **Step 4: Replace static lists with equipment UI store queries**

In both modals:

```ts
import { getEquipmentUiStore } from "@/equipment/ui/equipment-ui-store"
import type { RuntimeEquipmentTemplateWithSource } from "@/equipment/ui/types"
import type {
  EquipmentBurden,
  EquipmentDamageType,
  EquipmentRange,
  EquipmentTier,
  EquipmentTrait,
} from "@/equipment/import/types"
```

Use initialization state:

```ts
const equipmentStore = getEquipmentUiStore()
const initialized = equipmentStore((state) => state.initialized)
const initializing = equipmentStore((state) => state.initializing)
const initializationError = equipmentStore((state) => state.initializationError)
const ensureInitialized = equipmentStore((state) => state.ensureInitialized)
const querySelectableTemplates = equipmentStore((state) => state.querySelectableTemplates)

useEffect(() => {
  if (isOpen) void ensureInitialized()
}, [ensureInitialized, isOpen])
```

Replace the old Chinese-label filter states with canonical filter values:

```ts
const [searchText, setSearchText] = useState("")
const [tierFilter, setTierFilter] = useState<EquipmentTier | "">("")
const [traitFilter, setTraitFilter] = useState<EquipmentTrait | "">("")
const [damageTypeFilter, setDamageTypeFilter] = useState<EquipmentDamageType | "">("")
const [rangeFilter, setRangeFilter] = useState<EquipmentRange | "">("")
const [burdenFilter, setBurdenFilter] = useState<EquipmentBurden | "">("")
const [sourceFilter, setSourceFilter] = useState<string>("")
const [weaponTypeFilter, setWeaponTypeFilter] = useState<"" | "primary" | "secondary">("")
```

Filter option labels remain Chinese, but option values must be canonical runtime enum values, for example:

```tsx
<option value="strength">力量</option>
<option value="physical">物理</option>
<option value="oneHanded">单手</option>
```

Build modal rows from `querySelectableTemplates`.

Weapon:

```ts
const filteredWeapons = useMemo(() => {
  return querySelectableTemplates({
    kind: "weapon",
    searchText,
    tier: tierFilter || undefined,
    trait: traitFilter || undefined,
    damageType: damageTypeFilter || undefined,
    range: rangeFilter || undefined,
    burden: burdenFilter || undefined,
    weaponType: weaponSlotType === "inventory" ? weaponTypeFilter || undefined : weaponSlotType,
    sourceId: sourceFilter || undefined,
  }).filter((template): template is RuntimeEquipmentTemplateWithSource & { kind: "weapon" } => template.kind === "weapon")
}, [querySelectableTemplates, searchText, tierFilter, traitFilter, damageTypeFilter, rangeFilter, burdenFilter, weaponTypeFilter, weaponSlotType, sourceFilter])
```

Armor:

```ts
const filteredArmor = useMemo(() => {
  return querySelectableTemplates({
    kind: "armor",
    searchText,
    tier: tierFilter || undefined,
    sourceId: sourceFilter || undefined,
  }).filter((template): template is RuntimeEquipmentTemplateWithSource & { kind: "armor" } => template.kind === "armor")
}, [querySelectableTemplates, searchText, tierFilter, sourceFilter])
```

- [ ] **Step 5: Remove manual custom UI**

Delete state and JSX related to:

- `customName`
- `customLevel`
- `customCheck`
- `customAttribute`
- `customRange`
- `customDamage`
- `customLoad`
- `customFeatureName`
- `customDescription`
- `isCustom`
- `自定义武器`
- `自定义护甲`
- JSON payload `onSelect(JSON.stringify(...))`

Clear selection now calls:

```ts
onSelect({ type: "none" })
```

Row selection calls:

```ts
onSelect({ type: "template", template: weapon })
```

or:

```ts
onSelect({ type: "template", template: armor })
```

- [ ] **Step 6: Render integrated table headers and filters**

Use a table with header labels and filter controls in the same header cells.

Weapon columns:

```text
等级 | 名称 | 来源 | 类型 | 伤害类型 | 负荷 | 范围 | 属性 | 伤害 | 特性名称 | 特性描述
```

Armor columns:

```text
名称 | 等级 | 伤害阈值 | 护甲值 | 来源 | 特性名称 | 特性描述
```

Feature description cell:

```tsx
<td className="max-w-[18rem] truncate" title={template.description}>
  {template.description}
</td>
```

Initialization UI:

```tsx
{initializing && <div className="p-4 text-sm text-muted-foreground">正在加载装备...</div>}
{initializationError && (
  <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
    装备数据初始化失败，当前列表为空。
    <Button size="sm" variant="outline" onClick={() => void ensureInitialized()}>重试</Button>
  </div>
)}
```

- [ ] **Step 7: Run modal tests**

Run:

```bash
npm run test:run -- components/modals/__tests__/equipment-selection-modal.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/modals/weapon-selection-modal.tsx components/modals/armor-selection-modal.tsx components/modals/__tests__/equipment-selection-modal.test.tsx
git commit -m "feat: query equipment runtime templates in selection modals"
```

---

## Task 5: Global Import Panel

**Files:**

- Create: `components/content-pack-manager/global-import-panel.tsx`
- Create: `components/content-pack-manager/import-content-pack.ts`
- Create: `components/content-pack-manager/__tests__/global-import-panel.test.tsx`
- Create: `components/content-pack-manager/__tests__/import-content-pack.test.ts`
- Modify: `app/card-manager/page.tsx`

- [ ] **Step 1: Write failing import panel tests**

Create `components/content-pack-manager/__tests__/global-import-panel.test.tsx`:

```ts
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { GlobalImportPanel } from "../global-import-panel"

describe("GlobalImportPanel", () => {
  it("shows one prominent file picker and user-oriented idle hints", () => {
    render(<GlobalImportPanel onImportFiles={vi.fn()} importing={false} results={[]} />)

    expect(screen.getByRole("button", { name: "选择文件" })).toBeInTheDocument()
    expect(screen.getByText(/支持 JSON 装备包/)).toBeInTheDocument()
    expect(screen.queryByText(/path/)).not.toBeInTheDocument()
  })

  it("renders grouped multi-file results", () => {
    render(
      <GlobalImportPanel
        importing={false}
        onImportFiles={vi.fn()}
        results={[
          { fileName: "weapons.json", kind: "equipment", success: true, summary: "导入 2 个装备模板", diagnostics: [] },
          { fileName: "bad.json", kind: "unknown", success: false, summary: "无法识别内容包类型", diagnostics: [{ severity: "error", code: "UNKNOWN_CONTENT_PACK", path: "", message: "无法识别内容包类型" }] },
        ]}
      />,
    )

    expect(screen.getByText("weapons.json")).toBeInTheDocument()
    expect(screen.getByText("bad.json")).toBeInTheDocument()
    expect(screen.getByText("无法识别内容包类型")).toBeInTheDocument()
  })

  it("folds diagnostics, shows values, and offers show-all for long diagnostic lists", async () => {
    const diagnostics = Array.from({ length: 25 }, (_, index) => ({
      severity: "error" as const,
      code: `ERROR_${index}`,
      path: `/items/${index}`,
      message: `错误 ${index}`,
      value: { index },
    }))

    render(
      <GlobalImportPanel
        importing={false}
        onImportFiles={vi.fn()}
        results={[{ fileName: "bad.json", kind: "unknown", success: false, summary: "导入失败", diagnostics }]}
      />,
    )

    await userEvent.click(screen.getByText(/查看详细信息/))
    expect(screen.getByText("ERROR_0")).toBeInTheDocument()
    expect(screen.queryByText("ERROR_24")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "显示全部" }))
    expect(screen.getByText("ERROR_24")).toBeInTheDocument()
    expect(screen.getByText(/\"index\":24/)).toBeInTheDocument()
  })
})
```

Create `components/content-pack-manager/__tests__/import-content-pack.test.ts` and cover import orchestration separately:

```ts
import { describe, expect, it, vi } from "vitest"
import { importContentPackFiles } from "../import-content-pack"

function jsonFile(name: string, value: unknown) {
  return new File([JSON.stringify(value)], name, { type: "application/json" })
}

describe("importContentPackFiles", () => {
  it("routes equipment JSON by metadata.format", async () => {
    const equipmentImporter = vi.fn(async () => ({
      success: true,
      summary: { weaponCount: 1, armorCount: 1 },
      diagnostics: [],
    }))

    const result = await importContentPackFiles([jsonFile("equipment.json", {
      metadata: { format: "daggerheart.equipment-pack.v1" },
    })], {
      importEquipmentFile: equipmentImporter,
      importCardJson: vi.fn(),
      importDhcb: vi.fn(),
    })

    expect(equipmentImporter).toHaveBeenCalledTimes(1)
    expect(result.results[0]).toMatchObject({ kind: "equipment", success: true })
    expect(result.nextTab).toBe("equipment")
  })

  it("fast-fails unknown JSON instead of sending it to card importer", async () => {
    const cardImporter = vi.fn()
    const result = await importContentPackFiles([jsonFile("unknown.json", { hello: "world" })], {
      importEquipmentFile: vi.fn(),
      importCardJson: cardImporter,
      importDhcb: vi.fn(),
    })

    expect(cardImporter).not.toHaveBeenCalled()
    expect(result.results[0]).toMatchObject({
      kind: "unknown",
      success: false,
      summary: "无法识别内容包类型",
    })
  })

  it("keeps processing files after one file fails", async () => {
    const bad = new File(["{"], "bad.json", { type: "application/json" })
    const good = jsonFile("equipment.json", { metadata: { format: "daggerheart.equipment-pack.v1" } })

    const result = await importContentPackFiles([bad, good], {
      importEquipmentFile: vi.fn(async () => ({ success: true, summary: { weaponCount: 1, armorCount: 0 }, diagnostics: [] })),
      importCardJson: vi.fn(),
      importDhcb: vi.fn(),
    })

    expect(result.results).toHaveLength(2)
    expect(result.aggregateStatus).toBe("partialFailure")
    expect(result.nextTab).toBe("equipment")
  })
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm run test:run -- components/content-pack-manager/__tests__/global-import-panel.test.tsx components/content-pack-manager/__tests__/import-content-pack.test.ts
```

Expected: fails because component does not exist.

- [ ] **Step 3: Implement result view types and panel**

Create `components/content-pack-manager/global-import-panel.tsx`:

```tsx
"use client"

import { useRef, useState } from "react"
import { AlertCircle, CheckCircle, FileText, Upload, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface ContentPackImportDiagnosticView {
  severity: "error" | "warning"
  code: string
  path: string
  message: string
  value?: unknown
}

export interface ContentPackImportResultView {
  fileName: string
  kind: "card" | "equipment" | "unknown"
  success: boolean
  summary: string
  diagnostics: ContentPackImportDiagnosticView[]
}

interface GlobalImportPanelProps {
  importing: boolean
  results: ContentPackImportResultView[]
  onImportFiles(files: File[]): void
}

export function GlobalImportPanel({ importing, results, onImportFiles }: GlobalImportPanelProps) {
  const [dragActive, setDragActive] = useState(false)
  const [expandedDiagnostics, setExpandedDiagnostics] = useState<Record<string, boolean>>({})
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    onImportFiles(Array.from(files))
  }

  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <div
        className={`rounded-lg border-2 border-dashed p-8 text-center ${dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"}`}
        onDragEnter={(event) => { event.preventDefault(); setDragActive(true) }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { event.preventDefault(); setDragActive(false) }}
        onDrop={(event) => {
          event.preventDefault()
          setDragActive(false)
          handleFiles(event.dataTransfer.files)
        }}
      >
        <Upload className="mx-auto mb-3 h-8 w-8 text-gray-500" />
        <h2 className="text-lg font-semibold">导入内容包</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          支持 JSON 装备包、JSON 卡牌包、DHCB / ZIP 卡牌包。导入后内容会保存在本地浏览器中。
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          如果导入失败，通常是文件格式不受支持、文件过大、版本不兼容、内容 id 冲突，或文件损坏。
        </p>
        <Button className="mt-4" disabled={importing} onClick={() => inputRef.current?.click()}>
          <FileText className="mr-2 h-4 w-4" />
          选择文件
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".json,.dhcb,.zip"
          multiple
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>

      {importing && <div className="mt-3 rounded bg-blue-50 p-3 text-sm text-blue-700">正在导入...</div>}

      {results.length > 0 && (
        <div className="mt-4 space-y-3">
          {results.map((result) => (
            <article key={result.fileName} className={`rounded border p-3 ${result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
              <div className="flex items-center gap-2">
                {result.success ? <CheckCircle className="h-4 w-4 text-green-700" /> : <XCircle className="h-4 w-4 text-red-700" />}
                <span className="font-medium">{result.fileName}</span>
                <span className="text-sm text-muted-foreground">{result.summary}</span>
              </div>
              {result.diagnostics.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-muted-foreground">
                    查看详细信息（{result.diagnostics.length}）
                  </summary>
                  <ul className="mt-2 space-y-1 text-xs">
                    {(expandedDiagnostics[result.fileName] ? result.diagnostics : result.diagnostics.slice(0, 20)).map((diagnostic, index) => (
                      <li key={`${diagnostic.code}-${index}`} className="rounded bg-white/70 p-2">
                        <AlertCircle className="mr-1 inline h-3 w-3" />
                        <span className="font-mono">{diagnostic.code}</span>
                        {diagnostic.path && <span className="ml-2 font-mono">{diagnostic.path}</span>}
                        <span className="ml-2">{diagnostic.message}</span>
                        {diagnostic.value !== undefined && (
                          <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px]">
                            {JSON.stringify(diagnostic.value)}
                          </pre>
                        )}
                      </li>
                    ))}
                  </ul>
                  {result.diagnostics.length > 20 && !expandedDiagnostics[result.fileName] && (
                    <Button
                      className="mt-2"
                      size="sm"
                      variant="outline"
                      onClick={() => setExpandedDiagnostics((current) => ({ ...current, [result.fileName]: true }))}
                    >
                      显示全部
                    </Button>
                  )}
                </details>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Add import auto-detection orchestration as a pure helper**

Create `components/content-pack-manager/import-content-pack.ts` with `importContentPackFiles(files, dependencies)`. Then `app/card-manager/page.tsx` calls that helper from `handleGlobalImport(files: File[])`.

- routes `.dhcb` and `.zip` to `importDhcbCardPackage`.
- reads `.json`.
- routes equipment JSON with `metadata.format === "daggerheart.equipment-pack.v1"` to `getEquipmentUiStore().getState().importPackFromFile(file)`.
- routes only recognized card JSON shapes to `importCustomCards`.
- routes unknown JSON to a fast-fail `无法识别内容包类型` result without calling either importer.
- produces `ContentPackImportResultView[]`.
- wraps every file import in per-file `try/catch`, so one parse/import failure cannot abort the whole batch.
- computes an aggregate state: all success / partial failure / all failed.
- sets the active tab to the last successful file kind.
- calls existing `refreshData()` and equipment store refresh after success.
- imports `toDiagnosticView` from `@/equipment/ui/types`.

Detection branch:

```ts
if (file.name.endsWith(".dhcb") || file.name.endsWith(".zip")) {
  const result = await importDhcbCardPackage(file)
  return { fileName: file.name, kind: "card", success: true, summary: `导入 ${result.totalCards} 张卡牌`, diagnostics: [] }
}

if (file.name.endsWith(".json")) {
  const text = await file.text()
  const parsed = JSON.parse(text)
  if (parsed?.metadata?.format === "daggerheart.equipment-pack.v1") {
    const result = await getEquipmentUiStore().getState().importPackFromFile(file)
    return {
      fileName: file.name,
      kind: "equipment",
      success: result.success,
      summary: result.success ? `导入 ${result.summary.weaponCount + result.summary.armorCount} 个装备模板` : "装备包导入失败",
      diagnostics: result.diagnostics.map(toDiagnosticView),
    }
  }

  if (!isCardPackJson(parsed)) {
    return {
      fileName: file.name,
      kind: "unknown",
      success: false,
      summary: "无法识别内容包类型",
      diagnostics: [{ severity: "error", code: "UNKNOWN_CONTENT_PACK", path: "", message: "无法识别内容包类型" }],
    }
  }

  const result = await importCustomCards(parsed as ImportData, file.name)
  return {
    fileName: file.name,
    kind: "card",
    success: result.success,
    summary: result.success ? `导入 ${result.imported} 张卡牌` : "卡牌包导入失败",
    diagnostics: (result.errors ?? []).map((message) => ({ severity: "error", code: "CARD_IMPORT_ERROR", path: "", message })),
  }
}

return {
  fileName: file.name,
  kind: "unknown",
  success: false,
  summary: "无法识别内容包类型",
  diagnostics: [{ severity: "error", code: "UNKNOWN_CONTENT_PACK", path: "", message: "无法识别内容包类型" }],
}
```

`isCardPackJson(parsed)` must be conservative and only return true for the existing card package shape accepted by `importCustomCards`, for example when the object has a `cards` array or the exact existing top-level fields used by the current card importer. Unknown JSON must fast fail with `UNKNOWN_CONTENT_PACK`.

- [ ] **Step 5: Run import panel tests**

Run:

```bash
npm run test:run -- components/content-pack-manager/__tests__/global-import-panel.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/content-pack-manager/global-import-panel.tsx components/content-pack-manager/import-content-pack.ts components/content-pack-manager/__tests__/global-import-panel.test.tsx components/content-pack-manager/__tests__/import-content-pack.test.ts app/card-manager/page.tsx
git commit -m "feat: add global content pack import panel"
```

---

## Task 6: Content Pack Manager Layout and Tabs

**Files:**

- Create: `components/content-pack-manager/content-pack-stats.tsx`
- Create: `components/content-pack-manager/card-pack-tab.tsx`
- Create: `components/content-pack-manager/equipment-pack-tab.tsx`
- Create: `components/content-pack-manager/advanced-maintenance.tsx`
- Create: `components/content-pack-manager/__tests__/equipment-pack-tab.test.tsx`
- Modify: `app/card-manager/page.tsx`

- [ ] **Step 1: Add failing equipment tab tests**

Create `components/content-pack-manager/__tests__/equipment-pack-tab.test.tsx`:

```ts
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { EquipmentPackTab } from "../equipment-pack-tab"

describe("EquipmentPackTab", () => {
  it("shows category badges and exposes view, disable, delete actions", async () => {
    const onView = vi.fn()
    const onToggleDisabled = vi.fn()
    const onRemove = vi.fn()

    render(
      <EquipmentPackTab
        packs={[{
          packId: "dh-equipment-pack-test",
          name: "测试装备包",
          author: "Tester",
          contentVersion: "1.0.0",
          importedAt: "2026-06-06T00:00:00.000Z",
          disabled: false,
          sourceLabel: "test.json",
          weaponCount: 2,
          armorCount: 1,
          categoryBadges: ["主武器", "副手", "护甲"],
        }]}
        initializationError={null}
        onRetryInitialize={vi.fn()}
        onView={onView}
        onToggleDisabled={onToggleDisabled}
        onRemove={onRemove}
      />,
    )

    expect(screen.getByText("测试装备包")).toBeInTheDocument()
    expect(screen.getByText("主武器")).toBeInTheDocument()
    expect(screen.getByText("副手")).toBeInTheDocument()
    expect(screen.getByText("护甲")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "查看" }))
    expect(onView).toHaveBeenCalledWith("dh-equipment-pack-test")
  })

  it("renders mobile cards separately from the desktop table", () => {
    render(
      <EquipmentPackTab
        packs={[{
          packId: "dh-equipment-pack-test",
          name: "测试装备包",
          author: "Tester",
          contentVersion: "1.0.0",
          importedAt: "2026-06-06T00:00:00.000Z",
          disabled: false,
          sourceLabel: "test.json",
          weaponCount: 2,
          armorCount: 1,
          categoryBadges: ["主武器", "副手", "护甲"],
        }]}
        initializationError={null}
        onRetryInitialize={vi.fn()}
        onView={vi.fn()}
        onToggleDisabled={vi.fn()}
        onRemove={vi.fn()}
      />,
    )

    expect(screen.getByTestId("equipment-pack-mobile-list")).toBeInTheDocument()
    expect(screen.getByTestId("equipment-pack-desktop-table")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm run test:run -- components/content-pack-manager/__tests__/equipment-pack-tab.test.tsx
```

Expected: fails because `EquipmentPackTab` does not exist.

- [ ] **Step 3: Implement content stats**

Create `components/content-pack-manager/content-pack-stats.tsx`:

```tsx
interface ContentPackStatsProps {
  cardPackCount: number
  enabledCardPackCount: number
  equipmentPackCount: number
  enabledEquipmentPackCount: number
  customCardCount: number
  weaponTemplateCount: number
  armorTemplateCount: number
}

export function ContentPackStats(props: ContentPackStatsProps) {
  const items = [
    { label: "卡牌包", value: `${props.enabledCardPackCount}/${props.cardPackCount}` },
    { label: "装备包", value: `${props.enabledEquipmentPackCount}/${props.equipmentPackCount}` },
    { label: "自定义卡牌", value: props.customCardCount },
    { label: "装备模板", value: `${props.weaponTemplateCount} 武器 / ${props.armorTemplateCount} 护甲` },
  ]

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded border bg-white p-3 shadow-sm">
          <div className="text-xs text-muted-foreground">{item.label}</div>
          <div className="mt-1 text-lg font-semibold">{item.value}</div>
        </div>
      ))}
    </section>
  )
}
```

- [ ] **Step 4: Implement equipment tab**

Create `components/content-pack-manager/equipment-pack-tab.tsx`:

```tsx
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { EquipmentPackListItem, EquipmentUiDiagnosticView } from "@/equipment/ui/types"

interface EquipmentPackTabProps {
  packs: EquipmentPackListItem[]
  initializationError: EquipmentUiDiagnosticView | null
  onRetryInitialize(): void
  onView(packId: string): void
  onToggleDisabled(packId: string, disabled: boolean): void
  onRemove(packId: string): void
}

export function EquipmentPackTab(props: EquipmentPackTabProps) {
  return (
    <section className="space-y-3">
      {props.initializationError && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          装备包运行时视图初始化失败，部分装备可能无法在选择窗口显示。
          <Button className="ml-2" size="sm" variant="outline" onClick={props.onRetryInitialize}>重新初始化</Button>
        </div>
      )}

      {props.packs.length === 0 ? (
        <div className="rounded border bg-white p-6 text-center text-sm text-muted-foreground">尚未安装装备包。</div>
      ) : (
        <>
          <div data-testid="equipment-pack-mobile-list" className="space-y-3 md:hidden">
            {props.packs.map((pack) => (
              <article key={pack.packId} className="rounded border bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium">{pack.name}</h3>
                    <p className="text-xs text-muted-foreground">{pack.author}{pack.contentVersion ? ` / ${pack.contentVersion}` : ""}</p>
                  </div>
                  <span className="text-xs">{pack.disabled ? "已禁用" : "已启用"}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {pack.categoryBadges.map((badge) => <Badge key={badge} variant="secondary">{badge}</Badge>)}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">{pack.weaponCount} 武器 / {pack.armorCount} 护甲</div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Button size="sm" variant="outline" onClick={() => props.onView(pack.packId)}>查看</Button>
                  <Button size="sm" variant="outline" onClick={() => props.onToggleDisabled(pack.packId, !pack.disabled)}>
                    {pack.disabled ? "启用" : "禁用"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => props.onRemove(pack.packId)}>删除</Button>
                </div>
              </article>
            ))}
          </div>

          <div data-testid="equipment-pack-desktop-table" className="hidden rounded border bg-white md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="p-3">包名</th>
                  <th className="p-3">作者 / 版本</th>
                  <th className="p-3">内容</th>
                  <th className="p-3">状态</th>
                  <th className="p-3">导入时间</th>
                  <th className="p-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {props.packs.map((pack) => (
                  <tr key={pack.packId} className="border-t">
                    <td className="p-3 font-medium">{pack.name}</td>
                    <td className="p-3">{pack.author}{pack.contentVersion ? ` / ${pack.contentVersion}` : ""}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {pack.categoryBadges.map((badge) => <Badge key={badge} variant="secondary">{badge}</Badge>)}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{pack.weaponCount} 武器 / {pack.armorCount} 护甲</div>
                    </td>
                    <td className="p-3">{pack.disabled ? "已禁用" : "已启用"}</td>
                    <td className="p-3">{new Date(pack.importedAt).toLocaleString()}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => props.onView(pack.packId)}>查看</Button>
                        <Button size="sm" variant="outline" onClick={() => props.onToggleDisabled(pack.packId, !pack.disabled)}>
                          {pack.disabled ? "启用" : "禁用"}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => props.onRemove(pack.packId)}>删除</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
```

- [ ] **Step 5: Implement card tab wrapper and advanced maintenance**

Create `components/content-pack-manager/card-pack-tab.tsx` that receives existing `batches`, `onViewCards`, `onToggleBatchDisabled`, and `onRemoveBatch`.

Rules:

- Desktop (`md` and above): render a full-width table with category badges derived from batch card types.
- Mobile: render cards, not a horizontally scrolling table.
- Mobile cards must keep package name, category badges, card count, status, and actions visible.
- Do not reintroduce a tab-local import entrance.

Create `components/content-pack-manager/advanced-maintenance.tsx`:

```tsx
import { Button } from "@/components/ui/button"

export function AdvancedMaintenance({ onResetAll }: { onResetAll(): void }) {
  return (
    <details className="rounded border bg-white p-4">
      <summary className="cursor-pointer font-medium text-red-700">高级维护</summary>
      <div className="mt-3 text-sm text-muted-foreground">
        此操作会删除角色存档、自定义卡牌包、装备包、图片缓存和系统设置。请确认已经备份重要数据。
      </div>
      <Button className="mt-3" variant="destructive" onClick={onResetAll}>强制初始化所有数据</Button>
    </details>
  )
}
```

- [ ] **Step 6: Rebuild page layout**

In `app/card-manager/page.tsx`:

- Change title to `内容包管理`.
- Keep top actions: 返回主站 / 创作指南 / 卡包编辑器.
- Remove storage capacity card.
- Place `ContentPackStats`, `GlobalImportPanel`, tabs, and `AdvancedMaintenance`.
- Use active tab state:

```ts
const [activeTab, setActiveTab] = useState<"cards" | "equipment">("cards")
```

- On mount, initialize both card system and equipment UI store:

```ts
useEffect(() => {
  const initializeData = async () => {
    setIsClient(true)
    const cardStore = useUnifiedCardStore.getState()
    if (!cardStore.initialized) await cardStore.initializeSystem()
    await getEquipmentUiStore().getState().ensureInitialized()
    refreshData()
  }
  void initializeData()
}, [])
```

- Read equipment packs:

```ts
const equipmentStore = getEquipmentUiStore()
const equipmentPacks = equipmentStore((state) => state.getPackSummaries())
const equipmentInitializationError = equipmentStore((state) => state.initializationError)
```

- Wire equipment actions:

```ts
const handleRemoveEquipmentPack = async (packId: string) => {
  if (!confirm("确定要删除这个装备包吗？")) return
  await getEquipmentUiStore().getState().removePack(packId)
  refreshData()
}

const handleToggleEquipmentPack = async (packId: string, disabled: boolean) => {
  await getEquipmentUiStore().getState().setPackDisabled(packId, disabled)
  refreshData()
}
```

- Equipment detail modal can be implemented as local state:

```ts
const [viewingEquipmentPackId, setViewingEquipmentPackId] = useState<string | null>(null)
const viewingEquipmentPack = viewingEquipmentPackId
  ? getEquipmentUiStore().getState().getPackDetail(viewingEquipmentPackId)
  : undefined
```

- The detail modal is read-only and lists weapons and armor.

- [ ] **Step 7: Run tab and page tests**

Run:

```bash
npm run test:run -- components/content-pack-manager/__tests__/equipment-pack-tab.test.tsx components/content-pack-manager/__tests__/global-import-panel.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add app/card-manager/page.tsx components/content-pack-manager
git commit -m "feat: redesign content pack manager"
```

---

## Task 7: Final Integration Verification

**Files:**

- Modify only if failures expose integration bugs.

- [ ] **Step 1: Run focused equipment tests**

Run:

```bash
npm run test:run -- equipment/import/__tests__/pipeline-dry-run.test.ts equipment/packs/__tests__/application-service.test.ts equipment/runtime-cache/__tests__/runtime-cache-service.test.ts equipment/ui/__tests__/equipment-ui-store.test.ts tests/unit/equipment/template-to-slot.test.ts tests/unit/modifiers/store-actions.test.ts components/modals/__tests__/equipment-selection-modal.test.tsx tests/unit/character-sheet-equipment.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run content manager component tests**

Run:

```bash
npm run test:run -- components/content-pack-manager/__tests__/global-import-panel.test.tsx components/content-pack-manager/__tests__/import-content-pack.test.ts components/content-pack-manager/__tests__/equipment-pack-tab.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run full unit suite if focused tests pass**

Run:

```bash
npm run test:run -- tests/unit equipment/import/__tests__ equipment/packs/__tests__ equipment/runtime-cache/__tests__
```

Expected: PASS.

- [ ] **Step 4: Run build**

Run:

```bash
npm run build
```

Expected: build completes without TypeScript or Next.js errors.

- [ ] **Step 5: Manual acceptance**

Start dev server:

```bash
npm run dev
```

Open `/card-manager` and verify:

- Page title is `内容包管理`.
- Top actions are visible: 返回主站 / 创作指南 / 卡包编辑器.
- Global import panel is above tabs.
- Import panel has one prominent `选择文件` button.
- Card Pack tab still lists card packs.
- Equipment Pack tab lists installed equipment packs.
- Equipment pack detail modal shows weapons and armor.
- Disabling an equipment pack removes its templates from weapon and armor selection modals.
- Weapon and armor selection modals show `来源` column.
- Weapon and armor selection modals do not show manual custom equipment buttons.
- Selecting built-in equipment still works.
- Selecting imported equipment writes slot data and modifier contributions.

- [ ] **Step 6: Commit final verification fixes**

If Step 1-5 required fixes, stage the integration files touched by this plan:

```bash
git add app/card-manager/page.tsx components/content-pack-manager components/modals/weapon-selection-modal.tsx components/modals/armor-selection-modal.tsx components/modals/__tests__/equipment-selection-modal.test.tsx components/character-sheet.tsx automation/equipment/template-to-slot.ts lib/sheet-store.ts tests/unit/equipment/template-to-slot.test.ts tests/unit/modifiers/store-actions.test.ts tests/unit/character-sheet-equipment.test.tsx equipment/ui
git commit -m "fix: complete equipment UI integration"
```

If no fixes were required, no commit is needed.

---

## Plan Self-Review

Spec coverage:

- Content pack manager route and outer page structure: Task 6.
- Global import panel and auto-detection: Task 5.
- Multi-file import results and folded diagnostics: Task 5.
- Equipment management list/detail/disable/delete: Task 6.
- Equipment UI store and lazy initialization: Task 1.
- Initialization failure UI: Task 4 and Task 6.
- Weapon and armor selection modals: Task 4.
- Structured sheet store selection: Task 3.
- Runtime template instantiation: Task 2.
- Removal of manual custom equipment input: Task 4.
- Final verification and manual acceptance: Task 7.

Known implementation risks:

- `useEquipmentUiStore()` as written returns selected full state; if render churn is high, switch to exporting the Zustand hook directly plus `getEquipmentUiStore()` for imperative use.
- `app/card-manager/page.tsx` is currently large. If implementation becomes noisy, split page-only helpers into `components/content-pack-manager/*` rather than adding more inline branches.
- Existing tests may assume `selectArmor(string)` and `selectWeaponSlot(string)`. Keep old actions during this stage to avoid unrelated regressions.
- Existing tests that assert sheet-store parses custom equipment JSON payloads must be updated or removed, because this stage explicitly removes that parsing path. Keep old string actions only for `none`, built-in ids, and non-JSON name fallback compatibility.

Final verification command set:

```bash
npm run test:run -- equipment/import/__tests__/pipeline-dry-run.test.ts equipment/packs/__tests__/application-service.test.ts equipment/runtime-cache/__tests__/runtime-cache-service.test.ts equipment/ui/__tests__/equipment-ui-store.test.ts tests/unit/equipment/template-to-slot.test.ts tests/unit/modifiers/store-actions.test.ts components/modals/__tests__/equipment-selection-modal.test.tsx tests/unit/character-sheet-equipment.test.tsx components/content-pack-manager/__tests__/global-import-panel.test.tsx components/content-pack-manager/__tests__/import-content-pack.test.ts components/content-pack-manager/__tests__/equipment-pack-tab.test.tsx
npm run build
```
