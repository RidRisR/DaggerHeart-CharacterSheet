import { render, screen, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { beforeEach, describe, expect, it } from "vitest"
import { I18nProvider, LOCALE_STORAGE_KEY } from "@/lib/i18n"
import { HeaderSection } from "@/components/character-sheet-sections/header-section"

function renderHeader() {
  return render(
    <I18nProvider>
      <HeaderSection
        onOpenProfessionModal={() => {}}
        onOpenAncestryModal={() => {}}
        onOpenCommunityModal={() => {}}
        onOpenSubclassModal={() => {}}
      />
    </I18nProvider>,
  )
}

describe("Sheet Field Label i18n", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("keeps default Chinese header labels", () => {
    renderHeader()
    expect(screen.getByText("职业")).toBeInTheDocument()
    expect(screen.getByText("名称")).toBeInTheDocument()
    expect(screen.getByText("社群")).toBeInTheDocument()
  })

  it("shows English header labels after locale restore", async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "en-US")
    renderHeader()

    await waitFor(() => {
      expect(screen.getByText("Class")).toBeInTheDocument()
      expect(screen.getByText("Name")).toBeInTheDocument()
      expect(screen.getByText("Community")).toBeInTheDocument()
    })
  })
})
