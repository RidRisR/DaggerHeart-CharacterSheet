import { renderHook, act } from "@testing-library/react";
import JSZip from "jszip";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CardPackageState } from "../../types";
import { defaultPackage } from "../../types";
import { useCardEditorFileActions } from "../use-card-editor-file-actions";

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}));

const recoverCardDraftFromJsonObject = vi.hoisted(() => vi.fn());
const recoverCardDraftFromDhcbFile = vi.hoisted(() => vi.fn());
const createBrowserCardEditorImageService = vi.hoisted(() => vi.fn());
const validateCardEditorDraft = vi.hoisted(() => vi.fn());
const importCardPackFromSource = vi.hoisted(() => vi.fn());
const serializeCardDraftToLegacyJson = vi.hoisted(() => vi.fn());
const createLegacyDhcbView = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({ toast }));
vi.mock("../../services/card-editor-recovery", () => ({
  recoverCardDraftFromJsonObject,
  recoverCardDraftFromDhcbFile,
}));
vi.mock("../../services/card-editor-image-service", () => ({
  createBrowserCardEditorImageService,
}));
vi.mock("../../services/card-editor-validation", () => ({
  validateCardEditorDraft,
}));
vi.mock("@/card/import/import-pipeline", () => ({
  importCardPackFromSource,
}));
vi.mock("../../services/card-draft-serialization", () => ({
  serializeCardDraftToLegacyJson,
  createLegacyDhcbView,
}));

function makeDraft(partial: Partial<CardPackageState> = {}): CardPackageState {
  return {
    ...defaultPackage,
    ...partial,
  };
}

describe("useCardEditorFileActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    createBrowserCardEditorImageService.mockResolvedValue({ kind: "image-service" });
    serializeCardDraftToLegacyJson.mockImplementation((draft) => draft);
    createLegacyDhcbView.mockResolvedValue({ cardsJson: defaultPackage, images: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("surfaces import recovery warnings once and does not send them to validation", async () => {
    const initialDraft = makeDraft({ name: "Current Draft" });
    const importedDraft = makeDraft({ name: "Imported Draft" });
    const validationResult = {
      status: "passed",
      summary: { errorCount: 0, warningCount: 0, checkedItemCount: 0 },
      diagnostics: [],
      groups: { critical: [], warnings: [], bySpecificGroup: {}, byGroupType: {} },
    };
    const replaceDraft = vi.fn();
    const resetCurrentCardIndex = vi.fn();
    const setValidationResult = vi.fn();
    const setIsValidating = vi.fn();
    recoverCardDraftFromJsonObject.mockResolvedValue({
      draft: importedDraft,
      report: {
        repairs: [],
        warnings: [
          { kind: "orphanImageSkipped", imageId: "missing-image", path: "images/missing-image.png" },
          { kind: "imagePersistenceFailed", imageId: "failed-image", path: "images/failed-image.png" },
        ],
      },
    });
    validateCardEditorDraft.mockResolvedValue(validationResult);

    const { result, rerender } = renderHook(
      ({ draft }) =>
        useCardEditorFileActions({
          draft,
          replaceDraft,
          resetCurrentCardIndex,
          setValidationResult,
          setIsValidating,
        }),
      { initialProps: { draft: initialDraft } },
    );

    await act(async () => {
      await result.current.importDraftFromFile(
        new File([JSON.stringify({ name: "Imported Draft" })], "cards.json", {
          type: "application/json",
        }),
      );
    });

    expect(recoverCardDraftFromJsonObject).toHaveBeenCalledWith(
      { name: "Imported Draft" },
      { kind: "image-service" },
    );
    expect(replaceDraft).toHaveBeenCalledWith(importedDraft);
    expect(resetCurrentCardIndex).toHaveBeenCalledOnce();
    expect(toast.warning).toHaveBeenCalledOnce();

    rerender({ draft: importedDraft });

    await act(async () => {
      await result.current.validateDraft();
    });

    expect(validateCardEditorDraft).toHaveBeenCalledWith(importedDraft, {
      imageService: { kind: "image-service" },
      importFromSource: importCardPackFromSource,
    });
    expect(validateCardEditorDraft.mock.calls[0]).toHaveLength(2);
    expect(setValidationResult).toHaveBeenCalledWith(validationResult);
    expect(toast.warning).toHaveBeenCalledOnce();
  });

  it("downloads JSON export and cleans up the anchor and object URL", async () => {
    const draft = makeDraft({ name: "JSON Draft" });
    const click = vi.fn();
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:json-export");
    const revokeObjectURL = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);
    const originalCreateElement = document.createElement.bind(document);

    vi.spyOn(document, "createElement").mockImplementation(
      (tagName: string, options?: ElementCreationOptions) => {
        const element = originalCreateElement(tagName, options);
        if (tagName.toLowerCase() === "a") {
          vi.spyOn(element as HTMLAnchorElement, "click").mockImplementation(click);
        }
        return element;
      },
    );
    serializeCardDraftToLegacyJson.mockReturnValue({
      name: "JSON Draft",
      profession: [{ id: "card-a", 名称: "Card A" }],
    });

    const { result } = renderHook(() =>
      useCardEditorFileActions({
        draft,
        replaceDraft: vi.fn(),
        resetCurrentCardIndex: vi.fn(),
        setValidationResult: vi.fn(),
        setIsValidating: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.exportDraftAsJson();
    });

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:json-export");
    expect(document.querySelector('a[download="JSON Draft.json"]')).toBeNull();
  });

  it("cleans up JSON export downloads even when clicking the anchor fails", async () => {
    const draft = makeDraft({ name: "Throwing Draft" });
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:throwing-json-export");
    const revokeObjectURL = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);
    const originalCreateElement = document.createElement.bind(document);

    vi.spyOn(document, "createElement").mockImplementation(
      (tagName: string, options?: ElementCreationOptions) => {
        const element = originalCreateElement(tagName, options);
        if (tagName.toLowerCase() === "a") {
          vi.spyOn(element as HTMLAnchorElement, "click").mockImplementation(() => {
            throw new Error("click failed");
          });
        }
        return element;
      },
    );

    const { result } = renderHook(() =>
      useCardEditorFileActions({
        draft,
        replaceDraft: vi.fn(),
        resetCurrentCardIndex: vi.fn(),
        setValidationResult: vi.fn(),
        setIsValidating: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.exportDraftAsJson();
    });

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:throwing-json-export");
    expect(document.querySelector('a[download="Throwing Draft.json"]')).toBeNull();
    expect(toast.error).toHaveBeenCalledWith("导出失败");
  });

  it("creates a DHCB ZIP from the serialized view and triggers a .dhcb download", async () => {
    const draft = makeDraft({ name: "DHCB Draft" });
    const imageBlob = new Blob(["image"], { type: "image/png" });
    let downloadedBlob: Blob | undefined;
    const click = vi.fn();
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
      downloadedBlob = blob as Blob;
      return "blob:dhcb-export";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const originalCreateElement = document.createElement.bind(document);

    vi.spyOn(document, "createElement").mockImplementation(
      (tagName: string, options?: ElementCreationOptions) => {
        const element = originalCreateElement(tagName, options);
        if (tagName.toLowerCase() === "a") {
          vi.spyOn(element as HTMLAnchorElement, "click").mockImplementation(click);
        }
        return element;
      },
    );
    createLegacyDhcbView.mockResolvedValue({
      cardsJson: { name: "DHCB Draft", profession: [{ id: "card-a" }] },
      images: [{ cardId: "card-a", blob: imageBlob }],
    });

    const { result } = renderHook(() =>
      useCardEditorFileActions({
        draft,
        replaceDraft: vi.fn(),
        resetCurrentCardIndex: vi.fn(),
        setValidationResult: vi.fn(),
        setIsValidating: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.exportDraftAsDhcb();
    });

    expect(createLegacyDhcbView).toHaveBeenCalledWith(draft, { kind: "image-service" });
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[download="DHCB Draft.dhcb"]')).toBeNull();
    const zip = await JSZip.loadAsync(await downloadedBlob!.arrayBuffer());
    expect(JSON.parse(await zip.file("cards.json")!.async("text"))).toMatchObject({
      name: "DHCB Draft",
      profession: [{ id: "card-a" }],
    });
    expect(zip.file("images/card-a.png")).not.toBeNull();
  });

  it("sets a system validation result and clears validating state when validation throws", async () => {
    const setValidationResult = vi.fn();
    const setIsValidating = vi.fn();
    validateCardEditorDraft.mockRejectedValue(new Error("validation exploded"));

    const { result } = renderHook(() =>
      useCardEditorFileActions({
        draft: makeDraft(),
        replaceDraft: vi.fn(),
        resetCurrentCardIndex: vi.fn(),
        setValidationResult,
        setIsValidating,
      }),
    );

    await act(async () => {
      await result.current.validateDraft();
    });

    expect(setIsValidating).toHaveBeenNthCalledWith(1, true);
    expect(setIsValidating).toHaveBeenLastCalledWith(false);
    expect(setValidationResult).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        diagnostics: [
          expect.objectContaining({
            title: "验证系统错误",
            technical: expect.objectContaining({
              code: "SOURCE_READ_FAILED",
              value: "validation exploded",
            }),
          }),
        ],
      }),
    );
    expect(toast.error).toHaveBeenCalledWith("验证过程中发生错误");
  });

  it("does not replace draft or reset index when import fails", async () => {
    const replaceDraft = vi.fn();
    const resetCurrentCardIndex = vi.fn();

    const { result } = renderHook(() =>
      useCardEditorFileActions({
        draft: makeDraft(),
        replaceDraft,
        resetCurrentCardIndex,
        setValidationResult: vi.fn(),
        setIsValidating: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.importDraftFromFile(
        new File(["not json"], "cards.json", { type: "application/json" }),
      );
    });

    expect(replaceDraft).not.toHaveBeenCalled();
    expect(resetCurrentCardIndex).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("导入失败：文件格式不正确");
  });
});
