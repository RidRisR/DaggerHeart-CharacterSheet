import { cleanup, render, screen } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { AttributesSection } from "@/components/character-sheet-sections/attributes-section"
import { getAttributeAutoBaseId } from "@/lib/modifiers/attribute-auto-base"
import { getManualBaseId, getUnattributedDeltaId } from "@/lib/modifiers/special-contributions"
import type { UserModifierContribution } from "@/lib/modifiers/types"
import { resetSheetStore, sheet } from "../automation/test-helpers"

function autoBase() {
  return (sheet().userModifierContributions ?? [])
    .find(contribution => contribution.id === getAttributeAutoBaseId("agility.value"))
}

function manualBase(id = "user:agility.value:base:manual"): UserModifierContribution {
  return {
    id,
    definition: {
      target: "agility.value",
      kind: "base",
    },
    editable: {
      label: "手动基础值",
      value: 1,
    },
  }
}

async function editAgility(value: string) {
  const input = screen.getAllByRole("textbox")[0]
  await userEvent.click(input)
  await userEvent.type(input, value)
  await userEvent.tab()
}

describe("attribute auto base section behavior", () => {
  it("commits a level 1 empty attribute edit as final text without creating sources when auto calculation is off", async () => {
    resetSheetStore({
      level: "1",
      agility: { value: "", checked: false, spellcasting: false },
      userModifierContributions: [],
      modifierState: {
        targetStates: {
          "agility.value": { autoCalculation: false },
        },
        entryStates: {},
      },
    })

    render(<AttributesSection />)

    await editAgility("2")

    expect(sheet().agility?.value).toBe("2")
    expect(sheet().userModifierContributions).toEqual([])
    expect(sheet().modifierState?.targetStates["agility.value"]).toEqual({ autoCalculation: false })
  })

  it("does not create auto bases for signed, zero, or negative values when auto calculation is off", async () => {
    resetSheetStore({
      level: "",
      agility: { value: "", checked: false, spellcasting: false },
      userModifierContributions: [],
      modifierState: {
        targetStates: {
          "agility.value": { autoCalculation: false },
        },
        entryStates: {},
      },
    })

    render(<AttributesSection />)

    await editAgility("+2")
    expect(sheet().agility?.value).toBe("+2")
    expect(sheet().userModifierContributions).toEqual([])

    cleanup()
    resetSheetStore({
      level: "abc",
      agility: { value: "", checked: false, spellcasting: false },
      userModifierContributions: [],
      modifierState: {
        targetStates: {
          "agility.value": { autoCalculation: false },
        },
        entryStates: {},
      },
    })
    render(<AttributesSection />)
    await editAgility("0")
    expect(sheet().agility?.value).toBe("0")
    expect(sheet().userModifierContributions).toEqual([])

    cleanup()
    resetSheetStore({
      level: "1",
      agility: { value: "", checked: false, spellcasting: false },
      userModifierContributions: [],
      modifierState: {
        targetStates: {
          "agility.value": { autoCalculation: false },
        },
        entryStates: {},
      },
    })
    render(<AttributesSection />)
    await editAgility("-1")
    expect(sheet().agility?.value).toBe("-1")
    expect(sheet().userModifierContributions).toEqual([])
  })

  it("does not create an auto base above level 1, from non-empty starts, invalid expressions, or existing user bases", async () => {
    resetSheetStore({
      level: "2",
      agility: { value: "", checked: false, spellcasting: false },
    })
    render(<AttributesSection />)
    await editAgility("12+1")
    expect(autoBase()).toBeUndefined()

    cleanup()
    resetSheetStore({
      level: "1",
      agility: { value: "1", checked: false, spellcasting: false },
    })
    render(<AttributesSection />)
    const nonEmptyInput = screen.getByDisplayValue("1")
    await userEvent.click(nonEmptyInput)
    await userEvent.clear(nonEmptyInput)
    await userEvent.type(nonEmptyInput, "12+1")
    await userEvent.tab()
    expect(autoBase()).toBeUndefined()

    cleanup()
    resetSheetStore({
      level: "1",
      agility: { value: "", checked: false, spellcasting: false },
    })
    render(<AttributesSection />)
    await editAgility("12+敏捷")
    expect(autoBase()).toBeUndefined()

    cleanup()
    resetSheetStore({
      level: "1",
      agility: { value: "", checked: false, spellcasting: false },
      userModifierContributions: [manualBase()],
    })
    render(<AttributesSection />)
    await editAgility("12+1")
    expect(autoBase()).toBeUndefined()
  })

  it("removes the sole auto base when the attribute is cleared", async () => {
    const auto = {
      ...manualBase(getAttributeAutoBaseId("agility.value")),
      editable: {
        label: "手动基础值",
        value: 13,
      },
    }
    resetSheetStore({
      level: "1",
      agility: { value: "12+1", checked: false, spellcasting: false },
      userModifierContributions: [auto],
      modifierState: {
        targetStates: {
          "agility.value": {
            activeBaseId: auto.id,
          },
        },
        entryStates: {},
      },
    })

    render(<AttributesSection />)
    const input = screen.getByDisplayValue("12+1")
    await userEvent.click(input)
    await userEvent.clear(input)
    await userEvent.tab()

    expect(sheet().agility?.value).toBe("")
    expect(autoBase()).toBeUndefined()
    expect(sheet().modifierState?.targetStates["agility.value"]).toBeUndefined()
  })

  it("does not remove auto base when another user base exists", async () => {
    const auto = {
      ...manualBase(getAttributeAutoBaseId("agility.value")),
      editable: {
        label: "手动基础值",
        value: 13,
      },
    }
    resetSheetStore({
      level: "1",
      agility: { value: "12+1", checked: false, spellcasting: false },
      userModifierContributions: [auto, manualBase()],
      modifierState: {
        targetStates: {
          "agility.value": {
            activeBaseId: auto.id,
          },
        },
        entryStates: {},
      },
    })

    render(<AttributesSection />)
    const input = screen.getByDisplayValue("12+1")
    await userEvent.click(input)
    await userEvent.clear(input)
    await userEvent.tab()

    expect(autoBase()).toBeDefined()
  })

  it("reconciles attribute blur through final target commit when auto calculation is enabled", async () => {
    resetSheetStore({
      level: "2",
      agility: { value: "12", checked: false, spellcasting: false },
      userModifierContributions: [manualBase()],
      modifierState: {
        targetStates: {
          "agility.value": {
            activeBaseId: "user:agility.value:base:manual",
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
    })

    render(<AttributesSection />)
    const input = screen.getByDisplayValue("12")
    await userEvent.click(input)
    await userEvent.clear(input)
    await userEvent.type(input, "15")
    await userEvent.tab()

    expect(sheet().agility?.value).toBe("15")
    expect(sheet().userModifierContributions).toContainEqual({
      id: getUnattributedDeltaId("agility.value"),
      definition: { target: "agility.value", kind: "modifier" },
      editable: { label: "未归因差额", value: 14 },
    })
  })

  it("uses final target reconciliation instead of auto-base creation for auto-calculated empty attributes", async () => {
    resetSheetStore({
      level: "1",
      agility: { value: "", checked: false, spellcasting: false },
      userModifierContributions: [],
      modifierState: {
        targetStates: {
          "agility.value": { autoCalculation: true },
        },
        entryStates: {},
      },
    })

    render(<AttributesSection />)
    await editAgility("12")

    expect(autoBase()).toBeUndefined()
    expect(sheet().userModifierContributions).toContainEqual({
      id: getManualBaseId("agility.value"),
      definition: { target: "agility.value", kind: "base" },
      editable: { label: "手动基础值", value: 12 },
    })
  })
})
