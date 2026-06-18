import { beforeEach, describe, expect, it } from "vitest"
import { CardType } from "@/card/card-types"
import { useUnifiedCardStore } from "@/card/stores/unified-card-store"
import type { CardImportStorageSnapshot } from "../../helpers/card-import-storage-snapshot"
import {
  getAvailableVariantTypes,
  getVariantLevelOptions,
  getVariantSubclassOptions,
} from "@/card/card-ui-config"
import {
  getDomainCardNames,
  getProfessionCardNames,
  getVariantTypeNames,
} from "@/card/card-predefined-field"
import {
  compareRuntimeBusinessSnapshots,
  projectRuntimeBusinessSnapshotFromStorage,
} from "../card-import-equivalence"

function storageSnapshot(): CardImportStorageSnapshot {
  return {
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
        },
        cards: [
          {
            standarized: true,
            id: "domain-card",
            name: "Domain Card",
            type: "domain",
            class: "Blade",
            level: 1,
            description: "",
            batchId: "pack_a",
            source: "custom",
            cardSelectDisplay: {},
          },
          {
            standarized: true,
            id: "variant-card",
            name: "Variant Card",
            type: "variant",
            class: "",
            level: 2,
            description: "",
            hasLocalImage: true,
            batchId: "pack_a",
            source: "custom",
            cardSelectDisplay: {},
            variantSpecial: {
              realType: "Weapon",
              subCategory: "Sword",
            },
          },
        ],
        customFieldDefinitions: {
          domains: ["Blade"],
        },
        variantTypes: {
          Weapon: {
            description: "Weapon variants",
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
}

function resetStore() {
  localStorage.clear()
  useUnifiedCardStore.setState({
    batches: new Map(),
    cards: new Map(),
    cardsByType: new Map(),
    index: {
      batches: {},
      totalCards: 0,
      totalBatches: 0,
      lastUpdate: "2026-06-18T00:00:00.000Z",
    },
    aggregatedCustomFields: null,
    aggregatedVariantTypes: null,
    subclassCardIndex: null,
    levelCardIndex: null,
    batchKeywordIndex: null,
    batchLevelIndex: null,
    stats: null,
    cacheValid: false,
    initialized: true,
  })
}

describe("card import runtime equivalence", () => {
  beforeEach(() => {
    resetStore()
  })

  it("projects runtime facts through the existing store load boundary", async () => {
    await expect(projectRuntimeBusinessSnapshotFromStorage(storageSnapshot())).resolves.toEqual({
      cardIds: ["domain-card", "variant-card"],
      cardsByType: {
        domain: ["domain-card"],
        variant: ["variant-card"],
      },
      aggregatedCustomFields: {
        domains: ["Blade"],
      },
      aggregatedVariantTypeKeys: ["Weapon"],
      publicApi: {
        standardByType: {
          domain: ["domain-card"],
          variant: ["variant-card"],
        },
        standardById: {
          "domain-card": "domain-card",
          "variant-card": "variant-card",
        },
        customCardIds: ["domain-card", "variant-card"],
        customByType: {
          domain: ["domain-card"],
          variant: ["variant-card"],
        },
        cardsByBatch: {
          pack_a: ["domain-card", "variant-card"],
        },
        customBatches: [
          {
            id: "pack_a",
            name: "Pack A",
            fileName: "pack.json",
            cardCount: 2,
            cardTypes: ["domain", "variant"],
            disabled: false,
          },
        ],
        allBatches: [
          {
            id: "pack_a",
            name: "Pack A",
            fileName: "pack.json",
            cardCount: 2,
            cardTypes: ["domain", "variant"],
            disabled: false,
          },
        ],
        cardBatchNames: {
          "domain-card": "Pack A",
          "variant-card": "Pack A",
        },
      },
      standardClassOptions: {
        [CardType.Domain]: [{ value: "Blade", label: "Blade" }],
      },
      predefinedNames: {
        professions: [],
        ancestries: [],
        communities: [],
        subclasses: [],
        domains: ["Blade"],
      },
      variantOptions: {
        fullTypes: {
          Weapon: {
            subclasses: ["Sword"],
            levelRange: [1, 4],
          },
        },
        typeNames: ["Weapon"],
        availableTypes: [{ value: "Weapon", label: "Weapon" }],
        byType: {
          Weapon: {
            rawSubclasses: ["Sword"],
            subclassOptions: [{ value: "Sword", label: "Sword" }],
            levelOptions: [
              { value: "1", label: "等级 1" },
              { value: "2", label: "等级 2" },
              { value: "3", label: "等级 3" },
              { value: "4", label: "等级 4" },
            ],
          },
        },
      },
      subclassCardIndex: {
        Weapon: {
          Sword: ["variant-card"],
        },
        domain: {
          Blade: ["domain-card"],
        },
      },
      levelCardIndex: {
        Weapon: {
          "2": ["variant-card"],
        },
        domain: {
          "1": ["domain-card"],
        },
      },
      batchKeywordIndex: {
        pack_a: {
          Weapon: ["Sword"],
          domain: ["Blade"],
        },
      },
      batchLevelIndex: {
        pack_a: {
          Weapon: ["2"],
          domain: ["1"],
        },
      },
      variantCards: [
        {
          id: "variant-card",
          level: 2,
          hasLocalImage: true,
          realType: "Weapon",
          subCategory: "Sword",
        },
      ],
    })
  })

  it("detects runtime index mismatches", async () => {
    const expected = await projectRuntimeBusinessSnapshotFromStorage(storageSnapshot())
    const actualSource = storageSnapshot()
    actualSource.batches.pack_a.cards = [
      actualSource.batches.pack_a.cards[0],
      {
        ...(actualSource.batches.pack_a.cards[1] as Record<string, unknown>),
        variantSpecial: {
          realType: "Armor",
          subCategory: "Shield",
        },
      },
    ]
    const actual = await projectRuntimeBusinessSnapshotFromStorage(actualSource)

    expect(compareRuntimeBusinessSnapshots(expected, actual)).toContain("subclassCardIndex mismatch")
  })

  it("treats variant type descriptions as report-only at runtime", async () => {
    const expected = await projectRuntimeBusinessSnapshotFromStorage(storageSnapshot())
    const actualSource = storageSnapshot()
    ;(actualSource.batches.pack_a.variantTypes as any).Weapon.description = "Updated report-only text"
    const actual = await projectRuntimeBusinessSnapshotFromStorage(actualSource)

    expect(compareRuntimeBusinessSnapshots(expected, actual)).toEqual([])
  })

  it("calls public card helpers directly under Vitest ESM", async () => {
    await projectRuntimeBusinessSnapshotFromStorage(storageSnapshot())

    expect(getProfessionCardNames()).toEqual([])
    expect(getDomainCardNames()).toEqual(["Blade"])
    expect(getVariantTypeNames()).toEqual(["Weapon"])
    expect(getAvailableVariantTypes()).toEqual([{ value: "Weapon", label: "Weapon" }])
    expect(getVariantSubclassOptions("Weapon")).toEqual([{ value: "Sword", label: "Sword" }])
    expect(getVariantLevelOptions("Weapon")).toEqual([
      { value: "1", label: "等级 1" },
      { value: "2", label: "等级 2" },
      { value: "3", label: "等级 3" },
      { value: "4", label: "等级 4" },
    ])
  })

  it("allows actual-derived custom field metadata to exceed the legacy baseline", async () => {
    const expected = await projectRuntimeBusinessSnapshotFromStorage(storageSnapshot())
    const actualSource = storageSnapshot()
    ;(actualSource.batches.pack_a.customFieldDefinitions as any).domains = ["Blade", "Seraph"]
    const actual = await projectRuntimeBusinessSnapshotFromStorage(actualSource)

    expect(compareRuntimeBusinessSnapshots(expected, actual)).toEqual([])
  })

  it("fails when actual custom field metadata omits a runtime-visible card class", async () => {
    const expected = await projectRuntimeBusinessSnapshotFromStorage(storageSnapshot())
    const actual = {
      ...expected,
      aggregatedCustomFields: {
        domains: [],
      },
    }

    expect(compareRuntimeBusinessSnapshots(expected, actual)).toContain(
      "actual aggregatedCustomFields.domains does not cover runtime-visible class Blade",
    )
  })

  it("fails when public predefined helpers omit a runtime-visible card class", async () => {
    const expected = await projectRuntimeBusinessSnapshotFromStorage(storageSnapshot())
    const actual = {
      ...expected,
      predefinedNames: {
        ...expected.predefinedNames,
        domains: [],
      },
    }

    expect(compareRuntimeBusinessSnapshots(expected, actual)).toContain(
      "actual predefinedNames.domains does not cover runtime-visible class Blade",
    )
  })

  it("allows actual variant level metadata to narrow from a legacy baseline while covering actual cards", async () => {
    const expected = await projectRuntimeBusinessSnapshotFromStorage(storageSnapshot())
    const actualSource = storageSnapshot()
    ;(actualSource.batches.pack_a.variantTypes as any).Weapon.levelRange = [2, 2]
    const actual = await projectRuntimeBusinessSnapshotFromStorage(actualSource)

    expect(compareRuntimeBusinessSnapshots(expected, actual)).toEqual([])
  })

  it("fails when actual variant level options omit a runtime-visible variant card level", async () => {
    const expected = await projectRuntimeBusinessSnapshotFromStorage(storageSnapshot())
    const actual = {
      ...expected,
      variantOptions: {
        ...expected.variantOptions,
        byType: {
          ...expected.variantOptions.byType,
          Weapon: {
            ...expected.variantOptions.byType.Weapon,
            levelOptions: [{ value: "1", label: "等级 1" }],
          },
        },
      },
    }

    expect(compareRuntimeBusinessSnapshots(expected, actual)).toContain(
      "actual variantOptions.byType.Weapon.levelOptions does not cover runtime-visible level 2",
    )
  })

  it("hides disabled packs from runtime-visible APIs and indexes", async () => {
    const source = storageSnapshot()
    ;(source.index as any).batches.pack_a.disabled = true

    await expect(projectRuntimeBusinessSnapshotFromStorage(source)).resolves.toMatchObject({
      cardIds: [],
      cardsByType: {},
      aggregatedCustomFields: {},
      aggregatedVariantTypeKeys: [],
      publicApi: {
        standardByType: {},
        standardById: {
          "domain-card": null,
          "variant-card": null,
        },
        customCardIds: [],
        customByType: {},
        cardsByBatch: {
          pack_a: [],
        },
        customBatches: [
          {
            id: "pack_a",
            name: "Pack A",
            fileName: "pack.json",
            cardCount: 2,
            cardTypes: ["domain", "variant"],
            disabled: true,
          },
        ],
        allBatches: [
          {
            id: "pack_a",
            name: "Pack A",
            fileName: "pack.json",
            cardCount: 2,
            cardTypes: ["domain", "variant"],
            disabled: true,
          },
        ],
        cardBatchNames: {
          "domain-card": null,
          "variant-card": null,
        },
      },
      subclassCardIndex: {},
      levelCardIndex: {},
      batchKeywordIndex: {},
      batchLevelIndex: {},
    })
  })
})
