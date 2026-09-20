import "@testing-library/jest-dom/vitest"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { PageVisibilityDropdown } from "@/components/ui/page-visibility-dropdown"
import { resetSheetStore, sheet } from "./automation/test-helpers"

describe("PageVisibilityDropdown", () => {
  beforeEach(() => {
    resetSheetStore({
      pageVisibility: {
        rangerCompanion: false,
        armorTemplate: false,
        adventureNotes: false,
        beastForms: false,
      },
    })
  })

  it("keeps the menu open while toggling multiple pages", () => {
    render(<PageVisibilityDropdown />)

    const trigger = screen.getByRole("button", { name: "页面管理" })
    fireEvent.pointerDown(trigger)

    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /野兽形态/ }))
    expect(sheet()?.pageVisibility?.beastForms).toBe(true)

    const rangerCompanion = screen.getByRole("menuitemcheckbox", { name: /游侠伙伴/ })
    fireEvent.click(rangerCompanion)

    expect(sheet()?.pageVisibility?.rangerCompanion).toBe(true)
    expect(screen.getByRole("menuitemcheckbox", { name: /游侠伙伴/ }))
      .toHaveAttribute("aria-checked", "true")
    expect(trigger).toHaveAttribute("aria-expanded", "true")

    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: /主板扩展/ }))

    expect(sheet()?.pageVisibility?.armorTemplate).toBe(true)
    expect(sheet()?.pageVisibility?.beastForms).toBe(true)
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /野兽形态/ }))
    expect(sheet()?.pageVisibility?.beastForms).toBe(false)
    expect(sheet()?.pageVisibility?.rangerCompanion).toBe(true)
    expect(sheet()?.pageVisibility?.armorTemplate).toBe(true)
    expect(screen.getByRole("menuitemcheckbox", { name: /游侠伙伴/ })).toBeInTheDocument()
    expect(trigger).toHaveAttribute("aria-expanded", "true")
  })

  it("closes when clicking outside the menu", async () => {
    render(
      <div>
        <PageVisibilityDropdown />
        <button type="button">菜单外部</button>
      </div>,
    )

    const trigger = screen.getByRole("button", { name: "页面管理" })
    const outsideButton = screen.getByRole("button", { name: "菜单外部" })
    fireEvent.pointerDown(trigger)
    expect(screen.getByRole("menuitemcheckbox", { name: /游侠伙伴/ })).toBeInTheDocument()

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    fireEvent.pointerDown(outsideButton, { pointerType: "mouse" })

    await waitFor(() => {
      expect(screen.queryByRole("menuitemcheckbox", { name: /游侠伙伴/ }))
        .not.toBeInTheDocument()
    })
  })
})
