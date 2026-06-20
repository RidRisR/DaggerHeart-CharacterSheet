import { useCallback, useMemo } from "react";
import JSZip from "jszip";
import { toast } from "sonner";
import { importCardPackFromSource } from "@/card/import/import-pipeline";
import type { CardPackageState } from "../types";
import {
  createLegacyDhcbView,
  serializeCardDraftToLegacyJson,
} from "../services/card-draft-serialization";
import { createBrowserCardEditorImageService } from "../services/card-editor-image-service";
import {
  recoverCardDraftFromDhcbFile,
  recoverCardDraftFromJsonObject,
  type CardEditorRecoveryReport,
} from "../services/card-editor-recovery";
import {
  validateCardEditorDraft,
  type CardValidationJumpTarget,
} from "../services/card-editor-validation";
import {
  createEditorValidationViewModel,
  type EditorValidationViewModel,
} from "../services/editor-validation-view-model";

export interface CardEditorFileActions {
  importDraftFromFile(file: File): Promise<void>;
  exportDraftAsJson(): Promise<void>;
  exportDraftAsDhcb(): Promise<void>;
  validateDraft(): Promise<void>;
}

interface UseCardEditorFileActionsOptions {
  draft: CardPackageState;
  replaceDraft(draft: CardPackageState): void;
  resetCurrentCardIndex(): void;
  setValidationResult(
    result: EditorValidationViewModel<CardValidationJumpTarget> | null,
  ): void;
  setIsValidating(isValidating: boolean): void;
}

export function useCardEditorFileActions({
  draft,
  replaceDraft,
  resetCurrentCardIndex,
  setValidationResult,
  setIsValidating,
}: UseCardEditorFileActionsOptions): CardEditorFileActions {
  const importDraftFromFile = useCallback(
    async (file: File) => {
      try {
        const imageService = await createBrowserCardEditorImageService();
        const result = isDhcbFile(file)
          ? await recoverCardDraftFromDhcbFile(file, imageService)
          : await recoverJsonDraftFromFile(file, imageService);

        replaceDraft(result.draft);
        resetCurrentCardIndex();
        toast.success(isDhcbFile(file) ? "卡牌包已导入（含图片）" : "卡牌包已导入");
        surfaceRecoveryWarnings(result.report);
      } catch (error) {
        console.error("[CardEditorFileActions] Failed to import card draft:", error);
        toast.error("导入失败：文件格式不正确");
      }
    },
    [replaceDraft, resetCurrentCardIndex],
  );

  const exportDraftAsJson = useCallback(async () => {
    try {
      const exportData = serializeCardDraftToLegacyJson(draft);
      downloadBlob(
        new Blob([JSON.stringify(exportData, null, 2)], {
          type: "application/json",
        }),
        `${draft.name || "卡牌包"}.json`,
      );
      toast.success("卡牌包已导出");
    } catch (error) {
      console.error("[CardEditorFileActions] Failed to export card draft JSON:", error);
      toast.error("导出失败");
    }
  }, [draft]);

  const exportDraftAsDhcb = useCallback(async () => {
    try {
      toast.info("正在导出卡牌包...");
      const imageService = await createBrowserCardEditorImageService();
      const view = await createLegacyDhcbView(draft, imageService);
      const zip = new JSZip();

      zip.file(
        "manifest.json",
        JSON.stringify(
          {
            format: "DaggerHeart Card Batch",
            version: "1.0",
            createdAt: new Date().toISOString(),
            hasImages: true,
          },
          null,
          2,
        ),
      );
      zip.file("cards.json", JSON.stringify(view.cardsJson, null, 2));

      const imagesFolder = zip.folder("images");
      if (imagesFolder) {
        for (const image of view.images) {
          imagesFolder.file(
            `${image.cardId}${extensionFromMimeType(image.blob.type)}`,
            image.blob,
          );
        }
      }

      downloadBlob(await zip.generateAsync({ type: "blob" }), dhcbFileName(draft.name));
      toast.success("卡牌包已导出（含图片）");
    } catch (error) {
      console.error("[CardEditorFileActions] Failed to export card draft DHCB:", error);
      toast.error("导出失败");
    }
  }, [draft]);

  const validateDraft = useCallback(async () => {
    setIsValidating(true);

    try {
      const imageService = await createBrowserCardEditorImageService();
      const result = await validateCardEditorDraft(draft, {
        imageService,
        importFromSource: importCardPackFromSource,
      });

      setValidationResult(result);

      if (result.status !== "failed") {
        toast.success("卡牌包验证通过！");
      } else {
        toast.error(`验证失败：发现 ${result.summary.errorCount} 个错误`);
      }
    } catch (error) {
      console.error("[CardEditorFileActions] Failed to validate card draft:", error);
      setValidationResult(
        createEditorValidationViewModel<CardValidationJumpTarget>({
          checkedItemCount: 0,
          diagnostics: [
            {
              severity: "error",
              source: "import",
              title: "验证系统错误",
              description: "验证过程中发生错误。",
              suggestion: "刷新页面后重新验证。",
              groupType: "系统",
              specificGroup: "系统问题",
              technical: {
                code: "SOURCE_READ_FAILED",
                value: error instanceof Error ? error.message : error,
              },
            },
          ],
        }),
      );
      toast.error("验证过程中发生错误");
    } finally {
      setIsValidating(false);
    }
  }, [draft, setIsValidating, setValidationResult]);

  return useMemo(
    () => ({
      importDraftFromFile,
      exportDraftAsJson,
      exportDraftAsDhcb,
      validateDraft,
    }),
    [exportDraftAsDhcb, exportDraftAsJson, importDraftFromFile, validateDraft],
  );
}

async function recoverJsonDraftFromFile(
  file: File,
  imageService: Parameters<typeof recoverCardDraftFromJsonObject>[1],
) {
  return recoverCardDraftFromJsonObject(JSON.parse(await file.text()), imageService);
}

function isDhcbFile(file: File): boolean {
  const fileName = file.name.toLowerCase();
  return fileName.endsWith(".dhcb") || fileName.endsWith(".zip");
}

function surfaceRecoveryWarnings(report: CardEditorRecoveryReport): void {
  if (report.warnings.length === 0) return;

  toast.warning(`导入完成，但有 ${report.warnings.length} 个图片问题需要留意。`);
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  try {
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    if (anchor.parentNode) {
      anchor.parentNode.removeChild(anchor);
    }
    URL.revokeObjectURL(url);
  }
}

function dhcbFileName(name: string | undefined): string {
  const baseName = name || "卡牌包";
  return baseName.endsWith(".dhcb") ? baseName : `${baseName}.dhcb`;
}

function extensionFromMimeType(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    "image/webp": ".webp",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
  };

  return mimeMap[mimeType] || ".png";
}
