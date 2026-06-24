import type { StandardCard } from "@/card/card-types";
import type {
  CardAutomationCardType,
  CardMatchIR,
} from "./ir-types";

const CARD_AUTOMATION_TYPES = new Set<string>([
  "profession",
  "ancestry",
  "community",
  "subclass",
  "domain",
  "variant",
]);

export interface CardAutomationCardFact {
  type?: CardAutomationCardType;
  classification?: string;
  level?: number;
  variantType?: string;
  variantSubCategory?: string;
}

export function getCardAutomationCardType(
  card: StandardCard,
): CardAutomationCardType | undefined {
  return CARD_AUTOMATION_TYPES.has(card.type)
    ? (card.type as CardAutomationCardType)
    : undefined;
}

export function getCardAutomationClassification(
  card: StandardCard,
): string | undefined {
  return getCardAutomationCardType(card) === "domain" && card.class
    ? card.class
    : undefined;
}

export function getCardAutomationLevel(card: StandardCard): number | undefined {
  return getCardAutomationCardType(card) === "domain" &&
    typeof card.level === "number" &&
    Number.isFinite(card.level)
    ? card.level
    : undefined;
}

export function toCardAutomationCardFact(
  card: StandardCard,
): CardAutomationCardFact {
  return {
    type: getCardAutomationCardType(card),
    classification: getCardAutomationClassification(card),
    level: getCardAutomationLevel(card),
    variantType: card.variantSpecial?.realType,
    variantSubCategory: card.variantSpecial?.subCategory,
  };
}

export function matchesCardAutomationCard(
  cardFact: CardAutomationCardFact,
  match: CardMatchIR,
): boolean {
  if (match.type !== undefined && cardFact.type !== match.type) return false;
  if (
    match.classification !== undefined &&
    cardFact.classification !== match.classification
  ) {
    return false;
  }
  if (match.level !== undefined && cardFact.level !== match.level) return false;
  if (
    match.variantType !== undefined &&
    cardFact.variantType !== match.variantType
  ) {
    return false;
  }
  if (
    match.variantSubCategory !== undefined &&
    cardFact.variantSubCategory !== match.variantSubCategory
  ) {
    return false;
  }
  return true;
}
