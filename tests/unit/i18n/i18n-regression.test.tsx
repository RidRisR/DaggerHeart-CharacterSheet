import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { I18nProvider, useLocale } from "@/lib/i18n"
import { useSheetStore } from "@/lib/sheet-store"
import { exportCharacterData } from "@/lib/storage"

vi.mock("@/card", () => ({
  CardType: {
    Ancestry: "ancestry",
    Community: "community",
    Profession: "profession",
  },
  getStandardCardsByTypeAsync: vi.fn(async () => []),
}))

function LocaleButtons() {
  const { setLocale } = useLocale()
  return (
    <div>
      <button type="button" onClick={() => setLocale("en-US")}>English</button>
      <button type="button" onClick={() => setLocale("zh-CN")}>Chinese</button>
    </div>
  )
}

describe("i18n regressions", () => {
  beforeEach(() => {
    window.localStorage.clear()
    useSheetStore.getState().replaceSheetData({
      ...defaultSheetData,
      name: "Locale Regression Character",
      level: "3",
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("does not mutate SheetData when locale changes", async () => {
    const user = userEvent.setup()
    const before = JSON.stringify(useSheetStore.getState().sheetData)

    render(
      <I18nProvider>
        <LocaleButtons />
      </I18nProvider>,
    )

    await user.click(screen.getByRole("button", { name: "English" }))
    await user.click(screen.getByRole("button", { name: "Chinese" }))

    expect(JSON.stringify(useSheetStore.getState().sheetData)).toBe(before)
  })

  it("does not write locale preference into exported JSON character data", async () => {
    const user = userEvent.setup()
    const linkAttributes: Record<string, string> = {}
    const linkElement = {
      click: vi.fn(),
      setAttribute: vi.fn((name: string, value: string) => {
        linkAttributes[name] = value
      }),
    } as unknown as HTMLAnchorElement
    const createElement = document.createElement.bind(document)

    vi.spyOn(document, "createElement").mockImplementation((tagName: string, options?: ElementCreationOptions) => {
      if (tagName.toLowerCase() === "a") {
        return linkElement
      }

      return createElement(tagName, options)
    })

    render(
      <I18nProvider>
        <LocaleButtons />
      </I18nProvider>,
    )

    await user.click(screen.getByRole("button", { name: "English" }))

    await exportCharacterData(useSheetStore.getState().sheetData)

    const dataUriPrefix = "data:application/json;charset=utf-8,"
    expect(linkAttributes.href.startsWith(dataUriPrefix)).toBe(true)
    const exportedData = JSON.parse(decodeURIComponent(linkAttributes.href.slice(dataUriPrefix.length)))

    expect(exportedData.locale).toBeUndefined()
    expect(exportedData.language).toBeUndefined()
    expect(exportedData.name).toBe("Locale Regression Character")
    expect(linkElement.click).toHaveBeenCalledOnce()
  })
})
