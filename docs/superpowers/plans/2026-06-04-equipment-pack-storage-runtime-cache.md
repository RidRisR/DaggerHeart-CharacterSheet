# Equipment Pack Storage And Runtime Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Implement the equipment pack commit path through storage transaction and stable runtime cache view, so valid custom equipment packs can move from import pipeline output to runtime-available selectable templates.

**Architecture:** Keep import, storage, and runtime cache as separate boundaries under `equipment/`. The repository owns persisted `index + pack data`; the application service coordinates import/remove/toggle/initialize; the runtime cache service builds an in-memory read model from canonical built-ins plus recovered storage snapshots.

**Tech Stack:** TypeScript, Vitest, localStorage-compatible adapter, existing equipment import pipeline, existing equipment slot instantiation utilities.

---

## Design Sources

- `docs/superpowers/specs/2026-05-30-custom-equipment-pack-system-phased-design.md`
- `docs/superpowers/specs/2026-05-31-custom-equipment-pack-stage-1-contract-design.md`
- `docs/superpowers/specs/2026-05-31-custom-equipment-pack-stage-2-import-pipeline-diagnostics-design.md`
- `docs/superpowers/specs/2026-06-04-custom-equipment-pack-stage-3-storage-repository-design.md`
- `docs/superpowers/specs/2026-06-04-custom-equipment-pack-runtime-cache-view-design.md`
- `docs/contexts/content-pack-import/CONTEXT.md`

## File Structure

### Existing Files To Modify

- `equipment/import/types.ts`: replace old stage names and split staged import draft from final commit plan.
- `equipment/import/aliases.ts`: add zh-CN `副手 -> offHand` enum alias.
- `equipment/import/import-pipeline.ts`: return `EquipmentPackCommitDraft` at `stageImportData`; do not generate final `packId`.
- `public/schemas/equipment-pack.v1.schema.json`: add `offHand` to public `burden` enum.
- `equipment/import/__tests__/pipeline-dry-run.test.ts`: update pipeline assertions from old vocabulary and verify no final `packId` is generated.
- `equipment/import/__tests__/srd-samples.test.ts`: update sample assertions from old vocabulary.
- `equipment/import/__tests__/preprocess-normalize.test.ts`: add `burden: "副手"` alias test.
- `equipment/import/__tests__/schema.test.ts`: add `burden: "offHand"` schema test.
- `equipment/import/types.ts`: add `PACK_ID_GENERATION_FAILED`, `RUNTIME_CACHE_BUILD_FAILED`, and `RUNTIME_CACHE_DUPLICATE_TEMPLATE_ID` to the error-code union.
- `equipment/import/schema-validator.ts`: update the diagnostic message map for new error codes and remove the old registry error code.
- `data/list/primary-weapon.ts`: migrate built-in primary weapons to canonical English fields.
- `data/list/secondary-weapon.ts`: migrate built-in secondary weapons to canonical English fields.
- `data/list/all-weapons.ts`: combine canonical weapon templates without Chinese-field adapters.
- `components/modals/weapon-selection-modal.tsx`: update current built-in weapon filtering to canonical fields until the modal is later wired to runtime reader.
- `automation/equipment/template-to-slot.ts`: instantiate built-in canonical templates.
- `lib/sheet-store.ts`: update any built-in weapon lookup or migration helper call sites that read legacy Chinese fields.
- `lib/sheet-data-migration.ts`: update any built-in weapon migration logic that reads legacy Chinese fields.
- `tests/unit/equipment/template-to-slot.test.ts`: update built-in template assertions to canonical fields.
- `tests/unit/automation/target-sync-unification.test.ts`: update built-in weapon fixtures/helpers if they reference legacy Chinese fields.

### New Files To Create

- `equipment/packs/storage-types.ts`: persisted index, pack record, storage snapshot, transaction result types.
- `equipment/packs/pack-id.ts`: `pack_<timestamp>_<random6>` id generator with retry cap.
- `equipment/packs/local-storage-adapter.ts`: minimal storage adapter interface and in-memory test adapter.
- `equipment/packs/local-storage-repository.ts`: recovery-capable repository implementation.
- `equipment/packs/application-service.ts`: commit/remove/toggle/initialize orchestration.
- `equipment/packs/__tests__/pack-id.test.ts`: pack id tests.
- `equipment/packs/__tests__/local-storage-repository.test.ts`: storage/recovery/transaction tests.
- `equipment/packs/__tests__/application-service.test.ts`: application service orchestration tests.
- `equipment/runtime-cache/types.ts`: runtime template, cache view, query criteria, reader types.
- `equipment/runtime-cache/build-cache-view.ts`: pure function that builds a stable cache view.
- `equipment/runtime-cache/builtin-templates.ts`: assembles canonical built-in weapons and armor into runtime templates.
- `equipment/runtime-cache/runtime-cache-service.ts`: holds current stable cache and rebuilds atomically.
- `equipment/runtime-cache/readers.ts`: runtime and management readers.
- `equipment/runtime-cache/__tests__/build-cache-view.test.ts`: cache construction tests.
- `equipment/runtime-cache/__tests__/builtin-templates.test.ts`: built-in weapon + armor runtime template assembly tests.
- `equipment/runtime-cache/__tests__/runtime-cache-service.test.ts`: atomic rebuild/current-view behavior tests.
- `equipment/runtime-cache/__tests__/readers.test.ts`: runtime/management reader tests.

## Important Invariants

- Dry run success stops at `stage: "stageImportData"` and does not write storage.
- Commit success requires `stage: "runtimeCacheBuild"` and `success: true`.
- Storage transaction success followed by cache build failure returns `stage: "runtimeCacheBuild"`, `success: false`, and `storageCommitted: true`; storage is not rolled back.
- Repository snapshot includes disabled packs and full pack data.
- Runtime selectable reader excludes disabled packs.
- Management reader includes disabled packs.
- Built-in equipment must be canonical source data, not a long-term adapter over Chinese field names.
- Full template data is stored once in memory in `templatesById`; indexes store ids only.
- Text search checks fields one by one; it does not concatenate searchable text into a second stored string.

---

### Task 1: Align Import Pipeline With Stage Import Data Boundary

**Files:**
- Modify: `equipment/import/types.ts`
- Modify: `equipment/import/aliases.ts`
- Modify: `equipment/import/import-pipeline.ts`
- Modify: `equipment/import/__tests__/pipeline-dry-run.test.ts`
- Modify: `equipment/import/__tests__/srd-samples.test.ts`
- Modify: `equipment/import/schema-validator.ts`
- Modify: `equipment/import/__tests__/preprocess-normalize.test.ts`
- Modify: `equipment/import/__tests__/schema.test.ts`
- Modify: `public/schemas/equipment-pack.v1.schema.json`

- [x] **Step 1: Update failing tests for staged import data**

Replace dry-run success expectations:

```ts
expect(result).toMatchObject({
  success: true,
  stage: "stageImportData",
  mode: "dryRun",
  summary: {
    packId: undefined,
    name: "SRD Armor Tier 1-2",
  },
})
expect(result.draft).toMatchObject({
  packData: expect.objectContaining({
    metadata: expect.objectContaining({ name: "SRD Armor Tier 1-2" }),
  }),
  templateIds: expect.arrayContaining(["armor:leather"]),
})
```

Replace direct commit-mode pipeline expectations:

```ts
expect(result).toMatchObject({
  success: true,
  stage: "stageImportData",
  mode: "commit",
  summary: { packId: undefined },
})
expect(result.draft?.packData.metadata.name).toBe("SRD Armor Tier 1-2")
```

Remove pipeline-level fake storage/runtime expectations from these tests. Those checks move to `equipment/packs/__tests__/application-service.test.ts`.

Replace old stage assertions:

```ts
expect(result.stage).not.toBe("stageCommitData")
expect(result.stage).not.toBe("registryRebuild")
```

- [x] **Step 2: Run tests to verify they fail on old implementation**

Run:

```bash
npm run test:run -- equipment/import/__tests__/pipeline-dry-run.test.ts equipment/import/__tests__/srd-samples.test.ts equipment/import/__tests__/preprocess-normalize.test.ts equipment/import/__tests__/schema.test.ts
```

Expected: FAIL with old `stageCommitData`, old `packId` creation during dry run, or old storage/runtime fake expectations.

- [x] **Step 3: Update import types**

Change `EquipmentPackImportPipelineStage` to:

```ts
export type EquipmentPackImportPipelineStage =
  | "sourceRead"
  | "jsonParse"
  | "authoringPreprocess"
  | "structuralValidation"
  | "canonicalNormalize"
  | "semanticValidation"
  | "conflictCheck"
  | "stageImportData"
  | "buildCommitPlan"
  | "storageTransaction"
  | "runtimeCacheBuild"
```

Change `EquipmentBurden` to:

```ts
export type EquipmentBurden = "oneHanded" | "twoHanded" | "offHand"
```

Change error code names:

```ts
export type EquipmentPackImportErrorCode =
  | "SOURCE_READ_FAILED"
  | "INVALID_JSON"
  | "INVALID_FORMAT"
  | "MISSING_FIELD"
  | "UNKNOWN_FIELD"
  | "INVALID_TYPE"
  | "INVALID_ENUM"
  | "INVALID_SEMVER"
  | "DUPLICATE_ID"
  | "ID_CONFLICT"
  | "INVALID_CONTRIBUTION_TARGET"
  | "EMPTY_EQUIPMENT"
  | "INVALID_THRESHOLD_ORDER"
  | "FILE_TOO_LARGE"
  | "PACK_LIMIT_EXCEEDED"
  | "TEMPLATE_LIMIT_EXCEEDED"
  | "FIELD_TOO_LONG"
  | "PACK_ID_GENERATION_FAILED"
  | "STORAGE_QUOTA_EXCEEDED"
  | "STORAGE_SERIALIZE_FAILED"
  | "STORAGE_WRITE_FAILED"
  | "RUNTIME_CACHE_BUILD_FAILED"
  | "RUNTIME_CACHE_DUPLICATE_TEMPLATE_ID"
```

Change dependency type:

```ts
export interface EquipmentPackImportDependencies {
  conflictContext: EquipmentPackConflictContext
}
```

Add staged draft type:

```ts
export interface EquipmentPackCommitDraft {
  packData: NormalizedEquipmentPackData
  templateIds: string[]
  source: {
    originKind: EquipmentPackImportOriginKind
    label?: string
    fileName?: string
    sizeBytes?: number
  }
}
```

Update public schema:

```json
"burden": { "enum": ["oneHanded", "twoHanded", "offHand"] }
```

Update zh-CN aliases:

```ts
burden: {
  单手: "oneHanded",
  双手: "twoHanded",
  副手: "offHand",
}
```

Add tests:

```ts
expect(preprocessAuthoringInput(packWithBurden("副手")).value.equipment.weapons[0].burden).toBe("offHand")
expect(validateEquipmentPackStructure(packWithBurden("offHand")).success).toBe(true)
```

Replace old `EquipmentPackCommitPlan` in `equipment/import/types.ts` with `EquipmentPackCommitDraft`. The final persisted commit plan will be defined under `equipment/packs/storage-types.ts` because it contains repository-generated `packId`, `importedAt`, and lifecycle fields.

Add result field:

```ts
export interface EquipmentPackImportResult {
  success: boolean
  stage: EquipmentPackImportPipelineStage
  mode: EquipmentPackImportMode
  storageCommitted?: boolean
  draft?: EquipmentPackCommitDraft
  summary: {
    packId?: string
    name?: string
    version?: string
    author?: string
    weaponCount: number
    armorCount: number
    warningCount: number
    errorCount: number
  }
  diagnostics: EquipmentPackImportDiagnostic[]
}
```

- [x] **Step 4: Update pipeline implementation**

Extend `resultFromDiagnostics`:

```ts
function resultFromDiagnostics(params: {
  stage: EquipmentPackImportPipelineStage
  success: boolean
  mode: EquipmentPackImportMode
  diagnostics: EquipmentPackImportDiagnostic[]
  pack?: NormalizedEquipmentPackData
  draft?: EquipmentPackCommitDraft
}): EquipmentPackImportResult {
  const counts = countDiagnostics(params.diagnostics)

  return {
    success: params.success,
    stage: params.stage,
    mode: params.mode,
    draft: params.draft,
    summary: {
      name: params.pack?.metadata.name,
      version: params.pack?.metadata.version,
      author: params.pack?.metadata.author,
      weaponCount: params.pack?.weapons.length ?? 0,
      armorCount: params.pack?.armor.length ?? 0,
      ...counts,
    },
    diagnostics: params.diagnostics,
  }
}
```

Replace `buildCommitPlan()` with `buildCommitDraft()`:

```ts
function buildCommitDraft(
  pack: NormalizedEquipmentPackData,
  source: EquipmentPackImportSource,
  payload: EquipmentPackRawPayload,
): EquipmentPackCommitDraft {
  return {
    packData: pack,
    templateIds: [
      ...pack.weapons.map((template) => template.id),
      ...pack.armor.map((template) => template.id),
    ],
    source: {
      originKind: source.origin.kind,
      label: source.origin.label,
      fileName: source.origin.fileName,
      sizeBytes: getEffectivePayloadSizeBytes(payload),
    },
  }
}
```

Change successful return for both direct `dryRun` and direct `commit` calls to stop at Stage Import Data:

```ts
const draft = buildCommitDraft(normalized.pack, source, payload)

return resultFromDiagnostics({
  stage: "stageImportData",
  success: true,
  mode,
  pack: normalized.pack,
  draft,
  diagnostics,
})
```

Delete direct calls to `storageTransaction.commit()` and the current `registryRebuilder.rebuild()` from `equipment/import/import-pipeline.ts`. The application service in Task 5 owns storage transaction and runtime cache build stages.

- [x] **Step 5: Run focused tests**

Run:

```bash
npm run test:run -- equipment/import/__tests__/pipeline-dry-run.test.ts equipment/import/__tests__/srd-samples.test.ts equipment/import/__tests__/preprocess-normalize.test.ts equipment/import/__tests__/schema.test.ts
```

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add equipment/import public/schemas/equipment-pack.v1.schema.json
git commit -m "refactor: return equipment import staged draft"
```

---

### Task 2: Add Storage Types And Pack ID Generation

**Files:**
- Create: `equipment/packs/storage-types.ts`
- Create: `equipment/packs/pack-id.ts`
- Test: `equipment/packs/__tests__/pack-id.test.ts`

- [x] **Step 1: Write pack id tests**

```ts
import { describe, expect, it, vi } from "vitest"
import { createEquipmentPackId } from "../pack-id"

describe("createEquipmentPackId", () => {
  it("uses pack timestamp random6 format", () => {
    const id = createEquipmentPackId({
      now: new Date("2026-06-04T10:20:30.000Z"),
      random: () => 0.123456,
      exists: () => false,
    })

    expect(id).toBe("pack_1780568430000_4fzyo8")
  })

  it("retries when generated id already exists", () => {
    const random = vi.fn()
      .mockReturnValueOnce(0.123456)
      .mockReturnValueOnce(0.654321)

    const id = createEquipmentPackId({
      now: new Date("2026-06-04T10:20:30.000Z"),
      random,
      exists: (candidate) => candidate.endsWith("_4fzyo8"),
    })

    expect(id).toBe("pack_1780568430000_nk000q")
    expect(random).toHaveBeenCalledTimes(2)
  })

  it("returns null after ten collisions", () => {
    const id = createEquipmentPackId({
      now: new Date("2026-06-04T10:20:30.000Z"),
      random: () => 0.123456,
      exists: () => true,
    })

    expect(id).toBeNull()
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test:run -- equipment/packs/__tests__/pack-id.test.ts
```

Expected: FAIL because `equipment/packs/pack-id.ts` does not exist.

- [x] **Step 3: Implement storage types**

```ts
import type { EquipmentPackImportOriginKind, NormalizedEquipmentPackData } from "@/equipment/import/types"

export interface EquipmentPackStorageIndex {
  format: "daggerheart.equipment-pack-index.v1"
  packs: Record<string, EquipmentPackIndexEntry>
  updatedAt: string
}

export interface EquipmentPackIndexEntry {
  importedAt: string
  disabled: boolean
  source?: EquipmentPackStoredSource
}

export interface EquipmentPackStoredSource {
  originKind: EquipmentPackImportOriginKind
  label?: string
  fileName?: string
  sizeBytes?: number
}

export interface EquipmentPackStoredData {
  format: "daggerheart.equipment-pack-data.v1"
  pack: NormalizedEquipmentPackData
}

export interface EquipmentPackFinalCommitPlan {
  packId: string
  packData: NormalizedEquipmentPackData
  templateIds: string[]
  source?: EquipmentPackStoredSource
  importedAt: string
  disabled: false
}

export interface EquipmentPackSnapshotEntry {
  packId: string
  importedAt: string
  disabled: boolean
  source?: EquipmentPackStoredSource
  pack: NormalizedEquipmentPackData
}

export interface EquipmentPackStorageSnapshot {
  packs: Map<string, EquipmentPackSnapshotEntry>
  packCount: number
  integrity: EquipmentPackIntegrityReport
}

export interface EquipmentPackIntegrityIssue {
  code: EquipmentPackStorageIssueCode
  packId?: string
  storageKey?: string
  message: string
  value?: unknown
}

export interface EquipmentPackIntegrityReport {
  ok: boolean
  repaired: boolean
  issues: EquipmentPackIntegrityIssue[]
  removedIndexEntries: string[]
  removedOrphanPackKeys: string[]
  removedCorruptedPackKeys: string[]
}

export type EquipmentPackStorageTransactionResult =
  | { ok: true; snapshot: EquipmentPackStorageSnapshot; issues: EquipmentPackIntegrityIssue[] }
  | {
      ok: false
      error: EquipmentPackStorageTransactionError
      snapshot?: EquipmentPackStorageSnapshot
      issues: EquipmentPackIntegrityIssue[]
    }

export interface EquipmentPackStorageTransactionError {
  code: EquipmentPackStorageIssueCode
  message: string
  value?: unknown
}

export type EquipmentPackStorageIssueCode =
  | "PACK_NOT_FOUND"
  | "INDEX_READ_FAILED"
  | "INDEX_PARSE_FAILED"
  | "INDEX_FORMAT_INVALID"
  | "PACK_DATA_READ_FAILED"
  | "PACK_DATA_PARSE_FAILED"
  | "PACK_DATA_FORMAT_INVALID"
  | "PACK_ID_GENERATION_FAILED"
  | "STORAGE_SERIALIZE_FAILED"
  | "STORAGE_QUOTA_EXCEEDED"
  | "STORAGE_WRITE_FAILED"
  | "ROLLBACK_FAILED"
  | "ORPHAN_PACK_DATA"
  | "MISSING_PACK_DATA"
  | "TEMPLATE_ID_CONFLICT"
  | "ORPHAN_PACK_DATA_CLEANUP_PENDING"
```

- [x] **Step 4: Implement pack id generator**

```ts
export interface CreateEquipmentPackIdInput {
  now: Date
  random: () => number
  exists: (candidate: string) => boolean
}

function formatTimestamp(date: Date): string {
  return String(date.getTime())
}

function random6(random: () => number): string {
  return random().toString(36).substring(2, 8).padEnd(6, "0")
}

export function createEquipmentPackId(input: CreateEquipmentPackIdInput): string | null {
  const timestamp = formatTimestamp(input.now)

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = `pack_${timestamp}_${random6(input.random)}`
    if (!input.exists(candidate)) {
      return candidate
    }
  }

  return null
}
```

- [x] **Step 5: Run pack id tests**

Run:

```bash
npm run test:run -- equipment/packs/__tests__/pack-id.test.ts
```

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add equipment/packs
git commit -m "feat: add equipment pack storage types"
```

---

### Task 3: Implement Recovery-Capable Local Storage Repository

**Files:**
- Create: `equipment/packs/local-storage-adapter.ts`
- Create: `equipment/packs/local-storage-repository.ts`
- Test: `equipment/packs/__tests__/local-storage-repository.test.ts`

- [x] **Step 1: Write repository tests**

Cover these concrete cases:

```ts
it("loadSnapshot creates an empty index when storage is empty", async () => {
  const adapter = createInMemoryEquipmentPackStorageAdapter()
  const repository = createLocalStorageEquipmentPackRepository(adapter)

  const snapshot = await repository.loadSnapshot()

  expect(snapshot.packCount).toBe(0)
  expect(snapshot.packs.size).toBe(0)
  expect(JSON.parse(adapter.getItem("dh_equipment_index") ?? "")).toMatchObject({
    format: "daggerheart.equipment-pack-index.v1",
    packs: {},
  })
})

it("commitImport writes pack data before index and returns post transaction snapshot", async () => {
  const adapter = createInMemoryEquipmentPackStorageAdapter()
  const repository = createLocalStorageEquipmentPackRepository(adapter)
  const plan = makeCommitPlan({ packId: "pack_1780568430000_abc123" })

  const result = await repository.commitImport(plan)

  expect(result.ok).toBe(true)
  expect(result.ok && result.snapshot.packs.has(plan.packId)).toBe(true)
  expect(adapter.writeLog.map((entry) => entry.key)).toEqual([
    "dh_equipment_index",
    "dh_equipment_pack:pack_1780568430000_abc123",
    "dh_equipment_index",
  ])
})

it("commitImport rolls back newly written pack data when index write fails", async () => {
  const adapter = createFailingSetItemAdapter({
    failOnKey: "dh_equipment_index",
    failOnWriteNumber: 2,
  })
  const repository = createLocalStorageEquipmentPackRepository(adapter)
  const plan = makeCommitPlan({ packId: "pack_1780568430000_abc123" })

  const result = await repository.commitImport(plan)

  expect(result.ok).toBe(false)
  expect(!result.ok && result.error.code).toBe("STORAGE_WRITE_FAILED")
  expect(adapter.getItem("dh_equipment_pack:pack_1780568430000_abc123")).toBeNull()
  expect(result.issues).toEqual(
    expect.arrayContaining([expect.objectContaining({ code: "STORAGE_WRITE_FAILED" })]),
  )
})

it("removePack removes index entry first and returns snapshot without the pack", async () => {
  const adapter = createInMemoryEquipmentPackStorageAdapter()
  const repository = createLocalStorageEquipmentPackRepository(adapter)
  const plan = makeCommitPlan({ packId: "pack_1780568430000_abc123" })
  await repository.commitImport(plan)

  const result = await repository.removePack(plan.packId)

  expect(result.ok).toBe(true)
  expect(result.ok && result.snapshot.packs.has(plan.packId)).toBe(false)
  expect(adapter.removeLog.at(-1)).toBe("dh_equipment_pack:pack_1780568430000_abc123")
})

it("setPackDisabled updates index only and keeps full pack data readable", async () => {
  const adapter = createInMemoryEquipmentPackStorageAdapter()
  const repository = createLocalStorageEquipmentPackRepository(adapter)
  const plan = makeCommitPlan({ packId: "pack_1780568430000_abc123" })
  await repository.commitImport(plan)

  const result = await repository.setPackDisabled(plan.packId, true)

  expect(result.ok).toBe(true)
  const entry = result.ok ? result.snapshot.packs.get(plan.packId) : undefined
  expect(entry?.disabled).toBe(true)
  expect(entry?.pack.metadata.name).toBe(plan.packData.metadata.name)
})
```

Also include recovery tests for:

```ts
it("removes orphan pack data during loadSnapshot", async () => {
  const adapter = createInMemoryEquipmentPackStorageAdapter({
    "dh_equipment_index": JSON.stringify({
      format: "daggerheart.equipment-pack-index.v1",
      packs: {},
      updatedAt: "2026-06-04T10:20:30.000Z",
    }),
    "dh_equipment_pack:pack_orphan": JSON.stringify({ pack: makeNormalizedPack() }),
  })
  const repository = createLocalStorageEquipmentPackRepository(adapter)

  const snapshot = await repository.loadSnapshot()

  expect(snapshot.packCount).toBe(0)
  expect(adapter.getItem("dh_equipment_pack:pack_orphan")).toBeNull()
  expect(snapshot.integrity.issues).toContainEqual(
    expect.objectContaining({ code: "ORPHAN_PACK_DATA", packId: "pack_orphan" }),
  )
})

it("drops missing pack data entries from index during loadSnapshot", async () => {
  const adapter = createInMemoryEquipmentPackStorageAdapter({
    "dh_equipment_index": JSON.stringify(makeIndexWithEntry("pack_missing")),
  })
  const repository = createLocalStorageEquipmentPackRepository(adapter)

  const snapshot = await repository.loadSnapshot()

  expect(snapshot.packCount).toBe(0)
  expect(JSON.parse(adapter.getItem("dh_equipment_index") ?? "{}").packs).toEqual({})
  expect(snapshot.integrity.issues).toContainEqual(
    expect.objectContaining({ code: "MISSING_PACK_DATA", packId: "pack_missing" }),
  )
})

it("drops corrupted pack data entries from index during loadSnapshot", async () => {
  const adapter = createInMemoryEquipmentPackStorageAdapter({
    "dh_equipment_index": JSON.stringify(makeIndexWithEntry("pack_corrupt")),
    "dh_equipment_pack:pack_corrupt": "{",
  })
  const repository = createLocalStorageEquipmentPackRepository(adapter)

  const snapshot = await repository.loadSnapshot()

  expect(snapshot.packCount).toBe(0)
  expect(adapter.getItem("dh_equipment_pack:pack_corrupt")).toBeNull()
  expect(snapshot.integrity.issues).toContainEqual(
    expect.objectContaining({ code: "PACK_DATA_PARSE_FAILED", packId: "pack_corrupt" }),
  )
})

it("corrupted index resets to empty index and deletes equipment pack data", async () => {
  const adapter = createInMemoryEquipmentPackStorageAdapter({
    "dh_equipment_index": "{",
    "dh_equipment_pack:pack_any": JSON.stringify({ pack: makeNormalizedPack() }),
  })
  const repository = createLocalStorageEquipmentPackRepository(adapter)

  const snapshot = await repository.loadSnapshot()

  expect(snapshot.packCount).toBe(0)
  expect(adapter.getItem("dh_equipment_pack:pack_any")).toBeNull()
  expect(JSON.parse(adapter.getItem("dh_equipment_index") ?? "{}")).toMatchObject({
    format: "daggerheart.equipment-pack-index.v1",
    packs: {},
  })
  expect(snapshot.integrity.issues).toContainEqual(expect.objectContaining({ code: "INDEX_PARSE_FAILED" }))
})
```

- [x] **Step 2: Run repository tests to verify they fail**

Run:

```bash
npm run test:run -- equipment/packs/__tests__/local-storage-repository.test.ts
```

Expected: FAIL because repository files do not exist.

- [x] **Step 3: Implement adapter**

```ts
export interface EquipmentPackStorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  keys(): string[]
}

const LOCAL_STORAGE_KEYS = {
  INDEX: "dh_equipment_index",
  PACK_PREFIX: "dh_equipment_pack:",
} as const

function getPackStorageKey(packId: string): string {
  return `${LOCAL_STORAGE_KEYS.PACK_PREFIX}${packId}`
}

export interface InMemoryEquipmentPackStorageAdapter extends EquipmentPackStorageAdapter {
  writeLog: { key: string; value: string }[]
  removeLog: string[]
}

export function createInMemoryEquipmentPackStorageAdapter(
  initial: Record<string, string> = {},
): InMemoryEquipmentPackStorageAdapter {
  const values = new Map(Object.entries(initial))
  const writeLog: { key: string; value: string }[] = []
  const removeLog: string[] = []

  return {
    writeLog,
    removeLog,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      writeLog.push({ key, value })
      values.set(key, value)
    },
    removeItem: (key) => {
      removeLog.push(key)
      values.delete(key)
    },
    keys: () => Array.from(values.keys()),
  }
}

export function createBrowserLocalStorageAdapter(storage: Storage): EquipmentPackStorageAdapter {
  return {
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => storage.setItem(key, value),
    removeItem: (key) => storage.removeItem(key),
    keys: () => Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
      (key): key is string => key !== null,
    ),
  }
}
```

- [x] **Step 4: Implement repository**

The repository must expose:

```ts
import type {
  EquipmentPackFinalCommitPlan,
  EquipmentPackIntegrityReport,
  EquipmentPackStorageSnapshot,
  EquipmentPackStorageTransactionResult,
} from "./storage-types"

export interface EquipmentPackRepository {
  loadSnapshot(): Promise<EquipmentPackStorageSnapshot>
  ensureIntegrity(): Promise<EquipmentPackIntegrityReport>
  commitImport(plan: EquipmentPackFinalCommitPlan): Promise<EquipmentPackStorageTransactionResult>
  removePack(packId: string): Promise<EquipmentPackStorageTransactionResult>
  setPackDisabled(packId: string, disabled: boolean): Promise<EquipmentPackStorageTransactionResult>
}
```

Implementation rules:

- `loadSnapshot()` always performs recovery before returning.
- Missing index writes an empty index.
- Corrupted index writes an empty index and removes all `dh_equipment_pack:` keys.
- Index entry with missing or corrupted pack data is removed from index.
- Orphan pack data is removed.
- `commitImport()` writes pack data before index and rolls back pack data if index write fails.
- `removePack()` removes index entry before deleting pack data.
- `setPackDisabled()` writes only index.

- [x] **Step 5: Run repository tests**

Run:

```bash
npm run test:run -- equipment/packs/__tests__/local-storage-repository.test.ts
```

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add equipment/packs
git commit -m "feat: add equipment pack repository"
```

---

### Task 4: Build Stable Runtime Cache View

**Files:**
- Create: `equipment/runtime-cache/types.ts`
- Create: `equipment/runtime-cache/build-cache-view.ts`
- Create: `equipment/runtime-cache/builtin-templates.ts`
- Create: `equipment/runtime-cache/runtime-cache-service.ts`
- Create: `equipment/runtime-cache/readers.ts`
- Test: `equipment/runtime-cache/__tests__/build-cache-view.test.ts`
- Test: `equipment/runtime-cache/__tests__/builtin-templates.test.ts`
- Test: `equipment/runtime-cache/__tests__/runtime-cache-service.test.ts`
- Test: `equipment/runtime-cache/__tests__/readers.test.ts`

- [x] **Step 1: Write cache build tests**

Use canonical built-in and custom fixtures. Required assertions:

```ts
it("builds selectable built-in templates from empty custom snapshot", () => {
  const view = buildEquipmentRuntimeCacheView({
    builtinTemplates: [
      makeRuntimeWeapon({ id: "weapon:shortsword" }),
      makeRuntimeArmor({ id: "armor:chainmail" }),
    ],
    storageSnapshot: makeStorageSnapshot([]),
  })

  expect(view.templatesById.has("weapon:shortsword")).toBe(true)
  expect(view.templatesById.has("armor:chainmail")).toBe(true)
  expect(view.queryIndexes.selectableTemplateIds).toEqual(["weapon:shortsword", "armor:chainmail"])
  expect(view.relationIndexes.templateToPackId.get("weapon:shortsword")).toBe("builtin")
  expect(view.relationIndexes.templateToPackId.get("armor:chainmail")).toBe("builtin")
})

it("assembles built-in weapons and armor for runtime cache input", () => {
  const templates = buildBuiltinRuntimeEquipmentTemplates({ weapons: allWeapons, armor: armorItems })

  expect(templates.some((template) => template.kind === "weapon")).toBe(true)
  expect(templates.some((template) => template.kind === "armor")).toBe(true)
  expect(templates.every((template) => Array.isArray(template.modifierContributions))).toBe(true)
  expect(templates.find((template) => template.kind === "weapon" && template.weaponType === "secondary")?.burden).toBe(
    "offHand",
  )
})

it("keeps disabled pack templates in entity cache but excludes them from selectable ids", () => {
  const view = buildEquipmentRuntimeCacheView({
    builtinTemplates: [],
    storageSnapshot: makeStorageSnapshot([
      makeSnapshotEntry({ packId: "pack_disabled", disabled: true, weaponIds: ["weapon:shadow"] }),
    ]),
  })

  expect(view.templatesById.has("weapon:shadow")).toBe(true)
  expect(view.relationIndexes.packToTemplateIds.get("pack_disabled")).toEqual(["weapon:shadow"])
  expect(view.queryIndexes.templateIdsBySource.get("pack_disabled")).toBeUndefined()
  expect(view.queryIndexes.selectableTemplateIds).toEqual([])
})

it("fails on duplicate template id", () => {
  const result = tryBuildEquipmentRuntimeCacheView({
    builtinTemplates: [makeRuntimeWeapon({ id: "weapon:dupe" })],
    storageSnapshot: makeStorageSnapshot([
      makeSnapshotEntry({ packId: "pack_custom", disabled: false, weaponIds: ["weapon:dupe"] }),
    ]),
  })

  expect(result.ok).toBe(false)
  expect(!result.ok && result.diagnostic.code).toBe("RUNTIME_CACHE_DUPLICATE_TEMPLATE_ID")
})
```

- [x] **Step 2: Write reader tests**

Required assertions:

```ts
it("runtime reader filters by searchText, tier, trait, weaponType, damageType, range, burden, kind, and source", () => {
  const readers = createReadersFromView(
    makeCacheViewWithFilterDecoys({
      target: makeRuntimeWeapon({
        id: "weapon:shadow-blade",
        name: "Shadow Blade",
        tier: "T2",
        trait: "finesse",
        weaponType: "primary",
        damageType: "physical",
        range: "melee",
        burden: "oneHanded",
        sourceId: "pack_shadow",
      }),
      oneFieldOffDecoys: [
        makeRuntimeWeapon({ id: "weapon:text-decoy", name: "Sun Blade", tier: "T2", trait: "finesse", weaponType: "primary", damageType: "physical", range: "melee", burden: "oneHanded", sourceId: "pack_shadow" }),
        makeRuntimeArmor({ id: "armor:kind-decoy", name: "Shadow Plate", tier: "T2", sourceId: "pack_shadow" }),
        makeRuntimeWeapon({ id: "weapon:tier-decoy", name: "Shadow Blade", tier: "T1", trait: "finesse", weaponType: "primary", damageType: "physical", range: "melee", burden: "oneHanded", sourceId: "pack_shadow" }),
        makeRuntimeWeapon({ id: "weapon:trait-decoy", name: "Shadow Blade", tier: "T2", trait: "strength", weaponType: "primary", damageType: "physical", range: "melee", burden: "oneHanded", sourceId: "pack_shadow" }),
        makeRuntimeWeapon({ id: "weapon:type-decoy", name: "Shadow Blade", tier: "T2", trait: "finesse", weaponType: "secondary", damageType: "physical", range: "melee", burden: "oneHanded", sourceId: "pack_shadow" }),
        makeRuntimeWeapon({ id: "weapon:damage-type-decoy", name: "Shadow Blade", tier: "T2", trait: "finesse", weaponType: "primary", damageType: "magic", range: "melee", burden: "oneHanded", sourceId: "pack_shadow" }),
        makeRuntimeWeapon({ id: "weapon:range-decoy", name: "Shadow Blade", tier: "T2", trait: "finesse", weaponType: "primary", damageType: "physical", range: "close", burden: "oneHanded", sourceId: "pack_shadow" }),
        makeRuntimeWeapon({ id: "weapon:burden-decoy", name: "Shadow Blade", tier: "T2", trait: "finesse", weaponType: "primary", damageType: "physical", range: "melee", burden: "offHand", sourceId: "pack_shadow" }),
        makeRuntimeWeapon({ id: "weapon:source-decoy", name: "Shadow Blade", tier: "T2", trait: "finesse", weaponType: "primary", damageType: "physical", range: "melee", burden: "oneHanded", sourceId: "pack_other" }),
      ],
    }),
  )

  const criteria = {
    searchText: "shadow",
    kind: "weapon",
    tier: "T2",
    trait: "finesse",
    weaponType: "primary",
    damageType: "physical",
    range: "melee",
    burden: "oneHanded",
    sourceId: "pack_shadow",
  } as const

  const result = readers.runtime.querySelectableTemplates(criteria)
  expect(result.map((template) => template.id)).toEqual(["weapon:shadow-blade"])

  for (const [field, value] of [
    ["searchText", "sun"],
    ["kind", "armor"],
    ["tier", "T1"],
    ["trait", "strength"],
    ["weaponType", "secondary"],
    ["damageType", "magic"],
    ["range", "close"],
    ["burden", "offHand"],
    ["sourceId", "pack_other"],
  ] as const) {
    const oneFieldOffCriteria = { ...criteria, [field]: value }
    const ids = readers.runtime.querySelectableTemplates(oneFieldOffCriteria).map((template) => template.id)
    expect(ids).not.toContain("weapon:shadow-blade")
  }
})

it("runtime reader preserves global selectable order after multiple filters", () => {
  const readers = createReadersFromView(makeCacheViewWithMixedTemplates())

  const result = readers.runtime.querySelectableTemplates({ kind: "weapon", damageType: "physical" })

  expect(result.map((template) => template.id)).toEqual([
    "weapon:builtin-sword",
    "weapon:shadow-blade",
    "weapon:iron-axe",
  ])
})

it("runtime reader does not return disabled pack templates", () => {
  const readers = createReadersFromView(makeCacheViewWithDisabledPack())

  expect(readers.runtime.querySelectableTemplates({ sourceId: "pack_disabled" })).toEqual([])
  expect(readers.runtime.getSelectableTemplateById("weapon:disabled")).toBeUndefined()
})

it("management reader lists custom packs including disabled packs", () => {
  const readers = createReadersFromView(makeCacheViewWithDisabledPack())

  expect(readers.management.listPacks().map((pack) => [pack.packId, pack.disabled])).toEqual([
    ["pack_enabled", false],
    ["pack_disabled", true],
  ])
})

it("management reader returns disabled pack detail with full templates", () => {
  const readers = createReadersFromView(makeCacheViewWithDisabledPack())

  const detail = readers.management.getPackDetail("pack_disabled")

  expect(detail?.pack.disabled).toBe(true)
  expect(detail?.templates.map((template) => template.id)).toEqual(["weapon:disabled"])
})

it("management reader returns an empty list when cache view is empty", () => {
  const readers = createReadersFromView(makeEmptyCacheView())

  expect(readers.management.listPacks()).toEqual([])
  expect(readers.runtime.querySelectableTemplates({})).toEqual([])
})

it("runtime cache service replaces current view only after successful rebuild", async () => {
  const service = createEquipmentRuntimeCacheService({
    initialView: makeCacheViewWithTemplateIds(["weapon:previous"]),
  })

  const result = await service.rebuild({
    builtinTemplates: [makeRuntimeWeapon({ id: "weapon:next" })],
    storageSnapshot: makeStorageSnapshot([]),
  })

  expect(result.ok).toBe(true)
  expect(service.getCurrentView().templatesById.has("weapon:next")).toBe(true)
})

it("runtime cache service keeps current view when rebuild fails", async () => {
  const service = createEquipmentRuntimeCacheService({
    initialView: makeCacheViewWithTemplateIds(["weapon:previous"]),
  })

  const result = await service.rebuild({
    builtinTemplates: [
      makeRuntimeWeapon({ id: "weapon:dupe" }),
      makeRuntimeWeapon({ id: "weapon:dupe" }),
    ],
    storageSnapshot: makeStorageSnapshot([]),
  })

  expect(result).toMatchObject({
    ok: false,
    diagnostic: expect.objectContaining({ code: "RUNTIME_CACHE_DUPLICATE_TEMPLATE_ID" }),
  })
  expect(service.getCurrentView().templatesById.has("weapon:previous")).toBe(true)
  expect(service.getCurrentView().templatesById.has("weapon:dupe")).toBe(false)
})
```

- [x] **Step 3: Run cache tests to verify they fail**

Run:

```bash
npm run test:run -- equipment/runtime-cache/__tests__/build-cache-view.test.ts equipment/runtime-cache/__tests__/builtin-templates.test.ts equipment/runtime-cache/__tests__/runtime-cache-service.test.ts equipment/runtime-cache/__tests__/readers.test.ts
```

Expected: FAIL because runtime cache files do not exist.

- [x] **Step 4: Implement runtime cache types**

```ts
import type {
  EquipmentBurden,
  EquipmentDamageType,
  EquipmentRange,
  EquipmentTier,
  EquipmentTrait,
  NormalizedEquipmentArmorTemplate,
  NormalizedEquipmentWeaponTemplate,
} from "@/equipment/import/types"
import type { EquipmentPackStoredSource } from "@/equipment/packs/storage-types"

export type RuntimeEquipmentTemplate =
  | ({ kind: "weapon" } & NormalizedEquipmentWeaponTemplate)
  | ({ kind: "armor" } & NormalizedEquipmentArmorTemplate)

export interface RuntimeTemplateSource {
  kind: "builtin" | "custom"
  sourceId: "builtin" | string
}

export interface StableRuntimeCacheView {
  templatesById: Map<string, RuntimeEquipmentTemplate>
  packsById: Map<string, RuntimePackSummary>
  relationIndexes: EquipmentRuntimeRelationIndexes
  queryIndexes: EquipmentRuntimeQueryIndexes
}

export interface EquipmentRuntimeRelationIndexes {
  templateToPackId: Map<string, "builtin" | string>
  packToTemplateIds: Map<"builtin" | string, string[]>
}

export interface EquipmentRuntimeQueryIndexes {
  selectableTemplateIds: string[]
  weaponTemplateIds: string[]
  armorTemplateIds: string[]
  templateIdsByTier: Map<EquipmentTier, string[]>
  templateIdsByTrait: Map<EquipmentTrait, string[]>
  templateIdsByWeaponType: Map<"primary" | "secondary", string[]>
  templateIdsByDamageType: Map<EquipmentDamageType, string[]>
  templateIdsByRange: Map<EquipmentRange, string[]>
  templateIdsByBurden: Map<EquipmentBurden, string[]>
  templateIdsBySource: Map<"builtin" | string, string[]>
}

export interface RuntimePackSummary {
  packId: string
  name: string
  author: string
  version?: string
  importedAt: string
  disabled: boolean
  weaponCount: number
  armorCount: number
}

export interface RuntimePackDetail {
  pack: RuntimePackSummary & {
    description?: string
    source?: EquipmentPackStoredSource
  }
  templates: RuntimeEquipmentTemplate[]
}

export interface EquipmentRuntimeQueryCriteria {
  searchText?: string
  kind?: "weapon" | "armor"
  tier?: EquipmentTier
  trait?: EquipmentTrait
  weaponType?: "primary" | "secondary"
  damageType?: EquipmentDamageType
  range?: EquipmentRange
  burden?: EquipmentBurden
  sourceId?: "builtin" | string
}
```

- [x] **Step 5: Implement build and readers**

Implementation rules:

- Built-in templates use source id `"builtin"`.
- `buildBuiltinRuntimeEquipmentTemplates({ weapons: allWeapons, armor: armorItems })` creates runtime cache input by adding `kind: "weapon"` to canonical built-in weapons and `kind: "armor"` to built-in armor.
- Built-in template assembly must not read Chinese legacy weapon fields. It only consumes canonical `allWeapons` and current canonical `armorItems`.
- Built-in weapon and armor templates must always provide `modifierContributions: []` when source data has no contributions.
- Custom pack weapons enter `templatesById` as `{ kind: "weapon", ...weapon }`; custom pack armor enter `templatesById` as `{ kind: "armor", ...armor }`.
- Custom pack order is `importedAt` ascending, then `packId` ascending.
- Same pack template order is weapons first, armor second, preserving file order.
- Disabled pack templates enter `templatesById`, `relationIndexes.templateToPackId`, and `relationIndexes.packToTemplateIds`.
- Disabled pack templates do not enter `queryIndexes.selectableTemplateIds` or any query index, including `queryIndexes.templateIdsBySource`.
- Text search checks `name`, `featureName`, and `description` fields separately with lowercase `includes`.
- Query function starts from the narrowest indexed candidate list, then verifies all criteria against full templates.

- [x] **Step 6: Run cache tests**

Run:

```bash
npm run test:run -- equipment/runtime-cache/__tests__/build-cache-view.test.ts equipment/runtime-cache/__tests__/builtin-templates.test.ts equipment/runtime-cache/__tests__/runtime-cache-service.test.ts equipment/runtime-cache/__tests__/readers.test.ts
```

Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add equipment/runtime-cache
git commit -m "feat: add equipment runtime cache view"
```

---

### Task 5: Add Application Service Orchestration

**Files:**
- Create: `equipment/packs/application-service.ts`
- Test: `equipment/packs/__tests__/application-service.test.ts`
- Modify: `equipment/import/import-pipeline.ts`
- Modify: `equipment/import/types.ts`

- [x] **Step 1: Write application service tests**

Required assertions:

```ts
it("initialize loads recovered snapshot and rebuilds runtime cache", async () => {
  const repository = makeRepositoryFake({ snapshot: makeStorageSnapshot([]) })
  const runtimeCacheService = makeRuntimeCacheServiceFake()
  const builtinTemplates = makeBuiltinTemplates()
  const service = createEquipmentPackApplicationService({
    repository,
    runtimeCacheService,
    builtinTemplates,
    now: fixedNow,
    random: fixedRandom,
  })

  const result = await service.initialize()

  expect(result).toMatchObject({ success: true, stage: "runtimeCacheBuild", storageCommitted: false })
  expect(result.snapshot).toBe(repository.snapshot)
  expect(repository.loadSnapshot).toHaveBeenCalledTimes(1)
  expect(runtimeCacheService.rebuild).toHaveBeenCalledWith(
    expect.objectContaining({
      builtinTemplates,
      storageSnapshot: repository.snapshot,
    }),
  )
})

it("commit dry run stops at stageImportData and does not write repository", async () => {
  const service = createTestEquipmentPackApplicationService()

  const result = await service.importFromSource(validSource(), { mode: "dryRun" })

  expect(result).toMatchObject({ success: true, stage: "stageImportData", mode: "dryRun" })
  expect(result.summary.packId).toBeUndefined()
  expect(service.repository.commitImport).not.toHaveBeenCalled()
  expect(service.runtimeCacheService.rebuild).not.toHaveBeenCalled()
})

it("commit import builds conflict context from repository snapshot", async () => {
  const service = createTestEquipmentPackApplicationService({
    initialSnapshot: makeStorageSnapshot([makeSnapshotEntry({ packId: "pack_existing", weaponIds: ["weapon:existing"] })]),
    builtinTemplateIds: new Set(["weapon:builtin"]),
  })

  await service.importFromSource(validSource({ weaponId: "weapon:new" }), { mode: "commit" })

  expect(service.lastConflictContext).toMatchObject({
    builtinTemplateIds: new Set(["weapon:builtin"]),
    importedTemplateIds: new Set(["weapon:existing"]),
    customPackCount: 1,
    maxCustomPackCount: 50,
  })
})

it("commit import succeeds only after storage transaction and runtime cache build", async () => {
  const service = createTestEquipmentPackApplicationService()

  const result = await service.importFromSource(validSource(), { mode: "commit" })

  expect(service.repository.commitImport).toHaveBeenCalledTimes(1)
  expect(service.runtimeCacheService.rebuild).toHaveBeenCalledTimes(1)
  expect(result).toMatchObject({
    success: true,
    stage: "runtimeCacheBuild",
    storageCommitted: true,
    summary: { packId: expect.stringMatching(/^pack_\\d+_[a-z0-9]{6}$/) },
  })
})

it("repository commit failure returns storageTransaction failure and does not rebuild cache", async () => {
  const service = createTestEquipmentPackApplicationService({
    storageTransactionResult: {
      ok: false,
      error: { code: "STORAGE_WRITE_FAILED", message: "Unable to write equipment pack." },
      issues: [],
    },
  })

  const result = await service.importFromSource(validSource(), { mode: "commit" })

  expect(result).toMatchObject({ success: false, stage: "storageTransaction", storageCommitted: false })
  expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "STORAGE_WRITE_FAILED", path: "" }))
  expect(service.runtimeCacheService.rebuild).not.toHaveBeenCalled()
})

it("storage success plus cache build failure returns runtimeCacheBuild failure with storageCommitted true", async () => {
  const service = createTestEquipmentPackApplicationService({
    initialRuntimeTemplateIds: ["weapon:previous"],
    runtimeCacheBuildResult: {
      ok: false,
      diagnostic: makeErrorDiagnostic("RUNTIME_CACHE_BUILD_FAILED", "", "Runtime cache build failed."),
    },
  })

  const result = await service.importFromSource(validSource(), { mode: "commit" })

  expect(result).toMatchObject({ success: false, stage: "runtimeCacheBuild", storageCommitted: true })
  expect(service.repository.loadSnapshotAfterFailure().packs.has(result.summary.packId!)).toBe(true)
  expect(service.runtimeReader.querySelectableTemplates({}).map((template) => template.id)).toEqual(["weapon:previous"])
})

it("pack id generation failure returns PACK_ID_GENERATION_FAILED before repository commit", async () => {
  const service = createTestEquipmentPackApplicationService({ random: () => 0.123456, allGeneratedPackIdsExist: true })

  const result = await service.importFromSource(validSource(), { mode: "commit" })

  expect(result).toMatchObject({ success: false, stage: "buildCommitPlan" })
  expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "PACK_ID_GENERATION_FAILED", path: "" }))
  expect(service.repository.commitImport).not.toHaveBeenCalled()
})

it("remove pack rebuilds cache from post transaction snapshot", async () => {
  const builtinTemplates = makeBuiltinTemplates()
  const service = createTestEquipmentPackApplicationService({ builtinTemplates })

  const result = await service.removePack("pack_1780568430000_abc123")

  expect(result).toMatchObject({ success: true, stage: "runtimeCacheBuild", storageCommitted: true })
  expect(service.runtimeCacheService.rebuild).toHaveBeenCalledWith(
    expect.objectContaining({
      builtinTemplates,
      storageSnapshot: service.repository.postTransactionSnapshot,
    }),
  )
})

it("remove pack storage failure does not rebuild cache", async () => {
  const service = createTestEquipmentPackApplicationService({
    removeResult: {
      ok: false,
      error: { code: "PACK_NOT_FOUND", message: "Equipment pack not found." },
      issues: [],
    },
  })

  const result = await service.removePack("pack_missing")

  expect(result).toMatchObject({ success: false, stage: "storageTransaction", storageCommitted: false })
  expect(service.runtimeCacheService.rebuild).not.toHaveBeenCalled()
})

it("toggle disabled rebuilds cache from post transaction snapshot", async () => {
  const builtinTemplates = makeBuiltinTemplates()
  const service = createTestEquipmentPackApplicationService({ builtinTemplates })

  const result = await service.setPackDisabled("pack_1780568430000_abc123", true)

  expect(result).toMatchObject({ success: true, stage: "runtimeCacheBuild", storageCommitted: true })
  expect(service.repository.setPackDisabled).toHaveBeenCalledWith("pack_1780568430000_abc123", true)
  expect(service.runtimeCacheService.rebuild).toHaveBeenCalledWith(
    expect.objectContaining({
      builtinTemplates,
      storageSnapshot: service.repository.postTransactionSnapshot,
    }),
  )
})

it("toggle disabled storage failure does not rebuild cache", async () => {
  const service = createTestEquipmentPackApplicationService({
    toggleResult: {
      ok: false,
      error: { code: "PACK_NOT_FOUND", message: "Equipment pack not found." },
      issues: [],
    },
  })

  const result = await service.setPackDisabled("pack_missing", true)

  expect(result).toMatchObject({ success: false, stage: "storageTransaction", storageCommitted: false })
  expect(service.runtimeCacheService.rebuild).not.toHaveBeenCalled()
})
```

- [x] **Step 2: Run application service tests to verify they fail**

Run:

```bash
npm run test:run -- equipment/packs/__tests__/application-service.test.ts
```

Expected: FAIL because application service does not exist.

- [x] **Step 3: Implement service interface**

```ts
import type {
  EquipmentPackConflictContext,
  EquipmentPackImportOptions,
  EquipmentPackImportResult,
  EquipmentPackImportSource,
} from "@/equipment/import/types"
import type { EquipmentPackStorageIssueCode, EquipmentPackStorageSnapshot } from "./storage-types"
import type { EquipmentPackRepository } from "./local-storage-repository"
import type { EquipmentRuntimeCacheService } from "@/equipment/runtime-cache/runtime-cache-service"

export interface EquipmentPackApplicationService {
  initialize(): Promise<EquipmentPackInitializeResult>
  loadSnapshot(): Promise<EquipmentPackStorageSnapshot>
  buildConflictContext(snapshot: EquipmentPackStorageSnapshot): EquipmentPackConflictContext
  importFromSource(source: EquipmentPackImportSource, options: EquipmentPackImportOptions): Promise<EquipmentPackImportResult>
  removePack(packId: string): Promise<EquipmentPackLifecycleResult>
  setPackDisabled(packId: string, disabled: boolean): Promise<EquipmentPackLifecycleResult>
}

export interface EquipmentPackLifecycleResult {
  success: boolean
  stage: "storageTransaction" | "runtimeCacheBuild"
  storageCommitted?: boolean
  diagnostics: EquipmentPackLifecycleDiagnostic[]
}

export interface EquipmentPackInitializeResult extends EquipmentPackLifecycleResult {
  stage: "runtimeCacheBuild"
  storageCommitted: false
  snapshot: EquipmentPackStorageSnapshot
}

export interface EquipmentPackLifecycleDiagnostic {
  severity: "error" | "warning"
  code: EquipmentPackStorageIssueCode | "RUNTIME_CACHE_BUILD_FAILED" | "RUNTIME_CACHE_DUPLICATE_TEMPLATE_ID"
  path: ""
  message: string
  value?: unknown
}
```

- [x] **Step 4: Implement orchestration**

Rules:

- `initialize()` calls `repository.loadSnapshot()`, then `runtimeCacheService.rebuild({ builtinTemplates, storageSnapshot })`, then returns `{ snapshot, success, stage: "runtimeCacheBuild", diagnostics }` without treating startup cache-build failure as a blocking error page.
- `importFromSource()` calls `repository.loadSnapshot()`, then application-service helper `buildConflictContext(snapshot)` composes built-in template ids, imported custom template ids, current pack count, and max pack count.
- `importFromSource()` runs `importEquipmentPackFromSource()` through validation / normalize / `stageImportData` before generating any pack id.
- `createPackId` uses `createEquipmentPackId()` only after successful `stageImportData`, with `exists` based on current snapshot pack ids.
- If `createEquipmentPackId()` returns null, return import result with `stage: "buildCommitPlan"`, `success: false`, code `PACK_ID_GENERATION_FAILED`, and do not call repository commit.
- Commit path calls `importEquipmentPackFromSource()` to obtain `draft`, then creates `EquipmentPackFinalCommitPlan` by adding `packId`, `importedAt`, and `disabled: false`.
- If pipeline returns any stage other than successful `stageImportData`, return that result directly and do not call repository commit.
- Runtime cache rebuild receives `{ builtinTemplates, storageSnapshot: postTransactionSnapshot }` from repository result, not a separately reloaded snapshot.
- Remove/toggle call repository transaction, then rebuild runtime cache from returned snapshot.
- Cache build failure never rolls back storage.

- [x] **Step 5: Run application tests**

Run:

```bash
npm run test:run -- equipment/packs/__tests__/application-service.test.ts
```

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add equipment/packs equipment/import
git commit -m "feat: add equipment pack application service"
```

---

### Task 6: Migrate Built-In Weapons To Canonical Fields

**Files:**
- Modify: `data/list/primary-weapon.ts`
- Modify: `data/list/secondary-weapon.ts`
- Modify: `data/list/all-weapons.ts`
- Modify: `automation/equipment/template-to-slot.ts`
- Modify: `components/modals/weapon-selection-modal.tsx`
- Modify: `lib/sheet-store.ts`
- Modify: `lib/sheet-data-migration.ts`
- Test: `tests/unit/equipment/template-to-slot.test.ts`
- Test: `tests/unit/automation/target-sync-unification.test.ts`
- Test: `equipment/runtime-cache/__tests__/build-cache-view.test.ts`

- [x] **Step 1: Update tests for canonical built-ins**

Add assertions that built-in weapons do not expose Chinese keys:

```ts
import { allWeapons } from "@/data/list/all-weapons"

it("built-in weapons use canonical fields", () => {
  expect(allWeapons.length).toBeGreaterThan(0)
  const legacyKeys = ["名称", "等级", "属性", "伤害类型", "范围", "伤害", "负荷", "特性名称", "描述"]
  for (const weapon of allWeapons) {
    expect(weapon).toHaveProperty("name")
    expect(weapon).toHaveProperty("tier")
    expect(weapon).toHaveProperty("trait")
    expect(weapon).toHaveProperty("damageType")
    expect(weapon).toHaveProperty("range")
    expect(weapon).toHaveProperty("burden")
    for (const key of legacyKeys) {
      expect(weapon).not.toHaveProperty(key)
    }
  }
  expect(allWeapons.some((weapon) => weapon.weaponType === "secondary" && weapon.burden === "offHand")).toBe(true)
})
```

Update slot instantiation fixture:

```ts
const template = {
  id: "weapon:test",
  name: "影刃",
  tier: "T1",
  weaponType: "primary",
  trait: "finesse",
  damageType: "physical",
  range: "melee",
  burden: "oneHanded",
  damage: "1d8",
  featureName: "暗影",
  description: "命中后获得优势。",
  modifierContributions: [],
} as const
```

- [x] **Step 2: Run tests to verify they fail**

Run:

```bash
npm run test:run -- tests/unit/equipment/template-to-slot.test.ts tests/unit/automation/target-sync-unification.test.ts equipment/runtime-cache/__tests__/build-cache-view.test.ts
```

Expected: FAIL because built-in weapon data still uses Chinese fields.

- [x] **Step 3: Migrate built-in weapon types**

Replace weapon type definitions with:

```ts
import type {
  EquipmentBurden,
  EquipmentDamageType,
  EquipmentRange,
  EquipmentTier,
  EquipmentTrait,
  NormalizedEquipmentModifierContributionTemplate,
} from "@/equipment/import/types"

export interface Weapon {
  id: string
  name: string
  tier: EquipmentTier
  trait: EquipmentTrait
  damageType: EquipmentDamageType
  range: EquipmentRange
  burden: EquipmentBurden
  damage: string
  featureName?: string
  description?: string
  modifierContributions: NormalizedEquipmentModifierContributionTemplate[]
}
```

`AllWeapon` becomes:

```ts
export type AllWeapon = Weapon & {
  weaponType: "primary" | "secondary"
}
```

Map each existing weapon field mechanically:

```text
名称 -> name
等级 -> tier
属性 -> trait
伤害类型 -> damageType
范围 -> range
伤害 -> damage
负荷 -> burden
特性名称 -> featureName
描述 -> description
```

Use canonical enum values already accepted by equipment pack import, for example:

```text
敏捷 -> agility
力量 -> strength
灵巧 -> finesse
本能 -> instinct
风度 -> presence
知识 -> knowledge
物理 -> physical
魔法 -> magic
近战 -> melee
邻近 -> veryClose
近距离 -> close
远距离 -> far
极远 -> veryFar
单手 -> oneHanded
双手 -> twoHanded
副手 -> offHand
```

Every built-in weapon object must include `modifierContributions: []` unless it has real contributions. This keeps built-in weapon data assignable to runtime normalized templates without a per-call optional-field adapter.

- [x] **Step 4: Update slot instantiation**

Change built-in slot mapping:

```ts
export function createWeaponSlotFromTemplate(template: Weapon | AllWeapon, idFactory: IdFactory): WeaponSlot {
  return {
    name: template.name,
    trait: joinText([template.damageType, template.burden, template.range], "/"),
    damage: joinText([template.trait, template.damage], ": "),
    feature: createFeatureText(template.featureName, template.description),
    modifierContributions: instantiateContributions(template.modifierContributions, idFactory),
  }
}
```

- [x] **Step 5: Update current weapon modal filtering**

Until UI is wired to `EquipmentRuntimeReader`, update direct built-in filtering to canonical fields:

```ts
const matchesSearch =
  !searchText ||
  weapon.name.toLowerCase().includes(searchText.toLowerCase()) ||
  weapon.description?.toLowerCase().includes(searchText.toLowerCase()) ||
  weapon.featureName?.toLowerCase().includes(searchText.toLowerCase())
```

Use `tier`, `trait`, `weaponType`, `damageType`, `range`, and `burden` for filters instead of Chinese fields.

Update modal filter constants so option values are canonical enum values while labels stay localized:

```ts
const traitOptions = [
  { value: "agility", label: "敏捷" },
  { value: "strength", label: "力量" },
  { value: "finesse", label: "灵巧" },
  { value: "instinct", label: "本能" },
  { value: "presence", label: "风度" },
  { value: "knowledge", label: "知识" },
]

const burdenOptions = [
  { value: "oneHanded", label: "单手" },
  { value: "twoHanded", label: "双手" },
  { value: "offHand", label: "副手" },
]
```

Table/card display should use label helpers or option lookup, not raw canonical enum values, when rendering user-facing text.

- [x] **Step 6: Update legacy built-in consumers**

Search for legacy weapon fields and update all runtime consumers to canonical fields:

```bash
rg -n '(^|[,{;[:space:]])(\"?)(名称|等级|属性|伤害类型|范围|伤害|负荷|特性名称|描述)\\2\\s*:' data/list automation/equipment components/modals lib tests/unit
rg -n '\\.(名称|等级|属性|伤害类型|范围|伤害|负荷|特性名称|描述)\\b|\\[[\"'\\''`](名称|等级|属性|伤害类型|范围|伤害|负荷|特性名称|描述)[\"'\\''`]\\]' data/list automation/equipment components/modals lib tests/unit
```

Expected after migration:

- `data/list/primary-weapon.ts` and `data/list/secondary-weapon.ts` no longer contain legacy field keys.
- `automation/equipment/template-to-slot.ts` reads `name`, `trait`, `damageType`, `range`, `burden`, `damage`, `featureName`, and `description`.
- `components/modals/weapon-selection-modal.tsx`, `lib/sheet-store.ts`, and `lib/sheet-data-migration.ts` do not read legacy built-in weapon keys.
- Tests may still contain Chinese UI strings or explicit compatibility payload tests, but not built-in weapon object keys.

- [x] **Step 7: Run focused tests**

Run:

```bash
npm run test:run -- tests/unit/equipment/template-to-slot.test.ts tests/unit/automation/target-sync-unification.test.ts equipment/runtime-cache/__tests__/build-cache-view.test.ts
```

Expected: PASS.

- [x] **Step 8: Commit**

```bash
git add data/list automation/equipment components/modals lib tests/unit/equipment tests/unit/automation equipment/runtime-cache
git commit -m "refactor: migrate built-in weapons to canonical equipment fields"
```

---

### Task 7: End-To-End Storage And Cache Verification

**Files:**
- Test: `equipment/packs/__tests__/application-service.test.ts`
- Test: `equipment/runtime-cache/__tests__/readers.test.ts`
- Test: `equipment/import/__tests__/srd-samples.test.ts`

- [x] **Step 1: Add SRD sample commit integration test**

Use existing sample `equipment/import/samples/srd-armor-tier-1-2.json`:

```ts
it("commits SRD sample and exposes it through runtime reader", async () => {
  const app = createTestEquipmentPackApplicationService()
  const sample = await import("../samples/srd-armor-tier-1-2.json")

  const result = await app.importFromSource(
    {
      origin: { kind: "object", label: "SRD armor sample" },
      read: async () => ({ kind: "parsedObject", value: sample.default ?? sample }),
    },
    { mode: "commit" },
  )

  expect(result).toMatchObject({
    success: true,
    stage: "runtimeCacheBuild",
    storageCommitted: true,
  })
  expect(app.runtimeReader.querySelectableTemplates({ kind: "armor", sourceId: result.summary.packId })).toHaveLength(14)
})
```

- [x] **Step 2: Add disable/delete lifecycle test**

```ts
it("disable hides future runtime selection but keeps management detail", async () => {
  const app = createTestEquipmentPackApplicationService()
  const result = await importValidPack(app)
  const packId = result.summary.packId!

  await app.setPackDisabled(packId, true)

  expect(app.runtimeReader.querySelectableTemplates({ sourceId: packId })).toEqual([])
  expect(app.managementReader.getPackDetail(packId)?.templates.length).toBeGreaterThan(0)
})

it("remove hides management and runtime data but does not affect already instantiated slots", async () => {
  const app = createTestEquipmentPackApplicationService()
  const result = await importValidPack(app)
  const packId = result.summary.packId!
  const template = app.runtimeReader.querySelectableTemplates({ kind: "weapon", sourceId: packId })[0]
  const instantiated = createWeaponSlotFromTemplate(template as never, (id) => `instance:${id}`)
  const contributionBeforeDelete = instantiated.modifierContributions[0]

  await app.removePack(packId)

  expect(app.runtimeReader.querySelectableTemplates({ sourceId: packId })).toEqual([])
  expect(app.managementReader.getPackDetail(packId)).toBeUndefined()
  expect(instantiated.name).toBe(template.name)
  expect(instantiated.trait).toContain(template.damageType)
  expect(instantiated.trait).toContain(template.range)
  expect(instantiated.damage).toContain(template.damage)
  expect(instantiated.feature).toContain(template.featureName ?? "")
  expect(instantiated.modifierContributions[0]).toEqual(contributionBeforeDelete)
  expect(instantiated.modifierContributions[0]).not.toBe(template.modifierContributions[0])
})

it("remove does not affect already instantiated armor slot", async () => {
  const app = createTestEquipmentPackApplicationService()
  const result = await importValidArmorPack(app)
  const packId = result.summary.packId!
  const template = app.runtimeReader.querySelectableTemplates({ kind: "armor", sourceId: packId })[0]
  const instantiated = createArmorSlotFromTemplate(template as never, (id) => `instance:${id}`)
  const contributionBeforeDelete = instantiated.modifierContributions[0]

  await app.removePack(packId)

  expect(instantiated.name).toBe(template.name)
  expect(instantiated.baseArmorMax).toBe(template.baseArmorMax)
  expect(instantiated.baseThresholds).toEqual(template.baseThresholds)
  expect(instantiated.baseThresholds).not.toBe(template.baseThresholds)
  expect(instantiated.modifierContributions[0]).toEqual(contributionBeforeDelete)
  expect(instantiated.modifierContributions[0]).not.toBe(template.modifierContributions[0])
})
```

- [x] **Step 3: Run focused integration tests**

Run:

```bash
npm run test:run -- equipment/packs/__tests__/application-service.test.ts equipment/runtime-cache/__tests__/readers.test.ts equipment/import/__tests__/srd-samples.test.ts
```

Expected: PASS.

- [x] **Step 4: Run broader equipment tests**

Run:

```bash
npm run test:run -- equipment/import tests/unit/equipment equipment/runtime-cache equipment/packs
```

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add equipment tests/unit/equipment
git commit -m "test: verify equipment pack storage runtime flow"
```

---

## Final Verification

Run:

```bash
npm run test:run -- equipment/import equipment/packs equipment/runtime-cache tests/unit/equipment tests/unit/automation
npx tsc --noEmit
rg -n "stageCommitData|registryRebuild|registryRebuilder" equipment automation components lib data public tests --glob '!equipment/import/__tests__/*'
git diff --check
```

Expected:

- All listed Vitest suites pass.
- `npx tsc --noEmit` passes.
- The legacy-stage `rg` command returns no production-path matches.
- `git diff --check` prints no whitespace errors.

## Final Acceptance Criteria

- Import pipeline stops at `stageImportData`; the full application workflow uses `buildCommitPlan`, `storageTransaction`, and `runtimeCacheBuild`.
- No production code depends on `stageCommitData`, `registryRebuild`, or `registryRebuilder`.
- Dry run remains storage-free.
- Commit import writes storage and rebuilds runtime cache before reporting success.
- Storage transaction success plus cache failure reports `storageCommitted: true` and does not roll back storage.
- Repository uses `dh_equipment_index` and `dh_equipment_pack:` keys.
- Repository snapshot includes disabled packs and full pack data.
- Runtime reader excludes disabled packs.
- Management reader includes disabled packs and can show their templates.
- Built-in weapons are canonical English-field data.
- Runtime query supports existing launch-critical filters: text, kind, tier, trait, weapon type, damage type, range, burden, and source.
- Already instantiated character sheet equipment does not depend on pack/template availability after disable or delete.

## Final Review Notes

Final multi-agent review covered design compliance, test coverage, storage/runtime edge cases, and code style/fast-fail behavior.

Resolved during final review:

- `options.mode` now defaults to `"commit"` per stage 2 design; explicit dry run remains available.
- Repository rejects template id conflicts during `commitImport()` before writing pack data.
- Repository validates stored normalized weapon/armor templates deeply enough to prevent malformed localStorage records from entering runtime cache.
- Application service no longer silently drops successful transaction integrity issues: blocking issues fail at `runtimeCacheBuild`, while non-blocking cleanup issues are returned as warnings.
- `initialize()` now returns a structured initialization result with the recovered snapshot and runtime cache build diagnostics.
- Remove-pack cleanup-pending refreshes runtime cache from the authoritative post-index snapshot, so deleted packs disappear from runtime even if pack-data cleanup remains pending.
- Added cold-start initialization coverage for persisted storage -> snapshot -> runtime/management readers.
- Added rollback failure coverage for index-write failure plus pack-data cleanup failure.

Reviewed and intentionally not changed in this plan:

- Corrupted index recovery still resets the index and removes `dh_equipment_pack:` data because stage 3 design explicitly chose that recovery strategy. Rebuilding index entries from pack data would require inventing missing lifecycle metadata such as `importedAt`, `disabled`, and `source`.
- `setPackDisabled()` still obtains a post-transaction snapshot for cache rebuild. Avoiding pack-data reads during toggle would require a new repository/application-service snapshot coordination design and should be handled in a follow-up design pass if needed.
- `initialize()` still follows the non-blocking startup presentation strategy, but it now exposes runtime cache build failure through `EquipmentPackInitializeResult` so callers can show diagnostics without inventing a blocking error page.
