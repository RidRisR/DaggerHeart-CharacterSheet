import type { ModifierContribution, ModifierTargetId } from "@/automation/core/types"

export const MANUAL_BASE_LABEL = "手动基础值"
export const ESTIMATED_BASE_LABEL = "估算基础值"
export const UNATTRIBUTED_DELTA_LABEL = "未归因差额"

export function getManualBaseId(target: ModifierTargetId): string {
  return `user:${target}:manual-base`
}

export function getEstimatedBaseId(target: ModifierTargetId): string {
  return `user:${target}:estimated-base`
}

export function getUnattributedDeltaId(target: ModifierTargetId): string {
  return `user:${target}:unattributed-delta`
}

export function createManualBaseContribution(
  target: ModifierTargetId,
  value: number,
): ModifierContribution {
  return createContribution(target, "base", getManualBaseId(target), MANUAL_BASE_LABEL, value)
}

export function createEstimatedBaseContribution(
  target: ModifierTargetId,
  value: number,
): ModifierContribution {
  return createContribution(target, "base", getEstimatedBaseId(target), ESTIMATED_BASE_LABEL, value)
}

export function createUnattributedDeltaContribution(
  target: ModifierTargetId,
  value: number,
): ModifierContribution {
  return createContribution(
    target,
    "modifier",
    getUnattributedDeltaId(target),
    UNATTRIBUTED_DELTA_LABEL,
    value,
  )
}

export function isManualBaseContribution(contribution: ModifierContribution): boolean {
  return contribution.id === getManualBaseId(contribution.definition.target)
}

export function isEstimatedBaseContribution(contribution: ModifierContribution): boolean {
  return contribution.id === getEstimatedBaseId(contribution.definition.target)
}

export function isUnattributedDeltaContribution(contribution: ModifierContribution): boolean {
  return contribution.id === getUnattributedDeltaId(contribution.definition.target)
}

export function isTargetOwnedSpecialContribution(contribution: ModifierContribution): boolean {
  return (
    isManualBaseContribution(contribution) ||
    isEstimatedBaseContribution(contribution) ||
    isUnattributedDeltaContribution(contribution)
  )
}

function createContribution(
  target: ModifierTargetId,
  kind: ModifierContribution["definition"]["kind"],
  id: string,
  label: string,
  value: number,
): ModifierContribution {
  return {
    id,
    definition: {
      target,
      kind,
    },
    editable: {
      label,
      value,
    },
  }
}
