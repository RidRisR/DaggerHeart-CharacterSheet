import type { ResolvedCardAutomation } from "./ir-types";

export interface CardAutomationRequirementReadModel {
  cardInstanceId: string;
  cardTemplateId: string;
  cardName: string;
  abilityId: string;
  abilityLabel: string;
  choiceId: string;
  status: "missingChoice";
  selectedIds: string[];
  availableActions: ["setChoiceValues"];
}

export function projectCardAutomationRequirements(
  resolved: ResolvedCardAutomation,
): CardAutomationRequirementReadModel[] {
  return resolved.sources.flatMap((source) =>
    source.abilities.flatMap((ability) => {
      if (ability.status !== "blocked") return [];
      return Object.values(ability.choices)
        .filter((choice) => choice.status === "missing")
        .map((choice) => ({
          cardInstanceId: source.cardInstanceId,
          cardTemplateId: source.cardTemplateId,
          cardName: source.cardName,
          abilityId: ability.abilityId,
          abilityLabel: ability.abilityLabel,
          choiceId: choice.choiceId,
          status: "missingChoice" as const,
          selectedIds: choice.selectedIds,
          availableActions: ["setChoiceValues"] as ["setChoiceValues"],
        }));
    }),
  );
}
