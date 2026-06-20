import JSZip from "jszip"
import { describe, expect, it, vi } from "vitest"
import type { CardPackageState } from "../../types"
import type { CardEditorImageService } from "../card-editor-image-service"
import {
  recoverCardDraftFromDhcbFile,
  recoverCardDraftFromJsonObject,
} from "../card-editor-recovery"

function baseDraft(partial: Partial<CardPackageState>): CardPackageState {
  return {
    name: "Pack",
    version: "1.0.0",
    description: "",
    author: "Author",
    customFieldDefinitions: {
      professions: [],
      ancestries: [],
      communities: [],
      domains: [],
      variants: [],
    },
    profession: [],
    ancestry: [],
    community: [],
    subclass: [],
    domain: [],
    variant: [],
    ...partial,
  }
}

function imageService(overrides: Partial<CardEditorImageService> = {}): CardEditorImageService {
  return {
    listImageKeys: vi.fn(async () => []),
    getImageBlob: vi.fn(async () => null),
    saveImageBlob: vi.fn(async () => undefined),
    clearAllImages: vi.fn(async () => undefined),
    deleteImage: vi.fn(async () => undefined),
    renameImageKey: vi.fn(async () => false),
    cleanupOrphanImages: vi.fn(async () => ({ deleted: [], failed: [] })),
    ...overrides,
  }
}

async function dhcbFile(cardsJson: unknown, images: Record<string, Uint8Array>): Promise<File> {
  const zip = new JSZip()
  zip.file("cards.json", JSON.stringify(cardsJson))

  for (const [path, bytes] of Object.entries(images)) {
    zip.file(path, bytes)
  }

  const content = await zip.generateAsync({ type: "arraybuffer" })
  return new File([content], "cards.dhcb", { type: "application/zip" })
}

describe("card editor draft recovery", () => {
  it("recovers JSON by clearing editor images, repairing the draft, and returning a report", async () => {
    const events: string[] = []
    const service = imageService({
      clearAllImages: vi.fn(async () => {
        events.push("clear")
      }),
    })

    const result = await recoverCardDraftFromJsonObject(
      baseDraft({
        ancestry: [
          {
            id: "ancestry-a-1",
            名称: "星裔能力1",
            种族: "星裔",
            简介: "观星者",
            类别: 1,
            效果: "基础能力",
          } as never,
        ],
      }),
      service,
    )

    expect(service.clearAllImages).toHaveBeenCalledTimes(1)
    expect(events).toEqual(["clear"])
    expect(result.draft.ancestry).toHaveLength(2)
    expect(result.report.repairs).toContainEqual(
      expect.objectContaining({ kind: "ancestryPairCompleted", group: "星裔" }),
    )
    expect(result.report.warnings).toEqual([])
  })

  it("does not clear editor images when JSON recovery fails", async () => {
    const service = imageService()

    await expect(recoverCardDraftFromJsonObject(null, service)).rejects.toThrow()

    expect(service.clearAllImages).not.toHaveBeenCalled()
  })

  it("clears stale local image flags during JSON recovery while preserving other card fields", async () => {
    const events: string[] = []
    const service = imageService({
      clearAllImages: vi.fn(async () => {
        events.push("clear")
      }),
    })

    const result = await recoverCardDraftFromJsonObject(
      baseDraft({
        profession: [
          {
            id: "card-with-stale-image",
            名称: "职业",
            hasLocalImage: true,
            imageUrl: "https://example.test/card.png",
          } as never,
        ],
      }),
      service,
    )

    expect(service.clearAllImages).toHaveBeenCalledTimes(1)
    expect(events).toEqual(["clear"])
    expect(result.draft.profession?.[0]).toMatchObject({
      id: "card-with-stale-image",
      imageUrl: "https://example.test/card.png",
    })
    expect(result.draft.profession?.[0]).not.toHaveProperty("hasLocalImage")
  })

  it("recovers DHCB by saving only images whose ids match current draft card ids after repair", async () => {
    const service = imageService()
    const file = await dhcbFile(
      baseDraft({
        profession: [{ id: "profession-a", 名称: "职业" } as never],
        ancestry: [
          {
            id: "ancestry-a-1",
            名称: "星裔能力1",
            种族: "星裔",
            简介: "观星者",
            类别: 1,
            效果: "基础能力",
          } as never,
        ],
      }),
      {
        "images/profession-a.png": new Uint8Array([1, 2, 3]),
        "images/orphan.png": new Uint8Array([4, 5, 6]),
      },
    )

    const result = await recoverCardDraftFromDhcbFile(file, service)

    expect(service.clearAllImages).toHaveBeenCalledTimes(1)
    expect(service.saveImageBlob).toHaveBeenCalledTimes(1)
    expect(service.saveImageBlob).toHaveBeenCalledWith("profession-a", expect.any(Blob))
    expect(result.draft.ancestry).toHaveLength(2)
    expect(result.draft.profession?.[0]).toMatchObject({
      id: "profession-a",
      hasLocalImage: true,
    })
  })

  it("reports DHCB orphan images and does not save them", async () => {
    const service = imageService()
    const file = await dhcbFile(
      baseDraft({
        profession: [{ id: "card-a", 名称: "职业" } as never],
      }),
      {
        "images/orphan.png": new Uint8Array([4, 5, 6]),
      },
    )

    const result = await recoverCardDraftFromDhcbFile(file, service)

    expect(service.saveImageBlob).not.toHaveBeenCalledWith("orphan", expect.any(Blob))
    expect(result.report.warnings).toContainEqual(
      expect.objectContaining({ kind: "orphanImageSkipped", imageId: "orphan" }),
    )
    expect(result.draft.profession).toEqual([expect.objectContaining({ id: "card-a" })])
  })

  it("clears stale local image flags when no matching DHCB image is saved", async () => {
    const service = imageService()
    const file = await dhcbFile(
      baseDraft({
        profession: [
          {
            id: "card-without-image",
            名称: "职业",
            hasLocalImage: true,
            imageUrl: "https://example.test/card.png",
          } as never,
        ],
      }),
      {},
    )

    const result = await recoverCardDraftFromDhcbFile(file, service)

    expect(result.draft.profession?.[0]).toMatchObject({
      id: "card-without-image",
      imageUrl: "https://example.test/card.png",
    })
    expect(result.draft.profession?.[0]).not.toHaveProperty("hasLocalImage")
  })

  it("reports image persistence failures without blocking DHCB draft recovery", async () => {
    const service = imageService({
      saveImageBlob: vi.fn(async () => {
        throw new Error("save failed")
      }),
    })
    const file = await dhcbFile(
      baseDraft({
        profession: [{ id: "card-with-image", 名称: "职业", hasLocalImage: false } as never],
      }),
      {
        "images/card-with-image.png": new Uint8Array([7, 8, 9]),
      },
    )

    const result = await recoverCardDraftFromDhcbFile(file, service)

    expect(result.draft.profession?.[0]).toMatchObject({
      id: "card-with-image",
    })
    expect(result.draft.profession?.[0]).not.toHaveProperty("hasLocalImage")
    expect(result.report.warnings).toContainEqual(
      expect.objectContaining({
        kind: "imagePersistenceFailed",
        imageId: "card-with-image",
        path: "images/card-with-image.png",
      }),
    )
  })

  it("skips a matching DHCB image entry that cannot be read", async () => {
    const service = imageService()
    const cardsFile = {
      async: vi.fn(async (type: string) => {
        expect(type).toBe("text")
        return JSON.stringify(
          baseDraft({
            profession: [{ id: "card-with-image", 名称: "职业" } as never],
          }),
        )
      }),
    }
    const imageFile = {
      dir: false,
      async: vi.fn(async (type: string) => {
        expect(type).toBe("blob")
        throw new Error("corrupt image entry")
      }),
    }
    const zip = {
      files: {
        "cards.json": { dir: false },
        "images/card-with-image.png": { dir: false },
      },
      file: vi.fn((path: string) => {
        if (path === "cards.json") return cardsFile
        if (path === "images/card-with-image.png") return imageFile
        return null
      }),
    }
    vi.spyOn(JSZip, "loadAsync").mockResolvedValueOnce(zip as never)

    const result = await recoverCardDraftFromDhcbFile(new File(["zip"], "cards.dhcb"), service)

    expect(result.draft.profession?.[0]).toMatchObject({
      id: "card-with-image",
    })
    expect(result.draft.profession?.[0]).not.toHaveProperty("hasLocalImage")
    expect(result.report.warnings).toContainEqual({
      kind: "imagePersistenceFailed",
      imageId: "card-with-image",
      path: "images/card-with-image.png",
    })
    expect(service.clearAllImages).toHaveBeenCalled()
    expect(service.saveImageBlob).not.toHaveBeenCalled()
  })
})
