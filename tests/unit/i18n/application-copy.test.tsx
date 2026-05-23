import { render, screen, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { describe, expect, it } from "vitest"
import { I18nProvider, LOCALE_STORAGE_KEY, t } from "@/lib/i18n"
import { ContentStates } from "@/components/modals/display/ContentStates"

describe("Application UI Copy", () => {
  it("uses English default content-state copy after locale restore", async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "en-US")

    render(
      <I18nProvider>
        <ContentStates loading>{null}</ContentStates>
      </I18nProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument()
    })
  })

  it("keeps nameless import fallback separate from sheet field labels", () => {
    expect(t("archive.unnamedCharacter", undefined, "zh-CN")).toBe("未命名角色")
    expect(t("archive.unnamedCharacter", undefined, "en-US")).toBe("Unnamed character")
  })
})
