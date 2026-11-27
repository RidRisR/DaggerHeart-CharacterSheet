import { describe, expect, it, vi } from "vitest"
import type { ArchiveImportOutcome } from "@/content-packs/archive/types"
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
    expect(result.results[0]).toMatchObject({
      kind: "equipment",
      success: true,
    })
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
    expect(result.results[0]).toMatchObject({
      kind: "card",
      success: true,
      summary: "导入 1 张卡牌",
    })
    expect(result.nextTab).toBe("cards")
  })

  it("routes v1 card pack JSON to the card importer by top-level format", async () => {
    const cardImporter = vi.fn(async () => ({
      success: true,
      imported: 1,
      errors: [],
      batchId: "batch-1",
    }))
    const pack = {
      format: "daggerheart.card-pack.v1",
      domains: [
        {
          id: "card-1",
          name: "测试",
          domain: "测试",
          description: "",
          level: 1,
          trait: "测试",
          recallCost: 0,
        },
      ],
    }

    const result = await importContentPackFiles([jsonFile("cards-v1.json", pack)], {
      importEquipmentFile: vi.fn(),
      importCardJson: cardImporter,
      importDhcb: vi.fn(),
    })

    expect(cardImporter).toHaveBeenCalledWith(pack, "cards-v1.json")
    expect(result.results[0]).toMatchObject({
      kind: "card",
      success: true,
      summary: "导入 1 张卡牌",
    })
    expect(result.nextTab).toBe("cards")
  })

  it("routes DHCB and ZIP files to the DHCB importer", async () => {
    const dhcbImporter = vi.fn(async () => ({
      batchId: "batch-1",
      totalCards: 2,
      imageCount: 1,
      validationErrors: [],
    }))

    const result = await importContentPackFiles([new File(["dhcb"], "cards.dhcb"), new File(["zip"], "cards.zip")], {
      importEquipmentFile: vi.fn(),
      importCardJson: vi.fn(),
      importDhcb: dhcbImporter,
    })

    expect(dhcbImporter).toHaveBeenCalledTimes(2)
    expect(result.results).toEqual([
      expect.objectContaining({
        fileName: "cards.dhcb",
        kind: "card",
        success: true,
      }),
      expect.objectContaining({
        fileName: "cards.zip",
        kind: "card",
        success: true,
      }),
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

  it("maps structured card import diagnostics to card-ordered localized user messages", async () => {
    const result = await importContentPackFiles(
      [
        jsonFile("cards.json", {
          profession: [{ id: "blood-hunter", name: "血猎人" }],
          domain: [
            { id: "safe-1", name: "安全卡" },
            { id: "safe-2", name: "安全卡 2" },
            { id: "safe-3", name: "安全卡 3" },
            { id: "blood-pact", name: "血之契约" },
            { id: "hunt-instinct", name: "猎杀本能" },
          ],
        }),
      ],
      {
        importEquipmentFile: vi.fn(),
        importCardJson: vi.fn(async () => ({
          success: false as const,
          mode: "commit" as const,
          stage: "conflictCheck" as const,
          summary: {
            cardCount: 6,
            imageCount: 0,
            warningCount: 1,
            errorCount: 3,
          },
          diagnostics: [
            {
              severity: "warning" as const,
              code: "LEGACY_FORMAT_ASSUMED" as const,
              path: "",
              message: "No format field; using legacy card format.",
            },
            {
              severity: "error" as const,
              code: "TEMPLATE_ID_CONFLICT" as const,
              path: "/classes/0/id",
              message: "Template id conflicts with imported card content.",
              value: { id: "blood-hunter", conflictSource: "custom" },
            },
            {
              severity: "error" as const,
              code: "TEMPLATE_ID_CONFLICT" as const,
              path: "/domains/3/id",
              message: "Template id conflicts with imported card content.",
              value: { id: "blood-pact", conflictSource: "custom" },
            },
            {
              severity: "error" as const,
              code: "MISSING_FIELD" as const,
              path: "/domains/4/description",
              message: "Required property is missing.",
            },
          ],
        })),
        importDhcb: vi.fn(),
      },
    )

    expect(result.results[0]).toMatchObject({
      kind: "card",
      success: false,
      summary: "卡牌包导入失败：发现 3 个阻碍导入的问题，1 个提醒",
      diagnostics: [
        {
          severity: "error",
          message: "血猎人：卡牌 ID 已存在",
          path: "职业 / 第 1 张 / id",
          value: { id: "blood-hunter", conflictSource: "custom" },
        },
        {
          severity: "error",
          message: "血之契约：卡牌 ID 已存在",
          path: "领域 / 第 4 张 / id",
          value: { id: "blood-pact", conflictSource: "custom" },
        },
        {
          severity: "error",
          message: "猎杀本能：缺少必填字段",
          path: "领域 / 第 5 张 / 描述",
        },
        {
          severity: "warning",
          message: "未声明文件格式，已按旧版卡牌包格式读取",
          path: "",
        },
      ],
    })
  })

  it("keeps legacy card import error messages as localized fallback diagnostics", async () => {
    const result = await importContentPackFiles([jsonFile("cards.json", { profession: [{ id: "bad" }] })], {
      importEquipmentFile: vi.fn(),
      importCardJson: vi.fn(async () => ({
        success: false,
        imported: 0,
        errors: ["card raw error"],
        batchId: undefined,
      })),
      importDhcb: vi.fn(),
    })

    expect(result.results[0]).toMatchObject({
      kind: "card",
      success: false,
      summary: "卡牌包导入失败：发现 1 个阻碍导入的问题",
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
        jsonFile("variant-types.json", {
          variantTypes: { relic: { subclasses: [] } },
        }),
      ],
      {
        importEquipmentFile: vi.fn(),
        importCardJson: cardImporter,
        importDhcb: vi.fn(),
      },
    )

    expect(cardImporter).not.toHaveBeenCalled()
    expect(result.results).toEqual([
      expect.objectContaining({
        kind: "unknown",
        success: false,
        summary: "无法识别内容包类型",
      }),
      expect.objectContaining({
        kind: "unknown",
        success: false,
        summary: "无法识别内容包类型",
      }),
    ])
  })

  it("keeps processing files after one file fails", async () => {
    const bad = new File(["{"], "bad.json", { type: "application/json" })
    const good = jsonFile("equipment.json", {
      format: "daggerheart.equipment-pack.v1",
    })

    const result = await importContentPackFiles([bad, good], {
      importEquipmentFile: vi.fn(async () => ({
        success: true,
        summary: { weaponCount: 1, armorCount: 0 },
        diagnostics: [],
      })),
      importCardJson: vi.fn(),
      importDhcb: vi.fn(),
    })

    expect(result.results).toHaveLength(2)
    expect(result.aggregateStatus).toBe("partialFailure")
    expect(result.nextTab).toBe("equipment")
  })

  it("routes multi-pack zip archive imports to groups tab on success", async () => {
    const result = await importContentPackFiles([new File(["zip"], "campaign.zip")], {
      importEquipmentFile: vi.fn(),
      importCardJson: vi.fn(),
      importDhcb: vi.fn(),
      importZipArchive: vi.fn(async () => ({
        kind: "archive" as const,
        archiveName: "campaign.zip",
        success: true,
        blockedByPreflight: false,
        group: {
          groupId: "group_1",
          name: "campaign",
          sourceFileName: "campaign.zip",
          importedAt: "2026-11-28T00:00:00.000Z",
          members: [
            { kind: "card" as const, packId: "batch_1" },
            { kind: "equipment" as const, packId: "equip_1" },
          ],
        },
        entryResults: [
          {
            archivePath: "cards/a.json",
            kind: "card" as const,
            success: true,
            packId: "batch_1",
            cardCount: 3,
            diagnostics: [],
          },
          {
            archivePath: "equip/b.json",
            kind: "equipment" as const,
            success: true,
            packId: "equip_1",
            weaponCount: 2,
            armorCount: 1,
            diagnostics: [],
          },
        ],
        ignoredFiles: ["README.txt"],
      })),
    })

    expect(result.aggregateStatus).toBe("success")
    expect(result.nextTab).toBe("groups")
    expect(result.results[0]).toMatchObject({
      kind: "archive",
      success: true,
      fileName: "campaign.zip",
    })
    expect(result.results[0].summary).toContain("已导入整合包「campaign」")
    expect(result.results[1]).toMatchObject({
      fileName: "campaign.zip / cards/a.json",
      kind: "card",
      success: true,
    })
  })

  it("returns only failing entries and an archive summary when archive preflight blocks import", async () => {
    const result = await importContentPackFiles([new File(["zip"], "bad-campaign.zip")], {
      importEquipmentFile: vi.fn(),
      importCardJson: vi.fn(),
      importDhcb: vi.fn(),
      importZipArchive: vi.fn(
        async (): Promise<ArchiveImportOutcome> => ({
          kind: "archive",
          archiveName: "bad-campaign.zip",
          success: false,
          blockedByPreflight: true,
          entryResults: [
            {
              archivePath: "good.json",
              kind: "equipment",
              success: true,
              weaponCount: 1,
              armorCount: 0,
              diagnostics: [],
            },
            {
              archivePath: "bad.json",
              kind: "unknown",
              success: false,
              diagnostics: [
                {
                  severity: "error",
                  code: "INVALID_JSON",
                  path: "",
                  message: "文件不是有效的 JSON。请检查 JSON 语法",
                },
              ],
            },
          ],
          ignoredFiles: [],
        }),
      ),
    })

    expect(result.aggregateStatus).toBe("failed")
    expect(result.results).toHaveLength(2)
    expect(result.results.every((item) => !item.success)).toBe(true)
    expect(result.results[0].kind).toBe("archive")
    expect(result.results[1].fileName).toBe("bad-campaign.zip / bad.json")
  })
})
