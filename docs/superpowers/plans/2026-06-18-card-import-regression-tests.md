# Card Import Regression Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first regression-test layer for card import commit path, proving accepted card packs can be written into the expected legacy localStorage shape and that lifecycle operations no longer bypass the card pack application service.

**Architecture:** Keep the first batch non-browser and deterministic. Tests exercise the real import pipeline, application service, storage format projection, localStorage repository, and pack-scoped image backend through in-memory adapters; browser Playwright tests remain a second batch after this regression net is stable.

**Tech Stack:** Vitest, TypeScript, JSZip, Node `fs/promises`, in-memory card pack storage/image adapters, existing card import application service.

**Starting tag:** `card-import-regression-test-start` points to `18f3746`, the commit before this regression-test implementation begins.

---

## File Structure

- Modify `.gitignore`
  - Ignore local real-card-pack fixtures and generated actual snapshots.
- Modify `package.json`
  - Add focused card import regression scripts.
- Create `tests/helpers/card-import-storage-snapshot.ts`
  - Build deterministic **Card Import Storage Snapshot** from card-pack storage and image backends.
- Create `tests/helpers/__tests__/card-import-storage-snapshot.test.ts`
  - Unit-test snapshot parsing, sorting, image metadata, and SHA-256 hashing.
- Create `tests/local-fixtures/card-import-local-fixtures.test.ts`
  - Optional local runner for `.local-fixtures/card-packs/inputs/**/*.{json,dhcb}`.
- Create `card/packs/__tests__/legacy-installed-pack-compatibility.test.ts`
  - Test already-installed legacy storage plus legacy global image migration/fallback behavior.
- Modify `card/__tests__/legacy-import-facade.test.ts`
  - Replace old `store.importCards` spy test with import/remove/toggle facade delegation tests.
- Modify `card/index-unified.ts`
  - Route `removeCustomCardBatch` and `toggleBatchDisabled` through `CardPackApplicationService`.
- Modify `card/stores/store-types.ts`
  - Remove deprecated `importCards` from `UnifiedCardActions`.
- Modify `card/stores/store-actions.ts`
  - Delete deprecated `importCards` stub.
- Modify `app/card-manager/page.tsx`
  - Await async `removeCustomCardBatch`.

## Task 1: Local Fixture Convention And Scripts

**Files:**
- Modify: `.gitignore`
- Modify: `package.json`

- [ ] **Step 1: Add ignored local fixture root**

Add to `.gitignore`:

```gitignore
# local card-pack regression fixtures
.local-fixtures/
```

- [ ] **Step 2: Add focused scripts**

In `package.json`, add scripts without changing existing script names:

```json
"test:card-import": "npx vitest run card/import card/packs card/__tests__/legacy-import-facade.test.ts components/content-pack-manager",
"test:card-import:fixtures": "npx vitest run card/import/__tests__/compatibility-fixtures.test.ts",
"test:card-import:local-fixtures": "RUN_LOCAL_CARD_PACK_FIXTURES=1 npx vitest run tests/local-fixtures/card-import-local-fixtures.test.ts"
```

- [ ] **Step 3: Verify scripts are parseable**

Run:

```bash
npm run test:card-import:fixtures
```

Expected: existing compatibility fixture tests pass.

- [ ] **Step 4: Commit**

```bash
git add .gitignore package.json
git commit -m "test: add card import fixture scripts"
```

## Task 2: Card Import Storage Snapshot Helper

**Files:**
- Create: `tests/helpers/card-import-storage-snapshot.ts`
- Create: `tests/helpers/__tests__/card-import-storage-snapshot.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/helpers/__tests__/card-import-storage-snapshot.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
  CARD_PACK_STORAGE_KEYS,
  createInMemoryCardPackStorageAdapter,
  getCardPackStorageKey,
} from "@/card/packs/local-storage-adapter"
import { createInMemoryCardPackImageBackend } from "@/card/packs/image-backend"
import { buildCardImportStorageSnapshot } from "../card-import-storage-snapshot"

function blob(text: string, type = "image/png") {
  return new Blob([text], { type })
}

describe("card import storage snapshot helper", () => {
  it("extracts only card import index, batches, and image metadata", async () => {
    const storage = createInMemoryCardPackStorageAdapter({
      unrelated_key: "ignored",
      [CARD_PACK_STORAGE_KEYS.INDEX]: JSON.stringify({
        batches: {
          pack_b: {
            id: "pack_b",
            name: "Pack B",
            fileName: "b.json",
            importTime: "2026-06-18T00:00:00.000Z",
            cardCount: 1,
            cardTypes: ["profession"],
            size: 20,
            isSystemBatch: false,
            disabled: false,
          },
          pack_a: {
            id: "pack_a",
            name: "Pack A",
            fileName: "a.json",
            importTime: "2026-06-18T00:00:00.000Z",
            cardCount: 1,
            cardTypes: ["profession"],
            size: 20,
            isSystemBatch: false,
            disabled: false,
          },
        },
        totalCards: 2,
        totalBatches: 2,
        lastUpdate: "2026-06-18T00:00:00.000Z",
      }),
      [getCardPackStorageKey("pack_b")]: JSON.stringify({
        metadata: { id: "pack_b", name: "Pack B", fileName: "b.json", importTime: "2026-06-18T00:00:00.000Z" },
        cards: [{ id: "b-card", name: "B" }],
      }),
      [getCardPackStorageKey("pack_a")]: JSON.stringify({
        metadata: { id: "pack_a", name: "Pack A", fileName: "a.json", importTime: "2026-06-18T00:00:00.000Z" },
        cards: [{ id: "a-card", name: "A" }],
        customFieldDefinitions: { professions: ["A"] },
        variantTypes: { Food: { subclasses: ["Meal"], levelRange: [1, 2] } },
      }),
    })
    const images = createInMemoryCardPackImageBackend()
    await images.writePackImages("pack_a", [
      { templateId: "a-card", path: "images/a-card.png", mimeType: "image/png", readBlob: async () => blob("image-a") },
    ])

    const snapshot = await buildCardImportStorageSnapshot({ storage, images })

    expect(Object.keys(snapshot.batches)).toEqual(["pack_a", "pack_b"])
    expect(snapshot.batches.pack_a.cards).toEqual([{ id: "a-card", name: "A" }])
    expect(snapshot.batches.pack_a.customFieldDefinitions).toEqual({ professions: ["A"] })
    expect(snapshot.batches.pack_a.variantTypes).toEqual({ Food: { subclasses: ["Meal"], levelRange: [1, 2] } })
    expect(snapshot.images.pack_a.cardIds).toEqual(["a-card"])
    expect(snapshot.images.pack_a.items[0]).toMatchObject({
      cardId: "a-card",
      mimeType: "image/png",
      byteLength: 7,
    })
    expect(snapshot.images.pack_a.items[0].sha256).toMatch(/^[a-f0-9]{64}$/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run tests/helpers/__tests__/card-import-storage-snapshot.test.ts
```

Expected: fail because `buildCardImportStorageSnapshot` does not exist.

- [ ] **Step 3: Implement snapshot helper**

Create `tests/helpers/card-import-storage-snapshot.ts`:

```ts
import { createHash } from "node:crypto"
import {
  CARD_PACK_STORAGE_KEYS,
  getCardPackStorageKey,
  type CardPackStorageAdapter,
} from "@/card/packs/local-storage-adapter"
import type { CardPackImageBackend } from "@/card/packs/image-backend"

export interface CardImportStorageSnapshot {
  index: unknown
  batches: Record<string, {
    metadata: unknown
    cards: unknown[]
    customFieldDefinitions?: unknown
    variantTypes?: unknown
  }>
  images: Record<string, {
    cardIds: string[]
    items: Array<{
      cardId: string
      mimeType: string
      byteLength: number
      sha256: string
    }>
  }>
}

interface BuildCardImportStorageSnapshotInput {
  storage: CardPackStorageAdapter
  images: CardPackImageBackend
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseJson(raw: string | null, label: string): unknown {
  if (raw === null) throw new Error(`Missing ${label}`)
  return JSON.parse(raw)
}

function packIdsFromIndex(index: unknown): string[] {
  if (!isRecord(index) || !isRecord(index.batches)) return []
  return Object.keys(index.batches).sort()
}

async function sha256(blob: Blob): Promise<string> {
  const bytes = Buffer.from(await blob.arrayBuffer())
  return createHash("sha256").update(bytes).digest("hex")
}

export async function buildCardImportStorageSnapshot(
  input: BuildCardImportStorageSnapshotInput,
): Promise<CardImportStorageSnapshot> {
  const index = parseJson(input.storage.getItem(CARD_PACK_STORAGE_KEYS.INDEX), CARD_PACK_STORAGE_KEYS.INDEX)
  const batches: CardImportStorageSnapshot["batches"] = {}
  const images: CardImportStorageSnapshot["images"] = {}

  for (const packId of packIdsFromIndex(index)) {
    const rawBatch = parseJson(input.storage.getItem(getCardPackStorageKey(packId)), getCardPackStorageKey(packId))
    if (!isRecord(rawBatch) || !Array.isArray(rawBatch.cards)) {
      throw new Error(`Invalid card batch snapshot for ${packId}`)
    }

    batches[packId] = {
      metadata: rawBatch.metadata,
      cards: rawBatch.cards,
      ...(rawBatch.customFieldDefinitions !== undefined ? { customFieldDefinitions: rawBatch.customFieldDefinitions } : {}),
      ...(rawBatch.variantTypes !== undefined ? { variantTypes: rawBatch.variantTypes } : {}),
    }

    const imageSummaries = await input.images.listPackImages(packId)
    const imageItems = await Promise.all(
      imageSummaries
        .filter((summary) => summary.templateId)
        .sort((left, right) => left.templateId!.localeCompare(right.templateId!))
        .map(async (summary) => {
          const cardId = summary.templateId!
          const record = await input.images.getImage(cardId, packId)
          if (!record) throw new Error(`Missing image ${packId}/${cardId}`)
          return {
            cardId,
            mimeType: record.mimeType,
            byteLength: record.blob.size,
            sha256: await sha256(record.blob),
          }
        }),
    )

    images[packId] = {
      cardIds: imageItems.map((item) => item.cardId),
      items: imageItems,
    }
  }

  return { index, batches, images }
}
```

- [ ] **Step 4: Verify helper passes**

Run:

```bash
npx vitest run tests/helpers/__tests__/card-import-storage-snapshot.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add tests/helpers/card-import-storage-snapshot.ts tests/helpers/__tests__/card-import-storage-snapshot.test.ts
git commit -m "test: add card import storage snapshot helper"
```

## Task 3: Local Real Card Pack Fixture Runner

**Files:**
- Create: `tests/local-fixtures/card-import-local-fixtures.test.ts`

- [ ] **Step 1: Write optional runner test**

Create `tests/local-fixtures/card-import-local-fixtures.test.ts`:

```ts
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { createCardDhcbSource, createCardJsonSource } from "@/card/import/source"
import { createCardPackApplicationService } from "@/card/packs/application-service"
import { createInMemoryCardPackImageBackend } from "@/card/packs/image-backend"
import { createInMemoryCardPackStorageAdapter } from "@/card/packs/local-storage-adapter"
import { createLocalStorageCardPackRepository } from "@/card/packs/local-storage-repository"
import { createNoopCardRuntimeRefreshAdapter } from "@/card/packs/runtime-refresh-adapter"
import { buildCardImportStorageSnapshot } from "../helpers/card-import-storage-snapshot"

const ROOT = path.resolve(".local-fixtures/card-packs")
const INPUTS = path.join(ROOT, "inputs")
const EXPECTED = path.join(ROOT, "expected")
const ACTUAL = path.join(ROOT, "actual")
const FIXED_NOW = new Date("2026-06-18T00:00:00.000Z")

async function discoverFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const nested = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) return discoverFiles(fullPath)
        if (entry.isFile() && [".json", ".dhcb"].includes(path.extname(entry.name).toLowerCase())) return [fullPath]
        return []
      }),
    )
    return nested.flat().sort()
  } catch {
    return []
  }
}

function slug(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "fixture"
}

async function sourceForFile(filePath: string) {
  const bytes = await readFile(filePath)
  const fileName = path.basename(filePath)
  if (fileName.toLowerCase().endsWith(".dhcb")) {
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    return createCardDhcbSource(arrayBuffer, fileName)
  }
  return createCardJsonSource(bytes.toString("utf8"), fileName)
}

const runLocalFixtures = process.env.RUN_LOCAL_CARD_PACK_FIXTURES === "1"

describe.skipIf(!runLocalFixtures)("local real card pack fixtures", () => {
  it("imports every local fixture into expected legacy storage snapshots", async () => {
    const files = await discoverFiles(INPUTS)
    expect(files.length, "No local fixtures found under .local-fixtures/card-packs/inputs").toBeGreaterThan(0)
    await mkdir(ACTUAL, { recursive: true })

    const failures: string[] = []

    for (const filePath of files) {
      const fixtureName = path.relative(INPUTS, filePath)
      const packId = `test-pack-${slug(fixtureName)}`
      const storage = createInMemoryCardPackStorageAdapter()
      const images = createInMemoryCardPackImageBackend()
      const service = createCardPackApplicationService({
        repository: createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW }),
        runtimeRefresh: createNoopCardRuntimeRefreshAdapter(),
        builtinTemplateIds: new Set(),
        createPackId: () => packId,
        now: () => FIXED_NOW,
        random: () => 0,
      })

      const result = await service.importFromSource(await sourceForFile(filePath), { mode: "commit" })
      const actualPath = path.join(ACTUAL, `${slug(fixtureName)}.storage.json`)
      const expectedPath = path.join(EXPECTED, `${slug(fixtureName)}.storage.json`)

      if (!result.success) {
        failures.push(`${fixtureName}: import failed at ${result.stage}: ${result.diagnostics.map((d) => d.message).join("; ")}`)
        continue
      }

      const snapshot = await buildCardImportStorageSnapshot({ storage, images })
      const serialized = `${JSON.stringify(snapshot, null, 2)}\n`
      await writeFile(actualPath, serialized, "utf8")

      let expected: string | null = null
      try {
        expected = await readFile(expectedPath, "utf8")
      } catch {
        failures.push(`${fixtureName}: missing expected snapshot; wrote ${actualPath}`)
        continue
      }

      if (expected.trimEnd() !== serialized.trimEnd()) {
        failures.push(`${fixtureName}: storage snapshot differs; wrote ${actualPath}`)
      }
    }

    expect(failures).toEqual([])
  })
})
```

- [ ] **Step 2: Verify default skip behavior**

Run:

```bash
npx vitest run tests/local-fixtures/card-import-local-fixtures.test.ts
```

Expected: skipped because `RUN_LOCAL_CARD_PACK_FIXTURES` is not set.

- [ ] **Step 3: Verify local mode fails cleanly with no fixtures**

Run:

```bash
RUN_LOCAL_CARD_PACK_FIXTURES=1 npx vitest run tests/local-fixtures/card-import-local-fixtures.test.ts
```

Expected: fail with `No local fixtures found under .local-fixtures/card-packs/inputs`, unless local fixtures already exist.

- [ ] **Step 4: Commit**

```bash
git add tests/local-fixtures/card-import-local-fixtures.test.ts
git commit -m "test: add local card pack fixture runner"
```

## Task 4: Installed Legacy Pack Compatibility Tests

**Files:**
- Create: `card/packs/__tests__/legacy-installed-pack-compatibility.test.ts`

- [ ] **Step 1: Write compatibility tests**

Create `card/packs/__tests__/legacy-installed-pack-compatibility.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { createInMemoryCardPackImageBackend } from "../image-backend"
import {
  CARD_PACK_STORAGE_KEYS,
  createInMemoryCardPackStorageAdapter,
  getCardPackStorageKey,
} from "../local-storage-adapter"
import { createLocalStorageCardPackRepository } from "../local-storage-repository"

const FIXED_NOW = new Date("2026-06-18T00:00:00.000Z")

function blob(text: string, type = "image/png") {
  return new Blob([text], { type })
}

function legacyIndex(packIds: string[]) {
  return {
    batches: Object.fromEntries(
      packIds.map((packId) => [
        packId,
        {
          id: packId,
          name: packId,
          fileName: `${packId}.json`,
          importTime: FIXED_NOW.toISOString(),
          cardCount: 1,
          cardTypes: ["profession"],
          size: 100,
          isSystemBatch: false,
          disabled: false,
        },
      ]),
    ),
    totalCards: packIds.length,
    totalBatches: packIds.length,
    lastUpdate: FIXED_NOW.toISOString(),
  }
}

function legacyBatch(packId: string, cardId = "warrior") {
  return {
    metadata: {
      id: packId,
      name: packId,
      fileName: `${packId}.json`,
      importTime: FIXED_NOW.toISOString(),
    },
    cards: [{ id: cardId, name: cardId, batchId: packId, source: "custom" }],
    customFieldDefinitions: { professions: ["Warrior"] },
    variantTypes: { Food: { subclasses: ["Meal"], levelRange: [1, 3] } },
  }
}

function storageWithPacks(packs: Record<string, ReturnType<typeof legacyBatch>>) {
  return createInMemoryCardPackStorageAdapter({
    [CARD_PACK_STORAGE_KEYS.INDEX]: JSON.stringify(legacyIndex(Object.keys(packs))),
    ...Object.fromEntries(Object.entries(packs).map(([packId, data]) => [getCardPackStorageKey(packId), JSON.stringify(data)])),
  })
}

describe("installed legacy card pack compatibility", () => {
  it("loads old legacy batch content and keeps definitions visible", async () => {
    const storage = storageWithPacks({ pack_a: legacyBatch("pack_a") })
    const images = createInMemoryCardPackImageBackend()
    const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })

    const snapshot = await repository.loadSnapshot()

    expect(snapshot.packs.get("pack_a")).toMatchObject({
      packId: "pack_a",
      templateIds: ["warrior"],
    })
    expect(snapshot.integrity.ok).toBe(true)
    const stored = JSON.parse(storage.getItem(getCardPackStorageKey("pack_a")) ?? "null")
    expect(stored.cards).toEqual([{ id: "warrior", name: "warrior", batchId: "pack_a", source: "custom" }])
    expect(stored.customFieldDefinitions).toEqual({ professions: ["Warrior"] })
    expect(stored.variantTypes).toEqual({ Food: { subclasses: ["Meal"], levelRange: [1, 3] } })
  })

  it("can disable, enable, and remove an old legacy pack", async () => {
    const storage = storageWithPacks({ pack_a: legacyBatch("pack_a") })
    const images = createInMemoryCardPackImageBackend()
    const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })

    await expect(repository.setPackDisabled("pack_a", true)).resolves.toMatchObject({ ok: true })
    expect((await repository.loadSnapshot()).packs.get("pack_a")?.disabled).toBe(true)
    await expect(repository.setPackDisabled("pack_a", false)).resolves.toMatchObject({ ok: true })
    expect((await repository.loadSnapshot()).packs.get("pack_a")?.disabled).toBe(false)
    await expect(repository.removePack("pack_a")).resolves.toMatchObject({ ok: true })
    expect((await repository.loadSnapshot()).packs.has("pack_a")).toBe(false)
  })

  it("migrates a legacy global image when exactly one installed pack owns the template id", async () => {
    const storage = storageWithPacks({ pack_a: legacyBatch("pack_a", "warrior") })
    const images = createInMemoryCardPackImageBackend()
    await images.putLegacyGlobalImage("warrior", blob("legacy"))
    const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })

    const snapshot = await repository.loadSnapshot()

    expect(snapshot.integrity.repaired).toBe(true)
    expect(await images.getImage("warrior", "pack_a")).not.toBeNull()
    expect(await images.getImage("warrior")).toBeNull()
  })

  it("keeps ambiguous legacy global images as fallback and reports migration issue", async () => {
    const storage = storageWithPacks({
      pack_a: legacyBatch("pack_a", "warrior"),
      pack_b: legacyBatch("pack_b", "warrior"),
    })
    const images = createInMemoryCardPackImageBackend()
    await images.putLegacyGlobalImage("warrior", blob("legacy"))
    const repository = createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW })

    const snapshot = await repository.loadSnapshot()

    expect(snapshot.integrity.issues).toContainEqual(expect.objectContaining({ code: "TEMPLATE_ID_CONFLICT" }))
    expect(snapshot.integrity.issues).toContainEqual(expect.objectContaining({ code: "IMAGE_MIGRATION_AMBIGUOUS" }))
    expect(await images.listPackImages("pack_a")).toEqual([])
    expect(await images.listPackImages("pack_b")).toEqual([])
    expect(await images.getImage("warrior")).not.toBeNull()
  })

  it("prefers pack-scoped image over legacy global image", async () => {
    const storage = storageWithPacks({ pack_a: legacyBatch("pack_a", "warrior") })
    const images = createInMemoryCardPackImageBackend()
    await images.putLegacyGlobalImage("warrior", blob("legacy"))
    await images.writePackImages("pack_a", [
      { templateId: "warrior", path: "images/warrior.png", readBlob: async () => blob("scoped") },
    ])

    const image = await images.getImage("warrior", "pack_a")

    expect(await image?.blob.text()).toBe("scoped")
  })
})
```

- [ ] **Step 2: Run test**

Run:

```bash
npx vitest run card/packs/__tests__/legacy-installed-pack-compatibility.test.ts
```

Expected: pass or expose a real compatibility gap. If it exposes a gap, fix production code only if the current behavior contradicts `docs/contexts/content-pack-import/CONTEXT.md`.

- [ ] **Step 3: Commit**

```bash
git add card/packs/__tests__/legacy-installed-pack-compatibility.test.ts
git commit -m "test: cover installed legacy card packs"
```

## Task 5: Lifecycle Facade Delegates To Application Service

**Files:**
- Modify: `card/__tests__/legacy-import-facade.test.ts`
- Modify: `card/index-unified.ts`
- Modify: `app/card-manager/page.tsx`

- [ ] **Step 1: Replace facade tests**

In `card/__tests__/legacy-import-facade.test.ts`, keep the import success/failure tests and replace the old `store.importCards` spy test with tests like:

```ts
it("delegates removeCustomCardBatch to the application service", async () => {
  const removePack = vi.fn(async () => ({
    success: true,
    stage: "runtimeRefresh",
    storageCommitted: true,
    diagnostics: [],
  }))
  setDefaultCardPackApplicationServiceFactoryForTests(() => ({
    ...createFakeService({
      result: {
        success: true,
        mode: "commit",
        stage: "runtimeRefresh",
        diagnostics: [],
        storageCommitted: true,
        summary: { cardCount: 1, imageCount: 0, warningCount: 0, errorCount: 0 },
      },
    }),
    removePack,
  }))

  const { removeCustomCardBatch } = await import("@/card/index-unified")
  await expect(removeCustomCardBatch("batch_test")).resolves.toBe(true)
  expect(removePack).toHaveBeenCalledWith("batch_test")
})

it("delegates toggleBatchDisabled to setPackDisabled with the next disabled state", async () => {
  const loadSnapshot = vi.fn(async () => ({
    packs: new Map([["batch_test", {
      packId: "batch_test",
      importedAt: "2026-06-18T00:00:00.000Z",
      disabled: false,
      templateIds: ["warrior"],
      imageTemplateIds: [],
    }]]),
    packCount: 1,
    integrity: { ok: true, repaired: false, issues: [], removedIndexEntries: [], removedOrphanPackKeys: [], removedCorruptedPackKeys: [], removedOrphanImagePackIds: [] },
  }))
  const setPackDisabled = vi.fn(async () => ({
    success: true,
    stage: "runtimeRefresh",
    storageCommitted: true,
    diagnostics: [],
  }))
  setDefaultCardPackApplicationServiceFactoryForTests(() => ({
    ...createFakeService({
      result: {
        success: true,
        mode: "commit",
        stage: "runtimeRefresh",
        diagnostics: [],
        storageCommitted: true,
        summary: { cardCount: 1, imageCount: 0, warningCount: 0, errorCount: 0 },
      },
    }),
    loadSnapshot,
    setPackDisabled,
  }))

  const { toggleBatchDisabled } = await import("@/card/index-unified")
  await expect(toggleBatchDisabled("batch_test")).resolves.toBe(true)
  expect(setPackDisabled).toHaveBeenCalledWith("batch_test", true)
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npx vitest run card/__tests__/legacy-import-facade.test.ts
```

Expected: fail because `removeCustomCardBatch` is sync and lifecycle facades still call store paths.

- [ ] **Step 3: Route lifecycle facades through application service**

In `card/index-unified.ts`:

```ts
export async function removeCustomCardBatch(batchId: string): Promise<boolean> {
  const service = await getDefaultCardPackApplicationService()
  const result = await service.removePack(batchId)
  return result.success
}

export const toggleBatchDisabled = async (batchId: string): Promise<boolean> => {
  const service = await getDefaultCardPackApplicationService()
  const snapshot = await service.loadSnapshot()
  const entry = snapshot.packs.get(batchId)
  if (!entry) return false

  const result = await service.setPackDisabled(batchId, !entry.disabled)
  return result.success
}
```

Keep `getCustomCardBatches`, `getCustomCardStats`, `refreshCustomCards`, `getBatchDisabledStatus`, and read-only helpers as existing store read facades for now.

- [ ] **Step 4: Await remove in UI**

In `app/card-manager/page.tsx`, change `handleRemoveBatch` to async:

```ts
async function handleRemoveBatch(batchId: string) {
  if (!confirm("确定要删除这个卡牌包吗？这将删除卡牌包中的所有卡牌。")) return

  const success = await removeCustomCardBatch(batchId)
  if (success) {
    refreshCardData()
    alert("卡牌包删除成功")
  } else {
    alert("卡牌包删除失败")
  }
}
```

- [ ] **Step 5: Verify facade tests**

Run:

```bash
npx vitest run card/__tests__/legacy-import-facade.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add card/__tests__/legacy-import-facade.test.ts card/index-unified.ts app/card-manager/page.tsx
git commit -m "refactor: route card lifecycle facades through service"
```

## Task 6: Delete Deprecated Store Import Stub

**Files:**
- Modify: `card/stores/store-types.ts`
- Modify: `card/stores/store-actions.ts`

- [ ] **Step 1: Remove deprecated action type**

In `card/stores/store-types.ts`, delete:

```ts
importCards: (data: ImportData, batchName?: string) => Promise<ImportResult>;
```

Then remove unused `ImportData` and `ImportResult` imports if TypeScript reports them unused.

- [ ] **Step 2: Remove deprecated action implementation**

In `card/stores/store-actions.ts`, delete:

```ts
importCards: async () => ({
  success: false,
  imported: 0,
  errors: ['store.importCards is deprecated. Use importCustomCards().'],
  batchId: '',
}),
```

- [ ] **Step 3: Search for remaining callers**

Run:

```bash
rg -n "importCards" card app components tests -g '*.ts' -g '*.tsx'
```

Expected: no production callers. Test references should be gone or intentionally unrelated.

- [ ] **Step 4: Typecheck relevant files**

Run:

```bash
npx tsc --noEmit --pretty false
```

Expected: no type errors from removing `importCards`.

- [ ] **Step 5: Commit**

```bash
git add card/stores/store-types.ts card/stores/store-actions.ts
git commit -m "refactor: remove deprecated card store import stub"
```

## Task 7: First-Batch Verification

**Files:**
- No production edits expected.

- [ ] **Step 1: Run focused card import suite**

Run:

```bash
npm run test:card-import
```

Expected: pass.

- [ ] **Step 2: Run local fixture default skip check**

Run:

```bash
npx vitest run tests/local-fixtures/card-import-local-fixtures.test.ts
```

Expected: skipped because `RUN_LOCAL_CARD_PACK_FIXTURES` is not set.

- [ ] **Step 3: Optionally run local fixture data check**

Run:

```bash
npm run test:card-import:local-fixtures
```

Expected: if no local fixtures exist, fail with the explicit missing fixtures message. This command is not a normal CI command; failure here is acceptable only when `.local-fixtures/card-packs/inputs` is absent.

- [ ] **Step 4: Run typecheck**

Run:

```bash
npx tsc --noEmit --pretty false
```

Expected: pass.

- [ ] **Step 5: Commit any verification-only adjustments**

If verification required small test-only corrections:

```bash
git add <changed-files>
git commit -m "test: stabilize card import regression suite"
```

## Out Of Scope For This Plan

- Playwright installation and browser E2E implementation.
- Optional all-real-packs E2E runner.
- Storage v2 migration.
- Built-in base no-longer-writing-localStorage redesign.
- Editor validation UI redesign.

## Final Review Checklist

- The only formal import commit path is `CardPackApplicationService.importFromSource`.
- JSON and DHCB compatibility facades call the application service.
- Remove and toggle lifecycle facades call the application service.
- Local fixture runner can write actual snapshots and strictly compare expected snapshots.
- Installed legacy storage is readable without storage v2 migration.
- Pack-scoped images are preferred, legacy global images remain fallback-only compatibility.
- E2E claims are not implemented in this first batch.
