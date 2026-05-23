export const SUPPORTED_LOCALES = ["zh-CN", "en-US"] as const

export type Locale = typeof SUPPORTED_LOCALES[number]

export const DEFAULT_LOCALE: Locale = "zh-CN"

export const LOCALE_STORAGE_KEY = "dh_locale_preference"

export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as Locale)
}
