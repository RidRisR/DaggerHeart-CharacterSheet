import type { EquipmentPackSnapshotEntry } from "@/equipment/packs/storage-types"
import type {
  EquipmentRuntimeCacheBuildDiagnostic,
  EquipmentRuntimeCacheBuildInput,
  EquipmentRuntimeCacheBuildResult,
  EquipmentRuntimeQueryIndexes,
  RuntimeEquipmentSourceId,
  RuntimeEquipmentTemplate,
  RuntimePackRecord,
  StableEquipmentRuntimeCacheView,
} from "./types"

export function createEmptyEquipmentRuntimeCacheView(): StableEquipmentRuntimeCacheView {
  return {
    templatesById: new Map(),
    packsById: new Map(),
    relationIndexes: {
      templateToPackId: new Map(),
      packToTemplateIds: new Map([["builtin", []]]),
    },
    queryIndexes: createEmptyQueryIndexes(),
  }
}

export function tryBuildEquipmentRuntimeCacheView(
  input: EquipmentRuntimeCacheBuildInput,
): EquipmentRuntimeCacheBuildResult {
  const view = createEmptyEquipmentRuntimeCacheView()
  const disabledSourceIds = new Set(input.disabledSourceIds ?? [])
  const builtinDisabled = disabledSourceIds.has("builtin")

  for (const template of input.builtinTemplates) {
    const added = addTemplate(view, {
      template,
      sourceId: "builtin",
      selectable: !builtinDisabled,
      path: "/builtinTemplates",
    })

    if (!added.ok) {
      return added
    }
  }

  if ((view.relationIndexes.packToTemplateIds.get("builtin") ?? []).length > 0) {
    view.packsById.set("builtin", toBuiltinRuntimePackRecord(view, builtinDisabled))
  }

  const sortedPacks = [...input.storageSnapshot.packs.values()].sort(compareSnapshotEntries)

  for (const entry of sortedPacks) {
    if (entry.packId === "builtin") {
      return {
        ok: false,
        diagnostic: {
          severity: "error",
          code: "RUNTIME_CACHE_RESERVED_PACK_ID",
          path: "/packs/builtin",
          message: "Runtime cache reserved equipment pack id: builtin.",
          value: entry.packId,
        },
      }
    }

    view.packsById.set(entry.packId, toRuntimePackRecord(entry))
    view.relationIndexes.packToTemplateIds.set(entry.packId, [])

    for (const weapon of entry.pack.weapons) {
      const added = addTemplate(view, {
        template: { kind: "weapon", ...weapon },
        sourceId: entry.packId,
        selectable: !entry.disabled,
        path: `/packs/${entry.packId}/weapons/${weapon.id}`,
      })

      if (!added.ok) {
        return added
      }
    }

    for (const armor of entry.pack.armor) {
      const added = addTemplate(view, {
        template: { kind: "armor", ...armor },
        sourceId: entry.packId,
        selectable: !entry.disabled,
        path: `/packs/${entry.packId}/armor/${armor.id}`,
      })

      if (!added.ok) {
        return added
      }
    }
  }

  return { ok: true, view }
}

export function buildEquipmentRuntimeCacheView(
  input: EquipmentRuntimeCacheBuildInput,
): StableEquipmentRuntimeCacheView {
  const result = tryBuildEquipmentRuntimeCacheView(input)

  if (result.ok) {
    return result.view
  }

  const error = new Error(result.diagnostic.message)
  Object.assign(error, { diagnostic: result.diagnostic })
  throw error
}

function createEmptyQueryIndexes(): EquipmentRuntimeQueryIndexes {
  return {
    selectableTemplateIds: [],
    weaponTemplateIds: [],
    armorTemplateIds: [],
    templateIdsByTier: new Map(),
    templateIdsByTrait: new Map(),
    templateIdsByWeaponType: new Map(),
    templateIdsByDamageType: new Map(),
    templateIdsByRange: new Map(),
    templateIdsByBurden: new Map(),
    templateIdsBySource: new Map(),
  }
}

function addTemplate(
  view: StableEquipmentRuntimeCacheView,
  input: {
    template: RuntimeEquipmentTemplate
    sourceId: RuntimeEquipmentSourceId
    selectable: boolean
    path: string
  },
): { ok: true } | { ok: false; diagnostic: EquipmentRuntimeCacheBuildDiagnostic } {
  if (view.templatesById.has(input.template.id)) {
    return {
      ok: false,
      diagnostic: {
        severity: "error",
        code: "RUNTIME_CACHE_DUPLICATE_TEMPLATE_ID",
        path: input.path,
        message: `Runtime cache duplicate template id: ${input.template.id}.`,
        value: input.template.id,
      },
    }
  }

  view.templatesById.set(input.template.id, input.template)
  view.relationIndexes.templateToPackId.set(input.template.id, input.sourceId)
  appendIndexValue(view.relationIndexes.packToTemplateIds, input.sourceId, input.template.id)

  if (input.selectable) {
    addSelectableTemplate(view.queryIndexes, input.template, input.sourceId)
  }

  return { ok: true }
}

function addSelectableTemplate(
  indexes: EquipmentRuntimeQueryIndexes,
  template: RuntimeEquipmentTemplate,
  sourceId: RuntimeEquipmentSourceId,
) {
  indexes.selectableTemplateIds.push(template.id)
  appendIndexValue(indexes.templateIdsByTier, template.tier, template.id)
  appendIndexValue(indexes.templateIdsBySource, sourceId, template.id)

  if (template.kind === "weapon") {
    indexes.weaponTemplateIds.push(template.id)
    appendIndexValue(indexes.templateIdsByTrait, template.trait, template.id)
    appendIndexValue(indexes.templateIdsByWeaponType, template.weaponType, template.id)
    appendIndexValue(indexes.templateIdsByDamageType, template.damageType, template.id)
    appendIndexValue(indexes.templateIdsByRange, template.range, template.id)
    appendIndexValue(indexes.templateIdsByBurden, template.burden, template.id)
    return
  }

  indexes.armorTemplateIds.push(template.id)
}

function appendIndexValue<K>(index: Map<K, string[]>, key: K, value: string) {
  const existing = index.get(key)

  if (existing) {
    existing.push(value)
    return
  }

  index.set(key, [value])
}

function compareSnapshotEntries(a: EquipmentPackSnapshotEntry, b: EquipmentPackSnapshotEntry): number {
  const importedAtOrder = a.importedAt.localeCompare(b.importedAt)

  if (importedAtOrder !== 0) {
    return importedAtOrder
  }

  return a.packId.localeCompare(b.packId)
}

function toBuiltinRuntimePackRecord(view: StableEquipmentRuntimeCacheView, disabled: boolean): RuntimePackRecord {
  const templateIds = view.relationIndexes.packToTemplateIds.get("builtin") ?? []
  let weaponCount = 0
  let armorCount = 0

  for (const templateId of templateIds) {
    const template = view.templatesById.get(templateId)
    if (template?.kind === "weapon") weaponCount += 1
    if (template?.kind === "armor") armorCount += 1
  }

  return {
    packId: "builtin",
    name: "系统内置装备",
    author: "DaggerHeart",
    importedAt: "系统内置",
    disabled,
    source: { originKind: "builtin", label: "系统内置" },
    weaponCount,
    armorCount,
    isSystemPack: true,
  }
}

function toRuntimePackRecord(entry: EquipmentPackSnapshotEntry): RuntimePackRecord {
  return {
    packId: entry.packId,
    name: entry.pack.metadata.name,
    author: entry.pack.metadata.author,
    version: entry.pack.metadata.version,
    description: entry.pack.metadata.description,
    importedAt: entry.importedAt,
    disabled: entry.disabled,
    source: entry.source,
    weaponCount: entry.pack.weapons.length,
    armorCount: entry.pack.armor.length,
  }
}
