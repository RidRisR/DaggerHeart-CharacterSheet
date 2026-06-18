import type {
  CardImportDiagnostic,
  CardImportErrorCode,
  CardImportErrorDiagnostic,
  CardImportWarningCode,
  CardImportWarningDiagnostic,
} from "./types"

export function makeDiagnostic(
  severity: "error",
  code: CardImportErrorCode,
  path: string,
  message: string,
  options?: { value?: unknown; relatedPaths?: string[] },
): CardImportErrorDiagnostic
export function makeDiagnostic(
  severity: "warning",
  code: CardImportWarningCode,
  path: string,
  message: string,
  options?: { value?: unknown; relatedPaths?: string[] },
): CardImportWarningDiagnostic
export function makeDiagnostic(
  severity: CardImportDiagnostic["severity"],
  code: CardImportErrorCode | CardImportWarningCode,
  path: string,
  message: string,
  options: { value?: unknown; relatedPaths?: string[] } = {},
): CardImportDiagnostic {
  return { severity, code, path, message, ...options } as CardImportDiagnostic
}

export function makeCardImportError(
  code: CardImportErrorCode,
  path: string,
  message: string,
  options: { value?: unknown; relatedPaths?: string[] } = {},
): CardImportErrorDiagnostic {
  return makeDiagnostic("error", code, path, message, options)
}

export function makeCardImportWarning(
  code: CardImportWarningCode,
  path: string,
  message: string,
  options: { value?: unknown; relatedPaths?: string[] } = {},
): CardImportWarningDiagnostic {
  return makeDiagnostic("warning", code, path, message, options)
}

export function countCardImportDiagnostics(diagnostics: CardImportDiagnostic[]) {
  return {
    warningCount: diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length,
    errorCount: diagnostics.filter((diagnostic) => diagnostic.severity === "error").length,
  }
}
