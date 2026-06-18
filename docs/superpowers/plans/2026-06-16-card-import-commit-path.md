# Card Import Commit Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the formal card-pack commit path so JSON and legacy DHCB imports use one dry-run/stage pipeline, one application service, and one repository-backed storage transaction while preserving legacy storage shape and legacy facade behavior.

**Architecture:** Match the equipment-pack import architecture: pipeline validates and stages, application service builds the final commit plan, repository owns storage projection and backend transaction, runtime refresh happens after repository commit. Card-specific differences stay inside repository/image/runtime adapters: legacy batch storage projection, pack-scoped images, DHCB image rollback, and old facade result mapping.

**Tech Stack:** TypeScript, Vitest, JSZip, Zustand store helpers, localStorage adapter, Dexie image storage boundary, existing card import schema/dry-run modules.

---

## Source Documents

- `docs/contexts/content-pack-import/CONTEXT.md`
- `docs/superpowers/specs/2026-06-16-card-import-commit-path-scope.md`
- `docs/superpowers/specs/2026-06-16-card-import-commit-path-test-strategy.md`
- `equipment/import/import-pipeline.ts`
- `equipment/packs/application-service.ts`
- `equipment/packs/local-storage-repository.ts`
- `equipment/packs/storage-types.ts`

## File Map

Create these new files:

- `card/packs/storage-types.ts`: repository-facing card pack storage contracts, final commit plan, snapshot, integrity issue, transaction result.
- `card/packs/repository.ts`: repository port.
- `card/packs/pack-id.ts`: deterministic pack id generator, aligned with equipment pack pattern but using legacy `batch_` prefix.
- `card/packs/legacy-storage-format-adapter.ts`: converts `CardImportFinalCommitPlan` into legacy card batch storage projection.
- `card/packs/local-storage-adapter.ts`: `LocalStorageLike` and in-memory/browser adapters for repository tests and runtime.
- `card/packs/local-storage-repository.ts`: legacy card pack repository with content/index/image transaction and recovery.
- `card/packs/application-service.ts`: formal import application service.
- `card/packs/runtime-refresh-adapter.ts`: wrapper around current card store reload/rebuild helpers.
- `card/packs/image-backend.ts`: pack-scoped image backend contracts plus in-memory and Dexie-facing implementations.
- `card/packs/default-card-pack-services.ts`: composition root for legacy facades.
- `card/packs/__tests__/pack-id.test.ts`
- `card/packs/__tests__/application-service.test.ts`
- `card/packs/__tests__/legacy-storage-format-adapter.test.ts`
- `card/packs/__tests__/local-storage-repository.test.ts`
- `card/packs/__tests__/pack-scoped-image-backend.test.ts`
- `card/packs/__tests__/dexie-image-backend.test.ts`
- `card/packs/__tests__/runtime-refresh-adapter.test.ts`
- `card/__tests__/legacy-import-facade.test.ts`

Modify these existing files:

- `card/import/types.ts`: add commit mode, conflict context, draft/result stages, staged image asset `readBlob()`.
- `card/import/import-pipeline.ts`: return `CardPackCommitDraft` at `stageImportData`; preserve dry-run behavior; DHCB image assets expose lazy blob readers.
- `card/import/semantic-validation.ts`: keep orphan images blocking; no storage reads.
- `card/import/__tests__/pipeline-dry-run.test.ts`: update expected stage and draft behavior.
- `card/import/__tests__/compatibility-fixtures.test.ts`: add manifest fallback and legacy mixed-field fixture coverage.
- `card/index-unified.ts`: replace real `store.importCards()` facade implementation with application-service call and legacy result mapping.
- `card/utils/dhcb-importer.ts`: replace old two-phase real import with application-service call and legacy DHCB result mapping.
- `card/stores/image-service/actions.ts`: route runtime image lookup through pack-scoped image backend or add `packId`-aware lookup seam.
- `card/stores/image-service/database.ts`: extend image record typing to support optional `packId` and `templateId` while keeping old global records readable.
- `card/stores/store-types.ts`: add any minimal runtime refresh helper typings needed by the adapter.
- `card/stores/store-actions.ts`: expose a required helper that reloads custom card runtime state without preserving stale removed custom cards.

## Commit Sequence

Each task should finish with:

```bash
npm run test:run -- <task-specific test files>
npx tsc --noEmit --pretty false
git add <changed files>
git commit -m "<message from task>"
```

Use the approved `git add` / `git commit` commands. Do not commit unrelated working-tree changes.

---

### Task 1: Contracts And Pack ID

**Files:**
- Create: `card/packs/storage-types.ts`
- Create: `card/packs/repository.ts`
- Create: `card/packs/pack-id.ts`
- Create: `card/packs/__tests__/pack-id.test.ts`
- Modify: `card/import/types.ts`

- [ ] **Step 1: Write pack id tests**

Create `card/packs/__tests__/pack-id.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { createCardPackId } from "../pack-id"

describe("card pack id", () => {
  it("uses the legacy batch id prefix", () => {
    const id = createCardPackId({
      now: new Date("2026-06-16T10:20:30.000Z"),
      random: () => 0.123456,
      exists: () => false,
    })

    expect(id).toMatch(/^batch_\d+_[a-z0-9]+$/)
  })

  it("retries when generated ids already exist", () => {
    const ids: string[] = []
    const id = createCardPackId({
      now: new Date("2026-06-16T10:20:30.000Z"),
      random: () => (ids.length === 0 ? 0.111111 : 0.222222),
      exists: (candidate) => {
        ids.push(candidate)
        return ids.length === 1
      },
    })

    expect(ids).toHaveLength(2)
    expect(id).toBe(ids[1])
  })

  it("returns null when unique id generation is exhausted", () => {
    const id = createCardPackId({
      now: new Date("2026-06-16T10:20:30.000Z"),
      random: () => 0.111111,
      exists: () => true,
      maxAttempts: 3,
    })

    expect(id).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test:run -- card/packs/__tests__/pack-id.test.ts
```

Expected: fails because `card/packs/pack-id.ts` does not exist.

- [ ] **Step 3: Add storage contracts**

Create `card/packs/storage-types.ts` with these exported contracts:

```ts
import type {
  CardImportImageAsset,
  CardImportOriginKind,
  CardPackDryRunValidationModel,
} from "@/card/import/types"

export interface CardImportStoredSource {
  originKind: CardImportOriginKind
  label?: string
  fileName?: string
  sizeBytes?: number
}

export interface CardImportFinalCommitPlan {
  packId: string
  packData: CardPackDryRunValidationModel
  templateIds: string[]
  source?: CardImportStoredSource
  importedAt: string
  disabled: false
  assets: {
    cardImages: CardImportImageAsset[]
  }
}

export interface CardPackSnapshotEntry {
  packId: string
  importedAt: string
  disabled: boolean
  source?: CardImportStoredSource
  templateIds: string[]
  imageTemplateIds: string[]
}

export interface CardPackIntegrityReport {
  ok: boolean
  repaired: boolean
  issues: CardPackIntegrityIssue[]
  removedIndexEntries: string[]
  removedOrphanPackKeys: string[]
  removedCorruptedPackKeys: string[]
  removedOrphanImagePackIds: string[]
}

export interface CardPackStorageSnapshot {
  packs: Map<string, CardPackSnapshotEntry>
  packCount: number
  integrity: CardPackIntegrityReport
}

export type CardPackStorageIssueCode =
  | "PACK_NOT_FOUND"
  | "PACK_ID_CONFLICT"
  | "INDEX_READ_FAILED"
  | "INDEX_PARSE_FAILED"
  | "INDEX_FORMAT_INVALID"
  | "INDEX_WRITE_FAILED"
  | "PACK_DATA_READ_FAILED"
  | "PACK_DATA_PARSE_FAILED"
  | "PACK_DATA_FORMAT_INVALID"
  | "PACK_ID_GENERATION_FAILED"
  | "CONTENT_WRITE_FAILED"
  | "STORAGE_SERIALIZE_FAILED"
  | "STORAGE_QUOTA_EXCEEDED"
  | "STORAGE_WRITE_FAILED"
  | "ROLLBACK_FAILED"
  | "ORPHAN_PACK_DATA"
  | "MISSING_PACK_DATA"
  | "TEMPLATE_ID_CONFLICT"
  | "IMAGE_DB_UNAVAILABLE"
  | "IMAGE_WRITE_FAILED"
  | "IMAGE_DELETE_FAILED"
  | "IMAGE_MIGRATION_FAILED"
  | "IMAGE_MIGRATION_AMBIGUOUS"
  | "ORPHAN_PACK_IMAGE"
  | "ORPHAN_LEGACY_IMAGE"

export interface CardPackIntegrityIssue {
  code: CardPackStorageIssueCode
  packId?: string
  templateId?: string
  storageKey?: string
  message: string
  value?: unknown
}

export interface CardPackStorageTransactionError {
  code: CardPackStorageIssueCode
  message: string
  value?: unknown
}

export type CardPackStorageTransactionResult =
  | { ok: true; snapshot: CardPackStorageSnapshot; issues: CardPackIntegrityIssue[] }
  | {
      ok: false
      error: CardPackStorageTransactionError
      snapshot?: CardPackStorageSnapshot
      issues: CardPackIntegrityIssue[]
    }

export interface CardPackStoredImage {
  key: string
  packId?: string
  templateId?: string
  blob: Blob
  mimeType: string
  size: number
  createdAt: number
}

export interface CardPackStoredImageSummary {
  key: string
  packId?: string
  templateId?: string
  size: number
  mimeType: string
}

export interface CardImageOwnershipIndex {
  ownersByTemplateId: Map<string, string[]>
}

export interface CardPackImageWriteResult {
  ok: boolean
  writtenTemplateIds: string[]
  issues: CardPackIntegrityIssue[]
}

export interface CardPackImageDeleteResult {
  ok: boolean
  deletedKeys: string[]
  issues: CardPackIntegrityIssue[]
}

export interface CardPackImageMigrationResult {
  ok: boolean
  migratedTemplateIds: string[]
  issues: CardPackIntegrityIssue[]
}
```

- [ ] **Step 4: Add repository port**

Create `card/packs/repository.ts`:

```ts
import type {
  CardImportFinalCommitPlan,
  CardPackIntegrityReport,
  CardPackStorageSnapshot,
  CardPackStorageTransactionResult,
} from "./storage-types"

export interface CardPackRepository {
  loadSnapshot(): Promise<CardPackStorageSnapshot>
  ensureIntegrity(): Promise<CardPackIntegrityReport>
  commitImport(plan: CardImportFinalCommitPlan): Promise<CardPackStorageTransactionResult>
  removePack(packId: string): Promise<CardPackStorageTransactionResult>
  setPackDisabled(packId: string, disabled: boolean): Promise<CardPackStorageTransactionResult>
}
```

- [ ] **Step 5: Add pack id generator**

Create `card/packs/pack-id.ts`:

```ts
interface CreateCardPackIdInput {
  now: Date
  random: () => number
  exists: (candidate: string) => boolean
  maxAttempts?: number
}

export function createCardPackId(input: CreateCardPackIdInput): string | null {
  const maxAttempts = input.maxAttempts ?? 20
  const timestamp = input.now.getTime()

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const suffix = Math.floor(input.random() * 36 ** 6)
      .toString(36)
      .padStart(6, "0")
      .slice(0, 6)
    const candidate = `batch_${timestamp}_${suffix}`
    if (!input.exists(candidate)) return candidate
  }

  return null
}
```

- [ ] **Step 6: Extend import types**

Modify `card/import/types.ts`:

```ts
export type CardImportMode = "dryRun" | "commit"

export type CardImportPipelineStage =
  | "sourceRead"
  | "jsonParse"
  | "externalContractGuard"
  | "externalFormatAdapter"
  | "structuralValidation"
  | "dryRunValidationModel"
  | "semanticValidation"
  | "conflictCheck"
  | "stageImportData"
  | "buildCommitPlan"
  | "storageTransaction"
  | "runtimeRefresh"

export type CardImportErrorCode =
  | "SOURCE_READ_FAILED"
  | "INVALID_JSON"
  | "INVALID_DHCB"
  | "MISSING_CARDS_JSON"
  | "UNSUPPORTED_FORMAT"
  | "INVALID_FORMAT"
  | "MISSING_FIELD"
  | "UNKNOWN_FIELD"
  | "INVALID_TYPE"
  | "INVALID_VALUE"
  | "DUPLICATE_ID"
  | "UNKNOWN_REFERENCE"
  | "ORPHAN_IMAGE"
  | "TEMPLATE_ID_CONFLICT"
  | "PACK_LIMIT_EXCEEDED"

export interface CardImportImageAsset {
  templateId?: string
  cardId: string
  path: string
  sizeBytes?: number
  mimeType?: string
  readBlob?: () => Promise<Blob>
}

export interface CardPackConflictContext {
  builtinTemplateIds: Set<string>
  importedTemplateIds: Set<string>
  importedTemplateSources: Map<string, { packId?: string }>
  customPackCount?: number
  maxCustomPackCount?: number
}

export interface CardPackImportDependencies {
  conflictContext?: CardPackConflictContext
}

export interface CardPackCommitDraft {
  packData: CardPackDryRunValidationModel
  templateIds: string[]
  source: {
    originKind: CardImportOriginKind
    label?: string
    fileName?: string
    sizeBytes?: number
  }
  assets: {
    cardImages: CardImportImageAsset[]
  }
}
export function getImageAssetTemplateId(asset: CardImportImageAsset): string {
  return asset.templateId ?? asset.cardId ?? ""
}
```

Task 2 replaces current `cardId` construction sites with `templateId` and then makes `templateId` required while keeping `cardId?` as a compatibility alias. Do not loosen global `Set.has()` or other built-in types to support this transition.

- [ ] **Step 7: Run task tests**

Run:

```bash
npm run test:run -- card/packs/__tests__/pack-id.test.ts
npx tsc --noEmit --pretty false
```

Expected: pack id tests and TypeScript pass. Keep `cardId` required and `templateId?` optional during this task so existing pipeline references continue to compile without global type pollution.

- [ ] **Step 8: Commit**

```bash
git add card/import/types.ts card/packs/storage-types.ts card/packs/repository.ts card/packs/pack-id.ts card/packs/__tests__/pack-id.test.ts
git commit -m "feat: add card pack commit contracts"
```

---

### Task 2: Pipeline Staging And Lazy DHCB Image Assets

**Files:**
- Modify: `card/import/import-pipeline.ts`
- Modify: `card/import/types.ts`
- Modify: `card/import/dry-run-model.ts`
- Modify: `card/import/semantic-validation.ts`
- Modify: `card/import/__tests__/pipeline-dry-run.test.ts`
- Modify: `card/import/__tests__/compatibility-fixtures.test.ts`

- [ ] **Step 1: Update pipeline tests first**

Update `card/import/__tests__/pipeline-dry-run.test.ts` so successful dry-run expectations use `stage: "stageImportData"` and assert `draft` exists but no storage writes occur:

```ts
expect(result).toMatchObject({
  success: true,
  stage: "stageImportData",
  mode: "dryRun",
  summary: { cardCount: 1 },
})
expect(result.draft?.templateIds).toContain("warrior")
```

Add a DHCB image assertion:

```ts
expect(result.draft?.assets.cardImages[0]).toMatchObject({
  templateId: "warrior",
  path: "images/warrior.png",
  mimeType: "image/png",
})
expect(typeof result.draft?.assets.cardImages[0].readBlob).toBe("function")
```

Add a commit-mode staging assertion. The pipeline itself still must not write storage; application service owns commit:

```ts
const result = await importCardPackFromSource(createCardObjectSource(legacyPack, "shadow.json"), { mode: "commit" })

expect(result).toMatchObject({
  success: true,
  stage: "stageImportData",
  mode: "commit",
})
expect(result.draft?.templateIds).toEqual(["warrior"])
```

Add a corrupt manifest fallback test:

```ts
it("accepts legacy dhcb with unreadable manifest when cards.json is valid", async () => {
  const zip = new JSZip()
  zip.file("manifest.json", "{bad manifest")
  zip.file("cards.json", JSON.stringify(legacyPack))
  const bytes = await zip.generateAsync({ type: "arraybuffer" })

  const result = await importCardPackFromSource(createCardDhcbSource(bytes, "legacy.dhcb"), { mode: "dryRun" })

  expect(result.success).toBe(true)
  expect(result.stage).toBe("stageImportData")
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- card/import/__tests__/pipeline-dry-run.test.ts
```

Expected: fails because current stage is `semanticValidation`, result has no `draft`, and image asset uses `cardId`.

- [ ] **Step 3: Extend result type**

Modify `card/import/types.ts`:

```ts
export interface CardPackImportResult {
  success: boolean
  stage: CardImportPipelineStage
  mode: CardImportMode
  model?: CardPackDryRunValidationModel
  draft?: CardPackCommitDraft
  summary: {
    name?: string
    version?: string
    author?: string
    cardCount: number
    imageCount: number
    warningCount: number
    errorCount: number
  }
  diagnostics: CardImportDiagnostic[]
}
```

- [ ] **Step 4: Build commit draft in pipeline**

In `card/import/import-pipeline.ts`, add:

```ts
function getEffectivePayloadSizeBytes(payload: CardPackRawPayload): number | undefined {
  if (payload.kind === "jsonText") {
    const actual = new TextEncoder().encode(payload.text).byteLength
    return Math.max(payload.sizeBytes ?? actual, actual)
  }
  return payload.sizeBytes
}

function buildCommitDraft(
  model: CardPackDryRunValidationModel,
  source: CardImportSource,
  payload: CardPackRawPayload,
): CardPackCommitDraft {
  return {
    packData: model,
    templateIds: model.cards.map((card) => card.id),
    source: {
      originKind: source.origin.kind,
      label: source.origin.label,
      fileName: source.origin.fileName,
      sizeBytes: getEffectivePayloadSizeBytes(payload),
    },
    assets: {
      cardImages: model.imageAssets,
    },
  }
}
```

Update `resultFromDiagnostics()` to accept `draft` and include `imageCount`:

```ts
summary: {
  name: params.pack?.name ?? params.model?.metadata.name,
  version: params.pack?.version ?? params.model?.metadata.version,
  author: params.pack?.author ?? params.model?.metadata.author,
  cardCount: params.model?.cards.length ?? 0,
  imageCount: params.draft?.assets.cardImages.length ?? params.model?.imageAssets.length ?? 0,
  ...counts,
},
draft: params.draft,
```

- [ ] **Step 5: Make DHCB image assets lazy-readable**

In `readDhcb()`, construct assets with `templateId` and `readBlob()`:

```ts
const imageAssets = Object.entries(zip.files)
  .filter(([path, file]) => path.startsWith("images/") && !file.dir)
  .map(([path, file]) => {
    const fileName = path.slice("images/".length)
    const templateId = fileName.replace(/\.(webp|png|jpg|jpeg|gif|svg)$/i, "")

    return {
      templateId,
      path,
      mimeType: mimeTypeForPath(path),
      readBlob: () => file.async("blob"),
    }
  })
```

- [ ] **Step 6: Return `stageImportData` after semantic success**

At the end of `importCardPackFromSource()`:

```ts
if (hasErrors(semanticDiagnostics)) {
  return resultFromDiagnostics({
    stage: "semanticValidation",
    success: false,
    mode,
    diagnostics,
    pack: structural.value,
    model,
  })
}

const draft = buildCommitDraft(model, source, payload)
return resultFromDiagnostics({
  stage: "stageImportData",
  success: true,
  mode,
  diagnostics,
  pack: structural.value,
  model,
  draft,
})
```

Keep conflict-check integration for Task 6. Do not read storage in this task.

- [ ] **Step 7: Update dry-run model and semantic validation**

Replace `imageAssets.map(asset => asset.cardId)` logic with `asset.templateId`.

If a temporary compatibility accessor is needed:

```ts
const imageTemplateIds = new Set(model.imageAssets.map((asset) => asset.templateId))
```

The formal adapter must not create missing ancestry/subclass cards.

- [ ] **Step 8: Make templateId required after call sites are migrated**

After all image asset construction and semantic validation paths use `templateId`, update `CardImportImageAsset` in `card/import/types.ts`:

```ts
export interface CardImportImageAsset {
  templateId: string
  cardId?: string
  path: string
  sizeBytes?: number
  mimeType?: string
  readBlob?: () => Promise<Blob>
}
```

Keep `cardId?` as a compatibility alias for legacy callers until facade migration is complete.

- [ ] **Step 9: Run pipeline tests**

```bash
npm run test:run -- card/import
npx tsc --noEmit --pretty false
```

Expected: card import test suite passes and TypeScript passes.

- [ ] **Step 10: Commit**

```bash
git add card/import/types.ts card/import/import-pipeline.ts card/import/dry-run-model.ts card/import/semantic-validation.ts card/import/__tests__/pipeline-dry-run.test.ts card/import/__tests__/compatibility-fixtures.test.ts
git commit -m "feat: stage card import drafts"
```

---

### Task 3: Legacy Storage Format Adapter

**Files:**
- Create: `card/packs/legacy-storage-format-adapter.ts`
- Create: `card/packs/__tests__/legacy-storage-format-adapter.test.ts`

- [ ] **Step 1: Write projection tests**

Create `card/packs/__tests__/legacy-storage-format-adapter.test.ts` with tests for:

```ts
it("projects a final commit plan to legacy batch storage shape", () => {
  const projection = projectCardImportToLegacyBatchStorage(makePlan())

  expect(projection.packId).toBe("batch_1")
  expect(projection.storedData.metadata).toMatchObject({
    id: "batch_1",
    name: "Shadow Cards",
    fileName: "shadow.json",
    importTime: "2026-06-16T10:20:30.000Z",
    version: "1.0.0",
    author: "Tester",
  })
  expect(projection.storedData.cards[0]).toMatchObject({
    id: "warrior",
    batchId: "batch_1",
    source: "custom",
  })
  expect(projection.indexEntry).toMatchObject({
    id: "batch_1",
    name: "Shadow Cards",
    fileName: "shadow.json",
    cardCount: 1,
    isSystemBatch: false,
    disabled: false,
  })
  expect(projection.templateIds).toEqual(["warrior"])
  expect(projection.imageTemplateIds).toEqual([])
})

it("uses derived definitions when the source omitted customFieldDefinitions", () => {
  const projection = projectCardImportToLegacyBatchStorage(makePlanWithoutDeclaredDefinitions())

  expect(projection.storedData.customFieldDefinitions?.professions).toContain("战士")
  expect(projection.storedData.customFieldDefinitions?.domains).toEqual(expect.arrayContaining(["利刃", "骸骨"]))
})

it("marks cards with real DHCB image assets as local images", () => {
  const projection = projectCardImportToLegacyBatchStorage(makePlanWithImageAsset("warrior"))

  expect(projection.storedData.cards.find((card) => card.id === "warrior")?.hasLocalImage).toBe(true)
  expect(projection.storedData.metadata.imageCardIds).toEqual(["warrior"])
  expect(projection.storedData.metadata.imageCount).toBe(1)
  expect(projection.storedData.metadata.totalImageSize).toBeGreaterThan(0)
  expect(projection.imageTemplateIds).toEqual(["warrior"])
})

it("preserves variantTypes and complete legacy index summary", () => {
  const projection = projectCardImportToLegacyBatchStorage(makePlanWithVariantTypes())

  expect(projection.storedData.variantTypes).toEqual(expect.any(Object))
  expect(projection.indexEntry).toMatchObject({
    cardTypes: expect.arrayContaining(["class"]),
    size: expect.any(Number),
    disabled: false,
  })
  expect(projection.templateIds).toEqual(["warrior"])
})

it("does not create image metadata when JSON card only carries hasLocalImage", () => {
  const projection = projectCardImportToLegacyBatchStorage(makePlanWithLegacyHasLocalImageButNoAsset())

  expect(projection.storedData.cards.find((card) => card.id === "warrior")?.hasLocalImage).toBe(true)
  expect(projection.storedData.metadata.imageCardIds ?? []).toEqual([])
  expect(projection.imageTemplateIds).toEqual([])
})
```

Use helpers inside the test file to build a minimal `CardImportFinalCommitPlan` from `CardPackDryRunValidationModel`.

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- card/packs/__tests__/legacy-storage-format-adapter.test.ts
```

Expected: fails because adapter does not exist.

- [ ] **Step 3: Implement projection types and adapter**

Create `card/packs/legacy-storage-format-adapter.ts`:

```ts
import { CardSource, type ExtendedStandardCard } from "@/card/card-types"
import type { CustomFieldsForBatch, VariantTypesForBatch } from "@/card/stores/store-types"
import type { CardPackDryRunCard, CardPackDryRunValidationModel } from "@/card/import/types"
import type { CardImportFinalCommitPlan } from "./storage-types"

export interface LegacyCardBatchStoredData {
  metadata: {
    id: string
    name: string
    fileName: string
    importTime: string
    version?: string
    description?: string
    author?: string
    imageCardIds?: string[]
    imageCount?: number
    totalImageSize?: number
  }
  cards: ExtendedStandardCard[]
  customFieldDefinitions?: CustomFieldsForBatch
  variantTypes?: VariantTypesForBatch
}

export interface LegacyCardBatchIndexEntry {
  id: string
  name: string
  fileName: string
  importTime: string
  version?: string
  author?: string
  cardCount: number
  cardTypes: string[]
  size: number
  isSystemBatch: false
  disabled: boolean
}

export interface LegacyCardBatchStorageProjection {
  packId: string
  templateIds: string[]
  imageTemplateIds: string[]
  storedData: LegacyCardBatchStoredData
  indexEntry: LegacyCardBatchIndexEntry
}
```

Implement `projectCardImportToLegacyBatchStorage(plan)`. The first version may use focused card-group mapping instead of a broad refactor. Keep conversion inside this adapter.

Mapping rules:

- `classes -> profession`
- `ancestries -> ancestry`
- `communities -> community`
- `subclasses -> subclass`
- `domains -> domain`
- `variants -> variant`
- `batchId = plan.packId`
- `source = CardSource.CUSTOM`
- `hasLocalImage = true` when `assets.cardImages` contains the card template id; otherwise preserve payload `hasLocalImage`.
- Preserve the exact legacy `customFieldDefinitions` and `variantTypes` shape currently read by the store. Do not rename persisted legacy storage keys in this adapter.
- Do not leak import-only fields such as lazy `readBlob()` functions or pipeline diagnostics into stored JSON.

- [ ] **Step 4: Run projection tests**

```bash
npm run test:run -- card/packs/__tests__/legacy-storage-format-adapter.test.ts
npx tsc --noEmit --pretty false
```

Expected: tests pass.

- [ ] **Step 5: Commit**

```bash
git add card/packs/legacy-storage-format-adapter.ts card/packs/__tests__/legacy-storage-format-adapter.test.ts
git commit -m "feat: project card imports to legacy storage"
```

---

### Task 4: Pack-Scoped Image Backend

**Files:**
- Create: `card/packs/image-backend.ts`
- Create: `card/packs/__tests__/pack-scoped-image-backend.test.ts`
- Create: `card/packs/__tests__/dexie-image-backend.test.ts`
- Modify: `card/stores/image-service/database.ts`

- [ ] **Step 1: Write image backend tests**

Create `card/packs/__tests__/pack-scoped-image-backend.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { createInMemoryCardPackImageBackend } from "../image-backend"

function blob(text: string, type = "image/png") {
  return new Blob([text], { type })
}

describe("pack scoped image backend", () => {
  it("writes images under pack/template keys", async () => {
    const backend = createInMemoryCardPackImageBackend()

    const result = await backend.writePackImages("pack-a", [
      { templateId: "warrior", path: "images/warrior.png", readBlob: async () => blob("warrior") },
    ])

    expect(result.ok).toBe(true)
    expect(await backend.listPackImages("pack-a")).toEqual([
      expect.objectContaining({ key: "pack-a/warrior", packId: "pack-a", templateId: "warrior" }),
    ])
  })

  it("falls back to legacy global image when pack scoped image is missing", async () => {
    const backend = createInMemoryCardPackImageBackend()
    await backend.putLegacyGlobalImage("warrior", blob("legacy"))

    const image = await backend.getImage("warrior", "pack-a")

    expect(await image?.blob.text()).toBe("legacy")
  })

  it("deletes only one pack namespace", async () => {
    const backend = createInMemoryCardPackImageBackend()
    await backend.writePackImages("pack-a", [
      { templateId: "warrior", path: "images/warrior.png", readBlob: async () => blob("a") },
    ])
    await backend.writePackImages("pack-b", [
      { templateId: "warrior", path: "images/warrior.png", readBlob: async () => blob("b") },
    ])

    await backend.deletePackImages("pack-a")

    expect(await backend.getImage("warrior", "pack-a")).toBeNull()
    expect(await backend.getImage("warrior", "pack-b")).not.toBeNull()
  })

  it("reports write failure without throwing", async () => {
    const backend = createInMemoryCardPackImageBackend({
      failWritesForTemplateIds: new Set(["warrior"]),
    })

    const result = await backend.writePackImages("pack-a", [
      { templateId: "warrior", path: "images/warrior.png", readBlob: async () => blob("warrior") },
    ])

    expect(result).toMatchObject({
      ok: false,
      issues: [expect.objectContaining({ code: "IMAGE_WRITE_FAILED" })],
    })
    expect(await backend.listPackImages("pack-a")).toEqual([])
  })

  it("keeps ambiguous legacy global images and reports a migration issue", async () => {
    const backend = createInMemoryCardPackImageBackend()
    await backend.putLegacyGlobalImage("warrior", blob("legacy"))

    const result = await backend.migrateLegacyGlobalImages({
      ownersByTemplateId: new Map([["warrior", ["pack-a", "pack-b"]]]),
    })

    expect(result.ok).toBe(false)
    expect(result.issues).toContainEqual(expect.objectContaining({ code: "IMAGE_MIGRATION_AMBIGUOUS" }))
    expect(await backend.getImage("warrior")).not.toBeNull()
  })
})
```

Create `card/packs/__tests__/dexie-image-backend.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { createDexieCardPackImageBackend } from "../image-backend"

function blob(text: string, type = "image/png") {
  return new Blob([text], { type })
}

function createFakeImageTable() {
  const records = new Map<string, unknown>()
  const calls: string[] = []
  return {
    calls,
    async get(key: string) {
      calls.push(`get:${key}`)
      return records.get(key)
    },
    async put(record: { key: string }) {
      calls.push(`put:${record.key}`)
      records.set(record.key, record)
    },
    async delete(key: string) {
      calls.push(`delete:${key}`)
      records.delete(key)
    },
    async toArray() {
      calls.push("toArray")
      return [...records.values()]
    },
  }
}

describe("dexie card pack image backend", () => {
  it("writes pack scoped records with optional legacy fallback", async () => {
    const table = createFakeImageTable()
    const backend = createDexieCardPackImageBackend({ table, now: () => 1 })

    await backend.writePackImages("pack-a", [
      { templateId: "warrior", path: "images/warrior.png", readBlob: async () => blob("pack") },
    ])

    const image = await backend.getImage("warrior", "pack-a")

    expect(await image?.blob.text()).toBe("pack")
    expect(table.calls).toContain("put:pack-a/warrior")
  })

  it("falls back to legacy global image records", async () => {
    const table = createFakeImageTable()
    const backend = createDexieCardPackImageBackend({ table, now: () => 1 })
    await table.put({ key: "warrior", blob: blob("legacy"), mimeType: "image/png", size: 6, createdAt: 1 })

    const image = await backend.getImage("warrior", "pack-a")

    expect(await image?.blob.text()).toBe("legacy")
    expect(table.calls).toContain("get:pack-a/warrior")
    expect(table.calls).toContain("get:warrior")
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- card/packs/__tests__/pack-scoped-image-backend.test.ts
```

Expected: fails because image backend does not exist.

- [ ] **Step 3: Implement in-memory image backend**

Create `card/packs/image-backend.ts` with:

```ts
import type {
  CardImageOwnershipIndex,
  CardPackImageDeleteResult,
  CardPackImageMigrationResult,
  CardPackImageWriteResult,
  CardPackIntegrityIssue,
  CardPackStoredImage,
  CardPackStoredImageSummary,
} from "./storage-types"
import type { CardImportImageAsset } from "@/card/import/types"

export interface CardPackImageBackend {
  writePackImages(packId: string, images: CardImportImageAsset[]): Promise<CardPackImageWriteResult>
  deletePackImages(packId: string): Promise<CardPackImageDeleteResult>
  listPackImages(packId: string): Promise<CardPackStoredImageSummary[]>
  getImage(templateId: string, packId?: string): Promise<CardPackStoredImage | null>
  migrateLegacyGlobalImages(ownership: CardImageOwnershipIndex): Promise<CardPackImageMigrationResult>
}

export interface CardImageTablePort {
  get(key: string): Promise<unknown>
  put(record: CardPackStoredImage): Promise<void>
  delete(key: string): Promise<void>
  toArray(): Promise<unknown[]>
}
```

Implement `createInMemoryCardPackImageBackend()` with a `Map<string, CardPackStoredImage>`.

Key rules:

- pack-scoped key: `${packId}/${templateId}`;
- legacy global key: `templateId`;
- `getImage(templateId, packId)` checks pack key first, then legacy global key;
- `deletePackImages(packId)` deletes keys prefixed with `${packId}/`;
- `migrateLegacyGlobalImages()` copies global images with exactly one owner to pack-scoped key, verifies, then removes global; ambiguous owner returns `IMAGE_MIGRATION_AMBIGUOUS` and keeps global image.

Expose test-only helper on the in-memory implementation:

```ts
putLegacyGlobalImage(templateId: string, blob: Blob): Promise<void>
```

Also implement `createDexieCardPackImageBackend(input)` in the same file. It must use only the `CardImageTablePort` above, not Dexie directly, so tests can use the fake table. The composition root later passes the real `cardImageDB.images` table.

Dexie-facing rules:

- write pack-scoped records with key `${packId}/${templateId}`;
- read pack-scoped first and legacy global second;
- `listPackImages(packId)` filters records by `packId` or key prefix;
- `deletePackImages(packId)` deletes only records under that namespace;
- `migrateLegacyGlobalImages()` uses copy, verify, then delete. Single-owner global images move to pack scope. Ambiguous globals stay in place and return `IMAGE_MIGRATION_AMBIGUOUS`.

- [ ] **Step 4: Update database record type**

Modify `card/stores/image-service/database.ts`:

```ts
export interface ImageRecord {
  key: string
  packId?: string
  templateId?: string
  blob: Blob
  mimeType: string
  size: number
  createdAt: number
}
```

Do not change Dexie schema version in this task. Current primary key remains `key`; optional fields are compatible.

- [ ] **Step 5: Run tests**

```bash
npm run test:run -- card/packs/__tests__/pack-scoped-image-backend.test.ts card/packs/__tests__/dexie-image-backend.test.ts
npx tsc --noEmit --pretty false
```

Expected: tests pass.

- [ ] **Step 6: Commit**

```bash
git add card/packs/image-backend.ts card/packs/__tests__/pack-scoped-image-backend.test.ts card/packs/__tests__/dexie-image-backend.test.ts card/stores/image-service/database.ts
git commit -m "feat: add pack scoped card image backend"
```

---

### Task 5: Local Storage Repository Transaction

**Files:**
- Create: `card/packs/local-storage-adapter.ts`
- Create: `card/packs/local-storage-repository.ts`
- Create: `card/packs/__tests__/local-storage-repository.test.ts`

- [ ] **Step 1: Write repository transaction tests**

Create `card/packs/__tests__/local-storage-repository.test.ts` with these cases:

```ts
it("commitImport writes content, images, then index", async () => {
  const operations: string[] = []
  const storage = createInMemoryCardPackStorageAdapter({}, { operations })
  const images = createInMemoryCardPackImageBackend({ operations })
  const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })

  const result = await repository.commitImport(makeFinalPlan())

  expect(result.ok).toBe(true)
  expect(operations).toEqual(["content:batch_1", "images:batch_1", "index"])
  expect(await images.listPackImages("batch_1")).toHaveLength(1)
})

it("returns failure without artifacts when content write fails", async () => {
  const storage = createInMemoryCardPackStorageAdapter({}, { failContentWritesFor: new Set(["batch_1"]) })
  const images = createInMemoryCardPackImageBackend()
  const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })

  const result = await repository.commitImport(makeFinalPlan())

  expect(result.ok).toBe(false)
  expect(!result.ok && result.error.code).toBe("CONTENT_WRITE_FAILED")
  expect(storage.getItem(getCardPackStorageKey("batch_1"))).toBeNull()
  expect(await images.listPackImages("batch_1")).toEqual([])
})

it("rolls back content when image write fails", async () => {
  const storage = createInMemoryCardPackStorageAdapter()
  const images = createInMemoryCardPackImageBackend({ failWritesForTemplateIds: new Set(["warrior"]) })
  const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })

  const result = await repository.commitImport(makeFinalPlan())

  expect(result.ok).toBe(false)
  expect(!result.ok && result.error.code).toBe("IMAGE_WRITE_FAILED")
  expect(storage.getItem(getCardPackStorageKey("batch_1"))).toBeNull()
  expect(await images.listPackImages("batch_1")).toEqual([])
})

it("rolls back content and written images when index write fails", async () => {
  const storage = createFailingIndexWriteAdapter()
  const images = createInMemoryCardPackImageBackend()
  const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })

  const result = await repository.commitImport(makeFinalPlan())

  expect(result.ok).toBe(false)
  expect(storage.getItem(getCardPackStorageKey("batch_1"))).toBeNull()
  expect(await images.listPackImages("batch_1")).toEqual([])
})

it("reports rollback failure when failed index write leaves content or images behind", async () => {
  const storage = createFailingIndexWriteAdapter({ failContentDeletesFor: new Set(["batch_1"]) })
  const images = createInMemoryCardPackImageBackend()
  const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })

  const result = await repository.commitImport(makeFinalPlan())

  expect(result.ok).toBe(false)
  expect(!result.ok && result.error.code).toBe("ROLLBACK_FAILED")
})

it("rejects duplicate pack id before writing content", async () => {
  const storage = createInMemoryCardPackStorageAdapter()
  const images = createInMemoryCardPackImageBackend()
  const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })
  await repository.commitImport(makeFinalPlan({ packId: "batch_1", templateIds: ["warrior"] }))

  const result = await repository.commitImport(makeFinalPlan({ packId: "batch_1", templateIds: ["rogue"] }))

  expect(result.ok).toBe(false)
  expect(!result.ok && result.error.code).toBe("PACK_ID_CONFLICT")
})

it("rejects duplicate template ids before writing content", async () => {
  const storage = createInMemoryCardPackStorageAdapter()
  const images = createInMemoryCardPackImageBackend()
  const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })
  await repository.commitImport(makeFinalPlan({ packId: "batch_existing", templateIds: ["warrior"] }))

  const result = await repository.commitImport(makeFinalPlan({ packId: "batch_new", templateIds: ["warrior"] }))

  expect(result.ok).toBe(false)
  expect(!result.ok && result.error.code).toBe("TEMPLATE_ID_CONFLICT")
  expect(storage.getItem(getCardPackStorageKey("batch_new"))).toBeNull()
})

it("rejects duplicate template ids inside the incoming plan", async () => {
  const storage = createInMemoryCardPackStorageAdapter()
  const images = createInMemoryCardPackImageBackend()
  const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })

  const result = await repository.commitImport(makeFinalPlan({ templateIds: ["warrior", "warrior"] }))

  expect(result.ok).toBe(false)
  expect(!result.ok && result.error.code).toBe("TEMPLATE_ID_CONFLICT")
  expect(storage.getItem(getCardPackStorageKey("batch_1"))).toBeNull()
})

it("ensureIntegrity removes content and images for broken index entries", async () => {
  const storage = createInMemoryCardPackStorageAdapter({
    [CARD_PACK_STORAGE_KEYS.INDEX]: JSON.stringify(makeIndexWithEntry("batch_missing")),
  })
  const images = createInMemoryCardPackImageBackend()
  await images.writePackImages("batch_missing", [
    { templateId: "warrior", path: "images/warrior.png", readBlob: async () => new Blob(["x"]) },
  ])
  const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })

  const report = await repository.ensureIntegrity()

  expect(report.repaired).toBe(true)
  expect(await images.listPackImages("batch_missing")).toEqual([])
})

it("ensureIntegrity removes orphan content and orphan pack images", async () => {
  const storage = createInMemoryCardPackStorageAdapter({
    [getCardPackStorageKey("batch_orphan")]: JSON.stringify(makeLegacyBatchStorage("batch_orphan")),
  })
  const images = createInMemoryCardPackImageBackend()
  await images.writePackImages("batch_orphan", [
    { templateId: "warrior", path: "images/warrior.png", readBlob: async () => new Blob(["x"]) },
  ])
  const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })

  const report = await repository.ensureIntegrity()

  expect(report.repaired).toBe(true)
  expect(storage.getItem(getCardPackStorageKey("batch_orphan"))).toBeNull()
  expect(await images.listPackImages("batch_orphan")).toEqual([])
})

it("retries interrupted legacy image migration when old and new image records both exist", async () => {
  const storage = createInMemoryCardPackStorageAdapter({
    [CARD_PACK_STORAGE_KEYS.INDEX]: JSON.stringify(makeIndexWithEntry("batch_1", { templateIds: ["warrior"] })),
    [getCardPackStorageKey("batch_1")]: JSON.stringify(makeLegacyBatchStorage("batch_1")),
  })
  const images = createInMemoryCardPackImageBackend()
  await images.putLegacyGlobalImage("warrior", new Blob(["legacy"]))
  const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })

  const report = await repository.ensureIntegrity()

  expect(report.repaired).toBe(true)
  expect(await images.getImage("warrior", "batch_1")).not.toBeNull()
  expect(await images.getImage("warrior")).toBeNull()
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- card/packs/__tests__/local-storage-repository.test.ts
```

Expected: fails because repository does not exist.

- [ ] **Step 3: Implement storage adapter**

Create `card/packs/local-storage-adapter.ts`:

```ts
export const CARD_PACK_STORAGE_KEYS = {
  INDEX: "daggerheart_custom_cards_index",
  BATCH_PREFIX: "daggerheart_custom_cards_batch_",
} as const

export function getCardPackStorageKey(packId: string): string {
  return `${CARD_PACK_STORAGE_KEYS.BATCH_PREFIX}${packId}`
}

export interface CardPackStorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  keys(): string[]
  writeLog?: { kind: "index" | "content"; key: string }[]
}
```

Implement `createInMemoryCardPackStorageAdapter(initial?: Record<string, string>, options?: TestStorageOptions)` and `createBrowserCardPackStorageAdapter()`.

`TestStorageOptions` exists only for tests and may include `operations`, `failContentWritesFor`, and `failContentDeletesFor`.

- [ ] **Step 4: Implement repository**

Create `card/packs/local-storage-repository.ts`.

Core rules:

- `loadSnapshot()` reads index, recovers integrity, returns application-facing snapshot.
- `commitImport(plan)` checks pack id and template id conflicts from current snapshot before writing.
- It projects using `projectCardImportToLegacyBatchStorage(plan)`.
- It writes content first, writes images second, writes index third.
- It records the write set and removes artifacts on failure.
- If rollback cannot remove content or images, return `ROLLBACK_FAILED` with nested issues.
- `removePack(packId)` removes the visible index entry first, then pack-scoped images, then content. If image or content cleanup fails, return a structured failure so the application service can report incomplete removal.
- `setPackDisabled(packId, disabled)` updates only lifecycle/index.
- `loadSnapshot()` and `ensureIntegrity()` must share the same recovery path:
  - rebuild image ownership from valid indexed packs;
  - remove index entries whose content is missing or unreadable;
  - remove orphan content keys not present in index;
  - remove orphan pack-scoped image namespaces not present in index;
  - migrate single-owner legacy global images into pack namespace using copy, verify, delete;
  - keep ambiguous legacy globals and report `IMAGE_MIGRATION_AMBIGUOUS`.
- If both old global image records and new pack-scoped records exist, treat it as an interrupted previous migration and retry. Successful retry removes the old global record.

Required public exports:

```ts
export function createLocalStorageCardPackRepository(input: {
  storage: CardPackStorageAdapter
  images: CardPackImageBackend
  now?: () => Date
}): CardPackRepository
```

- [ ] **Step 5: Run repository tests**

```bash
npm run test:run -- card/packs/__tests__/local-storage-repository.test.ts
npx tsc --noEmit --pretty false
```

Expected: repository transaction tests pass.

- [ ] **Step 6: Commit**

```bash
git add card/packs/local-storage-adapter.ts card/packs/local-storage-repository.ts card/packs/__tests__/local-storage-repository.test.ts
git commit -m "feat: add card pack storage repository"
```

---

### Task 6: Application Service And Runtime Refresh Adapter

**Files:**
- Create: `card/packs/application-service.ts`
- Create: `card/packs/runtime-refresh-adapter.ts`
- Create: `card/packs/__tests__/application-service.test.ts`
- Modify: `card/import/import-pipeline.ts`

- [ ] **Step 1: Write application service tests**

Create `card/packs/__tests__/application-service.test.ts` mirroring equipment tests:

```ts
it("does not commit storage in dryRun mode", async () => {
  const repository = createFakeRepository()
  const service = createCardPackApplicationService({
    repository,
    runtimeRefresh: createFakeRuntimeRefresh(),
    builtinTemplateIds: new Set(),
    now: () => FIXED_NOW,
    random: () => 0.123456,
  })

  const result = await service.importFromSource(validCardSource(), { mode: "dryRun" })

  expect(result.success).toBe(true)
  expect(result.storageCommitted).toBeUndefined()
  expect(repository.commitCalls).toHaveLength(0)
})

it("builds a final commit plan and refreshes runtime on commit", async () => {
  const repository = createFakeRepository()
  const runtimeRefresh = createFakeRuntimeRefresh()
  const service = createCardPackApplicationService({
    repository,
    runtimeRefresh,
    builtinTemplateIds: new Set(),
    now: () => FIXED_NOW,
    random: () => 0.123456,
  })

  const result = await service.importFromSource(validCardSource(), { mode: "commit" })

  expect(result.success).toBe(true)
  expect(result.storageCommitted).toBe(true)
  expect(repository.commitCalls[0]).toMatchObject({
    importedAt: FIXED_NOW.toISOString(),
    disabled: false,
    templateIds: ["warrior"],
  })
  expect(result.summary).toMatchObject({
    packId: "batch_1",
    cardCount: 1,
    imageCount: 1,
  })
  expect(repository.commitCalls[0].assets.cardImages).toHaveLength(1)
  expect(runtimeRefresh.calls).toHaveLength(1)
})

it("removes the committed pack when runtime refresh fails", async () => {
  const repository = createFakeRepository()
  const service = createCardPackApplicationService({
    repository,
    runtimeRefresh: createFakeRuntimeRefresh({ fail: true }),
    builtinTemplateIds: new Set(),
    now: () => FIXED_NOW,
    random: () => 0.123456,
  })

  const result = await service.importFromSource(validCardSource(), { mode: "commit" })

  expect(result.success).toBe(false)
  expect(result.stage).toBe("runtimeRefresh")
  expect(repository.removeCalls).toEqual([result.summary.packId])
  expect(repository.removeCalls).toHaveLength(1)
  expect(runtimeRefresh.calls).toHaveLength(1)
  expect(result.storageCommitted).toBe(false)
})

it("reports rollback failure if runtime refresh compensation fails", async () => {
  const repository = createFakeRepository({ removeFails: true })
  const service = createCardPackApplicationService({
    repository,
    runtimeRefresh: createFakeRuntimeRefresh({ fail: true }),
    builtinTemplateIds: new Set(),
    now: () => FIXED_NOW,
    random: () => 0.123456,
  })

  const result = await service.importFromSource(validCardSource(), { mode: "commit" })

  expect(result.success).toBe(false)
  expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "ROLLBACK_FAILED" }))
  expect(result.storageCommitted).toBe(true)
})

it("rejects conflicts from recovered snapshot ids", async () => {
  const repository = createFakeRepository({
    snapshot: makeSnapshot({ templateIds: ["warrior"] }),
  })
  const service = createCardPackApplicationService({
    repository,
    runtimeRefresh: createFakeRuntimeRefresh(),
    builtinTemplateIds: new Set(),
    now: () => FIXED_NOW,
    random: () => 0.123456,
  })

  const result = await service.importFromSource(validCardSource({ templateId: "warrior" }), { mode: "commit" })

  expect(result.success).toBe(false)
  expect(result.stage).toBe("conflictCheck")
  expect(repository.commitCalls).toHaveLength(0)
})

it("rejects built-in template id conflicts before repository commit", async () => {
  const repository = createFakeRepository()
  const service = createCardPackApplicationService({
    repository,
    runtimeRefresh: createFakeRuntimeRefresh(),
    builtinTemplateIds: new Set(["warrior"]),
    now: () => FIXED_NOW,
    random: () => 0.123456,
  })

  const result = await service.importFromSource(validCardSource({ templateId: "warrior" }), { mode: "commit" })

  expect(result.success).toBe(false)
  expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "TEMPLATE_ID_CONFLICT" }))
  expect(repository.commitCalls).toHaveLength(0)
})

it("returns a pack id generation failure when id generation is exhausted", async () => {
  const repository = createFakeRepository()
  const service = createCardPackApplicationService({
    repository,
    runtimeRefresh: createFakeRuntimeRefresh(),
    builtinTemplateIds: new Set(),
    createPackId: () => null,
    now: () => FIXED_NOW,
    random: () => 0.123456,
  })

  const result = await service.importFromSource(validCardSource(), { mode: "commit" })

  expect(result.success).toBe(false)
  expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "PACK_ID_GENERATION_FAILED" }))
})

it("returns repository commit failures without refreshing runtime", async () => {
  const repository = createFakeRepository({ commitFails: true })
  const runtimeRefresh = createFakeRuntimeRefresh()
  const service = createCardPackApplicationService({
    repository,
    runtimeRefresh,
    builtinTemplateIds: new Set(),
    now: () => FIXED_NOW,
    random: () => 0.123456,
  })

  const result = await service.importFromSource(validCardSource(), { mode: "commit" })

  expect(result.success).toBe(false)
  expect(result.stage).toBe("storageTransaction")
  expect(runtimeRefresh.calls).toHaveLength(0)
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- card/packs/__tests__/application-service.test.ts
```

Expected: fails because service does not exist.

- [ ] **Step 3: Implement runtime refresh port**

Create `card/packs/runtime-refresh-adapter.ts`:

```ts
import type { CardPackStorageSnapshot } from "./storage-types"

export interface CardRuntimeRefreshResult {
  ok: boolean
  diagnostic?: {
    code: "RUNTIME_REFRESH_FAILED"
    message: string
    value?: unknown
  }
}

export interface CardRuntimeRefreshAdapter {
  refresh(snapshot: CardPackStorageSnapshot): Promise<CardRuntimeRefreshResult>
}
```

Add `createNoopCardRuntimeRefreshAdapter()` for tests.

- [ ] **Step 4: Implement application service**

Create `card/packs/application-service.ts`.

Define an explicit result contract so facades and tests do not infer shape from the pipeline result:

```ts
import type { CardImportDiagnostic, CardImportPipelineStage } from "@/card/import/types"

export type CardPackApplicationDiagnostic = CardImportDiagnostic

export interface CardPackApplicationImportResult {
  success: boolean
  mode: "dryRun" | "commit"
  stage: CardImportPipelineStage
  diagnostics: CardPackApplicationDiagnostic[]
  snapshot?: CardPackStorageSnapshot
  summary: {
    packId?: string
    name?: string
    version?: string
    author?: string
    cardCount: number
    imageCount: number
    warningCount: number
    errorCount: number
  }
  storageCommitted?: boolean
}
```

Follow equipment service shape:

- `initialize()` calls `repository.ensureIntegrity()` and returns recovered snapshot diagnostics.
- `loadSnapshot()`
- `buildConflictContext(snapshot)`
- `importFromSource(source, options)`
- `removePack(packId)`
- `setPackDisabled(packId, disabled)`

Differences from equipment:

- Card import intentionally differs from equipment on runtime refresh failure because card content and images must be strongly consistent with visible runtime state. If runtime refresh fails after commit, call `repository.removePack(packId)`.
- If cleanup succeeds, return failure with `storageCommitted: false` and do not attempt a second runtime refresh in the same call.
- If cleanup fails, return `ROLLBACK_FAILED` diagnostic with `storageCommitted: true`.
- Use `createCardPackId()` with legacy `batch_` prefix.
- Accept optional `createPackId` dependency for tests. Production defaults to `createCardPackId()`.

- [ ] **Step 5: Add pipeline conflict context**

Modify `card/import/import-pipeline.ts` to accept optional dependencies:

```ts
export async function importCardPackFromSource(
  source: CardImportSource,
  options: CardPackImportOptions = {},
  dependencies: CardPackImportDependencies = {},
): Promise<CardPackImportResult>
```

After semantic success, if `dependencies.conflictContext` exists, run conflict checks:

- imported template id vs built-in ids;
- imported template id vs installed ids;
- custom pack count vs max custom pack count if present.

Return `stage: "conflictCheck"` on blocking conflicts.

- [ ] **Step 6: Run service tests**

```bash
npm run test:run -- card/packs/__tests__/application-service.test.ts card/import/__tests__/pipeline-dry-run.test.ts
npx tsc --noEmit --pretty false
```

Expected: tests pass.

- [ ] **Step 7: Commit**

```bash
git add card/packs/application-service.ts card/packs/runtime-refresh-adapter.ts card/packs/__tests__/application-service.test.ts card/import/import-pipeline.ts
git commit -m "feat: add card import application service"
```

---

### Task 7: Runtime Store Adapter And Pack-Scoped Image Lookup

**Files:**
- Modify: `card/packs/runtime-refresh-adapter.ts`
- Modify: `card/stores/store-types.ts`
- Modify: `card/stores/store-actions.ts`
- Modify: `card/stores/image-service/actions.ts`
- Modify: `lib/utils.ts`
- Create/Modify: `card/packs/__tests__/runtime-refresh-adapter.test.ts`

- [ ] **Step 1: Write runtime adapter tests**

In `card/packs/__tests__/runtime-refresh-adapter.test.ts`, assert:

```ts
it("calls store reload and rebuild helpers in order", async () => {
  const calls: string[] = []
  const adapter = createZustandCardRuntimeRefreshAdapter({
    reloadCustomRuntimeFromStorage: async () => calls.push("reloadFullRuntime"),
  })

  const result = await adapter.refresh(makeSnapshot())

  expect(result.ok).toBe(true)
  expect(calls).toEqual(["reloadFullRuntime"])
})
```

Add one test for failure:

```ts
it("returns a structured failure when reload fails", async () => {
  const adapter = createZustandCardRuntimeRefreshAdapter({
    reloadCustomRuntimeFromStorage: async () => {
      throw new Error("reload failed")
    },
  })

  const result = await adapter.refresh(makeSnapshot())

  expect(result).toMatchObject({
    ok: false,
    diagnostic: { code: "RUNTIME_REFRESH_FAILED" },
  })
})

it("clears stale custom runtime state before reloading from storage", async () => {
  const store = createStoreWithStaleCustomCard("removed-card")

  await store.reloadCustomRuntimeFromStorage()

  expect(store.cards.some((card) => card.id === "removed-card")).toBe(false)
  expect(store.aggregatedCustomFields).toEqual(expect.any(Object))
  expect(store.cardsByType).toEqual(expect.any(Map))
  expect(store.subclassCardIndex).toEqual(expect.any(Object))
  expect(store.levelCardIndex).toEqual(expect.any(Object))
  expect(store.batchKeywordIndex).toEqual(expect.any(Object))
  expect(store.batchLevelIndex).toEqual(expect.any(Object))
  expect(store.stats).toEqual(expect.any(Object))
})

it("loads pack scoped image before legacy global fallback", async () => {
  const imageActions = createImageActionsForTest()
  await imageActions.putTestImage({ key: "batch_1/warrior", packId: "batch_1", templateId: "warrior", text: "pack" })
  await imageActions.putTestImage({ key: "warrior", templateId: "warrior", text: "legacy" })

  const url = await imageActions.getImageUrl("warrior", "batch_1")

  expect(await readObjectUrlText(url)).toBe("pack")
})

it("uses separate image cache keys for same template in different packs", async () => {
  const imageActions = createImageActionsForTest()
  await imageActions.putTestImage({ key: "batch_1/warrior", packId: "batch_1", templateId: "warrior", text: "one" })
  await imageActions.putTestImage({ key: "batch_2/warrior", packId: "batch_2", templateId: "warrior", text: "two" })

  const first = await imageActions.getImageUrl("warrior", "batch_1")
  const second = await imageActions.getImageUrl("warrior", "batch_2")

  expect(first).not.toBe(second)
})

it("passes batch id through rendered card image lookup", async () => {
  const store = createImageActionsForTest()
  await store.putTestImage({ key: "batch_1/warrior", packId: "batch_1", templateId: "warrior", text: "pack" })

  const url = await getCardImageUrlAsync({
    id: "warrior",
    name: "Warrior",
    type: "profession",
    batchId: "batch_1",
    hasLocalImage: true,
  } as ExtendedStandardCard)

  expect(await readObjectUrlText(url)).toBe("pack")
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- card/packs/__tests__/runtime-refresh-adapter.test.ts
```

Expected: fails because concrete adapter does not exist.

- [ ] **Step 3: Implement concrete runtime refresh adapter**

In `card/packs/runtime-refresh-adapter.ts`, add:

```ts
export interface CardRuntimeRefreshStorePort {
  reloadCustomRuntimeFromStorage(): Promise<void>
}

export function createZustandCardRuntimeRefreshAdapter(
  store: CardRuntimeRefreshStorePort,
): CardRuntimeRefreshAdapter {
  return {
    async refresh() {
      try {
        await store.reloadCustomRuntimeFromStorage()
        return { ok: true }
      } catch (error) {
        return {
          ok: false,
          diagnostic: {
            code: "RUNTIME_REFRESH_FAILED",
            message: error instanceof Error ? error.message : "Card runtime refresh failed.",
            value: error,
          },
        }
      }
    },
  }
}
```

- [ ] **Step 4: Expose safe store wrapper**

Modify `card/stores/store-types.ts` and `card/stores/store-actions.ts` to expose a required wrapper. Do not let the adapter call `_loadCustomCardsFromStorage()` directly, because that helper can preserve stale custom runtime state.

```ts
reloadCustomRuntimeFromStorage: async () => {
  get()._clearCustomRuntimeState()
  get()._loadCustomCardsFromStorage()
  get()._recomputeAggregations()
  get()._rebuildCardsByType()
  get()._rebuildSubclassIndex()
  set({ stats: get()._computeStats() })
}
```

Add `_clearCustomRuntimeState()` to `store-types.ts` and `store-actions.ts`. It must remove custom cards, custom batches, custom index entries, custom image metadata from runtime state, and reset derived custom indexes before `_loadCustomCardsFromStorage()` runs. It must preserve built-in cards and the built-in batch.

Keep the old private helper names if existing code uses them; add the new wrapper instead of broad refactoring. The wrapper is the only method used by `createZustandCardRuntimeRefreshAdapter()`.

- [ ] **Step 5: Add pack-aware image lookup seam**

Modify `card/stores/image-service/actions.ts` and any image action types so runtime lookup can accept `packId`:

```ts
getImageUrl: async (templateId: string, packId?: string): Promise<string | null> => {
  const cacheKey = packId ? `${packId}/${templateId}` : templateId
  // load pack-scoped key first, then legacy global key
}
```

Rules:

- Keep existing `getImageUrl(cardId)` call sites working by making `packId` optional.
- Cache, loading, and failed sets must key by `${packId}/${templateId}` when pack id exists. Plain `templateId` remains the legacy global key.
- Dexie lookup order is pack key first, then legacy global key.
- This is a domain boundary: card objects may still store legacy template ids, but runtime image lookup must pass pack id when the batch source is known.

Modify `lib/utils.ts` so `getCardImageUrlAsync()` calls:

```ts
const blobUrl = await store.getImageUrl(card.id, extendedCard.batchId)
```

This keeps editor images unchanged because the editor branch still has no `batchId`; only real batch image lookup becomes pack-aware.

- [ ] **Step 6: Run runtime tests**

```bash
npm run test:run -- card/packs/__tests__/runtime-refresh-adapter.test.ts
npx tsc --noEmit --pretty false
```

Expected: tests pass.

- [ ] **Step 7: Commit**

```bash
git add card/packs/runtime-refresh-adapter.ts card/packs/__tests__/runtime-refresh-adapter.test.ts card/stores/store-types.ts card/stores/store-actions.ts card/stores/image-service/actions.ts lib/utils.ts
git commit -m "feat: refresh card runtime after pack commits"
```

---

### Task 8: Legacy Facades Use Application Service

**Files:**
- Create: `card/__tests__/legacy-import-facade.test.ts`
- Modify: `card/index-unified.ts`
- Modify: `card/utils/dhcb-importer.ts`
- Modify: `card/stores/store-actions.ts`
- Add/Modify: service composition helper file if needed, e.g. `card/packs/default-card-pack-services.ts`

- [ ] **Step 1: Write facade tests**

Create `card/__tests__/legacy-import-facade.test.ts`:

```ts
import JSZip from "jszip"
import { afterEach, describe, expect, it, vi } from "vitest"
import { importCustomCards } from "@/card/index-unified"
import {
  resetDefaultCardPackApplicationServiceFactoryForTests,
  setDefaultCardPackApplicationServiceFactoryForTests,
} from "@/card/packs/default-card-pack-services"
import { useUnifiedCardStore } from "@/card/stores/unified-card-store"
import { importDhcbCardPackage } from "@/card/utils/dhcb-importer"

describe("legacy card import facades", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    resetDefaultCardPackApplicationServiceFactoryForTests()
  })

  it("returns the legacy ImportResult shape for JSON import success", async () => {
    setDefaultCardPackApplicationServiceFactoryForTests(() => createFakeService({
      result: {
        success: true,
        mode: "commit",
        stage: "runtimeRefresh",
        diagnostics: [],
        storageCommitted: true,
        summary: { packId: "batch_test", name: "Shadow Cards", cardCount: 1, imageCount: 0, warningCount: 0, errorCount: 0 },
      },
    }))

    const result = await importCustomCards(validLegacyImportData(), "shadow.json")

    expect(result).toMatchObject({
      success: true,
      imported: 1,
      errors: [],
    })
    expect(result.batchId).toBe("batch_test")
  })

  it("does not call the old store.importCards path", async () => {
    const store = useUnifiedCardStore.getState()
    const importCardsSpy = vi.spyOn(store, "importCards").mockRejectedValue(new Error("old importCards path called"))
    setDefaultCardPackApplicationServiceFactoryForTests(() => createFakeService({
      result: {
        success: true,
        mode: "commit",
        stage: "runtimeRefresh",
        diagnostics: [],
        storageCommitted: true,
        summary: { packId: "batch_test", cardCount: 1, imageCount: 0, warningCount: 0, errorCount: 0 },
      },
    }))

    await expect(importCustomCards(validLegacyImportData(), "shadow.json")).resolves.toMatchObject({ success: true })
    expect(importCardsSpy).not.toHaveBeenCalled()
  })

  it("returns legacy ImportResult errors for JSON commit failure", async () => {
    setDefaultCardPackApplicationServiceFactoryForTests(() => createFakeService({
      result: {
        success: false,
        mode: "commit",
        stage: "storageTransaction",
        diagnostics: [{ code: "TEMPLATE_ID_CONFLICT", message: "id conflict" }],
        summary: { cardCount: 0, imageCount: 0, warningCount: 0, errorCount: 1 },
      },
    }))

    const result = await importCustomCards(validLegacyImportData(), "shadow.json")

    expect(result).toEqual({
      success: false,
      imported: 0,
      errors: ["id conflict"],
      batchId: "",
    })
  })

  it("throws legacy-style errors for DHCB orphan images", async () => {
    setDefaultCardPackApplicationServiceFactoryForTests(() => createFakeService({
      result: {
        success: false,
        mode: "commit",
        stage: "semanticValidation",
        diagnostics: [{ code: "ORPHAN_IMAGE", message: "孤儿图片" }],
        summary: { cardCount: 0, imageCount: 0, warningCount: 0, errorCount: 1 },
      },
    }))

    const file = await makeDhcbFile({
      cards: validLegacyImportData(),
      images: { "missing.png": "image bytes" },
    })

    await expect(importDhcbCardPackage(file)).rejects.toThrow(/孤儿图片|ORPHAN_IMAGE|图片存在/)
  })

  it("returns DHCB image summary from application service success", async () => {
    setDefaultCardPackApplicationServiceFactoryForTests(() => createFakeService({
      result: {
        success: true,
        mode: "commit",
        stage: "runtimeRefresh",
        diagnostics: [],
        storageCommitted: true,
        summary: { packId: "batch_test", name: "Shadow Cards", cardCount: 1, imageCount: 1, warningCount: 0, errorCount: 0 },
      },
    }))

    const file = await makeDhcbFile({
      cards: validLegacyImportData({ hasLocalImage: true }),
      images: { "warrior.png": "image bytes" },
    })

    const result = await importDhcbCardPackage(file)

    expect(result).toMatchObject({
      batchId: "batch_test",
      totalCards: 1,
      imageCount: 1,
      validationErrors: [],
    })
  })
})
```

Use local test helpers and fake application-service composition. Do not make this unit test depend on real Dexie, localStorage, or the Zustand store; those are covered by repository/backend/runtime tests.

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- card/__tests__/legacy-import-facade.test.ts
```

Expected: fails because facades still use old logic.

- [ ] **Step 3: Add default service composition**

Create `card/packs/default-card-pack-services.ts`:

```ts
export async function getDefaultCardPackApplicationService() {
  return defaultFactory()
}

let defaultFactory = createBrowserCardPackApplicationService

export function setDefaultCardPackApplicationServiceFactoryForTests(
  factory: () => CardPackApplicationService | Promise<CardPackApplicationService>,
) {
  defaultFactory = factory
}

export function resetDefaultCardPackApplicationServiceFactoryForTests() {
  defaultFactory = createBrowserCardPackApplicationService
}

async function createBrowserCardPackApplicationService() {
  const builtinTemplateIds = await getBuiltinCardIds()

  return createCardPackApplicationService({
    repository: createLocalStorageCardPackRepository({
      storage: createBrowserCardPackStorageAdapter(),
      images: createDexieCardPackImageBackend({ table: cardImageDB.images }),
    }),
    runtimeRefresh: createZustandCardRuntimeRefreshAdapter(useUnifiedCardStore.getState()),
    builtinTemplateIds,
  })
}
```

Keep the helper narrow. It wires dependencies only; no business rules.

`getBuiltinCardIds()` should read the initialized card store and collect built-in standard card ids. If the store is not initialized, await the existing system initialization path before collecting ids. Do not duplicate built-in card conversion in this helper.

- [ ] **Step 4: Replace `importCustomCards()` facade**

Modify `card/index-unified.ts`:

```ts
export async function importCustomCards(importData: ImportData, batchName?: string): Promise<ImportResult> {
  const service = await getDefaultCardPackApplicationService()
  const result = await service.importFromSource(
    createCardObjectSource(importData, batchName ?? "Imported Cards"),
    { mode: "commit" },
  )

  if (!result.success) {
    return {
      success: false,
      imported: 0,
      errors: result.diagnostics.map((diagnostic) => diagnostic.message),
      batchId: "",
    }
  }

  return {
    success: true,
    imported: result.summary.cardCount,
    errors: [],
    batchId: result.summary.packId ?? "",
  }
}
```

- [ ] **Step 5: Replace `importDhcbCardPackage()` facade**

Modify `card/utils/dhcb-importer.ts`:

```ts
export async function importDhcbCardPackage(file: File): Promise<DhcbImportResult> {
  const bytes = await file.arrayBuffer()
  const service = await getDefaultCardPackApplicationService()
  const result = await service.importFromSource(
    createCardDhcbSource(bytes, file.name),
    { mode: "commit" },
  )

  if (!result.success) {
    throw new Error(result.diagnostics.map((diagnostic) => diagnostic.message).join(", "))
  }

  return {
    batchId: result.summary.packId ?? "",
    totalCards: result.summary.cardCount,
    imageCount: result.summary.imageCount,
    validationErrors: [],
  }
}
```

Remove old real import steps from this file after the facade is wired.

- [ ] **Step 6: Seal the old store import path**

Modify `card/stores/store-actions.ts` so `store.importCards()` is no longer an independent real import implementation. Do not import the facade or default application service from `store-actions.ts`; that creates a circular dependency because facades and default service already depend on the store.

After `rg` confirms no production caller remains, replace the old body with a narrow compatibility failure:

```ts
importCards: async () => ({
  success: false,
  imported: 0,
  errors: ["store.importCards is deprecated. Use importCustomCards()."],
  batchId: "",
})
```

Before choosing the second option, run:

```bash
rg "importCards\\(" card components app
```

No direct UI or runtime caller may keep using the old write path. Do not leave old validation/storage/image write logic reachable in `store.importCards()`.

- [ ] **Step 7: Run facade tests**

```bash
npm run test:run -- card/__tests__/legacy-import-facade.test.ts components/content-pack-manager/__tests__/card-pack-tab.test.tsx
npx tsc --noEmit --pretty false
```

Expected: facade tests and card pack tab smoke tests pass.

- [ ] **Step 8: Commit**

```bash
git add card/__tests__/legacy-import-facade.test.ts card/index-unified.ts card/utils/dhcb-importer.ts card/stores/store-actions.ts card/packs/default-card-pack-services.ts
git commit -m "feat: route card import facades through application service"
```

---

### Task 9: Compatibility And Full Verification

**Files:**
- Modify: `card/import/__tests__/compatibility-fixtures.test.ts`
- Modify/Create fixtures under `card/import/samples/` if needed.

- [ ] **Step 1: Add compatibility regression tests**

Add tests that cover:

```ts
it("accepts legacy payloads with variantTypes and hasLocalImage fields", async () => {
  const result = await importCardPackFromSource(createCardObjectSource(legacyWithVariantTypesAndImages), {
    mode: "dryRun",
  })

  expect(result.success).toBe(true)
  expect(result.stage).toBe("stageImportData")
})
```

Do not add giant snapshots. Assert key fields only.

- [ ] **Step 2: Run focused suites**

```bash
npm run test:run -- card/import card/packs card/__tests__/legacy-import-facade.test.ts components/content-pack-manager/__tests__/card-pack-tab.test.tsx
```

Expected: all targeted card import tests pass.

- [ ] **Step 3: Run typecheck**

```bash
npx tsc --noEmit --pretty false
```

Expected: no TypeScript errors.

- [ ] **Step 4: Run broader regression**

```bash
npm run test:run -- equipment/packs card/import card/packs components/content-pack-manager
```

Expected: equipment pack tests still pass; card import tests pass; content pack manager tests pass.

- [ ] **Step 5: Commit**

```bash
git add card/import/__tests__/compatibility-fixtures.test.ts card/import/samples
git commit -m "test: lock card import commit compatibility"
```

---

## Self-Review Checklist

- [ ] `CardPackCommitDraft` is produced by pipeline at `stageImportData`, not by repository.
- [ ] `CardImportFinalCommitPlan` is produced by application service after pack id generation.
- [ ] Application service does not directly depend on localStorage keys, legacy batch projection, or IndexedDB table names.
- [ ] Repository owns storage format adapter and backend adapters.
- [ ] Legacy JSON and legacy DHCB facades call the same application service.
- [ ] `packId` / `templateId` are used in domain and port code; `batchId` / `cardId` remain compatibility aliases only.
- [ ] DHCB images are lazy-readable assets and image failures roll back content and index.
- [ ] Runtime refresh failure removes the committed pack through repository compensation.
- [ ] Existing equipment pack tests still pass.
