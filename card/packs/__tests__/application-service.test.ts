import JSZip from "jszip"
import { describe, expect, it, vi } from "vitest"
import type { CardImportFinalCommitPlan, CardPackStorageSnapshot, CardPackStorageTransactionResult } from "../storage-types"
import type { CardPackRepository } from "../repository"
import type { CardImportSource } from "@/card/import/types"
import { createCardPackApplicationService } from "../application-service"
import type { CardRuntimeRefreshAdapter, CardRuntimeRefreshResult } from "../runtime-refresh-adapter"

const FIXED_NOW = new Date("2026-06-16T10:20:30.000Z")

function validCardSource(input: { templateId?: string } = {}): CardImportSource {
  const templateId = input.templateId ?? "warrior"
  const pack = {
    format: "daggerheart.card-pack.v1",
    name: "Test Pack",
    version: "1.0.0",
    author: "Tester",
    definitions: { classes: ["Warrior"], domains: ["Blade", "Bone"] },
    classes: [
      {
        id: templateId,
        name: "Warrior",
        summary: "A test class.",
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

  return {
    origin: { kind: "container", fileName: "test.dhcb" },
    async read() {
      const zip = new JSZip()
      zip.file("cards.json", JSON.stringify(pack))
      zip.file(`images/${templateId}.png`, "image-bytes")
      const bytes = await zip.generateAsync({ type: "arraybuffer" })
      return { kind: "dhcbBytes", bytes, sizeBytes: bytes.byteLength }
    },
  }
}

function makeSnapshot(input: { packId?: string; templateIds?: string[] } = {}): CardPackStorageSnapshot {
  const packId = input.packId ?? "batch_existing"
  const templateIds = input.templateIds ?? []
  return {
    packs: new Map(
      templateIds.length
        ? [
            [
              packId,
              {
                packId,
                importedAt: "2026-06-16T09:00:00.000Z",
                disabled: false,
                templateIds,
                imageTemplateIds: [],
              },
            ],
          ]
        : [],
    ),
    packCount: templateIds.length ? 1 : 0,
    integrity: {
      ok: true,
      repaired: false,
      issues: [],
      removedIndexEntries: [],
      removedOrphanPackKeys: [],
      removedCorruptedPackKeys: [],
      removedOrphanImagePackIds: [],
    },
  }
}

function createFakeRepository(input: {
  snapshot?: CardPackStorageSnapshot
  removeSnapshot?: CardPackStorageSnapshot
  setDisabledSnapshot?: CardPackStorageSnapshot
  commitFails?: boolean
  removeFails?: boolean
  removeFailureCode?: "ROLLBACK_FAILED" | "STORAGE_WRITE_FAILED"
  setDisabledFails?: boolean
} = {}): CardPackRepository & {
  commitCalls: CardImportFinalCommitPlan[]
  removeCalls: string[]
  setPackDisabledCalls: Array<{ packId: string; disabled: boolean }>
} {
  const snapshot = input.snapshot ?? makeSnapshot()
  const removeSnapshot = input.removeSnapshot ?? snapshot
  const setDisabledSnapshot = input.setDisabledSnapshot ?? snapshot
  const commitCalls: CardImportFinalCommitPlan[] = []
  const removeCalls: string[] = []
  const setPackDisabledCalls: Array<{ packId: string; disabled: boolean }> = []

  return {
    commitCalls,
    removeCalls,
    setPackDisabledCalls,
    loadSnapshot: vi.fn(async () => snapshot),
    ensureIntegrity: vi.fn(async () => snapshot.integrity),
    commitImport: vi.fn(async (plan: CardImportFinalCommitPlan): Promise<CardPackStorageTransactionResult> => {
      commitCalls.push(plan)
      if (input.commitFails) {
        return {
          ok: false,
          error: { code: "STORAGE_WRITE_FAILED", message: "Unable to write card pack." },
          issues: [],
        }
      }

      return {
        ok: true,
        snapshot: {
          ...snapshot,
          packs: new Map([
            ...snapshot.packs,
            [
              plan.packId,
              {
                packId: plan.packId,
                importedAt: plan.importedAt,
                disabled: plan.disabled,
                source: plan.source,
                templateIds: plan.templateIds,
                imageTemplateIds: plan.assets.cardImages.map((asset) => asset.templateId),
              },
            ],
          ]),
          packCount: snapshot.packCount + 1,
        },
        issues: [],
      }
    }),
    removePack: vi.fn(async (packId: string): Promise<CardPackStorageTransactionResult> => {
      removeCalls.push(packId)
      if (input.removeFails) {
        return {
          ok: false,
          error: {
            code: input.removeFailureCode ?? "ROLLBACK_FAILED",
            message: "Unable to remove card pack.",
          },
          issues: [],
        }
      }

      return { ok: true, snapshot: removeSnapshot, issues: [] }
    }),
    setPackDisabled: vi.fn(async (packId: string, disabled: boolean): Promise<CardPackStorageTransactionResult> => {
      setPackDisabledCalls.push({ packId, disabled })
      if (input.setDisabledFails) {
        return {
          ok: false,
          error: { code: "STORAGE_WRITE_FAILED", message: "Unable to update card pack disabled state." },
          issues: [],
        }
      }

      return { ok: true, snapshot: setDisabledSnapshot, issues: [] }
    }),
  }
}

function createFakeRuntimeRefresh(input: { fail?: boolean } = {}): CardRuntimeRefreshAdapter & {
  calls: CardPackStorageSnapshot[]
} {
  const calls: CardPackStorageSnapshot[] = []

  return {
    calls,
    refresh: vi.fn(async (snapshot: CardPackStorageSnapshot): Promise<CardRuntimeRefreshResult> => {
      calls.push(snapshot)
      if (input.fail) {
        return {
          ok: false,
          diagnostic: { code: "RUNTIME_REFRESH_FAILED", message: "Card runtime refresh failed." },
        }
      }
      return { ok: true }
    }),
  }
}

describe("card pack application service", () => {
  it("does not commit storage in dryRun mode", async () => {
    const repository = createFakeRepository()
    const service = createCardPackApplicationService({
      repository,
      runtimeRefresh: createFakeRuntimeRefresh(),
      builtinTemplateIds: new Set(),
      createPackId: () => "batch_1",
      now: () => FIXED_NOW,
      random: () => 0.123456,
    })

    const result = await service.importFromSource(validCardSource(), { mode: "dryRun" })

    expect(result.success).toBe(true)
    expect(result.storageCommitted).toBeUndefined()
    expect(repository.commitCalls).toHaveLength(0)
  })

  it("does not load storage snapshot in dryRun mode", async () => {
    const repository = createFakeRepository({
      snapshot: makeSnapshot({ templateIds: ["warrior"] }),
    })
    const service = createCardPackApplicationService({
      repository,
      runtimeRefresh: createFakeRuntimeRefresh(),
      builtinTemplateIds: new Set(),
      createPackId: () => "batch_1",
      now: () => FIXED_NOW,
      random: () => 0.123456,
    })

    const result = await service.importFromSource(validCardSource(), { mode: "dryRun" })

    expect(result.success).toBe(true)
    expect(result.stage).toBe("stageImportData")
    expect(result.storageCommitted).toBeUndefined()
    expect(repository.loadSnapshot).not.toHaveBeenCalled()
    expect(repository.commitCalls).toHaveLength(0)
  })

  it("builds a final commit plan and refreshes runtime on commit", async () => {
    const repository = createFakeRepository()
    const runtimeRefresh = createFakeRuntimeRefresh()
    const service = createCardPackApplicationService({
      repository,
      runtimeRefresh,
      builtinTemplateIds: new Set(),
      createPackId: () => "batch_1",
      now: () => FIXED_NOW,
      random: () => 0.123456,
    })

    const result = await service.importFromSource(validCardSource(), { mode: "commit" })

    expect(result.success).toBe(true)
    expect(result.storageCommitted).toBe(true)
    expect(repository.commitCalls[0]).toMatchObject({
      packId: "batch_1",
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
    const runtimeRefresh = createFakeRuntimeRefresh({ fail: true })
    const service = createCardPackApplicationService({
      repository,
      runtimeRefresh,
      builtinTemplateIds: new Set(),
      createPackId: () => "batch_1",
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
      createPackId: () => "batch_1",
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
      createPackId: () => "batch_1",
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
      createPackId: () => "batch_1",
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
      createPackId: () => "batch_1",
      now: () => FIXED_NOW,
      random: () => 0.123456,
    })

    const result = await service.importFromSource(validCardSource(), { mode: "commit" })

    expect(result.success).toBe(false)
    expect(result.stage).toBe("storageTransaction")
    expect(runtimeRefresh.calls).toHaveLength(0)
  })

  it("removes a pack and refreshes runtime with the returned snapshot", async () => {
    const removeSnapshot = makeSnapshot({ packId: "batch_remaining", templateIds: ["remaining"] })
    const repository = createFakeRepository({ removeSnapshot })
    const runtimeRefresh = createFakeRuntimeRefresh()
    const service = createCardPackApplicationService({
      repository,
      runtimeRefresh,
      builtinTemplateIds: new Set(),
      createPackId: () => "batch_1",
      now: () => FIXED_NOW,
      random: () => 0.123456,
    })

    const result = await service.removePack("batch_removed")

    expect(result.success).toBe(true)
    expect(result.stage).toBe("runtimeRefresh")
    expect(result.storageCommitted).toBe(true)
    expect(result.snapshot).toBe(removeSnapshot)
    expect(repository.removeCalls).toEqual(["batch_removed"])
    expect(runtimeRefresh.calls).toEqual([removeSnapshot])
  })

  it("returns removePack storage failures without refreshing runtime", async () => {
    const repository = createFakeRepository({ removeFails: true, removeFailureCode: "STORAGE_WRITE_FAILED" })
    const runtimeRefresh = createFakeRuntimeRefresh()
    const service = createCardPackApplicationService({
      repository,
      runtimeRefresh,
      builtinTemplateIds: new Set(),
      createPackId: () => "batch_1",
      now: () => FIXED_NOW,
      random: () => 0.123456,
    })

    const result = await service.removePack("batch_removed")

    expect(result.success).toBe(false)
    expect(result.stage).toBe("storageTransaction")
    expect(result.storageCommitted).toBe(false)
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "STORAGE_WRITE_FAILED" }))
    expect(repository.removeCalls).toEqual(["batch_removed"])
    expect(runtimeRefresh.calls).toHaveLength(0)
  })

  it("reports runtime refresh failures after removePack storage succeeds", async () => {
    const removeSnapshot = makeSnapshot({ packId: "batch_remaining", templateIds: ["remaining"] })
    const repository = createFakeRepository({ removeSnapshot })
    const runtimeRefresh = createFakeRuntimeRefresh({ fail: true })
    const service = createCardPackApplicationService({
      repository,
      runtimeRefresh,
      builtinTemplateIds: new Set(),
      createPackId: () => "batch_1",
      now: () => FIXED_NOW,
      random: () => 0.123456,
    })

    const result = await service.removePack("batch_removed")

    expect(result.success).toBe(false)
    expect(result.stage).toBe("runtimeRefresh")
    expect(result.storageCommitted).toBe(true)
    expect(result.snapshot).toBe(removeSnapshot)
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "RUNTIME_REFRESH_FAILED" }))
    expect(repository.removeCalls).toEqual(["batch_removed"])
    expect(runtimeRefresh.calls).toEqual([removeSnapshot])
  })

  it("sets pack disabled state and refreshes runtime with the returned snapshot", async () => {
    const setDisabledSnapshot = makeSnapshot({ packId: "batch_existing", templateIds: ["warrior"] })
    const repository = createFakeRepository({ setDisabledSnapshot })
    const runtimeRefresh = createFakeRuntimeRefresh()
    const service = createCardPackApplicationService({
      repository,
      runtimeRefresh,
      builtinTemplateIds: new Set(),
      createPackId: () => "batch_1",
      now: () => FIXED_NOW,
      random: () => 0.123456,
    })

    const result = await service.setPackDisabled("batch_existing", true)

    expect(result.success).toBe(true)
    expect(result.stage).toBe("runtimeRefresh")
    expect(result.storageCommitted).toBe(true)
    expect(result.snapshot).toBe(setDisabledSnapshot)
    expect(repository.setPackDisabledCalls).toEqual([{ packId: "batch_existing", disabled: true }])
    expect(runtimeRefresh.calls).toEqual([setDisabledSnapshot])
  })

  it("returns setPackDisabled storage failures without refreshing runtime", async () => {
    const repository = createFakeRepository({ setDisabledFails: true })
    const runtimeRefresh = createFakeRuntimeRefresh()
    const service = createCardPackApplicationService({
      repository,
      runtimeRefresh,
      builtinTemplateIds: new Set(),
      createPackId: () => "batch_1",
      now: () => FIXED_NOW,
      random: () => 0.123456,
    })

    const result = await service.setPackDisabled("batch_existing", true)

    expect(result.success).toBe(false)
    expect(result.stage).toBe("storageTransaction")
    expect(result.storageCommitted).toBe(false)
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "STORAGE_WRITE_FAILED" }))
    expect(repository.setPackDisabledCalls).toEqual([{ packId: "batch_existing", disabled: true }])
    expect(runtimeRefresh.calls).toHaveLength(0)
  })

  it("reports runtime refresh failures after setPackDisabled storage succeeds", async () => {
    const setDisabledSnapshot = makeSnapshot({ packId: "batch_existing", templateIds: ["warrior"] })
    const repository = createFakeRepository({ setDisabledSnapshot })
    const runtimeRefresh = createFakeRuntimeRefresh({ fail: true })
    const service = createCardPackApplicationService({
      repository,
      runtimeRefresh,
      builtinTemplateIds: new Set(),
      createPackId: () => "batch_1",
      now: () => FIXED_NOW,
      random: () => 0.123456,
    })

    const result = await service.setPackDisabled("batch_existing", false)

    expect(result.success).toBe(false)
    expect(result.stage).toBe("runtimeRefresh")
    expect(result.storageCommitted).toBe(true)
    expect(result.snapshot).toBe(setDisabledSnapshot)
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "RUNTIME_REFRESH_FAILED" }))
    expect(repository.setPackDisabledCalls).toEqual([{ packId: "batch_existing", disabled: false }])
    expect(runtimeRefresh.calls).toEqual([setDisabledSnapshot])
  })
})
