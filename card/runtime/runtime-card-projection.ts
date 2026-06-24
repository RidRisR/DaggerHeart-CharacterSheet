import { CardType, processCardDescription, type ExtendedStandardCard } from "@/card/card-types"
import type { CardPackDryRunCard, CardPackDryRunValidationModel } from "@/card/import/types"

function subclassLevelToNumber(level: string): number {
  switch (level) {
    case "基石":
      return 1
    case "专精":
      return 2
    case "大师":
      return 3
    default:
      return 0
  }
}

function projectCardFields(card: CardPackDryRunCard): ExtendedStandardCard {
  switch (card.group) {
    case "classes":
      return {
        standarized: true,
        id: card.id,
        name: card.name,
        type: CardType.Profession,
        description: processCardDescription(card.classFeature) || "",
        hint: card.summary,
        imageUrl: card.imageUrl || "",
        hasLocalImage: card.hasLocalImage,
        class: card.name,
        headerDisplay: card.name,
        cardSelectDisplay: {
          item1: card.domain1,
          item2: card.domain2,
        },
        professionSpecial: {
          "起始生命": card.startingHitPoints,
          "起始闪避": card.startingEvasion,
          "起始物品": card.startingItems,
          "希望特性": card.hopeFeature,
        },
      }
    case "ancestries":
      return {
        standarized: true,
        id: card.id,
        name: card.name,
        type: CardType.Ancestry,
        description: processCardDescription(card.effect) || "",
        hint: card.summary,
        imageUrl: card.imageUrl || "",
        hasLocalImage: card.hasLocalImage,
        level: card.category,
        class: card.ancestry,
        headerDisplay: card.name,
        cardSelectDisplay: {
          item1: card.ancestry,
        },
      }
    case "communities":
      return {
        standarized: true,
        id: card.id,
        name: card.name,
        type: CardType.Community,
        description: processCardDescription(card.description) || "",
        hint: card.summary,
        imageUrl: card.imageUrl || "",
        hasLocalImage: card.hasLocalImage,
        class: card.name,
        headerDisplay: card.name,
        cardSelectDisplay: {
          item1: card.feature,
        },
      }
    case "subclasses":
      return {
        standarized: true,
        id: card.id,
        name: card.name,
        type: CardType.Subclass,
        description: processCardDescription(card.description) || "",
        imageUrl: card.imageUrl || "",
        hasLocalImage: card.hasLocalImage,
        class: card.class,
        level: subclassLevelToNumber(card.level),
        headerDisplay: card.subclass,
        cardSelectDisplay: {
          item1: card.class,
          item2: card.level,
          item3: card.spellcastTrait,
        },
      }
    case "domains":
      return {
        standarized: true,
        id: card.id,
        name: card.name,
        type: CardType.Domain,
        description: processCardDescription(card.description) || "",
        imageUrl: card.imageUrl || "",
        hasLocalImage: card.hasLocalImage,
        class: card.domain,
        level: card.level,
        cardSelectDisplay: {
          item1: card.domain,
          item2: card.trait,
          item3: card.recallCost !== undefined && card.recallCost !== null ? `RC.${card.recallCost}` : "",
          item4: card.level ? `LV.${card.level}` : "",
        },
      }
    case "variants":
      return {
        standarized: true,
        id: card.id,
        name: card.name,
        type: CardType.Variant,
        description: processCardDescription(card.effect) || "",
        imageUrl: card.imageUrl || "",
        hasLocalImage: card.hasLocalImage,
        class: card.subCategory || "",
        level: card.level,
        headerDisplay: card.name,
        cardSelectDisplay: {
          item1: card.summaryItems?.item1 || "",
          item2: card.summaryItems?.item2 || "",
          item3: card.summaryItems?.item3 || "",
          item4: card.summaryItems?.item4 || "",
        },
        variantSpecial: {
          realType: card.type,
          subCategory: card.subCategory,
        },
      }
  }
}

function projectCard(card: CardPackDryRunCard): ExtendedStandardCard {
  const projected = projectCardFields(card)
  return card.automation === undefined ? projected : { ...projected, automation: card.automation }
}

export function projectCardPackModelToRuntimeTemplates(
  model: Pick<CardPackDryRunValidationModel, "cards">,
): ExtendedStandardCard[] {
  return model.cards.map(projectCard)
}
