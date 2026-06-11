import { describe, expect, it } from "vitest"
import {
  checkEquipmentPackConflicts,
  validateEquipmentPackSemantics,
} from "@/equipment/import/semantic-validation"
import type { NormalizedEquipmentPackData } from "@/equipment/import/types"

function createPack(overrides: Partial<NormalizedEquipmentPackData> = {}): NormalizedEquipmentPackData {
  return {
    metadata: {
      format: "daggerheart.equipment-pack.v1",
      name: "包",
      version: "1.0.0",
      author: "作者",
      description: "",
    },
    weapons: [
      {
        id: "pack-author-weapon-shadow",
        name: "影刃",
        tier: "T1",
        weaponType: "primary",
        trait: "agility",
        damageType: "physical",
        range: "melee",
        burden: "oneHanded",
        damage: "d8",
        featureName: "",
        description: "",
        modifierContributions: [],
      },
    ],
    armor: [],
    ...overrides,
  }
}

describe("equipment pack semantic validation", () => {
  it("rejects an empty equipment pack", () => {
    const diagnostics = validateEquipmentPackSemantics(createPack({ weapons: [], armor: [] }))

    expect(diagnostics).toEqual([
      expect.objectContaining({ severity: "error", code: "EMPTY_EQUIPMENT", path: "/equipment" }),
    ])
  })

  it("reports duplicate ids with related paths", () => {
    const diagnostics = validateEquipmentPackSemantics(
      createPack({
        weapons: [createPack().weapons[0], { ...createPack().weapons[0], name: "第二把" }],
        armor: [],
      }),
    )

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: "DUPLICATE_ID",
        path: "/equipment/weapons/1/id",
        relatedPaths: ["/equipment/weapons/0/id"],
      }),
    ])
  })

  it("reports duplicate template ids across weapons and armor with related paths", () => {
    const weapon = createPack().weapons[0]
    const diagnostics = validateEquipmentPackSemantics(
      createPack({
        weapons: [weapon],
        armor: [
          {
            id: weapon.id,
            name: "影甲",
            tier: "T1",
            baseArmorMax: 4,
            baseThresholds: { minor: 7, major: 15 },
            featureName: "",
            description: "",
            modifierContributions: [],
          },
        ],
      }),
    )

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: "DUPLICATE_ID",
        path: "/equipment/armor/0/id",
        relatedPaths: ["/equipment/weapons/0/id"],
      }),
    ])
  })

  it("reports duplicate contribution ids within the same template", () => {
    const diagnostics = validateEquipmentPackSemantics(
      createPack({
        weapons: [
          {
            ...createPack().weapons[0],
            modifierContributions: [
              {
                id: "duplicate-contribution",
                definition: { target: "evasion", kind: "modifier" },
                editable: { label: "A", value: 1 },
              },
              {
                id: "duplicate-contribution",
                definition: { target: "armorMax", kind: "modifier" },
                editable: { label: "B", value: 2 },
              },
            ],
          },
        ],
      }),
    )

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: "DUPLICATE_ID",
        path: "/equipment/weapons/0/modifierContributions/1/id",
        relatedPaths: ["/equipment/weapons/0/modifierContributions/0/id"],
      }),
    ])
  })

  it("allows duplicate contribution ids across different templates", () => {
    const weapon = createPack().weapons[0]
    const diagnostics = validateEquipmentPackSemantics(
      createPack({
        weapons: [
          {
            ...weapon,
            modifierContributions: [
              {
                id: "shared-contribution",
                definition: { target: "evasion", kind: "modifier" },
                editable: { label: "A", value: 1 },
              },
            ],
          },
          {
            ...weapon,
            id: "pack-author-weapon-moon",
            name: "月刃",
            modifierContributions: [
              {
                id: "shared-contribution",
                definition: { target: "armorMax", kind: "modifier" },
                editable: { label: "B", value: 2 },
              },
            ],
          },
        ],
      }),
    )

    expect(diagnostics.filter((diagnostic) => diagnostic.code === "DUPLICATE_ID")).toEqual([])
  })

  it("rejects invalid armor threshold order", () => {
    const diagnostics = validateEquipmentPackSemantics(
      createPack({
        weapons: [],
        armor: [
          {
            id: "pack-author-armor-shadow",
            name: "影甲",
            tier: "T1",
            baseArmorMax: 4,
            baseThresholds: { minor: 15, major: 7 },
            featureName: "",
            description: "",
            modifierContributions: [],
          },
        ],
      }),
    )

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: "INVALID_THRESHOLD_ORDER",
        path: "/equipment/armor/0/baseThresholds/major",
        value: { minor: 15, major: 7 },
      }),
    ])
  })
})

describe("equipment pack conflict check", () => {
  it("reports builtin id conflicts without relatedPaths", () => {
    const diagnostics = checkEquipmentPackConflicts(createPack(), {
      builtinTemplateIds: new Set(["pack-author-weapon-shadow"]),
      importedTemplateIds: new Set(["custom-id"]),
      customPackCount: 0,
      maxCustomPackCount: 50,
    })

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: "ID_CONFLICT",
        path: "/equipment/weapons/0/id",
        value: { id: "pack-author-weapon-shadow", conflictSource: "builtin" },
      }),
    ])
    expect(diagnostics[0].relatedPaths).toBeUndefined()
  })

  it("reports imported custom id conflicts with optional packId metadata", () => {
    const diagnostics = checkEquipmentPackConflicts(createPack(), {
      builtinTemplateIds: new Set(),
      importedTemplateIds: new Set(["pack-author-weapon-shadow"]),
      importedTemplateSources: new Map([["pack-author-weapon-shadow", { packId: "existing-pack" }]]),
      customPackCount: 0,
      maxCustomPackCount: 50,
    })

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: "ID_CONFLICT",
        path: "/equipment/weapons/0/id",
        value: {
          id: "pack-author-weapon-shadow",
          conflictSource: "custom",
          packId: "existing-pack",
        },
      }),
    ])
    expect(diagnostics[0].relatedPaths).toBeUndefined()
  })

  it("reports pack count limit in dry-run-compatible conflict context", () => {
    const diagnostics = checkEquipmentPackConflicts(createPack(), {
      builtinTemplateIds: new Set(),
      importedTemplateIds: new Set(),
      customPackCount: 50,
      maxCustomPackCount: 50,
    })

    expect(diagnostics).toEqual([expect.objectContaining({ code: "PACK_LIMIT_EXCEEDED", path: "" })])
  })

  it("reports pack count limit and id conflicts together", () => {
    const diagnostics = checkEquipmentPackConflicts(createPack(), {
      builtinTemplateIds: new Set(["pack-author-weapon-shadow"]),
      importedTemplateIds: new Set(),
      customPackCount: 50,
      maxCustomPackCount: 50,
    })

    expect(diagnostics).toEqual([
      expect.objectContaining({ code: "PACK_LIMIT_EXCEEDED", path: "" }),
      expect.objectContaining({
        code: "ID_CONFLICT",
        path: "/equipment/weapons/0/id",
        value: { id: "pack-author-weapon-shadow", conflictSource: "builtin" },
      }),
    ])
  })
})
