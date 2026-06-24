import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { createCardDhcbSource, createCardJsonSource } from "@/card/import/source"
import { createCardPackApplicationService } from "@/card/packs/application-service"
import { createInMemoryCardPackImageBackend } from "@/card/packs/image-backend"
import {
  createBrowserCardPackStorageAdapter,
  createInMemoryCardPackStorageAdapter,
} from "@/card/packs/local-storage-adapter"
import { createLocalStorageCardPackRepository } from "@/card/packs/local-storage-repository"
import {
  createNoopCardRuntimeRefreshAdapter,
  createZustandCardRuntimeRefreshAdapter,
} from "@/card/packs/runtime-refresh-adapter"
import { useUnifiedCardStore } from "@/card/stores/unified-card-store"
import { buildCardImportStorageSnapshot } from "../helpers/card-import-storage-snapshot"
import {
  buildRawStorageDiffReport,
  compareRuntimeBusinessSnapshots,
  compareStorageBusinessSnapshots,
  projectRuntimeBusinessSnapshotFromStorage,
  verifyActualImageBackendReadable,
} from "./card-import-equivalence"
import { createLocalCardPackFixtureNames } from "./card-import-local-fixture-names"

const ROOT = path.resolve(".local-fixtures/card-packs")
const INPUTS = path.join(ROOT, "inputs")
const EXPECTED = path.join(ROOT, "expected")
const ACTUAL = path.join(ROOT, "actual")
const FIXED_NOW = new Date("2026-06-18T00:00:00.000Z")

function clearBrowserCardPackStorage() {
  localStorage.removeItem("daggerheart_custom_cards_index")
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index)
    if (key?.startsWith("daggerheart_custom_cards_batch_")) localStorage.removeItem(key)
  }
}

function resetRuntimeStoreForFixture() {
  useUnifiedCardStore.setState({
    batches: new Map(),
    cards: new Map(),
    cardsByType: new Map(),
    index: {
      batches: {},
      totalCards: 0,
      totalBatches: 0,
      lastUpdate: FIXED_NOW.toISOString(),
    },
    aggregatedCustomFields: null,
    aggregatedVariantTypes: null,
    subclassCardIndex: null,
    levelCardIndex: null,
    batchKeywordIndex: null,
    batchLevelIndex: null,
    stats: null,
    cacheValid: false,
    initialized: true,
  })
}

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

async function sourceForFile(filePath: string) {
  const bytes = await readFile(filePath)
  const fileName = path.basename(filePath)

  if (fileName.toLowerCase().endsWith(".dhcb")) {
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    return createCardDhcbSource(arrayBuffer, fileName)
  }

  return createCardJsonSource(bytes.toString("utf8"), fileName)
}

async function verifyActualRuntimeRefreshSmoke(
  filePath: string,
  packId: string,
  expectedCardCount: number,
): Promise<string[]> {
  clearBrowserCardPackStorage()
  resetRuntimeStoreForFixture()

  try {
    const service = createCardPackApplicationService({
      repository: createLocalStorageCardPackRepository({
        storage: createBrowserCardPackStorageAdapter(localStorage),
        images: createInMemoryCardPackImageBackend(),
        now: () => FIXED_NOW,
      }),
      runtimeRefresh: createZustandCardRuntimeRefreshAdapter(useUnifiedCardStore.getState()),
      builtinTemplateIds: new Set(),
      createPackId: () => packId,
      now: () => FIXED_NOW,
      random: () => 0,
    })

    const result = await service.importFromSource(await sourceForFile(filePath), { mode: "commit" })
    if (!result.success) {
      return [
        `actual runtime refresh smoke failed at ${result.stage}: ${result.diagnostics
          .map((diagnostic) => diagnostic.message)
          .join("; ")}`,
      ]
    }

    const store = useUnifiedCardStore.getState()
    const batch = store.batches.get(packId)
    const cards = store.loadAllCards().filter((card) => card.batchId === packId)
    const failures: string[] = []

    if (!batch) failures.push(`${packId}: runtime refresh did not expose batch`)
    if (cards.length !== expectedCardCount) {
      failures.push(`${packId}: runtime refresh exposed ${cards.length} cards, expected ${expectedCardCount}`)
    }

    return failures
  } finally {
    clearBrowserCardPackStorage()
    resetRuntimeStoreForFixture()
  }
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
      const names = createLocalCardPackFixtureNames(fixtureName)
      const storage = createInMemoryCardPackStorageAdapter()
      const images = createInMemoryCardPackImageBackend()
      const service = createCardPackApplicationService({
        repository: createLocalStorageCardPackRepository({ storage, images, now: () => FIXED_NOW }),
        runtimeRefresh: createNoopCardRuntimeRefreshAdapter(),
        builtinTemplateIds: new Set(),
        createPackId: () => names.packId,
        now: () => FIXED_NOW,
        random: () => 0,
      })

      const result = await service.importFromSource(await sourceForFile(filePath), { mode: "commit" })
      const actualPath = path.join(ACTUAL, names.snapshotFileName)
      const expectedPath = path.join(EXPECTED, names.snapshotFileName)
      const diffPath = path.join(ACTUAL, names.snapshotFileName.replace(/\.storage\.json$/, ".diff.json"))

      if (!result.success) {
        failures.push(
          `${fixtureName}: import failed at ${result.stage}: ${result.diagnostics
            .map((diagnostic) => diagnostic.message)
            .join("; ")}`,
        )
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

      const actualSnapshot = snapshot
      const expectedSnapshot = JSON.parse(expected) as typeof actualSnapshot
      const businessFailures = compareStorageBusinessSnapshots(expectedSnapshot, actualSnapshot)
      const expectedRuntime = await projectRuntimeBusinessSnapshotFromStorage(expectedSnapshot)
      const actualRuntime = await projectRuntimeBusinessSnapshotFromStorage(actualSnapshot)
      const runtimeFailures = compareRuntimeBusinessSnapshots(expectedRuntime, actualRuntime)
      const diffReport = buildRawStorageDiffReport(expectedSnapshot, actualSnapshot)

      if (diffReport.differences.length > 0) {
        await writeFile(diffPath, `${JSON.stringify(diffReport, null, 2)}\n`, "utf8")
      } else {
        await rm(diffPath, { force: true })
      }

      if (businessFailures.length > 0) {
        failures.push(`${fixtureName}: business storage mismatch:\n${businessFailures.join("\n")}`)
      }

      if (runtimeFailures.length > 0) {
        failures.push(`${fixtureName}: runtime read-model mismatch:\n${runtimeFailures.join("\n")}`)
      }

      const imageReadFailures = await verifyActualImageBackendReadable(actualSnapshot, images)
      if (imageReadFailures.length > 0) {
        failures.push(`${fixtureName}: actual image backend read mismatch:\n${imageReadFailures.join("\n")}`)
      }

      const runtimeSmokeFailures = await verifyActualRuntimeRefreshSmoke(
        filePath,
        names.packId,
        actualSnapshot.batches[names.packId].cards.length,
      )
      if (runtimeSmokeFailures.length > 0) {
        failures.push(`${fixtureName}: actual runtime refresh smoke mismatch:\n${runtimeSmokeFailures.join("\n")}`)
      }
    }

    expect(failures).toEqual([])
  })
})
