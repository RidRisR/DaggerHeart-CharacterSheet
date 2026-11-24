import { describe, expect, it } from "vitest"
import { existsSync } from "node:fs"
import { join } from "node:path"
import hopeFear from "@/data/cards/builtin-hope-fear.json"
import hopeFearIdAliases from "@/data/cards/hope-fear-id-aliases.json"
import { buildCardId } from "@/app/card-editor/utils/id-generator"
import { prepareCardPackContentForRuntime } from "../prepare-card-pack-content"
import builtinBase from "@/data/cards/builtin-base.json"
import { CardSource, CardType } from "@/card/card-types"
import { CARD_BUILTIN_SOURCE_ID, HOPE_FEAR_SOURCE_ID } from "../source-types"
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

  it("loads the separate Hope and Fear pack with bundled static art", () => {
    const { batch, cards } = loadBuiltinCardRuntimeSource({ sourceId: HOPE_FEAR_SOURCE_ID, disabledSourceIds: [] })
    expect(batch).toMatchObject({
      id: HOPE_FEAR_SOURCE_ID, name: "希望与恐惧扩展", author: "AlchemiZhou", cardCount: 73, isSystemBatch: true, disabled: false,
    })
    expect(cards.every((card) => card.batchId === batch.id && card.source === CardSource.BUILTIN && !card.hasLocalImage)).toBe(true)
    const ids = cards.map((card) => card.id)
    expect(new Set(ids).size).toBe(73)
    expect(Object.keys(hopeFearIdAliases).sort()).toEqual([...ids].sort())
    for (const card of cards) {
      expect(card.id).toBe(buildCardId(hopeFear.name, hopeFear.author, card.type as CardType, card.name))
    }
    const artwork = new Set(cards.map((card) => card.imageUrl))
    expect(artwork.size).toBe(73)
    for (const path of artwork) {
      expect(path).toMatch(/^hope-fear\/.+\.webp$/)
      expect(existsSync(join("public/image", path!))).toBe(true)
    }
  })

  it("validates the native expansion without dropped fields and projects its reference cards", () => {
    expect(prepareCardPackContentForRuntime({ payload: hopeFear })).toMatchObject({ success: true, diagnostics: [] })
    const { cards } = loadBuiltinCardRuntimeSource({ sourceId: HOPE_FEAR_SOURCE_ID, disabledSourceIds: [] })
    const variants = cards.filter((card) => card.type === CardType.Variant)
    expect(new Set(variants.map((card) => card.variantSpecial?.realType))).toEqual(new Set(["转变卡"]))
    expect(variants).toHaveLength(6)
    expect(hopeFear.definitions.variants).toEqual(["转变卡"])
    expect(Object.keys(hopeFear.definitions.variantTypes)).toEqual(["转变卡"])
    expect(cards.find((card) => card.name === "失乡之民")?.cardSelectDisplay?.item1).toBe("亲如家人")
  })

  it("lists each Hope and Fear subclass in progression order", () => {
    const { cards } = loadBuiltinCardRuntimeSource({ sourceId: HOPE_FEAR_SOURCE_ID, disabledSourceIds: [] })
    const subclasses = cards.filter((card) => card.type === CardType.Subclass)
    const names = [...new Set(subclasses.map((card) => card.headerDisplay))]
    expect(names).toHaveLength(8)
    expect(subclasses.map((card) => [card.headerDisplay, card.level])).toEqual(
      names.flatMap((name) => [1, 2, 3].map((level) => [name, level])),
    )
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
