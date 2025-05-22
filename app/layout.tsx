import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
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
          <PrintHelper />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
