import { describe, expect, it, vi } from "vitest"
import { importEquipmentPackFromSource } from "@/equipment/import/import-pipeline"
import type { EquipmentPackImportDependencies, EquipmentPackImportSource } from "@/equipment/import/types"

const validWeaponPack = {
  format: "daggerheart.equipment-pack.v1",
  name: "暗影装备包",
  version: "1.0.0",
  author: "测试作者",
  description: "用于测试导入流程的装备包。",
  equipment: {
    weapons: [
      {
        id: "暗影装备包-测试作者-weapon-影刃",
        name: "影刃",
        tier: "T1",
        weaponType: "primary",
        trait: "agility",
        damageType: "physical",
        range: "melee",
        burden: "oneHanded",
        damage: "d8",
        featureName: "暗影",
        description: "在阴影中闪烁。",
      },
    ],
  },
}

const validMixedPack = {
  ...validWeaponPack,
  equipment: {
    weapons: validWeaponPack.equipment.weapons,
    armor: [
      {
        id: "暗影装备包-测试作者-armor-影甲",
        name: "影甲",
        tier: "T1",
        baseArmorMax: 4,
        baseThresholds: { minor: 7, major: 15 },
        featureName: "影护",
        description: "影子凝成的护甲。",
      },
    ],
  },
}

function createObjectSource(value: unknown, sizeBytes?: number): EquipmentPackImportSource {
  return {
    origin: { kind: "object", label: "test object" },
    async read() {
      return { kind: "parsedObject", value, sizeBytes }
    },
  }
}

function createJsonSource(text: string, sizeBytes?: number): EquipmentPackImportSource {
  return {
    origin: { kind: "file", fileName: "pack.json" },
    async read() {
      return { kind: "jsonText", text, sizeBytes }
    },
  }
}

function createBuiltinSource(value: unknown, sizeBytes?: number): EquipmentPackImportSource {
  return {
    origin: { kind: "builtin", label: "builtin fixture" },
    async read() {
      return { kind: "parsedObject", value, sizeBytes }
    },
  }
}

function createDependencies(
  overrides: Partial<EquipmentPackImportDependencies> = {},
): EquipmentPackImportDependencies {
  return {
    conflictContext: {
      builtinTemplateIds: new Set(),
      importedTemplateIds: new Set(),
      customPackCount: 0,
      maxCustomPackCount: 50,
    },
    ...overrides,
  }
}

describe("equipment pack dry run pipeline", () => {
  it("runs valid object source to staged import data without final pack id", async () => {
    const dependencies = createDependencies()

    const result = await importEquipmentPackFromSource(
      createObjectSource(validWeaponPack),
      { mode: "dryRun" },
      dependencies,
    )

    expect(result).toMatchObject({
      success: true,
      stage: "stageImportData",
      mode: "dryRun",
      summary: {
        packId: undefined,
        name: "暗影装备包",
        version: "1.0.0",
        author: "测试作者",
        weaponCount: 1,
        armorCount: 0,
        warningCount: 0,
        errorCount: 0,
      },
      diagnostics: [],
    })
    expect(result.stage).not.toBe("stageCommitData")
    expect(result.stage).not.toBe("registryRebuild")
    expect(result.draft).toMatchObject({
      packData: {
        metadata: expect.objectContaining({ name: "暗影装备包" }),
      },
      templateIds: ["暗影装备包-测试作者-weapon-影刃"],
      source: {
        originKind: "object",
        label: "test object",
      },
    })
  })

  it("defaults mode to commit while still stopping at staged import data", async () => {
    const dependencies = createDependencies()

    const result = await importEquipmentPackFromSource(createObjectSource(validWeaponPack), {}, dependencies)

    expect(result).toMatchObject({
      success: true,
      stage: "stageImportData",
      mode: "commit",
      summary: { packId: undefined },
    })
    expect(result.draft?.packData.metadata.name).toBe("暗影装备包")
  })

  it("stops explicit commit mode at staged import data", async () => {
    const dependencies = createDependencies()
    const jsonText = JSON.stringify(validMixedPack)
    const actualSizeBytes = new TextEncoder().encode(jsonText).byteLength

    const result = await importEquipmentPackFromSource(
      createJsonSource(jsonText, 1),
      { mode: "commit" },
      dependencies,
    )

    expect(result).toMatchObject({
      success: true,
      stage: "stageImportData",
      mode: "commit",
      summary: { packId: undefined },
    })
    expect(result.stage).not.toBe("stageCommitData")
    expect(result.stage).not.toBe("registryRebuild")
    expect(result.draft).toMatchObject({
      packData: {
        metadata: {
          format: "daggerheart.equipment-pack.v1",
          name: "暗影装备包",
          version: "1.0.0",
          author: "测试作者",
          description: "用于测试导入流程的装备包。",
        },
        weapons: [expect.objectContaining({ id: "暗影装备包-测试作者-weapon-影刃" })],
        armor: [expect.objectContaining({ id: "暗影装备包-测试作者-armor-影甲" })],
      },
      templateIds: ["暗影装备包-测试作者-weapon-影刃", "暗影装备包-测试作者-armor-影甲"],
      source: {
        originKind: "file",
        fileName: "pack.json",
        sizeBytes: actualSizeBytes,
      },
    })
  })

  it("requires conflict context in commit mode", async () => {
    const read = vi.fn(async () => ({ kind: "parsedObject" as const, value: validWeaponPack }))
    const source: EquipmentPackImportSource = {
      origin: { kind: "object", label: "test object" },
      read,
    }

    await expect(
      importEquipmentPackFromSource(source, { mode: "commit" }, {}),
    ).rejects.toThrow("Equipment commit import requires conflict context.")
    expect(read).not.toHaveBeenCalled()
  })

  it("allows missing conflict context in dryRun mode", async () => {
    const result = await importEquipmentPackFromSource(
      createObjectSource(validWeaponPack),
      { mode: "dryRun" },
      {},
    )

    expect(result).toMatchObject({
      success: true,
      stage: "stageImportData",
      mode: "dryRun",
    })
  })

  it("stops at sourceRead for source failures and large files", async () => {
    const dependencies = createDependencies()
    const source: EquipmentPackImportSource = {
      origin: { kind: "file", fileName: "broken.json" },
      async read() {
        throw new Error("read failed")
      },
    }

    const readFailure = await importEquipmentPackFromSource(source, { mode: "dryRun" }, dependencies)
    const largeFile = await importEquipmentPackFromSource(
      createJsonSource("{}", 500 * 1024 + 1),
      { mode: "dryRun" },
      dependencies,
    )

    expect(readFailure).toMatchObject({
      success: false,
      stage: "sourceRead",
      diagnostics: [expect.objectContaining({ code: "SOURCE_READ_FAILED", path: "" })],
    })
    expect(largeFile).toMatchObject({
      success: false,
      stage: "sourceRead",
      diagnostics: [expect.objectContaining({ code: "FILE_TOO_LARGE", path: "" })],
    })
  })

  it("uses actual jsonText byte size for sourceRead gate when declared size is smaller", async () => {
    const oversizedJsonText = JSON.stringify({ filler: "x".repeat(500 * 1024 + 1) })

    const result = await importEquipmentPackFromSource(
      createJsonSource(oversizedJsonText, 1),
      { mode: "dryRun" },
      createDependencies(),
    )

    expect(result).toMatchObject({
      success: false,
      stage: "sourceRead",
      diagnostics: [
        expect.objectContaining({
          code: "FILE_TOO_LARGE",
          path: "",
          value: expect.objectContaining({
            sizeBytes: new TextEncoder().encode(oversizedJsonText).byteLength,
          }),
        }),
      ],
    })
  })

  it("does not apply the user-file size gate to builtin sources", async () => {
    const dependencies = createDependencies()

    const result = await importEquipmentPackFromSource(
      createBuiltinSource(validWeaponPack, 500 * 1024 + 1),
      { mode: "dryRun" },
      dependencies,
    )

    expect(result).toMatchObject({ success: true, stage: "stageImportData" })
  })

  it("stops at jsonParse for invalid JSON text", async () => {
    const result = await importEquipmentPackFromSource(
      createJsonSource("{ invalid"),
      { mode: "dryRun" },
      createDependencies(),
    )

    expect(result).toMatchObject({
      success: false,
      stage: "jsonParse",
      diagnostics: [expect.objectContaining({ code: "INVALID_JSON", path: "" })],
    })
  })

  it("stops at authoringPreprocess for unknown Chinese aliases", async () => {
    const pack = structuredClone(validWeaponPack) as Record<string, any>
    pack.equipment.weapons[0].trait = "敏捷力"

    const result = await importEquipmentPackFromSource(createObjectSource(pack), { mode: "dryRun" }, createDependencies())

    expect(result).toMatchObject({
      success: false,
      stage: "authoringPreprocess",
      diagnostics: [expect.objectContaining({ code: "INVALID_ENUM", path: "/equipment/weapons/0/trait" })],
    })
  })

  it("stops at structuralValidation for unknown English enum values", async () => {
    const pack = structuredClone(validWeaponPack) as Record<string, any>
    pack.equipment.weapons[0].trait = "fast"

    const result = await importEquipmentPackFromSource(createObjectSource(pack), { mode: "dryRun" }, createDependencies())

    expect(result).toMatchObject({
      success: false,
      stage: "structuralValidation",
      diagnostics: [expect.objectContaining({ code: "INVALID_ENUM", path: "/equipment/weapons/0/trait" })],
    })
  })

  it("stops at semanticValidation for empty equipment", async () => {
    const pack = { ...validWeaponPack, equipment: {} }

    const result = await importEquipmentPackFromSource(createObjectSource(pack), { mode: "dryRun" }, createDependencies())

    expect(result).toMatchObject({
      success: false,
      stage: "semanticValidation",
      diagnostics: [expect.objectContaining({ code: "EMPTY_EQUIPMENT", path: "/equipment" })],
    })
  })

  it("keeps missing optional descriptions successful without warnings", async () => {
    const dependencies = createDependencies()
    const pack = structuredClone(validWeaponPack) as Record<string, any>
    delete pack.description

    const result = await importEquipmentPackFromSource(createObjectSource(pack), { mode: "dryRun" }, dependencies)

    expect(result).toMatchObject({
      success: true,
      stage: "stageImportData",
      mode: "dryRun",
      summary: { warningCount: 0, errorCount: 0 },
    })
    expect(result.diagnostics).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "MISSING_DESCRIPTION" })]),
    )
  })

  it("does not return storage-aware conflict diagnostics in dryRun mode", async () => {
    const dependencies = createDependencies({
      conflictContext: {
        builtinTemplateIds: new Set(["暗影装备包-测试作者-weapon-影刃"]),
        importedTemplateIds: new Set(["暗影装备包-测试作者-weapon-影刃"]),
        customPackCount: 50,
        maxCustomPackCount: 50,
      },
    })
    const pack = structuredClone(validWeaponPack) as Record<string, any>
    delete pack.description

    const result = await importEquipmentPackFromSource(createObjectSource(pack), { mode: "dryRun" }, dependencies)

    expect(result).toMatchObject({
      success: true,
      stage: "stageImportData",
      mode: "dryRun",
      summary: { warningCount: 0, errorCount: 0 },
    })
    expect(result.diagnostics).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: expect.stringMatching(/^(ID_CONFLICT|PACK_LIMIT_EXCEEDED|TEMPLATE_LIMIT_EXCEEDED)$/),
        }),
      ]),
    )
    expect(result.diagnostics).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "MISSING_DESCRIPTION" })]),
    )
  })
})
