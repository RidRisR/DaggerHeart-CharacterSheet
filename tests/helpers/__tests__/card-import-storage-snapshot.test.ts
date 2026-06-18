import { describe, expect, it } from "vitest"
import {
  CARD_PACK_STORAGE_KEYS,
  createInMemoryCardPackStorageAdapter,
  getCardPackStorageKey,
} from "@/card/packs/local-storage-adapter"
import { createInMemoryCardPackImageBackend } from "@/card/packs/image-backend"
import { buildCardImportStorageSnapshot } from "../card-import-storage-snapshot"

function blob(text: string, type = "image/png") {
  return new Blob([text], { type })
}

describe("card import storage snapshot helper", () => {
  it("extracts only card import index, batches, and image metadata", async () => {
    const storage = createInMemoryCardPackStorageAdapter({
      unrelated_key: "ignored",
      [CARD_PACK_STORAGE_KEYS.INDEX]: JSON.stringify({
        batches: {
          pack_b: {
            id: "pack_b",
            name: "Pack B",
            fileName: "b.json",
            importTime: "2026-06-18T00:00:00.000Z",
            cardCount: 1,
            cardTypes: ["profession"],
            size: 20,
            isSystemBatch: false,
            disabled: false,
          },
          pack_a: {
            id: "pack_a",
            name: "Pack A",
            fileName: "a.json",
            importTime: "2026-06-18T00:00:00.000Z",
            cardCount: 1,
            cardTypes: ["profession"],
            size: 20,
            isSystemBatch: false,
            disabled: false,
          },
        },
        totalCards: 2,
        totalBatches: 2,
        lastUpdate: "2026-06-18T00:00:00.000Z",
      }),
      [getCardPackStorageKey("pack_b")]: JSON.stringify({
        metadata: { id: "pack_b", name: "Pack B", fileName: "b.json", importTime: "2026-06-18T00:00:00.000Z" },
        cards: [{ id: "b-card", name: "B" }],
      }),
      [getCardPackStorageKey("pack_a")]: JSON.stringify({
        metadata: { id: "pack_a", name: "Pack A", fileName: "a.json", importTime: "2026-06-18T00:00:00.000Z" },
        cards: [{ id: "a-card", name: "A" }],
        customFieldDefinitions: { professions: ["A"] },
        variantTypes: { Food: { subclasses: ["Meal"], levelRange: [1, 2] } },
      }),
    })
    const images = createInMemoryCardPackImageBackend()
    await images.writePackImages("pack_a", [
      { templateId: "a-card", path: "images/a-card.png", mimeType: "image/png", readBlob: async () => blob("image-a") },
    ])

    const snapshot = await buildCardImportStorageSnapshot({ storage, images })

    expect(Object.keys(snapshot.batches)).toEqual(["pack_a", "pack_b"])
    expect(snapshot.batches.pack_a.cards).toEqual([{ id: "a-card", name: "A" }])
    expect(snapshot.batches.pack_a.customFieldDefinitions).toEqual({ professions: ["A"] })
    expect(snapshot.batches.pack_a.variantTypes).toEqual({ Food: { subclasses: ["Meal"], levelRange: [1, 2] } })
    expect(snapshot.images.pack_a.cardIds).toEqual(["a-card"])
    expect(snapshot.images.pack_a.items[0]).toMatchObject({
      cardId: "a-card",
      mimeType: "image/png",
      byteLength: 7,
    })
    expect(snapshot.images.pack_a.items[0].sha256).toMatch(/^[a-f0-9]{64}$/)
  })
})
