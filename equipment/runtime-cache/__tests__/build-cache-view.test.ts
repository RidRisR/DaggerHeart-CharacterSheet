import { describe, expect, it } from "vitest"
import { buildEquipmentRuntimeCacheView, tryBuildEquipmentRuntimeCacheView } from "../build-cache-view"
import type { RuntimeEquipmentTemplate } from "../types"
import type { EquipmentPackSnapshotEntry, EquipmentPackStorageSnapshot } from "@/equipment/packs/storage-types"

function makeRuntimeWeapon(overrides: Partial<Extract<RuntimeEquipmentTemplate, { kind: "weapon" }>> = {}) {
  return {
    kind: "weapon" as const,
    id: "weapon:shortsword",
    name: "Shortsword",
    tier: "T1" as const,
    weaponType: "primary" as const,
    trait: "agility" as const,
    damageType: "physical" as const,
    range: "melee" as const,
    burden: "oneHanded" as const,
    damage: "d8",
    featureName: "Reliable",
    description: "Attack rolls gain +1.",
    modifierContributions: [],
    ...overrides,
  }
}

function makeRuntimeArmor(overrides: Partial<Extract<RuntimeEquipmentTemplate, { kind: "armor" }>> = {}) {
  return {
    kind: "armor" as const,
    id: "armor:chainmail",
    name: "Chainmail",
    tier: "T1" as const,
    baseArmorMax: 4,
    baseThresholds: { minor: 7, major: 15 },
    featureName: "Heavy",
    description: "Evasion -1.",
    modifierContributions: [],
    ...overrides,
  }
}

function makeSnapshotEntry(
  overrides: Partial<EquipmentPackSnapshotEntry> & { weaponIds?: string[]; armorIds?: string[] } = {},
): EquipmentPackSnapshotEntry {
  const { weaponIds = ["weapon:shadow"], armorIds = [], ...entryOverrides } = overrides

  return {
    packId: "pack_shadow",
    importedAt: "2026-06-04T10:20:30.000Z",
    disabled: false,
    source: { originKind: "file", fileName: "shadow.json" },
    pack: {
      metadata: {
        format: "daggerheart.equipment-pack.v1",
        name: "Shadow Equipment",
        version: "1.0.0",
        author: "Tester",
        description: "A shadow equipment pack.",
      },
      weapons: weaponIds.map((id) => ({
        id,
        name: `Weapon ${id}`,
        tier: "T1" as const,
        weaponType: "primary" as const,
        trait: "finesse" as const,
        damageType: "physical" as const,
        range: "melee" as const,
        burden: "oneHanded" as const,
        damage: "d8",
        featureName: "Shadow",
        description: "A shadow weapon.",
        modifierContributions: [],
      })),
      armor: armorIds.map((id) => ({
        id,
        name: `Armor ${id}`,
        tier: "T1" as const,
        baseArmorMax: 4,
        baseThresholds: { minor: 7, major: 15 },
        featureName: "Shade",
        description: "Shadow armor.",
        modifierContributions: [],
      })),
    },
    ...entryOverrides,
  }
}

function makeStorageSnapshot(entries: EquipmentPackSnapshotEntry[]): EquipmentPackStorageSnapshot {
  return {
    packs: new Map(entries.map((entry) => [entry.packId, entry])),
    packCount: entries.length,
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

describe("equipment runtime cache view builder", () => {
  it("builds selectable built-in templates from empty custom snapshot", () => {
    const view = buildEquipmentRuntimeCacheView({
      builtinTemplates: [
        makeRuntimeWeapon({ id: "weapon:shortsword" }),
        makeRuntimeArmor({ id: "armor:chainmail" }),
      ],
      storageSnapshot: makeStorageSnapshot([]),
    })

    expect(view.templatesById.has("weapon:shortsword")).toBe(true)
    expect(view.templatesById.has("armor:chainmail")).toBe(true)
    expect(view.queryIndexes.selectableTemplateIds).toEqual(["weapon:shortsword", "armor:chainmail"])
    expect(view.relationIndexes.templateToPackId.get("weapon:shortsword")).toBe("builtin")
    expect(view.relationIndexes.templateToPackId.get("armor:chainmail")).toBe("builtin")
    expect(view.packsById.get("builtin")).toMatchObject({
      packId: "builtin",
      name: "系统内置装备",
      disabled: false,
      isSystemPack: true,
      weaponCount: 1,
      armorCount: 1,
    })
  })

  it("fails when a stored pack tries to use the reserved builtin pack id", () => {
    const result = tryBuildEquipmentRuntimeCacheView({
      builtinTemplates: [makeRuntimeWeapon({ id: "weapon:builtin" })],
      storageSnapshot: makeStorageSnapshot([
        makeSnapshotEntry({ packId: "builtin", weaponIds: ["weapon:stored-builtin"] }),
      ]),
    })

    expect(result.ok).toBe(false)
    expect(!result.ok && result.diagnostic).toMatchObject({
      code: "RUNTIME_CACHE_RESERVED_PACK_ID",
      path: "/packs/builtin",
      value: "builtin",
    })
  })

  it("fails reserved builtin pack id even when no built-in templates are present", () => {
    const result = tryBuildEquipmentRuntimeCacheView({
      builtinTemplates: [],
      storageSnapshot: makeStorageSnapshot([
        makeSnapshotEntry({ packId: "builtin", weaponIds: ["weapon:stored-builtin"] }),
      ]),
    })

    expect(result.ok).toBe(false)
    expect(!result.ok && result.diagnostic.code).toBe("RUNTIME_CACHE_RESERVED_PACK_ID")
  })

  it("keeps disabled pack templates in entity cache but excludes them from selectable ids and query indexes", () => {
    const view = buildEquipmentRuntimeCacheView({
      builtinTemplates: [],
      storageSnapshot: makeStorageSnapshot([
        makeSnapshotEntry({ packId: "pack_disabled", disabled: true, weaponIds: ["weapon:shadow"] }),
      ]),
    })

    expect(view.templatesById.has("weapon:shadow")).toBe(true)
    expect(view.relationIndexes.templateToPackId.get("weapon:shadow")).toBe("pack_disabled")
    expect(view.relationIndexes.packToTemplateIds.get("pack_disabled")).toEqual(["weapon:shadow"])
    expect(view.queryIndexes.templateIdsBySource.get("pack_disabled")).toBeUndefined()
    expect(view.queryIndexes.weaponTemplateIds).toEqual([])
    expect(view.queryIndexes.selectableTemplateIds).toEqual([])
  })

  it("fails on duplicate template id", () => {
    const result = tryBuildEquipmentRuntimeCacheView({
      builtinTemplates: [makeRuntimeWeapon({ id: "weapon:dupe" })],
      storageSnapshot: makeStorageSnapshot([
        makeSnapshotEntry({ packId: "pack_custom", disabled: false, weaponIds: ["weapon:dupe"] }),
      ]),
    })

    expect(result.ok).toBe(false)
    expect(!result.ok && result.diagnostic.code).toBe("RUNTIME_CACHE_DUPLICATE_TEMPLATE_ID")
  })

  it("sorts custom packs by importedAt then packId and keeps weapons before armor in file order", () => {
    const view = buildEquipmentRuntimeCacheView({
      builtinTemplates: [makeRuntimeWeapon({ id: "weapon:builtin" })],
      storageSnapshot: makeStorageSnapshot([
        makeSnapshotEntry({
          packId: "pack_b",
          importedAt: "2026-06-04T10:20:31.000Z",
          weaponIds: ["weapon:b1", "weapon:b2"],
          armorIds: ["armor:b1"],
        }),
        makeSnapshotEntry({
          packId: "pack_a",
          importedAt: "2026-06-04T10:20:30.000Z",
          weaponIds: ["weapon:a1"],
          armorIds: ["armor:a1", "armor:a2"],
        }),
        makeSnapshotEntry({
          packId: "pack_c",
          importedAt: "2026-06-04T10:20:31.000Z",
          weaponIds: ["weapon:c1"],
        }),
      ]),
    })

    expect(view.queryIndexes.selectableTemplateIds).toEqual([
      "weapon:builtin",
      "weapon:a1",
      "armor:a1",
      "armor:a2",
      "weapon:b1",
      "weapon:b2",
      "armor:b1",
      "weapon:c1",
    ])
  })
})
