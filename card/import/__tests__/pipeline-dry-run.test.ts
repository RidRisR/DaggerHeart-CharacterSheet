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
