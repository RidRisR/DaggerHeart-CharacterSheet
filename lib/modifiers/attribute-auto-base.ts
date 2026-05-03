import { parseNumberOr, tryParseNumberExpression } from "@/lib/number-utils"
import type { AttributeTargetId, ModifierEntryId, UserModifierEntry } from "./types"

export const ATTRIBUTE_AUTO_BASE_LABEL = "手动基础值"

export function getAttributeAutoBaseId(target: AttributeTargetId): ModifierEntryId {
  return `user:${target}:auto-base`
}

export function createAttributeAutoBaseEntry(target: AttributeTargetId, value: number): UserModifierEntry {
  const id = getAttributeAutoBaseId(target)
  return {
    id,
    sourceId: id,
    target,
    kind: "base",
    label: ATTRIBUTE_AUTO_BASE_LABEL,
    value,
    sourceType: "user",
    priority: 10,
  }
}

interface AttributeAutoBaseCreationInput {
  target: AttributeTargetId
  level: unknown
  initialValue: unknown
  submittedValue: unknown
  existingUserBases: UserModifierEntry[]
}

interface AttributeAutoBaseRemovalInput {
  target: AttributeTargetId
  level: unknown
  submittedValue: unknown
  existingUserBases: UserModifierEntry[]
}

function isBlank(value: unknown): boolean {
  return typeof value !== "string" || value.trim() === ""
}

function isLevelOne(level: unknown): boolean {
  return parseNumberOr(level, 1) === 1
}

export function getAttributeAutoBaseCreation(input: AttributeAutoBaseCreationInput): UserModifierEntry | undefined {
  if (!isLevelOne(input.level)) return undefined
  if (!isBlank(input.initialValue)) return undefined
  if (input.existingUserBases.length > 0) return undefined

  const parsedValue = tryParseNumberExpression(input.submittedValue)
  if (parsedValue === undefined) return undefined

  return createAttributeAutoBaseEntry(input.target, parsedValue)
}

export function shouldRemoveAttributeAutoBase(input: AttributeAutoBaseRemovalInput): boolean {
  if (!isLevelOne(input.level)) return false
  if (!isBlank(input.submittedValue)) return false
  if (input.existingUserBases.length !== 1) return false

  return input.existingUserBases[0]?.id === getAttributeAutoBaseId(input.target)
}
