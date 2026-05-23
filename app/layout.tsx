import type React from "react"
import type { Metadata } from "next"
import Script from "next/script"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { CardSystemInitializer } from "@/components/card-system-initializer"
import { Toaster } from "@/components/ui/toaster"
import { FadeNotificationContainer } from "@/components/ui/fade-notification"
import { ProgressModalProvider } from "@/components/ui/unified-progress-modal"
import { ChunkLoadErrorHandler } from "@/components/chunk-load-error-handler"
import { AppWatermark } from "@/components/layout/app-watermark"
import { getUmamiAnalyticsConfig } from "@/lib/analytics"
import { I18nProvider } from "@/lib/i18n"
import PrintHelper from "./print-helper"

export const metadata: Metadata = {
  title: "DaggerHeart Character Sheet | 匕首之心角色卡生成器",
  description: "免费开源的DaggerHeart（匕首之心/匕首心）TTRPG角色卡生成器和管理工具。支持中英双语，在线创建、编辑和打印你的DaggerHeart桌游角色。Free open-source character sheet creator for DaggerHeart TTRPG by Critical Role.",
  keywords: [
    "DaggerHeart",
    "匕首之心",
    "匕首心",
    "character sheet",
    "角色卡",
    "TTRPG",
    "tabletop RPG",
    "桌游",
    "Critical Role",
    "character creator",
    "角色生成器",
    "车卡器",
    "开源",
    "open source"
  ],
  authors: [{ name: "RidRisR" }],
  creator: "RidRisR",
  publisher: "RidRisR",
  openGraph: {
    type: "website",
    locale: "zh_CN",
    alternateLocale: "en_US",
    title: "DaggerHeart Character Sheet | 匕首之心角色卡生成器",
    description: "免费开源的DaggerHeart（匕首之心）TTRPG角色卡生成器和管理工具",
    siteName: "DaggerHeart Character Sheet",
  },
  twitter: {
    card: "summary_large_image",
    title: "DaggerHeart Character Sheet | 匕首之心角色卡生成器",
    description: "免费开源的DaggerHeart（匕首之心） TTRPG角色卡生成器",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  generator: "v0.dev",
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const umamiAnalytics = getUmamiAnalyticsConfig(process.env)

  // 结构化数据 (JSON-LD) for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "DaggerHeart Character Sheet",
    "alternateName": ["匕首之心角色卡生成器", "匕首心车卡器"],
    "description": "免费开源的DaggerHeart（匕首之心）TTRPG角色卡生成器和管理工具。支持中英双语，在线创建、编辑和打印你的DaggerHeart桌游角色。",
    "url": "https://ridrisr.github.io/DaggerHeart-CharacterSheet/",
    "applicationCategory": "GameApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "creator": {
      "@type": "Person",
      "name": "RidRisR"
    },
    "inLanguage": ["zh-CN", "en-US"],
    "genre": ["Tabletop RPG", "TTRPG", "DaggerHeart"],
    "keywords": "DaggerHeart, 匕首之心, character sheet, 角色卡, TTRPG, Critical Role, 车卡器",
    "isAccessibleForFree": true,
    "license": "https://github.com/RidRisR/DaggerHeart-CharacterSheet/blob/main/LICENSE"
  }

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <Script
          id="umami-analytics"
          src={umamiAnalytics.scriptSrc}
          data-website-id={umamiAnalytics.websiteId}
          data-domains={umamiAnalytics.domains}
          strategy="afterInteractive"
        />
      </head>
      <body suppressHydrationWarning>
        <ChunkLoadErrorHandler />
        <I18nProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <ProgressModalProvider>
              <CardSystemInitializer />
              <PrintHelper />
              {children}
              <Toaster />
              <FadeNotificationContainer />
              <AppWatermark />
            </ProgressModalProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
