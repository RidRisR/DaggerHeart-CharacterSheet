import { describe, expect, it } from "vitest"
import { makeErrorDiagnostic, makeWarningDiagnostic } from "@/equipment/import/diagnostics"
import { appendJsonPointer, getJsonPointerValue, toJsonPointer } from "@/equipment/import/json-pointer"
import { validateEquipmentPackStructure } from "@/equipment/import/schema-validator"

describe("equipment import diagnostic helpers", () => {
  it("escapes JSON Pointer segments", () => {
    expect(toJsonPointer(["equipment", "weapons", "0", "a/b~c"])).toBe(
      "/equipment/weapons/0/a~1b~0c",
    )
    expect(toJsonPointer([])).toBe("")
    expect(appendJsonPointer("/equipment", "a/b~c")).toBe("/equipment/a~1b~0c")
  })

  it("creates error and warning diagnostics in one public shape", () => {
    const error = makeErrorDiagnostic("MISSING_FIELD", "/format", "Missing field")
    const warning = makeWarningDiagnostic("DESCRIPTION_LONG", "/description", "Description is long")

    expect(error).toMatchObject({ severity: "error", code: "MISSING_FIELD", path: "/format" })
    expect(warning).toMatchObject({
      severity: "warning",
      code: "DESCRIPTION_LONG",
      path: "/description",
    })
  })
})

describe("equipment import JSON Pointer value lookup", () => {
  const value = {
    equipment: {
      weapons: [
        { name: "Shortsword", damage: "1d8" },
        { name: "Longbow", damage: "1d10" },
      ],
    },
    "a/b~c": {
      nested: "escaped",
    },
  }

  it("returns the original value for the empty path", () => {
    expect(getJsonPointerValue(value, "")).toBe(value)
  })

  it("looks up nested object values", () => {
    expect(getJsonPointerValue(value, "/equipment/weapons")).toBe(value.equipment.weapons)
  })

  it("looks up escaped keys", () => {
    expect(getJsonPointerValue(value, "/a~1b~0c/nested")).toBe("escaped")
  })

  it("looks up array indexes", () => {
    expect(getJsonPointerValue(value, "/equipment/weapons/1/name")).toBe("Longbow")
  })

  it("returns undefined for missing paths", () => {
    expect(getJsonPointerValue(value, "/equipment/armor/0/name")).toBeUndefined()
  })
})

describe("equipment import structural validation", () => {
  it("maps required and additionalProperties paths", () => {
    const result = validateEquipmentPackStructure({
      format: "daggerheart.equipment-pack.v1",
      name: "包",
      version: "1.0.0",
      author: "作者",
      equipment: {
        weapons: [{ extra: true }],
      },
    })

    expect(result.success).toBe(false)
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "MISSING_FIELD", path: "/equipment/weapons/0/id" }),
        expect.objectContaining({ code: "UNKNOWN_FIELD", path: "/equipment/weapons/0/extra" }),
      ]),
    )
  })

  it("maps unknown fields on nested armor and contribution objects", () => {
    const result = validateEquipmentPackStructure({
      format: "daggerheart.equipment-pack.v1",
      name: "包",
      version: "1.0.0",
      author: "作者",
      equipment: {
        armor: [
          {
            id: "armor",
            name: "Armor",
            tier: "T1",
            baseArmorMax: 4,
            baseThresholds: { minor: 7, major: 15, extraThreshold: true },
            modifierContributions: [
              {
                id: "armor-bonus",
                definition: { target: "evasion", kind: "modifier", extraDefinition: true },
                editable: { label: "Bonus", value: 1, extraEditable: true },
                extraContribution: true,
              },
            ],
            extraArmor: true,
          },
        ],
      },
    })

    expect(result.success).toBe(false)
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "UNKNOWN_FIELD", path: "/equipment/armor/0/extraArmor" }),
        expect.objectContaining({
          code: "UNKNOWN_FIELD",
          path: "/equipment/armor/0/baseThresholds/extraThreshold",
        }),
        expect.objectContaining({
          code: "UNKNOWN_FIELD",
          path: "/equipment/armor/0/modifierContributions/0/extraContribution",
        }),
        expect.objectContaining({
          code: "UNKNOWN_FIELD",
          path: "/equipment/armor/0/modifierContributions/0/definition/extraDefinition",
        }),
        expect.objectContaining({
          code: "UNKNOWN_FIELD",
          path: "/equipment/armor/0/modifierContributions/0/editable/extraEditable",
        }),
      ]),
    )
  })

  it("maps missing format separately from invalid format", () => {
    const missing = validateEquipmentPackStructure({ name: "包", version: "1.0.0", author: "作者", equipment: {} })
    const invalid = validateEquipmentPackStructure({
      format: "wrong",
      name: "包",
      version: "1.0.0",
      author: "作者",
      equipment: {},
    })

    expect(missing.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "MISSING_FIELD", path: "/format" })]),
    )
    expect(invalid.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "INVALID_FORMAT", path: "/format" })]),
    )
  })

  it("maps enum, field length, contribution count, and values", () => {
    const pack = {
      format: "daggerheart.equipment-pack.v1",
      name: "x".repeat(101),
      version: "v1.0.0",
      author: "a".repeat(101),
      description: "d".repeat(4001),
      equipment: {
        weapons: [
          {
            id: "weapon",
            name: "Weapon",
            tier: "T9",
            weaponType: "primary",
            trait: "fast",
            damageType: "physical",
            range: "melee",
            burden: "oneHanded",
            damage: "x".repeat(41),
            modifierContributions: Array.from({ length: 21 }, (_, index) => ({
              id: `c-${index}`,
              definition: { target: "evasion", kind: "modifier" },
              editable: { label: `L${index}`, value: 1 },
            })),
          },
        ],
      },
    }

    const result = validateEquipmentPackStructure(pack)

    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "FIELD_TOO_LONG", path: "/name", value: "x".repeat(101) }),
        expect.objectContaining({ code: "FIELD_TOO_LONG", path: "/author", value: "a".repeat(101) }),
        expect.objectContaining({ code: "FIELD_TOO_LONG", path: "/description", value: "d".repeat(4001) }),
        expect.objectContaining({ code: "INVALID_ENUM", path: "/equipment/weapons/0/tier", value: "T9" }),
        expect.objectContaining({
          code: "FIELD_TOO_LONG",
          path: "/equipment/weapons/0/damage",
          value: "x".repeat(41),
        }),
        expect.objectContaining({
          code: "TEMPLATE_LIMIT_EXCEEDED",
          path: "/equipment/weapons/0/modifierContributions",
        }),
      ]),
    )
  })

  it("accepts arbitrary string versions and rejects non-string versions", () => {
    const accepted = validateEquipmentPackStructure({
      format: "daggerheart.equipment-pack.v1",
      name: "包",
      version: "v".repeat(80),
      author: "作者",
      equipment: {},
    })
    const rejected = validateEquipmentPackStructure({
      format: "daggerheart.equipment-pack.v1",
      name: "包",
      version: 1,
      author: "作者",
      equipment: {},
    })

    expect(accepted.success).toBe(true)
    expect(rejected).toMatchObject({
      success: false,
      diagnostics: [expect.objectContaining({ code: "INVALID_TYPE", path: "/version", value: 1 })],
    })
  })

  it("maps missing author as a required field", () => {
    const result = validateEquipmentPackStructure({
      format: "daggerheart.equipment-pack.v1",
      name: "包",
      version: "第一版",
      equipment: {},
    })

    expect(result.success).toBe(false)
    if (result.success) return

    const authorDiagnostics = result.diagnostics.filter((diagnostic) => diagnostic.path === "/author")

    expect(authorDiagnostics).toHaveLength(1)
    expect(authorDiagnostics[0]).toMatchObject({
      code: "MISSING_FIELD",
      path: "/author",
    })
  })

  it("accepts 4000-character descriptions but rejects 4001-character descriptions", () => {
    const accepted = {
      format: "daggerheart.equipment-pack.v1",
      name: "包",
      version: "1.0.0",
      author: "作者",
      description: "d".repeat(4000),
      equipment: {
        weapons: [
          {
            id: "weapon",
            name: "Weapon",
            tier: "T1",
            weaponType: "primary",
            trait: "agility",
            damageType: "physical",
            range: "melee",
            burden: "oneHanded",
            damage: "d8",
            description: "t".repeat(4000),
          },
        ],
      },
    }
    const rejected = structuredClone(accepted)
    rejected.equipment.weapons[0].description = "t".repeat(4001)

    expect(validateEquipmentPackStructure(accepted).success).toBe(true)
    expect(validateEquipmentPackStructure(rejected).diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "FIELD_TOO_LONG",
          path: "/equipment/weapons/0/description",
          value: "t".repeat(4001),
        }),
      ]),
    )
  })

  it("does not expose raw AJV error fields", () => {
    const result = validateEquipmentPackStructure({
      format: "daggerheart.equipment-pack.v1",
      name: "包",
      version: "bad",
      author: "作者",
      equipment: {
        weapons: [{ extra: true }],
      },
    })

    expect(result.success).toBe(false)
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MISSING_FIELD",
          path: "/equipment/weapons/0/id",
          message: "Required field is missing.",
        }),
        expect.objectContaining({
          code: "UNKNOWN_FIELD",
          path: "/equipment/weapons/0/extra",
          message: "Unknown field is not allowed.",
        }),
      ]),
    )
    for (const diagnostic of result.diagnostics) {
      expect(diagnostic).not.toHaveProperty("keyword")
      expect(diagnostic).not.toHaveProperty("params")
      expect(diagnostic).not.toHaveProperty("schemaPath")
      expect(diagnostic.message).not.toBe("must have required property 'id'")
      expect(diagnostic.message).not.toBe("must NOT have additional properties")
      expect(diagnostic.message).not.toContain("must match pattern")
    }
  })
})
