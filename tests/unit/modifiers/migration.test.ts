import { describe, expect, it } from "vitest"
import { migrateSheetData } from "@/lib/sheet-data-migration"

describe("modifier state migration", () => {
  it("adds empty modifier state without changing existing final values", () => {
    const migrated = migrateSheetData({
      name: "Legacy",
      evasion: "12+敏捷",
      hpMax: 7,
      armorValue: "4",
      minorThreshold: "10",
      majorThreshold: "20",
    })

    expect(migrated.evasion).toBe("12+敏捷")
    expect(migrated.hpMax).toBe(7)
    expect(migrated.armorValue).toBe("4")
    expect(migrated.minorThreshold).toBe("10")
    expect(migrated.majorThreshold).toBe("20")
    expect(migrated.modifierState).toEqual({ targetStates: {}, entryStates: {} })
    expect(migrated.userModifierContributions).toEqual([])
    expect(migrated.automationSelections).toEqual({})
  })

  it("migrates legacy byTarget active base and user entries to provider contributions", () => {
    const migrated = migrateSheetData({
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
    })

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
    const migrated = migrateSheetData({
      level: "1",
      modifierState: {
        byTarget: {
          minorThreshold: {
            disabledEntryIds: ["level:current:minorThreshold", "upgrade:evasion"],
          },
        },
      },
    })

    expect(migrated.modifierState?.entryStates["level:current:minorThreshold"]).toEqual({ enabled: false })
    expect(migrated.modifierState?.entryStates["upgrade:evasion"]).toBeUndefined()
  })

  it("replaces invalid array-backed modifier state and automation selections", () => {
    const migrated = migrateSheetData({
      modifierState: [],
      automationSelections: [],
    })

    expect(migrated.modifierState).toEqual({ targetStates: {}, entryStates: {} })
    expect(migrated.automationSelections).toEqual({})
  })

  it("preserves new modifier state while merging legacy byTarget state", () => {
    const migrated = migrateSheetData({
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
    })

    expect(migrated.modifierState?.targetStates.proficiency?.activeBaseId).toBe("level:base:proficiency")
    expect(migrated.modifierState?.targetStates.evasion?.activeBaseId).toBe("user:evasion-base")
    expect(migrated.modifierState?.entryStates["level:current:minorThreshold"]).toEqual({ enabled: false })
    expect(migrated.userModifierContributions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "user:evasion-base" }),
    ]))
  })

  it("sanitizes malformed root user modifier contributions and keeps the first duplicate id", () => {
    const validContribution = {
      id: "user:evasion-root",
      definition: { target: "evasion", kind: "modifier" },
      editable: { label: "根加值", value: 2 },
    }

    expect(() => migrateSheetData({
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
