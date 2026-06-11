import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EquipmentPackApplicationImportResult } from "@/equipment/packs/application-service";
import { defaultPackage } from "../types";
import { useCardEditorStore } from "../store/card-editor-store";
import { createDefaultEquipmentDraft } from "../equipment/equipment-draft";
import { useEquipmentEditorStore } from "../equipment/equipment-editor-store";
import CardEditorPage from "../page";

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

const cardImportExport = vi.hoisted(() => ({
  exportCardPackage: vi.fn(),
  importCardPackage: vi.fn(async () => null),
}));

vi.mock("sonner", () => ({ toast }));

vi.mock("../utils/import-export", () => cardImportExport);

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
  beforeEach(() => {
    vi.clearAllMocks();
    resetStores();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it("keeps card mode toolbar actions on the existing card export path", async () => {
    const user = userEvent.setup();
    const { downloadEquipmentDraftJson } = await import(
      "../equipment/equipment-import-export"
    );

    render(<CardEditorPage />);

    await user.click(await screen.findByRole("button", { name: "导出卡牌包" }));

    expect(cardImportExport.exportCardPackage).toHaveBeenCalledOnce();
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

    mockNextFileSelection(file);
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

    mockNextFileSelection(file);

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
    expect(await screen.findByText("验证通过！")).toBeInTheDocument();
  });
});
