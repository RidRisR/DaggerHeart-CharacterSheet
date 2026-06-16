import type { CardPackListItem } from "./card-pack-tab"

export interface CardPackSummary {
  cardPackCount: number
  enabledCardPackCount: number
  installedCardCount: number
  enabledCardCount: number
}

export function summarizeCardPacks(batches: CardPackListItem[]): CardPackSummary {
  return batches.reduce<CardPackSummary>(
    (summary, batch) => ({
      cardPackCount: summary.cardPackCount + 1,
      enabledCardPackCount: summary.enabledCardPackCount + (batch.disabled ? 0 : 1),
      installedCardCount: summary.installedCardCount + batch.cardCount,
      enabledCardCount: summary.enabledCardCount + (batch.disabled ? 0 : batch.cardCount),
    }),
    { cardPackCount: 0, enabledCardPackCount: 0, installedCardCount: 0, enabledCardCount: 0 },
  )
}
