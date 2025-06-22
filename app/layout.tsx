import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { CardSystemInitializer } from "@/components/card-system-initializer"
import { Toaster } from "@/components/ui/toaster"
import { FadeNotificationContainer } from "@/components/ui/fade-notification"
import PrintHelper from "./print-helper"

export const metadata: Metadata = {
  title: "Character Sheet",
  description: "Interactive character sheet for tabletop RPGs",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <CardSystemInitializer />
          <PrintHelper />
          {children}
          <Toaster />
          <FadeNotificationContainer />
          {/* 水印 */}
          <div className="fixed bottom-2 left-2 text-gray-500 text-xs opacity-75 pointer-events-none">
            本作品完全开源且免费
            <br />
            作者：RidRisR
            <br />
            翻译及校对：PolearmMaster, 末楔, 里予, 一得, RisRisR
            <br />
            项目地址&下载地址：
            <a
              href="https://github.com/RidRisR/DaggerHeart-CharacterSheet"
              target="_blank"
              rel="noopener noreferrer"
              className="underline pointer-events-auto"
            >
              https://github.com/RidRisR/DaggerHeart-CharacterSheet
            </a>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
