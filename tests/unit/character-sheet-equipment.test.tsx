import { render } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import CharacterSheet from "@/components/character-sheet"
import { resetSheetStore, sheet } from "./automation/test-helpers"

describe("CharacterSheet equipment fields", () => {
  it("stores the final armor max input as a number", async () => {
    const user = userEvent.setup()
    resetSheetStore({ armorMax: 3 })

    const { container } = render(<CharacterSheet />)
    const input = container.querySelector<HTMLInputElement>('input[name="armorMax"]')
    expect(input).toBeTruthy()

    await user.clear(input!)
    await user.type(input!, "5")

    expect(sheet().armorMax).toBe(5)
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
})
