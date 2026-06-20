import type { EquipmentPackApplicationDiagnostic } from "@/equipment/packs/application-service";
import type {
  EquipmentPackApplicationImportResult,
  EquipmentPackApplicationService,
} from "@/equipment/packs/application-service";
import {
  equipmentFieldLabelFromPath,
  localizeEquipmentDiagnostic,
} from "@/equipment/ui/diagnostic-copy";
import { createIdentityDiagnosticSourceMap } from "../services/diagnostic-source-map";
import {
  createEditorValidationViewModel,
  type EditorValidationDiagnosticView,
  type EditorValidationViewModel,
} from "../services/editor-validation-view-model";
import type { EquipmentEditorDraft } from "./equipment-draft";
import { toEquipmentExportJson } from "./equipment-import-export";

export type EquipmentEditorTab = "metadata" | "weapons" | "armor";

export type EquipmentValidationJumpTarget =
  | { tab: "metadata"; field?: string }
  | { tab: "weapons"; index: number; field?: string }
  | { tab: "armor"; index: number; field?: string };

export type FriendlyEquipmentDiagnostic = {
  title: string;
  description: string;
  suggestion: string;
  severity: "error" | "warning";
  field?: string;
  groupType: "基础信息" | "武器" | "护甲" | "系统";
  specificGroup: string;
  diagnostic: EquipmentPackApplicationDiagnostic;
  jumpTarget?: EquipmentValidationJumpTarget;
};

export type EquipmentEditorValidationResult = EquipmentPackApplicationImportResult & {
  editorLocalDiagnostics?: EquipmentPackApplicationDiagnostic[];
};

function fieldLabel(field: string | undefined) {
  return field ? equipmentFieldLabelFromPath(`/${field}`) ?? field : undefined;
}

function leafField(path: string | undefined) {
  if (!path) return undefined;
  const parts = path.split("/");
  return parts[parts.length - 1];
}

export function targetFromDiagnosticPath(
  path: string,
): EquipmentValidationJumpTarget | undefined {
  const weapon = path.match(/^\/equipment\/weapons\/(\d+)(?:\/(.+))?$/);
  if (weapon) {
    return {
      tab: "weapons",
      index: Number(weapon[1]),
      field: leafField(weapon[2]),
    };
  }

  const armor = path.match(/^\/equipment\/armor\/(\d+)(?:\/(.+))?$/);
  if (armor) {
    return {
      tab: "armor",
      index: Number(armor[1]),
      field: leafField(armor[2]),
    };
  }

  const metadata = path.match(/^\/(format|name|version|author|description)$/);
  if (metadata) return { tab: "metadata", field: metadata[1] };

  return undefined;
}

export function mapEquipmentDiagnosticsToFriendly(
  diagnostics: EquipmentPackApplicationDiagnostic[],
): FriendlyEquipmentDiagnostic[] {
  return diagnostics.map((diagnostic) => {
    const jumpTarget = targetFromDiagnosticPath(diagnostic.path);
    const field = fieldLabel(jumpTarget?.field);
    const { description, suggestion } = localizeEquipmentDiagnostic(
      diagnostic,
      "editorValidation",
      field,
    );

    if (jumpTarget?.tab === "weapons") {
      return {
        title: `第${jumpTarget.index + 1}件武器${field ? `的${field}` : ""}有问题`,
        description,
        suggestion,
        severity: diagnostic.severity,
        field,
        groupType: "武器",
        specificGroup: `第${jumpTarget.index + 1}件武器`,
        diagnostic,
        jumpTarget,
      };
    }

    if (jumpTarget?.tab === "armor") {
      return {
        title: `第${jumpTarget.index + 1}件护甲${field ? `的${field}` : ""}有问题`,
        description,
        suggestion,
        severity: diagnostic.severity,
        field,
        groupType: "护甲",
        specificGroup: `第${jumpTarget.index + 1}件护甲`,
        diagnostic,
        jumpTarget,
      };
    }

    if (jumpTarget?.tab === "metadata") {
      return {
        title: `装备包基础信息${field ? `的${field}` : ""}有问题`,
        description,
        suggestion,
        severity: diagnostic.severity,
        field,
        groupType: "基础信息",
        specificGroup: "基础信息",
        diagnostic,
        jumpTarget,
      };
    }

    const isEquipmentContentDiagnostic = diagnostic.path === "/equipment";

    return {
      title: isEquipmentContentDiagnostic ? "装备包内容有问题" : "系统问题",
      description,
      suggestion,
      severity: diagnostic.severity,
      groupType: "系统",
      specificGroup: "系统问题",
      diagnostic,
      jumpTarget: undefined,
    };
  });
}

function countFriendlyDiagnostics(
  diagnostics: FriendlyEquipmentDiagnostic[],
  severity: "error" | "warning",
) {
  return diagnostics.filter((diagnostic) => diagnostic.severity === severity)
    .length;
}

function createEquipmentValidationViewModelCopy(input: {
  result: EquipmentPackApplicationImportResult;
  errorCount: number;
  warningCount: number;
}) {
  const checkedItemCount =
    input.result.summary.weaponCount + input.result.summary.armorCount;

  return {
    passed: {
      title: "装备包检查通过",
      description: `装备包包含 ${input.result.summary.weaponCount} 件武器和 ${input.result.summary.armorCount} 件护甲，当前检查通过，可以导出发布文件。`,
    },
    passedWithWarnings: {
      title: "装备包检查通过，但有建议处理的问题",
      description: `装备包包含 ${checkedItemCount} 个装备条目，可以导出发布文件；建议处理 ${input.warningCount} 个警告。`,
    },
    failed: {
      title: "需要修复一些装备问题",
      description: `检测到 ${input.errorCount} 个关键问题和 ${input.warningCount} 个警告。导出发布前应修复这些草稿问题。`,
    },
  };
}

export function createEquipmentEditorValidationViewModel(
  result: EquipmentEditorValidationResult,
): EditorValidationViewModel<EquipmentValidationJumpTarget> {
  const editorLocalDiagnosticKeys = new Set(
    (result.editorLocalDiagnostics ?? []).map(diagnosticKey),
  );
  const friendlyDiagnostics = mapEquipmentDiagnosticsToFriendly(
    result.diagnostics,
  );
  const sourceMap =
    createIdentityDiagnosticSourceMap<EquipmentValidationJumpTarget>(
      (path) => {
        const jumpTarget = targetFromDiagnosticPath(path);
        return {
          fieldLabel: fieldLabel(jumpTarget?.field),
          locationLabel: undefined,
          jumpTarget,
        };
      },
    );
  const diagnostics: EditorValidationDiagnosticView<EquipmentValidationJumpTarget>[] =
    friendlyDiagnostics.map((friendly) => {
      const source = sourceMap.lookup(friendly.diagnostic.path);

      return {
        severity: friendly.severity,
        source: editorLocalDiagnosticKeys.has(diagnosticKey(friendly.diagnostic))
          ? "authoring"
          : "import",
        title: friendly.title,
        description: friendly.description,
        suggestion: friendly.suggestion,
        fieldLabel: friendly.field ?? source?.fieldLabel,
        authorPath: source?.authorPath ?? friendly.diagnostic.path,
        locationLabel: source?.locationLabel,
        groupType: friendly.groupType,
        specificGroup: friendly.specificGroup,
        jumpTarget: friendly.jumpTarget ?? source?.jumpTarget,
        technical: {
          code: friendly.diagnostic.code,
          internalPath: friendly.diagnostic.path,
          value: friendly.diagnostic.value,
        },
      };
    });
  const errorCount = countFriendlyDiagnostics(friendlyDiagnostics, "error");
  const warningCount = countFriendlyDiagnostics(friendlyDiagnostics, "warning");
  const summaryErrorCount = Math.max(errorCount, result.summary.errorCount);
  const summaryWarningCount = Math.max(
    warningCount,
    result.summary.warningCount,
  );
  const copy = createEquipmentValidationViewModelCopy({
    result,
    errorCount: summaryErrorCount,
    warningCount: summaryWarningCount,
  });
  const viewModel = createEditorValidationViewModel({
    checkedItemCount: result.summary.weaponCount + result.summary.armorCount,
    diagnostics,
    copy,
  });
  const status =
    summaryErrorCount > 0
      ? "failed"
      : summaryWarningCount > 0
        ? "passedWithWarnings"
        : viewModel.status;

  if (
    status === viewModel.status &&
    summaryErrorCount === viewModel.summary.errorCount &&
    summaryWarningCount === viewModel.summary.warningCount
  ) {
    return viewModel;
  }

  return {
    ...viewModel,
    status,
    title: copy[status].title,
    description: copy[status].description,
    summary: {
      ...viewModel.summary,
      errorCount: summaryErrorCount,
      warningCount: summaryWarningCount,
    },
  };
}

export interface EquipmentValidationDisplaySummary {
  criticalIssues: number;
  warningIssues: number;
  affectedTypes: FriendlyEquipmentDiagnostic["groupType"][];
  equipmentItems: number;
}

export interface EquipmentValidationGroups {
  critical: FriendlyEquipmentDiagnostic[];
  warnings: FriendlyEquipmentDiagnostic[];
  bySpecificGroup: Record<string, FriendlyEquipmentDiagnostic[]>;
  byGroupType: Record<string, FriendlyEquipmentDiagnostic[]>;
}

function groupDiagnosticsBy(
  diagnostics: FriendlyEquipmentDiagnostic[],
  getKey: (diagnostic: FriendlyEquipmentDiagnostic) => string,
) {
  const groups: Record<string, FriendlyEquipmentDiagnostic[]> = {};
  for (const diagnostic of diagnostics) {
    const key = getKey(diagnostic);
    groups[key] = [...(groups[key] ?? []), diagnostic];
  }
  return groups;
}

export function createEquipmentValidationDisplaySummary(
  diagnostics: FriendlyEquipmentDiagnostic[],
  summary: EquipmentPackApplicationImportResult["summary"],
): EquipmentValidationDisplaySummary {
  return {
    criticalIssues: diagnostics.filter(
      (diagnostic) => diagnostic.severity === "error",
    ).length,
    warningIssues: diagnostics.filter(
      (diagnostic) => diagnostic.severity === "warning",
    ).length,
    affectedTypes: Array.from(
      new Set(diagnostics.map((diagnostic) => diagnostic.groupType)),
    ),
    equipmentItems: summary.weaponCount + summary.armorCount,
  };
}

export function groupEquipmentValidationDiagnostics(
  diagnostics: FriendlyEquipmentDiagnostic[],
): EquipmentValidationGroups {
  return {
    critical: diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
    warnings: diagnostics.filter(
      (diagnostic) => diagnostic.severity === "warning",
    ),
    bySpecificGroup: groupDiagnosticsBy(
      diagnostics,
      (diagnostic) => diagnostic.specificGroup,
    ),
    byGroupType: groupDiagnosticsBy(
      diagnostics,
      (diagnostic) => diagnostic.groupType,
    ),
  };
}

export function createEditorLocalDiagnostics(
  draft: EquipmentEditorDraft,
): EquipmentPackApplicationDiagnostic[] {
  const seen = new Set<string>();
  const diagnostics: EquipmentPackApplicationDiagnostic[] = [];

  draft.equipment.weapons.forEach((weapon, index) => {
    if (!weapon.id) return;
    if (seen.has(weapon.id)) {
      diagnostics.push({
        severity: "error",
        code: "DUPLICATE_ID",
        path: `/equipment/weapons/${index}/id`,
        message: `装备 ID 重复：${weapon.id}`,
      });
      return;
    }
    seen.add(weapon.id);
  });

  draft.equipment.armor.forEach((armor, index) => {
    if (!armor.id) return;
    if (seen.has(armor.id)) {
      diagnostics.push({
        severity: "error",
        code: "DUPLICATE_ID",
        path: `/equipment/armor/${index}/id`,
        message: `装备 ID 重复：${armor.id}`,
      });
      return;
    }
    seen.add(armor.id);
  });

  return diagnostics;
}

function countBySeverity(
  diagnostics: EquipmentPackApplicationDiagnostic[],
  severity: "error" | "warning",
) {
  return diagnostics.filter((diagnostic) => diagnostic.severity === severity)
    .length;
}

function diagnosticKey(diagnostic: EquipmentPackApplicationDiagnostic) {
  return `${diagnostic.code}:${diagnostic.path}`;
}

export async function validateEquipmentEditorDraft(
  draft: EquipmentEditorDraft,
  applicationService: EquipmentPackApplicationService,
): Promise<EquipmentEditorValidationResult> {
  const localDiagnostics = createEditorLocalDiagnostics(draft);
  const result = await applicationService.importFromSource(
    {
      origin: { kind: "object", label: "equipment-editor-draft" },
      async read() {
        return { kind: "parsedObject", value: toEquipmentExportJson(draft) };
      },
    },
    { mode: "dryRun" },
  );
  const localDiagnosticKeys = new Set(localDiagnostics.map(diagnosticKey));
  const diagnostics = [
    ...localDiagnostics,
    ...result.diagnostics.filter(
      (diagnostic) => !localDiagnosticKeys.has(diagnosticKey(diagnostic)),
    ),
  ];

  return {
    ...result,
    success: result.success && localDiagnostics.length === 0,
    diagnostics,
    editorLocalDiagnostics: localDiagnostics,
    summary: {
      ...result.summary,
      warningCount: countBySeverity(diagnostics, "warning"),
      errorCount: countBySeverity(diagnostics, "error"),
    },
  };
}
