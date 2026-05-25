import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import { BaseCardModal } from "@/components/modals/base/BaseCardModal"

vi.mock("@/hooks/use-modal-keyboard", () => ({
  useModalKeyboard: vi.fn(),
}))

describe("BaseCardModal layout", () => {
  it("uses a narrower default sidebar on touch-sized layouts and restores desktop width for fine pointers", () => {
    const { getByText } = render(
      <BaseCardModal
        isOpen
        onClose={() => {}}
        header={<div>Header</div>}
        sidebar={<div>Sidebar</div>}
      >
        <div>Content</div>
      </BaseCardModal>,
    )

    const sidebar = getByText("Sidebar").parentElement
    expect(sidebar).not.toBeNull()
    expect(sidebar?.className).toContain("w-36")
    expect(sidebar?.className).toContain("[@media_(hover:hover)_and_(pointer:fine)]:w-48")
  })
})
