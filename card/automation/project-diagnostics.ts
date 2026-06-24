import type { ResolvedCardAutomation } from "./ir-types";
import type { CardAutomationRuntimeDiagnostic } from "./runtime-diagnostics";

export function projectCardAutomationDiagnostics(
  resolved: ResolvedCardAutomation,
): CardAutomationRuntimeDiagnostic[] {
  return resolved.diagnostics;
}
