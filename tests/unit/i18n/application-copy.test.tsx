import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import "@testing-library/jest-dom/vitest"
import { describe, expect, it } from "vitest"
import { I18nProvider, LOCALE_STORAGE_KEY, t } from "@/lib/i18n"
import { ContentStates } from "@/components/modals/display/ContentStates"
import { MultiSelectFilter } from "@/components/modals/filters/MultiSelectFilter"

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

  it("supports English text mode toggle copy", () => {
    expect(t("app.imageMode", undefined, "zh-CN")).toBe("图片")
    expect(t("app.textMode", undefined, "zh-CN")).toBe("文字")
    expect(t("app.imageMode", undefined, "en-US")).toBe("Image")
    expect(t("app.textMode", undefined, "en-US")).toBe("Text")
  })

  it("supports English filter control copy", async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "en-US")

    render(
      <I18nProvider>
        <MultiSelectFilter
          label={t("cardSelection.package", undefined, "en-US")}
          options={[{ value: "core", label: "Core" }]}
          selected={[]}
          onChange={() => {}}
          placeholder={t("cardSelection.noPackageSelected", undefined, "en-US")}
          allSelectedText={t("cardSelection.allPackages", undefined, "en-US")}
          countSuffix={t("cardSelection.packagesSelected", undefined, "en-US")}
          selectAllText={t("cardSelection.selectAll", undefined, "en-US")}
          deselectAllText={t("cardSelection.deselectAll", undefined, "en-US")}
          invertSelectionText={t("cardSelection.invertSelection", undefined, "en-US")}
          noMatchesText={t("cardSelection.noFilterMatches", undefined, "en-US")}
        />
      </I18nProvider>,
    )

    await user.click(screen.getByRole("button", { name: /Card Pack/ }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Select all" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Invert" })).toBeInTheDocument()
    })
  })
})
