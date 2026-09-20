import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import '@testing-library/jest-dom/vitest'
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
      printComponent: () => <div>第二页的完整打印内容</div>,
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

  it('uses the dedicated print component and marks the last included group', () => {
    const { container, rerender } = render(<PrintPageRenderer sheetData={{} as SheetData} />)
    expect(screen.getByText('第二页的完整打印内容')).toBeInTheDocument()
    expect(screen.queryByText('第二页')).not.toBeInTheDocument()
    expect(container.querySelector('.last-printed-page')).toHaveClass('page-two')
    rerender(<PrintPageRenderer sheetData={{} as SheetData} excludePageIds={['page-two']} />)
    expect(screen.queryByText('第二页的完整打印内容')).not.toBeInTheDocument()
    expect(container.querySelector('.last-printed-page')).toHaveClass('page-one')
  })
})
