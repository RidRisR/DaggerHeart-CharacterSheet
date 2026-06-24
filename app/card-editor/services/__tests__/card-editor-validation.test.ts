import { describe, expect, it, vi } from "vitest";
import type { CardPackImportResult } from "@/card/import/types";
import { importCardPackFromSource } from "@/card/import/import-pipeline";
import type { CardPackageState } from "../../types";
import type { CardEditorImageService } from "../card-editor-image-service";
import {
  createCardEditorDhcbViewSource,
  validateCardEditorDraft,
} from "../card-editor-validation";

function baseDraft(partial: Partial<CardPackageState> = {}): CardPackageState {
  return {
    name: "Pack",
    version: "1.0.0",
    description: "Desc",
    author: "Author",
    customFieldDefinitions: {
      professions: ["Warrior"],
      ancestries: [],
      communities: [],
      domains: ["Blade", "Bone"],
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
    listImageKeys: vi.fn().mockResolvedValue([]),
    getImageBlob: vi.fn().mockResolvedValue(null),
    saveImageBlob: vi.fn().mockResolvedValue(undefined),
    clearAllImages: vi.fn().mockResolvedValue(undefined),
    deleteImage: vi.fn().mockResolvedValue(undefined),
    renameImageKey: vi.fn().mockResolvedValue(false),
    cleanupOrphanImages: vi.fn().mockResolvedValue({ deleted: [], failed: [] }),
    ...overrides,
  };
}

function dryRunResult(overrides: Partial<CardPackImportResult> = {}): CardPackImportResult {
  return {
    success: true,
    stage: "stageImportData",
    mode: "dryRun",
    summary: {
      name: "Pack",
      version: "1.0.0",
      author: "Author",
      cardCount: 0,
      imageCount: 0,
      warningCount: 0,
      errorCount: 0,
    },
    diagnostics: [],
    ...overrides,
  };
}

describe("card editor validation orchestration", () => {
  it("serializes the draft to a legacy DHCB view source without generating ZIP bytes", async () => {
    const packagedImage = new Blob(["image"], { type: "image/png" });
    const importFromSource = vi.fn(async (source, options) => {
      const payload = await source.read();

      expect(options).toEqual({ mode: "dryRun" });
      expect(source.origin).toEqual({ kind: "object", label: "card-editor-dhcb-view" });
      expect(payload).toMatchObject({
        kind: "parsedObject",
        value: {
          profession: [
            expect.objectContaining({
              id: "warrior",
              hasLocalImage: true,
            }),
          ],
        },
        imageAssets: [
          expect.objectContaining({
            templateId: "warrior",
            path: "images/warrior.png",
            mimeType: "image/png",
          }),
        ],
      });
      expect(payload.kind).not.toBe("dhcbBytes");
      expect("bytes" in payload).toBe(false);
      await expect(payload.imageAssets?.[0]?.readBlob?.()).resolves.toBe(packagedImage);

      return dryRunResult({
        summary: { ...dryRunResult().summary, cardCount: 1, imageCount: 1 },
      });
    });

    await validateCardEditorDraft(
      baseDraft({
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
            imageUrl: "https://example.test/warrior.png",
            hasLocalImage: true,
          } as never,
        ],
      }),
      {
        imageService: imageService({
          listImageKeys: vi.fn().mockResolvedValue(["warrior"]),
          getImageBlob: vi.fn().mockResolvedValue(packagedImage),
        }),
        importFromSource: importFromSource as typeof importCardPackFromSource,
      },
    );

    expect(importFromSource).toHaveBeenCalledTimes(1);
  });

  it("creates a source compatible with the card import pipeline image asset path", async () => {
    const packagedImage = new Blob(["image"], { type: "image/png" });
    const source = createCardEditorDhcbViewSource({
      cardsJson: baseDraft({
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
            hasLocalImage: true,
          } as never,
        ],
      }),
      images: [{ cardId: "warrior", blob: packagedImage }],
    });

    const result = await importCardPackFromSource(source, { mode: "dryRun" });

    expect(result.success).toBe(true);
    expect(result.summary).toMatchObject({ cardCount: 1, imageCount: 1 });
    expect(result.draft?.assets.cardImages[0]).toMatchObject({
      templateId: "warrior",
      path: "images/warrior.png",
      mimeType: "image/png",
    });
    await expect(result.draft?.assets.cardImages[0]?.readBlob?.()).resolves.toBe(packagedImage);
  });

  it("marks formal dry run diagnostics with import source", async () => {
    const importFromSource = vi.fn().mockResolvedValue(
      dryRunResult({
        success: false,
        stage: "structuralValidation",
        summary: { ...dryRunResult().summary, errorCount: 1 },
        diagnostics: [
          {
            severity: "error",
            code: "MISSING_FIELD",
            path: "/classes/0/name",
            message: "Class name is required.",
          },
        ],
      }),
    );

    const viewModel = await validateCardEditorDraft(baseDraft(), {
      imageService: imageService(),
      importFromSource: importFromSource as typeof importCardPackFromSource,
    });

    expect(viewModel.status).toBe("failed");
    expect(viewModel.diagnostics).toContainEqual(
      expect.objectContaining({
        source: "import",
        severity: "error",
        technical: expect.objectContaining({ code: "MISSING_FIELD", internalPath: "/classes/0/name" }),
      }),
    );
  });

  it("does not surface the legacy-format compatibility warning for the editor default export target", async () => {
    const viewModel = await validateCardEditorDraft(baseDraft(), {
      imageService: imageService(),
      importFromSource: vi.fn().mockResolvedValue(
        dryRunResult({
          summary: { ...dryRunResult().summary, warningCount: 1 },
          diagnostics: [
            {
              severity: "warning",
              code: "LEGACY_FORMAT_ASSUMED",
              path: "",
              message: "No format field; using legacy card format.",
            },
          ],
        }),
      ) as typeof importCardPackFromSource,
    });

    expect(viewModel.status).toBe("passed");
    expect(viewModel.summary.warningCount).toBe(0);
    expect(viewModel.diagnostics).toEqual([]);
  });

  it("uses localized copy for system-level import diagnostic titles", async () => {
    const viewModel = await validateCardEditorDraft(baseDraft(), {
      imageService: imageService(),
      importFromSource: vi.fn().mockResolvedValue(
        dryRunResult({
          success: false,
          stage: "sourceRead",
          summary: { ...dryRunResult().summary, errorCount: 1 },
          diagnostics: [
            {
              severity: "error",
              code: "SOURCE_READ_FAILED",
              path: "",
              message: "Unable to read card pack source.",
            },
          ],
        }),
      ) as typeof importCardPackFromSource,
    });

    expect(viewModel.diagnostics[0]).toMatchObject({
      title: "无法读取卡牌包来源",
      description: "无法读取卡牌包来源",
      suggestion: "请确认文件可以被读取",
    });
  });

  it("marks editor-owned authoring diagnostics with authoring source", async () => {
    const viewModel = await validateCardEditorDraft(
      baseDraft({
        ancestry: [
          { id: "ancestry-one", 名称: "Human 1", 种族: "Human", 简介: "", 类别: 1, 效果: "" } as never,
        ],
      }),
      {
        imageService: imageService(),
        importFromSource: vi.fn().mockResolvedValue(dryRunResult()) as typeof importCardPackFromSource,
      },
    );

    expect(viewModel.status).toBe("failed");
    expect(viewModel.diagnostics).toContainEqual(
      expect.objectContaining({
        source: "authoring",
        severity: "error",
        technical: expect.objectContaining({ code: "EDITOR_ANCESTRY_PAIR_INCOMPLETE" }),
      }),
    );
  });

  it("fails validation with a readable metadata diagnostic when the package name is blank", async () => {
    const viewModel = await validateCardEditorDraft(baseDraft({ name: " " }), {
      imageService: imageService(),
      importFromSource: vi.fn().mockResolvedValue(dryRunResult()) as typeof importCardPackFromSource,
    });

    expect(viewModel.status).toBe("failed");
    expect(viewModel.diagnostics).toContainEqual(
      expect.objectContaining({
        source: "authoring",
        severity: "error",
        title: "卡牌包名称有问题",
        description: "卡牌包名称不能为空",
        suggestion: "请填写卡牌包名称",
        jumpTarget: { tab: "metadata", field: "name" },
        technical: expect.objectContaining({
          code: "EDITOR_PACKAGE_NAME_REQUIRED",
          internalPath: "/name",
        }),
      }),
    );
  });

  it("fails validation when only editor-local diagnostics contain errors", async () => {
    const viewModel = await validateCardEditorDraft(
      baseDraft({
        subclass: [
          {
            id: "blade-foundation",
            名称: "Blade Foundation",
            主职: "Warrior",
            子职业: "Blade",
            等级: "基石",
            描述: "",
            施法: "",
          } as never,
        ],
      }),
      {
        imageService: imageService(),
        importFromSource: vi.fn().mockResolvedValue(dryRunResult()) as typeof importCardPackFromSource,
      },
    );

    expect(viewModel.status).toBe("failed");
    expect(viewModel.summary.errorCount).toBeGreaterThan(0);
    expect(viewModel.diagnostics.every((diagnostic) => diagnostic.source === "authoring")).toBe(true);
  });

  it("validates serialized raw automation definitions without mutating the draft into compiled IR", async () => {
    const rawAutomationDefinition = {
      format: "daggerheart.card-automation.definition.v1",
      mode: "lowLevel",
      body: {
        abilities: [
          {
            id: "warrior-invalid",
            label: "Warrior Invalid",
            effects: [{ kind: "emitModifier", target: "unknown-target", value: 1 }],
          },
        ],
      },
    };
    const draft = baseDraft({
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
          automation: rawAutomationDefinition,
        } as never,
      ],
    });

    const viewModel = await validateCardEditorDraft(draft, {
      imageService: imageService(),
      importFromSource: importCardPackFromSource,
    });

    expect(viewModel.status).toBe("failed");
    expect(viewModel.diagnostics).toContainEqual(
      expect.objectContaining({
        source: "import",
        severity: "error",
        authorPath: expect.stringMatching(/^\/profession\/0\/automation/),
        technical: expect.objectContaining({
          code: expect.stringMatching(/^INVALID_AUTOMATION_(DEFINITION|IR)$/),
          internalPath: expect.stringMatching(/^\/classes\/0\/automation/),
        }),
      }),
    );
    expect((draft.profession?.[0] as { automation?: unknown }).automation).toEqual(rawAutomationDefinition);
    expect((draft.profession?.[0] as { automation?: { revision?: unknown } }).automation?.revision).toBeUndefined();
  });
});
