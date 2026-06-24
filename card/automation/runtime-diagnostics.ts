export type CardAutomationRuntimeDiagnosticSeverity = "error" | "warning"

export type CardAutomationRuntimeDiagnosticCode =
  | "INVALID_ABILITY_STATE"
  | "MISSING_REQUIRED_CHOICE"
  | "INVALID_CHOICE_VALUE"
  | "INVALID_TARGET"
  | "VALUE_EVALUATION_FAILED"
  | "MISSING_INSTANCE_ID"
  | "MISSING_INSTANCE_AUTOMATION"
  | "INVALID_INSTANCE_AUTOMATION_IR"
  | "TEMPLATE_AUTOMATION_DRIFT"
  | "TEMPLATE_AUTOMATION_MISSING"
  | "ORPHAN_ABILITY_STATE"
  | "MULTIPLE_ACTIVE_CHOICES"

export interface CardAutomationRuntimeDiagnostic {
  severity: CardAutomationRuntimeDiagnosticSeverity
  code: CardAutomationRuntimeDiagnosticCode
  message: string
  cardInstanceId?: string
  abilityId?: string
  choiceId?: string
  effectId?: string
}

export function cardAutomationRuntimeError(
  code: CardAutomationRuntimeDiagnosticCode,
  message: string,
  details: Omit<CardAutomationRuntimeDiagnostic, "severity" | "code" | "message"> = {},
): CardAutomationRuntimeDiagnostic {
  return { severity: "error", code, message, ...details }
}

export function cardAutomationRuntimeWarning(
  code: CardAutomationRuntimeDiagnosticCode,
  message: string,
  details: Omit<CardAutomationRuntimeDiagnostic, "severity" | "code" | "message"> = {},
): CardAutomationRuntimeDiagnostic {
  return { severity: "warning", code, message, ...details }
}
