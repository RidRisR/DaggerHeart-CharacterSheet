import Ajv2020 from "ajv/dist/2020"
import { describe, expect, it } from "vitest"
import schema from "@/public/schemas/equipment-pack.v1.schema.json"

const ajv = new Ajv2020({ allErrors: true, strict: false })
const validate = ajv.compile(schema)
const schemaDocument = schema as Record<string, any>

const validWeaponPack: Record<string, any> = {
  format: "daggerheart.equipment-pack.v1",
  name: "暗影装备包",
  version: "1.0.0",
  author: "测试作者",
  equipment: {
    weapons: [
      {
        id: "暗影装备包-测试作者-weapon-影刃",
        name: "影刃",
        tier: "T1",
        weaponType: "primary",
        trait: "agility",
        damageType: "physical",
        range: "melee",
        burden: "oneHanded",
        damage: "d8",
      },
    ],
  },
}

function isValid(value: unknown): boolean {
  return validate(value) === true
}

describe("equipment pack public schema", () => {
  it("accepts a minimal weapon-only pack", () => {
    expect(isValid(validWeaponPack)).toBe(true)
  })

  it("accepts off-hand weapon burden", () => {
    const pack = structuredClone(validWeaponPack)
    pack.equipment.weapons[0].weaponType = "secondary"
    pack.equipment.weapons[0].burden = "offHand"

    expect(isValid(pack)).toBe(true)
  })

  it("accepts a minimal armor-only pack", () => {
    expect(
      isValid({
        format: "daggerheart.equipment-pack.v1",
        name: "护甲包",
        version: "第一版",
        author: "作者",
        equipment: {
          armor: [
            {
              id: "护甲包-作者-armor-影织甲",
              name: "影织甲",
              tier: "T1",
              baseArmorMax: 4,
              baseThresholds: { minor: 7, major: 15 },
            },
          ],
        },
      }),
    ).toBe(true)
  })

  it("accepts any non-empty string version", () => {
    for (const version of ["1.0.0-01", "v1.0.0", "第一版", "2026版"]) {
      const pack = structuredClone(validWeaponPack)
      pack.version = version

      expect(isValid(pack)).toBe(true)
    }
  })

  it("accepts name, author, and descriptions exactly at their max lengths", () => {
    const pack = structuredClone(validWeaponPack)
    pack.name = "x".repeat(100)
    pack.author = "a".repeat(100)
    pack.description = "d".repeat(4000)
    pack.equipment.weapons[0].description = "t".repeat(4000)

    expect(isValid(pack)).toBe(true)
  })

  it("rejects descriptions longer than 4000 characters", () => {
    const topLevelTooLong = structuredClone(validWeaponPack)
    topLevelTooLong.description = "d".repeat(4001)
    const templateTooLong = structuredClone(validWeaponPack)
    templateTooLong.equipment.weapons[0].description = "t".repeat(4001)

    expect(isValid(topLevelTooLong)).toBe(false)
    expect(validate.errors?.some((error) => error.keyword === "maxLength")).toBe(true)
    expect(isValid(templateTooLong)).toBe(false)
    expect(validate.errors?.some((error) => error.keyword === "maxLength")).toBe(true)
  })

  it("rejects missing required top-level fields", () => {
    const { format: _format, ...missingFormat } = validWeaponPack
    const { name: _name, ...missingName } = validWeaponPack
    const { version: _version, ...missingVersion } = validWeaponPack
    const { author: _author, ...missingAuthor } = validWeaponPack
    const { equipment: _equipment, ...missingEquipment } = validWeaponPack

    expect(isValid(missingFormat)).toBe(false)
    expect(validate.errors?.some((error) => error.keyword === "required")).toBe(true)
    expect(isValid(missingName)).toBe(false)
    expect(isValid(missingVersion)).toBe(false)
    expect(isValid(missingAuthor)).toBe(false)
    expect(isValid(missingEquipment)).toBe(false)
  })

  it("rejects Chinese enum values in the core schema", () => {
    const cases = [
      ["trait", "敏捷"],
      ["damageType", "物理"],
      ["range", "近战"],
      ["burden", "单手"],
    ] as const

    for (const [field, value] of cases) {
      const pack = structuredClone(validWeaponPack)
      pack.equipment.weapons[0][field] = value

      expect(isValid(pack)).toBe(false)
      expect(validate.errors?.some((error) => error.keyword === "enum")).toBe(true)
    }
  })

  it("does not impose weapon or armor maxItems limits", () => {
    expect(schemaDocument.$defs.equipment.properties.weapons).not.toHaveProperty("maxItems")
    expect(schemaDocument.$defs.equipment.properties.armor).not.toHaveProperty("maxItems")

    const weaponPack = structuredClone(validWeaponPack)
    weaponPack.equipment.weapons = Array.from({ length: 21 }, (_, index) => ({
      ...validWeaponPack.equipment.weapons[0],
      id: `暗影装备包-测试作者-weapon-影刃-${index}`,
      name: `影刃 ${index}`,
    }))

    const armorPack = {
      format: "daggerheart.equipment-pack.v1",
      name: "护甲包",
      version: "1.0.0",
      author: "作者",
      equipment: {
        armor: Array.from({ length: 21 }, (_, index) => ({
          id: `护甲包-作者-armor-影织甲-${index}`,
          name: `影织甲 ${index}`,
          tier: "T1",
          baseArmorMax: 4,
          baseThresholds: { minor: 7, major: 15 },
        })),
      },
    }

    expect(isValid(weaponPack)).toBe(true)
    expect(isValid(armorPack)).toBe(true)
  })

  it("limits modifierContributions to 20 and validates contribution ids like template ids", () => {
    const pack = structuredClone(validWeaponPack)
    pack.equipment.weapons[0].modifierContributions = Array.from({ length: 21 }, (_, index) => ({
      id: `contribution-${index}`,
      definition: { target: "evasion", kind: "modifier" },
      editable: { label: `调整 ${index}`, value: index },
    }))

    expect(isValid(pack)).toBe(false)
    expect(validate.errors?.some((error) => error.keyword === "maxItems")).toBe(true)

    const invalidContributionIdPack = structuredClone(validWeaponPack)
    invalidContributionIdPack.equipment.weapons[0].modifierContributions = [
      {
        id: "bad/id",
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "调整", value: 1 },
      },
    ]

    expect(isValid(invalidContributionIdPack)).toBe(false)
    expect(validate.errors?.some((error) => error.keyword === "not")).toBe(true)
  })
})
