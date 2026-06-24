import type { BatchData, BatchInfo, CustomCardIndex } from "@/card/stores/store-types"
import { CARD_BUILTIN_SOURCE_ID, type CardRuntimeSourceSnapshot } from "./source-types"

export function loadCustomCardRuntimeSourcesFromSnapshot(input: {
  index: CustomCardIndex
  batches: Map<string, BatchData>
}): CardRuntimeSourceSnapshot[] {
  const sources: CardRuntimeSourceSnapshot[] = []

  for (const [batchId, entry] of Object.entries(input.index.batches)) {
    if (batchId === CARD_BUILTIN_SOURCE_ID) continue

    const stored = input.batches.get(batchId)
    if (!stored) continue

    const batch: BatchInfo = {
      ...entry,
      name: stored.metadata.name ?? entry.name,
      fileName: stored.metadata.fileName ?? entry.fileName,
      importTime: stored.metadata.importTime ?? entry.importTime,
      version: stored.metadata.version ?? entry.version,
      description: stored.metadata.description,
      author: stored.metadata.author ?? entry.author,
      disabled: entry.disabled === true,
      cardIds: stored.cards.map((card) => card.id),
      customFieldDefinitions: stored.customFieldDefinitions,
      variantTypes: stored.variantTypes,
      imageCardIds: stored.metadata.imageCardIds,
      imageCount: stored.metadata.imageCount,
      totalImageSize: stored.metadata.totalImageSize,
    }

    sources.push({ sourceId: batchId, kind: "custom", batch, cards: stored.cards })
  }

  return sources
}
