import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

describe("Dialog", () => {
  it("uses the same 50 percent black overlay as existing selection modals", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Dialog title</DialogTitle>
          <DialogDescription>Dialog description</DialogDescription>
        </DialogContent>
      </Dialog>,
    )

    expect(screen.getByRole("dialog", { name: "Dialog title" })).toBeTruthy()

    const overlay = Array.from(document.body.querySelectorAll<HTMLElement>('[data-state="open"]')).find(
      (element) => element.className.includes("bg-black"),
    )

    expect(overlay?.className).toContain("bg-black/50")
    expect(overlay?.className).not.toContain("bg-black/80")
  })
})
