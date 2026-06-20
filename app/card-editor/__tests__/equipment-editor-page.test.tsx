import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EquipmentPackApplicationImportResult } from "@/equipment/packs/application-service";

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

const cardFileActions = vi.hoisted(() => ({
  importDraftFromFile: vi.fn(async () => undefined),
  exportDraftAsJson: vi.fn(async () => undefined),
  exportDraftAsDhcb: vi.fn(async () => undefined),
  validateDraft: vi.fn(async () => undefined),
}));

const useCardEditorFileActions = vi.hoisted(() =>
  vi.fn(() => cardFileActions),
);

const imageDbHelpers = vi.hoisted(() => ({
  saveImageToDB: vi.fn(async () => undefined),
  getImageUrlFromDB: vi.fn(async () => null),
  getImageBlobFromDB: vi.fn(async () => null),
  deleteImageFromDB: vi.fn(async () => undefined),
  hasImageInDB: vi.fn(async () => false),
  getAllEditorImageKeys: vi.fn(async () => []),
  clearAllEditorImages: vi.fn(async () => undefined),
  getTotalEditorImageSize: vi.fn(async () => 0),
  renameImageKey: vi.fn(async () => true),
}));

const imageServiceDatabase = vi.hoisted(() => ({
  db: {
    editorImages: {
      get: vi.fn(async () => null),
      put: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
    },
    transaction: vi.fn(
      async (
        _mode: string,
        _table: unknown,
        callback: () => Promise<void> | void,
      ) => callback(),
    ),
  },
  isIndexedDBAvailable: vi.fn(() => true),
}));

vi.mock("sonner", () => ({ toast }));

vi.mock("../hooks/use-card-editor-file-actions", () => ({
  useCardEditorFileActions,
}));

vi.mock("../utils/image-db-helpers", () => imageDbHelpers);

vi.mock("@/card/stores/image-service/database", () => imageServiceDatabase);

vi.mock("../equipment/equipment-import-export", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../equipment/equipment-import-export")>();

  return {
    ...actual,
    downloadEquipmentDraftJson: vi.fn(),
  };
});

vi.mock("../equipment/equipment-validation", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../equipment/equipment-validation")>();

  return {
    ...actual,
    validateEquipmentEditorDraft: vi.fn(async () => makeSuccessfulValidation()),
  };
});

const { defaultPackage } = await import("../types");
const { useCardEditorStore } = await import("../store/card-editor-store");
const { createDefaultEquipmentDraft } = await import(
  "../equipment/equipment-draft"
);
const { useEquipmentEditorStore } = await import(
  "../equipment/equipment-editor-store"
);
const { buildStandardEquipmentId } = await import("../equipment/equipment-id");
const { buildCardId } = await import("../utils/id-generator");
const { default: CardEditorPage } = await import("../page");

function makeSuccessfulValidation(): EquipmentPackApplicationImportResult {
  return {
    success: true,
    stage: "runtimeCacheBuild",
    mode: "dryRun",
    storageCommitted: false,
    diagnostics: [],
    summary: {
      packId: undefined,
      name: "装备包",
      version: "1.0.0",
      author: "",
      weaponCount: 0,
      armorCount: 0,
      warningCount: 0,
      errorCount: 0,
    },
  };
}

function resetStores() {
  localStorage.removeItem("card-editor-storage");

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

  useEquipmentEditorStore.setState({
    draft: createDefaultEquipmentDraft(),
    selectedTab: "metadata",
    selectedWeaponIndex: 0,
    selectedArmorIndex: 0,
    validationResult: null,
    isValidating: false,
  });
}

function mockNextFileSelection(file: File) {
  const originalCreateElement = document.createElement.bind(document);

  return vi
    .spyOn(document, "createElement")
    .mockImplementation((tagName: string, options?: ElementCreationOptions) => {
      const element = originalCreateElement(tagName, options);

      if (tagName.toLowerCase() === "input") {
        Object.defineProperty(element, "files", {
          configurable: true,
          value: [file],
        });
        vi.spyOn(element, "click").mockImplementation(() => {
          element.onchange?.(new Event("change"));
        });
      }

      return element;
    });
}

describe("card editor equipment mode", () => {
  let restoreFileSelectionMock: (() => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    resetStores();
    restoreFileSelectionMock = null;
  });

  afterEach(() => {
    restoreFileSelectionMock?.();
    localStorage.removeItem("card-editor-storage");
  });

  it("switches toolbar labels to equipment mode and hides card-only keyword action", async () => {
    const user = userEvent.setup();

    render(<CardEditorPage />);

    expect(await screen.findByRole("button", { name: "导出卡牌包" }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "查看关键字列表" }))
      .toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "装备" }));

    expect(screen.getByRole("button", { name: "导出装备包" }))
      .toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "查看关键字列表" }))
      .not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /基础信息/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /武器/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /护甲/ })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /预览/ })).not.toBeInTheDocument();
  });

  it("keeps card mode toolbar actions on the card file action path", async () => {
    const user = userEvent.setup();
    const { downloadEquipmentDraftJson } = await import(
      "../equipment/equipment-import-export"
    );

    render(<CardEditorPage />);

    await user.click(await screen.findByRole("button", { name: "导出卡牌包" }));

    expect(cardFileActions.exportDraftAsDhcb).toHaveBeenCalledOnce();
    expect(downloadEquipmentDraftJson).not.toHaveBeenCalled();
  });

  it("creates a new empty equipment package without asking for confirmation", async () => {
    const user = userEvent.setup();

    render(<CardEditorPage />);

    await user.click(await screen.findByRole("button", { name: "装备" }));
    await user.click(screen.getByRole("button", { name: "新建装备包" }));

    expect(screen.queryByText("创建新装备包")).not.toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith("已创建新装备包");
    expect(useEquipmentEditorStore.getState().draft.equipment.weapons).toEqual(
      [],
    );
  });

  it("does not download equipment JSON when the equipment draft is empty", async () => {
    const user = userEvent.setup();
    const { downloadEquipmentDraftJson } = await import(
      "../equipment/equipment-import-export"
    );

    render(<CardEditorPage />);

    await user.click(await screen.findByRole("button", { name: "装备" }));
    await user.click(screen.getByRole("button", { name: "导出装备包" }));

    expect(toast.error).toHaveBeenCalledWith("没有可导出的装备");
    expect(downloadEquipmentDraftJson).not.toHaveBeenCalled();
  });

  it("exports the full equipment draft once equipment has weapon and armor items", async () => {
    const user = userEvent.setup();
    const { downloadEquipmentDraftJson } = await import(
      "../equipment/equipment-import-export"
    );

    render(<CardEditorPage />);

    await user.click(await screen.findByRole("button", { name: "装备" }));
    await user.click(screen.getByRole("tab", { name: /武器/ }));
    await user.click(screen.getByRole("button", { name: "创建第一件武器" }));
    await user.click(screen.getByRole("tab", { name: /护甲/ }));
    await user.click(screen.getByRole("button", { name: "创建第一件护甲" }));
    await user.click(screen.getByRole("button", { name: "导出装备包" }));

    expect(downloadEquipmentDraftJson).toHaveBeenCalledWith(
      expect.objectContaining({
        equipment: expect.objectContaining({
          weapons: [expect.objectContaining({ weaponType: "primary" })],
          armor: [expect.objectContaining({ baseThresholds: { minor: null, major: null } })],
        }),
      }),
    );
  });

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
    expect(
      await screen.findByRole("heading", { name: "需要修复一些装备问题" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "关闭" }));

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

  it("imports equipment JSON by replacing only the equipment draft after confirmation", async () => {
    const user = userEvent.setup();
    const file = new File(
      [
        JSON.stringify({
          format: "daggerheart.equipment-pack.v1",
          name: "导入装备包",
          version: "2.0.0",
          author: "装备作者",
          description: "导入描述",
          equipment: {
            weapons: [
              {
                id: "imported-weapon",
                name: "导入武器",
                tier: "T1",
                weaponType: "primary",
                trait: "agility",
                damageType: "physical",
                range: "melee",
                burden: "oneHanded",
                damage: "d8",
              },
            ],
            armor: [],
          },
        }),
      ],
      "equipment.json",
      { type: "application/json" },
    );

    const fileSelectionMock = mockNextFileSelection(file);
    restoreFileSelectionMock = () => fileSelectionMock.mockRestore();
    useCardEditorStore.setState({
      packageData: { ...defaultPackage, name: "原卡牌包" },
    });

    render(<CardEditorPage />);

    await user.click(await screen.findByRole("button", { name: "装备" }));
    await user.click(screen.getByRole("tab", { name: /武器/ }));
    await user.click(screen.getByRole("button", { name: "创建第一件武器" }));

    const cardPackageBefore = useCardEditorStore.getState().packageData;

    await user.click(screen.getByRole("button", { name: "导入装备包" }));
    expect(
      await screen.findByText("导入装备包将替换当前装备内容，确定要继续吗？"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(useEquipmentEditorStore.getState().draft.name).toBe("未命名装备包");
    expect(
      useEquipmentEditorStore.getState().draft.equipment.weapons,
    ).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "导入装备包" }));
    await user.click(await screen.findByRole("button", { name: "确定" }));

    expect(useEquipmentEditorStore.getState().draft).toMatchObject({
      name: "导入装备包",
      version: "2.0.0",
      author: "装备作者",
      equipment: {
        weapons: [expect.objectContaining({ name: "导入武器" })],
        armor: [],
      },
    });
    expect(useCardEditorStore.getState().packageData).toEqual(cardPackageBefore);
  });

  it("reports invalid equipment imports without replacing the current draft", async () => {
    const user = userEvent.setup();
    const file = new File(
      [JSON.stringify({ format: "daggerheart.card-pack.v1" })],
      "bad-equipment.json",
      { type: "application/json" },
    );

    const fileSelectionMock = mockNextFileSelection(file);
    restoreFileSelectionMock = () => fileSelectionMock.mockRestore();

    render(<CardEditorPage />);

    await user.click(await screen.findByRole("button", { name: "装备" }));
    await user.click(screen.getByRole("tab", { name: /武器/ }));
    await user.click(screen.getByRole("button", { name: "创建第一件武器" }));
    await user.click(screen.getByRole("button", { name: "导入装备包" }));

    expect(toast.error).toHaveBeenCalledWith(
      "导入失败：不是有效的装备包格式",
    );
    expect(useEquipmentEditorStore.getState().draft.name).toBe("未命名装备包");
    expect(
      useEquipmentEditorStore.getState().draft.equipment.weapons,
    ).toHaveLength(1);
  });

  it("runs equipment dry-run validation from equipment mode", async () => {
    const user = userEvent.setup();
    const { validateEquipmentEditorDraft } = await import(
      "../equipment/equipment-validation"
    );

    render(<CardEditorPage />);

    await user.click(await screen.findByRole("button", { name: "装备" }));
    await user.click(screen.getByRole("button", { name: "验证装备包" }));

    expect(validateEquipmentEditorDraft).toHaveBeenCalledOnce();
    expect(
      await screen.findAllByRole("heading", { name: "装备包检查通过" }),
    ).not.toHaveLength(0);
  });
});
