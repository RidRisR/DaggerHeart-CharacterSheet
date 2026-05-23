"use client"

import { useContext } from "react"
import { DEFAULT_LOCALE } from "./locales"
import { I18nContext, type I18nContextValue } from "./provider"
import { t as translate } from "./translate"

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider")
  }
  return context
}

export function useTranslation() {
  const context = useContext(I18nContext)
  const defaultTranslate: I18nContextValue["t"] = (key, params) => translate(key, params, DEFAULT_LOCALE)
  return context?.t ?? defaultTranslate
}

export function useLocale() {
  const { locale, setLocale } = useI18n()
  return { locale, setLocale }
}
