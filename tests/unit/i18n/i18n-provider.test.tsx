import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import "@testing-library/jest-dom/vitest"
import { beforeEach, describe, expect, it } from "vitest"
import {
  I18nProvider,
  LOCALE_STORAGE_KEY,
  useLocale,
  useTranslation,
} from "@/lib/i18n"

function LocaleProbe() {
  const t = useTranslation()
  const { locale, setLocale } = useLocale()

  return (
    <div>
      <div data-testid="locale">{locale}</div>
      <div data-testid="loading">{t("common.loading")}</div>
      <button type="button" onClick={() => setLocale("en-US")}>
        switch-en
      </button>
      <button type="button" onClick={() => setLocale("zh-CN")}>
        switch-zh
      </button>
    </div>
  )
}

describe("I18nProvider", () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.lang = ""
  })

  it("starts with the default Chinese locale", () => {
    render(
      <I18nProvider>
        <LocaleProbe />
      </I18nProvider>,
    )

    expect(screen.getByTestId("locale")).toHaveTextContent("zh-CN")
    expect(screen.getByTestId("loading")).toHaveTextContent("加载中...")
  })

  it("restores a supported locale from localStorage after mount", async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "en-US")

    render(
      <I18nProvider>
        <LocaleProbe />
      </I18nProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId("locale")).toHaveTextContent("en-US")
      expect(screen.getByTestId("loading")).toHaveTextContent("Loading...")
    })
    expect(document.documentElement.lang).toBe("en-US")
  })

  it("ignores unsupported stored locale values", async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "fr-FR")

    render(
      <I18nProvider>
        <LocaleProbe />
      </I18nProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId("locale")).toHaveTextContent("zh-CN")
    })
    expect(document.documentElement.lang).toBe("zh-CN")
  })

  it("persists user locale changes", async () => {
    const user = userEvent.setup()

    render(
      <I18nProvider>
        <LocaleProbe />
      </I18nProvider>,
    )

    await user.click(screen.getByRole("button", { name: "switch-en" }))

    expect(screen.getByTestId("locale")).toHaveTextContent("en-US")
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en-US")
    expect(document.documentElement.lang).toBe("en-US")
  })
})
