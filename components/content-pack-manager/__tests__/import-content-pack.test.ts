import { describe, expect, it, vi } from "vitest"
import { importContentPackFiles } from "../import-content-pack"

function jsonFile(name: string, value: unknown) {
  return new File([JSON.stringify(value)], name, { type: "application/json" })
}

describe("importContentPackFiles", () => {
  it("routes equipment JSON by top-level format", async () => {
    const equipmentImporter = vi.fn(async () => ({
      success: true,
      summary: { weaponCount: 1, armorCount: 1 },
      diagnostics: [],
    }))

    const result = await importContentPackFiles(
      [
        jsonFile("equipment.json", {
          format: "daggerheart.equipment-pack.v1",
        }),
      ],
      {
        importEquipmentFile: equipmentImporter,
        importCardJson: vi.fn(),
        importDhcb: vi.fn(),
      },
    )

    expect(equipmentImporter).toHaveBeenCalledTimes(1)
    expect(result.results[0]).toMatchObject({ kind: "equipment", success: true })
    expect(result.nextTab).toBe("equipment")
  })

  it("fast-fails unknown JSON instead of sending it to card importer", async () => {
    const cardImporter = vi.fn()
    const result = await importContentPackFiles([jsonFile("unknown.json", { hello: "world" })], {
      importEquipmentFile: vi.fn(),
      importCardJson: cardImporter,
      importDhcb: vi.fn(),
    })

    expect(cardImporter).not.toHaveBeenCalled()
    expect(result.results[0]).toMatchObject({
      kind: "unknown",
      success: false,
      summary: "无法识别内容包类型",
    })
  })

  it("routes supported card JSON to the card importer", async () => {
    const cardImporter = vi.fn(async () => ({
      success: true,
      imported: 1,
      errors: [],
      batchId: "batch-1",
    }))
    const pack = {
      name: "cards",
      profession: [{ id: "card-1", name: "战士" }],
    }

    const result = await importContentPackFiles([jsonFile("cards.json", pack)], {
      importEquipmentFile: vi.fn(),
      importCardJson: cardImporter,
      importDhcb: vi.fn(),
    })

    expect(cardImporter).toHaveBeenCalledWith(pack, "cards.json")
    expect(result.results[0]).toMatchObject({ kind: "card", success: true, summary: "导入 1 张卡牌" })
    expect(result.nextTab).toBe("cards")
  })

  it("routes DHCB and ZIP files to the DHCB importer", async () => {
    const dhcbImporter = vi.fn(async () => ({
      batchId: "batch-1",
      totalCards: 2,
      imageCount: 1,
      validationErrors: [],
    }))

    const result = await importContentPackFiles(
      [
        new File(["dhcb"], "cards.dhcb"),
        new File(["zip"], "cards.zip"),
      ],
      {
        importEquipmentFile: vi.fn(),
        importCardJson: vi.fn(),
        importDhcb: dhcbImporter,
      },
    )

    expect(dhcbImporter).toHaveBeenCalledTimes(2)
    expect(result.results).toEqual([
      expect.objectContaining({ fileName: "cards.dhcb", kind: "card", success: true }),
      expect.objectContaining({ fileName: "cards.zip", kind: "card", success: true }),
    ])
  })

  it("maps failed equipment importer diagnostics with localized copy and counts", async () => {
    const result = await importContentPackFiles(
      [jsonFile("equipment.json", { format: "daggerheart.equipment-pack.v1" })],
      {
        importEquipmentFile: vi.fn(async () => ({
          success: false,
          summary: { weaponCount: 0, armorCount: 0 },
          diagnostics: [
            {
              severity: "error" as const,
              code: "INVALID_JSON" as const,
              path: "/metadata",
              message: "Invalid JSON.",
              value: { format: "bad" },
            },
            {
              severity: "warning" as const,
              code: "DESCRIPTION_LONG" as const,
              path: "/description",
              message: "Description is long.",
            },
          ],
        })),
        importCardJson: vi.fn(),
        importDhcb: vi.fn(),
      },
    )

    expect(result.results[0]).toMatchObject({
      kind: "equipment",
      success: false,
      summary: "装备包导入失败：发现 1 个错误和 1 个警告",
      diagnostics: [
        {
          severity: "error",
          code: "INVALID_JSON",
          path: "/metadata",
          message: "文件不是有效的 JSON。请修复 JSON 语法",
          value: { format: "bad" },
        },
        {
          severity: "warning",
          code: "DESCRIPTION_LONG",
          path: "/description",
          message: "描述内容较长，可能影响阅读体验。建议精简描述内容",
        },
      ],
    })
  })

  it("keeps card import error messages unchanged", async () => {
    const result = await importContentPackFiles(
      [jsonFile("cards.json", { profession: [{ id: "bad" }] })],
      {
        importEquipmentFile: vi.fn(),
        importCardJson: vi.fn(async () => ({
          success: false,
          imported: 0,
          errors: ["card raw error"],
          batchId: undefined,
        })),
        importDhcb: vi.fn(),
      },
    )

    expect(result.results[0]).toMatchObject({
      kind: "card",
      success: false,
      summary: "卡牌包导入失败",
      diagnostics: [{ message: "card raw error" }],
    })
  })

  it("summarizes failed equipment imports without warnings", async () => {
    const result = await importContentPackFiles(
      [jsonFile("equipment.json", { format: "daggerheart.equipment-pack.v1" })],
      {
        importEquipmentFile: vi.fn(async () => ({
          success: false,
          summary: { weaponCount: 0, armorCount: 0 },
          diagnostics: [
            {
              severity: "error" as const,
              code: "INVALID_JSON" as const,
              path: "",
              message: "Invalid JSON.",
            },
          ],
        })),
        importCardJson: vi.fn(),
        importDhcb: vi.fn(),
      },
    )

    expect(result.results[0]).toMatchObject({
      kind: "equipment",
      success: false,
      summary: "装备包导入失败：发现 1 个错误",
    })
  })

  it("does not route top-level cards or top-level variantTypes to the card importer", async () => {
    const cardImporter = vi.fn()

    const result = await importContentPackFiles(
      [
        jsonFile("cards-array.json", { cards: [{ id: "card-1" }] }),
        jsonFile("variant-types.json", { variantTypes: { relic: { subclasses: [] } } }),
      ],
      {
        importEquipmentFile: vi.fn(),
        importCardJson: cardImporter,
        importDhcb: vi.fn(),
      },
    )

    expect(cardImporter).not.toHaveBeenCalled()
    expect(result.results).toEqual([
      expect.objectContaining({ kind: "unknown", success: false, summary: "无法识别内容包类型" }),
      expect.objectContaining({ kind: "unknown", success: false, summary: "无法识别内容包类型" }),
    ])
  })

  it("keeps processing files after one file fails", async () => {
    const bad = new File(["{"], "bad.json", { type: "application/json" })
    const good = jsonFile("equipment.json", { format: "daggerheart.equipment-pack.v1" })

    const result = await importContentPackFiles([bad, good], {
      importEquipmentFile: vi.fn(async () => ({ success: true, summary: { weaponCount: 1, armorCount: 0 }, diagnostics: [] })),
      importCardJson: vi.fn(),
      importDhcb: vi.fn(),
    })

    expect(result.results).toHaveLength(2)
    expect(result.aggregateStatus).toBe("partialFailure")
    expect(result.nextTab).toBe("equipment")
  })
})
