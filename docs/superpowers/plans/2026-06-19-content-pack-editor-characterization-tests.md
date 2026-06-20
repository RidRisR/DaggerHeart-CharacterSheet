# Content Pack Editor Characterization Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freeze the current `/card-editor` card/equipment draft import, export, image-side-effect, validation, and metadata-copy behavior before the layered refactor changes behavior.

**Architecture:** This phase adds characterization tests only. Tests should record current behavior without treating every behavior as a permanent product rule; production code changes are out of scope unless a test requires a tiny testability-only adjustment and that adjustment is reviewed first.

**Tech Stack:** Next.js app code, Vitest, happy-dom, Testing Library, Zustand stores, JSZip.

---

## Scope Rules

- Do not implement the new shared validation view model in this phase.
- Do not change dry-run semantics in this phase.
- Do not delete `app/card-editor/services/validation-service.ts` or `app/card-editor/services/error-message-mapper.ts` in this phase.
- Do not start `pnpm dev`, `pnpm start`, or any long-running server.
- Every task should add tests first and run the scoped command listed in that task.
- Test names should use wording like `records current ... behavior` when the behavior is only being frozen for later review.

## Subagent Execution Contract

- The controller must provide each fresh subagent the full task text, file list, scope rules, and relevant existing-file snippets.
- Subagents must not modify this plan file.
- Subagents must not touch files outside the task's **Files** list.
- Subagents must run only the listed focused command for their task unless a listed command fails because of setup, in which case they must report the failure and the smallest corrected command.
- If observed current behavior differs from this plan, subagents must stop and report the observed behavior instead of changing production code to fit the plan.
- The controller should commit this plan before implementation so execution agents all work from the same written plan.

## File Map

- Create `app/card-editor/utils/__tests__/import-export-characterization.test.ts`
  - Characterizes JSON import recovery helpers, JSON import image clearing, and JSON export payload cleanup.
- Create `app/card-editor/utils/__tests__/zip-import-export-characterization.test.ts`
  - Characterizes legacy DHCB zip import/export image behavior and exported `cards.json` payload.
- Create `app/card-editor/store/__tests__/card-editor-store-characterization.test.ts`
  - Characterizes current card editor store image side effects, old validation service calls, field validation, and export after failed validation.
- Modify `app/card-editor/equipment/__tests__/equipment-import-export.test.ts`
  - Strengthens equipment export JSON shape coverage.
- Modify `app/card-editor/equipment/__tests__/equipment-validation.test.ts`
  - Strengthens current validation source coverage: editor validation sends export JSON to application-service dry-run.
- Existing: `app/card-editor/equipment/__tests__/equipment-editor-store.test.ts`
  - Already characterizes equipment import replacement; include it in final verification.
- Modify `app/card-editor/__tests__/equipment-editor-page.test.tsx`
  - Adds metadata copy wiring coverage between card and equipment drafts and export after failed validation.

## Task 1: Card JSON Import/Export Characterization

**Files:**
- Create: `app/card-editor/utils/__tests__/import-export-characterization.test.ts`

- [ ] **Step 1: Add the characterization test file**

Use this file as the starting point:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CardPackageState } from "../../types";
import {
  ensureAncestryPairs,
  ensureSubclassTriples,
  exportCardPackage,
  importCardPackage,
} from "../import-export";

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

const clearAllEditorImages = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("sonner", () => ({ toast }));
vi.mock("../image-db-helpers", () => ({ clearAllEditorImages }));

function selectNextFile(file: File) {
  const originalCreateElement = document.createElement.bind(document);

  vi.spyOn(document, "createElement").mockImplementation(
    (tagName: string, options?: ElementCreationOptions) => {
      const element = originalCreateElement(tagName, options);

      if (tagName.toLowerCase() === "input") {
        Object.defineProperty(element, "files", {
          configurable: true,
          value: [file],
        });
        vi.spyOn(element, "click").mockImplementation(() => {
          element.dispatchEvent(new Event("change", { bubbles: true }));
        });
      }

      if (tagName.toLowerCase() === "a") {
        vi.spyOn(element as HTMLAnchorElement, "click").mockImplementation(
          () => undefined,
        );
      }

      return element;
    },
  );
}

function packageBase(): CardPackageState {
  return {
    name: "旧行为测试包",
    version: "1.0.0",
    description: "描述",
    author: "作者",
    customFieldDefinitions: {
      professions: ["自定义职业字段"],
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
    isModified: true,
    lastSaved: new Date("2026-06-19T00:00:00.000Z"),
  };
}

describe("card editor import/export characterization", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("records current JSON import recovery completing a single ancestry card into a pair", () => {
    const result = ensureAncestryPairs(
      [
        {
          id: "ancestry-a-1",
          名称: "星裔能力1",
          种族: "星裔",
          简介: "观星者",
          类别: 1,
          效果: "基础能力",
        } as never,
      ],
      packageBase(),
    );

    expect(result).toHaveLength(2);
    expect(result.map((card) => card.类别)).toEqual([1, 2]);
    expect(result[1]).toMatchObject({
      名称: "星裔能力2",
      种族: "星裔",
      简介: "观星者",
      类别: 2,
      效果: "进阶能力效果",
    });
  });

  it("records current JSON import recovery completing a single subclass card into a triple", () => {
    const result = ensureSubclassTriples(
      [
        {
          id: "subclass-a",
          名称: "星术师基石",
          子职业: "星术师",
          主职: "法师",
          等级: "基石",
          描述: "基石能力",
          施法: "灵巧",
        } as never,
      ],
      packageBase(),
    );

    expect(result).toHaveLength(3);
    expect(result.map((card) => card.等级)).toEqual(["基石", "专精", "大师"]);
    expect(result[1]).toMatchObject({
      名称: "星术师专精",
      子职业: "星术师",
      主职: "法师",
      等级: "专精",
      描述: "专精等级能力描述",
    });
    expect(result[2]).toMatchObject({
      名称: "星术师大师",
      子职业: "星术师",
      主职: "法师",
      等级: "大师",
      描述: "大师等级能力描述",
    });
  });

  it("records current JSON import clearing editor images before recovering the draft", async () => {
    const file = new File(
      [
        JSON.stringify({
          name: "导入卡牌包",
          author: "导入作者",
          ancestry: [
            {
              id: "ancestry-a-1",
              名称: "星裔能力1",
              种族: "星裔",
              简介: "观星者",
              类别: 1,
              效果: "基础能力",
            },
          ],
          subclass: [
            {
              id: "subclass-a",
              名称: "星术师基石",
              子职业: "星术师",
              主职: "法师",
              等级: "基石",
              描述: "基石能力",
            },
          ],
        }),
      ],
      "cards.json",
      { type: "application/json" },
    );
    selectNextFile(file);

    const imported = await importCardPackage();

    expect(clearAllEditorImages).toHaveBeenCalledTimes(1);
    expect(imported).toMatchObject({
      name: "导入卡牌包",
      author: "导入作者",
      isModified: false,
    });
    expect(imported?.ancestry).toHaveLength(2);
    expect(imported?.subclass).toHaveLength(3);
    expect(toast.success).toHaveBeenCalledWith("卡牌包已导入");
  });

  it("records current legacy JSON export removing editor-only state and preserving legacy field groups", async () => {
    let exportedBlob: Blob | undefined;
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
      exportedBlob = blob as Blob;
      return "blob:card-json";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      () => undefined,
    );

    const data = {
      ...packageBase(),
      profession: [{ id: "prof-a", 名称: "战士" } as never],
    };

    await exportCardPackage(data, false);

    expect(exportedBlob).toBeDefined();
    const exported = JSON.parse(await exportedBlob!.text());
    expect(exported).toMatchObject({
      name: "旧行为测试包",
      profession: [{ id: "prof-a", 名称: "战士" }],
      customFieldDefinitions: {
        professions: ["自定义职业字段"],
      },
    });
    expect(exported).not.toHaveProperty("isModified");
    expect(exported).not.toHaveProperty("lastSaved");
    expect(toast.success).toHaveBeenCalledWith("卡牌包已导出");
  });
});
```

- [ ] **Step 2: Run the focused test**

Run:

```bash
pnpm test:run app/card-editor/utils/__tests__/import-export-characterization.test.ts
```

Expected: the new characterization tests pass against current behavior. If a test fails because current behavior differs from the plan, stop and report the observed behavior rather than changing production code.

- [ ] **Step 3: Commit**

```bash
git add app/card-editor/utils/__tests__/import-export-characterization.test.ts
git commit -m "test: characterize card editor json import export behavior"
```

## Task 2: Card DHCB Import/Export Characterization

**Files:**
- Create: `app/card-editor/utils/__tests__/zip-import-export-characterization.test.ts`

- [ ] **Step 1: Add the DHCB zip characterization tests**

Use this file as the starting point:

```ts
import JSZip from "jszip";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CardPackageState } from "../../types";
import { exportCardPackageWithImages } from "../zip-export";
import { importCardPackageWithImages } from "../zip-import";

const getAllEditorImageKeys = vi.hoisted(() => vi.fn<() => Promise<string[]>>());
const getImageBlobFromDB = vi.hoisted(
  () => vi.fn<(cardId: string) => Promise<Blob | null>>(),
);
const clearAllEditorImages = vi.hoisted(() => vi.fn(async () => undefined));
const saveImageToDB = vi.hoisted(
  () => vi.fn<(cardId: string, blob: Blob) => Promise<void>>(async () => undefined),
);

vi.mock("../image-db-helpers", () => ({
  getAllEditorImageKeys,
  getImageBlobFromDB,
  clearAllEditorImages,
  saveImageToDB,
}));

function packageWithImages(): CardPackageState {
  return {
    name: "图片包",
    version: "1.0.0",
    description: "描述",
    author: "作者",
    customFieldDefinitions: {
      professions: [],
      ancestries: [],
      communities: [],
      domains: [],
      variants: [],
    },
    profession: [
      {
        id: "card-with-image",
        名称: "带图职业",
        imageUrl: "https://example.test/card.png",
      } as never,
      {
        id: "card-without-image",
        名称: "远程图职业",
        imageUrl: "https://example.test/remote.png",
      } as never,
    ],
    ancestry: [],
    community: [],
    subclass: [],
    domain: [],
    variant: [],
    isModified: true,
    lastSaved: new Date("2026-06-19T00:00:00.000Z"),
  };
}

describe("card editor DHCB import/export characterization", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("records current DHCB export filtering orphan images and omitting imageUrl for packaged images", async () => {
    getAllEditorImageKeys.mockResolvedValue(["card-with-image", "orphan-image"]);
    const imageBytes = Object.assign(new Uint8Array([1, 2, 3]), {
      type: "image/png",
    }) as unknown as Blob;
    getImageBlobFromDB.mockImplementation(async (cardId) =>
      cardId === "card-with-image"
        ? imageBytes
        : null,
    );

    const blob = await exportCardPackageWithImages(packageWithImages(), "图片包");
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const cardsJson = JSON.parse(await zip.file("cards.json")!.async("text"));

    expect(zip.file("manifest.json")).not.toBeNull();
    expect(zip.file("images/card-with-image.png")).not.toBeNull();
    expect(zip.file("images/orphan-image.png")).toBeNull();
    expect(cardsJson).not.toHaveProperty("isModified");
    expect(cardsJson).not.toHaveProperty("lastSaved");
    expect(cardsJson.profession[0]).toMatchObject({
      id: "card-with-image",
      hasLocalImage: true,
    });
    expect(cardsJson.profession[0]).not.toHaveProperty("imageUrl");
    expect(cardsJson.profession[1]).toMatchObject({
      id: "card-without-image",
      imageUrl: "https://example.test/remote.png",
    });
  });

  it("records current DHCB import clearing editor images, saving packaged images, and marking matching cards", async () => {
    const zip = new JSZip();
    zip.file(
      "cards.json",
      JSON.stringify({
        name: "导入图片包",
        author: "作者",
        profession: [
          { id: "card-with-image", 名称: "带图职业", hasLocalImage: false },
          { id: "card-without-image", 名称: "无图职业", hasLocalImage: false },
        ],
        ancestry: [
          {
            id: "ancestry-a-1",
            名称: "星裔能力1",
            种族: "星裔",
            简介: "观星者",
            类别: 1,
          },
        ],
        subclass: [],
      }),
    );
    zip.file("images/card-with-image.png", new Uint8Array([1, 2, 3]));

    const file = (await zip.generateAsync({ type: "arraybuffer" })) as unknown as File;

    const imported = await importCardPackageWithImages(file);

    expect(clearAllEditorImages).toHaveBeenCalledTimes(1);
    expect(saveImageToDB).toHaveBeenCalledWith(
      "card-with-image",
      expect.any(Blob),
    );
    expect(imported.profession[0]).toMatchObject({
      id: "card-with-image",
      hasLocalImage: true,
    });
    expect(imported.profession[1]).toMatchObject({
      id: "card-without-image",
      hasLocalImage: false,
    });
    expect(imported.ancestry).toHaveLength(2);
    expect(imported.isModified).toBe(false);
    expect(imported.lastSaved).toBeInstanceOf(Date);
  });

  it("records current DHCB import saving orphan images without adding cards", async () => {
    const zip = new JSZip();
    zip.file(
      "cards.json",
      JSON.stringify({
        name: "孤儿图片包",
        profession: [{ id: "card-a", 名称: "职业" }],
        ancestry: [],
        subclass: [],
      }),
    );
    zip.file("images/orphan.png", new Uint8Array([4, 5, 6]));

    const file = (await zip.generateAsync({ type: "arraybuffer" })) as unknown as File;

    const imported = await importCardPackageWithImages(file);

    expect(saveImageToDB).toHaveBeenCalledWith("orphan", expect.any(Blob));
    expect(imported.profession).toEqual([
      expect.objectContaining({ id: "card-a" }),
    ]);
    expect(imported.profession).toHaveLength(1);
  });

  it("records current DHCB import continuing when image persistence fails", async () => {
    saveImageToDB.mockRejectedValueOnce(new Error("save failed"));
    const zip = new JSZip();
    zip.file(
      "cards.json",
      JSON.stringify({
        name: "图片失败包",
        profession: [{ id: "card-with-image", 名称: "职业", hasLocalImage: false }],
        ancestry: [],
        subclass: [],
      }),
    );
    zip.file("images/card-with-image.png", new Uint8Array([7, 8, 9]));

    const file = (await zip.generateAsync({ type: "arraybuffer" })) as unknown as File;

    const imported = await importCardPackageWithImages(file);

    expect(imported.profession[0]).toMatchObject({
      id: "card-with-image",
      hasLocalImage: false,
    });
  });
});
```

- [ ] **Step 2: Run the focused test**

Run:

```bash
pnpm test:run app/card-editor/utils/__tests__/zip-import-export-characterization.test.ts
```

Expected: tests pass and confirm current DHCB payload and image behavior. In happy-dom, tests must use `Uint8Array` for ZIP entry payloads and `arrayBuffer` for generated ZIP input; do not change production code.

- [ ] **Step 3: Commit**

```bash
git add app/card-editor/utils/__tests__/zip-import-export-characterization.test.ts
git commit -m "test: characterize card editor dhcb image behavior"
```

## Task 3: Card Editor Store Image Side-Effect Characterization

**Files:**
- Create: `app/card-editor/store/__tests__/card-editor-store-characterization.test.ts`

- [ ] **Step 1: Add store characterization tests**

Use this file as the starting point:

```ts
import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildCardId } from "../../utils/id-generator";
import { defaultPackage } from "../../types";
import { useCardEditorStore } from "../card-editor-store";

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

const clearAllEditorImages = vi.hoisted(() => vi.fn(async () => undefined));
const renameImageKey = vi.hoisted(
  () => vi.fn(async (_oldId: string, _newId: string) => true),
);
const deleteImageFromDB = vi.hoisted(
  () => vi.fn(async (_cardId: string) => undefined),
);
const exportCardPackage = vi.hoisted(() => vi.fn());
const importCardPackage = vi.hoisted(() => vi.fn(async () => null));
const validatePackage = vi.hoisted(() => vi.fn());
const validateCardField = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({ toast }));
vi.mock("../../utils/image-db-helpers", () => ({
  clearAllEditorImages,
  renameImageKey,
  deleteImageFromDB,
}));
vi.mock("../../utils/import-export", () => ({
  exportCardPackage,
  importCardPackage,
}));
vi.mock("../../services/validation-service", () => ({
  validationService: {
    validatePackage,
    validateCardField,
  },
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
    vi.restoreAllMocks();
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

  it("records current grouped delete behavior deleting all ancestry pair and subclass triple images", async () => {
    useCardEditorStore.setState({
      packageData: {
        ...defaultPackage,
        ancestry: [
          { id: "ancestry-1", 种族: "星裔", 简介: "观星者", 类别: 1 } as never,
          { id: "ancestry-2", 种族: "星裔", 简介: "观星者", 类别: 2 } as never,
        ],
        subclass: [
          { id: "subclass-1", 子职业: "星术师", 主职: "法师", 等级: "基石" } as never,
          { id: "subclass-2", 子职业: "星术师", 主职: "法师", 等级: "专精" } as never,
          { id: "subclass-3", 子职业: "星术师", 主职: "法师", 等级: "大师" } as never,
        ],
      },
    });

    useCardEditorStore.getState().deleteAncestryPair(0);
    useCardEditorStore.getState().deleteSubclassTriple(0);

    await waitFor(() => {
      expect(deleteImageFromDB).toHaveBeenCalledWith("ancestry-1");
      expect(deleteImageFromDB).toHaveBeenCalledWith("ancestry-2");
      expect(deleteImageFromDB).toHaveBeenCalledWith("subclass-1");
      expect(deleteImageFromDB).toHaveBeenCalledWith("subclass-2");
      expect(deleteImageFromDB).toHaveBeenCalledWith("subclass-3");
    });
  });

  it("records current card validation using the old validation service and storing its result", async () => {
    let resolveValidation:
      | ((value: {
          isValid: false;
          errors: Array<{ path: string; message: string }>;
          totalCards: number;
          errorsByType: Record<string, Array<{ path: string; message: string }>>;
          summary: { totalErrors: number; errorsByType: Record<string, number> };
        }) => void)
      | undefined;
    const validationResult = {
      isValid: false as const,
      errors: [{ path: "profession[0].名称", message: "名称必填" }],
      totalCards: 1,
      errorsByType: {
        profession: [{ path: "profession[0].名称", message: "名称必填" }],
      },
      summary: { totalErrors: 1, errorsByType: { profession: 1 } },
    };
    validatePackage.mockReturnValue(
      new Promise((resolve) => {
        resolveValidation = resolve;
      }),
    );
    useCardEditorStore.setState({
      packageData: {
        ...defaultPackage,
        profession: [{ id: "prof-a", 名称: "" } as never],
      },
    });

    const promise = useCardEditorStore.getState().validatePackage();

    expect(useCardEditorStore.getState().isValidating).toBe(true);
    resolveValidation?.(validationResult);
    await promise;

    expect(validatePackage).toHaveBeenCalledWith(
      expect.objectContaining({
        profession: [expect.objectContaining({ id: "prof-a" })],
      }),
    );
    expect(useCardEditorStore.getState().validationResult).toBe(validationResult);
    expect(useCardEditorStore.getState().isValidating).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("验证失败：发现 1 个错误");
  });

  it("records current field validation delegating to the old validation service", async () => {
    const fieldError = { path: "profession[0].名称", message: "名称必填" };
    validateCardField.mockResolvedValue(fieldError);
    useCardEditorStore.setState({
      packageData: {
        ...defaultPackage,
        profession: [{ id: "prof-a", 名称: "" } as never],
      },
    });

    const result = await useCardEditorStore
      .getState()
      .validateField("profession", 0, "名称");

    expect(result).toBe(fieldError);
    expect(validateCardField).toHaveBeenCalledWith(
      "profession",
      expect.objectContaining({ id: "prof-a" }),
      "名称",
      expect.objectContaining({
        profession: [expect.objectContaining({ id: "prof-a" })],
      }),
    );
  });

  it("records current card export still running when validation has failed", () => {
    useCardEditorStore.setState({
      packageData: {
        ...defaultPackage,
        profession: [{ id: "prof-a", 名称: "" } as never],
      },
      validationResult: {
        isValid: false,
        errors: [{ path: "profession[0].名称", message: "名称必填" }],
        totalCards: 1,
        errorsByType: {
          profession: [{ path: "profession[0].名称", message: "名称必填" }],
        },
        summary: { totalErrors: 1, errorsByType: { profession: 1 } },
      },
    });

    useCardEditorStore.getState().exportPackage();

    expect(exportCardPackage).toHaveBeenCalledWith(
      expect.objectContaining({
        profession: [expect.objectContaining({ id: "prof-a" })],
      }),
    );
  });
});
```

- [ ] **Step 2: Run the focused test**

Run:

```bash
pnpm test:run app/card-editor/store/__tests__/card-editor-store-characterization.test.ts
```

Expected: tests pass. The test file must remove `card-editor-storage` in `beforeEach` before resetting the singleton store state.

- [ ] **Step 3: Commit**

```bash
git add app/card-editor/store/__tests__/card-editor-store-characterization.test.ts
git commit -m "test: characterize card editor store image side effects"
```

## Task 4A: Equipment Export JSON Shape Characterization

**Files:**
- Modify: `app/card-editor/equipment/__tests__/equipment-import-export.test.ts`

- [ ] **Step 1: Strengthen equipment export JSON shape coverage**

Add this test to `equipment-import-export.test.ts`:

```ts
it("records current equipment export as one full equipment-pack v1 JSON payload", () => {
  const result = recoverEquipmentEditorDraft({
    format: "daggerheart.equipment-pack.v1",
    name: "装备包",
    version: "1.0.0",
    author: "作者",
    description: "描述",
    equipment: {
      weapons: [{ id: "weapon", name: "短剑" }],
      armor: [{ id: "armor", name: "皮甲", baseThresholds: {} }],
    },
  });

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  expect(toEquipmentExportJson(result.draft)).toEqual({
    format: "daggerheart.equipment-pack.v1",
    name: "装备包",
    version: "1.0.0",
    author: "作者",
    description: "描述",
    equipment: {
      weapons: [
        expect.objectContaining({
          id: "weapon",
          name: "短剑",
          modifierContributions: [],
        }),
      ],
      armor: [
        expect.objectContaining({
          id: "armor",
          name: "皮甲",
          baseThresholds: { minor: null, major: null },
          modifierContributions: [],
        }),
      ],
    },
  });
});
```

- [ ] **Step 2: Run focused equipment export tests**

Run:

```bash
pnpm test:run app/card-editor/equipment/__tests__/equipment-import-export.test.ts
```

Expected: the equipment import/export test file passes.

- [ ] **Step 3: Commit**

```bash
git add app/card-editor/equipment/__tests__/equipment-import-export.test.ts
git commit -m "test: characterize equipment editor export shape"
```

## Task 4B: Equipment Validation Dry-Run Source Characterization

**Files:**
- Modify: `app/card-editor/equipment/__tests__/equipment-validation.test.ts`

- [ ] **Step 1: Strengthen equipment validation source coverage**

In `equipment-validation.test.ts`, add a focused test near the existing `adds editor-local duplicate id diagnostics before dry-run diagnostics` case:

```ts
it("records current equipment editor validation sending export JSON to application-service dry-run", async () => {
  const importFromSource = vi.fn().mockResolvedValue({
    success: true,
    stage: "stageImportData",
    mode: "dryRun",
    storageCommitted: false,
    diagnostics: [],
    summary: {
      packId: undefined,
      name: "装备",
      version: "1.0.0",
      author: "作者",
      weaponCount: 1,
      armorCount: 0,
      warningCount: 0,
      errorCount: 0,
    },
  });
  const applicationService = {
    importFromSource,
  } as unknown as EquipmentPackApplicationService;
  const draft: EquipmentEditorDraft = {
    format: "daggerheart.equipment-pack.v1",
    name: "装备",
    version: "1.0.0",
    author: "作者",
    description: "描述",
    equipment: {
      weapons: [
        {
          id: "weapon",
          name: "短剑",
          tier: "T1",
          weaponType: "primary",
          trait: "agility",
          damageType: "physical",
          range: "melee",
          burden: "oneHanded",
          damage: "d8",
          featureName: "",
          description: "",
          modifierContributions: [],
        },
      ],
      armor: [],
    },
  };

  await validateEquipmentEditorDraft(draft, applicationService);

  expect(importFromSource).toHaveBeenCalledTimes(1);
  expect(importFromSource.mock.calls[0][1]).toEqual({ mode: "dryRun" });
  await expect(importFromSource.mock.calls[0][0].read()).resolves.toEqual({
    kind: "parsedObject",
    value: {
      format: "daggerheart.equipment-pack.v1",
      name: "装备",
      version: "1.0.0",
      author: "作者",
      description: "描述",
      equipment: draft.equipment,
    },
  });
});
```

- [ ] **Step 2: Run focused equipment validation tests**

Run:

```bash
pnpm test:run app/card-editor/equipment/__tests__/equipment-validation.test.ts
```

Expected: the equipment validation test file passes.

- [ ] **Step 3: Commit**

```bash
git add app/card-editor/equipment/__tests__/equipment-validation.test.ts
git commit -m "test: characterize equipment editor validation source"
```

## Task 5: Metadata Copy UI Wiring Characterization

**Files:**
- Modify: `app/card-editor/__tests__/equipment-editor-page.test.tsx`

- [ ] **Step 1: Add page-level metadata copy tests**

Update the imports in `equipment-editor-page.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { buildCardId } from "../utils/id-generator";
import { buildStandardEquipmentId } from "../equipment/equipment-id";
```

Update `resetStores()` so persisted card editor state cannot leak between tests:

```tsx
function resetStores() {
  localStorage.removeItem("card-editor-storage");
  // Keep the existing useCardEditorStore.setState(...) and
  // useEquipmentEditorStore.setState(...) reset body below this line.
}
```

Add these tests inside the existing `describe("card editor equipment mode", () => { ... })` block:

```tsx
it("copies card package metadata into the equipment draft after confirmation", async () => {
  const user = userEvent.setup();
  const oldEquipmentId = buildStandardEquipmentId(
    "旧装备包",
    "旧装备作者",
    "weapon",
    "stable-suffix",
  );
  const expectedEquipmentId = buildStandardEquipmentId(
    "卡牌包名",
    "卡牌作者",
    "weapon",
    "stable-suffix",
  );
  useCardEditorStore.setState({
    packageData: {
      ...defaultPackage,
      name: "卡牌包名",
      version: "2.0.0",
      author: "卡牌作者",
      description: "卡牌描述",
    },
  });
  useEquipmentEditorStore.setState({
    draft: {
      ...createDefaultEquipmentDraft(),
      name: "旧装备包",
      author: "旧装备作者",
      equipment: {
        weapons: [
          {
            id: oldEquipmentId,
            name: "旧武器",
            tier: "",
            weaponType: "primary",
            trait: "",
            damageType: "",
            range: "",
            burden: "",
            damage: "",
            featureName: "",
            description: "",
            modifierContributions: [],
          },
        ],
        armor: [],
      },
    },
  });

  render(<CardEditorPage />);

  await user.click(await screen.findByRole("button", { name: "装备" }));
  await user.click(
    screen.getByRole("button", { name: "从卡牌包基础信息复制" }),
  );
  expect(
    await screen.findByText(
      "这会覆盖装备包的名称、版本、作者和描述，并同步更新标准装备 ID 前缀，确定要继续吗？",
    ),
  ).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "确定" }));

  await waitFor(() => {
    expect(useEquipmentEditorStore.getState().draft).toMatchObject({
      name: "卡牌包名",
      version: "2.0.0",
      author: "卡牌作者",
      description: "卡牌描述",
      equipment: {
        weapons: [expect.objectContaining({ id: expectedEquipmentId })],
      },
    });
    expect(toast.success).toHaveBeenCalledWith("已复制卡牌包基础信息");
  });
});

it("copies equipment draft metadata into the card package after confirmation", async () => {
  const user = userEvent.setup();
  const oldCardId = buildCardId(
    "旧卡牌包",
    "旧卡牌作者",
    "profession",
    "stable-suffix",
  );
  const expectedCardId = buildCardId(
    "装备包名",
    "装备作者",
    "profession",
    "stable-suffix",
  );
  useEquipmentEditorStore.setState({
    draft: {
      ...createDefaultEquipmentDraft(),
      name: "装备包名",
      version: "3.0.0",
      author: "装备作者",
      description: "装备描述",
    },
  });
  useCardEditorStore.setState({
    packageData: {
      ...defaultPackage,
      name: "旧卡牌包",
      author: "旧卡牌作者",
      profession: [{ id: oldCardId, 名称: "旧职业" } as never],
    },
  });

  render(<CardEditorPage />);

  await user.click(
    await screen.findByRole("button", {
      name: "从装备包基础信息复制",
    }),
  );
  expect(
    await screen.findByText(
      "这会覆盖卡牌包的名称、版本、作者和描述，并同步更新标准卡牌 ID 前缀，确定要继续吗？",
    ),
  ).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "确定" }));

  await waitFor(() => {
    expect(useCardEditorStore.getState().packageData).toMatchObject({
      name: "装备包名",
      version: "3.0.0",
      author: "装备作者",
      description: "装备描述",
      profession: [expect.objectContaining({ id: expectedCardId })],
    });
    expect(toast.success).toHaveBeenCalledWith("已复制装备包基础信息");
  });
});

it("exports equipment even when the current validation result has errors", async () => {
  const user = userEvent.setup();
  const { downloadEquipmentDraftJson } = await import(
    "../equipment/equipment-import-export"
  );
  useEquipmentEditorStore.setState({
    draft: {
      ...createDefaultEquipmentDraft(),
      equipment: {
        weapons: [
          {
            id: "weapon",
            name: "武器",
            tier: "",
            weaponType: "primary",
            trait: "",
            damageType: "",
            range: "",
            burden: "",
            damage: "",
            featureName: "",
            description: "",
            modifierContributions: [],
          },
        ],
        armor: [],
      },
    },
    validationResult: {
      success: false,
      stage: "structuralValidation",
      mode: "dryRun",
      storageCommitted: false,
      diagnostics: [],
      summary: {
        packId: undefined,
        name: "装备包",
        version: "1.0.0",
        author: "",
        weaponCount: 1,
        armorCount: 0,
        warningCount: 0,
        errorCount: 1,
      },
    },
  });

  render(<CardEditorPage />);

  await user.click(await screen.findByRole("button", { name: "装备" }));
  await user.click(screen.getByRole("button", { name: "导出装备包" }));

  await waitFor(() => {
    expect(downloadEquipmentDraftJson).toHaveBeenCalledWith(
      expect.objectContaining({
        equipment: {
          weapons: [expect.objectContaining({ id: "weapon" })],
          armor: [],
        },
      }),
    );
  });
});
```

- [ ] **Step 2: Run focused page test**

Run:

```bash
pnpm test:run app/card-editor/__tests__/equipment-editor-page.test.tsx
```

Expected: page tests pass. Keep assertions focused on the metadata-copy behavior; do not add broad DOM snapshots.

- [ ] **Step 3: Commit**

```bash
git add app/card-editor/__tests__/equipment-editor-page.test.tsx
git commit -m "test: characterize content pack metadata copy"
```

## Final Verification

- [ ] Run all first-phase editor characterization coverage:

```bash
pnpm test:run app/card-editor/utils/__tests__/import-export-characterization.test.ts app/card-editor/utils/__tests__/zip-import-export-characterization.test.ts app/card-editor/store/__tests__/card-editor-store-characterization.test.ts app/card-editor/equipment/__tests__/equipment-import-export.test.ts app/card-editor/equipment/__tests__/equipment-validation.test.ts app/card-editor/equipment/__tests__/equipment-editor-store.test.ts app/card-editor/__tests__/equipment-editor-page.test.tsx
```

- [ ] Run formatting/patch hygiene check:

```bash
git diff --check
```

- [ ] Confirm the branch has only intentional test changes:

```bash
git status --short -- app/card-editor
```

## First-Phase Completion Gate

After these tests pass, stop before changing behavior. The next discussion should classify the frozen behaviors into:

- keep as long-term regression coverage,
- modify in the refactor with updated expected behavior,
- delete or replace because the new model makes the old behavior obsolete.
