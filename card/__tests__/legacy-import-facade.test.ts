import JSZip from "jszip"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { ImportData } from "@/card/card-types"
import { importCustomCards } from "@/card/index-unified"
import type {
  CardPackApplicationImportResult,
  CardPackApplicationService,
} from "@/card/packs/application-service"
import {
  resetDefaultCardPackApplicationServiceFactoryForTests,
  setDefaultCardPackApplicationServiceFactoryForTests,
} from "@/card/packs/default-card-pack-services"
import { importDhcbCardPackage } from "@/card/utils/dhcb-importer"

function createFakeService(input: {
  result: CardPackApplicationImportResult
}): CardPackApplicationService {
  return {
    importFromSource: vi.fn(async () => input.result),
    initialize: vi.fn(),
    loadSnapshot: vi.fn(),
    buildConflictContext: vi.fn(),
    removePack: vi.fn(),
    setPackDisabled: vi.fn(),
  } as unknown as CardPackApplicationService
}

function getFakeService(): CardPackApplicationService {
  return createFakeService({
    result: {
      success: true,
      mode: "commit",
      stage: "runtimeRefresh",
      diagnostics: [],
      storageCommitted: true,
      summary: {
        packId: "batch_test",
        cardCount: 1,
        imageCount: 0,
        warningCount: 0,
        errorCount: 0,
      },
    },
  })
}

function validLegacyImportData(input: { hasLocalImage?: boolean } = {}): ImportData {
  return {
    name: "Shadow Cards",
    customFieldDefinitions: {
      profession: ["Warrior"],
      domain: ["Blade", "Bone"],
    },
    profession: [
      {
        id: "warrior",
        名称: "Warrior",
        简介: "",
        领域1: "Blade",
        领域2: "Bone",
        起始生命: 6,
        起始闪避: 10,
        起始物品: "",
        希望特性: "",
        职业特性: "",
        hasLocalImage: input.hasLocalImage,
      },
    ],
  }
}

async function makeDhcbFile(input: {
  cards: ImportData
  images?: Record<string, string>
}) {
  const zip = new JSZip()
  zip.file("cards.json", JSON.stringify(input.cards))

  for (const [fileName, contents] of Object.entries(input.images ?? {})) {
    zip.file(`images/${fileName}`, contents)
  }

  const blob = await zip.generateAsync({ type: "blob" })
  return new File([blob], "shadow.dhcb", { type: "application/zip" })
}

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
        summary: {
          packId: "batch_test",
          name: "Shadow Cards",
          cardCount: 1,
          imageCount: 0,
          warningCount: 0,
          errorCount: 0,
        },
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

  it("delegates removeCustomCardBatch to the application service", async () => {
    const removePack = vi.fn(async () => ({
      success: true,
      stage: "runtimeRefresh",
      storageCommitted: true,
      diagnostics: [],
    }))

    const service = getFakeService()
    service.removePack = removePack as CardPackApplicationService["removePack"]
    setDefaultCardPackApplicationServiceFactoryForTests(() => service)

    const { removeCustomCardBatch } = await import("@/card/index-unified")
    await expect(removeCustomCardBatch("batch_test")).resolves.toBe(true)
    expect(removePack).toHaveBeenCalledWith("batch_test")
  })

  it("returns false when removeCustomCardBatch service removal fails", async () => {
    const service = getFakeService()
    service.removePack = vi.fn(async () => ({
      success: false,
      stage: "storageTransaction",
      storageCommitted: false,
      diagnostics: [],
    })) as CardPackApplicationService["removePack"]
    setDefaultCardPackApplicationServiceFactoryForTests(() => service)

    const { removeCustomCardBatch } = await import("@/card/index-unified")
    await expect(removeCustomCardBatch("batch_test")).resolves.toBe(false)
  })

  it("delegates toggleBatchDisabled to setPackDisabled with the next disabled state", async () => {
    const loadSnapshot = vi.fn(async () => ({
      packs: new Map([[
        "batch_test",
        {
          packId: "batch_test",
          importedAt: "2026-06-18T00:00:00.000Z",
          disabled: false,
          templateIds: ["warrior"],
          imageTemplateIds: [],
        },
      ]]),
      packCount: 1,
      integrity: {
        ok: true,
        repaired: false,
        issues: [],
        removedIndexEntries: [],
        removedOrphanPackKeys: [],
        removedCorruptedPackKeys: [],
        removedOrphanImagePackIds: [],
      },
    }))
    const setPackDisabled = vi.fn(async () => ({
      success: true,
      stage: "runtimeRefresh",
      storageCommitted: true,
      diagnostics: [],
    }))
    const service = getFakeService()
    service.loadSnapshot = loadSnapshot as CardPackApplicationService["loadSnapshot"]
    service.setPackDisabled = setPackDisabled as CardPackApplicationService["setPackDisabled"]
    setDefaultCardPackApplicationServiceFactoryForTests(() => service)

    const { toggleBatchDisabled } = await import("@/card/index-unified")
    await expect(toggleBatchDisabled("batch_test")).resolves.toBe(true)
    expect(setPackDisabled).toHaveBeenCalledWith("batch_test", true)
  })

  it("returns false when toggleBatchDisabled cannot find the pack", async () => {
    const service = getFakeService()
    service.loadSnapshot = vi.fn(async () => ({
      packs: new Map(),
      packCount: 0,
      integrity: {
        ok: true,
        repaired: false,
        issues: [],
        removedIndexEntries: [],
        removedOrphanPackKeys: [],
        removedCorruptedPackKeys: [],
        removedOrphanImagePackIds: [],
      },
    })) as CardPackApplicationService["loadSnapshot"]
    service.setPackDisabled = vi.fn() as CardPackApplicationService["setPackDisabled"]
    setDefaultCardPackApplicationServiceFactoryForTests(() => service)

    const { toggleBatchDisabled } = await import("@/card/index-unified")
    await expect(toggleBatchDisabled("missing_batch")).resolves.toBe(false)
    expect(service.setPackDisabled).not.toHaveBeenCalled()
  })

  it("returns legacy ImportResult errors for JSON commit failure", async () => {
    setDefaultCardPackApplicationServiceFactoryForTests(() => createFakeService({
      result: {
        success: false,
        mode: "commit",
        stage: "storageTransaction",
        diagnostics: [{ severity: "error", code: "TEMPLATE_ID_CONFLICT", path: "", message: "id conflict" }],
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
        diagnostics: [{ severity: "error", code: "ORPHAN_IMAGE", path: "", message: "孤儿图片" }],
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
        summary: {
          packId: "batch_test",
          name: "Shadow Cards",
          cardCount: 1,
          imageCount: 1,
          warningCount: 0,
          errorCount: 0,
        },
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
