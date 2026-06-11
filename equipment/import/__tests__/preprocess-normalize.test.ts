import { describe, expect, it } from "vitest"
import { normalizeEquipmentPack } from "@/equipment/import/normalize"
import { preprocessAuthoringInput } from "@/equipment/import/preprocess"

const validWeaponPack: Record<string, any> = {
  format: "daggerheart.equipment-pack.v1",
  name: "  暗影装备包  ",
  version: "1.0.0",
  equipment: {
    weapons: [
      {
        id: " 暗影装备包-测试作者-weapon-影刃 ",
        name: " 影刃 ",
        tier: "T1",
        weaponType: "primary",
        trait: " 敏捷 ",
        damageType: " 物理 ",
        range: " 近战 ",
        burden: " 单手 ",
        damage: " d8 ",
        description: "  描述  ",
      },
    ],
  },
}

describe("equipment pack authoring preprocess", () => {
  it("trims strings before converting zh-CN enum aliases", () => {
    const result = preprocessAuthoringInput(validWeaponPack)

    expect(result.diagnostics).toEqual([])
    expect(result.value).toMatchObject({
      name: "暗影装备包",
      equipment: {
        weapons: [
          {
            id: "暗影装备包-测试作者-weapon-影刃",
            name: "影刃",
            trait: "agility",
            damageType: "physical",
            range: "melee",
            burden: "oneHanded",
            damage: "d8",
          },
        ],
      },
    })
  })

  it("converts zh-CN off-hand burden alias", () => {
    const pack = structuredClone(validWeaponPack)
    pack.equipment.weapons[0].burden = " 副手 "

    const result = preprocessAuthoringInput(pack)

    expect(result.diagnostics).toEqual([])
    expect(result.value).toMatchObject({
      equipment: {
        weapons: [
          {
            burden: "offHand",
          },
        ],
      },
    })
  })

  it("reports unknown Chinese enum aliases before structural validation", () => {
    const pack = structuredClone(validWeaponPack)
    pack.equipment.weapons[0].trait = "敏捷力"

    const result = preprocessAuthoringInput(pack)

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        severity: "error",
        code: "INVALID_ENUM",
        path: "/equipment/weapons/0/trait",
        value: "敏捷力",
      }),
    ])
  })

  it("collects all unknown Chinese enum aliases in one preprocess pass", () => {
    const pack = structuredClone(validWeaponPack)
    pack.equipment.weapons[0].trait = "敏捷力"
    pack.equipment.weapons[0].damageType = "元素"
    pack.equipment.weapons[0].range = "超近"
    pack.equipment.weapons[0].burden = "双持"

    const result = preprocessAuthoringInput(pack)

    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_ENUM", path: "/equipment/weapons/0/trait", value: "敏捷力" }),
        expect.objectContaining({ code: "INVALID_ENUM", path: "/equipment/weapons/0/damageType", value: "元素" }),
        expect.objectContaining({ code: "INVALID_ENUM", path: "/equipment/weapons/0/range", value: "超近" }),
        expect.objectContaining({ code: "INVALID_ENUM", path: "/equipment/weapons/0/burden", value: "双持" }),
      ]),
    )
    expect(result.diagnostics).toHaveLength(4)
  })

  it("does not mutate the authoring input", () => {
    const pack = structuredClone(validWeaponPack)

    preprocessAuthoringInput(pack)

    expect(pack).toEqual(validWeaponPack)
  })

  it("keeps unknown English enum values without preprocess diagnostics", () => {
    const pack = structuredClone(validWeaponPack)
    pack.equipment.weapons[0].trait = "fast"

    const result = preprocessAuthoringInput(pack)

    expect(result.diagnostics).toEqual([])
    expect(result.value).toMatchObject({
      equipment: {
        weapons: [
          {
            trait: "fast",
          },
        ],
      },
    })
  })

  it("does not convert or report aliases outside weapon enum field paths", () => {
    const pack = {
      ...structuredClone(validWeaponPack),
      metadata: {
        trait: " 敏捷 ",
      },
    }

    const result = preprocessAuthoringInput(pack)

    expect(result.diagnostics).toEqual([])
    expect(result.value).toMatchObject({
      metadata: {
        trait: "敏捷",
      },
    })
  })

  it("does not treat inherited alias object properties as enum aliases", () => {
    for (const aliasValue of ["toString", "constructor", "__proto__"]) {
      const pack = structuredClone(validWeaponPack)
      pack.equipment.weapons[0].trait = aliasValue

      const result = preprocessAuthoringInput(pack)

      expect(result.diagnostics).toEqual([])
      expect(result.value).toMatchObject({
        equipment: {
          weapons: [
            {
              trait: aliasValue,
            },
          ],
        },
      })
    }
  })

  it("preserves own __proto__ properties without changing output object prototypes", () => {
    const pack = structuredClone(validWeaponPack)
    Object.defineProperty(pack.equipment.weapons[0], "__proto__", {
      value: "pollution-check",
      enumerable: true,
      configurable: true,
      writable: true,
    })

    const result = preprocessAuthoringInput(pack)
    const weapon = (result.value as typeof validWeaponPack).equipment.weapons[0]

    expect(Object.prototype.hasOwnProperty.call(weapon, "__proto__")).toBe(true)
    expect(Object.getOwnPropertyDescriptor(weapon, "__proto__")).toMatchObject({
      value: "pollution-check",
      enumerable: true,
    })
    expect(Object.getPrototypeOf(weapon)).toBe(Object.prototype)
  })
})

describe("equipment pack canonical normalize", () => {
  it("applies defaults and warning diagnostics", () => {
    const preprocessed = preprocessAuthoringInput(validWeaponPack)
    const normalized = normalizeEquipmentPack(preprocessed.value)

    expect(normalized.pack.metadata.author).toBe("Unknown")
    expect(normalized.pack.metadata.description).toBe("")
    expect(normalized.pack.armor).toEqual([])
    expect(normalized.pack.weapons[0].modifierContributions).toEqual([])
    expect(normalized.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "warning", code: "MISSING_AUTHOR", path: "/author" }),
        expect.objectContaining({
          severity: "warning",
          code: "MISSING_DESCRIPTION",
          path: "/description",
        }),
      ]),
    )
  })

  it("warns when a template has no featureName and no description", () => {
    const pack = structuredClone(validWeaponPack) as Record<string, any>
    delete pack.equipment.weapons[0].description

    const preprocessed = preprocessAuthoringInput(pack)
    const normalized = normalizeEquipmentPack(preprocessed.value)

    expect(normalized.pack.weapons[0]).not.toHaveProperty("featureName")
    expect(normalized.pack.weapons[0]).not.toHaveProperty("description")
    expect(normalized.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "warning",
          code: "MISSING_TEMPLATE_DESCRIPTION",
          path: "/equipment/weapons/0",
        }),
      ]),
    )
  })

  it("warns only for descriptions longer than 1000 and not longer than 4000", () => {
    const packAtLimit = { ...validWeaponPack, description: "x".repeat(1000) }
    const packLong = { ...validWeaponPack, description: "x".repeat(1001) }
    const packMax = { ...validWeaponPack, description: "x".repeat(4000) }

    expect(
      normalizeEquipmentPack(preprocessAuthoringInput(packAtLimit).value).diagnostics,
    ).not.toEqual(expect.arrayContaining([expect.objectContaining({ code: "DESCRIPTION_LONG" })]))
    expect(normalizeEquipmentPack(preprocessAuthoringInput(packLong).value).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "DESCRIPTION_LONG", path: "/description" })]),
    )
    expect(normalizeEquipmentPack(preprocessAuthoringInput(packMax).value).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "DESCRIPTION_LONG", path: "/description" })]),
    )
  })
})
