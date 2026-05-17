import type { EquipmentModifierContribution, EquipmentModifierTargetId } from "@/lib/equipment/types"

const equipmentModifierTargets = [
  "evasion",
  "armorMax",
  "minorThreshold",
  "majorThreshold",
  "hpMax",
  "stressMax",
  "proficiency",
  "agility.value",
  "strength.value",
  "finesse.value",
  "instinct.value",
  "presence.value",
  "knowledge.value",
] as const satisfies readonly EquipmentModifierTargetId[]

export const EQUIPMENT_MODIFIER_TARGETS = equipmentModifierTargets

export const EQUIPMENT_TARGET_LABELS: Record<EquipmentModifierTargetId, string> = {
  evasion: "闪避",
  armorMax: "护甲值",
  minorThreshold: "重伤阈值",
  majorThreshold: "严重阈值",
  hpMax: "生命上限",
  stressMax: "压力上限",
  proficiency: "熟练度",
  "agility.value": "敏捷",
  "strength.value": "力量",
  "finesse.value": "灵巧",
  "instinct.value": "本能",
  "presence.value": "风度",
  "knowledge.value": "知识",
}

const targetSet = new Set<string>(equipmentModifierTargets)
let generatedIdCounter = 0

export function isEquipmentModifierTargetId(target: unknown): target is EquipmentModifierTargetId {
  return typeof target === "string" && targetSet.has(target)
}

export function createEquipmentContributionId(sourceId: string): string {
  generatedIdCounter += 1
  return `equipment:${sourceId}:${Date.now()}:${generatedIdCounter}`
}

export function createDefaultEquipmentModifierContribution(sourceId: string): EquipmentModifierContribution {
  return {
    id: createEquipmentContributionId(sourceId),
    definition: { target: "evasion", kind: "modifier" },
    editable: { label: "", value: 0 },
  }
}

export function sanitizeEquipmentModifierContributions(value: unknown): EquipmentModifierContribution[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item): EquipmentModifierContribution[] => {
    if (!item || typeof item !== "object") {
      return []
    }

    const contribution = item as {
      id?: unknown
      definition?: { target?: unknown; kind?: unknown }
      editable?: { label?: unknown; value?: unknown }
    }

    if (
      typeof contribution.id !== "string" ||
      !isEquipmentModifierTargetId(contribution.definition?.target) ||
      contribution.definition?.kind !== "modifier" ||
      typeof contribution.editable?.value !== "number"
    ) {
      return []
    }

    return [
      {
        id: contribution.id,
        definition: {
          target: contribution.definition.target,
          kind: "modifier",
        },
        editable: {
          label: String(contribution.editable.label ?? ""),
          value: contribution.editable.value,
        },
      },
    ]
  })
}
