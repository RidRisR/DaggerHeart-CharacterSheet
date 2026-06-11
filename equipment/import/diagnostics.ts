import type {
  EquipmentPackImportDiagnostic,
  EquipmentPackImportErrorCode,
  EquipmentPackImportWarningCode,
} from "./types"

export function makeErrorDiagnostic(
  code: EquipmentPackImportErrorCode,
  path: string,
  message: string,
  extras: Pick<Extract<EquipmentPackImportDiagnostic, { severity: "error" }>, "value" | "relatedPaths"> = {},
): EquipmentPackImportDiagnostic {
  return {
    severity: "error",
    code,
    path,
    message,
    ...extras,
  }
}

export function makeWarningDiagnostic(
  code: EquipmentPackImportWarningCode,
  path: string,
  message: string,
  extras: Pick<Extract<EquipmentPackImportDiagnostic, { severity: "warning" }>, "value" | "relatedPaths"> = {},
): EquipmentPackImportDiagnostic {
  return {
    severity: "warning",
    code,
    path,
    message,
    ...extras,
  }
}

export function countDiagnostics(diagnostics: EquipmentPackImportDiagnostic[]) {
  return {
    warningCount: diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length,
    errorCount: diagnostics.filter((diagnostic) => diagnostic.severity === "error").length,
  }
}
