import type { ArmorItem } from "@/data/list/armor"
import type { AllWeapon } from "@/data/list/all-weapons"
import type { Weapon } from "@/data/list/primary-weapon"
import type {
  NormalizedEquipmentArmorTemplate,
  NormalizedEquipmentWeaponTemplate,
} from "@/equipment/import/types"
import type { RuntimeEquipmentTemplate } from "@/equipment/runtime-cache/types"
import { parseArmorMax, parseArmorThreshold } from "./armor-utils"
import { createEmptyArmorSlot, createEmptyWeaponSlot } from "./defaults"
import type { ArmorSlot, EquipmentModifierContributionTemplate, WeaponSlot } from "./types"

type IdFactory = (templateId: string) => string
export type CustomWeaponDraft = Omit<NormalizedEquipmentWeaponTemplate, "id">
export type CustomArmorDraft = Omit<NormalizedEquipmentArmorTemplate, "id">

type CustomPayload = Record<string, unknown>
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

export function createWeaponSlotFromTemplate(template: Weapon | AllWeapon, idFactory: IdFactory): WeaponSlot {
  return createWeaponSlotFromSharedTemplate(template, idFactory)
}

export function createWeaponSlotFromCustomPayload(payload: unknown): WeaponSlot {
  if (!payload || typeof payload !== "object") {
    return createEmptyWeaponSlot()
  }

  const data = payload as CustomPayload
  const trait = data.属性 ?? data.trait
  const damage = data.伤害 ?? data.damage

  return {
    name: String(data.名称 ?? data.name ?? ""),
    trait: joinText([
      displayLabel(data.伤害类型 ?? data.damageType, DAMAGE_TYPE_LABELS),
      displayLabel(data.负荷 ?? data.burden, BURDEN_LABELS),
      displayLabel(data.范围 ?? data.range, RANGE_LABELS),
    ], "/"),
    damage:
      trait && damage
        ? joinText([displayLabel(trait, TRAIT_LABELS), damage], ": ")
        : String(damage ?? ""),
    feature: createFeatureText(data.特性名称 ?? data.featureName, data.描述 ?? data.description),
    modifierContributions: [],
  }
}

export function createWeaponSlotFromName(name: string): WeaponSlot {
  return {
    ...createEmptyWeaponSlot(),
    name,
  }
}

export function createArmorSlotFromTemplate(template: ArmorItem, idFactory: IdFactory): ArmorSlot {
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

export function createArmorSlotFromCustomPayload(payload: unknown): ArmorSlot {
  if (!payload || typeof payload !== "object") {
    return createEmptyArmorSlot()
  }

  const data = payload as CustomPayload

  return {
    name: String(data.名称 ?? data.name ?? ""),
    baseArmorMax: parseArmorMax(data.护甲值 ?? data.baseArmorMax),
    baseThresholds: parseArmorThreshold(data.伤害阈值 ?? data.thresholds ?? data.baseThresholds),
    feature: createFeatureText(data.特性名称 ?? data.featureName, data.描述 ?? data.description),
    modifierContributions: [],
  }
}
