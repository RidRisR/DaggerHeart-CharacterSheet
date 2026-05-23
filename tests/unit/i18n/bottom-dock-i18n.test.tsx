import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import "@testing-library/jest-dom/vitest"
import { describe, expect, it, vi } from "vitest"
import { BottomDock } from "@/components/layout/bottom-dock"
import { I18nProvider } from "@/lib/i18n"

function renderDock() {
  return render(
    <I18nProvider>
      <BottomDock
        mode="main"
        isMobile={false}
        isCardDrawerOpen={false}
        characterCount={1}
        onToggleCardDrawer={vi.fn()}
        onToggleGuide={vi.fn()}
        onToggleNotebook={vi.fn()}
        onPrintAll={vi.fn()}
        onOpenSealDiceExport={vi.fn()}
        onQuickExportJSON={vi.fn()}
        onQuickExportPDF={vi.fn()}
        onQuickExportHTML={vi.fn()}
        onOpenCharacterManagement={vi.fn()}
        onQuickCreateArchive={vi.fn()}
        onQuickImportFromHTML={vi.fn()}
      />
    </I18nProvider>,
  )
}

describe("BottomDock i18n", () => {
  it("shows Chinese labels by default", () => {
    renderDock()
    expect(screen.getByRole("button", { name: /导出/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /存档/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /语言/ })).toBeInTheDocument()
  })

  it("switches dock labels to English", async () => {
    const user = userEvent.setup()
    renderDock()

    await user.click(screen.getByRole("button", { name: /语言/ }))
    await user.click(await screen.findByRole("menuitem", { name: "English" }))

    expect(screen.getByRole("button", { name: /Export/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Archive/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Language/ })).toBeInTheDocument()
  })
})
