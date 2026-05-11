import { describe, expect, it } from "vitest"
import { migrateSheetData } from "@/lib/sheet-data-migration"

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
    expect(migrated.modifierState).toEqual({ targetStates: {}, entryStates: {} })
    expect(migrated.userModifierContributions).toEqual([])
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

  it("migrates legacy disabled ids to entry states and reconciles orphan ids", () => {
    const migrated = migrateSheetData(v1ModifierInput({
      level: "1",
      modifierState: {
        byTarget: {
          minorThreshold: {
            disabledEntryIds: ["level:current:minorThreshold", "upgrade:evasion"],
          },
        },
      },
    }))

    expect(migrated.modifierState?.entryStates["level:current:minorThreshold"]).toEqual({ enabled: false })
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
    expect(migrated.modifierState?.entryStates["equipment:armor:current:armorMax"]).toEqual({ enabled: false })
    expect(migrated.modifierState?.entryStates["user:armor-mod"]).toEqual({ enabled: false })
    expect(migrated.modifierState?.entryStates).not.toHaveProperty("armor:current:armorValue")
    expect(migrated.userModifierContributions).toContainEqual({
      id: "user:armor-mod",
      definition: { target: "armorMax", kind: "modifier" },
      editable: { label: "手动护甲调整", value: 1 },
    })
    expect("armorName" in (migrated as any)).toBe(false)
    expect("armorBaseScore" in (migrated as any)).toBe(false)
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
    expect(migrated.modifierState?.entryStates["level:current:minorThreshold"]).toEqual({ enabled: false })
    expect(migrated.userModifierContributions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "user:evasion-base" }),
    ]))
  })

  it("preserves sync mode from current modifier state", () => {
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
      syncMode: "continuous",
    })
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
})
