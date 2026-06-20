import { describe, expect, it, vi } from "vitest";
import type { CardPackageState } from "../../types";
import type { CardEditorImageService } from "../card-editor-image-service";
import { repairCardEditorDraft } from "../card-draft-repair";
import { recoverPersistedCardEditorWorkspace } from "../card-editor-workspace-recovery";

type LegacyPersistedDraft = CardPackageState & {
  isModified?: boolean;
  lastSaved?: string;
};

const repairCardEditorDraftMock = vi.hoisted(() => vi.fn());

vi.mock("../card-draft-repair", () => ({
  repairCardEditorDraft: repairCardEditorDraftMock,
}));

function baseDraft(partial: Partial<LegacyPersistedDraft> = {}): LegacyPersistedDraft {
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
  };
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
  };
}

describe("persisted card editor workspace recovery", () => {
  it("removes legacy workspace fields and reconciles local image flags against stored blobs", async () => {
    const storedBlob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
    const service = imageService({
      getImageBlob: vi.fn(async (cardId: string) => (cardId === "card-with-blob" ? storedBlob : null)),
    });

    const result = await recoverPersistedCardEditorWorkspace(
      baseDraft({
        isModified: true,
        lastSaved: "2026-06-20T00:00:00.000Z",
        profession: [
          {
            id: "stale-local-image",
            名称: "Stale",
            hasLocalImage: true,
            imageUrl: "https://example.test/stale.png",
          } as never,
          {
            id: "card-with-blob",
            名称: "Stored",
            imageUrl: "https://example.test/remote-fallback.png",
          } as never,
        ],
      }),
      service,
    );

    expect(result.draft).not.toHaveProperty("isModified");
    expect(result.draft).not.toHaveProperty("lastSaved");
    expect(result.draft.profession).toEqual([
      expect.objectContaining({
        id: "stale-local-image",
        imageUrl: "https://example.test/stale.png",
      }),
      expect.objectContaining({
        id: "card-with-blob",
        imageUrl: "https://example.test/remote-fallback.png",
        hasLocalImage: true,
      }),
    ]);
    expect(result.draft.profession[0]).not.toHaveProperty("hasLocalImage");
    expect(result.report).toMatchObject({
      staleLocalImageFlagsRemoved: ["stale-local-image"],
      localImageFlagsConfirmed: ["card-with-blob"],
      legacyEditorFieldsRemoved: ["isModified", "lastSaved"],
    });
    expect(service.getImageBlob).toHaveBeenCalledWith("stale-local-image");
    expect(service.getImageBlob).toHaveBeenCalledWith("card-with-blob");
  });

  it("sets hasLocalImage only when a card id lookup returns a blob", async () => {
    const storedBlob = new Blob([new Uint8Array([4, 5, 6])], { type: "image/png" });
    const service = imageService({
      getImageBlob: vi.fn(async (cardId: string) => (cardId === "domain-with-blob" ? storedBlob : null)),
    });

    const result = await recoverPersistedCardEditorWorkspace(
      baseDraft({
        domain: [
          { id: "domain-with-blob", 名称: "With Blob", hasLocalImage: false } as never,
          { id: "domain-without-blob", 名称: "Without Blob", hasLocalImage: true } as never,
        ],
      }),
      service,
    );

    expect(result.draft.domain).toEqual([
      expect.objectContaining({ id: "domain-with-blob", hasLocalImage: true }),
      expect.objectContaining({ id: "domain-without-blob" }),
    ]);
    expect(result.draft.domain[1]).not.toHaveProperty("hasLocalImage");
    expect(result.report.localImageFlagsConfirmed).toEqual(["domain-with-blob"]);
    expect(result.report.staleLocalImageFlagsRemoved).toEqual(["domain-without-blob"]);
  });

  it("cleans up orphan editor images as best-effort maintenance", async () => {
    const service = imageService({
      cleanupOrphanImages: vi.fn(async () => ({
        deleted: ["old-card-image"],
        failed: ["locked-old-card-image"],
      })),
    });

    const result = await recoverPersistedCardEditorWorkspace(
      baseDraft({
        profession: [{ id: "current-card", 名称: "Current" } as never],
      }),
      service,
    );

    expect(service.cleanupOrphanImages).toHaveBeenCalledWith(new Set(["current-card"]));
    expect(result.report.orphanImagesDeleted).toEqual(["old-card-image"]);
    expect(result.report.orphanImageCleanupFailed).toEqual(["locked-old-card-image"]);
  });

  it("does not block opening the workspace or emit validation diagnostics when image maintenance fails", async () => {
    const service = imageService({
      getImageBlob: vi.fn(async () => {
        throw new Error("image lookup failed");
      }),
      cleanupOrphanImages: vi.fn(async () => {
        throw new Error("orphan cleanup failed");
      }),
    });

    const result = await recoverPersistedCardEditorWorkspace(
      baseDraft({
        profession: [
          {
            id: "lookup-fails",
            名称: "Lookup Fails",
            hasLocalImage: true,
            imageUrl: "https://example.test/fallback.png",
          } as never,
        ],
      }),
      service,
    );

    expect(result.draft.profession[0]).toMatchObject({
      id: "lookup-fails",
      imageUrl: "https://example.test/fallback.png",
    });
    expect(result.draft.profession[0]).not.toHaveProperty("hasLocalImage");
    expect(result.report.imageLookupFailed).toEqual(["lookup-fails"]);
    expect(result.report.orphanImageCleanupFailed).toEqual(["*"]);
    expect(result.report).not.toHaveProperty("diagnostics");
  });

  it("does not repair draft structure and does not clear all editor images", async () => {
    const service = imageService();

    const result = await recoverPersistedCardEditorWorkspace(
      baseDraft({
        ancestry: [
          {
            id: "ancestry-one",
            名称: "Ancestry One",
            种族: "Human",
            简介: "People",
            类别: 1,
          } as never,
        ],
        subclass: [
          {
            id: "subclass-one",
            名称: "Subclass One",
            主职: "Warrior",
            子职业: "Blade",
            等级: "基石",
          } as never,
        ],
      }),
      service,
    );

    expect(result.draft.ancestry).toHaveLength(1);
    expect(result.draft.subclass).toHaveLength(1);
    expect(repairCardEditorDraft).not.toHaveBeenCalled();
    expect(service.clearAllImages).not.toHaveBeenCalled();
  });
});
