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
import { MobileViewportScaler } from "@/components/mobile-viewport-scaler"
import { getUmamiAnalyticsConfig } from "@/lib/analytics"
import { APP_DESCRIPTION, APP_SHORT_DESCRIPTION, APP_TITLE, SITE_URL } from "@/lib/seo"
import PrintHelper from "./print-helper"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: APP_TITLE,
    template: "%s | DHSheet",
  },
  description: APP_DESCRIPTION,
  keywords: [
    "DHSheet",
    "DaggerHeart",
    "匕首之心车卡器",
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
    url: "/",
    locale: "zh_CN",
    alternateLocale: "en_US",
    title: APP_TITLE,
    description: APP_SHORT_DESCRIPTION,
    siteName: "DHSheet",
  },
  twitter: {
    card: "summary",
    title: APP_TITLE,
    description: "DHSheet 是免费开源、非官方的 DaggerHeart（匕首之心）TTRPG 车卡器",
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  verification: {
    google: "PPstI2EC1Yxp6bfZBZAVAEo9tFaqICp55SSoGdnlB28",
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const umamiAnalytics = getUmamiAnalyticsConfig(process.env)
  const githubUrl = "https://github.com/RidRisR/DaggerHeart-CharacterSheet"

  // 结构化数据 (JSON-LD) for SEO
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "DHSheet",
      "alternateName": [
        "匕首之心车卡器",
        "DaggerHeart Character Sheet Tool",
        "匕首之心角色卡生成器",
        "匕首心车卡器",
        "DaggerHeart Character Creator"
      ],
      "description": APP_SHORT_DESCRIPTION,
      "url": `${SITE_URL}/`,
      "sameAs": [githubUrl],
      "applicationCategory": "GameApplication",
      "operatingSystem": "Any",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "creator": {
        "@type": "Person",
        "name": "RidRisR",
        "url": "https://github.com/RidRisR"
      },
      "author": {
        "@type": "Person",
        "name": "RidRisR",
        "url": "https://github.com/RidRisR"
      },
      "maintainer": {
        "@type": "Person",
        "name": "RidRisR",
        "url": "https://github.com/RidRisR"
      },
      "about": "DaggerHeart / 匕首之心角色卡生成器",
      "inLanguage": ["zh-CN", "en-US"],
      "genre": ["Tabletop RPG", "TTRPG", "DaggerHeart"],
      "keywords": "DHSheet, DaggerHeart, 匕首之心车卡器, 匕首之心, character sheet, 角色卡, TTRPG, Critical Role, 车卡器, 非官方",
      "isAccessibleForFree": true,
      "license": `${githubUrl}/blob/main/LICENSE`
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "DHSheet",
      "alternateName": "匕首之心车卡器",
      "url": `${SITE_URL}/`,
      "sameAs": [githubUrl],
      "inLanguage": ["zh-CN", "en-US"],
      "publisher": {
        "@type": "Person",
        "name": "RidRisR",
        "url": "https://github.com/RidRisR"
      }
    }
  ]

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
        <MobileViewportScaler />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <ProgressModalProvider>
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
            </div>
          </ProgressModalProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
