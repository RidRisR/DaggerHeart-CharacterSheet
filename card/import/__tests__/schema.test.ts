import { describe, expect, it } from "vitest"
import { validateCardPackV1Structure } from "@/card/import/schema-validator"

const validPack = {
  format: "daggerheart.card-pack.v1",
  name: "测试卡包",
  version: "1.0.0",
  author: "测试作者",
  definitions: {
    classes: ["战士"],
    domains: ["利刃", "骸骨"],
  },
  classes: [
    {
      id: "warrior",
      name: "战士",
      summary: "战斗职业。",
      domain1: "利刃",
      domain2: "骸骨",
      startingHitPoints: 6,
      startingEvasion: 10,
      startingItems: "武器",
      hopeFeature: "希望特性",
      classFeature: "职业特性",
    },
  ],
}

describe("card pack v1 internal schema", () => {
  it("accepts a minimal v1 pack", () => {
    const minimalPack = { format: "daggerheart.card-pack.v1" }

    expect(validateCardPackV1Structure(minimalPack)).toEqual({
      success: true,
      value: minimalPack,
      diagnostics: [],
    })
  })

  it("rejects unsupported format values", () => {
    const result = validateCardPackV1Structure({ ...validPack, format: "daggerheart.card-pack.v2" })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({ severity: "error", code: "INVALID_FORMAT", path: "/format" }),
      )
    }
  })

  it("rejects unknown fields in internal schema", () => {
    const pack = {
      ...validPack,
      classes: [{ ...validPack.classes[0], extra: "not allowed" }],
    }

    const result = validateCardPackV1Structure(pack)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({ severity: "error", code: "UNKNOWN_FIELD", path: "/classes/0/extra" }),
      )
    }
  })

  it("accepts variant summary item4 for legacy compatibility", () => {
    const pack = {
      format: "daggerheart.card-pack.v1",
      variants: [
        {
          id: "legacy-variant",
          name: "兼容变体",
          type: "特殊",
          effect: "",
          summaryItems: { item1: "一", item2: "二", item3: "三", item4: "四" },
        },
      ],
    }

    expect(validateCardPackV1Structure(pack)).toEqual({
      success: true,
      value: pack,
      diagnostics: [],
    })
  })

  it("rejects required field type errors with stable paths", () => {
    const pack = {
      ...validPack,
      classes: [{ ...validPack.classes[0], startingHitPoints: "6" }],
    }

    const result = validateCardPackV1Structure(pack)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({ severity: "error", code: "INVALID_TYPE", path: "/classes/0/startingHitPoints" }),
      )
    }
  })
})
