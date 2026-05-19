import { render, screen, within } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import CharacterSheet from "@/components/character-sheet"
import { resetSheetStore, sheet } from "./automation/test-helpers"

describe("CharacterSheet equipment fields", () => {
  it("places equipment provider anchors in section headers", () => {
    resetSheetStore()

    render(<CharacterSheet />)

    const primaryHeader = screen.getByText("主武器").closest("h4")
    const secondaryHeader = screen.getByText("副武器").closest("h4")
    const armorHeader = screen.getByText("护甲").closest("h4")
    const inventoryWeaponsHeader = screen.getByText("备用武器").closest("h3")

    expect(primaryHeader).toBeTruthy()
    expect(secondaryHeader).toBeTruthy()
    expect(armorHeader).toBeTruthy()
    expect(inventoryWeaponsHeader).toBeTruthy()
    expect(within(primaryHeader!).getByRole("button", { name: "查看主武器来源" })).toBeTruthy()
    expect(within(secondaryHeader!).getByRole("button", { name: "查看副武器来源" })).toBeTruthy()
    expect(within(armorHeader!).getByRole("button", { name: "查看护甲来源" })).toBeTruthy()
    expect(within(inventoryWeaponsHeader!).getByRole("button", { name: "查看备用武器 1来源" })).toBeTruthy()
  })

  it("stores the final armor max input as a number", async () => {
    const user = userEvent.setup()
    resetSheetStore({ armorMax: 3 })

    const { container } = render(<CharacterSheet />)
    const input = container.querySelector<HTMLInputElement>('input[name="armorMax"]')
    expect(input).toBeTruthy()

    await user.clear(input!)
    await user.type(input!, "5")
    await user.tab()

    expect(sheet().armorMax).toBe(5)
  })

  it("keeps evasion edits as local draft until final target commit", async () => {
    const user = userEvent.setup()
    resetSheetStore({
      evasion: "12",
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "Base", value: 12 },
        },
      ],
      modifierState: {
        targetStates: {
          evasion: {
            activeBaseId: "user:evasion-base",
            autoCalculation: true,
          },
        },
        entryStates: {},
      },
    })

    const { container } = render(<CharacterSheet />)
    const input = container.querySelector<HTMLInputElement>('input[name="evasion"]')
    expect(input).toBeTruthy()

    await user.clear(input!)
    await user.type(input!, "15")

    expect(input).toHaveValue("15")
    expect(sheet().evasion).toBe("12")

    await user.tab()

    expect(sheet().evasion).toBe("15")
  })

  it("rejects non-numeric armor max input without overwriting the previous value", async () => {
    const user = userEvent.setup()
    resetSheetStore({ armorMax: 3 })

    const { container } = render(<CharacterSheet />)
    const input = container.querySelector<HTMLInputElement>('input[name="armorMax"]')
    expect(input).toBeTruthy()

    await user.clear(input!)
    await user.type(input!, "abc")
    await user.tab()

    expect(sheet().armorMax).toBe(3)
  })

  it("rejects armor max input with a numeric prefix without keeping the prefix", async () => {
    const user = userEvent.setup()
    resetSheetStore({ armorMax: 3 })

    const { container } = render(<CharacterSheet />)
    const input = container.querySelector<HTMLInputElement>('input[name="armorMax"]')
    expect(input).toBeTruthy()

    await user.clear(input!)
    await user.type(input!, "4x")
    await user.tab()

    expect(sheet().armorMax).toBe(3)
  })
})
