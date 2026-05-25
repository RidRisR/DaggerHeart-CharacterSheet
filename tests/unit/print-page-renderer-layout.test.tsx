import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import { PrintPageRenderer } from "@/components/print/print-page-renderer"
import type { SheetData } from "@/lib/sheet-data"

vi.mock("@/lib/page-registry", () => ({
  getVisiblePages: () => [
    {
      id: "page-one",
      printClass: "page-one",
      component: () => <div>第一页</div>,
    },
    {
      id: "page-two",
      printClass: "page-two",
      component: () => <div>第二页</div>,
    },
  ],
}))

describe("PrintPageRenderer layout", () => {
  it("leaves screen-only bottom space after the last preview page for the fixed dock", () => {
    const { container } = render(<PrintPageRenderer sheetData={{} as SheetData} />)

    const wrapper = container.firstElementChild
    expect(wrapper).not.toBeNull()
    expect(wrapper?.className).toContain("pb-40")
    expect(wrapper?.className).toContain("print:pb-0")
  })
})
