import builtinCardPackJson from "@/data/cards/builtin-base.json"
import hopeFearCardPackJson from "@/data/cards/builtin-hope-fear.json"
import hopeFearIdAliases from "@/data/cards/hope-fear-id-aliases.json"
import { CardSource, CardType, type ExtendedStandardCard } from "@/card/card-types"
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

const hopeFearIdGroups = new Map<string, string[]>()
for (const [currentId, previousIds] of Object.entries(hopeFearIdAliases)) {
  const ids = [currentId, ...previousIds]
  for (const id of ids) hopeFearIdGroups.set(id, ids)
}

// A saved reference may point to an earlier ID owned by an installed copy.
export function findHopeFearCardByAlternateId(cards: ReadonlyMap<string, ExtendedStandardCard>, id: string) {
  for (const candidate of hopeFearIdGroups.get(id) ?? []) {
    const card = cards.get(candidate)
    if (card) return card
  }
}

export function loadBuiltinCardRuntimeSource(input: {
  disabledSourceIds: string[]
  sourceId?: BuiltinCardSourceId
  installedCardIds?: ReadonlySet<string>
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

  // Installed copies predate the bundled expansion and keep ownership of their IDs and artwork.
  const templates = projectCardPackModelToRuntimeTemplates(prepared.model)
  const { installedCardIds } = input
  const installedExpansionIds = sourceId === HOPE_FEAR_SOURCE_ID && installedCardIds
    ? new Set(Array.from(installedCardIds, (id) => hopeFearIdGroups.get(id)?.[0] ?? id))
    : undefined
  const ownedTemplates = installedExpansionIds ? templates.filter((card) => !installedExpansionIds.has(card.id)) : templates
  const cards = ownedTemplates.map((card) => ({
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
