import { describe, expect, it } from "vitest"
import { buildCardPackDryRunValidationModel } from "@/card/import/dry-run-model"
import { validateCardPackSemantics } from "@/card/import/semantic-validation"
import type { CardPackV1 } from "@/card/import/types"

const validPack: CardPackV1 = {
  format: "daggerheart.card-pack.v1",
  name: "测试",
  definitions: {
    classes: ["战士"],
    ancestries: ["人类"],
    domains: ["利刃", "骸骨"],
    variants: ["食物"],
    variantTypes: { 食物: { subclasses: ["餐食"], levelRange: [1, 1] } },
  },
  classes: [
    {
      id: "warrior",
      name: "战士",
      summary: "",
      domain1: "利刃",
      domain2: "骸骨",
      startingHitPoints: 6,
      startingEvasion: 10,
      startingItems: "",
      hopeFeature: "",
      classFeature: "",
    },
  ],
  ancestries: [{ id: "human-1", name: "人类一", ancestry: "人类", summary: "", effect: "", category: 1 }],
  variants: [{ id: "meal", name: "餐点", type: "食物", subCategory: "餐食", level: 1, effect: "" }],
}

describe("card pack semantic validation", () => {
  it("accepts packs with a single ancestry card and no subclass triples", () => {
    const model = buildCardPackDryRunValidationModel(validPack, [])
    const diagnostics = validateCardPackSemantics(model)

    expect(diagnostics).toEqual([])
  })

  it("reports duplicate card ids inside the source pack", () => {
    const pack: CardPackV1 = {
      ...validPack,
      variants: [{ id: "warrior", name: "重复", type: "食物", effect: "" }],
    }
    const model = buildCardPackDryRunValidationModel(pack, [])

    expect(validateCardPackSemantics(model)).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "DUPLICATE_ID",
        path: "/variants/0/id",
        relatedPaths: ["/classes/0/id"],
      }),
    )
  })

  it("reports unknown definition references without reading installed storage", () => {
    const pack: CardPackV1 = {
      ...validPack,
      classes: [{ ...validPack.classes![0], domain1: "未知领域" }],
    }
    const model = buildCardPackDryRunValidationModel(pack, [])

    expect(validateCardPackSemantics(model)).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "UNKNOWN_REFERENCE",
        path: "/classes/0/domain1",
        value: "未知领域",
      }),
    )
  })

  it("does not report unknown references for omitted definition categories", () => {
    const { definitions: _definitions, ...packWithoutDefinitions } = validPack
    const model = buildCardPackDryRunValidationModel(packWithoutDefinitions, [])

    expect(validateCardPackSemantics(model)).toEqual([])
  })

  it("reports unknown references for explicitly declared definition categories", () => {
    const pack: CardPackV1 = {
      ...validPack,
      definitions: {
        domains: ["利刃"],
      },
    }
    const model = buildCardPackDryRunValidationModel(pack, [])

    expect(validateCardPackSemantics(model)).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "UNKNOWN_REFERENCE",
        path: "/classes/0/domain2",
        value: "骸骨",
      }),
    )
  })

  it("does not alias definition or image asset input arrays in the dry-run model", () => {
    const pack: CardPackV1 = {
      ...validPack,
      definitions: {
        classes: ["战士"],
        domains: ["利刃", "骸骨"],
        variantTypes: { 食物: { subclasses: ["餐食"], levelRange: [1, 1] } },
      },
    }
    const imageAssets = [{ cardId: "warrior", path: "images/warrior.png" }]
    const model = buildCardPackDryRunValidationModel(pack, imageAssets)

    pack.definitions!.classes!.push("突变职业")
    pack.definitions!.domains!.push("突变领域")
    pack.definitions!.variantTypes!.食物.subclasses!.push("突变分类")
    pack.definitions!.variantTypes!.食物.levelRange![0] = 2
    pack.definitions!.variantTypes!.突变 = { subclasses: ["突变分类"] }
    imageAssets[0].cardId = "mutated"
    imageAssets[0].path = "images/mutated.png"

    expect(model.definitions.classes).toEqual(["战士"])
    expect(model.definitions.domains).toEqual(["利刃", "骸骨"])
    expect(model.definitions.variantTypes.突变).toBeUndefined()
    expect(model.definitions.variantTypes.食物.subclasses).toEqual(["餐食"])
    expect(model.definitions.variantTypes.食物.levelRange).toEqual([1, 1])
    expect(model.imageAssets).toEqual([{ cardId: "warrior", path: "images/warrior.png" }])
  })

  it("reports orphan image assets against cards in the same pack only", () => {
    const model = buildCardPackDryRunValidationModel(validPack, [{ cardId: "missing", path: "images/missing.png" }])

    expect(validateCardPackSemantics(model)).toContainEqual(
      expect.objectContaining({ severity: "error", code: "ORPHAN_IMAGE", path: "/imageAssets/0/cardId" }),
    )
  })
})
