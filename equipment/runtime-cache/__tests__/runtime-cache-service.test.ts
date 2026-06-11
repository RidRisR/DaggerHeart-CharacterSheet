import { describe, expect, it } from "vitest"
import { buildEquipmentRuntimeCacheView } from "../build-cache-view"
import { createEquipmentRuntimeCacheService } from "../runtime-cache-service"
import type { RuntimeEquipmentTemplate } from "../types"
import type { EquipmentPackStorageSnapshot } from "@/equipment/packs/storage-types"

function makeRuntimeWeapon(overrides: Partial<Extract<RuntimeEquipmentTemplate, { kind: "weapon" }>> = {}) {
  return {
    kind: "weapon" as const,
    id: "weapon:previous",
    name: "Previous",
    tier: "T1" as const,
    weaponType: "primary" as const,
    trait: "agility" as const,
    damageType: "physical" as const,
    range: "melee" as const,
    burden: "oneHanded" as const,
    damage: "d8",
    featureName: "",
    description: "",
    modifierContributions: [],
    ...overrides,
  }
}

function makeStorageSnapshot(): EquipmentPackStorageSnapshot {
  return {
    packs: new Map(),
    packCount: 0,
    integrity: {
      ok: true,
      repaired: false,
      issues: [],
      removedIndexEntries: [],
      removedOrphanPackKeys: [],
      removedCorruptedPackKeys: [],
    },
  }
}

describe("equipment runtime cache service", () => {
  it("replaces current view only after successful rebuild", () => {
    const service = createEquipmentRuntimeCacheService({
      initialView: buildEquipmentRuntimeCacheView({
        builtinTemplates: [makeRuntimeWeapon({ id: "weapon:previous" })],
        storageSnapshot: makeStorageSnapshot(),
      }),
    })

    const result = service.rebuild({
      builtinTemplates: [makeRuntimeWeapon({ id: "weapon:next" })],
      storageSnapshot: makeStorageSnapshot(),
    })

    expect(result.ok).toBe(true)
    expect(service.getCurrentView().templatesById.has("weapon:next")).toBe(true)
    expect(service.getCurrentView().templatesById.has("weapon:previous")).toBe(false)
  })

  it("keeps current view when rebuild fails", () => {
    const service = createEquipmentRuntimeCacheService({
      initialView: buildEquipmentRuntimeCacheView({
        builtinTemplates: [makeRuntimeWeapon({ id: "weapon:previous" })],
        storageSnapshot: makeStorageSnapshot(),
      }),
    })

    const result = service.rebuild({
      builtinTemplates: [
        makeRuntimeWeapon({ id: "weapon:dupe" }),
        makeRuntimeWeapon({ id: "weapon:dupe" }),
      ],
      storageSnapshot: makeStorageSnapshot(),
    })

    expect(result).toMatchObject({
      ok: false,
      diagnostic: expect.objectContaining({ code: "RUNTIME_CACHE_DUPLICATE_TEMPLATE_ID" }),
    })
    expect(service.getCurrentView().templatesById.has("weapon:previous")).toBe(true)
    expect(service.getCurrentView().templatesById.has("weapon:dupe")).toBe(false)
  })
})
