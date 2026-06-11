import type { ArmorItem } from "@/data/list/armor"
import type { AllWeapon } from "@/data/list/all-weapons"
import type { Weapon } from "@/data/list/primary-weapon"
import type {
  NormalizedEquipmentArmorTemplate,
  NormalizedEquipmentWeaponTemplate,
} from "@/equipment/import/types"
import type { RuntimeEquipmentTemplate } from "@/equipment/runtime-cache/types"
import type { ArmorSlot, EquipmentModifierContributionTemplate, WeaponSlot } from "./types"

type IdFactory = (templateId: string) => string
export type CustomWeaponDraft = Omit<NormalizedEquipmentWeaponTemplate, "id">
export type CustomArmorDraft = Omit<NormalizedEquipmentArmorTemplate, "id">

type WeaponSlotTemplate = Pick<
  Weapon | AllWeapon | NormalizedEquipmentWeaponTemplate | (RuntimeEquipmentTemplate & { kind: "weapon" }),
  "name" | "damageType" | "burden" | "range" | "trait" | "damage" | "featureName" | "description" | "modifierContributions"
>
type ArmorSlotTemplate = Pick<
  ArmorItem | NormalizedEquipmentArmorTemplate | (RuntimeEquipmentTemplate & { kind: "armor" }),
  "name" | "baseArmorMax" | "baseThresholds" | "featureName" | "description" | "modifierContributions"
>

const TRAIT_LABELS: Record<string, string> = {
  agility: "敏捷",
  strength: "力量",
  finesse: "灵巧",
  instinct: "本能",
  presence: "风度",
  knowledge: "知识",
}

const DAMAGE_TYPE_LABELS: Record<string, string> = {
  physical: "物理",
  magic: "魔法",
}

const RANGE_LABELS: Record<string, string> = {
  melee: "近战",
  veryClose: "邻近",
  close: "近距离",
  far: "远距离",
  veryFar: "极远",
}

const BURDEN_LABELS: Record<string, string> = {
  oneHanded: "单手",
  twoHanded: "双手",
  offHand: "副手",
}

function joinText(parts: unknown[], separator: string): string {
  return parts
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(separator)
}

function displayLabel(value: unknown, labels: Record<string, string>): string {
  const key = String(value ?? "").trim()
  return labels[key] ?? key
}

function createFeatureText(featureName: unknown, description: unknown): string {
  const feature = String(featureName ?? "").trim()
  const text = String(description ?? "").trim()

  if (!feature) {
    return text
  }

  return text ? `${feature}: ${text}` : feature
}

function instantiateContributions(
  templates: EquipmentModifierContributionTemplate[] | undefined,
  idFactory: IdFactory,
) {
  return (templates ?? []).map((template) => ({
    id: idFactory(template.id),
    definition: { ...template.definition },
    editable: { ...template.editable },
  }))
}

function createWeaponSlotFromSharedTemplate(template: WeaponSlotTemplate, idFactory: IdFactory): WeaponSlot {
  return {
    name: template.name,
    trait: joinText([
      displayLabel(template.damageType, DAMAGE_TYPE_LABELS),
      displayLabel(template.burden, BURDEN_LABELS),
      displayLabel(template.range, RANGE_LABELS),
    ], "/"),
    damage: joinText([displayLabel(template.trait, TRAIT_LABELS), template.damage], ": "),
    feature: createFeatureText(template.featureName, template.description),
    modifierContributions: instantiateContributions(template.modifierContributions, idFactory),
  }
}

function createArmorSlotFromSharedTemplate(template: ArmorSlotTemplate, idFactory: IdFactory): ArmorSlot {
  return {
    name: template.name,
    baseArmorMax: template.baseArmorMax,
    baseThresholds: { ...template.baseThresholds },
    feature: createFeatureText(template.featureName, template.description),
    modifierContributions: instantiateContributions(template.modifierContributions, idFactory),
  }
}

export function createWeaponSlotFromBuiltinTemplate(template: Weapon | AllWeapon, idFactory: IdFactory): WeaponSlot {
  return createWeaponSlotFromSharedTemplate(template, idFactory)
}

export function createArmorSlotFromBuiltinTemplate(template: ArmorItem, idFactory: IdFactory): ArmorSlot {
  return createArmorSlotFromSharedTemplate(template, idFactory)
}

export function createWeaponSlotFromRuntimeTemplate(
  template: RuntimeEquipmentTemplate & { kind: "weapon" },
  idFactory: IdFactory,
): WeaponSlot {
  return createWeaponSlotFromSharedTemplate(template, idFactory)
}

export function createWeaponSlotFromCustomDraft(draft: CustomWeaponDraft, idFactory: IdFactory): WeaponSlot {
  return createWeaponSlotFromSharedTemplate(draft, idFactory)
}

export function createArmorSlotFromRuntimeTemplate(
  template: RuntimeEquipmentTemplate & { kind: "armor" },
  idFactory: IdFactory,
): ArmorSlot {
  return createArmorSlotFromSharedTemplate(template, idFactory)
}

export function createArmorSlotFromCustomDraft(draft: CustomArmorDraft, idFactory: IdFactory): ArmorSlot {
  return createArmorSlotFromSharedTemplate(draft, idFactory)
}
