import type { ExtendedStandardCard } from "@/card/card-types"
import type { BatchInfo } from "@/card/stores/store-types"

export const CARD_BUILTIN_SOURCE_ID = "SYSTEM_BUILTIN_CARDS"

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
