import type {
  EquipmentRuntimeCacheReaders,
  EquipmentRuntimeQueryCriteria,
  EquipmentRuntimeQueryIndexes,
  EquipmentRuntimeReader,
  RuntimeEquipmentTemplate,
  RuntimePackSummary,
  StableEquipmentRuntimeCacheView,
} from "./types"

export function createReadersFromView(view: StableEquipmentRuntimeCacheView): EquipmentRuntimeCacheReaders {
  return {
    runtime: createRuntimeReader(view),
    management: createManagementReader(view),
  }
}

function createRuntimeReader(view: StableEquipmentRuntimeCacheView): EquipmentRuntimeReader {
  return {
    querySelectableTemplates(criteria: EquipmentRuntimeQueryCriteria = {}) {
      const candidateIds = chooseCandidateIds(view.queryIndexes, criteria)
      const result: RuntimeEquipmentTemplate[] = []

      for (const templateId of candidateIds) {
        const template = view.templatesById.get(templateId)

        if (template && matchesCriteria(template, criteria, view)) {
          result.push(template)
        }
      }

      return result
    },
    getSelectableTemplateById(templateId: string) {
      if (!view.queryIndexes.selectableTemplateIds.includes(templateId)) {
        return undefined
      }

      return view.templatesById.get(templateId)
    },
  }
}

function createManagementReader(view: StableEquipmentRuntimeCacheView) {
  return {
    listPacks(): RuntimePackSummary[] {
      return [...view.packsById.values()].map(({ description: _description, source: _source, ...summary }) => summary)
    },
    getPackDetail(packId: string) {
      const pack = view.packsById.get(packId)

      if (!pack) {
        return undefined
      }

      const templateIds = view.relationIndexes.packToTemplateIds.get(packId) ?? []
      const templates = templateIds
        .map((templateId) => view.templatesById.get(templateId))
        .filter((template): template is RuntimeEquipmentTemplate => Boolean(template))

      return { pack, templates }
    },
  }
}

function chooseCandidateIds(
  indexes: EquipmentRuntimeQueryIndexes,
  criteria: EquipmentRuntimeQueryCriteria,
): string[] {
  const selectableIds = indexes.selectableTemplateIds
  const candidates = [
    criteria.kind === "weapon" ? indexes.weaponTemplateIds : undefined,
    criteria.kind === "armor" ? indexes.armorTemplateIds : undefined,
    idsForCriterionGroup(selectableIds, criteria.tiers, indexes.templateIdsByTier),
    idsForCriterionGroup(selectableIds, criteria.traits, indexes.templateIdsByTrait),
    idsForCriterionGroup(selectableIds, criteria.weaponTypes, indexes.templateIdsByWeaponType),
    idsForCriterionGroup(selectableIds, criteria.damageTypes, indexes.templateIdsByDamageType),
    idsForCriterionGroup(selectableIds, criteria.ranges, indexes.templateIdsByRange),
    idsForCriterionGroup(selectableIds, criteria.burdens, indexes.templateIdsByBurden),
    idsForCriterionGroup(selectableIds, criteria.sourceIds, indexes.templateIdsBySource),
  ].filter((candidate): candidate is string[] => Boolean(candidate))

  if (candidates.length === 0) {
    return selectableIds
  }

  return candidates.reduce((narrowest, candidate) => (candidate.length < narrowest.length ? candidate : narrowest))
}

function hasValues<T>(values: readonly T[] | undefined): values is readonly T[] {
  return Boolean(values && values.length > 0)
}

function idsForCriterionGroup<T>(
  selectableIds: readonly string[],
  values: readonly T[] | undefined,
  index: Map<T, string[]>,
): string[] | undefined {
  if (!hasValues(values)) return undefined

  const allowed = new Set<string>()
  for (const value of values) {
    for (const id of index.get(value) ?? []) {
      allowed.add(id)
    }
  }

  return selectableIds.filter((id) => allowed.has(id))
}

function matchesCriteria(
  template: RuntimeEquipmentTemplate,
  criteria: EquipmentRuntimeQueryCriteria,
  view: StableEquipmentRuntimeCacheView,
): boolean {
  if (criteria.kind && template.kind !== criteria.kind) {
    return false
  }

  if (!matchesCriterionGroup(template.tier, criteria.tiers)) {
    return false
  }

  const sourceId = view.relationIndexes.templateToPackId.get(template.id)
  if (hasValues(criteria.sourceIds) && (!sourceId || !criteria.sourceIds.includes(sourceId))) {
    return false
  }

  if (criteria.searchText && !matchesSearchText(template, criteria.searchText)) {
    return false
  }

  if (template.kind !== "weapon") {
    return !hasWeaponOnlyCriteria(criteria)
  }

  return (
    matchesCriterionGroup(template.trait, criteria.traits) &&
    matchesCriterionGroup(template.weaponType, criteria.weaponTypes) &&
    matchesCriterionGroup(template.damageType, criteria.damageTypes) &&
    matchesCriterionGroup(template.range, criteria.ranges) &&
    matchesCriterionGroup(template.burden, criteria.burdens)
  )
}

function matchesCriterionGroup<T>(actual: T, values: readonly T[] | undefined): boolean {
  return !hasValues(values) || values.includes(actual)
}

function hasWeaponOnlyCriteria(criteria: EquipmentRuntimeQueryCriteria): boolean {
  return (
    hasValues(criteria.traits) ||
    hasValues(criteria.weaponTypes) ||
    hasValues(criteria.damageTypes) ||
    hasValues(criteria.ranges) ||
    hasValues(criteria.burdens)
  )
}

function matchesSearchText(template: RuntimeEquipmentTemplate, searchText: string): boolean {
  const normalizedSearchText = searchText.trim().toLowerCase()

  if (!normalizedSearchText) {
    return true
  }

  return (
    fieldIncludes(template.name, normalizedSearchText) ||
    fieldIncludes(template.featureName, normalizedSearchText) ||
    fieldIncludes(template.description, normalizedSearchText)
  )
}

function fieldIncludes(value: string | undefined, searchText: string): boolean {
  return value?.toLowerCase().includes(searchText) ?? false
}
