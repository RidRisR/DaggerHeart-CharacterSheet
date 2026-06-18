import { describe, expect, it } from "vitest"
import { validateLegacyExternalContract } from "@/card/import/external-contract-guard"

const validLegacyPack = {
  customFieldDefinitions: {
    professions: ["战士"],
    classes: ["守护者"],
    ancestries: ["人类"],
    communities: ["荒野之民"],
    domains: ["利刃"],
    variants: ["食物"],
    variantTypes: {
      食物: {
        subclasses: ["餐食"],
        levelRange: [0, 10],
      },
    },
  },
  profession: [{ id: "warrior", 名称: "战士" }],
  variant: [{ id: "meal", 名称: "餐点", 类型: "食物" }],
  extraTopLevel: "adapter warning, not guard error",
}

describe("legacy external contract guard", () => {
  it("accepts structurally interpretable legacy packs", () => {
    const result = validateLegacyExternalContract(validLegacyPack)

    expect(result).toEqual({ success: true, value: validLegacyPack, diagnostics: [] })
  })

  it("accepts non-string definition list items when the containers are arrays", () => {
    const legacyPack = {
      customFieldDefinitions: {
        professions: [123],
        classes: [["守护者"]],
        ancestries: [{ name: "人类" }],
        communities: [false],
        domains: [null],
        variants: [undefined],
        variantTypes: {
          食物: {
            subclasses: [789, ["餐食"]],
          },
        },
      },
    }

    expect(validateLegacyExternalContract(legacyPack)).toEqual({ success: true, value: legacyPack, diagnostics: [] })
  })

  it("rejects non-object legacy roots", () => {
    const result = validateLegacyExternalContract([])

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({ severity: "error", code: "INVALID_TYPE", path: "", value: [] }),
      )
    }
  })

  it("rejects malformed known card groups and card group items", () => {
    const result = validateLegacyExternalContract({
      profession: {},
      variant: [123],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ severity: "error", code: "INVALID_TYPE", path: "/profession", value: {} }),
          expect.objectContaining({ severity: "error", code: "INVALID_TYPE", path: "/variant/0", value: 123 }),
        ]),
      )
    }
  })

  it("rejects malformed custom field definition containers and non-array lists", () => {
    const result = validateLegacyExternalContract({
      customFieldDefinitions: {
        professions: "战士",
        domains: { 0: "利刃" },
        variantTypes: [],
      },
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            severity: "error",
            code: "INVALID_TYPE",
            path: "/customFieldDefinitions/professions",
            value: "战士",
          }),
          expect.objectContaining({
            severity: "error",
            code: "INVALID_TYPE",
            path: "/customFieldDefinitions/domains",
            value: { 0: "利刃" },
          }),
          expect.objectContaining({
            severity: "error",
            code: "INVALID_TYPE",
            path: "/customFieldDefinitions/variantTypes",
            value: [],
          }),
        ]),
      )
    }
  })

  it("rejects malformed variant type metadata", () => {
    const result = validateLegacyExternalContract({
      customFieldDefinitions: {
        variantTypes: {
          食物: {
            subclasses: "餐食",
            levelRange: [1, "10"],
          },
          坐骑: "bad",
        },
      },
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            severity: "error",
            code: "INVALID_TYPE",
            path: "/customFieldDefinitions/variantTypes/食物/subclasses",
            value: "餐食",
          }),
          expect.objectContaining({
            severity: "error",
            code: "INVALID_TYPE",
            path: "/customFieldDefinitions/variantTypes/食物/levelRange/1",
            value: "10",
          }),
          expect.objectContaining({
            severity: "error",
            code: "INVALID_TYPE",
            path: "/customFieldDefinitions/variantTypes/坐骑",
            value: "bad",
          }),
        ]),
      )
    }
  })

  it("rejects non-array variant subclass lists", () => {
    const result = validateLegacyExternalContract({
      customFieldDefinitions: {
        variantTypes: {
          食物: {
            subclasses: "餐食",
          },
        },
      },
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({
          severity: "error",
          code: "INVALID_TYPE",
          path: "/customFieldDefinitions/variantTypes/食物/subclasses",
          value: "餐食",
        }),
      )
    }
  })

  it("rejects variant type level ranges that are not 2-number tuples", () => {
    const result = validateLegacyExternalContract({
      customFieldDefinitions: {
        variantTypes: {
          食物: {
            levelRange: [1, 2, 3],
          },
        },
      },
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({
          severity: "error",
          code: "INVALID_VALUE",
          path: "/customFieldDefinitions/variantTypes/食物/levelRange",
          value: [1, 2, 3],
        }),
      )
    }
  })
})
