import type { ModifierTargetId } from "@/automation/core/types";
import {
  cardAutomationRuntimeError,
  type CardAutomationRuntimeDiagnostic,
} from "./runtime-diagnostics";
import type {
  CardAbilityIR,
  CardChoiceIR,
  CardModifierTargetId,
  ResolvedCardChoice,
} from "./ir-types";
import type { CardAutomationSnapshot } from "./snapshot";
import { evaluateCardCondition } from "./condition-evaluator";

export interface ResolvedAbilityChoices {
  choices: Record<string, ResolvedCardChoice>;
  diagnostics: CardAutomationRuntimeDiagnostic[];
}

function availableTargetsForChoice(
  choice: CardChoiceIR,
  snapshot: CardAutomationSnapshot,
): ModifierTargetId[] {
  if (choice.domain.kind !== "modifierTargetGroup") return [];
  return snapshot.resolvableTargets[choice.domain.group];
}

function invalidChoiceDiagnostic(
  cardInstanceId: string,
  abilityId: string,
  choiceId: string,
  message: string,
): CardAutomationRuntimeDiagnostic {
  return cardAutomationRuntimeError("INVALID_CHOICE_VALUE", message, {
    cardInstanceId,
    abilityId,
    choiceId,
  });
}

function hasValidCardinality(choice: CardChoiceIR, selectedIds: string[]): boolean {
  const { min, max, unique } = choice.cardinality;
  if (selectedIds.length < min || selectedIds.length > max) return false;
  if (unique && new Set(selectedIds).size !== selectedIds.length) return false;
  return true;
}

function resolveChoice(
  cardInstanceId: string,
  ability: CardAbilityIR,
  choice: CardChoiceIR,
  rawValues: string[] | undefined,
  snapshot: CardAutomationSnapshot,
  resolvedChoices: Record<string, ResolvedCardChoice>,
): ResolvedCardChoice {
  const required = choice.requiredWhen
    ? evaluateCardCondition(choice.requiredWhen, snapshot, resolvedChoices)
    : true;

  if (!required) {
    return {
      choiceId: choice.id,
      kind: choice.kind,
      status: "notRequired",
      selectedIds: [],
      diagnostics: [],
    };
  }

  const selectedIds = rawValues ?? [];
  if (selectedIds.length === 0 && choice.cardinality.min > 0) {
    const diagnostic = cardAutomationRuntimeError(
      "MISSING_REQUIRED_CHOICE",
      `Card ability "${ability.id}" is missing required choice "${choice.id}".`,
      { cardInstanceId, abilityId: ability.id, choiceId: choice.id },
    );
    return {
      choiceId: choice.id,
      kind: choice.kind,
      status: "missing",
      selectedIds,
      diagnostics: [diagnostic],
    };
  }

  const diagnostics: CardAutomationRuntimeDiagnostic[] = [];
  if (!hasValidCardinality(choice, selectedIds)) {
    diagnostics.push(
      invalidChoiceDiagnostic(
        cardInstanceId,
        ability.id,
        choice.id,
        `Choice "${choice.id}" has invalid cardinality.`,
      ),
    );
  }

  if (choice.domain.kind === "staticOptions") {
    const optionsById = new Map(
      choice.domain.options.map((option) => [option.id, option]),
    );
    selectedIds.forEach((selectedId) => {
      if (!optionsById.has(selectedId)) {
        diagnostics.push(
          invalidChoiceDiagnostic(
            cardInstanceId,
            ability.id,
            choice.id,
            `Choice "${choice.id}" contains unknown option "${selectedId}".`,
          ),
        );
      }
    });
    return {
      choiceId: choice.id,
      kind: choice.kind,
      status: diagnostics.length > 0 ? "invalid" : "valid",
      selectedIds,
      selectedOptions: selectedIds
        .map((selectedId) => optionsById.get(selectedId))
        .filter((option): option is NonNullable<typeof option> => Boolean(option)),
      diagnostics,
    };
  }

  const availableTargets = new Set(availableTargetsForChoice(choice, snapshot));
  selectedIds.forEach((selectedId) => {
    if (!availableTargets.has(selectedId as CardModifierTargetId)) {
      diagnostics.push(
        invalidChoiceDiagnostic(
          cardInstanceId,
          ability.id,
          choice.id,
          `Choice "${choice.id}" contains unknown target "${selectedId}".`,
        ),
      );
    }
  });
  return {
    choiceId: choice.id,
    kind: choice.kind,
    status: diagnostics.length > 0 ? "invalid" : "valid",
    selectedIds,
    selectedTargets: selectedIds.filter((selectedId): selectedId is CardModifierTargetId =>
      availableTargets.has(selectedId as CardModifierTargetId),
    ),
    diagnostics,
  };
}

export function resolveAbilityChoices(
  cardInstanceId: string,
  ability: CardAbilityIR,
  abilityState: { choiceValues?: Record<string, string[]> } | undefined,
  snapshot: CardAutomationSnapshot,
): ResolvedAbilityChoices {
  const choices: Record<string, ResolvedCardChoice> = {};
  const diagnostics: CardAutomationRuntimeDiagnostic[] = [];
  const declaredChoiceIds = new Set((ability.choices ?? []).map((choice) => choice.id));

  Object.keys(abilityState?.choiceValues ?? {}).forEach((choiceId) => {
    if (!declaredChoiceIds.has(choiceId)) {
      diagnostics.push(
        cardAutomationRuntimeError(
          "INVALID_ABILITY_STATE",
          `Card ability "${ability.id}" stores unknown choice "${choiceId}".`,
          { cardInstanceId, abilityId: ability.id, choiceId },
        ),
      );
    }
  });

  (ability.choices ?? []).forEach((choice) => {
    const resolved = resolveChoice(
      cardInstanceId,
      ability,
      choice,
      abilityState?.choiceValues?.[choice.id],
      snapshot,
      choices,
    );
    choices[choice.id] = resolved;
    diagnostics.push(...resolved.diagnostics);
  });

  return { choices, diagnostics };
}
