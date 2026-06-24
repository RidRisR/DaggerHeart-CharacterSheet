export type CardAutomationCompilerDiagnosticSeverity = "error" | "warning"

export type CardAutomationCompilerDiagnosticCode =
  | "UNSUPPORTED_AUTOMATION_FORMAT"
  | "INVALID_AUTOMATION_DEFINITION"
  | "INVALID_AUTOMATION_IR"
  | "AUTOMATION_LIMIT_EXCEEDED"

export interface CardAutomationCompilerDiagnostic {
  severity: CardAutomationCompilerDiagnosticSeverity
  code: CardAutomationCompilerDiagnosticCode
  message: string
  path?: string
  value?: unknown
}

export function cardAutomationCompilerError(
  code: CardAutomationCompilerDiagnosticCode,
  message: string,
  details: Omit<CardAutomationCompilerDiagnostic, "severity" | "code" | "message"> = {},
): CardAutomationCompilerDiagnostic {
  return { severity: "error", code, message, ...details }
}
