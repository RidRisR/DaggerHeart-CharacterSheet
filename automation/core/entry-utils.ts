import type {
  ModifierContribution,
  ModifierEntry,
  ModifierEntryId,
  ModifierEntryKind,
  ModifierSourceType,
  ModifierTargetId,
} from "@/automation/core/types"

interface CreateModifierEntryInput {
  id: ModifierEntryId
  target: ModifierTargetId
  kind: ModifierEntryKind
  label: string
  value: number
  sourceType: ModifierSourceType
  sourceId: string
  priority: number
}

interface ContributionToEntryContext {
  sourceType: ModifierSourceType
  sourceId: string
  priority: number
  formatLabel?: (label: string) => string
}

export function createModifierEntry(input: CreateModifierEntryInput): ModifierEntry {
  return {
    id: input.id,
    definition: {
      target: input.target,
      kind: input.kind,
    },
    presentation: {
      label: input.label,
      value: input.value,
    },
    source: {
      type: input.sourceType,
      id: input.sourceId,
    },
    priority: input.priority,
  }
}

export function contributionToEntry(
  contribution: ModifierContribution,
  context: ContributionToEntryContext,
): ModifierEntry {
  const label = context.formatLabel
    ? context.formatLabel(contribution.editable.label)
    : contribution.editable.label

  return {
    id: contribution.id,
    definition: contribution.definition,
    presentation: {
      label,
      value: contribution.editable.value,
    },
    source: {
      type: context.sourceType,
      id: context.sourceId,
    },
    priority: context.priority,
  }
}

export function entryTarget(entry: ModifierEntry): ModifierTargetId {
  return entry.definition.target
}

export function entryKind(entry: ModifierEntry): ModifierEntryKind {
  return entry.definition.kind
}

export function entryLabel(entry: ModifierEntry): string {
  return entry.presentation.label
}

export function entryValue(entry: ModifierEntry): number {
  return entry.presentation.value
}
