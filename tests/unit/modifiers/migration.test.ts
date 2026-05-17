import { describe, expect, it } from "vitest"
import type { StandardCard } from "@/card/card-types"
import { migrateSheetData } from "@/lib/sheet-data-migration"
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
    expect(migrated.modifierState?.targetStates.evasion?.autoCalculation).toBe(true)
    expect(migrated.modifierState?.targetStates.hpMax?.autoCalculation).toBe(true)
    expect(migrated.modifierState?.entryStates).toEqual({})
    expect(migrated.automationSelections).toEqual({})
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
      automationSelections: {
        "upgrade:tier1-5-0": {
          selected: true,
          params: { target: "evasion" },
        },
      },
    }))

    expect(migrated.modifierState?.targetStates.evasion?.activeBaseId).toBe("user:evasion-base")
    expect(migrated.userModifierContributions).toEqual([{
      id: "user:evasion-base",
      definition: { target: "evasion", kind: "base" },
      editable: { label: "手动基础闪避", value: 12 },
    }])
    expect(migrated.automationSelections?.["upgrade:tier1-5-0"]?.selected).toBe(true)
    expect(migrated.automationSelections?.["upgrade:tier1-5-0"]?.params).toEqual({ target: "evasion" })
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
    expect(migrated.userModifierContributions).toContainEqual(
      createUnattributedDeltaContribution("minorThreshold", 3),
    )
    expect(migrated.modifierState?.entryStates["upgrade:evasion"]).toBeUndefined()
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

  it("replaces invalid array-backed modifier state and automation selections", () => {
    const migrated = migrateSheetData({
      schemaVersion: 2,
      modifierState: [],
      automationSelections: [],
    })

    expect(migrated.modifierState).toEqual({ targetStates: {}, entryStates: {} })
    expect(migrated.automationSelections).toEqual({})
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

    expect(migrated.modifierState?.targetStates.evasion).toEqual({
      autoCalculation: true,
    })
    expect(migrated.modifierState?.targetStates.evasion).not.toHaveProperty("syncMode")
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

  it("preserves legacy numeric final with an unattributed delta when a base exists", () => {
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
      autoCalculation: true,
    })
    expect(migrated.userModifierContributions).toContainEqual(
      createUnattributedDeltaContribution("evasion", 3),
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
      autoCalculation: true,
    })
    expect(migrated.userModifierContributions).toEqual(expect.arrayContaining([
      {
        id: "user:evasion-mod",
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "旧加值", value: 2 },
      },
      createEstimatedBaseContribution("evasion", 13),
    ]))
  })

  it("preserves non-numeric legacy final without creating a special contribution", () => {
    const migrated = migrateSheetData(v1ModifierInput({
      evasion: "12+敏捷",
    }))

    expect(migrated.evasion).toBe("12+敏捷")
    expect(migrated.modifierState?.targetStates.evasion).toEqual({ autoCalculation: true })
    expect(migrated.userModifierContributions).toEqual([])
  })

  it("does not create an estimated base from hpMax default fallback", () => {
    const migrated = migrateSheetData(v1ModifierInput({}))

    expect(migrated.hpMax).toBe(6)
    expect(migrated.modifierState?.targetStates.hpMax).toBeUndefined()
    expect(migrated.userModifierContributions).not.toContainEqual(
      expect.objectContaining({ id: getEstimatedBaseId("hpMax") }),
    )
  })

  it("safely clears non-numeric legacy armorValue without creating armorMax specials", () => {
    const migrated = migrateSheetData(v1ModifierInput({
      armorValue: "四",
    }))

    expect("armorValue" in (migrated as any)).toBe(false)
    expect(migrated.armorMax).toBe("")
    expect(Number.isNaN(migrated.armorMax)).toBe(false)
    expect(migrated.userModifierContributions).not.toContainEqual(
      expect.objectContaining({ id: getEstimatedBaseId("armorMax") }),
    )
    expect(migrated.userModifierContributions).not.toContainEqual(
      expect.objectContaining({ id: getUnattributedDeltaId("armorMax") }),
    )
  })

  it("keeps existing v2 special contributions idempotent", () => {
    const sheet = {
      schemaVersion: 2,
      evasion: "15",
      userModifierContributions: [
        createEstimatedBaseContribution("evasion", 13),
        createUnattributedDeltaContribution("evasion", 2),
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
  })
})
