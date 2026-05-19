import type {
  AttributeKey,
  FixedUpgradeTargetId,
  UpgradeState,
  UpgradeStateParams,
  UpgradeStates,
} from "@/automation/core/types"

const FIXED_UPGRADE_TARGET_IDS = [
  "hpMax",
  "stressMax",
  "evasion",
  "proficiency",
] as const satisfies readonly FixedUpgradeTargetId[]

const ATTRIBUTE_KEYS = [
  "agility",
  "strength",
  "finesse",
  "instinct",
  "presence",
  "knowledge",
] as const satisfies readonly AttributeKey[]

export function isFixedUpgradeTargetId(value: unknown): value is FixedUpgradeTargetId {
  return typeof value === "string" && FIXED_UPGRADE_TARGET_IDS.includes(value as FixedUpgradeTargetId)
}

export function isAttributeKey(value: unknown): value is AttributeKey {
  return typeof value === "string" && ATTRIBUTE_KEYS.includes(value as AttributeKey)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function dedupe<T>(values: readonly T[]): T[] {
  return Array.from(new Set(values))
}

function isCompleteLegacyCheckKey(value: string): boolean {
  return value.includes("-")
}

function sanitizeUpgradeStateParams(value: unknown): UpgradeStateParams | undefined {
  if (!isRecord(value)) return undefined

  if ("target" in value) {
    return isFixedUpgradeTargetId(value.target) ? { target: value.target } : undefined
  }

  if ("attributes" in value) {
    if (!Array.isArray(value.attributes) || value.attributes.length === 0) return undefined
    if (!value.attributes.every(isAttributeKey)) return undefined
    return { attributes: dedupe(value.attributes) }
  }

  if ("experienceIndexes" in value) {
    if (!Array.isArray(value.experienceIndexes) || value.experienceIndexes.length === 0) return undefined
    if (!value.experienceIndexes.every(index => Number.isSafeInteger(index) && index >= 0)) return undefined
    return { experienceIndexes: dedupe(value.experienceIndexes) }
  }

  return undefined
}

function sanitizeUpgradeState(value: unknown): UpgradeState | undefined {
  if (!isRecord(value) || typeof value.checked !== "boolean") return undefined

  if (!value.checked) {
    return { checked: false }
  }

  const params = sanitizeUpgradeStateParams(value.params)
  if (!params) return { checked: true }

  if ("attributes" in params && value.attributeMarksApplied === true) {
    return { checked: true, params, attributeMarksApplied: true }
  }

  return { checked: true, params }
}

export function sanitizeUpgradeStates(value: unknown): UpgradeStates {
  if (!isRecord(value)) return {}

  const sanitized: UpgradeStates = {}

  Object.entries(value).forEach(([checkKey, state]) => {
    const sanitizedState = sanitizeUpgradeState(state)
    if (!sanitizedState) return
    sanitized[checkKey] = sanitizedState
  })

  return sanitized
}

export function mergeUpgradeState(current: UpgradeState | undefined, next: UpgradeState): UpgradeState {
  if (next.checked === false) {
    return { checked: false }
  }

  if ("params" in next && next.params !== undefined) {
    return sanitizeUpgradeState(next) ?? { checked: true }
  }

  const currentState = sanitizeUpgradeState(current)
  if (currentState?.checked && currentState.params) {
    return currentState
  }

  return { checked: true }
}

export function mergeLegacyUpgradeStateFields(value: {
  upgradeStates?: unknown
  checkedUpgrades?: unknown
}): UpgradeStates {
  const merged = sanitizeUpgradeStates(value.upgradeStates)

  const addLegacyState = (checkKey: string, next: UpgradeState) => {
    if (checkKey in merged) return
    merged[checkKey] = mergeUpgradeState(undefined, next)
  }

  if (isRecord(value.checkedUpgrades)) {
    Object.entries(value.checkedUpgrades).forEach(([checkKey, checkedByIndex]) => {
      if (!isCompleteLegacyCheckKey(checkKey) || !isRecord(checkedByIndex)) return
      if (Object.values(checkedByIndex).some(checked => checked === true)) {
        addLegacyState(checkKey, { checked: true })
      }
    })
  }

  return merged
}
