import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import "@testing-library/jest-dom/vitest"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { I18nProvider, useLocale } from "@/lib/i18n"
import { PageDisplay } from "@/components/layout/page-display"
import { PageVisibilityDropdown } from "@/components/ui/page-visibility-dropdown"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { useSheetStore } from "@/lib/sheet-store"

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
      {
        id: "fallback-page",
        label: "Fallback Page",
        labelKey: "pages.missing.label",
        component: EmptyPage,
        printClass: "fallback-page",
        visibility: { type: "always" },
        printOrder: 2,
        showInTabs: true,
      },
    ],
  }
})

function LocaleButtons() {
  const { setLocale } = useLocale()

  return (
    <>
      <button type="button" onClick={() => setLocale("en-US")}>English</button>
      <button type="button" onClick={() => setLocale("zh-CN")}>Chinese</button>
    </>
  )
}

function renderPageDisplay() {
  return render(
    <I18nProvider>
      <LocaleButtons />
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
  beforeEach(() => {
    window.localStorage.clear()
    vi.spyOn(console, "warn").mockImplementation(() => {})
    useSheetStore.getState().replaceSheetData({
      ...defaultSheetData,
      pageVisibility: {
        rangerCompanion: true,
        armorTemplate: true,
        adventureNotes: true,
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("keeps Chinese labels by default", () => {
    renderPageDisplay()
    expect(screen.getByRole("tab", { name: "第一页" })).toBeInTheDocument()
  })

  it("switches page tabs to English", async () => {
    const user = userEvent.setup()

    renderPageDisplay()
    await user.click(screen.getByRole("button", { name: "English" }))

    expect(await screen.findByRole("tab", { name: "Page One" })).toBeInTheDocument()
  })

  it("falls back to the configured label when a page label key is missing", () => {
    renderPageDisplay()

    expect(screen.getByRole("tab", { name: "Fallback Page" })).toBeInTheDocument()
    expect(screen.queryByRole("tab", { name: "pages.missing.label" })).not.toBeInTheDocument()
  })

  it("switches page visibility dropdown labels and descriptions to English", async () => {
    const user = userEvent.setup()

    render(
      <I18nProvider>
        <LocaleButtons />
        <PageVisibilityDropdown />
      </I18nProvider>,
    )

    await user.click(screen.getByRole("button", { name: "English" }))
    await user.click(await screen.findByTitle("Manage visible pages"))

    expect(await screen.findByRole("menuitem", { name: /Ranger Companion/ })).toBeInTheDocument()
    expect(screen.getByText("Ranger companion sheet")).toBeInTheDocument()
  })
})
