import { describe, expect, it } from "vitest"
import armorTierOneTwo from "@/equipment/import/samples/srd-armor-tier-1-2.json"
import combatWheelchairs from "@/equipment/import/samples/srd-combat-wheelchairs.json"
import invalidDuplicateTemplateId from "@/equipment/import/samples/invalid-duplicate-template-id.json"
import invalidExtraField from "@/equipment/import/samples/invalid-extra-field.json"
import invalidThresholdOrder from "@/equipment/import/samples/invalid-threshold-order.json"
import invalidUnknownZhAlias from "@/equipment/import/samples/invalid-unknown-zh-alias.json"
import mixedWeaponsArmorStarterKit from "@/equipment/import/samples/mixed-weapons-armor-starter-kit.json"
import zhCnAuthoringSample from "@/equipment/import/samples/zh-cn-authoring-sample.json"
import zhCnMixedEquipmentPack from "@/equipment/import/samples/zh-cn-mixed-equipment-pack.json"
import { importEquipmentPackFromSource } from "@/equipment/import/import-pipeline"
import type {
  EquipmentPackImportDependencies,
  EquipmentPackImportErrorCode,
  EquipmentPackImportPipelineStage,
  EquipmentPackImportSource,
} from "@/equipment/import/types"

function createJsonSource(fileName: string, value: unknown): EquipmentPackImportSource {
  const text = JSON.stringify(value)

  return {
    origin: { kind: "file", fileName },
    async read() {
      return { kind: "jsonText", text }
    },
  }
}

function createDependencies(): EquipmentPackImportDependencies {
  return {
    conflictContext: {
      builtinTemplateIds: new Set(),
      importedTemplateIds: new Set(),
      customPackCount: 0,
      maxCustomPackCount: 50,
    },
  }
}

describe("equipment import SRD samples", () => {
  it.each([
    {
      fileName: "srd-combat-wheelchairs.json",
      sample: combatWheelchairs,
      expected: { weaponCount: 8, armorCount: 0 },
    },
    {
      fileName: "srd-armor-tier-1-2.json",
      sample: armorTierOneTwo,
      expected: { weaponCount: 0, armorCount: 14 },
    },
    {
      fileName: "zh-cn-authoring-sample.json",
      sample: zhCnAuthoringSample,
      expected: { weaponCount: 2, armorCount: 1 },
    },
    {
      fileName: "mixed-weapons-armor-starter-kit.json",
      sample: mixedWeaponsArmorStarterKit,
      expected: { weaponCount: 3, armorCount: 2 },
    },
    {
      fileName: "zh-cn-mixed-equipment-pack.json",
      sample: zhCnMixedEquipmentPack,
      expected: { weaponCount: 3, armorCount: 2 },
    },
  ])("dry-runs $fileName to stageImportData", async ({ fileName, sample, expected }) => {
    const dependencies = createDependencies()

    const result = await importEquipmentPackFromSource(
      createJsonSource(fileName, sample),
      { mode: "dryRun" },
      dependencies,
    )

    expect(result).toMatchObject({
      success: true,
      stage: "stageImportData",
      mode: "dryRun",
      summary: {
        packId: undefined,
        ...expected,
        warningCount: 0,
        errorCount: 0,
      },
      diagnostics: [],
    })
    expect(result.stage).not.toBe("stageCommitData")
    expect(result.stage).not.toBe("registryRebuild")
    expect(result.draft?.packData.metadata.name).toBe(sample.name)
    expect(result.draft?.templateIds.length).toBe(expected.weaponCount + expected.armorCount)
  })

  it("normalizes zh-CN enum aliases from the Chinese authoring sample", async () => {
    const dependencies = createDependencies()

    const result = await importEquipmentPackFromSource(
      createJsonSource("zh-cn-authoring-sample.json", zhCnAuthoringSample),
      { mode: "commit" },
      dependencies,
    )

    expect(result).toMatchObject({
      success: true,
      stage: "stageImportData",
      mode: "commit",
      summary: { packId: undefined, weaponCount: 2, armorCount: 1, warningCount: 0, errorCount: 0 },
    })
    expect(result.stage).not.toBe("stageCommitData")
    expect(result.stage).not.toBe("registryRebuild")
    expect(result.draft?.packData.weapons).toEqual([
      expect.objectContaining({
        name: "影刃",
        trait: "agility",
        damageType: "physical",
        range: "melee",
        burden: "oneHanded",
      }),
      expect.objectContaining({
        name: "星火杖",
        trait: "knowledge",
        damageType: "magic",
        range: "far",
        burden: "twoHanded",
      }),
    ])
    expect(result.draft?.packData.armor[0]).toMatchObject({
      name: "影织甲",
      modifierContributions: [
        expect.objectContaining({
          definition: { target: "evasion", kind: "modifier" },
          editable: { label: "轻盈", value: 1 },
        }),
      ],
    })
    expect(result.draft?.templateIds).toHaveLength(3)
  })

  it.each([
    {
      fileName: "invalid-unknown-zh-alias.json",
      sample: invalidUnknownZhAlias,
      stage: "authoringPreprocess",
      codes: ["INVALID_ENUM", "INVALID_ENUM", "INVALID_ENUM", "INVALID_ENUM"],
      paths: [
        "/equipment/weapons/0/trait",
        "/equipment/weapons/0/damageType",
        "/equipment/weapons/0/range",
        "/equipment/weapons/0/burden",
      ],
    },
    {
      fileName: "invalid-extra-field.json",
      sample: invalidExtraField,
      stage: "structuralValidation",
      codes: ["UNKNOWN_FIELD"],
      paths: ["/equipment/weapons/0/rarity"],
    },
    {
      fileName: "invalid-duplicate-template-id.json",
      sample: invalidDuplicateTemplateId,
      stage: "semanticValidation",
      codes: ["DUPLICATE_ID"],
      paths: ["/equipment/armor/0/id"],
    },
    {
      fileName: "invalid-threshold-order.json",
      sample: invalidThresholdOrder,
      stage: "semanticValidation",
      codes: ["INVALID_THRESHOLD_ORDER"],
      paths: ["/equipment/armor/0/baseThresholds/major"],
    },
  ] satisfies Array<{
    fileName: string
    sample: unknown
    stage: EquipmentPackImportPipelineStage
    codes: EquipmentPackImportErrorCode[]
    paths: string[]
  }>)("dry-runs invalid sample $fileName to $stage", async ({ fileName, sample, stage, codes, paths }) => {
    const dependencies = createDependencies()

    const result = await importEquipmentPackFromSource(
      createJsonSource(fileName, sample),
      { mode: "dryRun" },
      dependencies,
    )

    expect(result).toMatchObject({
      success: false,
      stage,
      mode: "dryRun",
      summary: { errorCount: codes.length },
    })
    for (const [index, code] of codes.entries()) {
      expect(result.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            severity: "error",
            code,
            path: paths[index],
          }),
        ]),
      )
    }
  })
})
