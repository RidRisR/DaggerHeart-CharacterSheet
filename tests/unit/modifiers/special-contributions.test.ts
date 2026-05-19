import { describe, expect, it } from "vitest"

import {
  ESTIMATED_BASE_LABEL,
  MANUAL_BASE_LABEL,
  UNATTRIBUTED_DELTA_LABEL,
  createEstimatedBaseContribution,
  createManualBaseContribution,
  createUnattributedDeltaContribution,
  getEstimatedBaseId,
  getManualBaseId,
  getUnattributedDeltaId,
  isEstimatedBaseContribution,
  isManualBaseContribution,
  isTargetOwnedSpecialContribution,
  isUnattributedDeltaContribution,
} from "@/automation/core/special-contributions"
import type { ModifierContribution } from "@/automation/core/types"

describe("special modifier contributions", () => {
  it("returns stable special contribution ids", () => {
    expect(getManualBaseId("evasion")).toBe("user:evasion:manual-base")
    expect(getEstimatedBaseId("evasion")).toBe("user:evasion:estimated-base")
    expect(getUnattributedDeltaId("evasion")).toBe("user:evasion:unattributed-delta")
  })

  it("creates fixed-label special contributions with the expected kinds", () => {
    expect(createManualBaseContribution("evasion", 12)).toEqual({
      id: "user:evasion:manual-base",
      definition: {
        target: "evasion",
        kind: "base",
      },
      editable: {
        label: MANUAL_BASE_LABEL,
        value: 12,
      },
    })

    expect(createEstimatedBaseContribution("evasion", 10)).toEqual({
      id: "user:evasion:estimated-base",
      definition: {
        target: "evasion",
        kind: "base",
      },
      editable: {
        label: ESTIMATED_BASE_LABEL,
        value: 10,
      },
    })

    expect(createUnattributedDeltaContribution("evasion", 2)).toEqual({
      id: "user:evasion:unattributed-delta",
      definition: {
        target: "evasion",
        kind: "modifier",
      },
      editable: {
        label: UNATTRIBUTED_DELTA_LABEL,
        value: 2,
      },
    })
  })

  it("detects special contributions by id and target rather than label", () => {
    const manualBase = createManualBaseContribution("evasion", 12)
    const estimatedBase = createEstimatedBaseContribution("evasion", 10)
    const unattributedDelta = createUnattributedDeltaContribution("evasion", 2)

    const ordinaryUserContribution: ModifierContribution = {
      id: "user:evasion:custom",
      definition: {
        target: "evasion",
        kind: "modifier",
      },
      editable: {
        label: UNATTRIBUTED_DELTA_LABEL,
        value: 2,
      },
    }

    const sameIdDifferentTarget: ModifierContribution = {
      ...unattributedDelta,
      definition: {
        target: "armorMax",
        kind: "modifier",
      },
    }

    expect(isManualBaseContribution(manualBase)).toBe(true)
    expect(isEstimatedBaseContribution(estimatedBase)).toBe(true)
    expect(isUnattributedDeltaContribution(unattributedDelta)).toBe(true)
    expect(isTargetOwnedSpecialContribution(manualBase)).toBe(true)
    expect(isTargetOwnedSpecialContribution(estimatedBase)).toBe(true)
    expect(isTargetOwnedSpecialContribution(unattributedDelta)).toBe(true)

    expect(isUnattributedDeltaContribution(ordinaryUserContribution)).toBe(false)
    expect(isTargetOwnedSpecialContribution(ordinaryUserContribution)).toBe(false)
    expect(isUnattributedDeltaContribution(sameIdDifferentTarget)).toBe(false)
    expect(isTargetOwnedSpecialContribution(sameIdDifferentTarget)).toBe(false)
  })
})
