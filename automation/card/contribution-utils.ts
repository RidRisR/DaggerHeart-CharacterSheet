import { isModifierTargetId } from "@/automation/core/other-adjustments"
import { createModifierEntry } from "@/automation/core/entry-utils"
import type { ModifierEntry } from "@/automation/core/types"
import type { CardModifierContribution } from "@/card/automation/ir-types"

const CARD_BASE_PRIORITY = 110
const CARD_MODIFIER_PRIORITY = 160

function cardContributionPriority(contribution: CardModifierContribution): number {
  return contribution.kind === "base" ? CARD_BASE_PRIORITY : CARD_MODIFIER_PRIORITY
}

export function cardContributionToEntry(
  contribution: CardModifierContribution,
): ModifierEntry[] {
  if (!Number.isFinite(contribution.value)) return []
  if (!isModifierTargetId(contribution.target)) return []

  const sourceId = `card:${contribution.source.cardInstanceId}:${contribution.source.abilityId}`

  return [
    createModifierEntry({
      id: contribution.id,
      target: contribution.target,
      kind: contribution.kind,
      label: contribution.source.cardName,
      value: contribution.value,
      sourceType: "card",
      sourceId,
      priority: cardContributionPriority(contribution),
    }),
  ]
}
