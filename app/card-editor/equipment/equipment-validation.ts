import type { EquipmentPackApplicationDiagnostic } from "@/equipment/packs/application-service";
import type {
  EquipmentPackApplicationImportResult,
  EquipmentPackApplicationService,
} from "@/equipment/packs/application-service";
import {
  equipmentFieldLabelFromPath,
  localizeEquipmentDiagnostic,
} from "@/equipment/ui/diagnostic-copy";
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
): Promise<EquipmentPackApplicationImportResult> {
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
    summary: {
      ...result.summary,
      warningCount: countBySeverity(diagnostics, "warning"),
      errorCount: countBySeverity(diagnostics, "error"),
    },
  };
}
