import { render, screen, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { beforeEach, describe, expect, it } from "vitest"
import { I18nProvider, LOCALE_STORAGE_KEY } from "@/lib/i18n"
import { HeaderSection } from "@/components/character-sheet-sections/header-section"
import { CharacterDescriptionSection } from "@/components/character-sheet-page-two-sections/character-description-section"
import CharacterSheetPageTwo from "@/components/character-sheet-page-two"
import CharacterSheet from "@/components/character-sheet"
import { defaultSheetData } from "@/lib/default-sheet-data"
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

  it("uses official English armor wording after locale restore", async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "en-US")

    render(
      <I18nProvider>
        <CharacterSheet />
      </I18nProvider>,
    )

    await waitFor(() => {
      expect(screen.getAllByText("Armor").length).toBeGreaterThan(0)
      expect(screen.queryByText("Armor Score")).not.toBeInTheDocument()
    })
  })
})

describe("Page two Sheet Field Label i18n", () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetSheetStore()
  })

  it("shows English page-two description labels after locale restore", async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "en-US")

    render(
      <I18nProvider>
        <CharacterDescriptionSection formData={defaultSheetData} handleInputChange={() => {}} />
      </I18nProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText("Character Summary")).toBeInTheDocument()
      expect(screen.getByText("Character Traits")).toBeInTheDocument()
      expect(screen.getByText("Adventure Notes")).toBeInTheDocument()
    })
  })

  it("shows English page-two deck and tier labels after locale restore", async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "en-US")

    render(
      <I18nProvider>
        <CharacterSheetPageTwo />
      </I18nProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText("Deck")).toBeInTheDocument()
      expect(screen.getByText(/Focused Deck \(\d+\/20\)/)).toBeInTheDocument()
      expect(screen.getByText(/Inventory Deck \(\d+\/20\)/)).toBeInTheDocument()
      expect(screen.getByText("TIER 2: LEVELS 2–4")).toBeInTheDocument()
      expect(screen.getByText("TIER 3: LEVELS 5–7")).toBeInTheDocument()
      expect(screen.getByText("TIER 4: LEVELS 8–10")).toBeInTheDocument()
      expect(screen.getByText("Choose two options from the list below and mark them.")).toBeInTheDocument()
      expect(screen.getAllByText("Gain a +1 bonus to two unmarked character traits and mark them.")).toHaveLength(3)
      expect(screen.getAllByText("Permanently gain one Hit Point slot.")).toHaveLength(3)
      expect(screen.getAllByText("Multiclass: Choose an additional class for your character, then cross out an unused \"Take an upgraded subclass card\" and the other multiclass option on this sheet.")).toHaveLength(2)
    })
  })
})
