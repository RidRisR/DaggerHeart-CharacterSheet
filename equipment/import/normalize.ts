import {
  DESCRIPTION_LONG_WARNING_THRESHOLD,
  EQUIPMENT_PACK_FORMAT,
} from "./constants"
import { makeWarningDiagnostic } from "./diagnostics"
import type {
  EquipmentPackImportDiagnostic,
  NormalizedEquipmentArmorTemplate,
  NormalizedEquipmentModifierContributionTemplate,
  NormalizedEquipmentPackData,
  NormalizedEquipmentWeaponTemplate,
} from "./types"

type RawRecord = Record<string, any>

function normalizeContributions(items: RawRecord[] | undefined): NormalizedEquipmentModifierContributionTemplate[] {
  return (items ?? []).map((item) => ({
    id: item.id,
    definition: {
      target: item.definition.target,
      kind: "modifier",
    },
    editable: {
      label: item.editable.label,
      value: item.editable.value,
    },
  }))
}

function addDescriptionWarning(
  diagnostics: EquipmentPackImportDiagnostic[],
  description: string,
  path: string,
) {
  if (description.length > DESCRIPTION_LONG_WARNING_THRESHOLD && description.length <= 4000) {
    diagnostics.push(makeWarningDiagnostic("DESCRIPTION_LONG", path, "Description is long."))
  }
}

function normalizeWeapon(item: RawRecord, index: number, diagnostics: EquipmentPackImportDiagnostic[]) {
  const featureName = item.featureName ?? ""
  const description = item.description ?? ""

  if (!featureName && !description) {
    diagnostics.push(
      makeWarningDiagnostic(
        "MISSING_TEMPLATE_DESCRIPTION",
        `/equipment/weapons/${index}`,
        "Template has no feature name or description.",
      ),
    )
  }

  addDescriptionWarning(diagnostics, description, `/equipment/weapons/${index}/description`)

  return {
    id: item.id,
    name: item.name,
    tier: item.tier,
    weaponType: item.weaponType,
    trait: item.trait,
    damageType: item.damageType,
    range: item.range,
    burden: item.burden,
    damage: item.damage,
    ...(featureName ? { featureName } : {}),
    ...(description ? { description } : {}),
    modifierContributions: normalizeContributions(item.modifierContributions),
  } satisfies NormalizedEquipmentWeaponTemplate
}

function normalizeArmor(item: RawRecord, index: number, diagnostics: EquipmentPackImportDiagnostic[]) {
  const featureName = item.featureName ?? ""
  const description = item.description ?? ""

  if (!featureName && !description) {
    diagnostics.push(
      makeWarningDiagnostic(
        "MISSING_TEMPLATE_DESCRIPTION",
        `/equipment/armor/${index}`,
        "Template has no feature name or description.",
      ),
    )
  }

  addDescriptionWarning(diagnostics, description, `/equipment/armor/${index}/description`)

  return {
    id: item.id,
    name: item.name,
    tier: item.tier,
    baseArmorMax: item.baseArmorMax,
    baseThresholds: { ...item.baseThresholds },
    ...(featureName ? { featureName } : {}),
    ...(description ? { description } : {}),
    modifierContributions: normalizeContributions(item.modifierContributions),
  } satisfies NormalizedEquipmentArmorTemplate
}

export function normalizeEquipmentPack(value: unknown): {
  pack: NormalizedEquipmentPackData
  diagnostics: EquipmentPackImportDiagnostic[]
} {
  const input = value as RawRecord
  const equipment = input.equipment as RawRecord
  const diagnostics: EquipmentPackImportDiagnostic[] = []

  const description = input.description ?? ""

  addDescriptionWarning(diagnostics, description, "/description")

  return {
    pack: {
      metadata: {
        format: EQUIPMENT_PACK_FORMAT,
        name: input.name,
        version: input.version,
        author: input.author,
        description,
      },
      weapons: ((equipment.weapons ?? []) as RawRecord[]).map((item, index) =>
        normalizeWeapon(item, index, diagnostics),
      ),
      armor: ((equipment.armor ?? []) as RawRecord[]).map((item, index) =>
        normalizeArmor(item, index, diagnostics),
      ),
    },
    diagnostics,
  }
}
