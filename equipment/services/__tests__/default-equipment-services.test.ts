import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import hopeFear from "@/data/equipment/builtin-hope-fear.json"
import { importEquipmentPackFromSource } from "@/equipment/import/import-pipeline"
import { HOPE_FEAR_EQUIPMENT_SOURCE_ID } from "@/equipment/packs/builtin-source-ids"
import { createWeaponSlotFromRuntimeTemplate } from "@/automation/equipment/template-to-slot"
import { createInMemoryEquipmentPackStorageAdapter } from "@/equipment/packs/local-storage-adapter"
import { createDefaultEquipmentServices } from "../default-equipment-services"

function collectTypeScriptFiles(targetPath: string): string[] {
  if (!existsSync(targetPath)) return []

  const stat = statSync(targetPath)
  if (stat.isFile()) return /\.(tsx?|mts|cts)$/.test(targetPath) ? [targetPath] : []

  return readdirSync(targetPath).flatMap((entry) => collectTypeScriptFiles(path.join(targetPath, entry)))
}

describe("default equipment services", () => {
  it("creates application and runtime cache services without requiring browser localStorage", () => {
    const services = createDefaultEquipmentServices({ storage: "memory" })

    expect(services.applicationService).toBeTruthy()
    expect(services.runtimeCacheService).toBeTruthy()
  })

  it("can use memory storage outside a browser", async () => {
    const services = createDefaultEquipmentServices({ storage: "memory" })
    const result = await services.applicationService.initialize()

    expect(result.snapshot.packCount).toBe(0)
  })

  it("validates the Hope and Fear equipment file and exposes it as an independent selectable pack", async () => {
    const validated = await importEquipmentPackFromSource({
      origin: { kind: "builtin" },
      read: async () => ({ kind: "parsedObject", value: hopeFear }),
    }, { mode: "dryRun" }, {})
    expect(validated).toMatchObject({ success: true, diagnostics: [], summary: { weaponCount: 124, armorCount: 35 } })

    const initialize = async () => {
      const services = createDefaultEquipmentServices({ storage: "memory" })
      expect((await services.applicationService.initialize()).success).toBe(true)
      return services
    }
    const { applicationService, runtimeCacheService } = await initialize()
    const sourceIds = [HOPE_FEAR_EQUIPMENT_SOURCE_ID]
    const reader = runtimeCacheService.getRuntimeReader()
    expect(runtimeCacheService.getManagementReader().getPackDetail(sourceIds[0])?.pack).toMatchObject({
      isSystemPack: true, disabled: false, weaponCount: 124, armorCount: 35,
    })
    const secondary = reader.querySelectableTemplates({ sourceIds, weaponTypes: ["secondary"] })
    expect(secondary).toHaveLength(36)
    expect(reader.querySelectableTemplates({ sourceIds, burdens: ["offHand"] })).toEqual(secondary)
    expect(reader.querySelectableTemplates({ sourceIds, searchText: "副手" })).toEqual(secondary)
    expect(reader.querySelectableTemplates({ sourceIds, searchText: "两用" })).toHaveLength(4)
    expect(reader.querySelectableTemplates({ sourceIds, traits: ["spellcast"] })).toHaveLength(4)
    for (const damageType of ["physical", "magic", "physicalOrMagic"] as const) {
      const [blade] = reader.querySelectableTemplates({ sourceIds, tiers: ["T1"], damageTypes: [damageType], searchText: "影刃" })
      expect(blade?.kind).toBe("weapon")
      if (blade.kind === "weapon") {
        expect(createWeaponSlotFromRuntimeTemplate(blade, (id) => id)).toMatchObject({ damage: "风度: d8", trait: "两用/单手/近战" })
      }
    }
    expect(reader.querySelectableTemplates({ sourceIds, searchText: "夹层甲", tiers: ["T1"] })[0]).toMatchObject({
      baseArmorMax: 3, baseThresholds: { minor: 6, major: 12 },
    })
    expect((await applicationService.setPackDisabled(sourceIds[0], true)).success).toBe(true)
    try {
      const reloaded = await initialize()
      const refreshed = reloaded.runtimeCacheService.getRuntimeReader()
      expect(refreshed.querySelectableTemplates({ sourceIds })).toHaveLength(0)
      expect(refreshed.querySelectableTemplates({ sourceIds: ["builtin"] }).length).toBeGreaterThan(0)
    } finally {
      await applicationService.setPackDisabled(sourceIds[0], false)
    }
  })

  it("accepts an injected storage adapter for tests and future composition roots", async () => {
    const services = createDefaultEquipmentServices({
      storage: "adapter",
      adapter: createInMemoryEquipmentPackStorageAdapter(),
    })
    const result = await services.applicationService.initialize()

    expect(result.snapshot.packCount).toBe(0)
  })
})

describe("equipment storage composition boundaries", () => {
  it("keeps UI and card editor equipment modules from directly importing storage implementations", () => {
    const root = process.cwd()
    const files = [
      path.join(root, "equipment/ui/equipment-ui-store.ts"),
      ...collectTypeScriptFiles(path.join(root, "app/card-editor/equipment")),
    ]
    const forbiddenPattern = /from\s+["'][^"']*(local-storage-adapter|local-storage-repository)["']/

    const offenders = files
      .map((file) => ({
        file: path.relative(root, file),
        source: readFileSync(file, "utf8"),
      }))
      .filter(({ source }) => forbiddenPattern.test(source))
      .map(({ file }) => file)

    expect(offenders).toEqual([])
  })
})
