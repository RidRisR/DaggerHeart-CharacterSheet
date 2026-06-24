import type { SheetData } from "@/lib/sheet-data";
import { resolveAbilityChoices } from "./choice-resolution";
import type {
  CardAbilityIR,
  CardChoiceIR,
  CardChoiceValues,
  CardZone,
  ResolvedCardChoice,
} from "./ir-types";
import { resolveCardAutomation } from "./resolve";
import {
  buildCardAutomationSnapshot,
  type CardAutomationSnapshot,
  type CardAutomationSnapshotCard,
} from "./snapshot";
import type { CardAutomationRuntimeDiagnostic } from "./runtime-diagnostics";

const ATTRIBUTE_TARGET_LABELS: Record<string, string> = {
  "agility.value": "敏捷",
  "strength.value": "力量",
  "finesse.value": "灵巧",
  "instinct.value": "本能",
  "presence.value": "风度",
  "knowledge.value": "知识",
};

export interface ProjectCardAutomationSetupRequirementsOptions {
  cardInstanceId?: string;
}

export interface CardAutomationSetupOption {
  id: string;
  label: string;
}

export type CardAutomationSetupChoiceStatus =
  | "notRequired"
  | "missing"
  | "valid"
  | "invalid";

export interface CardAutomationSetupChoice {
  choiceId: string;
  label?: string;
  kind: CardChoiceIR["kind"];
  cardinality: CardChoiceIR["cardinality"];
  selectedIds: string[];
  status: CardAutomationSetupChoiceStatus;
  options: CardAutomationSetupOption[];
  emptyOptionsReason?: string;
}

export interface CardAutomationSetupRequirement {
  cardInstanceId: string;
  cardTemplateId: string;
  cardName: string;
  zone: CardZone;
  abilityId: string;
  abilityLabel: string;
  choices: CardAutomationSetupChoice[];
}

export interface ProjectCardAutomationSetupDraftInput {
  cardInstanceId: string;
  abilityId: string;
  draftChoiceValues: CardChoiceValues;
}

export interface CardAutomationSetupDraftProjection {
  requirement?: CardAutomationSetupRequirement;
  activeChoice?: CardAutomationSetupChoice;
  canSaveAbility: boolean;
  savableChoiceValues: CardChoiceValues;
  discardedChoiceIds: string[];
  diagnostics: CardAutomationRuntimeDiagnostic[];
}

function experienceOptionLabel(sheetData: SheetData, targetId: string): string {
  const match = /^experienceValues\.(\d+)$/.exec(targetId);
  if (!match) return targetId;
  const index = Number(match[1]);
  return `经历 ${index + 1}：${sheetData.experience?.[index] ?? ""}`;
}

function optionsForChoice(
  choice: CardChoiceIR,
  sheetData: SheetData,
  snapshot: CardAutomationSnapshot,
): CardAutomationSetupOption[] {
  if (choice.domain.kind === "staticOptions") {
    return choice.domain.options.map((option) => ({
      id: option.id,
      label: option.label,
    }));
  }

  const targetIds = snapshot.selectableTargets[choice.domain.group] ?? [];
  if (choice.domain.group === "experiences") {
    return targetIds.map((targetId) => ({
      id: targetId,
      label: experienceOptionLabel(sheetData, targetId),
    }));
  }

  return targetIds.map((targetId) => ({
    id: targetId,
    label: ATTRIBUTE_TARGET_LABELS[targetId] ?? targetId,
  }));
}

function emptyOptionsReasonForChoice(choice: CardChoiceIR): string | undefined {
  if (choice.domain.kind === "staticOptions") {
    return "卡牌自动化定义没有提供可选择项。";
  }

  if (choice.domain.group === "experiences") {
    return "缺少可选择的经历。请先在角色表的经历栏填写经历名称。";
  }

  return "当前没有可选择的属性目标。请检查卡牌自动化定义。";
}

function setupChoiceFromResolved(
  choice: CardChoiceIR,
  resolved: ResolvedCardChoice | undefined,
  sheetData: SheetData,
  snapshot: CardAutomationSnapshot,
): CardAutomationSetupChoice {
  const options = optionsForChoice(choice, sheetData, snapshot);

  return {
    choiceId: choice.id,
    label: choice.label,
    kind: choice.kind,
    cardinality: { ...choice.cardinality },
    selectedIds: [...(resolved?.selectedIds ?? [])],
    status: resolved?.status ?? "notRequired",
    options,
    emptyOptionsReason:
      options.length === 0 ? emptyOptionsReasonForChoice(choice) : undefined,
  };
}

function setupRequirementFromChoices(input: {
  card: CardAutomationSnapshotCard & { instanceId: string };
  ability: CardAbilityIR;
  choices: Record<string, ResolvedCardChoice>;
  sheetData: SheetData;
  snapshot: CardAutomationSnapshot;
}): CardAutomationSetupRequirement {
  return {
    cardInstanceId: input.card.instanceId,
    cardTemplateId: input.card.templateId,
    cardName: input.card.name,
    zone: input.card.zone,
    abilityId: input.ability.id,
    abilityLabel: input.ability.label,
    choices: (input.ability.choices ?? []).map((choice) =>
      setupChoiceFromResolved(
        choice,
        input.choices[choice.id],
        input.sheetData,
        input.snapshot,
      ),
    ),
  };
}

function findSnapshotCard(
  snapshot: CardAutomationSnapshot,
  cardInstanceId: string,
): (CardAutomationSnapshotCard & { instanceId: string }) | undefined {
  return snapshot.cards.find(
    (card): card is CardAutomationSnapshotCard & { instanceId: string } =>
      card.instanceId === cardInstanceId,
  );
}

export function projectCardAutomationSetupRequirements(
  sheetData: SheetData,
  options: ProjectCardAutomationSetupRequirementsOptions = {},
): CardAutomationSetupRequirement[] {
  const snapshot = buildCardAutomationSnapshot(sheetData);
  const resolved = resolveCardAutomation(snapshot);
  const snapshotCards = new Map(
    snapshot.cards
      .filter(
        (card): card is CardAutomationSnapshotCard & { instanceId: string } =>
          Boolean(card.instanceId),
      )
      .map((card) => [card.instanceId, card]),
  );

  return resolved.sources.flatMap((source) => {
    if (
      options.cardInstanceId &&
      source.cardInstanceId !== options.cardInstanceId
    ) {
      return [];
    }

    const card = snapshotCards.get(source.cardInstanceId);
    if (!card?.automation) return [];
    const abilitiesById = new Map(
      card.automation.abilities.map((ability) => [ability.id, ability]),
    );

    return source.abilities.flatMap((resolvedAbility) => {
      if (resolvedAbility.status !== "blocked") return [];
      const ability = abilitiesById.get(resolvedAbility.abilityId);
      if (!ability) return [];

      return [
        setupRequirementFromChoices({
          card,
          ability,
          choices: resolvedAbility.choices,
          sheetData,
          snapshot,
        }),
      ];
    });
  });
}

export function projectCardAutomationSetupDraft(
  sheetData: SheetData,
  input: ProjectCardAutomationSetupDraftInput,
): CardAutomationSetupDraftProjection {
  const safeProjection: CardAutomationSetupDraftProjection = {
    canSaveAbility: false,
    savableChoiceValues: {},
    discardedChoiceIds: [],
    diagnostics: [],
  };
  const snapshot = buildCardAutomationSnapshot(sheetData);
  const card = findSnapshotCard(snapshot, input.cardInstanceId);
  const ability = card?.automation?.abilities.find(
    (candidate) => candidate.id === input.abilityId,
  );

  if (!card || !ability) return safeProjection;

  const resolved = resolveAbilityChoices(
    card.instanceId,
    ability,
    { choiceValues: input.draftChoiceValues },
    snapshot,
  );
  const requirement = setupRequirementFromChoices({
    card,
    ability,
    choices: resolved.choices,
    sheetData,
    snapshot,
  });
  const activeChoice = requirement.choices.find(
    (choice) => choice.status === "missing" || choice.status === "invalid",
  );
  const allChoicesSavable = Object.values(resolved.choices).every(
    (choice) => choice.status === "valid" || choice.status === "notRequired",
  );
  const savableChoiceValues: CardChoiceValues = {};
  const discardedChoiceIds: string[] = [];
  const declaredChoiceIds = new Set(
    (ability.choices ?? []).map((choice) => choice.id),
  );

  Object.keys(input.draftChoiceValues).forEach((choiceId) => {
    const resolvedChoice = resolved.choices[choiceId];
    if (
      !declaredChoiceIds.has(choiceId) ||
      resolvedChoice?.status === "notRequired"
    ) {
      discardedChoiceIds.push(choiceId);
      return;
    }
    if (resolvedChoice?.status === "valid") {
      savableChoiceValues[choiceId] = [...resolvedChoice.selectedIds];
    }
  });

  return {
    requirement,
    activeChoice,
    canSaveAbility: allChoicesSavable && resolved.diagnostics.length === 0,
    savableChoiceValues,
    discardedChoiceIds,
    diagnostics: resolved.diagnostics,
  };
}
