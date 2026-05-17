import { describe, expect, it } from "vitest"

import {
  OTHER_ADJUSTMENT_PRESENTATION,
  createManualFinalAdjustment,
  createOtherAdjustment,
  createUnknownMigrationDifference,
  createUnattributedDifference,
  deriveUnattributedDifference,
  getOtherAdjustmentId,
  isModifierTargetId,
  isOtherAdjustmentKind,
  removeOtherAdjustment,
  sanitizeOtherAdjustments,
  sumOtherAdjustments,
  upsertOtherAdjustment,
} from "@/lib/modifiers/other-adjustments"

describe("other adjustments", () => {
  it("creates stable per-target ids", () => {
    expect(getOtherAdjustmentId("evasion", "unknownMigrationDifference")).toBe(
      "other:evasion:unknown-migration-difference",
    )
    expect(getOtherAdjustmentId("evasion", "manualFinalAdjustment")).toBe(
      "other:evasion:manual-final-adjustment",
    )
    expect(getOtherAdjustmentId("evasion", "unattributedDifference")).toBe(
      "other:evasion:unattributed-difference",
    )
    expect(getOtherAdjustmentId("experienceValues.12", "manualFinalAdjustment")).toBe(
      "other:experienceValues.12:manual-final-adjustment",
    )
  })

  it("maps each kind to its user-facing presentation", () => {
    expect(OTHER_ADJUSTMENT_PRESENTATION.unknownMigrationDifference).toEqual({
      badge: "迁移",
      label: "未知迁移差额",
      editable: true,
      removableWhenAutoCalculation: "always",
    })
    expect(OTHER_ADJUSTMENT_PRESENTATION.manualFinalAdjustment).toEqual({
      badge: "用户",
      label: "手动修改终值",
      editable: true,
      removableWhenAutoCalculation: "always",
    })
    expect(OTHER_ADJUSTMENT_PRESENTATION.unattributedDifference).toEqual({
      badge: "同步",
      label: "未归因差额",
      editable: false,
      removableWhenAutoCalculation: "autoOnly",
    })
  })

  it("recognizes only supported other adjustment kinds", () => {
    expect(isOtherAdjustmentKind("unknownMigrationDifference")).toBe(true)
    expect(isOtherAdjustmentKind("manualFinalAdjustment")).toBe(true)
    expect(isOtherAdjustmentKind("unattributedDifference")).toBe(true)
    expect(isOtherAdjustmentKind("legacyDelta")).toBe(false)
    expect(isOtherAdjustmentKind(null)).toBe(false)
  })

  it("recognizes only real modifier targets including non-negative integer experience targets", () => {
    expect(isModifierTargetId("evasion")).toBe(true)
    expect(isModifierTargetId("armorMax")).toBe(true)
    expect(isModifierTargetId("minorThreshold")).toBe(true)
    expect(isModifierTargetId("majorThreshold")).toBe(true)
    expect(isModifierTargetId("hpMax")).toBe(true)
    expect(isModifierTargetId("stressMax")).toBe(true)
    expect(isModifierTargetId("proficiency")).toBe(true)
    expect(isModifierTargetId("agility.value")).toBe(true)
    expect(isModifierTargetId("knowledge.value")).toBe(true)
    expect(isModifierTargetId("experienceValues.0")).toBe(true)
    expect(isModifierTargetId("experienceValues.12")).toBe(true)

    expect(isModifierTargetId("not-a-target")).toBe(false)
    expect(isModifierTargetId("agility")).toBe(false)
    expect(isModifierTargetId("experienceValues.-1")).toBe(false)
    expect(isModifierTargetId("experienceValues.1.5")).toBe(false)
    expect(isModifierTargetId("experienceValues.01")).toBe(false)
    expect(isModifierTargetId(1)).toBe(false)
  })

  it("sanitizes valid adjustments, regenerates ids, and removes duplicate kind per target", () => {
    const sanitized = sanitizeOtherAdjustments([
      { ...createUnknownMigrationDifference("evasion", 1), id: "legacy-id" },
      createUnknownMigrationDifference("evasion", 2),
      createManualFinalAdjustment("evasion", -1),
      { id: "bad", target: "not-a-target", kind: "manualFinalAdjustment", value: 1 },
      { id: "bad-value", target: "hpMax", kind: "manualFinalAdjustment", value: "1" },
      {
        id: "bad-infinite",
        target: "hpMax",
        kind: "manualFinalAdjustment",
        value: Number.POSITIVE_INFINITY,
      },
      { id: "bad-kind", target: "hpMax", kind: "legacyDelta", value: 1 },
    ])

    expect(sanitized).toEqual([
      createUnknownMigrationDifference("evasion", 1),
      createManualFinalAdjustment("evasion", -1),
    ])
  })

  it("allows all three other adjustment kinds to coexist on the same target", () => {
    expect(
      sanitizeOtherAdjustments([
        createUnknownMigrationDifference("stressMax", 1),
        createManualFinalAdjustment("stressMax", 2),
        createUnattributedDifference("stressMax", 3),
      ]),
    ).toEqual([
      createUnknownMigrationDifference("stressMax", 1),
      createManualFinalAdjustment("stressMax", 2),
      createUnattributedDifference("stressMax", 3),
    ])
  })

  it("creates specific other adjustment shapes through the generic factory", () => {
    expect(createOtherAdjustment("hpMax", "manualFinalAdjustment", 2)).toEqual(
      createManualFinalAdjustment("hpMax", 2),
    )
  })

  it("upserts, removes, and sums sanitized adjustments", () => {
    const initial = [
      createUnknownMigrationDifference("evasion", 1),
      createManualFinalAdjustment("evasion", 2),
      createUnknownMigrationDifference("hpMax", 3),
      { id: "bad", target: "bad-target", kind: "manualFinalAdjustment", value: 99 },
    ]

    const upserted = upsertOtherAdjustment(
      initial,
      createUnknownMigrationDifference("evasion", 5),
    )

    expect(upserted).toEqual([
      createUnknownMigrationDifference("evasion", 5),
      createManualFinalAdjustment("evasion", 2),
      createUnknownMigrationDifference("hpMax", 3),
    ])
    expect(sumOtherAdjustments(upserted, "evasion")).toBe(7)
    expect(sumOtherAdjustments(upserted, "hpMax")).toBe(3)
    expect(sumOtherAdjustments(upserted)).toBe(10)

    expect(
      removeOtherAdjustment(
        upserted,
        getOtherAdjustmentId("evasion", "manualFinalAdjustment"),
      ),
    ).toEqual([
      createUnknownMigrationDifference("evasion", 5),
      createUnknownMigrationDifference("hpMax", 3),
    ])
  })

  it("derives unattributed difference from final, reference, and saved other adjustments", () => {
    expect(
      deriveUnattributedDifference({
        target: "evasion",
        finalValue: 18,
        referenceTotal: 12,
        otherAdjustments: [
          createUnknownMigrationDifference("evasion", 1),
          createManualFinalAdjustment("evasion", 2),
          createManualFinalAdjustment("hpMax", 10),
        ],
      }),
    ).toBe(3)

    expect(
      deriveUnattributedDifference({
        target: "evasion",
        finalValue: undefined,
        referenceTotal: 12,
        otherAdjustments: [],
      }),
    ).toBeUndefined()
    expect(
      deriveUnattributedDifference({
        target: "evasion",
        finalValue: 12,
        referenceTotal: Number.NaN,
        otherAdjustments: [],
      }),
    ).toBeUndefined()
  })
})
