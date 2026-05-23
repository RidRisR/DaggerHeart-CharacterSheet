"use client"

import { Languages } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useLocale, useTranslation } from "@/lib/i18n"

interface LanguageSwitcherProps {
  isMobile: boolean
}

export function LanguageSwitcher({ isMobile }: LanguageSwitcherProps) {
  const t = useTranslation()
  const { locale, setLocale } = useLocale()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className={cn(
            "bg-gray-800 hover:bg-gray-700 text-white gap-1.5 text-sm",
            isMobile ? "px-4 py-2.5" : "px-3 py-1.5",
          )}
        >
          <Languages className="h-3.5 w-3.5" />
          {t("language.trigger")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className={cn("w-36", isMobile && "text-base")}>
        <DropdownMenuItem
          onClick={() => setLocale("zh-CN")}
          className={cn(locale === "zh-CN" && "font-semibold")}
        >
          {t("language.zhCN")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLocale("en-US")}
          className={cn(locale === "en-US" && "font-semibold")}
        >
          {t("language.enUS")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
