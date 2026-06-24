import builtinCardPackJson from "@/data/cards/builtin-base.json"
import { CardSource, CardType } from "@/card/card-types"
import type { BatchInfo } from "@/card/stores/store-types"
import { prepareCardPackContentForRuntime } from "./prepare-card-pack-content"
import { projectCardPackModelToRuntimeTemplates } from "./runtime-card-projection"
import { CARD_BUILTIN_SOURCE_ID, type CardRuntimeSourceSnapshot } from "./source-types"

const BUILTIN_BATCH_NAME = "系统内置卡牌"

export async function loadBuiltinCardRuntimeSource(input: {
  disabledSourceIds: string[]
}): Promise<CardRuntimeSourceSnapshot> {
  const prepared = prepareCardPackContentForRuntime({ payload: builtinCardPackJson })

  if (!prepared.success) {
    throw new Error(
      `Failed to load built-in card runtime source: ${prepared.diagnostics
        .map((diagnostic) => diagnostic.message)
        .join("; ")}`,
    )
  }

  const cards = projectCardPackModelToRuntimeTemplates(prepared.model).map((card) => ({
    ...card,
    source: CardSource.BUILTIN,
    batchId: CARD_BUILTIN_SOURCE_ID,
    batchName: BUILTIN_BATCH_NAME,
    hasLocalImage: false,
  }))
  const cardTypes = Array.from(new Set(cards.map((card) => card.type ?? CardType.Domain)))

  const batch: BatchInfo = {
    id: CARD_BUILTIN_SOURCE_ID,
    name: BUILTIN_BATCH_NAME,
    fileName: "builtin-base.json",
    importTime: "builtin",
    cardCount: cards.length,
    cardTypes,
    size: 0,
    isSystemBatch: true,
    disabled: input.disabledSourceIds.includes(CARD_BUILTIN_SOURCE_ID),
    cardIds: cards.map((card) => card.id),
  }

  return { sourceId: CARD_BUILTIN_SOURCE_ID, kind: "builtin", batch, cards }
}
