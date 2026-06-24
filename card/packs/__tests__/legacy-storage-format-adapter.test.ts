import { describe, expect, it } from "vitest"
import type { CardAutomationIR } from "@/card/automation/ir-types"
import type { CardPackDryRunCard, CardPackDryRunValidationModel } from "@/card/import/types"
import type { CardImportFinalCommitPlan } from "../storage-types"
import { projectCardImportToLegacyBatchStorage } from "../legacy-storage-format-adapter"

const importedAt = "2026-06-16T10:20:30.000Z"
const compiledAutomation: CardAutomationIR = {
  format: "daggerheart.card-automation.ir.v1",
  revision: "stable32:test-revision",
  abilities: [
    {
      id: "warrior-evasion",
      label: "Warrior Evasion",
      lifetime: { kind: "whileInLoadout" },
      effects: [{ kind: "emitModifier", id: "effect-1", target: "evasion", value: 1 }],
    },
  ],
}

function makeClassCard(overrides: Partial<Extract<CardPackDryRunCard, { group: "classes" }>> = {}) {
  return {
    group: "classes",
    id: "warrior",
    name: "Warrior",
    summary: "Stalwart fighter",
    domain1: "利刃",
    domain2: "骸骨",
    startingHitPoints: 6,
    startingEvasion: 10,
    startingItems: "Sword and shield",
    hopeFeature: "Stand firm",
    classFeature: "Strike true",
    ...overrides,
  } satisfies Extract<CardPackDryRunCard, { group: "classes" }>
}

function makeModel(
  overrides: Partial<CardPackDryRunValidationModel> = {},
): CardPackDryRunValidationModel {
  return {
    metadata: {
      format: "daggerheart.card-pack.v1",
      name: "Shadow Cards",
      version: "1.0.0",
      author: "Tester",
      description: "Cards from the shadows",
    },
    definitions: {
      classes: ["战士"],
      ancestries: [],
      communities: [],
      domains: ["利刃", "骸骨"],
      variants: [],
      variantTypes: {},
    },
    declaredDefinitions: ["classes", "domains"],
    cards: [makeClassCard()],
    imageAssets: [],
    ...overrides,
  }
}

function makePlan(
  overrides: Partial<CardImportFinalCommitPlan> = {},
): CardImportFinalCommitPlan {
  return {
    packId: "batch_1",
    packData: makeModel(),
    templateIds: ["warrior"],
    source: {
      originKind: "file",
      fileName: "shadow.json",
      label: "Shadow Cards",
      sizeBytes: 1234,
    },
    importedAt,
    disabled: false,
    assets: {
      cardImages: [],
    },
    ...overrides,
  }
}

function makePlanWithoutDeclaredDefinitions(): CardImportFinalCommitPlan {
  return makePlan({
    packData: makeModel({
      declaredDefinitions: [],
    }),
  })
}

function makePlanWithImageAsset(templateId: string): CardImportFinalCommitPlan {
  return makePlan({
    assets: {
      cardImages: [
        {
          templateId,
          path: "images/warrior.png",
          sizeBytes: 512,
          mimeType: "image/png",
          readBlob: async () => new Blob(["image"], { type: "image/png" }),
        },
      ],
    },
  })
}

function makePlanWithVariantTypes(): CardImportFinalCommitPlan {
  return makePlan({
    packData: makeModel({
      definitions: {
        classes: ["战士"],
        ancestries: [],
        communities: [],
        domains: ["利刃", "骸骨"],
        variants: ["食物"],
        variantTypes: {
          食物: {
            description: "Consumables and provisions",
            subclasses: ["餐食"],
            levelRange: [1, 3],
          },
        },
      },
    }),
  })
}

function makePlanWithLegacyHasLocalImageButNoAsset(): CardImportFinalCommitPlan {
  return makePlan({
    packData: makeModel({
      cards: [makeClassCard({ hasLocalImage: true })],
    }),
  })
}

describe("legacy storage format adapter", () => {
  it("projects a final commit plan to legacy batch storage shape", () => {
    const projection = projectCardImportToLegacyBatchStorage(makePlan())

    expect(projection.packId).toBe("batch_1")
    expect(projection.storedData.metadata).toMatchObject({
      id: "batch_1",
      name: "Shadow Cards",
      fileName: "shadow.json",
      importTime: importedAt,
      version: "1.0.0",
      author: "Tester",
    })
    expect(projection.storedData.cards[0]).toMatchObject({
      id: "warrior",
      batchId: "batch_1",
      source: "custom",
    })
    expect(projection.indexEntry).toMatchObject({
      id: "batch_1",
      name: "Shadow Cards",
      fileName: "shadow.json",
      cardCount: 1,
      isSystemBatch: false,
      disabled: false,
    })
    expect(projection.indexEntry).not.toHaveProperty("templateIds")
    expect(projection.indexEntry).not.toHaveProperty("imageTemplateIds")
    expect(projection.templateIds).toEqual(["warrior"])
    expect(projection.imageTemplateIds).toEqual([])
  })

  it("uses derived definitions when the source omitted customFieldDefinitions", () => {
    const projection = projectCardImportToLegacyBatchStorage(makePlanWithoutDeclaredDefinitions())

    expect(projection.storedData.customFieldDefinitions?.professions).toContain("战士")
    expect(projection.storedData.customFieldDefinitions?.domains).toEqual(expect.arrayContaining(["利刃", "骸骨"]))
  })

  it("marks cards with real DHCB image assets as local images", () => {
    const projection = projectCardImportToLegacyBatchStorage(makePlanWithImageAsset("warrior"))

    expect(projection.storedData.cards.find((card) => card.id === "warrior")?.hasLocalImage).toBe(true)
    expect(projection.storedData.cards.find((card) => card.id === "warrior")).not.toHaveProperty("readBlob")
    expect(projection.storedData.metadata.imageCardIds).toEqual(["warrior"])
    expect(projection.storedData.metadata.imageCount).toBe(1)
    expect(projection.storedData.metadata.totalImageSize).toBeGreaterThan(0)
    expect(projection.imageTemplateIds).toEqual(["warrior"])
  })

  it("preserves variantTypes and complete legacy index summary", () => {
    const projection = projectCardImportToLegacyBatchStorage(makePlanWithVariantTypes())

    expect(projection.storedData.variantTypes).toEqual(expect.any(Object))
    expect(projection.storedData.variantTypes?.食物).toMatchObject({
      description: "Consumables and provisions",
      subclasses: ["餐食"],
      levelRange: [1, 3],
    })
    expect(projection.indexEntry).toMatchObject({
      cardTypes: expect.arrayContaining(["profession"]),
      size: expect.any(Number),
      disabled: false,
    })
    expect(projection.templateIds).toEqual(["warrior"])
  })

  it("does not create image metadata when JSON card only carries hasLocalImage", () => {
    const projection = projectCardImportToLegacyBatchStorage(makePlanWithLegacyHasLocalImageButNoAsset())

    expect(projection.storedData.cards.find((card) => card.id === "warrior")?.hasLocalImage).toBe(true)
    expect(projection.storedData.metadata.imageCardIds ?? []).toEqual([])
    expect(projection.imageTemplateIds).toEqual([])
  })

  it("preserves compiled template automation on projected legacy cards", () => {
    const projection = projectCardImportToLegacyBatchStorage(
      makePlan({
        packData: makeModel({
          cards: [makeClassCard({ automation: compiledAutomation })],
        }),
      }),
    )

    expect(projection.storedData.cards.find((card) => card.id === "warrior")?.automation).toEqual(compiledAutomation)
  })
})
