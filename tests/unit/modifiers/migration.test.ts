import { describe, expect, it } from "vitest"
import type { StandardCard } from "@/card/card-types"
import { migrateSheetData } from "@/lib/sheet-data-migration"
import { createUnknownMigrationDifference } from "@/lib/modifiers/other-adjustments"
import {
  createEstimatedBaseContribution,
  createUnattributedDeltaContribution,
  getEstimatedBaseId,
  getUnattributedDeltaId,
} from "@/lib/modifiers/special-contributions"

function v1ModifierInput(overrides: Record<string, unknown>) {
  return {
    schemaVersion: 1,
    name: "V1 Modifier",
    level: "1",
    hope: 0,
    hopeMax: 6,
    cards: [],
    inventory_cards: [],
    ...overrides,
  } as any
}

describe("modifier state migration", () => {
  it("adds empty modifier state without changing existing final values", () => {
    const migrated = migrateSheetData(v1ModifierInput({
      name: "Legacy",
      evasion: "12+敏捷",
      hpMax: 7,
      armorValue: "4",
      minorThreshold: "10",
      majorThreshold: "20",
    }))

    expect(migrated.evasion).toBe("12+敏捷")
    expect(migrated.hpMax).toBe(7)
    expect("armorValue" in (migrated as any)).toBe(false)
    expect(migrated.minorThreshold).toBe("10")
    expect(migrated.majorThreshold).toBe("20")
    expect(migrated.modifierState?.targetStates.evasion?.autoCalculation).toBeUndefined()
    expect(migrated.modifierState?.targetStates.hpMax?.autoCalculation).toBeUndefined()
    expect(migrated.modifierState?.entryStates).toEqual({})
    expect("checkedUpgrades" in (migrated as any)).toBe(false)
    expect("automationSelections" in (migrated as any)).toBe(false)
  })

  it("migrates legacy byTarget active base and user entries to provider contributions", () => {
    const migrated = migrateSheetData(v1ModifierInput({
      modifierState: {
        byTarget: {
          evasion: {
            activeBaseId: "user:evasion-base",
            disabledEntryIds: ["upgrade:evasion"],
            userEntries: [{
              id: "user:evasion-base",
              sourceId: "user:evasion-base",
              target: "evasion",
              kind: "base",
              label: "手动基础闪避",
              value: 12,
              sourceType: "user",
              priority: 10,
            }],
          },
        },
      },
    }))

    expect(migrated.modifierState?.targetStates.evasion?.activeBaseId).toBe("user:evasion-base")
    expect(migrated.userModifierContributions).toEqual([{
      id: "user:evasion-base",
      definition: { target: "evasion", kind: "base" },
      editable: { label: "手动基础闪避", value: 12 },
    }])
    expect(migrated.upgradeStates?.["tier1-5-0"]).toBeUndefined()
    expect("automationSelections" in (migrated as any)).toBe(false)
  })

  it("drops legacy disabled entry ids instead of preserving enabled false states", () => {
    const migrated = migrateSheetData(v1ModifierInput({
      level: "1",
      minorThreshold: "14",
      armorThreshold: "10/13",
      modifierState: {
        byTarget: {
          minorThreshold: {
            disabledEntryIds: ["level:current:minorThreshold", "upgrade:evasion"],
          },
        },
      },
    }))

    expect(migrated.minorThreshold).toBe("14")
    expect(migrated.modifierState?.entryStates).toEqual({})
    expect(migrated.otherAdjustments).toContainEqual(
      createUnknownMigrationDifference("minorThreshold", 3),
    )
    expect(migrated.userModifierContributions).not.toContainEqual(
      expect.objectContaining({ id: getUnattributedDeltaId("minorThreshold") }),
    )
    expect(migrated.modifierState?.entryStates["upgrade:evasion"]).toBeUndefined()
  })

  it("drops legacy enabled true entry states because entry toggles are no longer supported", () => {
    const migrated = migrateSheetData(v1ModifierInput({
      modifierState: {
        targetStates: {},
        entryStates: {
          "user:evasion-mod": { enabled: true },
        },
      },
    }))

    expect(migrated.modifierState?.entryStates["user:evasion-mod"]).toBeUndefined()
  })

  it("migrates legacy armorValue modifier state to armorMax", () => {
    const migrated = migrateSheetData(v1ModifierInput({
      armorName: "锁子甲",
      armorBaseScore: "4",
      userModifierContributions: [{
        id: "user:armor-mod",
        definition: { target: "armorValue", kind: "modifier" },
        editable: { label: "手动护甲调整", value: 1 },
      }],
      modifierState: {
        byTarget: {
          armorValue: {
            activeBaseId: "armor:current:armorValue",
            disabledEntryIds: ["armor:current:armorValue", "user:armor-mod"],
          },
        },
      },
    }))

    expect(migrated.modifierState?.targetStates.armorMax?.activeBaseId).toBe("equipment:armor:current:armorMax")
    expect(migrated.modifierState?.targetStates).not.toHaveProperty("armorValue")
    expect(migrated.modifierState?.entryStates).toEqual({})
    expect(migrated.modifierState?.entryStates).not.toHaveProperty("armor:current:armorValue")
    expect(migrated.userModifierContributions).toContainEqual({
      id: "user:armor-mod",
      definition: { target: "armorMax", kind: "modifier" },
      editable: { label: "手动护甲调整", value: 1 },
    })
    expect("armorName" in (migrated as any)).toBe(false)
    expect("armorBaseScore" in (migrated as any)).toBe(false)
  })

  it("prefers legacy armorValue over hydrated armorMax when preserving armor final", () => {
    const migrated = migrateSheetData(v1ModifierInput({
      armorMax: 0,
      armorValue: "4",
    }))

    expect("armorValue" in (migrated as any)).toBe(false)
    expect(migrated.armorMax).toBe(4)
    expect(migrated.modifierState?.targetStates.armorMax?.autoCalculation).toBeUndefined()
  })

  it("migrates old profession base ids before reconciling against competing user bases", () => {
    const migrated = migrateSheetData({
      schemaVersion: 2,
      cards: [{
        id: "profession-warrior",
        type: "profession",
        name: "战士",
        professionSpecial: {
          起始闪避: 12,
          起始生命: 7,
        },
      } as StandardCard],
      userModifierContributions: [{
        id: "user:evasion-base",
        definition: { target: "evasion", kind: "base" },
        editable: { label: "手动基础闪避", value: 14 },
      }],
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: "profession:profession-warrior:evasion" },
          hpMax: { activeBaseId: "profession:profession-warrior:hpMax" },
        },
        entryStates: {
          "profession:profession-warrior:evasion": { enabled: false },
          "profession:profession-warrior:hpMax": { enabled: false },
          "user:evasion-base": { enabled: false },
        },
      },
    })

    expect(migrated.modifierState?.targetStates.evasion?.activeBaseId).toBe("profession:current:evasion")
    expect(migrated.modifierState?.targetStates.hpMax?.activeBaseId).toBe("profession:current:hpMax")
    expect(migrated.modifierState?.entryStates).toEqual({})
    expect(migrated.modifierState?.entryStates).not.toHaveProperty("profession:profession-warrior:evasion")
    expect(migrated.modifierState?.entryStates).not.toHaveProperty("profession:profession-warrior:hpMax")
  })

  it("preserves unrelated root contribution ids that contain armorValue text", () => {
    const armorValueTokenContribution = {
      id: "user:note:armorValue-token",
      definition: { target: "evasion", kind: "modifier" },
      editable: { label: "备注标记 A", value: 1 },
    }
    const armorMaxTokenContribution = {
      id: "user:note:armorMax-token",
      definition: { target: "evasion", kind: "modifier" },
      editable: { label: "备注标记 B", value: 2 },
    }

    const migrated = migrateSheetData({
      schemaVersion: 2,
      userModifierContributions: [
        armorValueTokenContribution,
        armorMaxTokenContribution,
      ],
    })

    expect(migrated.userModifierContributions).toEqual([
      armorValueTokenContribution,
      armorMaxTokenContribution,
    ])
  })

  it("replaces invalid array-backed modifier state and removes legacy automation selections", () => {
    const migrated = migrateSheetData({
      schemaVersion: 2,
      modifierState: [],
      automationSelections: [],
    })

    expect(migrated.modifierState).toEqual({ targetStates: {}, entryStates: {} })
    expect("automationSelections" in (migrated as any)).toBe(false)
  })

  it("preserves new modifier state while merging legacy byTarget state", () => {
    const migrated = migrateSheetData(v1ModifierInput({
      level: "1",
      modifierState: {
        targetStates: {
          proficiency: { activeBaseId: "level:base:proficiency" },
        },
        entryStates: {
          "level:current:minorThreshold": { enabled: false },
        },
        byTarget: {
          evasion: {
            activeBaseId: "user:evasion-base",
            userEntries: [{
              id: "user:evasion-base",
              sourceId: "user:evasion-base",
              target: "evasion",
              kind: "base",
              label: "手动基础闪避",
              value: 12,
              sourceType: "user",
              priority: 10,
            }],
          },
        },
      },
    }))

    expect(migrated.modifierState?.targetStates.proficiency?.activeBaseId).toBe("level:base:proficiency")
    expect(migrated.modifierState?.targetStates.evasion?.activeBaseId).toBe("user:evasion-base")
    expect(migrated.modifierState?.entryStates).toEqual({})
    expect(migrated.userModifierContributions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "user:evasion-base" }),
    ]))
  })

  it("normalizes legacy continuous sync mode from current modifier state", () => {
    const migrated = migrateSheetData({
      schemaVersion: 2,
      modifierState: {
        targetStates: {
          evasion: { syncMode: "continuous" },
        },
        entryStates: {},
      },
    })

    expect(migrated.modifierState?.targetStates.evasion).toBeUndefined()
    expect(migrated.modifierState?.targetStates).not.toHaveProperty("syncMode")
  })

  it("drops invalid sync mode values", () => {
    const migrated = migrateSheetData({
      schemaVersion: 2,
      modifierState: {
        targetStates: {
          evasion: { syncMode: "always" },
        },
        entryStates: {},
      },
    } as any)

    expect(migrated.modifierState?.targetStates.evasion).toBeUndefined()
  })

  it("drops invalid target state keys", () => {
    const migrated = migrateSheetData({
      schemaVersion: 2,
      modifierState: {
        targetStates: {
          notATarget: { syncMode: "continuous" },
        },
        entryStates: {},
      },
    } as any)

    expect(migrated.modifierState?.targetStates).toEqual({})
  })

  it("sanitizes malformed root user modifier contributions and keeps the first duplicate id", () => {
    const validContribution = {
      id: "user:evasion-root",
      definition: { target: "evasion", kind: "modifier" },
      editable: { label: "根加值", value: 2 },
    }

    expect(() => migrateSheetData({
      schemaVersion: 2,
      userModifierContributions: [
        null,
        { id: "bad" },
        validContribution,
        {
          id: "user:evasion-root",
          definition: { target: "evasion", kind: "modifier" },
          editable: { label: "重复加值", value: 4 },
        },
      ],
    })).not.toThrow()

    const migrated = migrateSheetData({
      schemaVersion: 2,
      userModifierContributions: [
        null,
        { id: "bad" },
        validContribution,
        {
          id: "user:evasion-root",
          definition: { target: "evasion", kind: "modifier" },
          editable: { label: "重复加值", value: 4 },
        },
      ],
    })

    expect(migrated.userModifierContributions).toEqual([validContribution])
  })

  it("preserves legacy numeric final with an unknown migration difference when a base exists", () => {
    const migrated = migrateSheetData(v1ModifierInput({
      evasion: "15",
      cards: [{
        id: "profession-warrior",
        type: "profession",
        name: "战士",
        professionSpecial: {
          起始闪避: 12,
        },
      } as StandardCard],
    }))

    expect(migrated.schemaVersion).toBe(2)
    expect(migrated.evasion).toBe("15")
    expect(migrated.modifierState?.targetStates.evasion).toEqual({
      activeBaseId: "profession:current:evasion",
    })
    expect(migrated.otherAdjustments).toContainEqual(createUnknownMigrationDifference("evasion", 3))
    expect(migrated.userModifierContributions).not.toContainEqual(
      expect.objectContaining({ id: getUnattributedDeltaId("evasion") }),
    )
  })

  it("preserves legacy numeric final with an estimated base when no base exists", () => {
    const migrated = migrateSheetData(v1ModifierInput({
      evasion: "15",
      userModifierContributions: [{
        id: "user:evasion-mod",
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "旧加值", value: 2 },
      }],
    }))

    expect(migrated.evasion).toBe("15")
    expect(migrated.modifierState?.targetStates.evasion).toEqual({
      activeBaseId: getEstimatedBaseId("evasion"),
    })
    expect(migrated.userModifierContributions).toEqual(expect.arrayContaining([
      {
        id: "user:evasion-mod",
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "旧加值", value: 2 },
      },
      createEstimatedBaseContribution("evasion", 13),
    ]))
    expect(migrated.otherAdjustments).toEqual([])
  })

  it("preserves legacy boolean-array proficiency final", () => {
    const migrated = migrateSheetData(v1ModifierInput({
      level: "1",
      proficiency: [true, true, true, false, false, false],
    }))

    expect(migrated.proficiency).toEqual([true, true, true, false, false, false])
    expect(migrated.modifierState?.targetStates.proficiency).toEqual({
      activeBaseId: "level:base:proficiency",
    })
    expect(migrated.otherAdjustments).toContainEqual(createUnknownMigrationDifference("proficiency", 2))
    expect(migrated.userModifierContributions).not.toContainEqual(
      expect.objectContaining({ id: getUnattributedDeltaId("proficiency") }),
    )
  })

  it("preserves non-numeric legacy final without creating a special contribution", () => {
    const migrated = migrateSheetData(v1ModifierInput({
      evasion: "12+敏捷",
    }))

    expect(migrated.evasion).toBe("12+敏捷")
    expect(migrated.modifierState?.targetStates.evasion).toBeUndefined()
    expect(migrated.userModifierContributions).toEqual([])
    expect(migrated.otherAdjustments).toEqual([])
  })

  it("does not create other adjustments for blank legacy finals", () => {
    const migrated = migrateSheetData(v1ModifierInput({
      evasion: "   ",
      cards: [{
        id: "profession-warrior",
        type: "profession",
        name: "战士",
        professionSpecial: {
          起始闪避: 12,
        },
      } as StandardCard],
    }))

    expect(migrated.otherAdjustments).toEqual([])
    expect(migrated.userModifierContributions).not.toContainEqual(
      expect.objectContaining({ id: getUnattributedDeltaId("evasion") }),
    )
  })

  it("does not create an estimated base from hpMax default fallback", () => {
    const migrated = migrateSheetData(v1ModifierInput({}))

    expect(migrated.hpMax).toBe("")
    expect(migrated.modifierState?.targetStates.hpMax).toBeUndefined()
    expect(migrated.userModifierContributions).not.toContainEqual(
      expect.objectContaining({ id: getEstimatedBaseId("hpMax") }),
    )
  })

  it("preserves non-numeric legacy armorValue final without creating armorMax specials", () => {
    const migrated = migrateSheetData(v1ModifierInput({
      armorValue: "四",
    }))

    expect("armorValue" in (migrated as any)).toBe(false)
    expect(migrated.armorMax).toBe("四")
    expect(Number.isNaN(migrated.armorMax)).toBe(false)
    expect(migrated.modifierState?.targetStates.armorMax?.autoCalculation).toBeUndefined()
    expect(migrated.userModifierContributions).not.toContainEqual(
      expect.objectContaining({ id: getEstimatedBaseId("armorMax") }),
    )
    expect(migrated.userModifierContributions).not.toContainEqual(
      expect.objectContaining({ id: getUnattributedDeltaId("armorMax") }),
    )
  })

  it("migrates root armorValue unattributed delta ids into armorMax other adjustments and remains idempotent", () => {
    const migrated = migrateSheetData({
      schemaVersion: 2,
      userModifierContributions: [{
        id: "user:armorValue:unattributed-delta",
        definition: { target: "armorValue", kind: "modifier" },
        editable: { label: "未归因差额", value: 1 },
      }],
    } as any)
    const twice = migrateSheetData(migrated)

    expect(migrated.userModifierContributions).toEqual([])
    expect(migrated.otherAdjustments).toContainEqual(createUnknownMigrationDifference("armorMax", 1))
    expect(migrated.userModifierContributions).not.toContainEqual(
      expect.objectContaining({ id: "user:armorValue:unattributed-delta" }),
    )
    expect(twice).toEqual(migrated)
  })

  it("moves current-schema unattributed delta contributions into other adjustments", () => {
    const sheet = {
      schemaVersion: 2,
      evasion: "15",
      userModifierContributions: [
        createEstimatedBaseContribution("evasion", 13),
        createUnattributedDeltaContribution("evasion", 3),
      ],
      modifierState: {
        targetStates: {
          evasion: {
            activeBaseId: getEstimatedBaseId("evasion"),
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
    }

    const once = migrateSheetData(sheet)
    const twice = migrateSheetData(once)

    expect(twice).toEqual(once)
    expect(once.userModifierContributions?.filter(entry => entry.id === getEstimatedBaseId("evasion"))).toHaveLength(1)
    expect(once.userModifierContributions).not.toContainEqual(
      expect.objectContaining({ id: getUnattributedDeltaId("evasion") }),
    )
    expect(once.otherAdjustments).toContainEqual(createUnknownMigrationDifference("evasion", 3))
  })

  it("merges current-schema unattributed delta contributions with existing unknown migration differences", () => {
    const migrated = migrateSheetData({
      schemaVersion: 2,
      userModifierContributions: [
        createUnattributedDeltaContribution("evasion", 3),
      ],
      otherAdjustments: [
        createUnknownMigrationDifference("evasion", 2),
      ],
    })

    expect(migrated.userModifierContributions).not.toContainEqual(
      expect.objectContaining({ id: getUnattributedDeltaId("evasion") }),
    )
    expect(migrated.otherAdjustments).toContainEqual(createUnknownMigrationDifference("evasion", 5))
  })

  it("migrates fixed checked upgrades to upgrade states before preserving legacy finals", () => {
    const migrated = migrateSheetData(v1ModifierInput({
      hpMax: 8,
      cards: [{
        id: "profession-warrior",
        type: "profession",
        name: "战士",
        professionSpecial: {
          起始生命: 6,
        },
      } as StandardCard],
      checkedUpgrades: {
        "tier1-1-0": { 1: true },
        "tier1-1-1": { 1: true },
      },
    }))

    expect(migrated.upgradeStates).toMatchObject({
      "tier1-1-0": { checked: true, params: { target: "hpMax" } },
      "tier1-1-1": { checked: true, params: { target: "hpMax" } },
    })
    expect(migrated.hpMax).toBe(8)
    expect(migrated.otherAdjustments).toEqual([])
    expect(migrated.userModifierContributions).not.toContainEqual(
      expect.objectContaining({ id: getUnattributedDeltaId("hpMax") }),
    )
    expect("checkedUpgrades" in (migrated as any)).toBe(false)
    expect("automationSelections" in (migrated as any)).toBe(false)
  })

  it("migrates parameterized checked upgrades without guessing params", () => {
    const migrated = migrateSheetData(v1ModifierInput({
      checkedUpgrades: {
        "tier1-0-2": { 0: true },
        "tier1-3-0": { 3: true },
      },
    }))

    expect(migrated.upgradeStates).toMatchObject({
      "tier1-0-2": { checked: true },
      "tier1-3-0": { checked: true },
    })
  })

  it("uses UI option indexing when migrating tier2 checked upgrade automation", () => {
    const migrated = migrateSheetData(v1ModifierInput({
      checkedUpgrades: {
        "tier2-1-0": { 1: true },
        "tier2-7": { 7: true },
        "tier2-8": { 8: true },
      },
    }))

    expect(migrated.upgradeStates).toMatchObject({
      "tier2-1-0": { checked: true, params: { target: "hpMax" } },
      "tier2-7": { checked: true, params: { target: "proficiency" } },
      "tier2-8": { checked: true },
    })
  })

  it("drops unpublished legacy automation selection source ids instead of migrating them", () => {
    const migrated = migrateSheetData(v1ModifierInput({
      automationSelections: {
        "upgrade:tier1-2-0": {
          selected: true,
          params: { target: "stressMax" },
        },
      },
    }))

    expect(migrated.upgradeStates).not.toHaveProperty("tier1-2-0")
    expect(migrated.upgradeStates).not.toHaveProperty("upgrade:tier1-2-0")
    expect("automationSelections" in (migrated as any)).toBe(false)
  })

  it("replaces stale unknown migration difference without subtracting its old value", () => {
    const manualOtherAdjustment = {
      id: "other:evasion:manual-final-adjustment",
      target: "evasion",
      kind: "manualFinalAdjustment",
      value: 1,
    }
    const migrated = migrateSheetData(v1ModifierInput({
      evasion: "16",
      cards: [{
        id: "profession-warrior",
        type: "profession",
        name: "战士",
        professionSpecial: {
          起始闪避: 12,
        },
      } as StandardCard],
      otherAdjustments: [
        createUnknownMigrationDifference("evasion", 2),
        manualOtherAdjustment,
      ],
    }))

    expect(migrated.otherAdjustments).toEqual([
      createUnknownMigrationDifference("evasion", 3),
      manualOtherAdjustment,
    ])
  })

  it("uses legacy stressMax final as estimated base without hidden baseline", () => {
    const baseline = migrateSheetData(v1ModifierInput({ stressMax: 6 }))
    const increased = migrateSheetData(v1ModifierInput({ stressMax: 8 }))

    expect(baseline.userModifierContributions).toContainEqual(
      createEstimatedBaseContribution("stressMax", 6),
    )
    expect(baseline.otherAdjustments).toEqual([])

    expect(increased.userModifierContributions).toContainEqual(
      createEstimatedBaseContribution("stressMax", 8),
    )
    expect(increased.otherAdjustments).toEqual([])
  })

  it("uses experience value baseline 2 before creating migration differences", () => {
    const baseline = migrateSheetData(v1ModifierInput({
      experienceValues: ["2"],
    }))
    const increased = migrateSheetData(v1ModifierInput({
      experienceValues: ["4"],
    }))

    expect(baseline.userModifierContributions).toContainEqual(
      createEstimatedBaseContribution("experienceValues.0", 2),
    )
    expect(baseline.otherAdjustments).toEqual([])

    expect(increased.userModifierContributions).toContainEqual(
      createEstimatedBaseContribution("experienceValues.0", 2),
    )
    expect(increased.otherAdjustments).toContainEqual(
      createUnknownMigrationDifference("experienceValues.0", 2),
    )
  })

  it("normalizes current other adjustments and upgrade states while removing legacy upgrade fields", () => {
    const migrated = migrateSheetData({
      schemaVersion: 2,
      otherAdjustments: [
        { id: "stale", target: "evasion", kind: "unknownMigrationDifference", value: 2 },
        { id: "bad", target: "not-a-target", kind: "unknownMigrationDifference", value: 1 },
      ],
      upgradeStates: {
        "tier1-5-0": { checked: true, params: { target: "evasion" }, extra: "drop" },
        "bad": { checked: true, params: { target: "armorMax" } },
        "tier1-2-0": { checked: false, params: { target: "stressMax" } },
      },
      checkedUpgrades: {
        "tier1-1-0": { 1: true },
      },
      automationSelections: {
        "upgrade:tier1-1-1": {
          selected: true,
          params: { target: "hpMax" },
        },
      },
    } as any)

    expect(migrated.otherAdjustments).toEqual([
      createUnknownMigrationDifference("evasion", 2),
    ])
    expect(migrated.upgradeStates).toEqual({
      "tier1-5-0": { checked: true, params: { target: "evasion" } },
      "bad": { checked: true },
      "tier1-2-0": { checked: false },
      "tier1-1-0": { checked: true, params: { target: "hpMax" } },
    })
    expect("checkedUpgrades" in (migrated as any)).toBe(false)
    expect("automationSelections" in (migrated as any)).toBe(false)
  })

  it("bridges legacy upgrade fields when normalizing current schema data", () => {
    const migrated = migrateSheetData({
      schemaVersion: 2,
      checkedUpgrades: {
        "tier1-1-0": { 1: true },
      },
    } as any)

    expect(migrated.upgradeStates).toEqual({
      "tier1-1-0": { checked: true, params: { target: "hpMax" } },
    })
    expect("checkedUpgrades" in (migrated as any)).toBe(false)
    expect("automationSelections" in (migrated as any)).toBe(false)
  })

  it("uses UI option indexing when normalizing current schema legacy checked upgrades", () => {
    const migrated = migrateSheetData({
      schemaVersion: 2,
      checkedUpgrades: {
        "tier2-1-0": { 1: true },
        "tier2-7": { 7: true },
        "tier2-8": { 8: true },
        "tier3-1-0": { 1: true },
      },
    } as any)

    expect(migrated.upgradeStates).toEqual({
      "tier2-1-0": { checked: true, params: { target: "hpMax" } },
      "tier2-7": { checked: true, params: { target: "proficiency" } },
      "tier2-8": { checked: true },
      "tier3-1-0": { checked: true, params: { target: "hpMax" } },
    })
    expect("checkedUpgrades" in (migrated as any)).toBe(false)
  })
})
