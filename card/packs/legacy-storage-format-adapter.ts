import {
  CardSource,
  CardType,
  processCardDescription,
  type ExtendedStandardCard,
} from "@/card/card-types"
import type { CardPackDryRunCard } from "@/card/import/types"
import { getImageAssetTemplateId } from "@/card/import/types"
import type { CustomFieldsForBatch, VariantTypesForBatch } from "@/card/stores/store-types"
import type { CardImportFinalCommitPlan } from "./storage-types"

export interface LegacyCardBatchStoredData {
  metadata: {
    id: string
    name: string
    fileName: string
    importTime: string
    version?: string
    description?: string
    author?: string
    imageCardIds?: string[]
    imageCount?: number
    totalImageSize?: number
  }
  cards: ExtendedStandardCard[]
  customFieldDefinitions?: CustomFieldsForBatch
  variantTypes?: VariantTypesForBatch
}

export interface LegacyCardBatchIndexEntry {
  id: string
  name: string
  fileName: string
  importTime: string
  version?: string
  author?: string
  cardCount: number
  cardTypes: string[]
  size: number
  isSystemBatch: false
  disabled: boolean
}

export interface LegacyCardBatchStorageProjection {
  packId: string
  templateIds: string[]
  imageTemplateIds: string[]
  storedData: LegacyCardBatchStoredData
  indexEntry: LegacyCardBatchIndexEntry
}

function copyStringArray(items: string[]): string[] {
  return [...items]
}

function copyVariantTypes(variantTypes: VariantTypesForBatch): VariantTypesForBatch {
  return Object.fromEntries(
    Object.entries(variantTypes).map(([typeId, definition]) => [
      typeId,
      {
        ...definition,
        ...(definition.subclasses ? { subclasses: [...definition.subclasses] } : {}),
        ...(definition.levelRange ? { levelRange: [...definition.levelRange] as [number, number] } : {}),
      },
    ]),
  )
}

function projectCustomFieldDefinitions(plan: CardImportFinalCommitPlan): CustomFieldsForBatch {
  const definitions = plan.packData.definitions

  return {
    professions: copyStringArray(definitions.classes),
    ancestries: copyStringArray(definitions.ancestries),
    communities: copyStringArray(definitions.communities),
    domains: copyStringArray(definitions.domains),
    variants: copyStringArray(definitions.variants),
  }
}

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

function projectCard(card: CardPackDryRunCard): ExtendedStandardCard {
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

function withBatchStorageFields(
  card: ExtendedStandardCard,
  plan: CardImportFinalCommitPlan,
  imageTemplateIds: Set<string>,
): ExtendedStandardCard {
  return {
    ...card,
    hasLocalImage: imageTemplateIds.has(card.id) ? true : card.hasLocalImage,
    batchId: plan.packId,
    batchName: plan.packData.metadata.name,
    source: CardSource.CUSTOM,
  }
}

export function projectCardImportToLegacyBatchStorage(
  plan: CardImportFinalCommitPlan,
): LegacyCardBatchStorageProjection {
  const imageAssets = plan.assets.cardImages
  const imageTemplateIds = Array.from(new Set(imageAssets.map(getImageAssetTemplateId).filter(Boolean)))
  const imageTemplateIdSet = new Set(imageTemplateIds)
  const imageCardIds = plan.packData.cards
    .map((card) => card.id)
    .filter((cardId) => imageTemplateIdSet.has(cardId))
  const totalImageSize = imageAssets.reduce((total, asset) => total + (asset.sizeBytes ?? 0), 0)
  const name = plan.packData.metadata.name ?? plan.source?.label ?? plan.packId
  const fileName = plan.source?.fileName ?? plan.source?.label ?? "Imported Cards"
  const cards = plan.packData.cards.map((card) =>
    withBatchStorageFields(projectCard(card), plan, imageTemplateIdSet),
  )
  const storedData: LegacyCardBatchStoredData = {
    metadata: {
      id: plan.packId,
      name,
      fileName,
      importTime: plan.importedAt,
      version: plan.packData.metadata.version,
      description: plan.packData.metadata.description,
      author: plan.packData.metadata.author,
      ...(imageCardIds.length > 0
        ? {
            imageCardIds,
            imageCount: imageCardIds.length,
            totalImageSize,
          }
        : {}),
    },
    cards,
    customFieldDefinitions: projectCustomFieldDefinitions(plan),
    variantTypes: copyVariantTypes(plan.packData.definitions.variantTypes),
  }
  const cardTypes = Array.from(new Set(cards.map((card) => card.type)))

  return {
    packId: plan.packId,
    templateIds: [...plan.templateIds],
    imageTemplateIds,
    storedData,
    indexEntry: {
      id: plan.packId,
      name,
      fileName,
      importTime: plan.importedAt,
      version: plan.packData.metadata.version,
      author: plan.packData.metadata.author,
      cardCount: cards.length,
      cardTypes,
      size: JSON.stringify(storedData).length,
      isSystemBatch: false,
      disabled: plan.disabled,
    },
  }
}
