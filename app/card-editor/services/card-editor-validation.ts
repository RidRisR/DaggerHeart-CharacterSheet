import { importCardPackFromSource } from "@/card/import/import-pipeline";
import type { CardImportDiagnostic, CardImportSource, CardPackImportResult } from "@/card/import/types";
import type { CardPackageState, CardType } from "../types";
import {
  createLegacyDhcbView,
  type LegacyDhcbView,
} from "./card-draft-serialization";
import type { CardEditorImageService } from "./card-editor-image-service";
import {
  createEditorLocalCardAuthoringDiagnostics,
  type CardEditorLocalAuthoringDiagnostic,
} from "./editor-authoring-diagnostics";
import {
  createEditorValidationViewModel,
  type EditorValidationDiagnosticView,
  type EditorValidationViewModel,
} from "./editor-validation-view-model";

const legacyGroupByInternalGroup = {
  classes: "profession",
  ancestries: "ancestry",
  communities: "community",
  subclasses: "subclass",
  domains: "domain",
  variants: "variant",
} as const satisfies Record<string, CardType>;

const cardTypeLabels: Record<CardType, string> = {
  profession: "职业",
  ancestry: "种族",
  community: "社群",
  subclass: "子职业",
  domain: "领域",
  variant: "变体",
};

const fieldLabels: Record<string, string> = {
  id: "卡牌ID",
  name: "名称",
  名称: "名称",
  summary: "简介",
  简介: "简介",
  domain1: "第一领域",
  domain2: "第二领域",
  领域1: "第一领域",
  领域2: "第二领域",
  ancestry: "种族",
  种族: "种族",
  category: "类别",
  类别: "类别",
  effect: "效果",
  效果: "效果",
  class: "主职",
  主职: "主职",
  subclass: "子职业",
  子职业: "子职业",
  level: "等级",
  等级: "等级",
  description: "描述",
  描述: "描述",
  format: "格式",
  version: "版本",
  author: "作者",
};

export type CardValidationJumpTarget =
  | { tab: "metadata"; field?: string }
  | { tab: CardType; index: number; field?: string };

export interface CardEditorValidationServices {
  imageService: CardEditorImageService;
  importFromSource: typeof importCardPackFromSource;
}

interface ParsedDiagnosticPath {
  cardType?: CardType;
  index?: number;
  field?: string;
  authorPath: string;
}

function extensionForMimeType(mimeType: string | undefined): string {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/gif") return "gif";
  if (mimeType === "image/svg+xml") return "svg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}

export function createCardEditorDhcbViewSource(dhcbView: LegacyDhcbView): CardImportSource {
  return {
    origin: { kind: "object", label: "card-editor-dhcb-view" },
    async read() {
      return {
        kind: "parsedObject",
        value: dhcbView.cardsJson,
        imageAssets: dhcbView.images.map((image) => {
          const extension = extensionForMimeType(image.blob.type);
          return {
            templateId: image.cardId,
            path: `images/${image.cardId}.${extension}`,
            mimeType: image.blob.type || `image/${extension}`,
            readBlob: async () => image.blob,
          };
        }),
      };
    },
  };
}

function parseDiagnosticPath(path: string): ParsedDiagnosticPath {
  const match = path.match(/^\/([^/]+)(?:\/(\d+))?(?:\/(.+))?$/);
  if (!match) {
    return { authorPath: path };
  }

  const [, rawGroup, indexText, field] = match;
  const cardType =
    legacyGroupByInternalGroup[rawGroup as keyof typeof legacyGroupByInternalGroup] ??
    (isCardType(rawGroup) ? rawGroup : undefined);
  const index = indexText === undefined ? undefined : Number(indexText);
  const legacyGroup = cardType ?? rawGroup;
  const authorPath =
    index === undefined
      ? `/${legacyGroup}${field ? `/${field}` : ""}`
      : `/${legacyGroup}/${index}${field ? `/${field}` : ""}`;

  return { cardType, index, field, authorPath };
}

function isCardType(value: string | undefined): value is CardType {
  return (
    value === "profession" ||
    value === "ancestry" ||
    value === "community" ||
    value === "subclass" ||
    value === "domain" ||
    value === "variant"
  );
}

function jumpTargetFromPath(parsed: ParsedDiagnosticPath): CardValidationJumpTarget | undefined {
  if (parsed.cardType && parsed.index !== undefined) {
    return { tab: parsed.cardType, index: parsed.index, field: parsed.field };
  }

  if (
    parsed.authorPath === "/name" ||
    parsed.authorPath === "/version" ||
    parsed.authorPath === "/author" ||
    parsed.authorPath === "/description" ||
    parsed.authorPath === "/format"
  ) {
    return { tab: "metadata", field: parsed.authorPath.slice(1) };
  }

  return undefined;
}

function groupType(parsed: ParsedDiagnosticPath): string {
  return parsed.cardType ? cardTypeLabels[parsed.cardType] : "系统";
}

function specificGroup(parsed: ParsedDiagnosticPath): string {
  if (parsed.cardType && parsed.index !== undefined) {
    return `第${parsed.index + 1}张${cardTypeLabels[parsed.cardType]}卡片`;
  }

  if (parsed.authorPath.startsWith("/customFieldDefinitions")) {
    return "自定义字段定义";
  }

  if (parsed.authorPath === "" || parsed.authorPath === "/") {
    return "卡牌包";
  }

  return "系统问题";
}

function fieldLabel(field: string | undefined): string | undefined {
  if (!field) return undefined;
  return fieldLabels[field] ?? field;
}

function diagnosticField(parsed: ParsedDiagnosticPath): string | undefined {
  if (parsed.field) return parsed.field;

  if (
    parsed.authorPath === "/name" ||
    parsed.authorPath === "/version" ||
    parsed.authorPath === "/author" ||
    parsed.authorPath === "/description" ||
    parsed.authorPath === "/format"
  ) {
    return parsed.authorPath.slice(1);
  }

  return undefined;
}

function titleForDiagnostic(parsed: ParsedDiagnosticPath, fallback: string): string {
  const label = fieldLabel(diagnosticField(parsed));
  if (parsed.cardType && parsed.index !== undefined) {
    return `${specificGroup(parsed)}${label ? `的${label}` : ""}有问题`;
  }

  if (label) return `卡牌包${label}有问题`;
  return fallback;
}

function fieldNameOrDefault(parsed: ParsedDiagnosticPath): string {
  return fieldLabel(diagnosticField(parsed)) ?? "该字段";
}

function localizeImportDiagnostic(
  diagnostic: CardImportDiagnostic,
  parsed: ParsedDiagnosticPath,
): { description: string; suggestion: string } {
  const fieldName = fieldNameOrDefault(parsed);

  switch (diagnostic.code) {
    case "SOURCE_READ_FAILED":
      return {
        description: "无法读取卡牌包来源",
        suggestion: "请确认文件可以被读取",
      };
    case "INVALID_JSON":
      return {
        description: "文件不是有效的 JSON",
        suggestion: "请修复 JSON 语法",
      };
    case "INVALID_DHCB":
      return {
        description: "卡牌包文件结构无效",
        suggestion: "请确认这是有效的 .dhcb 文件",
      };
    case "MISSING_CARDS_JSON":
      return {
        description: ".dhcb 中缺少 cards.json",
        suggestion: "请确认卡牌包内包含 cards.json",
      };
    case "UNSUPPORTED_FORMAT":
    case "INVALID_FORMAT":
      return {
        description: "文件不是受支持的卡牌包格式",
        suggestion: "请确认 format 或导入文件类型正确",
      };
    case "MISSING_FIELD":
      return {
        description: `${fieldName}不能为空`,
        suggestion: `请补全${fieldName}`,
      };
    case "UNKNOWN_FIELD":
      return {
        description: "该字段不是卡牌包支持的字段",
        suggestion: "请删除这个字段",
      };
    case "INVALID_TYPE":
      if (diagnostic.value === "") {
        return {
          description: `${fieldName}不能为空`,
          suggestion: `请补全${fieldName}`,
        };
      }
      return {
        description: `${fieldName}格式不正确`,
        suggestion: `请按卡牌包格式要求修正${fieldName}`,
      };
    case "INVALID_VALUE":
      return {
        description: `${fieldName}取值不正确`,
        suggestion: `请改用卡牌包支持的${fieldName}取值`,
      };
    case "DUPLICATE_ID":
      return {
        description: "卡牌 ID 重复",
        suggestion: "请修改其中一张卡牌的 ID，确保每张卡唯一",
      };
    case "UNKNOWN_REFERENCE":
      return {
        description: `${fieldName}引用了未声明的定义`,
        suggestion: "请先声明该名称，或修改卡牌字段",
      };
    case "ORPHAN_IMAGE":
      return {
        description: "存在未关联到卡牌的图片",
        suggestion: "请删除这张图片，或确认图片文件名对应现有卡牌 ID",
      };
    case "TEMPLATE_ID_CONFLICT":
      return {
        description: "卡牌 ID 与已有卡牌冲突",
        suggestion: "请改用未被内置卡牌或已安装卡牌包使用的 ID",
      };
    case "PACK_LIMIT_EXCEEDED":
      return {
        description: "自定义卡牌包数量已达到上限",
        suggestion: "请删除不需要的卡牌包后再导入",
      };
    case "LEGACY_FORMAT_ASSUMED":
      return {
        description: "检测为旧版卡牌包格式，已按兼容规则读取",
        suggestion: "建议后续导出为当前编辑器支持的格式",
      };
    case "LEGACY_UNKNOWN_FIELD_DROPPED":
      return {
        description: "旧版卡牌包中有不支持的字段，导入时已忽略",
        suggestion: "请删除这个字段，避免内容被忽略",
      };
    case "DEFINITIONS_DERIVED":
      return {
        description: "部分自定义字段定义由卡牌内容自动推导",
        suggestion: "建议补充明确的自定义字段定义",
      };
    case "EXPLICIT_DEFINITION_UNUSED":
      return {
        description: "有自定义字段定义没有被任何卡牌使用",
        suggestion: "请删除未使用的定义，或让卡牌引用它",
      };
    case "VARIANT_TYPES_DERIVED":
      return {
        description: "变体类型信息由卡牌内容自动推导",
        suggestion: "建议补充明确的变体类型定义",
      };
    default:
      return {
        description: "当前字段未通过卡牌包校验",
        suggestion: "请检查该字段的格式和取值",
      };
  }
}

function importDiagnosticToView(
  diagnostic: CardImportDiagnostic,
): EditorValidationDiagnosticView<CardValidationJumpTarget> {
  const parsed = parseDiagnosticPath(diagnostic.path);
  const copy = localizeImportDiagnostic(diagnostic, parsed);

  return {
    severity: diagnostic.severity,
    source: "import",
    title: titleForDiagnostic(parsed, copy.description),
    description: copy.description,
    suggestion: copy.suggestion,
    fieldLabel: fieldLabel(diagnosticField(parsed)),
    authorPath: parsed.authorPath,
    groupType: groupType(parsed),
    specificGroup: specificGroup(parsed),
    jumpTarget: jumpTargetFromPath(parsed),
    technical: {
      code: diagnostic.code,
      internalPath: diagnostic.path,
      value: diagnostic.value,
    },
  };
}

function authoringDiagnosticToView(
  diagnostic: CardEditorLocalAuthoringDiagnostic,
): EditorValidationDiagnosticView<CardValidationJumpTarget> {
  const parsed = parseDiagnosticPath(diagnostic.path);
  const descriptionByCode: Record<CardEditorLocalAuthoringDiagnostic["code"], string> = {
    EDITOR_PACKAGE_NAME_REQUIRED: "卡牌包名称不能为空",
    EDITOR_ANCESTRY_PAIR_INCOMPLETE: "该种族卡牌不完整，需要同时包含类别 1 和类别 2",
    EDITOR_SUBCLASS_TRIPLE_INCOMPLETE: "该子职业卡牌不完整，需要同时包含基石、专精、大师",
  };
  const suggestionByCode: Record<CardEditorLocalAuthoringDiagnostic["code"], string> = {
    EDITOR_PACKAGE_NAME_REQUIRED: "请填写卡牌包名称",
    EDITOR_ANCESTRY_PAIR_INCOMPLETE: "请补齐同一种族的两张 ancestry 卡牌",
    EDITOR_SUBCLASS_TRIPLE_INCOMPLETE: "请补齐同一子职业的三张 subclass 卡牌",
  };

  return {
    severity: diagnostic.severity,
    source: "authoring",
    title: titleForDiagnostic(parsed, diagnostic.message),
    description: descriptionByCode[diagnostic.code],
    suggestion: suggestionByCode[diagnostic.code],
    fieldLabel: fieldLabel(diagnosticField(parsed)),
    authorPath: parsed.authorPath,
    groupType: groupType(parsed),
    specificGroup: specificGroup(parsed),
    jumpTarget: jumpTargetFromPath(parsed),
    technical: {
      code: diagnostic.code,
      internalPath: diagnostic.path,
      value: diagnostic.value,
    },
  };
}

function countBySeverity(
  diagnostics: EditorValidationDiagnosticView<CardValidationJumpTarget>[],
  severity: "error" | "warning",
): number {
  return diagnostics.filter((diagnostic) => diagnostic.severity === severity).length;
}

function isEditorHiddenImportDiagnostic(
  diagnostic: CardPackImportResult["diagnostics"][number],
): boolean {
  return (
    diagnostic.severity === "warning" &&
    diagnostic.code === "LEGACY_FORMAT_ASSUMED" &&
    diagnostic.path === ""
  );
}

export function projectCardEditorValidationResult(
  dryRunResult: CardPackImportResult,
  authoringDiagnostics: CardEditorLocalAuthoringDiagnostic[],
): EditorValidationViewModel<CardValidationJumpTarget> {
  const diagnostics = [
    ...dryRunResult.diagnostics
      .filter((diagnostic) => !isEditorHiddenImportDiagnostic(diagnostic))
      .map(importDiagnosticToView),
    ...authoringDiagnostics.map(authoringDiagnosticToView),
  ];
  const errorCount = countBySeverity(diagnostics, "error");
  const warningCount = countBySeverity(diagnostics, "warning");

  return createEditorValidationViewModel({
    checkedItemCount: dryRunResult.summary.cardCount,
    diagnostics,
    copy: {
      passed: {
        title: "卡牌包检查通过",
        description: `卡牌包包含 ${dryRunResult.summary.cardCount} 张卡牌，当前检查通过，可以导出发布文件。`,
      },
      passedWithWarnings: {
        title: "卡牌包检查通过，但有建议处理的问题",
        description: `卡牌包包含 ${dryRunResult.summary.cardCount} 张卡牌，可以导出发布文件；建议处理 ${warningCount} 个警告。`,
      },
      failed: {
        title: "需要修复一些卡牌问题",
        description: `检测到 ${errorCount} 个关键问题和 ${warningCount} 个警告。导出发布前应修复这些草稿问题。`,
      },
    },
  });
}

export async function validateCardEditorDraft(
  draft: CardPackageState,
  services: CardEditorValidationServices,
): Promise<EditorValidationViewModel<CardValidationJumpTarget>> {
  const dhcbView = await createLegacyDhcbView(draft, services.imageService);
  const dryRunResult = await services.importFromSource(createCardEditorDhcbViewSource(dhcbView), { mode: "dryRun" });
  const authoringDiagnostics = createEditorLocalCardAuthoringDiagnostics(draft);
  return projectCardEditorValidationResult(dryRunResult, authoringDiagnostics);
}
