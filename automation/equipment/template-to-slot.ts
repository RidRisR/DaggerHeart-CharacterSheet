import type { ArmorItem } from "@/data/list/armor"
import type { AllWeapon } from "@/data/list/all-weapons"
import type { Weapon } from "@/data/list/primary-weapon"
import { parseArmorMax, parseArmorThreshold } from "./armor-utils"
import { createEmptyArmorSlot, createEmptyWeaponSlot } from "./defaults"
import type { ArmorSlot, EquipmentModifierContributionTemplate, WeaponSlot } from "./types"

type IdFactory = (templateId: string) => string

type CustomPayload = Record<string, unknown>

function joinText(parts: unknown[], separator: string): string {
  return parts
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(separator)
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

export function createWeaponSlotFromTemplate(template: Weapon | AllWeapon, idFactory: IdFactory): WeaponSlot {
  return {
    name: template.名称,
    trait: joinText([template.伤害类型, template.负荷, template.范围], "/"),
    damage: joinText([template.属性, template.伤害], ": "),
    feature: createFeatureText(template.特性名称, template.描述),
    modifierContributions: instantiateContributions(template.modifierContributions, idFactory),
  }
}

export function createWeaponSlotFromCustomPayload(payload: unknown): WeaponSlot {
  if (!payload || typeof payload !== "object") {
    return createEmptyWeaponSlot()
  }

  const data = payload as CustomPayload

  return {
    name: String(data.名称 ?? data.name ?? ""),
    trait: joinText([data.伤害类型, data.负荷, data.范围], "/"),
    damage:
      data.属性 && data.伤害
        ? joinText([data.属性, data.伤害], ": ")
        : String(data.伤害 ?? data.damage ?? ""),
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
  return {
    name: template.name,
    baseArmorMax: template.baseArmorMax,
    baseThresholds: { ...template.baseThresholds },
    feature: createFeatureText(template.featureName, template.description),
    modifierContributions: instantiateContributions(template.modifierContributions, idFactory),
  }
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
