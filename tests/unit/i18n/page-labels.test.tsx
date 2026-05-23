import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { describe, expect, it, vi } from "vitest"
import { I18nProvider } from "@/lib/i18n"
import { PageDisplay } from "@/components/layout/page-display"
import { defaultSheetData } from "@/lib/default-sheet-data"

const EmptyPage = () => <div>page content</div>

vi.mock("@/lib/page-registry", async () => {
  const actual = await vi.importActual<typeof import("@/lib/page-registry")>("@/lib/page-registry")
  return {
    ...actual,
    getTabPages: () => [
      {
        id: "page1",
        label: "第一页",
        labelKey: "pages.page1.label",
        component: EmptyPage,
        printClass: "page-one",
        visibility: { type: "always" },
        printOrder: 1,
        showInTabs: true,
      },
    ],
  }
})

function renderPageDisplay() {
  return render(
    <I18nProvider>
      <PageDisplay
        isDualPageMode={false}
        isMobile={false}
        leftPageId="page1"
        rightPageId="page2"
        leftTabValue="page1"
        rightTabValue="page2"
        currentTabValue="page1"
        formData={defaultSheetData}
        onSetLeftTab={vi.fn()}
        onSetRightTab={vi.fn()}
        onSetCurrentTab={vi.fn()}
        onSwitchToPrevPage={vi.fn()}
        onSwitchToNextPage={vi.fn()}
      />
    </I18nProvider>,
  )
}

describe("localized page labels", () => {
  it("keeps Chinese labels by default", () => {
    renderPageDisplay()
    expect(screen.getByRole("tab", { name: "第一页" })).toBeInTheDocument()
  })
})
