import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
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
