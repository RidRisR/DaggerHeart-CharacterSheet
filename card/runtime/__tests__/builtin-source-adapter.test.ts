import { describe, expect, it } from "vitest"
import builtinBase from "@/data/cards/builtin-base.json"
import { CardSource, CardType } from "@/card/card-types"
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

  it("preserves beastform cards and their selection definitions", async () => {
    const source = await loadBuiltinCardRuntimeSource({ disabledSourceIds: [] })
    const beastforms = source.cards.filter((card) => card.type === CardType.Variant)

    expect(beastforms.map((card) => card.id)).toEqual(builtinBase.variant.map((card) => card.id))
    expect(beastforms.every((card) => card.variantSpecial?.realType === "野兽形态")).toBe(true)
    expect(source.batch.variantTypes).toEqual(builtinBase.customFieldDefinitions.variantTypes)
    expect(source.batch.customFieldDefinitions).toMatchObject({
      professions: builtinBase.customFieldDefinitions.professions,
      ancestries: builtinBase.customFieldDefinitions.ancestries,
      communities: builtinBase.customFieldDefinitions.communities,
      domains: builtinBase.customFieldDefinitions.domains,
    })
  })
})
