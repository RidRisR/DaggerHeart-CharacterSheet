import { describe, expect, it } from "vitest"
import { migrateSheetData } from "../sheet-data-migration"

describe("card instance identity migration", () => {
  it("adds instanceId to non-empty loadout and vault cards", () => {
    const migrated = migrateSheetData({
      schemaVersion: 2,
      cards: [
        { standarized: true, id: "card-a", name: "Card A", type: "domain", class: "Valor", cardSelectDisplay: {} },
      ],
      inventory_cards: [
        { standarized: true, id: "card-b", name: "Card B", type: "domain", class: "Blade", cardSelectDisplay: {} },
      ],
    })

    expect(migrated.schemaVersion).toBe(3)
    expect(migrated.cards[0].id).toBe("card-a")
    expect(migrated.cards[0].instanceId).toMatch(/^cardinst_/)
    expect(migrated.inventory_cards?.[0].instanceId).toMatch(/^cardinst_/)
  })

  it("does not add instanceId to empty placeholders", () => {
    const migrated = migrateSheetData({
      schemaVersion: 2,
      cards: [
        { standarized: true, id: "empty-1", name: "", type: "unknown", class: "", cardSelectDisplay: {} },
      ],
    })

    expect(migrated.cards[0].instanceId).toBeUndefined()
  })

  it("preserves existing instance automation fields and does not generate automation", () => {
    const migrated = migrateSheetData({
      schemaVersion: 2,
      cards: [
        {
          standarized: true,
          id: "card-a",
          name: "Card A",
          type: "domain",
          class: "Valor",
          cardSelectDisplay: {},
          instanceId: "cardinst_existing",
          automationState: { version: 1, abilities: {} },
        },
      ],
    })

    expect(migrated.cards[0].instanceId).toBe("cardinst_existing")
    expect(migrated.cards[0].automation).toBeUndefined()
    expect(migrated.cards[0].automationState).toEqual({ version: 1, abilities: {} })
  })
})
