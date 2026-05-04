import { parseNumberOr, tryParseNumberExpression } from "@/lib/number-utils"
import type { AttributeTargetId, ModifierEntryId, UserModifierContribution } from "./types"

export const ATTRIBUTE_AUTO_BASE_LABEL = "手动基础值"

export function getAttributeAutoBaseId(target: AttributeTargetId): ModifierEntryId {
  return `user:${target}:auto-base`
}

export function createAttributeAutoBaseEntry(target: AttributeTargetId, value: number): UserModifierContribution {
  const id = getAttributeAutoBaseId(target)
  return {
    id,
    definition: {
      target,
      kind: "base",
    },
    editable: {
      label: ATTRIBUTE_AUTO_BASE_LABEL,
      value,
    },
  }
}

interface AttributeAutoBaseCreationInput {
  target: AttributeTargetId
  level: unknown
  initialValue: unknown
  submittedValue: unknown
  existingUserBases: UserModifierContribution[]
}

interface AttributeAutoBaseRemovalInput {
  target: AttributeTargetId
  level: unknown
  submittedValue: unknown
  existingUserBases: UserModifierContribution[]
}

function isBlank(value: unknown): boolean {
  return typeof value !== "string" || value.trim() === ""
}

function isLevelOne(level: unknown): boolean {
  return parseNumberOr(level, 1) === 1
}

export function getAttributeAutoBaseCreation(input: AttributeAutoBaseCreationInput): UserModifierContribution | undefined {
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
