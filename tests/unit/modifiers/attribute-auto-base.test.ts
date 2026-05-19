import { describe, expect, it } from "vitest"
import {
  createAttributeAutoBaseEntry,
  getAttributeAutoBaseCreation,
  getAttributeAutoBaseId,
  shouldRemoveAttributeAutoBase,
} from "@/automation/core/attribute-auto-base"
import type { UserModifierContribution } from "@/automation/core/types"

function userBase(id: string): UserModifierContribution {
  return {
    id,
    definition: {
      target: "agility.value",
      kind: "base",
    },
    editable: {
      label: "用户基础值",
      value: 2,
    },
  }
}

describe("attribute auto base", () => {
  it("uses a stable auto base id", () => {
    expect(getAttributeAutoBaseId("agility.value")).toBe("user:agility.value:auto-base")
  })

  it("creates an auto base for a level 1 empty-start numeric expression", () => {
    const entry = getAttributeAutoBaseCreation({
      target: "agility.value",
      level: "1",
      initialValue: "",
      submittedValue: "12+1",
      existingUserBases: [],
    })

    expect(entry).toEqual(createAttributeAutoBaseEntry("agility.value", 13))
  })

  it("treats blank and invalid levels as level 1", () => {
    expect(getAttributeAutoBaseCreation({
      target: "agility.value",
      level: "",
      initialValue: "",
      submittedValue: "+2",
      existingUserBases: [],
    })?.editable.value).toBe(2)

    expect(getAttributeAutoBaseCreation({
      target: "agility.value",
      level: "abc",
      initialValue: "",
      submittedValue: "-1",
      existingUserBases: [],
    })?.editable.value).toBe(-1)
  })

  it("does not create when level is above 1, start is non-empty, value is invalid, or user base exists", () => {
    expect(getAttributeAutoBaseCreation({
      target: "agility.value",
      level: "2",
      initialValue: "",
      submittedValue: "12+1",
      existingUserBases: [],
    })).toBeUndefined()

    expect(getAttributeAutoBaseCreation({
      target: "agility.value",
      level: "1",
      initialValue: "1",
      submittedValue: "12+1",
      existingUserBases: [],
    })).toBeUndefined()

    expect(getAttributeAutoBaseCreation({
      target: "agility.value",
      level: "1",
      initialValue: "",
      submittedValue: "12+敏捷",
      existingUserBases: [],
    })).toBeUndefined()

    expect(getAttributeAutoBaseCreation({
      target: "agility.value",
      level: "1",
      initialValue: "",
      submittedValue: "12+1",
      existingUserBases: [userBase("user:agility.value:base:manual")],
    })).toBeUndefined()
  })

  it("removes only the sole auto-created user base when cleared at level 1", () => {
    const autoBase = createAttributeAutoBaseEntry("agility.value", 13)

    expect(shouldRemoveAttributeAutoBase({
      target: "agility.value",
      level: "1",
      submittedValue: "",
      existingUserBases: [autoBase],
    })).toBe(true)

    expect(shouldRemoveAttributeAutoBase({
      target: "agility.value",
      level: "2",
      submittedValue: "",
      existingUserBases: [autoBase],
    })).toBe(false)

    expect(shouldRemoveAttributeAutoBase({
      target: "agility.value",
      level: "1",
      submittedValue: "1",
      existingUserBases: [autoBase],
    })).toBe(false)

    expect(shouldRemoveAttributeAutoBase({
      target: "agility.value",
      level: "1",
      submittedValue: "",
      existingUserBases: [autoBase, userBase("user:agility.value:base:manual")],
    })).toBe(false)
  })
})
