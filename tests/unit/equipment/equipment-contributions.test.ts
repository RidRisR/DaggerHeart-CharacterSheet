import { describe, expect, it } from "vitest"
import {
  createDefaultEquipmentModifierContribution,
  createEquipmentContributionId,
  EQUIPMENT_TARGET_LABELS,
  sanitizeEquipmentModifierContributions,
} from "@/lib/equipment/contribution-utils"

describe("equipment contribution utilities", () => {
  it("creates default modifier contributions with empty label placeholders stored as data", () => {
    const contribution = createDefaultEquipmentModifierContribution("weapon:primary")

    expect(contribution).toMatchObject({
      definition: { target: "evasion", kind: "modifier" },
      editable: { label: "", value: 0 },
    })
    expect(contribution.id).toMatch(/^equipment:weapon:primary:/)
  })

  it("creates unique ids for the same slot", () => {
    const first = createEquipmentContributionId("weapon:primary")
    const second = createEquipmentContributionId("weapon:primary")

    expect(first).not.toBe(second)
    expect(first).toMatch(/^equipment:weapon:primary:/)
    expect(second).toMatch(/^equipment:weapon:primary:/)
  })

  it("keeps only equipment modifier targets and modifier kind", () => {
    const sanitized = sanitizeEquipmentModifierContributions([
      {
        id: "valid",
        definition: { target: "armorMax", kind: "modifier" },
        editable: { label: "保护", value: 1 },
      },
      {
        id: "experience",
        definition: { target: "experienceValues.0", kind: "modifier" },
        editable: { label: "经历", value: 1 },
      },
      {
        id: "base",
        definition: { target: "evasion", kind: "base" },
        editable: { label: "基础", value: 12 },
      },
      {
        id: "bad-value",
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "坏值", value: "1" },
      },
    ])

    expect(sanitized).toEqual([
      {
        id: "valid",
        definition: { target: "armorMax", kind: "modifier" },
        editable: { label: "保护", value: 1 },
      },
    ])
  })

  it("keeps the first valid contribution when duplicate ids are present", () => {
    const sanitized = sanitizeEquipmentModifierContributions([
      {
        id: "duplicate",
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "first", value: 1 },
      },
      {
        id: "duplicate",
        definition: { target: "armorMax", kind: "modifier" },
        editable: { label: "second", value: 2 },
      },
      {
        id: "unique",
        definition: { target: "agility.value", kind: "modifier" },
        editable: { label: "third", value: 3 },
      },
    ])

    expect(sanitized).toEqual([
      {
        id: "duplicate",
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "first", value: 1 },
      },
      {
        id: "unique",
        definition: { target: "agility.value", kind: "modifier" },
        editable: { label: "third", value: 3 },
      },
    ])
  })

  it("exposes user-facing target labels", () => {
    expect(EQUIPMENT_TARGET_LABELS.evasion).toBe("闪避")
    expect(EQUIPMENT_TARGET_LABELS["agility.value"]).toBe("敏捷")
    expect(EQUIPMENT_TARGET_LABELS.armorMax).toBe("护甲值")
  })
})
