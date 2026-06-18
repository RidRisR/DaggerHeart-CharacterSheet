import { createHash } from "node:crypto"
import {
  CARD_PACK_STORAGE_KEYS,
  getCardPackStorageKey,
  type CardPackStorageAdapter,
} from "@/card/packs/local-storage-adapter"
import type { CardPackImageBackend } from "@/card/packs/image-backend"

export interface CardImportStorageSnapshot {
  index: unknown
  batches: Record<
    string,
    {
      metadata: unknown
      cards: unknown[]
      customFieldDefinitions?: unknown
      variantTypes?: unknown
    }
  >
  images: Record<
    string,
    {
      cardIds: string[]
      items: Array<{
        cardId: string
        mimeType: string
        byteLength: number
        sha256: string
      }>
    }
  >
}

interface BuildCardImportStorageSnapshotInput {
  storage: CardPackStorageAdapter
  images: CardPackImageBackend
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseJson(raw: string | null, label: string): unknown {
  if (raw === null) throw new Error(`Missing ${label}`)
  return JSON.parse(raw)
}

function packIdsFromIndex(index: unknown): string[] {
  if (!isRecord(index) || !isRecord(index.batches)) return []
  return Object.keys(index.batches).sort()
}

async function sha256(blob: Blob): Promise<string> {
  const bytes = Buffer.from(await blob.arrayBuffer())
  return createHash("sha256").update(bytes).digest("hex")
}

export async function buildCardImportStorageSnapshot({
  storage,
  images,
}: BuildCardImportStorageSnapshotInput): Promise<CardImportStorageSnapshot> {
  const index = parseJson(storage.getItem(CARD_PACK_STORAGE_KEYS.INDEX), CARD_PACK_STORAGE_KEYS.INDEX)
  const batches: CardImportStorageSnapshot["batches"] = {}
  const imageSnapshot: CardImportStorageSnapshot["images"] = {}

  for (const packId of packIdsFromIndex(index)) {
    const storageKey = getCardPackStorageKey(packId)
    const rawBatch = parseJson(storage.getItem(storageKey), storageKey)
    if (!isRecord(rawBatch) || !Array.isArray(rawBatch.cards)) {
      throw new Error(`Invalid card batch snapshot for ${packId}`)
    }

    batches[packId] = {
      metadata: rawBatch.metadata,
      cards: rawBatch.cards,
      ...(rawBatch.customFieldDefinitions !== undefined ? { customFieldDefinitions: rawBatch.customFieldDefinitions } : {}),
      ...(rawBatch.variantTypes !== undefined ? { variantTypes: rawBatch.variantTypes } : {}),
    }

    const summaries = await images.listPackImages(packId)
    const items = await Promise.all(
      summaries
        .filter((summary) => summary.templateId)
        .sort((left, right) => left.templateId!.localeCompare(right.templateId!))
        .map(async (summary) => {
          const cardId = summary.templateId!
          const record = await images.getImage(cardId, packId)
          if (!record) throw new Error(`Missing image ${packId}/${cardId}`)

          return {
            cardId,
            mimeType: record.mimeType,
            byteLength: record.blob.size,
            sha256: await sha256(record.blob),
          }
        }),
    )

    imageSnapshot[packId] = {
      cardIds: items.map((item) => item.cardId),
      items,
    }
  }

  return { index, batches, images: imageSnapshot }
}
