import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildCardId } from "../../utils/id-generator";
import { defaultPackage } from "../../types";
import { useCardEditorStore } from "../card-editor-store";
import type { CardPackageState } from "../../types";

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

const clearAllEditorImages = vi.hoisted(() => vi.fn(async () => undefined));
const getAllEditorImageKeys = vi.hoisted(() => vi.fn(async () => []));
const getImageBlobFromDB = vi.hoisted(() => vi.fn(async (_cardId: string) => null));
const renameImageKey = vi.hoisted(
  () => vi.fn(async (_oldId: string, _newId: string) => true),
);
const deleteImageFromDB = vi.hoisted(
  () => vi.fn(async (_cardId: string) => undefined),
);
vi.mock("sonner", () => ({ toast }));
vi.mock("../../utils/image-db-helpers", () => ({
  clearAllEditorImages,
  getAllEditorImageKeys,
  getImageBlobFromDB,
  renameImageKey,
  deleteImageFromDB,
}));

function resetCardStore() {
  useCardEditorStore.setState({
    packageData: { ...defaultPackage },
    currentCardIndex: {
      profession: 0,
      ancestry: 0,
      variant: 0,
      community: 0,
      subclass: 0,
      domain: 0,
    },
    previewDialog: { open: false, card: null, type: "" },
    cardListDialog: { open: false, type: "" },
    definitionsDialog: false,
    confirmDialog: {
      open: false,
      title: "",
      message: "",
      onConfirm: () => {},
    },
    validationResult: null,
    isValidating: false,
    imageManager: {
      uploadingImages: new Map(),
      previewCache: new Map(),
      totalImageSize: 0,
    },
  });
}

describe("card editor store characterization", () => {
  beforeEach(() => {
    localStorage.removeItem("card-editor-storage");
    vi.clearAllMocks();
    resetCardStore();
  });

  afterEach(() => {
    localStorage.removeItem("card-editor-storage");
    vi.clearAllMocks();
  });

  it("records current new package flow clearing all editor images after confirmation", async () => {
    useCardEditorStore.setState({
      packageData: {
        ...defaultPackage,
        name: "旧包",
        profession: [{ id: "old-card", 名称: "旧卡" } as never],
      },
    });

    useCardEditorStore.getState().newPackage();

    expect(useCardEditorStore.getState().confirmDialog).toMatchObject({
      open: true,
      title: "创建新卡牌包",
    });

    await useCardEditorStore.getState().confirmDialog.onConfirm();

    expect(clearAllEditorImages).toHaveBeenCalledTimes(1);
    expect(useCardEditorStore.getState().packageData).toMatchObject({
      name: "新建卡牌包",
      profession: [],
    });
    expect(useCardEditorStore.getState().confirmDialog.open).toBe(false);
    expect(toast.success).toHaveBeenCalledWith("已创建新卡牌包");
  });

  it("records current metadata update rewriting standard card ids and migrating editor image keys", async () => {
    const oldId = buildCardId("旧包", "旧作者", "profession", "custom-suffix");
    const expectedNewId = buildCardId(
      "新包",
      "旧作者",
      "profession",
      "custom-suffix",
    );
    useCardEditorStore.setState({
      packageData: {
        ...defaultPackage,
        name: "旧包",
        author: "旧作者",
        profession: [{ id: oldId, 名称: "职业" } as never],
      },
    });

    useCardEditorStore.getState().updateMetadata("name", "新包");

    expect(useCardEditorStore.getState().packageData.profession[0]).toMatchObject({
      id: expectedNewId,
    });
    await waitFor(() => {
      expect(renameImageKey).toHaveBeenCalledWith(oldId, expectedNewId);
    });
  });

  it("records current deleteCard behavior deleting the card image asynchronously", async () => {
    useCardEditorStore.setState({
      packageData: {
        ...defaultPackage,
        profession: [
          { id: "prof-a", 名称: "A" } as never,
          { id: "prof-b", 名称: "B" } as never,
        ],
      },
      currentCardIndex: {
        profession: 1,
        ancestry: 0,
        variant: 0,
        community: 0,
        subclass: 0,
        domain: 0,
      },
    });

    useCardEditorStore.getState().deleteCard("profession", 0);

    expect(useCardEditorStore.getState().packageData.profession).toEqual([
      expect.objectContaining({ id: "prof-b" }),
    ]);
    await waitFor(() => {
      expect(deleteImageFromDB).toHaveBeenCalledWith("prof-a");
    });
  });

  it("records current ancestry pair delete behavior deleting both card images", async () => {
    useCardEditorStore.setState({
      packageData: {
        ...defaultPackage,
        ancestry: [
          { id: "ancestry-1", 种族: "星裔", 简介: "观星者", 类别: 1 } as never,
          { id: "ancestry-2", 种族: "星裔", 简介: "观星者", 类别: 2 } as never,
        ],
      },
    });

    useCardEditorStore.getState().deleteAncestryPair(0);

    expect(useCardEditorStore.getState().packageData.ancestry).toEqual([]);
    await waitFor(() => {
      expect(deleteImageFromDB).toHaveBeenCalledWith("ancestry-1");
      expect(deleteImageFromDB).toHaveBeenCalledWith("ancestry-2");
    });
  });

  it("records current subclass triple delete behavior deleting all three card images", async () => {
    useCardEditorStore.setState({
      packageData: {
        ...defaultPackage,
        subclass: [
          {
            id: "subclass-1",
            子职业: "星术师",
            主职: "法师",
            等级: "基石",
          } as never,
          {
            id: "subclass-2",
            子职业: "星术师",
            主职: "法师",
            等级: "专精",
          } as never,
          {
            id: "subclass-3",
            子职业: "星术师",
            主职: "法师",
            等级: "大师",
          } as never,
        ],
      },
    });

    useCardEditorStore.getState().deleteSubclassTriple(0);

    expect(useCardEditorStore.getState().packageData.subclass).toEqual([]);
    await waitFor(() => {
      expect(deleteImageFromDB).toHaveBeenCalledWith("subclass-1");
      expect(deleteImageFromDB).toHaveBeenCalledWith("subclass-2");
      expect(deleteImageFromDB).toHaveBeenCalledWith("subclass-3");
    });
  });

  it("does not expose the removed field-level validation action", () => {
    expect(useCardEditorStore.getState()).not.toHaveProperty("validateField");
  });

  it("recovers stale local image flags from persisted workspace hydration", async () => {
    const persistedPackageData: CardPackageState = {
      ...defaultPackage,
      profession: [
        {
          id: "persisted-stale-image",
          名称: "Persisted Stale Image",
          hasLocalImage: true,
          imageUrl: "https://example.test/fallback.png",
        } as never,
      ],
    };
    localStorage.setItem(
      "card-editor-storage",
      JSON.stringify({
        state: { packageData: persistedPackageData },
        version: 0,
      }),
    );

    await (useCardEditorStore as unknown as {
      persist: { rehydrate: () => Promise<void> | void };
    }).persist.rehydrate();

    await waitFor(() => {
      expect(getImageBlobFromDB).toHaveBeenCalledWith("persisted-stale-image");
      expect(useCardEditorStore.getState().packageData.profession[0]).toMatchObject({
        id: "persisted-stale-image",
        imageUrl: "https://example.test/fallback.png",
      });
      expect(useCardEditorStore.getState().packageData.profession[0]).not.toHaveProperty("hasLocalImage");
    });
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
  });

  it("does not expose card file action orchestration from the store", () => {
    const state = useCardEditorStore.getState() as unknown as Record<string, unknown>;

    expect(state).not.toHaveProperty("exportPackage");
    expect(state).not.toHaveProperty("importPackage");
    expect(state).not.toHaveProperty("validatePackage");
  });
});
