import type { EquipmentPackApplicationDiagnostic } from "@/equipment/packs/application-service";
import type {
  EquipmentPackApplicationImportResult,
  EquipmentPackApplicationService,
} from "@/equipment/packs/application-service";
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

const FIELD_NAMES: Record<string, string> = {
  id: "装备ID",
  name: "名称",
  version: "版本号",
  author: "作者",
  description: "描述",
  format: "格式",
  tier: "等级",
  weaponType: "武器类型",
  trait: "属性",
  damageType: "伤害类型",
  range: "范围",
  burden: "负荷",
  damage: "伤害",
  baseArmorMax: "基础护甲槽",
  baseThresholds: "伤害阈值",
  minor: "轻微阈值",
  major: "严重阈值",
  featureName: "特性名称",
  modifierContributions: "数值修正",
};

function fieldLabel(field: string | undefined) {
  return field ? FIELD_NAMES[field] ?? field : undefined;
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

function descriptionAndSuggestion(diagnostic: EquipmentPackApplicationDiagnostic) {
  if (diagnostic.code === "MISSING_FIELD") {
    return {
      description: "必填字段不能为空",
      suggestion: "请填写这个必需字段，然后重新验证",
    };
  }

  if (diagnostic.code === "INVALID_ENUM") {
    return {
      description: "选择的选项不在有效范围内",
      suggestion: "请从下拉选项中选择一个有效值",
    };
  }

  if (diagnostic.code === "DUPLICATE_ID") {
    return {
      description: "装备 ID 重复",
      suggestion: "请修改其中一个装备 ID，确保每个装备唯一",
    };
  }

  if (diagnostic.code === "INVALID_THRESHOLD_ORDER") {
    return {
      description: "严重阈值不能小于轻微阈值",
      suggestion: "请调整护甲阈值顺序",
    };
  }

  return {
    description: diagnostic.message,
    suggestion: "请检查并修正该字段内容",
  };
}

export function mapEquipmentDiagnosticsToFriendly(
  diagnostics: EquipmentPackApplicationDiagnostic[],
): FriendlyEquipmentDiagnostic[] {
  return diagnostics.map((diagnostic) => {
    const jumpTarget = targetFromDiagnosticPath(diagnostic.path);
    const field = fieldLabel(jumpTarget?.field);
    const { description, suggestion } = descriptionAndSuggestion(diagnostic);

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

    return {
      title: "系统问题",
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
