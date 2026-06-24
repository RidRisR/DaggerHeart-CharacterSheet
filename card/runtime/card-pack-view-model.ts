import type { BatchInfo } from "@/card/stores/store-types"
import { CARD_BUILTIN_SOURCE_ID } from "./source-types"

export interface CardRuntimeSourceListItem {
  sourceId: string
  name: string
  author: string
  version: string
  fileName: string
  importTime: string
  cardCount: number
  cardTypes: string[]
  disabled: boolean
  sourceLabel: string
  canDisable: boolean
  canRemove: boolean
  canViewCards: boolean
}

export function toCardRuntimeSourceListItem(batch: BatchInfo): CardRuntimeSourceListItem {
  const isBuiltin = batch.id === CARD_BUILTIN_SOURCE_ID
  const disabled = batch.disabled === true

  return {
    sourceId: batch.id,
    name: batch.name,
    author: batch.author ?? "",
    version: batch.version ?? "",
    fileName: batch.fileName ?? "",
    importTime: batch.importTime,
    cardCount: batch.cardCount,
    cardTypes: batch.cardTypes,
    disabled,
    sourceLabel: isBuiltin ? "系统内置" : batch.fileName ? `导入文件：${batch.fileName}` : "本地导入",
    canDisable: true,
    canRemove: !isBuiltin,
    canViewCards: !disabled,
  }
}
