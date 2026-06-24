import type { CardConditionIR, ResolvedCardChoice } from "./ir-types";
import type { CardAutomationSnapshot } from "./snapshot";
import { matchesCardAutomationCard } from "./card-getters";

export function evaluateCardCondition(
  condition: CardConditionIR,
  snapshot: CardAutomationSnapshot,
  choices: Record<string, ResolvedCardChoice>,
): boolean {
  switch (condition.kind) {
    case "all":
      return condition.conditions.every((nested) =>
        evaluateCardCondition(nested, snapshot, choices),
      );
    case "any":
      return condition.conditions.some((nested) =>
        evaluateCardCondition(nested, snapshot, choices),
      );
    case "not":
      return !evaluateCardCondition(condition.condition, snapshot, choices);
    case "equipmentSlotEmpty":
      return snapshot.equipmentSlots[condition.slot].empty;
    case "equipmentSlotFilled":
      return !snapshot.equipmentSlots[condition.slot].empty;
    case "cardCount": {
      const count = snapshot.cards.filter((card) => {
        if (condition.zone !== "any" && card.zone !== condition.zone) {
          return false;
        }
        return matchesCardAutomationCard(card, condition.match);
      }).length;
      return condition.atLeast !== undefined
        ? count >= condition.atLeast
        : count === condition.exactly;
    }
    case "choiceEquals": {
      const choice = choices[condition.choiceId];
      return (
        choice?.status === "valid" &&
        choice.selectedIds.length === 1 &&
        choice.selectedIds[0] === condition.valueId
      );
    }
    case "choiceIncludes": {
      const choice = choices[condition.choiceId];
      return (
        choice?.status === "valid" &&
        choice.selectedIds.includes(condition.valueId)
      );
    }
  }
}
