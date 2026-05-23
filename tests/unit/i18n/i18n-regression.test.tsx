import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"
import { I18nProvider, useLocale } from "@/lib/i18n"
import { useSheetStore } from "@/lib/sheet-store"

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
      ...useSheetStore.getState().sheetData,
      name: "Locale Regression Character",
      level: "3",
    })
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

  it("does not write locale preference into exported character data", async () => {
    const user = userEvent.setup()

    render(
      <I18nProvider>
        <LocaleButtons />
      </I18nProvider>,
    )

    await user.click(screen.getByRole("button", { name: "English" }))

    const exportedData = JSON.parse(JSON.stringify(useSheetStore.getState().sheetData))
    expect(exportedData.locale).toBeUndefined()
    expect(exportedData.language).toBeUndefined()
    expect(exportedData.name).toBe("Locale Regression Character")
  })
})
