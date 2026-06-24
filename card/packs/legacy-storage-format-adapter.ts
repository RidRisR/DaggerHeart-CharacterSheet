import { CardSource, type ExtendedStandardCard } from "@/card/card-types"
import { getImageAssetTemplateId } from "@/card/import/types"
import { projectCardPackModelToRuntimeTemplates } from "@/card/runtime/runtime-card-projection"
import type { CustomFieldsForBatch, VariantTypesForBatch } from "@/card/stores/store-types"
import type { CardImportFinalCommitPlan, CardPackInstalledTemplateAutomation } from "./storage-types"

type LegacyStoredCard = ExtendedStandardCard & CardPackInstalledTemplateAutomation

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
  cards: LegacyStoredCard[]
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

function withBatchStorageFields(
  card: ExtendedStandardCard,
  plan: CardImportFinalCommitPlan,
  imageTemplateIds: Set<string>,
): LegacyStoredCard {
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
  const runtimeCards = projectCardPackModelToRuntimeTemplates({ cards: plan.packData.cards })
  const cards = runtimeCards.map((card) => withBatchStorageFields(card, plan, imageTemplateIdSet))
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
