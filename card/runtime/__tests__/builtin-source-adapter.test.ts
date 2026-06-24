import { describe, expect, it } from "vitest"
import { CardSource } from "@/card/card-types"
import { CARD_BUILTIN_SOURCE_ID } from "../source-types"
import { loadBuiltinCardRuntimeSource } from "../builtin-source-adapter"

describe("loadBuiltinCardRuntimeSource", () => {
  it("loads bundled built-in cards with compiled automation", async () => {
    const source = await loadBuiltinCardRuntimeSource({ disabledSourceIds: [] })
    const automated = source.cards.find((card) => card.automation)

    expect(source.sourceId).toBe(CARD_BUILTIN_SOURCE_ID)
    expect(source.kind).toBe("builtin")
    expect(source.batch.id).toBe(CARD_BUILTIN_SOURCE_ID)
    expect(source.batch.disabled).toBe(false)
    expect(source.cards.every((card) => card.source === CardSource.BUILTIN)).toBe(true)
    expect(automated?.automation).toEqual(expect.objectContaining({ format: "daggerheart.card-automation.ir.v1" }))
  })

  it("applies disabled state from app preferences input", async () => {
    const source = await loadBuiltinCardRuntimeSource({ disabledSourceIds: [CARD_BUILTIN_SOURCE_ID] })

    expect(source.batch.disabled).toBe(true)
  })
})
