import type { ModifierTargetId, OtherAdjustment, OtherAdjustmentKind } from "@/lib/modifiers/types"

const KIND_ID_SEGMENTS: Record<OtherAdjustmentKind, string> = {
  unknownMigrationDifference: "unknown-migration-difference",
  manualFinalAdjustment: "manual-final-adjustment",
  unattributedDifference: "unattributed-difference",
}

const OTHER_ADJUSTMENT_KINDS = [
  "unknownMigrationDifference",
  "manualFinalAdjustment",
  "unattributedDifference",
] as const satisfies readonly OtherAdjustmentKind[]

const MODIFIER_TARGET_IDS = new Set<string>([
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
])

const EXPERIENCE_TARGET_PATTERN = /^experienceValues\.(0|[1-9]\d*)$/

export const OTHER_ADJUSTMENT_PRESENTATION = {
  unknownMigrationDifference: {
    badge: "迁移",
    label: "未知迁移差额",
    editable: true,
    removableWhenAutoCalculation: "always",
  },
  manualFinalAdjustment: {
    badge: "用户",
    label: "手动修改终值",
    editable: true,
    removableWhenAutoCalculation: "always",
  },
  unattributedDifference: {
    badge: "同步",
    label: "未归因差额",
    editable: false,
    removableWhenAutoCalculation: "autoOnly",
  },
} as const satisfies Record<
  OtherAdjustmentKind,
  {
    badge: string
    label: string
    editable: boolean
    removableWhenAutoCalculation: "always" | "autoOnly"
  }
>

export function isOtherAdjustmentKind(value: unknown): value is OtherAdjustmentKind {
  return typeof value === "string" && OTHER_ADJUSTMENT_KINDS.includes(value as OtherAdjustmentKind)
}

export function isModifierTargetId(value: unknown): value is ModifierTargetId {
  return (
    typeof value === "string" &&
    (MODIFIER_TARGET_IDS.has(value) || EXPERIENCE_TARGET_PATTERN.test(value))
  )
}

export function getOtherAdjustmentId(target: ModifierTargetId, kind: OtherAdjustmentKind): string {
  return `other:${target}:${KIND_ID_SEGMENTS[kind]}`
}

export function createOtherAdjustment(
  target: ModifierTargetId,
  kind: OtherAdjustmentKind,
  value: number,
): OtherAdjustment {
  return {
    id: getOtherAdjustmentId(target, kind),
    target,
    kind,
    value,
  }
}

export function createUnknownMigrationDifference(target: ModifierTargetId, value: number): OtherAdjustment {
  return createOtherAdjustment(target, "unknownMigrationDifference", value)
}

export function createManualFinalAdjustment(target: ModifierTargetId, value: number): OtherAdjustment {
  return createOtherAdjustment(target, "manualFinalAdjustment", value)
}

export function createUnattributedDifference(target: ModifierTargetId, value: number): OtherAdjustment {
  return createOtherAdjustment(target, "unattributedDifference", value)
}

export function sanitizeOtherAdjustments(value: unknown): OtherAdjustment[] {
  if (!Array.isArray(value)) return []

  const seen = new Set<string>()
  const sanitized: OtherAdjustment[] = []

  value.forEach((item) => {
    if (!item || typeof item !== "object") return

    const raw = item as {
      target?: unknown
      kind?: unknown
      value?: unknown
    }

    if (!isModifierTargetId(raw.target)) return
    if (!isOtherAdjustmentKind(raw.kind)) return
    if (typeof raw.value !== "number" || !Number.isFinite(raw.value)) return

    const key = `${raw.target}:${raw.kind}`
    if (seen.has(key)) return

    seen.add(key)
    sanitized.push(createOtherAdjustment(raw.target, raw.kind, raw.value))
  })

  return sanitized
}

export function upsertOtherAdjustment(value: unknown, adjustment: OtherAdjustment): OtherAdjustment[] {
  const sanitized = sanitizeOtherAdjustments(value)

  if (
    !isModifierTargetId(adjustment.target) ||
    !isOtherAdjustmentKind(adjustment.kind) ||
    !Number.isFinite(adjustment.value)
  ) {
    return sanitized
  }

  const normalized = createOtherAdjustment(adjustment.target, adjustment.kind, adjustment.value)
  const existingIndex = sanitized.findIndex(
    (item) => item.target === normalized.target && item.kind === normalized.kind,
  )

  if (existingIndex === -1) return [...sanitized, normalized]

  return sanitized.map((item, index) => (index === existingIndex ? normalized : item))
}

export function removeOtherAdjustment(value: unknown, adjustmentId: string): OtherAdjustment[] {
  return sanitizeOtherAdjustments(value).filter((adjustment) => adjustment.id !== adjustmentId)
}

export function sumOtherAdjustments(value: unknown, target?: ModifierTargetId): number {
  return sanitizeOtherAdjustments(value).reduce((sum, adjustment) => {
    if (target !== undefined && adjustment.target !== target) return sum
    return sum + adjustment.value
  }, 0)
}

export function deriveUnattributedDifference(input: {
  target: ModifierTargetId
  finalValue: number | undefined
  referenceTotal: number | undefined
  otherAdjustments: unknown
}): number | undefined {
  if (
    typeof input.finalValue !== "number" ||
    typeof input.referenceTotal !== "number" ||
    !Number.isFinite(input.finalValue) ||
    !Number.isFinite(input.referenceTotal)
  ) {
    return undefined
  }

  return input.finalValue - input.referenceTotal - sumOtherAdjustments(input.otherAdjustments, input.target)
}
