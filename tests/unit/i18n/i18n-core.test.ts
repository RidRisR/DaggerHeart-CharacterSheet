import { describe, expect, it, vi } from "vitest"
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  messages,
  t,
  hasSameMessageShape,
} from "@/lib/i18n"

describe("i18n core", () => {
  it("defaults to zh-CN", () => {
    expect(DEFAULT_LOCALE).toBe("zh-CN")
  })

  it("accepts only supported locales", () => {
    expect(isSupportedLocale("zh-CN")).toBe(true)
    expect(isSupportedLocale("en-US")).toBe(true)
    expect(isSupportedLocale("fr-FR")).toBe(false)
    expect(isSupportedLocale(null)).toBe(false)
  })

  it("looks up nested keys by locale", () => {
    expect(t("common.loading", undefined, "zh-CN")).toBe("加载中...")
    expect(t("common.loading", undefined, "en-US")).toBe("Loading...")
  })

  it("interpolates simple params", () => {
    expect(t("archive.maxCharacters", { count: 10 }, "zh-CN")).toBe("最多只能创建10个角色")
    expect(t("archive.maxCharacters", { count: 10 }, "en-US")).toBe("You can create up to 10 characters")
  })

  it("falls back to the key for missing messages", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    expect(t("missing.key", undefined, "zh-CN")).toBe("missing.key")
    expect(warnSpy).toHaveBeenCalledWith('[i18n] Missing message key "missing.key" for locale "zh-CN"')

    warnSpy.mockRestore()
  })

  it("keeps zh-CN and en-US message trees structurally aligned", () => {
    expect(hasSameMessageShape(messages["zh-CN"], messages["en-US"])).toBe(true)
  })
})
