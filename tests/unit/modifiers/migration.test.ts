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
    expect(migrated.modifierState).toEqual({ byTarget: {} })
    expect(migrated.automationSelections).toEqual({})
  })

  it("preserves existing modifier state and automation selections", () => {
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

    expect(migrated.modifierState?.byTarget.evasion?.activeBaseId).toBe("user:evasion-base")
    expect(migrated.automationSelections?.["upgrade:tier1-5-0"]?.selected).toBe(true)
  })
})
