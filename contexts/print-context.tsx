"use client"

import React, { createContext, useContext, ReactNode } from "react"
import { useImagesLoader } from "@/hooks/use-print-images-loader"

interface PrintContextType {
  allImagesLoaded: boolean
  pageImagesLoaded: Record<string, boolean>
  registerPageImages: (pageId: string, imageCount: number) => void
  onPageImagesLoaded: (pageId: string) => void
  resetLoader: () => void
}

const PrintContext = createContext<PrintContextType | undefined>(undefined)

interface PrintProviderProps {
  children: ReactNode
}

export function PrintProvider({ children }: PrintProviderProps) {
  const imagesLoader = useImagesLoader()

  return (
    <PrintContext.Provider value={imagesLoader}>
      {children}
    </PrintContext.Provider>
  )
}

export function usePrintContext() {
  const context = useContext(PrintContext)
  if (context === undefined) {
    throw new Error("usePrintContext must be used within a PrintProvider")
  }
  return context
}