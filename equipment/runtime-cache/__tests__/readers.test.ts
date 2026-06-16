import { describe, expect, it } from "vitest"
import { buildEquipmentRuntimeCacheView } from "../build-cache-view"
import { createReadersFromView } from "../readers"
import type { RuntimeEquipmentTemplate } from "../types"
import type {
  EquipmentPackSnapshotEntry,
  EquipmentPackStorageSnapshot,
} from "@/equipment/packs/storage-types"

type TemplateWithSource = RuntimeEquipmentTemplate & { sourceId?: string }

function makeRuntimeWeapon(
  overrides: Partial<Extract<RuntimeEquipmentTemplate, { kind: "weapon" }> & { sourceId: string }>,
) {
  return {
    kind: "weapon" as const,
    id: "weapon:shadow-blade",
    name: "Shadow Blade",
    tier: "T2" as const,
    weaponType: "primary" as const,
    trait: "finesse" as const,
    damageType: "physical" as const,
    range: "melee" as const,
    burden: "oneHanded" as const,
    damage: "d8",
    featureName: "Silent",
    description: "A blade made from shadow.",
    modifierContributions: [],
    sourceId: "pack_shadow",
    ...overrides,
  }
}

function makeRuntimeArmor(
  overrides: Partial<Extract<RuntimeEquipmentTemplate, { kind: "armor" }> & { sourceId: string }>,
) {
  return {
    kind: "armor" as const,
    id: "armor:shadow",
    name: "Shadow Plate",
    tier: "T2" as const,
    baseArmorMax: 4,
    baseThresholds: { minor: 7, major: 15 },
    featureName: "Shade",
    description: "Armor made from shadow.",
    modifierContributions: [],
    sourceId: "pack_shadow",
    ...overrides,
  }
}

function templateToEntry(template: TemplateWithSource): EquipmentPackSnapshotEntry {
  const sourceId = template.sourceId ?? "pack_shadow"
  const importedAt =
    sourceId === "pack_shadow"
      ? "2026-06-04T10:20:30.000Z"
      : sourceId === "pack_other"
        ? "2026-06-04T10:20:31.000Z"
        : sourceId === "pack_enabled"
          ? "2026-06-04T10:20:32.000Z"
        : "2026-06-04T10:20:33.000Z"

  if (template.kind === "weapon") {
    const { kind, sourceId: _sourceId, ...weapon } = template

    return makeEntry(sourceId, importedAt, { weapons: [weapon], armor: [] })
  }

  const { kind, sourceId: _sourceId, ...armor } = template

  return makeEntry(sourceId, importedAt, { weapons: [], armor: [armor] })
}

function makeEntry(
  packId: string,
  importedAt: string,
  equipment: Pick<EquipmentPackSnapshotEntry["pack"], "weapons" | "armor">,
): EquipmentPackSnapshotEntry {
  return {
    packId,
    importedAt,
    disabled: packId === "pack_disabled",
    source: { originKind: "file", fileName: `${packId}.json` },
    pack: {
      metadata: {
        format: "daggerheart.equipment-pack.v1",
        name: packId,
        version: "1.0.0",
        author: "Tester",
        description: `${packId} description`,
      },
      ...equipment,
    },
  }
}

function makeStorageSnapshot(entries: EquipmentPackSnapshotEntry[]): EquipmentPackStorageSnapshot {
  const merged = new Map<string, EquipmentPackSnapshotEntry>()

  for (const entry of entries) {
    const existing = merged.get(entry.packId)
    if (!existing) {
      merged.set(entry.packId, entry)
      continue
    }

    merged.set(entry.packId, {
      ...existing,
      pack: {
        ...existing.pack,
        weapons: [...existing.pack.weapons, ...entry.pack.weapons],
        armor: [...existing.pack.armor, ...entry.pack.armor],
      },
    })
  }

  return {
    packs: merged,
    packCount: merged.size,
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

function makeViewWithTemplates(templates: TemplateWithSource[], builtinTemplates: RuntimeEquipmentTemplate[] = []) {
  return buildEquipmentRuntimeCacheView({
    builtinTemplates,
    storageSnapshot: makeStorageSnapshot(templates.map(templateToEntry)),
  })
}

describe("equipment runtime cache readers", () => {
  it("runtime reader filters by searchText, tier, trait, weaponType, damageType, range, burden, kind, and source", () => {
    const readers = createReadersFromView(
      makeViewWithTemplates([
        makeRuntimeWeapon({ id: "weapon:shadow-blade" }),
        makeRuntimeWeapon({
          id: "weapon:text-decoy",
          name: "Sun Blade",
          featureName: "Bright",
          description: "A radiant weapon.",
        }),
        makeRuntimeArmor({ id: "armor:kind-decoy" }),
        makeRuntimeWeapon({ id: "weapon:tier-decoy", tier: "T1" }),
        makeRuntimeWeapon({ id: "weapon:trait-decoy", trait: "strength" }),
        makeRuntimeWeapon({ id: "weapon:type-decoy", weaponType: "secondary" }),
        makeRuntimeWeapon({ id: "weapon:damage-type-decoy", damageType: "magic" }),
        makeRuntimeWeapon({ id: "weapon:range-decoy", range: "close" }),
        makeRuntimeWeapon({ id: "weapon:burden-decoy", burden: "offHand" }),
        makeRuntimeWeapon({ id: "weapon:source-decoy", sourceId: "pack_other" }),
      ]),
    )

    const criteria = {
      searchText: "shadow",
      kind: "weapon",
      tiers: ["T2"],
      traits: ["finesse"],
      weaponTypes: ["primary"],
      damageTypes: ["physical"],
      ranges: ["melee"],
      burdens: ["oneHanded"],
      sourceIds: ["pack_shadow"],
    } as const

    const result = readers.runtime.querySelectableTemplates(criteria)
    expect(result.map((template) => template.id)).toEqual(["weapon:shadow-blade"])

    for (const [field, value] of [
      ["searchText", "sun"],
      ["kind", "armor"],
      ["tiers", ["T1"]],
      ["traits", ["strength"]],
      ["weaponTypes", ["secondary"]],
      ["damageTypes", ["magic"]],
      ["ranges", ["close"]],
      ["burdens", ["offHand"]],
      ["sourceIds", ["pack_other"]],
    ] as const) {
      const oneFieldOffCriteria = { ...criteria, [field]: value }
      const ids = readers.runtime.querySelectableTemplates(oneFieldOffCriteria).map((template) => template.id)
      expect(ids).not.toContain("weapon:shadow-blade")
    }
  })

  it("runtime reader ORs values inside one criterion group and preserves global order", () => {
    const readers = createReadersFromView(
      makeViewWithTemplates(
        [
          makeRuntimeWeapon({ id: "weapon:pack-a-t1", sourceId: "pack_a", tier: "T1" }),
          makeRuntimeWeapon({ id: "weapon:pack-b-t2", sourceId: "pack_b", tier: "T2" }),
          makeRuntimeWeapon({ id: "weapon:pack-c-t3", sourceId: "pack_c", tier: "T3" }),
        ],
        [makeRuntimeWeapon({ id: "weapon:builtin-t1", tier: "T1" })],
      ),
    )

    const result = readers.runtime.querySelectableTemplates({
      kind: "weapon",
      sourceIds: ["pack_b", "builtin", "pack_a"],
      tiers: ["T1", "T2"],
    })

    expect(result.map((template) => template.id)).toEqual([
      "weapon:builtin-t1",
      "weapon:pack-a-t1",
      "weapon:pack-b-t2",
    ])
  })

  it("runtime reader treats empty criterion groups as unconstrained", () => {
    const readers = createReadersFromView(
      makeViewWithTemplates(
        [makeRuntimeWeapon({ id: "weapon:pack-a", sourceId: "pack_a" })],
        [makeRuntimeWeapon({ id: "weapon:builtin" })],
      ),
    )

    const result = readers.runtime.querySelectableTemplates({
      kind: "weapon",
      sourceIds: [],
      tiers: [],
    })

    expect(result.map((template) => template.id)).toEqual(["weapon:builtin", "weapon:pack-a"])
  })

  it("runtime reader returns no armor when weapon-only criterion groups are constrained", () => {
    const readers = createReadersFromView(makeViewWithTemplates([makeRuntimeArmor({ id: "armor:shadow" })]))

    expect(readers.runtime.querySelectableTemplates({ kind: "armor", burdens: ["oneHanded"] })).toEqual([])
    expect(readers.runtime.querySelectableTemplates({ kind: "armor", damageTypes: ["physical"] })).toEqual([])
  })

  it("runtime reader preserves global selectable order after multiple filters", () => {
    const readers = createReadersFromView(
      makeViewWithTemplates(
        [
          makeRuntimeWeapon({ id: "weapon:shadow-blade" }),
          makeRuntimeWeapon({ id: "weapon:arcane-staff", damageType: "magic" }),
          makeRuntimeArmor({ id: "armor:shadow" }),
          makeRuntimeWeapon({ id: "weapon:iron-axe", sourceId: "pack_other" }),
        ],
        [makeRuntimeWeapon({ id: "weapon:builtin-sword" })],
      ),
    )

    const result = readers.runtime.querySelectableTemplates({ kind: "weapon", damageTypes: ["physical"] })

    expect(result.map((template) => template.id)).toEqual([
      "weapon:builtin-sword",
      "weapon:shadow-blade",
      "weapon:iron-axe",
    ])
  })

  it("runtime reader does not return disabled pack templates", () => {
    const readers = createReadersFromView(
      makeViewWithTemplates([
        makeRuntimeWeapon({ id: "weapon:enabled", sourceId: "pack_enabled" }),
        makeRuntimeWeapon({ id: "weapon:disabled", sourceId: "pack_disabled" }),
      ]),
    )

    expect(readers.runtime.querySelectableTemplates({ sourceIds: ["pack_disabled"] })).toEqual([])
    expect(readers.runtime.getSelectableTemplateById("weapon:disabled")).toBeUndefined()
  })

  it("management reader lists custom packs including disabled packs", () => {
    const readers = createReadersFromView(
      makeViewWithTemplates([
        makeRuntimeWeapon({ id: "weapon:enabled", sourceId: "pack_enabled" }),
        makeRuntimeWeapon({ id: "weapon:disabled", sourceId: "pack_disabled" }),
      ]),
    )

    expect(readers.management.listPacks().map((pack) => [pack.packId, pack.disabled])).toEqual([
      ["pack_enabled", false],
      ["pack_disabled", true],
    ])
  })

  it("management reader exposes builtin pack metadata when builtin templates exist", () => {
    const readers = createReadersFromView(
      makeViewWithTemplates(
        [makeRuntimeWeapon({ id: "weapon:pack-a", sourceId: "pack_a" })],
        [makeRuntimeWeapon({ id: "weapon:builtin" }), makeRuntimeArmor({ id: "armor:builtin" })],
      ),
    )

    expect(readers.management.listPacks()[0]).toMatchObject({
      packId: "builtin",
      disabled: false,
      isSystemPack: true,
      weaponCount: 1,
      armorCount: 1,
    })
    expect(readers.management.getPackDetail("builtin")?.templates.map((template) => template.id)).toEqual([
      "weapon:builtin",
      "armor:builtin",
    ])
  })

  it("management reader returns disabled pack detail with full templates", () => {
    const readers = createReadersFromView(
      makeViewWithTemplates([
        makeRuntimeWeapon({ id: "weapon:enabled", sourceId: "pack_enabled" }),
        makeRuntimeWeapon({ id: "weapon:disabled", sourceId: "pack_disabled" }),
      ]),
    )

    const detail = readers.management.getPackDetail("pack_disabled")

    expect(detail?.pack.disabled).toBe(true)
    expect(detail?.templates.map((template) => template.id)).toEqual(["weapon:disabled"])
  })

  it("returns empty lists when cache view is empty", () => {
    const readers = createReadersFromView(makeViewWithTemplates([]))

    expect(readers.management.listPacks()).toEqual([])
    expect(readers.runtime.querySelectableTemplates({})).toEqual([])
  })
})
