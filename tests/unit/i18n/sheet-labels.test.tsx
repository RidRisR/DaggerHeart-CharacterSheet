import { render, screen, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { beforeEach, describe, expect, it } from "vitest"
import { I18nProvider, LOCALE_STORAGE_KEY } from "@/lib/i18n"
import { HeaderSection } from "@/components/character-sheet-sections/header-section"
import { resetSheetStore } from "../automation/test-helpers"

function header() {
  return (
    <HeaderSection
      onOpenProfessionModal={() => {}}
      onOpenAncestryModal={() => {}}
      onOpenCommunityModal={() => {}}
      onOpenSubclassModal={() => {}}
    />
  )
}

function renderHeader({ withProvider = true }: { withProvider?: boolean } = {}) {
  return render(withProvider ? <I18nProvider>{header()}</I18nProvider> : header())
}

describe("Sheet Field Label i18n", () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetSheetStore()
  })

  it("keeps default Chinese header labels", () => {
    renderHeader()
    expect(screen.getByText("职业")).toBeInTheDocument()
    expect(screen.getByText("名称")).toBeInTheDocument()
    expect(screen.getByText("社群")).toBeInTheDocument()
    expect(screen.getByText("种族")).toBeInTheDocument()
    expect(screen.getByText("子职业")).toBeInTheDocument()
    expect(screen.getByText("等级")).toBeInTheDocument()
    expect(screen.getByText("选择职业")).toBeInTheDocument()
    expect(screen.getByText("选择社群")).toBeInTheDocument()
    expect(screen.getAllByText("选择种族")).toHaveLength(2)
    expect(screen.getByText("选择子职业")).toBeInTheDocument()
  })

  it("uses default Chinese labels when rendered outside I18nProvider", () => {
    renderHeader({ withProvider: false })

    expect(screen.getByText("职业")).toBeInTheDocument()
    expect(screen.getByText("选择职业")).toBeInTheDocument()
  })

  it("shows English header labels after locale restore", async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "en-US")
    renderHeader()

    await waitFor(() => {
      expect(screen.getByText("Class")).toBeInTheDocument()
      expect(screen.getByText("Name")).toBeInTheDocument()
      expect(screen.getByText("Community")).toBeInTheDocument()
      expect(screen.getByText("Ancestry")).toBeInTheDocument()
      expect(screen.getByText("Subclass")).toBeInTheDocument()
      expect(screen.getByText("Level")).toBeInTheDocument()
      expect(screen.getByText("Choose class")).toBeInTheDocument()
      expect(screen.getByText("Choose community")).toBeInTheDocument()
      expect(screen.getAllByText("Choose ancestry")).toHaveLength(2)
      expect(screen.getByText("Choose subclass")).toBeInTheDocument()
    })
  })
})
