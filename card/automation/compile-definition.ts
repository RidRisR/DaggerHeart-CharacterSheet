import type { CardAutomationCompilerDiagnostic } from "./compiler-diagnostics";
import type { CardAutomationDefinition } from "./definition-types";
import type { CardAutomationIR } from "./ir-types";
import { normalizeCardAutomationDefinition } from "./normalize-definition";
import { createCardAutomationRevision } from "./revision";
import { validateCardAutomationIR } from "./validate-ir";

export type CompileCardAutomationDefinitionResult =
  | {
      ok: true;
      ir: CardAutomationIR;
      diagnostics: CardAutomationCompilerDiagnostic[];
    }
  | { ok: false; diagnostics: CardAutomationCompilerDiagnostic[] };

export function compileCardAutomationDefinition(
  definition: unknown,
): CompileCardAutomationDefinitionResult {
  const normalized = normalizeCardAutomationDefinition(
    definition as CardAutomationDefinition,
  );
  if (!normalized.ok) return normalized;

  const irWithoutRevision = normalized.irWithoutRevision;
  const ir: CardAutomationIR = {
    ...irWithoutRevision,
    revision: createCardAutomationRevision(irWithoutRevision),
  };
  const validation = validateCardAutomationIR(ir);
  if (!validation.ok) return validation;

  return { ok: true, ir, diagnostics: [] };
}
