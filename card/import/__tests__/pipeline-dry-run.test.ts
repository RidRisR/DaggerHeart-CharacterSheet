import JSZip from "jszip"
import { describe, expect, it } from "vitest"
import { importCardPackFromSource } from "@/card/import/import-pipeline"
import { createCardDhcbSource, createCardJsonSource, createCardObjectSource } from "@/card/import/source"

const legacyPack = {
  name: "旧卡包",
  customFieldDefinitions: { professions: ["战士"], domains: ["利刃", "骸骨"] },
  profession: [
    {
      id: "warrior",
      名称: "战士",
      简介: "",
      领域1: "利刃",
      领域2: "骸骨",
      起始生命: 6,
      起始闪避: 10,
      起始物品: "",
      希望特性: "",
      职业特性: "",
    },
  ],
}

const v1Pack = {
  format: "daggerheart.card-pack.v1",
  name: "v1 卡包",
  definitions: { classes: ["战士"], domains: ["利刃", "骸骨"] },
  classes: [
    {
      id: "warrior",
      name: "战士",
      summary: "",
      domain1: "利刃",
      domain2: "骸骨",
      startingHitPoints: 6,
      startingEvasion: 10,
      startingItems: "",
      hopeFeature: "",
      classFeature: "",
    },
  ],
}

const validAutomation = {
  format: "daggerheart.card-automation.definition.v1",
  mode: "lowLevel",
  body: {
    abilities: [
      {
        id: "simiah-nimble",
        label: "灵活",
        effects: [{ kind: "emitModifier", target: "evasion", value: 1 }],
      },
    ],
  },
}

const v1AutomationPack = {
  format: "daggerheart.card-pack.v1",
  name: "automation 卡包",
  ancestries: [
    {
      id: "simiah-nimble",
      name: "灵活",
      ancestry: "猿族",
      summary: "",
      effect: "闪避永久 +1",
      category: 1,
      automation: validAutomation,
    },
  ],
}

async function createDhcbBytes(cardsJson: unknown, imageName?: string) {
  const zip = new JSZip()
  zip.file("cards.json", JSON.stringify(cardsJson))
  if (imageName) zip.file(`images/${imageName}`, "image-bytes")
  return await zip.generateAsync({ type: "arraybuffer" })
}

describe("card import dry-run pipeline", () => {
  it("accepts legacy object input without committing storage", async () => {
    const result = await importCardPackFromSource(createCardObjectSource(legacyPack), { mode: "dryRun" })

    expect(result).toMatchObject({
      success: true,
      stage: "stageImportData",
      mode: "dryRun",
      summary: { name: "旧卡包", cardCount: 1, imageCount: 0, errorCount: 0 },
    })
    expect(result.model?.metadata.name).toBe("旧卡包")
    expect(result.model?.cards).toHaveLength(1)
    expect(result.draft?.templateIds).toContain("warrior")
    expect(result.draft?.assets.cardImages).toEqual([])
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "LEGACY_FORMAT_ASSUMED" }))
  })

  it("accepts direct daggerheart.card-pack.v1 input", async () => {
    const result = await importCardPackFromSource(createCardObjectSource(v1Pack), { mode: "dryRun" })

    expect(result).toMatchObject({
      success: true,
      stage: "stageImportData",
      summary: { name: "v1 卡包", cardCount: 1 },
    })
    expect(result.draft?.templateIds).toEqual(["warrior"])
    expect(result.diagnostics).toEqual([])
  })

  it("compiles valid card automation definitions into dry-run model IR", async () => {
    const result = await importCardPackFromSource(createCardObjectSource(v1AutomationPack), { mode: "dryRun" })

    expect(result).toMatchObject({
      success: true,
      stage: "stageImportData",
      summary: { name: "automation 卡包", cardCount: 1, errorCount: 0 },
    })
    expect(result.model?.cards[0].automation).toMatchObject({
      format: "daggerheart.card-automation.ir.v1",
      abilities: [expect.objectContaining({ id: "simiah-nimble" })],
    })
    expect(result.model?.cards[0].automation?.revision).toMatch(/^stable32:/)
    expect(result.model?.cards[0].automation).not.toMatchObject({ mode: "lowLevel" })
  })

  it("reports invalid automation compiler diagnostics without compiled dry-run IR", async () => {
    const result = await importCardPackFromSource(
      createCardObjectSource({
        ...v1AutomationPack,
        ancestries: [
          {
            ...v1AutomationPack.ancestries[0],
            automation: {
              ...validAutomation,
              body: {
                abilities: [
                  {
                    id: "simiah-nimble",
                    label: "灵活",
                    effects: [{ kind: "emitModifier", target: "unknown-target", value: 1 }],
                  },
                ],
              },
            },
          },
        ],
      }),
      { mode: "dryRun" },
    )

    expect(result.success).toBe(false)
    expect(result.stage).toBe("semanticValidation")
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: expect.stringMatching(/^INVALID_AUTOMATION_(DEFINITION|IR)$/),
        path: "/ancestries/0/automation/body/abilities/0/effects/0/target",
      }),
    )
    expect(result.model?.cards[0]).not.toHaveProperty("automation")
  })

  it("stages commit-mode imports without writing storage", async () => {
    const result = await importCardPackFromSource(createCardObjectSource(legacyPack, "shadow.json"), { mode: "commit" })

    expect(result).toMatchObject({
      success: true,
      stage: "stageImportData",
      mode: "commit",
    })
    expect(result.draft?.templateIds).toEqual(["warrior"])
  })

  it("rejects unsupported format without legacy fallback", async () => {
    const result = await importCardPackFromSource(createCardObjectSource({ ...v1Pack, format: "unknown.format" }), {
      mode: "dryRun",
    })

    expect(result).toMatchObject({
      success: false,
      stage: "externalFormatAdapter",
      diagnostics: [expect.objectContaining({ code: "UNSUPPORTED_FORMAT", path: "/format" })],
    })
  })

  it("stops at jsonParse for invalid json text", async () => {
    const result = await importCardPackFromSource(createCardJsonSource("{bad json"), { mode: "dryRun" })

    expect(result).toMatchObject({
      success: false,
      stage: "jsonParse",
      diagnostics: [expect.objectContaining({ code: "INVALID_JSON" })],
    })
  })

  it("reads legacy dhcb cards.json and discovers images without writing them", async () => {
    const bytes = await createDhcbBytes(legacyPack, "warrior.png")

    const result = await importCardPackFromSource(createCardDhcbSource(bytes, "pack.dhcb"), { mode: "dryRun" })

    expect(result).toMatchObject({
      success: true,
      stage: "stageImportData",
      summary: { cardCount: 1, imageCount: 1 },
    })
    expect(result.draft?.assets.cardImages[0]).toMatchObject({
      templateId: "warrior",
      path: "images/warrior.png",
      mimeType: "image/png",
    })
    expect(typeof result.draft?.assets.cardImages[0].readBlob).toBe("function")
  })

  it("accepts legacy dhcb with unreadable manifest when cards.json is valid", async () => {
    const zip = new JSZip()
    zip.file("manifest.json", "{bad manifest")
    zip.file("cards.json", JSON.stringify(legacyPack))
    const bytes = await zip.generateAsync({ type: "arraybuffer" })

    const result = await importCardPackFromSource(createCardDhcbSource(bytes, "legacy.dhcb"), { mode: "dryRun" })

    expect(result.success).toBe(true)
    expect(result.stage).toBe("stageImportData")
  })

  it("reports missing cards.json in dhcb sources", async () => {
    const zip = new JSZip()
    const bytes = await zip.generateAsync({ type: "arraybuffer" })

    const result = await importCardPackFromSource(createCardDhcbSource(bytes, "empty.dhcb"), { mode: "dryRun" })

    expect(result).toMatchObject({
      success: false,
      stage: "sourceRead",
      diagnostics: [expect.objectContaining({ code: "MISSING_CARDS_JSON" })],
    })
  })

  it("rejects malformed legacy contracts before adapter routing", async () => {
    const result = await importCardPackFromSource(createCardObjectSource({ profession: {} }), { mode: "dryRun" })

    expect(result).toMatchObject({
      success: false,
      stage: "externalContractGuard",
      diagnostics: [expect.objectContaining({ code: "INVALID_TYPE", path: "/profession" })],
    })
    expect(result.diagnostics).not.toContainEqual(expect.objectContaining({ code: "LEGACY_FORMAT_ASSUMED" }))
  })
})
