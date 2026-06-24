import type { ExtendedStandardCard } from "@/card/card-types"
import type { BatchInfo } from "@/card/stores/store-types"
import type { CardRuntimeSourceSnapshot } from "./source-types"

export interface AssembledCardRuntime {
  cards: Map<string, ExtendedStandardCard>
  batches: Map<string, BatchInfo>
}

interface CardRuntimeSourceOwner {
  sourceId: string
  batchId: string
}

function orderedSources(sources: CardRuntimeSourceSnapshot[]): CardRuntimeSourceSnapshot[] {
  return [
    ...sources.filter((source) => source.kind === "builtin"),
    ...sources.filter((source) => source.kind !== "builtin"),
  ]
}

export function assembleCardRuntimeSources(sources: CardRuntimeSourceSnapshot[]): AssembledCardRuntime {
  const cards = new Map<string, ExtendedStandardCard>()
  const batches = new Map<string, BatchInfo>()
  const cardOwners = new Map<string, CardRuntimeSourceOwner>()

  for (const source of orderedSources(sources)) {
    if (batches.has(source.sourceId)) {
      throw new Error(`Duplicate card runtime source id ${source.sourceId}`)
    }
    batches.set(source.sourceId, source.batch)

    for (const card of source.cards) {
      const existingOwner = cardOwners.get(card.id)
      const duplicateOwner = { sourceId: source.sourceId, batchId: source.batch.id }
      if (existingOwner) {
        throw new Error(
          `Duplicate card id ${card.id} from source ${duplicateOwner.sourceId} batch ${duplicateOwner.batchId}; ` +
            `already registered from source ${existingOwner.sourceId} batch ${existingOwner.batchId}`,
        )
      }
      cards.set(card.id, card)
      cardOwners.set(card.id, duplicateOwner)
    }
  }

  return { cards, batches }
}
