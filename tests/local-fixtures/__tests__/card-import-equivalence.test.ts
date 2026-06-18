import { describe, expect, it } from "vitest"
import type { CardImportStorageSnapshot } from "../../helpers/card-import-storage-snapshot"
import {
  buildRawStorageDiffReport,
  compareStorageBusinessSnapshots,
  projectStorageBusinessSnapshot,
} from "../card-import-equivalence"

function snapshot(overrides: Partial<CardImportStorageSnapshot> = {}): CardImportStorageSnapshot {
  const base: CardImportStorageSnapshot = {
    index: {
      batches: {
        pack_a: {
          id: "pack_a",
          name: "Pack A",
          fileName: "pack.json",
          importTime: "2026-06-18T00:00:00.000Z",
          cardCount: 2,
          cardTypes: ["domain", "variant"],
          size: 123,
          disabled: false,
        },
      },
      totalCards: 2,
      totalBatches: 1,
      lastUpdate: "2026-06-18T00:00:00.000Z",
    },
    batches: {
      pack_a: {
        metadata: {
          id: "pack_a",
          name: "Pack A",
          fileName: "pack.json",
          importTime: "2026-06-18T00:00:00.000Z",
          imageCardIds: ["variant-card"],
          imageCount: 1,
        },
        cards: [
          {
            id: "domain-card",
            name: "Domain Card",
            type: "domain",
            description: "Rules text",
            class: "Blade",
            level: 1,
            hint: "Spend a Hope.",
            headerDisplay: {
              item1: "Blade",
            },
            professionSpecial: {
              evasion: 10,
              hitPoints: 6,
              items: ["Rope"],
              hopeFeature: "Use courage.",
            },
            hasLocalImage: false,
            batchId: "pack_a",
            source: "custom",
          },
          {
            id: "variant-card",
            name: "Variant Card",
            type: "variant",
            description: "Variant rules",
            class: "ignored by variants",
            level: 2,
            hasLocalImage: true,
            batchId: "pack_a",
            source: "custom",
            variantSpecial: {
              realType: "Weapon",
              subCategory: "Sword",
            },
            cardSelectDisplay: {
              item1: "Weapon",
              item4: "",
            },
          },
        ],
        customFieldDefinitions: {
          domains: ["Blade"],
        },
        variantTypes: {
          Weapon: {
            description: "Old description",
            subclasses: ["Sword"],
            levelRange: [1, 4],
          },
        },
      },
    },
    images: {
      pack_a: {
        cardIds: ["variant-card"],
        items: [
          {
            cardId: "variant-card",
            mimeType: "image/png",
            byteLength: 10,
            sha256: "a".repeat(64),
          },
        ],
      },
    },
  }

  return {
    ...base,
    ...overrides,
    index: overrides.index ?? base.index,
    batches: overrides.batches ?? base.batches,
    images: overrides.images ?? base.images,
  }
}

describe("card import business equivalence", () => {
  it("treats known raw metadata drift as report-only", () => {
    const expected = snapshot()
    const actual = snapshot({
      index: {
        batches: {
          pack_a: {
            id: "pack_a",
            name: "Pack A",
            fileName: "pack.json",
            importTime: "2026-06-18T00:00:00.000Z",
            cardCount: 2,
            cardTypes: ["domain", "variant"],
            size: 999,
            version: "1.0.0",
            author: "Author",
            disabled: false,
          },
        },
        totalCards: 2,
        totalBatches: 1,
        lastUpdate: "2026-06-18T00:00:00.000Z",
      },
      batches: {
        pack_a: {
          ...snapshot().batches.pack_a,
          metadata: {
            id: "pack_a",
            name: "Pack A",
            fileName: "pack.json",
            importTime: "2026-06-18T00:00:00.000Z",
            description: "New metadata",
            imageCardIds: ["variant-card"],
            imageCount: 1,
            totalImageSize: 0,
          },
          cards: [
            snapshot().batches.pack_a.cards[0],
            {
              ...(snapshot().batches.pack_a.cards[1] as Record<string, unknown>),
              batchName: "Pack A",
              cardSelectDisplay: {
                item1: "Weapon",
                item4: "",
              },
            },
          ],
          customFieldDefinitions: {
            domains: ["Blade"],
            variants: ["Weapon"],
          },
          variantTypes: {
            Weapon: {
              description: "New description",
              subclasses: ["Blade"],
              levelRange: [1, 10],
            },
          },
        },
      },
    })

    expect(compareStorageBusinessSnapshots(expected, actual)).toEqual([])
    expect(buildRawStorageDiffReport(expected, actual).differences.length).toBeGreaterThan(0)
  })

  it("fails when card business facts differ", () => {
    const expected = snapshot()
    const actual = snapshot({
      batches: {
        pack_a: {
          ...snapshot().batches.pack_a,
          cards: [
            snapshot().batches.pack_a.cards[0],
            {
              ...(snapshot().batches.pack_a.cards[1] as Record<string, unknown>),
              variantSpecial: {
                realType: "Armor",
                subCategory: "Shield",
              },
            },
          ],
        },
      },
    })

    expect(compareStorageBusinessSnapshots(expected, actual)).toContain(
      "pack_a/card/variant-card: variantSpecial mismatch",
    )
  })

  it("fails when variant type key sets differ", () => {
    const expected = snapshot()
    const actual = snapshot({
      batches: {
        pack_a: {
          ...snapshot().batches.pack_a,
          variantTypes: {
            Armor: {
              description: "Different type",
            },
          },
        },
      },
    })

    expect(compareStorageBusinessSnapshots(expected, actual)).toContain("pack_a: variantTypes key set mismatch")
  })

  it("fails when card order differs", () => {
    const expected = snapshot()
    const actual = snapshot({
      batches: {
        pack_a: {
          ...snapshot().batches.pack_a,
          cards: [...snapshot().batches.pack_a.cards].reverse(),
        },
      },
    })

    expect(compareStorageBusinessSnapshots(expected, actual)).toContain("pack_a: card id order mismatch")
  })

  it("fails when image content hash differs", () => {
    const expected = snapshot()
    const actual = snapshot({
      images: {
        pack_a: {
          cardIds: ["variant-card"],
          items: [
            {
              cardId: "variant-card",
              mimeType: "image/png",
              byteLength: 10,
              sha256: "b".repeat(64),
            },
          ],
        },
      },
    })

    expect(compareStorageBusinessSnapshots(expected, actual)).toContain("pack_a: images mismatch")
  })

  it("fails when card batchName differs from the owning batch name", () => {
    const expected = snapshot()
    const actual = snapshot({
      batches: {
        pack_a: {
          ...snapshot().batches.pack_a,
          cards: [
            snapshot().batches.pack_a.cards[0],
            {
              ...(snapshot().batches.pack_a.cards[1] as Record<string, unknown>),
              batchName: "Other Pack",
            },
          ],
        },
      },
    })

    expect(compareStorageBusinessSnapshots(expected, actual)).toContain(
      "pack_a/card/variant-card: batchName does not match owning batch",
    )
  })

  it("fails when image metadata is missing while the image backend has images", () => {
    const invalidSnapshot = snapshot({
      batches: {
        pack_a: {
          ...snapshot().batches.pack_a,
          metadata: {
            id: "pack_a",
            name: "Pack A",
            fileName: "pack.json",
            importTime: "2026-06-18T00:00:00.000Z",
          },
        },
      },
    })

    expect(compareStorageBusinessSnapshots(invalidSnapshot, invalidSnapshot)).toContain(
      "pack_a: metadata imageCardIds match image backend mismatch",
    )
  })

  it("allows image card order drift when image content is unchanged", () => {
    const expected = snapshot({
      batches: {
        pack_a: {
          ...snapshot().batches.pack_a,
          metadata: {
            ...snapshot().batches.pack_a.metadata,
            imageCardIds: ["domain-card", "variant-card"],
            imageCount: 2,
          },
        },
      },
      images: {
        pack_a: {
          cardIds: ["domain-card", "variant-card"],
          items: [
            {
              cardId: "domain-card",
              mimeType: "image/webp",
              byteLength: 20,
              sha256: "c".repeat(64),
            },
            {
              cardId: "variant-card",
              mimeType: "image/png",
              byteLength: 10,
              sha256: "a".repeat(64),
            },
          ],
        },
      },
    })
    const actual = snapshot({
      batches: {
        pack_a: {
          ...snapshot().batches.pack_a,
          metadata: {
            ...snapshot().batches.pack_a.metadata,
            imageCardIds: ["variant-card", "domain-card"],
            imageCount: 2,
          },
        },
      },
      images: {
        pack_a: {
          cardIds: ["variant-card", "domain-card"],
          items: [
            {
              cardId: "variant-card",
              mimeType: "image/png",
              byteLength: 10,
              sha256: "a".repeat(64),
            },
            {
              cardId: "domain-card",
              mimeType: "image/webp",
              byteLength: 20,
              sha256: "c".repeat(64),
            },
          ],
        },
      },
    })

    expect(compareStorageBusinessSnapshots(expected, actual)).toEqual([])
  })

  it("allows legacy expected image MIME drift when actual image MIME is valid", () => {
    const expected = snapshot({
      images: {
        pack_a: {
          cardIds: ["variant-card"],
          items: [
            {
              cardId: "variant-card",
              mimeType: "",
              byteLength: 10,
              sha256: "a".repeat(64),
            },
          ],
        },
      },
    })
    const actual = snapshot({
      images: {
        pack_a: {
          cardIds: ["variant-card"],
          items: [
            {
              cardId: "variant-card",
              mimeType: "image/webp",
              byteLength: 10,
              sha256: "a".repeat(64),
            },
          ],
        },
      },
    })

    expect(compareStorageBusinessSnapshots(expected, actual)).toEqual([])
  })

  it("fails when an actual image MIME is empty or not an image MIME", () => {
    const expected = snapshot()
    const actual = snapshot({
      images: {
        pack_a: {
          cardIds: ["variant-card"],
          items: [
            {
              cardId: "variant-card",
              mimeType: "",
              byteLength: 10,
              sha256: "a".repeat(64),
            },
          ],
        },
      },
    })

    expect(compareStorageBusinessSnapshots(expected, actual)).toContain("pack_a/variant-card: actual image MIME invalid")
  })

  it("keeps non-empty cardSelectDisplay values as business facts", () => {
    const expected = snapshot()
    const actual = snapshot({
      batches: {
        pack_a: {
          ...snapshot().batches.pack_a,
          cards: [
            snapshot().batches.pack_a.cards[0],
            {
              ...(snapshot().batches.pack_a.cards[1] as Record<string, unknown>),
              cardSelectDisplay: {
                item1: "Weapon",
                item4: "Visible Badge",
              },
            },
          ],
        },
      },
    })

    expect(compareStorageBusinessSnapshots(expected, actual)).toContain("pack_a/card/variant-card: card mismatch")
  })

  it("fails when image metadata claims images not present in the image snapshot", () => {
    const expected = snapshot()
    const actual = snapshot({
      batches: {
        pack_a: {
          ...snapshot().batches.pack_a,
          metadata: {
            id: "pack_a",
            name: "Pack A",
            fileName: "pack.json",
            importTime: "2026-06-18T00:00:00.000Z",
            imageCardIds: ["missing-card"],
            imageCount: 1,
          },
        },
      },
    })

    expect(compareStorageBusinessSnapshots(expected, actual)).toContain(
      "pack_a: metadata imageCardIds match image backend mismatch",
    )
  })

  it("projects a stable storage business snapshot", () => {
    expect(projectStorageBusinessSnapshot(snapshot())).toEqual({
      packs: [
        {
          id: "pack_a",
          name: "Pack A",
          disabled: false,
          indexCardCount: 2,
          actualCardCount: 2,
          cardIds: ["domain-card", "variant-card"],
          imageMetadata: {
            imageCardIds: ["variant-card"],
            imageCount: 1,
          },
          cardTypes: {
            domain: 1,
            variant: 1,
          },
          cards: [
            {
              id: "domain-card",
              name: "Domain Card",
              type: "domain",
              description: "Rules text",
              class: "Blade",
              level: 1,
              hint: "Spend a Hope.",
              headerDisplay: {
                item1: "Blade",
              },
              professionSpecial: {
                evasion: 10,
                hitPoints: 6,
                items: ["Rope"],
                hopeFeature: "Use courage.",
              },
              hasLocalImage: false,
              batchId: "pack_a",
              source: "custom",
            },
            {
              id: "variant-card",
              name: "Variant Card",
              type: "variant",
              description: "Variant rules",
              class: "ignored by variants",
              level: 2,
              hasLocalImage: true,
              batchId: "pack_a",
              source: "custom",
              variantSpecial: {
                realType: "Weapon",
                subCategory: "Sword",
              },
              cardSelectDisplay: {
                item1: "Weapon",
              },
            },
          ],
          variantTypeKeys: ["Weapon"],
          imageCardIds: ["variant-card"],
          images: [
            {
              cardId: "variant-card",
              mimeType: "image/png",
              byteLength: 10,
              sha256: "a".repeat(64),
            },
          ],
        },
      ],
    })
  })
})
