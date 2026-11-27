import builtinCardPackJson from "@/data/cards/builtin-base.json"
import hopeFearCardPackJson from "@/data/cards/builtin-hope-fear.json"
import { CardSource, CardType } from "@/card/card-types"
import type { BatchInfo } from "@/card/stores/store-types"
import { prepareCardPackContentForRuntime } from "./prepare-card-pack-content"
import { projectCardPackModelToRuntimeTemplates } from "./runtime-card-projection"
import { CARD_BUILTIN_SOURCE_ID, HOPE_FEAR_SOURCE_ID, type BuiltinCardSourceId, type CardRuntimeSourceSnapshot } from "./source-types"

const builtinPacks = {
  [CARD_BUILTIN_SOURCE_ID]: {
    name: "系统内置卡牌",
    fileName: "builtin-base.json",
    payload: builtinCardPackJson,
  },
  // Player resource pack v1.1.0 from AlchemiZhou/dhsheet, commit fe97b562.
  [HOPE_FEAR_SOURCE_ID]: {
    name: hopeFearCardPackJson.name,
    fileName: "builtin-hope-fear.json",
    payload: hopeFearCardPackJson,
  },
}

export function loadBuiltinCardRuntimeSource(input: {
  disabledSourceIds: string[]
  sourceId?: BuiltinCardSourceId
}): CardRuntimeSourceSnapshot {
  const sourceId = input.sourceId ?? CARD_BUILTIN_SOURCE_ID
  const { name, fileName, payload } = builtinPacks[sourceId]
  const prepared = prepareCardPackContentForRuntime({ payload })

  if (!prepared.success) {
    throw new Error(
      `Failed to load built-in card runtime source ${sourceId}: ${prepared.diagnostics
        .map((diagnostic) => diagnostic.message)
        .join("; ")}`,
    )
  }

  const templates = projectCardPackModelToRuntimeTemplates(prepared.model)
  const cards = templates.map((card) => ({
    ...card,
    source: CardSource.BUILTIN,
    batchId: sourceId,
    batchName: name,
    hasLocalImage: false,
  }))
  const cardTypes = Array.from(new Set(cards.map((card) => card.type ?? CardType.Domain)))
  const { definitions } = prepared.model

  const batch: BatchInfo = {
    id: sourceId,
    name,
    fileName,
    version: payload.version,
    author: payload.author,
    importTime: "builtin",
    cardCount: cards.length,
    cardTypes,
    size: 0,
    isSystemBatch: true,
    disabled: input.disabledSourceIds.includes(sourceId),
    cardIds: cards.map((card) => card.id),
    customFieldDefinitions: {
      professions: definitions.classes,
      ancestries: definitions.ancestries,
      communities: definitions.communities,
      domains: definitions.domains,
      variants: definitions.variants,
    },
    variantTypes: definitions.variantTypes,
  }

  return { sourceId, kind: "builtin", batch, cards }
}
