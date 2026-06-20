export type EditorValidationStatus = "passed" | "passedWithWarnings" | "failed";

export interface EditorValidationDiagnosticView<TJumpTarget = unknown> {
  severity: "error" | "warning";
  source: "import" | "authoring";
  title: string;
  description: string;
  suggestion: string;
  fieldLabel?: string;
  authorPath?: string;
  locationLabel?: string;
  groupType: string;
  specificGroup: string;
  jumpTarget?: TJumpTarget;
  technical?: {
    code?: string;
    internalPath?: string;
    value?: unknown;
  };
}

export interface EditorValidationViewModel<TJumpTarget = unknown> {
  status: EditorValidationStatus;
  title: string;
  description: string;
  summary: {
    errorCount: number;
    warningCount: number;
    checkedItemCount: number;
  };
  diagnostics: EditorValidationDiagnosticView<TJumpTarget>[];
  groups: {
    critical: EditorValidationDiagnosticView<TJumpTarget>[];
    warnings: EditorValidationDiagnosticView<TJumpTarget>[];
    bySpecificGroup: Record<string, EditorValidationDiagnosticView<TJumpTarget>[]>;
    byGroupType: Record<string, EditorValidationDiagnosticView<TJumpTarget>[]>;
  };
}

interface EditorValidationStatusCopy {
  title: string;
  description: string;
}

export interface CreateEditorValidationViewModelInput<TJumpTarget = unknown> {
  diagnostics: EditorValidationDiagnosticView<TJumpTarget>[];
  checkedItemCount: number;
  copy?: Partial<Record<EditorValidationStatus, EditorValidationStatusCopy>>;
}

function groupDiagnosticsBy<TJumpTarget>(
  diagnostics: EditorValidationDiagnosticView<TJumpTarget>[],
  getKey: (diagnostic: EditorValidationDiagnosticView<TJumpTarget>) => string,
) {
  const groups = new Map<string, EditorValidationDiagnosticView<TJumpTarget>[]>();
  for (const diagnostic of diagnostics) {
    const key = getKey(diagnostic);
    groups.set(key, [...(groups.get(key) ?? []), diagnostic]);
  }
  return Object.fromEntries(groups) as Record<
    string,
    EditorValidationDiagnosticView<TJumpTarget>[]
  >;
}

function statusCopy(
  status: EditorValidationStatus,
  summary: EditorValidationViewModel["summary"],
): EditorValidationStatusCopy {
  if (status === "failed") {
    return {
      title: "验证发现需要修复的问题",
      description: `检测到 ${summary.errorCount} 个错误和 ${summary.warningCount} 个警告。导出发布前应修复这些草稿问题。`,
    };
  }

  if (status === "passedWithWarnings") {
    return {
      title: "验证通过，但有建议处理的问题",
      description: `当前草稿可以导出发布文件，但建议处理 ${summary.warningCount} 个警告。`,
    };
  }

  return {
    title: "验证通过",
    description: "当前草稿符合检查要求，可以导出发布文件。",
  };
}

export function createEditorValidationViewModel<TJumpTarget = unknown>(
  input: CreateEditorValidationViewModelInput<TJumpTarget>,
): EditorValidationViewModel<TJumpTarget> {
  const critical = input.diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error",
  );
  const warnings = input.diagnostics.filter(
    (diagnostic) => diagnostic.severity === "warning",
  );
  const summary = {
    errorCount: critical.length,
    warningCount: warnings.length,
    checkedItemCount: input.checkedItemCount,
  };
  const status: EditorValidationStatus =
    summary.errorCount > 0
      ? "failed"
      : summary.warningCount > 0
        ? "passedWithWarnings"
        : "passed";
  const copy = input.copy?.[status] ?? statusCopy(status, summary);

  return {
    status,
    title: copy.title,
    description: copy.description,
    summary,
    diagnostics: input.diagnostics,
    groups: {
      critical,
      warnings,
      bySpecificGroup: groupDiagnosticsBy(
        input.diagnostics,
        (diagnostic) => diagnostic.specificGroup,
      ),
      byGroupType: groupDiagnosticsBy(
        input.diagnostics,
        (diagnostic) => diagnostic.groupType,
      ),
    },
  };
}
