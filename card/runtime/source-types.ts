import type { ExtendedStandardCard } from "@/card/card-types"
import type { BatchInfo } from "@/card/stores/store-types"

export const CARD_BUILTIN_SOURCE_ID = "SYSTEM_BUILTIN_CARDS"

export const HOPE_FEAR_SOURCE_ID = "SYSTEM_BUILTIN_HOPE_FEAR"
export const BUILTIN_CARD_SOURCE_IDS = [CARD_BUILTIN_SOURCE_ID, HOPE_FEAR_SOURCE_ID] as const
export type BuiltinCardSourceId = typeof BUILTIN_CARD_SOURCE_IDS[number]

export function isBuiltinCardSourceId(id: string | undefined): id is BuiltinCardSourceId {
  return BUILTIN_CARD_SOURCE_IDS.some((sourceId) => sourceId === id)
}

export type CardRuntimeSourceKind = "builtin" | "custom"

export interface CardRuntimeSourceSnapshot {
  sourceId: string
  kind: CardRuntimeSourceKind
  batch: BatchInfo
  cards: ExtendedStandardCard[]
}

export type CardRuntimeSourceStateResult =
  | { ok: true; sourceId: string; disabled: boolean }
  | { ok: false; sourceId: string; disabled: boolean; message: string }
