import { describe, expect, it } from "vitest"
import { buildBuiltinRuntimeEquipmentTemplates } from "../builtin-templates"
import type { CanonicalBuiltinArmorTemplate, CanonicalBuiltinWeaponTemplate } from "../types"

describe("built-in runtime equipment template assembly", () => {
  it("adds kind and modifierContributions to canonical built-in weapon and armor fixtures", () => {
    const weapons: CanonicalBuiltinWeaponTemplate[] = [
      {
        id: "builtin.weapon.secondary.dagger",
        name: "Dagger",
        tier: "T1",
        weaponType: "secondary",
        trait: "finesse",
        damageType: "physical",
        range: "melee",
        burden: "offHand",
        damage: "d8",
        featureName: "Paired",
        description: "Useful in the off hand.",
      },
    ]
    const armor: CanonicalBuiltinArmorTemplate[] = [
      {
        id: "builtin.armor.leather",
        name: "Leather Armor",
        tier: "T1",
        baseArmorMax: 3,
        baseThresholds: { minor: 6, major: 13 },
        featureName: "",
        description: "",
      },
    ]

    const templates = buildBuiltinRuntimeEquipmentTemplates({ weapons, armor })

    expect(templates).toEqual([
      {
        kind: "weapon",
        id: "builtin.weapon.secondary.dagger",
        name: "Dagger",
        tier: "T1",
        weaponType: "secondary",
        trait: "finesse",
        damageType: "physical",
        range: "melee",
        burden: "offHand",
        damage: "d8",
        featureName: "Paired",
        description: "Useful in the off hand.",
        modifierContributions: [],
      },
      {
        kind: "armor",
        id: "builtin.armor.leather",
        name: "Leather Armor",
        tier: "T1",
        baseArmorMax: 3,
        baseThresholds: { minor: 6, major: 13 },
        featureName: "",
        description: "",
        modifierContributions: [],
      },
    ])
    const secondaryWeapon = templates.find(
      (template): template is Extract<(typeof templates)[number], { kind: "weapon" }> =>
        template.kind === "weapon" && template.weaponType === "secondary",
    )
    expect(secondaryWeapon?.burden).toBe("offHand")
  })
})
