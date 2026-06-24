import type {
  CardAbilityIR,
  CardAutomationIR,
  CardConditionIR,
  CardContributionEffectIR,
  CardEffectIR,
  CardModifierContribution,
  CardModifierSourceIdentity,
  CardOptionEffectIR,
  ResolvedCardAbility,
  ResolvedCardAutomation,
  ResolvedCardAutomationSource,
  ResolvedCardChoice,
  ResolvedCardEffect,
} from "./ir-types";
import type {
  CardAutomationSnapshot,
  CardAutomationSnapshotCard,
} from "./snapshot";
import {
  cardAutomationRuntimeError,
  cardAutomationRuntimeWarning,
  type CardAutomationRuntimeDiagnostic,
} from "./runtime-diagnostics";
import { validateCardAutomationIR } from "./validate-ir";
import { resolveAbilityChoices } from "./choice-resolution";
import { evaluateCardCondition } from "./condition-evaluator";
import { evaluateCardValue } from "./value-evaluator";

function isCardAutomationIR(value: unknown): value is CardAutomationIR {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    (value as CardAutomationIR).format === "daggerheart.card-automation.ir.v1" &&
    typeof (value as CardAutomationIR).revision === "string" &&
    Array.isArray((value as CardAutomationIR).abilities)
  );
}

function createContribution(
  card: CardAutomationSnapshotCard & { instanceId: string },
  ability: CardAbilityIR,
  effect: CardContributionEffectIR,
  value: number,
): CardModifierContribution {
  const effectId = effect.id;
  const source: CardModifierSourceIdentity = {
    type: "card",
    cardInstanceId: card.instanceId,
    cardTemplateId: card.templateId,
    cardName: card.name,
    abilityId: ability.id,
    abilityLabel: ability.label,
    zone: card.zone,
    effectId,
    packId: card.automationSource?.packId,
  };

  return {
    id: `card:${card.instanceId}:${ability.id}:${effectId}`,
    kind: effect.kind === "emitBase" ? "base" : "modifier",
    target: effect.target,
    value,
    label: effect.label ?? ability.label,
    source,
  };
}

function selectedTargetEffectId(effectId: string, target: string): string {
  return `${effectId}:${target}`;
}

function contributionEffectToResolved(
  card: CardAutomationSnapshotCard & { instanceId: string },
  ability: CardAbilityIR,
  effect: CardContributionEffectIR,
  snapshot: CardAutomationSnapshot,
): ResolvedCardEffect {
  const evaluated = evaluateCardValue(effect.value, snapshot);
  if (!evaluated.ok) {
    const diagnostic = cardAutomationRuntimeError(
      "VALUE_EVALUATION_FAILED",
      evaluated.message,
      {
        cardInstanceId: card.instanceId,
        abilityId: ability.id,
        effectId: effect.id,
      },
    );
    return {
      effectId: effect.id,
      status: "invalid",
      diagnostics: [diagnostic],
    };
  }

  return {
    effectId: effect.id,
    status: "ready",
    contribution: createContribution(card, ability, effect, evaluated.value),
    diagnostics: [],
  };
}

function resolveOptionEffect(
  card: CardAutomationSnapshotCard & { instanceId: string },
  ability: CardAbilityIR,
  effect: CardOptionEffectIR,
  snapshot: CardAutomationSnapshot,
  choices: Record<string, ResolvedCardChoice>,
): ResolvedCardEffect[] {
  if (effect.kind !== "emitWhen") {
    return [contributionEffectToResolved(card, ability, effect, snapshot)];
  }
  if (!evaluateCardCondition(effect.when, snapshot, choices)) {
    return [];
  }
  return effect.effects.map((nested) =>
    contributionEffectToResolved(card, ability, nested, snapshot),
  );
}

function conditionReferencesChoice(condition: CardConditionIR): boolean {
  switch (condition.kind) {
    case "choiceEquals":
    case "choiceIncludes":
      return true;
    case "all":
    case "any":
      return condition.conditions.some(conditionReferencesChoice);
    case "not":
      return conditionReferencesChoice(condition.condition);
    case "cardCount":
    case "equipmentSlotEmpty":
    case "equipmentSlotFilled":
      return false;
  }
}

function resolveEffect(
  card: CardAutomationSnapshotCard & { instanceId: string },
  ability: CardAbilityIR,
  effect: CardEffectIR,
  snapshot: CardAutomationSnapshot,
  choices: Record<string, ResolvedCardChoice>,
): ResolvedCardEffect[] {
  switch (effect.kind) {
    case "emitBase":
    case "emitModifier":
      return [contributionEffectToResolved(card, ability, effect, snapshot)];
    case "emitWhen":
      if (!evaluateCardCondition(effect.when, snapshot, choices)) {
        return effect.id
          ? [
              {
                effectId: effect.id,
                status: "skipped",
                diagnostics: [],
              },
            ]
          : [];
      }
      return effect.effects.flatMap((nested) =>
        resolveEffect(card, ability, nested, snapshot, choices),
      );
    case "emitEachSelectedOptionEffect": {
      const choice = choices[effect.choiceId];
      if (choice?.status !== "valid" || !choice.selectedOptions) return [];
      return choice.selectedOptions.flatMap((option) =>
        (option.effects ?? []).flatMap((optionEffect) =>
          resolveOptionEffect(card, ability, optionEffect, snapshot, choices),
        ),
      );
    }
    case "emitEachSelectedTarget": {
      const choice = choices[effect.choiceId];
      if (choice?.status !== "valid" || !choice.selectedTargets) return [];
      return choice.selectedTargets.map((target) =>
        contributionEffectToResolved(
          card,
          ability,
          {
            id: selectedTargetEffectId(effect.id, target),
            kind: "emitModifier",
            target,
            value: effect.value,
            label: effect.label,
          },
          snapshot,
        ),
      );
    }
  }
}

function resolveAbility(
  card: CardAutomationSnapshotCard & { instanceId: string; automation: CardAutomationIR },
  ability: CardAbilityIR,
  snapshot: CardAutomationSnapshot,
): ResolvedCardAbility {
  if (ability.lifetime.kind === "whileInLoadout" && card.zone !== "loadout") {
    return {
      abilityId: ability.id,
      abilityLabel: ability.label,
      lifetime: ability.lifetime,
      status: "inactive",
      choices: {},
      effects: [],
      diagnostics: [],
    };
  }

  if (
    ability.when &&
    !conditionReferencesChoice(ability.when) &&
    !evaluateCardCondition(ability.when, snapshot, {})
  ) {
    return {
      abilityId: ability.id,
      abilityLabel: ability.label,
      lifetime: ability.lifetime,
      status: "inactive",
      choices: {},
      effects: [],
      diagnostics: [],
    };
  }

  const abilityState = card.automationState?.abilities?.[ability.id];
  const choicesResult = resolveAbilityChoices(
    card.instanceId,
    ability,
    abilityState,
    snapshot,
  );
  const diagnostics = [...choicesResult.diagnostics];
  const missingChoices = Object.values(choicesResult.choices).filter(
    (choice) => choice.status === "missing",
  );

  if (
    ability.when &&
    !evaluateCardCondition(ability.when, snapshot, choicesResult.choices)
  ) {
    return {
      abilityId: ability.id,
      abilityLabel: ability.label,
      lifetime: ability.lifetime,
      status: "inactive",
      choices: choicesResult.choices,
      effects: [],
      diagnostics,
    };
  }

  if (missingChoices.length > 1) {
    diagnostics.push(
      cardAutomationRuntimeError(
        "MULTIPLE_ACTIVE_CHOICES",
        `Card ability "${ability.id}" has multiple active missing choices.`,
        { cardInstanceId: card.instanceId, abilityId: ability.id },
      ),
    );
  }

  const hasInvalidChoice = Object.values(choicesResult.choices).some(
    (choice) => choice.status === "invalid",
  );
  const hasInvalidAbilityState = diagnostics.some(
    (diagnostic) => diagnostic.code === "INVALID_ABILITY_STATE",
  );

  if (missingChoices.length > 1 || hasInvalidChoice || hasInvalidAbilityState) {
    return {
      abilityId: ability.id,
      abilityLabel: ability.label,
      lifetime: ability.lifetime,
      status: "invalid",
      choices: choicesResult.choices,
      effects: [],
      diagnostics,
    };
  }

  if (missingChoices.length === 1) {
    return {
      abilityId: ability.id,
      abilityLabel: ability.label,
      lifetime: ability.lifetime,
      status: "blocked",
      choices: choicesResult.choices,
      effects: [],
      diagnostics,
    };
  }

  const effects = ability.effects.flatMap((effect) =>
    resolveEffect(card, ability, effect, snapshot, choicesResult.choices),
  );
  diagnostics.push(
    ...effects.flatMap((effect) => effect.diagnostics),
  );

  return {
    abilityId: ability.id,
    abilityLabel: ability.label,
    lifetime: ability.lifetime,
    status: effects.some((effect) => effect.status === "invalid")
      ? "invalid"
      : "ready",
    choices: choicesResult.choices,
    effects: effects.some((effect) => effect.status === "invalid")
      ? effects.map((effect) => ({ ...effect, contribution: undefined }))
      : effects,
    diagnostics,
  };
}

function templateDiagnostics(
  card: CardAutomationSnapshotCard & { instanceId: string; automation: CardAutomationIR },
): CardAutomationRuntimeDiagnostic[] {
  if (!card.templateLookupAttempted || !card.automationSource) return [];
  if (!card.template) {
    return [
      cardAutomationRuntimeWarning(
        "TEMPLATE_AUTOMATION_MISSING",
        `Card template "${card.templateId}" is unavailable for automation diagnostics.`,
        { cardInstanceId: card.instanceId },
      ),
    ];
  }

  const instanceRevision = card.automation.revision;
  const currentRevision = card.template.automation?.revision;
  if (
    instanceRevision &&
    currentRevision &&
    instanceRevision !== currentRevision
  ) {
    return [
      cardAutomationRuntimeWarning(
        "TEMPLATE_AUTOMATION_DRIFT",
        `Card instance automation revision differs from template "${card.templateId}".`,
        { cardInstanceId: card.instanceId },
      ),
    ];
  }
  return [];
}

function validateInstanceAutomationIR(ir: CardAutomationIR): boolean {
  try {
    return validateCardAutomationIR(ir).ok;
  } catch {
    return false;
  }
}

function sourceDiagnostics(
  card: CardAutomationSnapshotCard,
): CardAutomationRuntimeDiagnostic[] {
  const diagnostics: CardAutomationRuntimeDiagnostic[] = [];
  if (!card.instanceId) {
    if (card.automation || card.automationState) {
      diagnostics.push(
        cardAutomationRuntimeError(
          "MISSING_INSTANCE_ID",
          `Card "${card.name}" is missing an instance id.`,
        ),
      );
    }
    return diagnostics;
  }

  if (!card.automation) {
    const currentTemplateHasAutomation = Boolean(card.template?.automation);
    if (
      card.name.trim() &&
      (card.automationState || currentTemplateHasAutomation)
    ) {
      diagnostics.push(
        cardAutomationRuntimeError(
          "MISSING_INSTANCE_AUTOMATION",
          `Card instance "${card.instanceId}" has automation state but no automation IR.`,
          { cardInstanceId: card.instanceId },
        ),
      );
    }
    return diagnostics;
  }

  if (!isCardAutomationIR(card.automation)) {
    diagnostics.push(
      cardAutomationRuntimeError(
        "INVALID_INSTANCE_AUTOMATION_IR",
        `Card instance "${card.instanceId}" has invalid automation IR.`,
        { cardInstanceId: card.instanceId },
      ),
    );
    return diagnostics;
  }

  if (!validateInstanceAutomationIR(card.automation)) {
    diagnostics.push(
      cardAutomationRuntimeError(
        "INVALID_INSTANCE_AUTOMATION_IR",
        `Card instance "${card.instanceId}" has invalid automation IR.`,
        { cardInstanceId: card.instanceId },
      ),
    );
    return diagnostics;
  }

  const abilityIds = new Set(card.automation.abilities.map((ability) => ability.id));
  Object.keys(card.automationState?.abilities ?? {}).forEach((abilityId) => {
    if (!abilityIds.has(abilityId)) {
      diagnostics.push(
        cardAutomationRuntimeError(
          "ORPHAN_ABILITY_STATE",
          `Card instance "${card.instanceId}" stores state for unknown ability "${abilityId}".`,
          { cardInstanceId: card.instanceId, abilityId },
        ),
      );
    }
  });

  diagnostics.push(
    ...templateDiagnostics(
      card as CardAutomationSnapshotCard & {
        instanceId: string;
        automation: CardAutomationIR;
      },
    ),
  );
  return diagnostics;
}

export function resolveCardAutomation(
  snapshot: CardAutomationSnapshot,
): ResolvedCardAutomation {
  const sources: ResolvedCardAutomationSource[] = [];
  const diagnostics: CardAutomationRuntimeDiagnostic[] = [];

  snapshot.cards.forEach((card) => {
    const cardDiagnostics = sourceDiagnostics(card);
    diagnostics.push(...cardDiagnostics);

    if (!card.instanceId || !card.automation || !isCardAutomationIR(card.automation)) {
      return;
    }
    if (cardDiagnostics.some((diagnostic) => diagnostic.code === "INVALID_INSTANCE_AUTOMATION_IR")) {
      return;
    }

    const resolvedCard = card as CardAutomationSnapshotCard & {
      instanceId: string;
      automation: CardAutomationIR;
    };
    const abilities = resolvedCard.automation.abilities.map((ability) =>
      resolveAbility(resolvedCard, ability, snapshot),
    );
    diagnostics.push(...abilities.flatMap((ability) => ability.diagnostics));
    sources.push({
      cardInstanceId: resolvedCard.instanceId,
      cardTemplateId: resolvedCard.templateId,
      cardName: resolvedCard.name,
      zone: resolvedCard.zone,
      abilities,
    });
  });

  return { sources, diagnostics };
}
