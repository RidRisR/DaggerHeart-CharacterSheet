import { describe, expect, it, vi } from "vitest"
import "@testing-library/jest-dom/vitest"
import { render, screen } from "@testing-library/react"
import { PageDisplay } from "@/components/layout/page-display"
import type { SheetData } from "@/lib/sheet-data"

vi.mock("@/lib/page-registry", () => ({
  getTabPages: () => [
    {
      id: "page1",
      label: "第一页",
      component: () => <div>页面内容</div>,
    },
  ],
}))

const renderPageDisplay = (isMobile: boolean) => {
  render(
    <PageDisplay
      isDualPageMode={false}
      isMobile={isMobile}
      leftPageId="page1"
      rightPageId="page2"
      leftTabValue="page1"
      rightTabValue="page2"
      currentTabValue="page1"
      formData={{} as SheetData}
      onSetLeftTab={vi.fn()}
      onSetRightTab={vi.fn()}
      onSetCurrentTab={vi.fn()}
      onSwitchToPrevPage={vi.fn()}
      onSwitchToNextPage={vi.fn()}
    />,
  )
}

describe("PageDisplay mobile navigation affordances", () => {
  it("does not render desktop side page switchers on mobile", () => {
    renderPageDisplay(true)

    expect(screen.queryByTitle("上一页 (←) - 循环切换")).not.toBeInTheDocument()
    expect(screen.queryByTitle("下一页 (→) - 循环切换")).not.toBeInTheDocument()
  })

  it("renders desktop side page switchers outside mobile", () => {
    renderPageDisplay(false)

    expect(screen.getByTitle("上一页 (←) - 循环切换")).toBeInTheDocument()
    expect(screen.getByTitle("下一页 (→) - 循环切换")).toBeInTheDocument()
  })
})
