import { describe, expect, it } from "vitest"

import {
  isAttributeKey,
  isFixedUpgradeTargetId,
  mergeLegacyUpgradeStateFields,
  mergeUpgradeState,
  sanitizeUpgradeStates,
} from "@/lib/modifiers/upgrade-states"

describe("upgrade states", () => {
  it("recognizes only supported fixed targets and attribute keys", () => {
    expect(isFixedUpgradeTargetId("hpMax")).toBe(true)
    expect(isFixedUpgradeTargetId("stressMax")).toBe(true)
    expect(isFixedUpgradeTargetId("evasion")).toBe(true)
    expect(isFixedUpgradeTargetId("proficiency")).toBe(true)
    expect(isFixedUpgradeTargetId("armorMax")).toBe(false)

    expect(isAttributeKey("agility")).toBe(true)
    expect(isAttributeKey("strength")).toBe(true)
    expect(isAttributeKey("finesse")).toBe(true)
    expect(isAttributeKey("instinct")).toBe(true)
    expect(isAttributeKey("presence")).toBe(true)
    expect(isAttributeKey("knowledge")).toBe(true)
    expect(isAttributeKey("agility.value")).toBe(false)
  })

  it("sanitizes valid fixed target, attribute, and experience states", () => {
    expect(
      sanitizeUpgradeStates({
        "tier1-1-0": { checked: true, params: { target: "hpMax" }, extra: "drop" },
        "tier1-2-0": { checked: true, params: { target: "stressMax" } },
        "tier1-5-0": { checked: true, params: { target: "evasion" } },
        "tier2-1": { checked: true, params: { target: "proficiency" } },
        "tier1-0-2": { checked: true, params: { attributes: ["agility", "strength"] } },
        "tier1-exp-0": { checked: true, params: { experienceIndexes: [0, 4] } },
      }),
    ).toEqual({
      "tier1-1-0": { checked: true, params: { target: "hpMax" } },
      "tier1-2-0": { checked: true, params: { target: "stressMax" } },
      "tier1-5-0": { checked: true, params: { target: "evasion" } },
      "tier2-1": { checked: true, params: { target: "proficiency" } },
      "tier1-0-2": { checked: true, params: { attributes: ["agility", "strength"] } },
      "tier1-exp-0": { checked: true, params: { experienceIndexes: [0, 4] } },
    })
  })

  it("keeps checked true states without params for migration history", () => {
    expect(sanitizeUpgradeStates({ "tier1-0-2": { checked: true } })).toEqual({
      "tier1-0-2": { checked: true },
    })
  })

  it("clears params from unchecked states", () => {
    expect(
      sanitizeUpgradeStates({
        "tier1-5-0": { checked: false, params: { target: "evasion" } },
      }),
    ).toEqual({
      "tier1-5-0": { checked: false },
    })
  })

  it("keeps checked true state when params are invalid", () => {
    expect(
      sanitizeUpgradeStates({
        badTarget: { checked: true, params: { target: "armorMax" } },
        badAttribute: { checked: true, params: { attributes: ["agility", "armor"] } },
        emptyAttributes: { checked: true, params: { attributes: [] } },
        badExperience: { checked: true, params: { experienceIndexes: [0, -1] } },
        emptyExperience: { checked: true, params: { experienceIndexes: [] } },
      }),
    ).toEqual({
      badTarget: { checked: true },
      badAttribute: { checked: true },
      emptyAttributes: { checked: true },
      badExperience: { checked: true },
      emptyExperience: { checked: true },
    })
  })

  it("drops invalid state records and non-object containers", () => {
    expect(sanitizeUpgradeStates(null)).toEqual({})
    expect(
      sanitizeUpgradeStates({
        nullState: null,
        arrayState: [],
        checkedString: { checked: "true" },
        valid: { checked: true },
      }),
    ).toEqual({
      valid: { checked: true },
    })
  })

  it("merges checked states without losing existing params", () => {
    expect(
      mergeUpgradeState(
        { checked: true, params: { attributes: ["presence", "knowledge"] } },
        { checked: true },
      ),
    ).toEqual({
      checked: true,
      params: { attributes: ["presence", "knowledge"] },
    })

    expect(
      mergeUpgradeState(
        { checked: true, params: { target: "hpMax" } },
        { checked: true, params: { target: "stressMax" } },
      ),
    ).toEqual({
      checked: true,
      params: { target: "stressMax" },
    })

    expect(mergeUpgradeState({ checked: true, params: { target: "hpMax" } }, { checked: false })).toEqual({
      checked: false,
    })
  })

  it("drops invalid next params instead of preserving or applying them", () => {
    expect(
      mergeUpgradeState(
        { checked: true, params: { target: "hpMax" } },
        { checked: true, params: { target: "armorMax" } as any },
      ),
    ).toEqual({
      checked: true,
    })
  })

  it("preserves current params when checked update has params undefined", () => {
    expect(
      mergeUpgradeState(
        { checked: true, params: { target: "hpMax" } },
        { checked: true, params: undefined },
      ),
    ).toEqual({
      checked: true,
      params: { target: "hpMax" },
    })
  })

  it("preserves legacy automation params when checkedUpgrades has the same check key", () => {
    expect(
      mergeLegacyUpgradeStateFields({
        checkedUpgrades: {
          "tier1-5-0": { 5: true },
        },
        automationSelections: {
          "upgrade:tier1-5-0": {
            selected: true,
            params: { target: "evasion" },
          },
        },
      }),
    ).toEqual({
      "tier1-5-0": { checked: true, params: { target: "evasion" } },
    })
  })

  it("does not bridge legacy checkedUpgrades bucket keys into upgradeStates", () => {
    expect(
      mergeLegacyUpgradeStateFields({
        checkedUpgrades: {
          tier1: { 5: true },
          tier2: { 1: true },
          tier3: { 2: true },
          "tier1-5-0": { 5: true },
          "tier2-1": { 1: true },
        },
      }),
    ).toEqual({
      "tier1-5-0": { checked: true },
      "tier2-1": { checked: true },
    })
  })
})
