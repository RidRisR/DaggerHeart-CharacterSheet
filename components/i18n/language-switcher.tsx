"use client"

import { Languages } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { isSupportedLocale, useLocale, useTranslation } from "@/lib/i18n"

interface LanguageSwitcherProps {
  isMobile: boolean
}

export function LanguageSwitcher({ isMobile }: LanguageSwitcherProps) {
  const t = useTranslation()
  const { locale, setLocale } = useLocale()
  const currentLocaleLabel = locale === "zh-CN" ? t("language.zhCN") : t("language.enUS")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`${t("language.trigger")}: ${currentLocaleLabel}`}
          className={cn(
            "bg-gray-800 hover:bg-gray-700 text-white gap-1.5 text-sm",
            isMobile ? "h-10 w-10 p-0" : "px-3 py-1.5",
          )}
        >
          <Languages className="h-3.5 w-3.5" />
          {!isMobile && t("language.trigger")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className={cn("w-36", isMobile && "text-base")}>
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(value) => {
            if (isSupportedLocale(value)) {
              setLocale(value)
            }
          }}
        >
          <DropdownMenuRadioItem value="zh-CN">
            {t("language.zhCN")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="en-US">
            {t("language.enUS")}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
