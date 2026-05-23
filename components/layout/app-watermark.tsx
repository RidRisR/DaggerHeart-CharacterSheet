"use client"

import { useTranslation } from "@/lib/i18n"

export function AppWatermark() {
  const t = useTranslation()

  return (
    <div className="fixed bottom-2 left-2 text-gray-500 text-xs opacity-75 pointer-events-none">
      {t("app.openSourceNotice")}
      <br />
      {t("app.author")}
      <br />
      {t("app.translators")}
      <br />
      <a
        href="https://github.com/RidRisR/DaggerHeart-CharacterSheet"
        target="_blank"
        rel="noopener noreferrer"
        className="underline pointer-events-auto hover:text-gray-700 transition-colors"
      >
        {t("app.repositoryLink")}
      </a>
    </div>
  )
}
